import { Router, type Request } from 'express';
import { z } from 'zod';
import { assertCourseStaff, can, requireAuth, requirePermission } from '../../middleware/auth.js';
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { audit } from '../../lib/audit.js';
import { badRequest, conflict, forbidden, notFound } from '../../lib/errors.js';
import { body, idParam, parse, query, zId, zOptId, zText } from '../../lib/validate.js';
import { notify } from '../../lib/notify.js';
import { evaluateBadges } from '../../lib/gamification.js';
import { assertStudentAccess, recordCompetency, scaleOf, studentHistory, teachesStudent } from './competencies.service.js';

const r = Router();
r.use(requireAuth);

const manage = requirePermission('competencies.manage');
const rubricStaff = requirePermission('courses.teach', 'competencies.manage');

const competencyOut = (c: any) => ({
  id: c.id,
  key: c.key,
  name: c.name,
  description: c.description,
  group: c.group,
  isActive: c.isActive,
  scale: scaleOf(c.scale),
});

// ───────────── Competencias ─────────────
r.get('/', async (req, res) => {
  const staff = can(req, 'competencies.manage') || can(req, 'courses.teach') || can(req, 'students.manage');
  const all = req.query.all === '1' && staff;
  const rows = await prisma.competency.findMany({
    where: all ? {} : { isActive: true },
    include: { scale: true },
    orderBy: [{ group: 'asc' }, { name: 'asc' }],
  });
  res.json(rows.map(competencyOut));
});

const compSchema = z.object({
  key: z.string().trim().min(2, 'Clave requerida').max(60).regex(/^[a-z0-9_-]+$/i, 'Solo letras, números, guion y guion bajo'),
  name: z.string().trim().min(2, 'Nombre requerido').max(120),
  description: zText(5000).nullable().optional(),
  group: zText(80).nullable().optional(),
  isActive: z.boolean().optional(),
  scaleId: zOptId,
});

async function checkScale(scaleId?: number | null) {
  if (scaleId && !(await prisma.ratingScale.findUnique({ where: { id: scaleId } }))) throw badRequest('La escala indicada no existe');
}

r.post('/', manage, async (req, res) => {
  const d = body(req, compSchema);
  await checkScale(d.scaleId);
  if (await prisma.competency.findUnique({ where: { key: d.key } })) throw conflict('Ya existe una competencia con esa clave');
  const c = await prisma.competency.create({ data: d, include: { scale: true } });
  await audit(req, 'competency.create', 'Competency', c.id);
  res.status(201).json(competencyOut(c));
});

// ───────────── Escalas ─────────────
const scaleBase = z.object({
  name: z.string().trim().min(2, 'Nombre requerido').max(100),
  min: z.coerce.number().int().min(0).max(10),
  max: z.coerce.number().int().min(1).max(100),
  labels: z.array(z.string().trim().min(1).max(60)).nullable().optional(),
});
const scaleSchema = scaleBase.superRefine((v, ctx) => {
  if (v.max <= v.min) ctx.addIssue({ code: 'custom', path: ['max'], message: 'El máximo debe ser mayor que el mínimo' });
  else if (v.labels && v.labels.length !== v.max - v.min + 1)
    ctx.addIssue({ code: 'custom', path: ['labels'], message: `Se requieren ${v.max - v.min + 1} etiquetas (una por valor)` });
});

const scaleRow = (s: any) => ({ id: s.id, name: s.name, min: s.min, max: s.max, labels: Array.isArray(s.labels) ? s.labels : null });

r.get('/scales', async (_req, res) => {
  res.json((await prisma.ratingScale.findMany({ orderBy: { id: 'asc' } })).map(scaleRow));
});
r.post('/scales', manage, async (req, res) => {
  const d = body(req, scaleSchema);
  const s = await prisma.ratingScale.create({ data: { name: d.name, min: d.min, max: d.max, labels: d.labels ?? undefined } });
  await audit(req, 'scale.create', 'RatingScale', s.id);
  res.status(201).json(scaleRow(s));
});
r.patch('/scales/:id', manage, async (req, res) => {
  const id = idParam(req);
  const cur = await prisma.ratingScale.findUnique({ where: { id } });
  if (!cur) throw notFound('Escala no encontrada');
  const p = body(req, scaleBase.partial());
  const merged = {
    name: p.name ?? cur.name,
    min: p.min ?? cur.min,
    max: p.max ?? cur.max,
    labels: p.labels !== undefined ? p.labels : Array.isArray(cur.labels) ? (cur.labels as string[]) : null,
  };
  const d = parse(scaleSchema, merged);
  const s = await prisma.ratingScale.update({
    where: { id },
    data: { name: d.name, min: d.min, max: d.max, labels: d.labels ?? Prisma.DbNull },
  });
  await audit(req, 'scale.update', 'RatingScale', id);
  res.json(scaleRow(s));
});

