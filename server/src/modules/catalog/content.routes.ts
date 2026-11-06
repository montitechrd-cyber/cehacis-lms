import { Router } from 'express';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { badRequest, notFound } from '../../lib/errors.js';
import { body, idParam, zDate, zId, zText } from '../../lib/validate.js';
import { audit } from '../../lib/audit.js';
import { requirePermission } from '../../middleware/auth.js';
import { checkOrderIds, isHttpUrl, lessonCtx, moduleCtx, resourceCtx, staffCourse } from './helpers.js';
import { sanitizeHtml } from './sanitize.js';
import { mapResource, resourceInclusion } from './courses.routes.js';

const r = Router();
const staff = requirePermission('courses.manage', 'courses.teach');
const zOrderIds = z.object({ ids: z.array(zId).max(500) });

// ─────────────────────────── Módulos ───────────────────────────

const moduleSchema = z.object({
  title: zText(200).min(2, 'El título es obligatorio'),
  description: zText(5000).nullable().optional(),
  isPublished: z.boolean().optional(),
  availableFrom: zDate.nullable().optional(),
});

r.post('/courses/:courseId/modules', staff, async (req, res) => {
  const courseId = idParam(req, 'courseId');
  await staffCourse(req, courseId);
  const d = body(req, moduleSchema);
  const last = await prisma.courseModule.aggregate({ where: { courseId }, _max: { order: true } });
  const m = await prisma.courseModule.create({ data: { ...d, courseId, order: (last._max.order ?? -1) + 1 } });
  await audit(req, 'module.create', 'CourseModule', m.id, { courseId, title: m.title });
  res.status(201).json({ data: m });
});

// IMPORTANTE: declarada antes de cualquier ruta /modules/:id para claridad; no hay choque (distinto prefijo).
r.put('/courses/:courseId/modules/order', staff, async (req, res) => {
  const courseId = idParam(req, 'courseId');
  await staffCourse(req, courseId);
  const { ids } = body(req, zOrderIds);
  const all = await prisma.courseModule.findMany({ where: { courseId }, select: { id: true } });
  checkOrderIds(ids, all.map((x) => x.id), 'módulo');
  // Los módulos no incluidos en la lista quedan al final conservando su orden relativo.
  const rest = all.map((x) => x.id).filter((x) => !ids.includes(x));
  const finalOrder = [...ids, ...rest];
  await prisma.$transaction(finalOrder.map((id, i) => prisma.courseModule.update({ where: { id }, data: { order: i } })));
  await audit(req, 'module.reorder', 'Course', courseId, { ids: finalOrder });
  res.json({ ok: true, ids: finalOrder });
});

r.patch('/modules/:id', staff, async (req, res) => {
  const id = idParam(req);
  const m = await moduleCtx(id);
  await staffCourse(req, m.courseId);
  const d = body(req, moduleSchema.partial());
  const upd = await prisma.courseModule.update({ where: { id }, data: d });
  await audit(req, 'module.update', 'CourseModule', id, { fields: Object.keys(d) });
  res.json({ data: upd });
});

r.delete('/modules/:id', staff, async (req, res) => {
  const id = idParam(req);
  const m = await moduleCtx(id);
  await staffCourse(req, m.courseId);
  await prisma.courseModule.delete({ where: { id } });
  await audit(req, 'module.delete', 'CourseModule', id, { courseId: m.courseId, title: m.title });
  res.json({ ok: true });
});

// ─────────────────────────── Lecciones ───────────────────────────

const RULES = ['VIEW', 'MANUAL', 'RESOURCES', 'ASSESSMENT', 'ACTIVITY'] as const;

const lessonSchema = z.object({
  title: zText(200).min(2, 'El título es obligatorio'),
  summary: zText(500).nullable().optional(),
  content: z.string().max(500_000, 'El contenido excede el máximo de 500.000 caracteres').nullable().optional(),
  durationMin: z.coerce.number().int().min(0).max(100000).optional(),
  isPublished: z.boolean().optional(),
  isPreview: z.boolean().optional(),
  availableFrom: zDate.nullable().optional(),
  completionRule: z.enum(RULES).optional(),
  requiredAssessmentId: zId.nullable().optional(),
  requiredActivityId: zId.nullable().optional(),
});

