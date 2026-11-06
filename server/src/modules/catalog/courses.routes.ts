import { Router, type Request } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { badRequest, forbidden, notFound } from '../../lib/errors.js';
import { body, idParam, query, zDate, zId, zMoney, zText } from '../../lib/validate.js';
import { getPage, orderBy, paged } from '../../lib/pagination.js';
import { audit } from '../../lib/audit.js';
import { fileUrl, IMAGE_EXT, saveFile, uploader } from '../../lib/upload.js';
import { can, requirePermission, taughtCourseIds } from '../../middleware/auth.js';
import { assertCompetencies, assertInstructors, getCourseOr404, num, slugify, staffCourse, uniqueSlug, userBrief } from './helpers.js';

const r = Router();
const staff = requirePermission('courses.manage', 'courses.teach');
const manage = requirePermission('courses.manage');

const LEVELS = ['BASIC', 'INTERMEDIATE', 'ADVANCED'] as const;
const MODALITIES = ['VIRTUAL', 'PRESENCIAL', 'HIBRIDA'] as const;
const STATUSES = ['DRAFT', 'IN_DEVELOPMENT', 'PUBLISHED', 'ARCHIVED'] as const;

const pct = z.coerce.number().int().min(0, 'Debe estar entre 0 y 100').max(100, 'Debe estar entre 0 y 100');
const optInt = z.coerce.number().int().min(0).nullable().optional();

const createSchema = z.object({
  title: zText(200).min(3, 'El título debe tener al menos 3 caracteres'),
  subtitle: zText(300).nullable().optional(),
  description: zText(50000).nullable().optional(),
  objectives: z.array(zText(500).min(1)).max(50).optional(),
  audience: zText(5000).nullable().optional(),
  requirements: zText(5000).nullable().optional(),
  categoryId: zId.nullable().optional(),
  level: z.enum(LEVELS).optional(),
  modality: z.enum(MODALITIES).optional(),
  durationHours: z.coerce.number().int().min(0).max(10000).optional(),
  price: zMoney.optional(),
  isFree: z.boolean().optional(),
  startDate: zDate.nullable().optional(),
  endDate: zDate.nullable().optional(),
  capacity: z.coerce.number().int().positive().nullable().optional(),
  enforceSequence: z.boolean().optional(),
  passingScore: pct.optional(),
  requireAllLessons: z.boolean().optional(),
  minAttendancePct: pct.optional(),
  certificateEnabled: z.boolean().optional(),
  certificateTemplateId: zId.nullable().optional(),
  status: z.enum(STATUSES).optional(),
  competencyIds: z.array(zId).max(100).optional(),
  instructorIds: z.array(zId).max(30).optional(),
});
const patchSchema = createSchema.partial();
type CourseInput = z.infer<typeof patchSchema>;

/** Campos que un facilitador asignado NO puede tocar. */
const ADMIN_ONLY: (keyof CourseInput)[] = ['price', 'status', 'instructorIds', 'isFree'];

const listItemInclude = {
  category: { select: { id: true, name: true } },
  instructors: { include: { instructor: { select: userBrief } }, orderBy: { isLead: 'desc' as const } },
  _count: { select: { modules: true, enrollments: true } },
} satisfies Prisma.CourseInclude;

type ListRow = Prisma.CourseGetPayload<{ include: typeof listItemInclude }>;

const mapListItem = (c: ListRow, lessons: number) => ({
  id: c.id,
  code: c.code,
  title: c.title,
  slug: c.slug,
  status: c.status,
  level: c.level,
  modality: c.modality,
  price: Number(c.price),
  isFree: c.isFree,
  durationHours: c.durationHours,
  startDate: c.startDate,
  endDate: c.endDate,
  imageUrl: c.imageUrl,
  category: c.category,
  instructors: c.instructors.map((i) => i.instructor),
  counts: { modules: c._count.modules, lessons, enrollments: c._count.enrollments },
});

