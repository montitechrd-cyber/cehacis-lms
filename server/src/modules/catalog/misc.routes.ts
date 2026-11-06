import fs from 'node:fs/promises';
import { Router, type NextFunction, type Request, type Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { badRequest, conflict, notFound } from '../../lib/errors.js';
import { body, idParam, zDate, zId, zMoney, zText } from '../../lib/validate.js';
import { audit } from '../../lib/audit.js';
import { fileUrl, filePath, saveFile, uploader } from '../../lib/upload.js';
import { requireAuth, requirePermission } from '../../middleware/auth.js';
import { INSTRUCTOR_ROLES, assertInstructors, folderCtx, groupCtx, slugify, staffCourse, uniqueSlug, userBrief } from './helpers.js';

const r = Router();
const staff = requirePermission('courses.manage', 'courses.teach');
const manage = requirePermission('courses.manage');

// ─────────────────────────── Categorías ───────────────────────────

const categorySchema = z.object({
  name: zText(100).min(2, 'El nombre es obligatorio'),
  description: zText(500).nullable().optional(),
});
const catSlugFree = (s: string, excludeId?: number) =>
  prisma.category.findUnique({ where: { slug: s }, select: { id: true } }).then((x) => !!x && x.id !== excludeId);

r.get('/categories', requireAuth, async (_req, res) => {
  const rows = await prisma.category.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { courses: { where: { deletedAt: null } } } } },
  });
  res.json({ data: rows.map(({ _count, ...c }) => ({ ...c, coursesCount: _count.courses })) });
});

r.post('/categories', manage, async (req, res) => {
  const d = body(req, categorySchema);
  const slug = await uniqueSlug((s) => catSlugFree(s), slugify(d.name));
  const c = await prisma.category.create({ data: { ...d, slug } });
  await audit(req, 'category.create', 'Category', c.id, { name: c.name });
  res.status(201).json({ data: { ...c, coursesCount: 0 } });
});

r.patch('/categories/:id', manage, async (req, res) => {
  const id = idParam(req);
  const cur = await prisma.category.findUnique({ where: { id } });
  if (!cur) throw notFound('Categoría no encontrada');
  const d = body(req, categorySchema.partial());
  const slug = d.name && d.name !== cur.name ? await uniqueSlug((s) => catSlugFree(s, id), slugify(d.name)) : undefined;
  const c = await prisma.category.update({ where: { id }, data: { ...d, ...(slug ? { slug } : {}) } });
  await audit(req, 'category.update', 'Category', id, { fields: Object.keys(d) });
  const coursesCount = await prisma.course.count({ where: { categoryId: id, deletedAt: null } });
  res.json({ data: { ...c, coursesCount } });
});

r.delete('/categories/:id', manage, async (req, res) => {
  const id = idParam(req);
  const cur = await prisma.category.findUnique({ where: { id } });
  if (!cur) throw notFound('Categoría no encontrada');
  const n = await prisma.course.count({ where: { categoryId: id, deletedAt: null } });
  if (n > 0) throw conflict(`No se puede eliminar: la categoría tiene ${n} curso(s) asociados`);
  await prisma.category.delete({ where: { id } });
  await audit(req, 'category.delete', 'Category', id, { name: cur.name });
  res.json({ ok: true });
});

// ─────────────────────────── Programas formativos ───────────────────────────

const STATUSES = ['DRAFT', 'IN_DEVELOPMENT', 'PUBLISHED', 'ARCHIVED'] as const;
const programSchema = z.object({
  title: zText(200).min(3, 'El título debe tener al menos 3 caracteres'),
  summary: zText(500).nullable().optional(),
  description: zText(50000).nullable().optional(),
  imageUrl: zText(500).nullable().optional(),
  price: zMoney.optional(),
  status: z.enum(STATUSES).optional(),
});
const progSlugFree = (s: string, excludeId?: number) =>
  prisma.program.findUnique({ where: { slug: s }, select: { id: true } }).then((x) => !!x && x.id !== excludeId);