/** Valida coherencia regla/ids y pertenencia al curso. Devuelve los ids normalizados. */
async function gate(courseId: number, rule: (typeof RULES)[number], assessmentId?: number | null, activityId?: number | null) {
  let a: number | null = null;
  let t: number | null = null;
  if (rule === 'ASSESSMENT') {
    if (!assessmentId) throw badRequest('La regla ASSESSMENT exige requiredAssessmentId');
    a = assessmentId;
  } else if (rule === 'ACTIVITY') {
    if (!activityId) throw badRequest('La regla ACTIVITY exige requiredActivityId');
    t = activityId;
  }
  if (a && !(await prisma.assessment.findFirst({ where: { id: a, courseId }, select: { id: true } }))) throw badRequest('La evaluación requerida no pertenece a este curso');
  if (t && !(await prisma.practicalActivity.findFirst({ where: { id: t, courseId }, select: { id: true } }))) throw badRequest('La actividad requerida no pertenece a este curso');
  return { requiredAssessmentId: a, requiredActivityId: t };
}

const lessonDetailInclude = {
  resources: { orderBy: { order: 'asc' as const }, include: resourceInclusion },
} satisfies Prisma.LessonInclude;

async function lessonDetail(id: number) {
  const l = await prisma.lesson.findUnique({ where: { id }, include: { ...lessonDetailInclude, module: { select: { id: true, courseId: true, title: true } } } });
  if (!l) throw notFound('Lección no encontrada');
  return { ...l, resources: l.resources.map(mapResource) };
}

r.post('/modules/:moduleId/lessons', staff, async (req, res) => {
  const moduleId = idParam(req, 'moduleId');
  const m = await moduleCtx(moduleId);
  await staffCourse(req, m.courseId);
  const d = body(req, lessonSchema);
  const rule = d.completionRule ?? 'MANUAL';
  const gates = await gate(m.courseId, rule, d.requiredAssessmentId, d.requiredActivityId);
  const last = await prisma.lesson.aggregate({ where: { moduleId }, _max: { order: true } });
  const l = await prisma.lesson.create({
    data: {
      ...d,
      content: d.content != null ? sanitizeHtml(d.content) : d.content,
      completionRule: rule,
      ...gates,
      moduleId,
      order: (last._max.order ?? -1) + 1,
    },
  });
  await audit(req, 'lesson.create', 'Lesson', l.id, { moduleId, title: l.title });
  res.status(201).json({ data: await lessonDetail(l.id) });
});

r.put('/modules/:moduleId/lessons/order', staff, async (req, res) => {
  const moduleId = idParam(req, 'moduleId');
  const m = await moduleCtx(moduleId);
  await staffCourse(req, m.courseId);
  const { ids } = body(req, zOrderIds);
  const all = await prisma.lesson.findMany({ where: { moduleId }, orderBy: { order: 'asc' }, select: { id: true } });
  checkOrderIds(ids, all.map((x) => x.id), 'lección');
  const finalOrder = [...ids, ...all.map((x) => x.id).filter((x) => !ids.includes(x))];
  await prisma.$transaction(finalOrder.map((id, i) => prisma.lesson.update({ where: { id }, data: { order: i } })));
  await audit(req, 'lesson.reorder', 'CourseModule', moduleId, { ids: finalOrder });
  res.json({ ok: true, ids: finalOrder });
});

r.get('/lessons/:id', staff, async (req, res) => {
  const id = idParam(req);
  const l = await lessonCtx(id);
  await staffCourse(req, l.module.courseId);
  res.json({ data: await lessonDetail(id) });
});

r.patch('/lessons/:id', staff, async (req, res) => {
  const id = idParam(req);
  const l = await lessonCtx(id);
  const courseId = l.module.courseId;
  await staffCourse(req, courseId);
  const d = body(req, lessonSchema.partial());
  const data: Prisma.LessonUncheckedUpdateInput = { ...d };
  if (d.content !== undefined) data.content = d.content != null ? sanitizeHtml(d.content) : null;
  if (d.completionRule !== undefined || d.requiredAssessmentId !== undefined || d.requiredActivityId !== undefined) {
    const rule = d.completionRule ?? l.completionRule;
    const g = await gate(
      courseId,
      rule,
      d.requiredAssessmentId !== undefined ? d.requiredAssessmentId : l.requiredAssessmentId,
      d.requiredActivityId !== undefined ? d.requiredActivityId : l.requiredActivityId,
    );
    Object.assign(data, { completionRule: rule, ...g });
  }
  await prisma.lesson.update({ where: { id }, data });
  await audit(req, 'lesson.update', 'Lesson', id, { fields: Object.keys(d) });
  res.json({ data: await lessonDetail(id) });
});

r.delete('/lessons/:id', staff, async (req, res) => {
  const id = idParam(req);
  const l = await lessonCtx(id);
  await staffCourse(req, l.module.courseId);
  await prisma.lesson.delete({ where: { id } });
  await audit(req, 'lesson.delete', 'Lesson', id, { moduleId: l.moduleId, title: l.title });
  res.json({ ok: true });
});