// ───────────── Rúbricas ─────────────
const levelSchema = z.object({
  score: z.coerce.number().int(),
  label: z.string().trim().min(1).max(100),
  description: zText(2000).nullable().optional(),
});
const criterionSchema = z.object({
  title: z.string().trim().min(1, 'Título del criterio requerido').max(200),
  description: zText(5000).nullable().optional(),
  competencyId: zOptId,
  weight: z.coerce.number().int().min(1).max(1000).default(1),
  maxScore: z.coerce.number().int().min(1).max(100).default(5),
  levels: z.array(levelSchema).max(20).default([]),
});
const rubricSchema = z.object({
  title: z.string().trim().min(2, 'Título requerido').max(200),
  description: zText(5000).nullable().optional(),
  courseId: zOptId,
  scaleId: zOptId,
  criteria: z.array(criterionSchema).min(1, 'Agrega al menos un criterio').max(50),
});

const rubricInclude = {
  scale: true,
  criteria: {
    orderBy: { order: 'asc' as const },
    include: { levels: { orderBy: { score: 'asc' as const } }, competency: { select: { id: true, key: true, name: true } } },
  },
};

export function rubricOut(x: any) {
  return {
    id: x.id,
    title: x.title,
    description: x.description,
    courseId: x.courseId,
    scaleId: x.scaleId,
    scale: x.scale ? scaleOf(x.scale) : null,
    createdAt: x.createdAt,
    criteria: x.criteria.map((c: any) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      competencyId: c.competencyId,
      competency: c.competency,
      weight: c.weight,
      maxScore: c.maxScore,
      order: c.order,
      levels: c.levels.map((l: any) => ({ id: l.id, score: l.score, label: l.label, description: l.description })),
    })),
  };
}

async function validateRubricRefs(d: { courseId?: number | null; scaleId?: number | null; criteria?: { competencyId?: number | null }[] }) {
  await checkScale(d.scaleId);
  const ids = [...new Set((d.criteria ?? []).map((c) => c.competencyId).filter((x): x is number => !!x))];
  if (ids.length && (await prisma.competency.count({ where: { id: { in: ids } } })) !== ids.length) throw badRequest('Alguna competencia indicada no existe');
  if (d.courseId && !(await prisma.course.findUnique({ where: { id: d.courseId }, select: { id: true } }))) throw badRequest('El curso indicado no existe');
}

/** Edición: gestores de competencias, facilitadores del curso de la rúbrica, o su creador si no tiene curso. */
async function assertRubricWrite(req: Request, rubric: { courseId: number | null; createdById: number | null }) {
  if (can(req, 'competencies.manage')) return;
  if (rubric.courseId) return assertCourseStaff(req, rubric.courseId);
  if (rubric.createdById !== req.user!.id) throw forbidden('Solo quien creó la rúbrica puede modificarla');
}

const criteriaData = (criteria: z.infer<typeof criterionSchema>[]) =>
  criteria.map((c, i) => ({
    title: c.title,
    description: c.description ?? null,
    competencyId: c.competencyId ?? null,
    weight: c.weight,
    maxScore: c.maxScore,
    order: i,
    levels: { create: c.levels.map((l) => ({ score: l.score, label: l.label, description: l.description ?? null })) },
  }));

