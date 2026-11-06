import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { badRequest, forbidden, notFound } from '../../lib/errors.js';
import { body, query, idParam, zOptId, zText } from '../../lib/validate.js';
import { getPage, paged } from '../../lib/pagination.js';
import { audit } from '../../lib/audit.js';
import { notify } from '../../lib/notify.js';
import { isAdmin, requirePermission, assertCourseStaff, taughtCourseIds } from '../../middleware/auth.js';
import { userSel, shapeUser, ACTIVE_ENROLLMENT, snippet } from './common.js';

const router = Router();

const include = {
  author: { select: userSel },
  course: { select: { id: true, title: true, slug: true } },
} satisfies Prisma.AnnouncementInclude;
type Row = Prisma.AnnouncementGetPayload<{ include: typeof include }>;

export const shapeAnnouncement = (a: Row) => ({
  id: a.id,
  title: a.title,
  body: a.body,
  audience: a.audience,
  courseId: a.courseId,
  isPinned: a.isPinned,
  publishedAt: a.publishedAt,
  author: shapeUser(a.author),
  course: a.course,
});

router.get('/announcements', async (req, res) => {
  const q = query(req, z.object({ courseId: z.coerce.number().int().positive().optional() }));
  const p = getPage(req);
  const me = req.user!;
  const and: Prisma.AnnouncementWhereInput[] = [];
  if (!isAdmin(req)) {
    const [taught, enr] = await Promise.all([
      taughtCourseIds(me.id),
      prisma.enrollment.findMany({ where: { userId: me.id, status: { in: [...ACTIVE_ENROLLMENT] } }, select: { courseId: true } }),
    ]);
    const courseIds = [...new Set([...taught, ...enr.map((e) => e.courseId)])];
    const or: Prisma.AnnouncementWhereInput[] = [{ audience: 'ALL' }];
    if (me.role === 'STUDENT') or.push({ audience: 'STUDENTS' });
    if (me.role === 'INSTRUCTOR') or.push({ audience: 'INSTRUCTORS' });
    if (courseIds.length) or.push({ audience: 'COURSE', courseId: { in: courseIds } });
    and.push({ OR: or });
  }
  if (q.courseId) and.push({ courseId: q.courseId });
  const where: Prisma.AnnouncementWhereInput = and.length ? { AND: and } : {};
  const [rows, total] = await Promise.all([
    prisma.announcement.findMany({ where, include, orderBy: [{ isPinned: 'desc' }, { publishedAt: 'desc' }], skip: p.skip, take: p.take }),
    prisma.announcement.count({ where }),
  ]);
  res.json(paged(rows.map(shapeAnnouncement), total, p));
});

const createSchema = z.object({
  title: z.string().trim().min(3, 'El título es muy corto').max(200),
  body: z.string().trim().min(1, 'El anuncio no puede estar vacío').max(10000),
  audience: z.enum(['ALL', 'STUDENTS', 'INSTRUCTORS', 'COURSE']),
  courseId: zOptId,
  isPinned: z.boolean().default(false),
  notify: z.boolean().default(false),
});

async function audienceIds(audience: string, courseId: number | null) {
  const active = { status: 'ACTIVE' as const, deletedAt: null };
  if (audience === 'COURSE' && courseId) {
    const [enr, ins] = await Promise.all([
      prisma.enrollment.findMany({ where: { courseId, status: { in: [...ACTIVE_ENROLLMENT] }, user: active }, select: { userId: true } }),
      prisma.courseInstructor.findMany({ where: { courseId, instructor: active }, select: { instructorId: true } }),
    ]);
    return [...enr.map((e) => e.userId), ...ins.map((i) => i.instructorId)];
  }
  const role = audience === 'STUDENTS' ? { role: { key: 'STUDENT' } } : audience === 'INSTRUCTORS' ? { role: { key: 'INSTRUCTOR' } } : {};
  return (await prisma.user.findMany({ where: { ...active, ...role }, select: { id: true } })).map((u) => u.id);
}

router.post('/announcements', requirePermission('announcements.manage'), async (req, res) => {
  const d = body(req, createSchema);
  let courseId: number | null = null;
  if (d.audience === 'COURSE') {
    if (!d.courseId) throw badRequest('Los anuncios de curso requieren courseId');
    courseId = d.courseId;
    if (!(await prisma.course.findFirst({ where: { id: courseId, deletedAt: null }, select: { id: true } }))) throw notFound('Curso no encontrado');
    await assertCourseStaff(req, courseId);
  } else if (!isAdmin(req)) {
    throw forbidden('Los facilitadores solo pueden publicar anuncios dirigidos a sus cursos');
  }
  const a = await prisma.announcement.create({
    data: { title: d.title, body: d.body, audience: d.audience, courseId, authorId: req.user!.id, isPinned: d.isPinned },
    include,
  });
  let notified = 0;
  if (d.notify) {
    const ids = [...new Set(await audienceIds(d.audience, courseId))].filter((id) => id !== req.user!.id);
    notified = ids.length;
    for (let i = 0; i < ids.length; i += 500) {
      await notify(ids.slice(i, i + 500), {
        type: 'ANNOUNCEMENT',
        title: d.title,
        body: snippet(d.body, 300),
        link: courseId ? `/campus/cursos/${courseId}/espacio` : '/campus/comunidad',
        email: true,
      });
    }
  }
  await audit(req, 'community.announcement.create', 'Announcement', a.id, { audience: d.audience, courseId, notified });
  res.status(201).json({ data: { ...shapeAnnouncement(a), notified } });
});

async function loadOwned(req: Parameters<typeof isAdmin>[0], id: number) {
  const a = await prisma.announcement.findUnique({ where: { id } });
  if (!a) throw notFound('Anuncio no encontrado');
  if (a.authorId !== req.user!.id && !isAdmin(req)) throw forbidden('Solo el autor o un administrador puede modificar este anuncio');
  return a;
}

router.patch('/announcements/:id', requirePermission('announcements.manage'), async (req, res) => {
  const a = await loadOwned(req, idParam(req));
  const d = body(
    req,
    z.object({
      title: z.string().trim().min(3).max(200).optional(),
      body: z.string().trim().min(1).max(10000).optional(),
      isPinned: z.boolean().optional(),
    }),
  );
  const updated = await prisma.announcement.update({ where: { id: a.id }, data: d, include });
  await audit(req, 'community.announcement.update', 'Announcement', a.id, { fields: Object.keys(d) });
  res.json({ data: shapeAnnouncement(updated) });
});

router.delete('/announcements/:id', requirePermission('announcements.manage'), async (req, res) => {
  const a = await loadOwned(req, idParam(req));
  await prisma.announcement.delete({ where: { id: a.id } });
  await audit(req, 'community.announcement.delete', 'Announcement', a.id, { title: a.title });
  res.json({ ok: true });
});

export default router;