async function lessonCounts(courseIds: number[]) {
  const out = new Map<number, number>();
  await Promise.all(
    courseIds.map(async (id) => out.set(id, await prisma.lesson.count({ where: { module: { courseId: id } } }))),
  );
  return out;
}

async function nextCode() {
  const last = await prisma.course.findMany({ where: { code: { startsWith: 'CEH-' } }, orderBy: { id: 'desc' }, take: 25, select: { code: true } });
  let max = 0;
  for (const { code } of last) {
    const n = parseInt(code.slice(4), 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return `CEH-${String(max + 1).padStart(3, '0')}`;
}

const slugFree = (s: string) => prisma.course.findUnique({ where: { slug: s }, select: { id: true } }).then((x) => !!x);

/** Un curso publicado necesita al menos un módulo con una lección publicada. */
async function assertPublishable(courseId: number) {
  const n = await prisma.lesson.count({ where: { isPublished: true, module: { courseId } } });
  if (n < 1) throw badRequest('Para publicar el curso necesitas al menos un módulo con una lección publicada');
}

function validateDates(start?: Date | null, end?: Date | null) {
  if (start && end && end < start) throw badRequest('La fecha de fin no puede ser anterior a la de inicio');
}

async function assertTemplate(id?: number | null) {
  if (id && !(await prisma.certificateTemplate.findUnique({ where: { id }, select: { id: true } }))) throw badRequest('La plantilla de certificado no existe');
}

async function assertCategory(id?: number | null) {
  if (id && !(await prisma.category.findUnique({ where: { id }, select: { id: true } }))) throw badRequest('La categoría no existe');
}

function courseData(d: CourseInput) {
  const { competencyIds: _c, instructorIds: _i, objectives, ...rest } = d;
  const data: Record<string, unknown> = { ...rest };
  if (objectives !== undefined) data.objectives = objectives;
  if (data.isFree === true) data.price = 0;
  // Elimina claves undefined para que Prisma las ignore.
  for (const k of Object.keys(data)) if (data[k] === undefined) delete data[k];
  return data;
}

const instructorLinks = (ids: number[]) => [...new Set(ids)].map((instructorId, i) => ({ instructorId, isLead: i === 0 }));

// ─────────────────────────── Listado ───────────────────────────

const listQuery = z.object({
  status: z.enum(STATUSES).optional(),
  categoryId: zId.optional(),
  level: z.enum(LEVELS).optional(),
  modality: z.enum(MODALITIES).optional(),
});

r.get('/courses', staff, async (req, res) => {
  const p = getPage(req);
  const f = query(req, listQuery);
  const where: Prisma.CourseWhereInput = { deletedAt: null };
  if (!can(req, 'courses.manage')) where.id = { in: await taughtCourseIds(req.user!.id) };
  if (f.status) where.status = f.status;
  if (f.categoryId) where.categoryId = f.categoryId;
  if (f.level) where.level = f.level;
  if (f.modality) where.modality = f.modality;
  if (p.search) where.OR = [{ title: { contains: p.search } }, { code: { contains: p.search } }, { subtitle: { contains: p.search } }];

  const [total, rows] = await Promise.all([
    prisma.course.count({ where }),
    prisma.course.findMany({
      where,
      include: listItemInclude,
      orderBy: orderBy(p, ['title', 'createdAt', 'startDate', 'price'], 'createdAt'),
      skip: p.skip,
      take: p.take,
    }),
  ]);
  const lc = await lessonCounts(rows.map((c) => c.id));
  res.json(paged(rows.map((c) => mapListItem(c, lc.get(c.id) ?? 0)), total, p));
});

// ─────────────────────────── Detalle ───────────────────────────

const resourceInclude = {
  file: { select: { id: true, originalName: true, mimeType: true, size: true } },
  folder: { select: { id: true, name: true, _count: { select: { files: true } } } },
  assessment: { select: { id: true, title: true, type: true } },
  forum: { select: { id: true, title: true } },
  activity: { select: { id: true, title: true, type: true } },
  event: { select: { id: true, title: true, startAt: true } },
} satisfies Prisma.LessonResourceInclude;

export const resourceInclusion = resourceInclude;

export const mapResource = (x: Prisma.LessonResourceGetPayload<{ include: typeof resourceInclude }>) => ({
  id: x.id,
  lessonId: x.lessonId,
  type: x.type,
  title: x.title,
  description: x.description,
  url: x.url,
  fileId: x.fileId,
  folderId: x.folderId,
  assessmentId: x.assessmentId,
  forumId: x.forumId,
  activityId: x.activityId,
  eventId: x.eventId,
  order: x.order,
  isRequired: x.isRequired,
  isDownloadable: x.isDownloadable,
  file: x.file ? { ...x.file, url: fileUrl(x.file.id) } : null,
  folder: x.folder ? { id: x.folder.id, name: x.folder.name, filesCount: x.folder._count.files } : null,
  assessment: x.assessment,
  forum: x.forum,
  activity: x.activity,
  event: x.event,
});

async function fullCourse(id: number) {
  const c = await prisma.course.findFirst({
    where: { id, deletedAt: null },
    include: {
      category: { select: { id: true, name: true, slug: true } },
      competencies: { include: { competency: { select: { id: true, key: true, name: true } } } },
      instructors: { include: { instructor: { select: { ...userBrief, email: true } } }, orderBy: { isLead: 'desc' } },
      certificateTemplate: { select: { id: true, name: true, heading: true, isDefault: true } },
      modules: {
        orderBy: { order: 'asc' },
        include: {
          lessons: {
            orderBy: { order: 'asc' },
            select: {
              id: true, moduleId: true, title: true, summary: true, order: true, durationMin: true, isPublished: true, isPreview: true,
              availableFrom: true, completionRule: true, requiredAssessmentId: true, requiredActivityId: true,
              resources: { orderBy: { order: 'asc' }, include: resourceInclude },
            },
          },
        },
      },
      groups: { orderBy: { id: 'asc' }, include: { instructor: { select: userBrief }, _count: { select: { enrollments: true } } } },
      _count: { select: { enrollments: true } },
    },
  });
  if (!c) throw notFound('Curso no encontrado');
  const { competencies, instructors, modules, groups, _count, price, objectives, ...rest } = c;
  return {
    ...rest,
    price: Number(price),
    objectives: Array.isArray(objectives) ? (objectives as unknown[]).map(String) : [],
    competencies: competencies.map((x) => x.competency),
    instructors: instructors.map((i) => ({ ...i.instructor, isLead: i.isLead })),
    modules: modules.map((m) => ({
      ...m,
      lessons: m.lessons.map((l) => ({ ...l, resources: l.resources.map(mapResource) })),
    })),
    groups: groups.map(({ _count: gc, instructor, ...g }) => ({ ...g, instructor, enrollmentsCount: gc.enrollments })),
    counts: {
      modules: modules.length,
      lessons: modules.reduce((a, m) => a + m.lessons.length, 0),
      enrollments: _count.enrollments,
    },
  };
}

r.get('/courses/:id', staff, async (req, res) => {
  const id = idParam(req);
  await staffCourse(req, id);
  res.json({ data: await fullCourse(id) });
});

// ─────────────────────────── Crear ───────────────────────────

r.post('/courses', manage, async (req, res) => {
  const d = body(req, createSchema);
  validateDates(d.startDate, d.endDate);
  if (d.status === 'PUBLISHED') throw badRequest('Crea el curso en borrador y publícalo cuando tenga contenido');
  await Promise.all([assertCategory(d.categoryId), assertTemplate(d.certificateTemplateId), assertInstructors(d.instructorIds ?? []), assertCompetencies(d.competencyIds ?? [])]);

  const slug = await uniqueSlug(slugFree, slugify(d.title));
  let created: { id: number } | undefined;
  for (let attempt = 0; attempt < 4 && !created; attempt++) {
    const code = await nextCode();
    try {
      created = await prisma.course.create({
        data: {
          ...(courseData(d) as Prisma.CourseUncheckedCreateInput),
          title: d.title,
          code,
          slug,
          objectives: d.objectives ?? [],
          createdById: req.user!.id,
          competencies: d.competencyIds?.length ? { create: [...new Set(d.competencyIds)].map((competencyId) => ({ competencyId })) } : undefined,
          instructors: d.instructorIds?.length ? { create: instructorLinks(d.instructorIds) } : undefined,
        },
        select: { id: true },
      });
    } catch (e) {
      if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') || attempt === 3) throw e;
    }
  }
  await audit(req, 'course.create', 'Course', created!.id, { title: d.title });
  res.status(201).json({ data: await fullCourse(created!.id) });
});

// ─────────────────────────── Editar ───────────────────────────

r.patch('/courses/:id', staff, async (req, res) => {
  const id = idParam(req);
  const existing = await getCourseOr404(id);
  await staffCourse(req, id);
  const d = body(req, patchSchema);
  const isManager = can(req, 'courses.manage');
  if (!isManager) {
    const bad = ADMIN_ONLY.filter((k) => d[k] !== undefined);
    if (bad.length) throw forbidden(`Solo la administración puede modificar: ${bad.join(', ')}`);
  }
  validateDates(d.startDate === undefined ? existing.startDate : d.startDate, d.endDate === undefined ? existing.endDate : d.endDate);
  await Promise.all([assertCategory(d.categoryId), assertTemplate(d.certificateTemplateId), assertInstructors(d.instructorIds ?? []), assertCompetencies(d.competencyIds ?? [])]);
  if (d.status === 'PUBLISHED' && existing.status !== 'PUBLISHED') await assertPublishable(id);

  const data = courseData(d);
  // isFree=false con precio existente se respeta; isFree=true ya fuerza price 0 en courseData.
  await prisma.$transaction(async (tx) => {
    await tx.course.update({ where: { id }, data: data as Prisma.CourseUncheckedUpdateInput });
    if (d.competencyIds) {
      await tx.courseCompetency.deleteMany({ where: { courseId: id } });
      if (d.competencyIds.length) await tx.courseCompetency.createMany({ data: [...new Set(d.competencyIds)].map((competencyId) => ({ courseId: id, competencyId })) });
    }
    if (d.instructorIds) {
      await tx.courseInstructor.deleteMany({ where: { courseId: id } });
      if (d.instructorIds.length) await tx.courseInstructor.createMany({ data: instructorLinks(d.instructorIds).map((l) => ({ ...l, courseId: id })) });
    }
  });
  await audit(req, 'course.update', 'Course', id, { fields: Object.keys(d) });
  res.json({ data: await fullCourse(id) });
});

// ─────────────────────────── Estado ───────────────────────────

r.post('/courses/:id/status', manage, async (req, res) => {
  const id = idParam(req);
  const course = await getCourseOr404(id);
  const { status } = body(req, z.object({ status: z.enum(STATUSES) }));
  if (status === 'PUBLISHED') await assertPublishable(id);
  await prisma.course.update({ where: { id }, data: { status } });
  await audit(req, status === 'PUBLISHED' ? 'course.publish' : 'course.status', 'Course', id, { from: course.status, to: status });
  res.json({ data: { id, status } });
});

// ─────────────────────────── Duplicar ───────────────────────────

r.post('/courses/:id/duplicate', manage, async (req, res) => {
  const id = idParam(req);
  const src = await prisma.course.findFirst({
    where: { id, deletedAt: null },
    include: {
      competencies: true,
      modules: { orderBy: { order: 'asc' }, include: { lessons: { orderBy: { order: 'asc' }, include: { resources: { orderBy: { order: 'asc' } } } } } },
    },
  });
  if (!src) throw notFound('Curso no encontrado');

  const title = `${src.title} (copia)`.slice(0, 200);
  const slug = await uniqueSlug(slugFree, slugify(title));
  const code = await nextCode();
  const SKIP = new Set(['ASSESSMENT', 'FORUM', 'ACTIVITY', 'FOLDER']);

  const newId = await prisma.$transaction(async (tx) => {
    const copy = await tx.course.create({
      data: {
        code, title, slug,
        subtitle: src.subtitle, description: src.description, objectives: (src.objectives ?? []) as Prisma.InputJsonValue,
        audience: src.audience, requirements: src.requirements, imageUrl: src.imageUrl, categoryId: src.categoryId,
        level: src.level, modality: src.modality, durationHours: src.durationHours, price: src.price, currency: src.currency,
        isFree: src.isFree, status: 'DRAFT', capacity: src.capacity, enforceSequence: src.enforceSequence,
        passingScore: src.passingScore, requireAllLessons: src.requireAllLessons, minAttendancePct: src.minAttendancePct,
        certificateEnabled: src.certificateEnabled, certificateTemplateId: src.certificateTemplateId, createdById: req.user!.id,
        competencies: { create: src.competencies.map((c) => ({ competencyId: c.competencyId })) },
      },
      select: { id: true },
    });
    for (const m of src.modules) {
      const nm = await tx.courseModule.create({
        data: { courseId: copy.id, title: m.title, description: m.description, order: m.order, isPublished: m.isPublished, availableFrom: m.availableFrom },
        select: { id: true },
      });
      for (const l of m.lessons) {
        const gated = l.completionRule === 'ASSESSMENT' || l.completionRule === 'ACTIVITY';
        await tx.lesson.create({
          data: {
            moduleId: nm.id, title: l.title, summary: l.summary, content: l.content, order: l.order, durationMin: l.durationMin,
            isPublished: l.isPublished, isPreview: l.isPreview, availableFrom: l.availableFrom,
            completionRule: gated ? 'MANUAL' : l.completionRule,
            resources: {
              create: l.resources
                .filter((x) => !SKIP.has(x.type))
                .map((x) => ({
                  type: x.type, title: x.title, description: x.description, url: x.url, fileId: x.fileId,
                  order: x.order, isRequired: x.isRequired, isDownloadable: x.isDownloadable,
                })),
            },
          },
        });
      }
    }
    return copy.id;
  }, { timeout: 60_000 });

  await audit(req, 'course.duplicate', 'Course', newId, { sourceId: id });
  res.status(201).json({ data: await fullCourse(newId) });
});

// ─────────────────────────── Eliminar ───────────────────────────

r.delete('/courses/:id', manage, async (req, res) => {
  const id = idParam(req);
  await getCourseOr404(id);
  const enrollments = await prisma.enrollment.count({ where: { courseId: id } });
  if (enrollments > 0) {
    await prisma.course.update({ where: { id }, data: { deletedAt: new Date(), status: 'ARCHIVED' } });
    await audit(req, 'course.delete', 'Course', id, { mode: 'soft', enrollments });
    return res.json({ ok: true, mode: 'soft' });
  }
  await prisma.course.delete({ where: { id } });
  await audit(req, 'course.delete', 'Course', id, { mode: 'hard' });
  res.json({ ok: true, mode: 'hard' });
});

// ─────────────────────────── Imagen ───────────────────────────

async function guardCourseParam(req: Request, _res: unknown, next: (e?: unknown) => void) {
  try {
    await staffCourse(req, idParam(req));
    next();
  } catch (e) {
    next(e);
  }
}

r.post('/courses/:id/image', staff, guardCourseParam, uploader({ only: IMAGE_EXT, maxMb: 8 }).single('image'), async (req, res) => {
  const id = idParam(req);
  if (!req.file) throw badRequest('Adjunta una imagen en el campo "image"');
  const file = await saveFile(req.file, req.user!.id, { isPublic: true });
  const imageUrl = fileUrl(file.id);
  await prisma.course.update({ where: { id }, data: { imageUrl } });
  await audit(req, 'course.update', 'Course', id, { fields: ['imageUrl'], fileId: file.id });
  res.json({ data: { id, imageUrl, fileId: file.id } });
});

export default r;