async function programOut(id: number) {
  const p = await prisma.program.findUnique({
    where: { id },
    include: {
      courses: {
        orderBy: { order: 'asc' },
        include: { course: { select: { id: true, code: true, title: true, slug: true, status: true, level: true, modality: true, price: true, isFree: true, durationHours: true, imageUrl: true, deletedAt: true } } },
      },
    },
  });
  if (!p) throw notFound('Programa no encontrado');
  const { courses, price, ...rest } = p;
  return {
    ...rest,
    price: Number(price),
    courses: courses
      .filter((c) => !c.course.deletedAt)
      .map(({ course: { deletedAt: _d, price: cp, ...c }, order }) => ({ ...c, price: Number(cp), order })),
  };
}

r.get('/programs', staff, async (_req, res) => {
  const rows = await prisma.program.findMany({ orderBy: { createdAt: 'desc' }, include: { _count: { select: { courses: true } } } });
  res.json({ data: rows.map(({ _count, price, ...p }) => ({ ...p, price: Number(price), coursesCount: _count.courses })) });
});

r.get('/programs/:id', staff, async (req, res) => {
  res.json({ data: await programOut(idParam(req)) });
});

r.post('/programs', manage, async (req, res) => {
  const d = body(req, programSchema);
  const slug = await uniqueSlug((s) => progSlugFree(s), slugify(d.title));
  const p = await prisma.program.create({ data: { ...d, slug } });
  await audit(req, 'program.create', 'Program', p.id, { title: p.title });
  res.status(201).json({ data: await programOut(p.id) });
});

r.patch('/programs/:id', manage, async (req, res) => {
  const id = idParam(req);
  if (!(await prisma.program.findUnique({ where: { id }, select: { id: true } }))) throw notFound('Programa no encontrado');
  const d = body(req, programSchema.partial());
  await prisma.program.update({ where: { id }, data: d });
  await audit(req, 'program.update', 'Program', id, { fields: Object.keys(d) });
  res.json({ data: await programOut(id) });
});

r.delete('/programs/:id', manage, async (req, res) => {
  const id = idParam(req);
  const p = await prisma.program.findUnique({ where: { id } });
  if (!p) throw notFound('Programa no encontrado');
  await prisma.program.delete({ where: { id } });
  await audit(req, 'program.delete', 'Program', id, { title: p.title });
  res.json({ ok: true });
});

r.put('/programs/:id/courses', manage, async (req, res) => {
  const id = idParam(req);
  if (!(await prisma.program.findUnique({ where: { id }, select: { id: true } }))) throw notFound('Programa no encontrado');
  const { courseIds } = body(req, z.object({ courseIds: z.array(zId).max(200) }));
  const ids = [...new Set(courseIds)];
  const found = await prisma.course.count({ where: { id: { in: ids }, deletedAt: null } });
  if (found !== ids.length) throw badRequest('Algún curso no existe');
  await prisma.$transaction([
    prisma.programCourse.deleteMany({ where: { programId: id } }),
    prisma.programCourse.createMany({ data: ids.map((courseId, order) => ({ programId: id, courseId, order })) }),
  ]);
  await audit(req, 'program.update', 'Program', id, { courseIds: ids });
  res.json({ data: await programOut(id) });
});

// ─────────────────────────── Carpetas y archivos ───────────────────────────

const fileOut = (f: { id: number; originalName: string; mimeType: string; size: number; createdAt: Date }) => ({
  id: f.id,
  originalName: f.originalName,
  mimeType: f.mimeType,
  size: f.size,
  createdAt: f.createdAt,
  url: fileUrl(f.id),
});

async function folderOut(id: number) {
  const f = await prisma.folder.findUniqueOrThrow({ where: { id }, include: { files: { orderBy: { id: 'asc' } } } });
  return { id: f.id, name: f.name, courseId: f.courseId, createdAt: f.createdAt, files: f.files.map(fileOut) };
}