r.get('/rubrics', rubricStaff, async (req, res) => {
  const q = query(req, z.object({ courseId: zId.optional() }));
  const where: any = {};
  if (q.courseId) {
    if (!can(req, 'competencies.manage')) await assertCourseStaff(req, q.courseId);
    where.OR = [{ courseId: q.courseId }, { courseId: null }];
  } else if (!can(req, 'competencies.manage')) {
    const taught = await prisma.courseInstructor.findMany({ where: { instructorId: req.user!.id }, select: { courseId: true } });
    where.OR = [{ courseId: { in: taught.map((t) => t.courseId) } }, { courseId: null }];
  }
  const rows = await prisma.rubric.findMany({ where, orderBy: { createdAt: 'desc' }, include: { _count: { select: { criteria: true } } } });
  res.json(
    rows.map((x) => ({
      id: x.id,
      title: x.title,
      description: x.description,
      courseId: x.courseId,
      scaleId: x.scaleId,
      criteriaCount: x._count.criteria,
      createdAt: x.createdAt,
    })),
  );
});

r.get('/rubrics/:id', rubricStaff, async (req, res) => {
  const x = await prisma.rubric.findUnique({ where: { id: idParam(req) }, include: rubricInclude });
  if (!x) throw notFound('Rúbrica no encontrada');
  res.json(rubricOut(x));
});

r.post('/rubrics', rubricStaff, async (req, res) => {
  const d = body(req, rubricSchema);
  await validateRubricRefs(d);
  if (d.courseId && !can(req, 'competencies.manage')) await assertCourseStaff(req, d.courseId);
  const x = await prisma.rubric.create({
    data: {
      title: d.title,
      description: d.description ?? null,
      courseId: d.courseId ?? null,
      scaleId: d.scaleId ?? null,
      createdById: req.user!.id,
      criteria: { create: criteriaData(d.criteria) },
    },
    include: rubricInclude,
  });
  await audit(req, 'rubric.create', 'Rubric', x.id);
  res.status(201).json(rubricOut(x));
});

r.put('/rubrics/:id', rubricStaff, async (req, res) => {
  const id = idParam(req);
  const cur = await prisma.rubric.findUnique({ where: { id } });
  if (!cur) throw notFound('Rúbrica no encontrada');
  await assertRubricWrite(req, cur);
  const scored = await prisma.rubricScore.count({ where: { criterion: { rubricId: id } } });
  if (scored > 0) {
    const d = body(req, z.object({ title: z.string().trim().min(2).max(200), description: zText(5000).nullable().optional(), criteria: z.unknown().optional() }));
    if (d.criteria !== undefined) throw conflict('La rúbrica ya tiene puntuaciones: solo puedes editar el título y la descripción. Crea una rúbrica nueva para cambiar criterios.');
    const x = await prisma.rubric.update({ where: { id }, data: { title: d.title, description: d.description ?? null }, include: rubricInclude });
    await audit(req, 'rubric.update', 'Rubric', id, { criteria: false });
    return res.json(rubricOut(x));
  }
  const d = body(req, rubricSchema);
  await validateRubricRefs(d);
  if (d.courseId && !can(req, 'competencies.manage')) await assertCourseStaff(req, d.courseId);
  const x = await prisma.$transaction(async (tx) => {
    await tx.rubricCriterion.deleteMany({ where: { rubricId: id } });
    return tx.rubric.update({
      where: { id },
      data: {
        title: d.title,
        description: d.description ?? null,
        courseId: d.courseId ?? null,
        scaleId: d.scaleId ?? null,
        criteria: { create: criteriaData(d.criteria) },
      },
      include: rubricInclude,
    });
  });
  await audit(req, 'rubric.update', 'Rubric', id, { criteria: true });
  res.json(rubricOut(x));
});

r.delete('/rubrics/:id', rubricStaff, async (req, res) => {
  const id = idParam(req);
  const cur = await prisma.rubric.findUnique({ where: { id } });
  if (!cur) throw notFound('Rúbrica no encontrada');
  await assertRubricWrite(req, cur);
  const [scores, acts, asm] = await Promise.all([
    prisma.rubricScore.count({ where: { criterion: { rubricId: id } } }),
    prisma.practicalActivity.count({ where: { rubricId: id } }),
    prisma.assessment.count({ where: { rubricId: id } }),
  ]);
  if (scores || acts || asm) throw conflict('La rúbrica está en uso (puntuaciones, actividades o evaluaciones) y no puede eliminarse');
  await prisma.rubric.delete({ where: { id } });
  await audit(req, 'rubric.delete', 'Rubric', id);
  res.json({ ok: true });
});

