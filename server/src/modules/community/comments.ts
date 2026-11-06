import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { badRequest, forbidden, notFound } from '../../lib/errors.js';
import { body, idParam, zOptId } from '../../lib/validate.js';
import { audit } from '../../lib/audit.js';
import { notify } from '../../lib/notify.js';
import { assertCourseAccess } from '../../middleware/auth.js';
import { zContent, userSel, shapeUser, buildTree, canModerate, courseStaffIds, fullName, snippet } from './common.js';

const router = Router();

async function lessonCourse(lessonId: number) {
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, select: { id: true, title: true, module: { select: { courseId: true } } } });
  if (!lesson) throw notFound('Lección no encontrada');
  return { lesson, courseId: lesson.module.courseId };
}

type CommentRow = { id: number; lessonId: number; parentId: number | null; content: string; status: string; createdAt: Date; user: Parameters<typeof shapeUser>[0] };
const shape = (c: CommentRow) => ({
  id: c.id,
  lessonId: c.lessonId,
  parentId: c.parentId,
  content: c.content,
  status: c.status,
  isHidden: c.status === 'HIDDEN',
  createdAt: c.createdAt,
  author: shapeUser(c.user),
});

router.get('/lessons/:lessonId/comments', async (req, res) => {
  const lessonId = idParam(req, 'lessonId');
  const { courseId } = await lessonCourse(lessonId);
  await assertCourseAccess(req, courseId);
  const mod = await canModerate(req, courseId);
  const rows = await prisma.lessonComment.findMany({
    where: { lessonId, ...(mod ? {} : { status: { not: 'HIDDEN' } }) },
    orderBy: { createdAt: 'asc' },
    include: { user: { select: userSel } },
  });
  res.json({ data: buildTree(rows.map(shape)), meta: { total: rows.length, canModerate: mod } });
});

router.post('/lessons/:lessonId/comments', async (req, res) => {
  const lessonId = idParam(req, 'lessonId');
  const { lesson, courseId } = await lessonCourse(lessonId);
  await assertCourseAccess(req, courseId);
  const d = body(req, z.object({ content: zContent, parentId: zOptId }));
  const uid = req.user!.id;
  let parentAuthorId: number | null = null;
  if (d.parentId) {
    const parent = await prisma.lessonComment.findUnique({ where: { id: d.parentId } });
    if (!parent || parent.lessonId !== lessonId) throw badRequest('El comentario al que respondes no pertenece a esta lección');
    if (parent.status === 'HIDDEN') throw badRequest('No puedes responder a un comentario oculto');
    parentAuthorId = parent.userId;
  }
  const c = await prisma.lessonComment.create({
    data: { lessonId, userId: uid, parentId: d.parentId ?? null, content: d.content },
    include: { user: { select: userSel } },
  });
  const link = `/campus/leccion/${lessonId}`;
  const who = fullName(req.user!);
  const staff = (await courseStaffIds(courseId)).filter((id) => id !== uid && id !== parentAuthorId);
  await notify(staff, { type: 'LESSON_COMMENT', title: `${who} comentó en "${snippet(lesson.title, 60)}"`, body: snippet(d.content), link });
  if (parentAuthorId && parentAuthorId !== uid) {
    await notify(parentAuthorId, { type: 'LESSON_COMMENT_REPLY', title: `${who} respondió tu comentario`, body: snippet(d.content), link });
  }
  res.status(201).json({ data: { ...shape(c), replies: [] } });
});

router.delete('/comments/:id', async (req, res) => {
  const id = idParam(req);
  const c = await prisma.lessonComment.findUnique({ where: { id }, include: { lesson: { select: { module: { select: { courseId: true } } } } } });
  if (!c) throw notFound('Comentario no encontrado');
  const isAuthor = c.userId === req.user!.id;
  if (!isAuthor && !(await canModerate(req, c.lesson.module.courseId))) throw forbidden('Solo el autor o un moderador puede eliminar este comentario');
  await prisma.lessonComment.delete({ where: { id } });
  if (!isAuthor) await audit(req, 'community.comment.delete', 'LessonComment', id, { authorId: c.userId, lessonId: c.lessonId });
  res.json({ ok: true });
});

export default router;