r.get('/courses/:courseId/folders', staff, async (req, res) => {
  const courseId = idParam(req, 'courseId');
  await staffCourse(req, courseId);
  const rows = await prisma.folder.findMany({ where: { courseId }, orderBy: { id: 'asc' }, include: { files: { orderBy: { id: 'asc' } } } });
  res.json({ data: rows.map((f) => ({ id: f.id, name: f.name, courseId: f.courseId, createdAt: f.createdAt, files: f.files.map(fileOut) })) });
});

r.post('/courses/:courseId/folders', staff, async (req, res) => {
  const courseId = idParam(req, 'courseId');
  await staffCourse(req, courseId);
  const { name } = body(req, z.object({ name: zText(200).min(1, 'El nombre es obligatorio') }));
  const f = await prisma.folder.create({ data: { name, courseId } });
  await audit(req, 'folder.create', 'Folder', f.id, { courseId, name });
  res.status(201).json({ data: await folderOut(f.id) });
});

r.patch('/folders/:id', staff, async (req, res) => {
  const id = idParam(req);
  const f = await folderCtx(id);
  await staffCourse(req, f.courseId);
  const { name } = body(req, z.object({ name: zText(200).min(1, 'El nombre es obligatorio') }));
  await prisma.folder.update({ where: { id }, data: { name } });
  await audit(req, 'folder.update', 'Folder', id, { name });
  res.json({ data: await folderOut(id) });
});

r.delete('/folders/:id', staff, async (req, res) => {
  const id = idParam(req);
  const f = await folderCtx(id);
  await staffCourse(req, f.courseId);
  const files = await prisma.file.findMany({ where: { folderId: id }, select: { id: true, storedName: true } });
  await prisma.$transaction([
    prisma.file.deleteMany({ where: { folderId: id } }),
    prisma.folder.delete({ where: { id } }),
  ]);
  await Promise.all(files.map((x) => fs.unlink(filePath(x.storedName)).catch(() => undefined)));
  await audit(req, 'folder.delete', 'Folder', id, { courseId: f.courseId, name: f.name, files: files.length });
  res.json({ ok: true });
});

async function guardFolder(req: Request, _res: Response, next: NextFunction) {
  try {
    const f = await folderCtx(idParam(req));
    await staffCourse(req, f.courseId);
    next();
  } catch (e) {
    next(e);
  }
}

r.post('/folders/:id/files', staff, guardFolder, uploader().array('files', 10), async (req, res) => {
  const id = idParam(req);
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  if (!files.length) throw badRequest('Adjunta al menos un archivo en el campo "files"');
  for (const file of files) await saveFile(file, req.user!.id, { folderId: id });
  await audit(req, 'folder.upload', 'Folder', id, { count: files.length });
  res.status(201).json({ data: await folderOut(id) });
});

r.delete('/folders/:id/files/:fileId', staff, async (req, res) => {
  const id = idParam(req);
  const fileId = idParam(req, 'fileId');
  const f = await folderCtx(id);
  await staffCourse(req, f.courseId);
  const file = await prisma.file.findFirst({ where: { id: fileId, folderId: id } });
  if (!file) throw notFound('Archivo no encontrado en esta carpeta');
  await prisma.file.delete({ where: { id: fileId } });
  await fs.unlink(filePath(file.storedName)).catch(() => undefined);
  await audit(req, 'folder.file.delete', 'Folder', id, { fileId, name: file.originalName });
  res.json({ ok: true });
});

// ─────────────────────────── Grupos ───────────────────────────

const groupSchema = z.object({
  name: zText(120).min(1, 'El nombre es obligatorio'),
  instructorId: zId.nullable().optional(),
  startDate: zDate.nullable().optional(),
  endDate: zDate.nullable().optional(),
  capacity: z.coerce.number().int().positive().nullable().optional(),
});

const groupInclude = {
  instructor: { select: userBrief },
  _count: { select: { enrollments: true } },
} as const;