r.post('/lessons/:id/move', staff, async (req, res) => {
  const id = idParam(req);
  const l = await lessonCtx(id);
  await staffCourse(req, l.module.courseId);
  const { moduleId, order } = body(req, z.object({ moduleId: zId, order: z.coerce.number().int().min(0).default(0) }));
  const target = await moduleCtx(moduleId);
  if (target.courseId !== l.module.courseId) throw badRequest('El módulo destino debe pertenecer al mismo curso');
  const others = await prisma.lesson.findMany({ where: { moduleId, NOT: { id } }, orderBy: { order: 'asc' }, select: { id: true } });
  const ids = others.map((x) => x.id);
  ids.splice(Math.min(order, ids.length), 0, id);
  await prisma.$transaction([
    prisma.lesson.update({ where: { id }, data: { moduleId } }),
    ...ids.map((lid, i) => prisma.lesson.update({ where: { id: lid }, data: { order: i } })),
  ]);
  await audit(req, 'lesson.move', 'Lesson', id, { from: l.moduleId, to: moduleId, order });
  res.json({ data: await lessonDetail(id) });
});

// ─────────────────────────── Recursos ───────────────────────────

const TYPES = ['DOCUMENT', 'FILE', 'VIDEO', 'AUDIO', 'PRESENTATION', 'LINK', 'FOLDER', 'EMBED', 'LIVE_SESSION', 'RECORDING', 'ASSESSMENT', 'FORUM', 'ACTIVITY'] as const;
type RType = (typeof TYPES)[number];
const optId = zId.nullable().optional();

const resourceSchema = z.object({
  type: z.enum(TYPES),
  title: zText(200).min(1, 'El título es obligatorio'),
  description: zText(5000).nullable().optional(),
  url: zText(1000).nullable().optional(),
  fileId: optId,
  folderId: optId,
  assessmentId: optId,
  forumId: optId,
  activityId: optId,
  eventId: optId,
  isRequired: z.boolean().optional(),
  isDownloadable: z.boolean().optional(),
});
type ResourceInput = z.infer<typeof resourceSchema>;

const URL_TYPES: RType[] = ['LINK', 'EMBED', 'LIVE_SESSION', 'RECORDING'];
const URL_OR_FILE: RType[] = ['VIDEO', 'AUDIO', 'PRESENTATION', 'DOCUMENT'];

/** Valida el recurso por tipo y devuelve solo los campos relevantes (el resto en null). */
async function buildResource(courseId: number, v: ResourceInput) {
  const out = { url: null as string | null, fileId: null as number | null, folderId: null as number | null, assessmentId: null as number | null, forumId: null as number | null, activityId: null as number | null, eventId: null as number | null };
  const url = v.url?.trim() || null;
  if (url && !isHttpUrl(url)) throw badRequest('La URL debe comenzar con http:// o https://');

  if (URL_TYPES.includes(v.type)) {
    if (!url) throw badRequest('Este tipo de recurso requiere una URL');
    out.url = url;
    if (v.type === 'LIVE_SESSION' && v.eventId) out.eventId = v.eventId;
  } else if (URL_OR_FILE.includes(v.type)) {
    if (!url && !v.fileId) throw badRequest('Indica una URL o sube un archivo');
    out.url = url;
    out.fileId = v.fileId ?? null;
  } else if (v.type === 'FILE') {
    if (!v.fileId) throw badRequest('El recurso de archivo requiere fileId');
    out.fileId = v.fileId;
  } else if (v.type === 'FOLDER') {
    if (!v.folderId) throw badRequest('El recurso de carpeta requiere folderId');
    out.folderId = v.folderId;
  } else if (v.type === 'ASSESSMENT') {
    if (!v.assessmentId) throw badRequest('El recurso de evaluación requiere assessmentId');
    out.assessmentId = v.assessmentId;
  } else if (v.type === 'FORUM') {
    if (!v.forumId) throw badRequest('El recurso de foro requiere forumId');
    out.forumId = v.forumId;
  } else if (v.type === 'ACTIVITY') {
    if (!v.activityId) throw badRequest('El recurso de actividad requiere activityId');
    out.activityId = v.activityId;
  }

  if (out.fileId && !(await prisma.file.findUnique({ where: { id: out.fileId }, select: { id: true } }))) throw badRequest('El archivo indicado no existe');
  if (out.folderId && !(await prisma.folder.findFirst({ where: { id: out.folderId, courseId }, select: { id: true } }))) throw badRequest('La carpeta no pertenece a este curso');
  if (out.assessmentId && !(await prisma.assessment.findFirst({ where: { id: out.assessmentId, courseId }, select: { id: true } }))) throw badRequest('La evaluación no pertenece a este curso');
  if (out.forumId && !(await prisma.forum.findFirst({ where: { id: out.forumId, courseId }, select: { id: true } }))) throw badRequest('El foro no pertenece a este curso');
  if (out.activityId && !(await prisma.practicalActivity.findFirst({ where: { id: out.activityId, courseId }, select: { id: true } }))) throw badRequest('La actividad no pertenece a este curso');
  if (out.eventId && !(await prisma.event.findFirst({ where: { id: out.eventId, courseId }, select: { id: true } }))) throw badRequest('El evento no pertenece a este curso');
  return out;
}