// ───────────── Historial ─────────────
r.get('/me', async (req, res) => {
  res.json(await studentHistory(req.user!.id, false));
});
r.get('/students/:userId', async (req, res) => {
  const uid = idParam(req, 'userId');
  const { staff } = await assertStudentAccess(req, uid);
  res.json(await studentHistory(uid, staff));
});

// ───────────── Evaluaciones del facilitador ─────────────
r.post('/evaluations', requirePermission('courses.teach', 'students.manage'), async (req, res) => {
  const d = body(
    req,
    z.object({
      userId: zId,
      courseId: zOptId,
      ratings: z
        .array(z.object({ competencyId: zId, score: z.coerce.number(), notes: zText(5000).nullable().optional() }))
        .min(1, 'Agrega al menos una calificación')
        .max(50),
    }),
  );
  const u = req.user!;
  if (d.courseId) await assertCourseStaff(req, d.courseId);
  if (!can(req, 'students.manage') && !(await teachesStudent(u.id, d.userId, d.courseId))) {
    throw forbidden('Solo puedes evaluar a estudiantes de tus cursos');
  }
  if (!(await prisma.user.findFirst({ where: { id: d.userId, deletedAt: null }, select: { id: true } }))) throw notFound('Estudiante no encontrado');
  const comps = await prisma.competency.findMany({ where: { id: { in: d.ratings.map((x) => x.competencyId) } }, include: { scale: true } });
  const byId = new Map(comps.map((c) => [c.id, c]));
  const errors: Record<string, string> = {};
  for (const [i, x] of d.ratings.entries()) {
    const c = byId.get(x.competencyId);
    if (!c) {
      errors[`ratings.${i}.competencyId`] = 'La competencia no existe';
      continue;
    }
    const s = scaleOf(c.scale);
    if (x.score < s.min || x.score > s.max) errors[`ratings.${i}.score`] = `${c.name}: la nota debe estar entre ${s.min} y ${s.max}`;
  }
  if (Object.keys(errors).length) throw badRequest('Revisa las calificaciones', errors);
  const created = [];
  for (const x of d.ratings) {
    const s = scaleOf(byId.get(x.competencyId)!.scale);
    created.push(
      await recordCompetency({
        userId: d.userId,
        competencyId: x.competencyId,
        score: x.score,
        scaleMax: s.max,
        source: 'INSTRUCTOR',
        courseId: d.courseId,
        evaluatorId: u.id,
        notes: x.notes,
        isReviewed: true,
      }),
    );
  }
  await notify(d.userId, {
    type: 'COMPETENCY',
    title: 'Tu facilitador evaluó tus competencias',
    body: `Se registraron ${created.length} calificación(es).`,
    link: '/campus/competencias',
  });
  await evaluateBadges(d.userId);
  await audit(req, 'competency.evaluate', 'User', d.userId, { count: created.length, courseId: d.courseId ?? null });
  res.status(201).json({ created: created.length, ids: created.map((c) => c.id) });
});

// ───────────── Competencia por id (al final para no capturar rutas fijas) ─────────────
r.patch('/:id', manage, async (req, res) => {
  const id = idParam(req);
  const d = body(req, compSchema.partial());
  if (!(await prisma.competency.findUnique({ where: { id } }))) throw notFound('Competencia no encontrada');
  await checkScale(d.scaleId);
  if (d.key && (await prisma.competency.findFirst({ where: { key: d.key, NOT: { id } } }))) throw conflict('Ya existe una competencia con esa clave');
  const c = await prisma.competency.update({ where: { id }, data: d, include: { scale: true } });
  await audit(req, 'competency.update', 'Competency', id);
  res.json(competencyOut(c));
});

r.delete('/:id', manage, async (req, res) => {
  const id = idParam(req);
  if (!(await prisma.competency.findUnique({ where: { id } }))) throw notFound('Competencia no encontrada');
  if ((await prisma.studentCompetency.count({ where: { competencyId: id } })) > 0)
    throw conflict('La competencia ya tiene resultados registrados. Desactívala en lugar de eliminarla.');
  await prisma.competency.delete({ where: { id } });
  await audit(req, 'competency.delete', 'Competency', id);
  res.json({ ok: true });
});

export default r;