const groupOut = (g: { _count: { enrollments: number } } & Record<string, unknown>) => {
  const { _count, ...rest } = g;
  return { ...rest, enrollmentsCount: _count.enrollments };
};

function checkGroupDates(s?: Date | null, e?: Date | null) {
  if (s && e && e < s) throw badRequest('La fecha de fin no puede ser anterior a la de inicio');
}

r.get('/courses/:courseId/groups', staff, async (req, res) => {
  const courseId = idParam(req, 'courseId');
  await staffCourse(req, courseId);
  const rows = await prisma.courseGroup.findMany({ where: { courseId }, orderBy: { id: 'asc' }, include: groupInclude });
  res.json({ data: rows.map(groupOut) });
});

r.post('/courses/:courseId/groups', staff, async (req, res) => {
  const courseId = idParam(req, 'courseId');
  await staffCourse(req, courseId);
  const d = body(req, groupSchema);
  checkGroupDates(d.startDate, d.endDate);
  if (d.instructorId) await assertInstructors([d.instructorId]);
  const g = await prisma.courseGroup.create({ data: { ...d, courseId }, include: groupInclude });
  await audit(req, 'group.create', 'CourseGroup', g.id, { courseId, name: g.name });
  res.status(201).json({ data: groupOut(g) });
});

r.patch('/groups/:id', staff, async (req, res) => {
  const id = idParam(req);
  const cur = await groupCtx(id);
  await staffCourse(req, cur.courseId);
  const d = body(req, groupSchema.partial());
  checkGroupDates(d.startDate === undefined ? cur.startDate : d.startDate, d.endDate === undefined ? cur.endDate : d.endDate);
  if (d.instructorId) await assertInstructors([d.instructorId]);
  const g = await prisma.courseGroup.update({ where: { id }, data: d, include: groupInclude });
  await audit(req, 'group.update', 'CourseGroup', id, { fields: Object.keys(d) });
  res.json({ data: groupOut(g) });
});

r.delete('/groups/:id', staff, async (req, res) => {
  const id = idParam(req);
  const cur = await groupCtx(id);
  await staffCourse(req, cur.courseId);
  await prisma.courseGroup.delete({ where: { id } });
  await audit(req, 'group.delete', 'CourseGroup', id, { courseId: cur.courseId, name: cur.name });
  res.json({ ok: true });
});

r.put('/groups/:id/members', staff, async (req, res) => {
  const id = idParam(req);
  const cur = await groupCtx(id);
  await staffCourse(req, cur.courseId);
  const { enrollmentIds } = body(req, z.object({ enrollmentIds: z.array(zId).max(2000) }));
  const ids = [...new Set(enrollmentIds)];
  const valid = await prisma.enrollment.count({ where: { id: { in: ids }, courseId: cur.courseId } });
  if (valid !== ids.length) throw badRequest('Alguna inscripción no pertenece a este curso');
  if (cur.capacity && ids.length > cur.capacity) throw badRequest(`El grupo admite como máximo ${cur.capacity} integrantes`);
  await prisma.$transaction([
    prisma.enrollment.updateMany({ where: { groupId: id, id: { notIn: ids } }, data: { groupId: null } }),
    prisma.enrollment.updateMany({ where: { id: { in: ids }, courseId: cur.courseId }, data: { groupId: id } }),
  ]);
  await audit(req, 'group.members', 'CourseGroup', id, { enrollmentIds: ids });
  const g = await prisma.courseGroup.findUniqueOrThrow({ where: { id }, include: groupInclude });
  res.json({ data: groupOut(g) });
});

// ─────────────────────────── Opciones de facilitadores ───────────────────────────

r.get('/instructors-options', manage, async (_req, res) => {
  const rows = await prisma.user.findMany({
    where: { deletedAt: null, status: 'ACTIVE', role: { key: { in: INSTRUCTOR_ROLES } } },
    orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    select: { id: true, firstName: true, lastName: true, email: true },
  });
  res.json({ data: rows });
});

export default r;