async function resourceOut(id: number) {
  const x = await prisma.lessonResource.findUniqueOrThrow({ where: { id }, include: resourceInclusion });
  return mapResource(x);
}

r.post('/lessons/:lessonId/resources', staff, async (req, res) => {
  const lessonId = idParam(req, 'lessonId');
  const l = await lessonCtx(lessonId);
  const courseId = l.module.courseId;
  await staffCourse(req, courseId);
  const d = body(req, resourceSchema);
  const fields = await buildResource(courseId, d);
  const last = await prisma.lessonResource.aggregate({ where: { lessonId }, _max: { order: true } });
  const x = await prisma.lessonResource.create({
    data: {
      lessonId,
      type: d.type,
      title: d.title,
      description: d.description ?? null,
      ...fields,
      isRequired: d.isRequired ?? false,
      isDownloadable: d.isDownloadable ?? true,
      order: (last._max.order ?? -1) + 1,
    },
  });
  await audit(req, 'resource.create', 'LessonResource', x.id, { lessonId, type: x.type, title: x.title });
  res.status(201).json({ data: await resourceOut(x.id) });
});

r.put('/lessons/:lessonId/resources/order', staff, async (req, res) => {
  const lessonId = idParam(req, 'lessonId');
  const l = await lessonCtx(lessonId);
  await staffCourse(req, l.module.courseId);
  const { ids } = body(req, zOrderIds);
  const all = await prisma.lessonResource.findMany({ where: { lessonId }, orderBy: { order: 'asc' }, select: { id: true } });
  checkOrderIds(ids, all.map((x) => x.id), 'recurso');
  const finalOrder = [...ids, ...all.map((x) => x.id).filter((x) => !ids.includes(x))];
  await prisma.$transaction(finalOrder.map((id, i) => prisma.lessonResource.update({ where: { id }, data: { order: i } })));
  await audit(req, 'resource.reorder', 'Lesson', lessonId, { ids: finalOrder });
  res.json({ ok: true, ids: finalOrder });
});

r.patch('/resources/:id', staff, async (req, res) => {
  const id = idParam(req);
  const cur = await resourceCtx(id);
  const courseId = cur.lesson.module.courseId;
  await staffCourse(req, courseId);
  const p = body(req, resourceSchema.partial());
  // Mezcla con el estado actual y revalida el conjunto completo.
  const merged: ResourceInput = {
    type: p.type ?? cur.type,
    title: p.title ?? cur.title,
    description: p.description !== undefined ? p.description : cur.description,
    url: p.url !== undefined ? p.url : cur.url,
    fileId: p.fileId !== undefined ? p.fileId : cur.fileId,
    folderId: p.folderId !== undefined ? p.folderId : cur.folderId,
    assessmentId: p.assessmentId !== undefined ? p.assessmentId : cur.assessmentId,
    forumId: p.forumId !== undefined ? p.forumId : cur.forumId,
    activityId: p.activityId !== undefined ? p.activityId : cur.activityId,
    eventId: p.eventId !== undefined ? p.eventId : cur.eventId,
  };
  const fields = await buildResource(courseId, merged);
  await prisma.lessonResource.update({
    where: { id },
    data: {
      type: merged.type,
      title: merged.title,
      description: merged.description ?? null,
      ...fields,
      ...(p.isRequired !== undefined ? { isRequired: p.isRequired } : {}),
      ...(p.isDownloadable !== undefined ? { isDownloadable: p.isDownloadable } : {}),
    },
  });
  await audit(req, 'resource.update', 'LessonResource', id, { fields: Object.keys(p) });
  res.json({ data: await resourceOut(id) });
});

r.delete('/resources/:id', staff, async (req, res) => {
  const id = idParam(req);
  const cur = await resourceCtx(id);
  await staffCourse(req, cur.lesson.module.courseId);
  await prisma.lessonResource.delete({ where: { id } });
  await audit(req, 'resource.delete', 'LessonResource', id, { lessonId: cur.lessonId, title: cur.title });
  res.json({ ok: true });
});

export default r;
