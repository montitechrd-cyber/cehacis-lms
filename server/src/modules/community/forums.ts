import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { badRequest, forbidden, notFound } from '../../lib/errors.js';
import { body, query, idParam, zOptId, zText } from '../../lib/validate.js';
import { getPage, paged } from '../../lib/pagination.js';
import { audit } from '../../lib/audit.js';
import { notify } from '../../lib/notify.js';
import { awardPoints } from '../../lib/gamification.js';
import { can, isAdmin, assertCourseStaff } from '../../middleware/auth.js';
import {
  zContent, userSel, shapeUser, buildTree, canModerate, courseStaffIds, loadForum, assertForumAccess,
  forumAccessWhere, loadThreadCtx, threadLink, fullName, snippet, type LoadedForum,
} from './common.js';

const router = Router();

const FORUM_TYPES = ['GENERAL', 'COURSE', 'GROUP', 'EXPERIENCES', 'QA'] as const;
const EDIT_WINDOW_MS = 30 * 60 * 1000;

export const forumInclude = {
  course: { select: { id: true, title: true, slug: true } },
  group: { select: { id: true, name: true, courseId: true } },
} satisfies Prisma.ForumInclude;

/** Conteos por foro (hilos y mensajes no ocultos) para el listado. */
export async function forumStats(ids: number[]) {
  const out = new Map<number, { threadCount: number; postCount: number; lastActivity: Date | null }>();
  if (!ids.length) return out;
  const [threads, posts] = await Promise.all([
    prisma.forumThread.groupBy({ by: ['forumId'], where: { forumId: { in: ids }, status: { not: 'HIDDEN' } }, _count: { _all: true }, _max: { lastPostAt: true } }),
    prisma.$queryRaw<{ forumId: number; c: bigint }[]>`
      SELECT t.forumId AS forumId, COUNT(p.id) AS c
      FROM forum_posts p JOIN forum_threads t ON t.id = p.threadId
      WHERE t.forumId IN (${Prisma.join(ids)}) AND t.status <> 'HIDDEN' AND p.status <> 'HIDDEN'
      GROUP BY t.forumId`,
  ]);
  for (const id of ids) out.set(id, { threadCount: 0, postCount: 0, lastActivity: null });
  for (const t of threads) out.set(t.forumId, { threadCount: t._count._all, postCount: 0, lastActivity: t._max.lastPostAt ?? null });
  for (const p of posts) {
    const s = out.get(Number(p.forumId));
    if (s) s.postCount = Number(p.c);
  }
  return out;
}

type ForumRow = Prisma.ForumGetPayload<{ include: typeof forumInclude }>;
export function shapeForum(f: ForumRow, s?: { threadCount: number; postCount: number; lastActivity: Date | null }) {
  return {
    id: f.id,
    title: f.title,
    description: f.description,
    type: f.type,
    courseId: f.courseId ?? f.group?.courseId ?? null,
    groupId: f.groupId,
    course: f.course,
    group: f.group ? { id: f.group.id, name: f.group.name } : null,
    isLocked: f.isLocked,
    createdAt: f.createdAt,
    threadCount: s?.threadCount ?? 0,
    postCount: s?.postCount ?? 0,
    lastActivity: s?.lastActivity ?? null,
  };
}

export async function forumList(forums: ForumRow[]) {
  const stats = await forumStats(forums.map((f) => f.id));
  return forums.map((f) => shapeForum(f, stats.get(f.id)));
}

/** Gestionar un foro: foros de curso → personal del curso; globales → administradores con community.moderate. */
async function assertManageForum(req: Parameters<typeof assertCourseStaff>[0], f: LoadedForum) {
  if (f.effCourseId != null) return assertCourseStaff(req, f.effCourseId);
  if (!(isAdmin(req) && can(req, 'community.moderate'))) throw forbidden('Solo los administradores gestionan foros globales');
}

// ───────────────────────── Foros ─────────────────────────

router.get('/forums', async (req, res) => {
  const q = query(req, z.object({ courseId: z.coerce.number().int().positive().optional(), type: z.enum(FORUM_TYPES).optional() }));
  const where: Prisma.ForumWhereInput = {
    AND: [
      await forumAccessWhere(req),
      q.courseId ? { OR: [{ courseId: q.courseId }, { group: { is: { courseId: q.courseId } } }] } : {},
      q.type ? { type: q.type } : {},
    ],
  };
  const forums = await prisma.forum.findMany({ where, include: forumInclude, orderBy: [{ courseId: 'asc' }, { id: 'asc' }] });
  res.json({ data: await forumList(forums) });
});

router.get('/forums/:id', async (req, res) => {
  const f = await loadForum(idParam(req));
  await assertForumAccess(req, f);
  const forum = await prisma.forum.findUniqueOrThrow({ where: { id: f.id }, include: forumInclude });
  const stats = await forumStats([f.id]);
  res.json({
    data: { ...shapeForum(forum, stats.get(f.id)), canModerate: await canModerate(req, f.effCourseId) },
  });
});

router.post('/forums', async (req, res) => {
  const d = body(
    req,
    z.object({
      title: z.string().trim().min(3, 'El título es muy corto').max(200),
      description: zText(2000).optional(),
      type: z.enum(FORUM_TYPES),
      courseId: zOptId,
      groupId: zOptId,
    }),
  );
  let courseId = d.courseId ?? null;
  const groupId = d.groupId ?? null;
  if (d.type === 'GROUP' && !groupId) throw badRequest('Los foros de grupo requieren groupId');
  if (d.type !== 'GROUP' && groupId) throw badRequest('groupId solo aplica a foros de grupo');
  if (d.type === 'COURSE' && !courseId) throw badRequest('Los foros de curso requieren courseId');
  if (groupId) {
    const g = await prisma.courseGroup.findUnique({ where: { id: groupId } });
    if (!g) throw notFound('Grupo no encontrado');
    if (courseId && courseId !== g.courseId) throw badRequest('El grupo no pertenece a ese curso');
    courseId = g.courseId;
  }
  if (courseId) {
    if (!(await prisma.course.findFirst({ where: { id: courseId, deletedAt: null }, select: { id: true } }))) throw notFound('Curso no encontrado');
    await assertCourseStaff(req, courseId);
  } else if (!(isAdmin(req) && can(req, 'community.moderate'))) {
    throw forbidden('Solo los administradores crean foros globales');
  }
  const forum = await prisma.forum.create({
    data: { title: d.title, description: d.description || null, type: d.type, courseId, groupId },
    include: forumInclude,
  });
  await audit(req, 'community.forum.create', 'Forum', forum.id, { title: forum.title, type: forum.type, courseId });
  res.status(201).json({ data: shapeForum(forum) });
});

router.patch('/forums/:id', async (req, res) => {
  const f = await loadForum(idParam(req));
  await assertManageForum(req, f);
  const d = body(req, z.object({ title: z.string().trim().min(3).max(200).optional(), description: zText(2000).nullable().optional() }));
  const forum = await prisma.forum.update({
    where: { id: f.id },
    data: { title: d.title, description: d.description === undefined ? undefined : d.description || null },
    include: forumInclude,
  });
  await audit(req, 'community.forum.update', 'Forum', f.id, d);
  res.json({ data: shapeForum(forum) });
});

router.delete('/forums/:id', async (req, res) => {
  const f = await loadForum(idParam(req));
  await assertManageForum(req, f);
  await prisma.forum.delete({ where: { id: f.id } });
  await audit(req, 'community.forum.delete', 'Forum', f.id, { title: f.title });
  res.json({ ok: true });
});

router.post('/forums/:id/lock', async (req, res) => {
  const f = await loadForum(idParam(req));
  const d = body(req, z.object({ isLocked: z.boolean() }));
  if (!(await canModerate(req, f.effCourseId))) await assertManageForum(req, f);
  await prisma.forum.update({ where: { id: f.id }, data: { isLocked: d.isLocked } });
  await audit(req, d.isLocked ? 'community.forum.lock' : 'community.forum.unlock', 'Forum', f.id);
  res.json({ data: { id: f.id, isLocked: d.isLocked } });
});

// ───────────────────────── Hilos ─────────────────────────

router.get('/forums/:id/threads', async (req, res) => {
  const f = await loadForum(idParam(req));
  await assertForumAccess(req, f);
  const mod = await canModerate(req, f.effCourseId);
  const p = getPage(req);
  const where: Prisma.ForumThreadWhereInput = {
    forumId: f.id,
    ...(mod ? {} : { status: { not: 'HIDDEN' } }),
    ...(p.search ? { title: { contains: p.search } } : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.forumThread.findMany({
      where,
      orderBy: [{ isPinned: 'desc' }, { lastPostAt: 'desc' }],
      skip: p.skip,
      take: p.take,
      include: { author: { select: userSel }, _count: { select: { posts: true } } },
    }),
    prisma.forumThread.count({ where }),
  ]);
  res.json({
    ...paged(
      rows.map((t) => ({
        id: t.id,
        forumId: t.forumId,
        title: t.title,
        isPinned: t.isPinned,
        isLocked: t.isLocked,
        status: t.status,
        isHidden: t.status === 'HIDDEN',
        createdAt: t.createdAt,
        lastPostAt: t.lastPostAt,
        postCount: t._count.posts,
        author: shapeUser(t.author),
      })),
      total,
      p,
    ),
    forum: { id: f.id, title: f.title, type: f.type, courseId: f.effCourseId, isLocked: f.isLocked },
    canModerate: mod,
  });
});

router.post('/forums/:id/threads', async (req, res) => {
  const f = await loadForum(idParam(req));
  await assertForumAccess(req, f);
  const d = body(req, z.object({ title: z.string().trim().min(3, 'El título es muy corto').max(250), content: zContent }));
  if (f.isLocked) throw forbidden('Este foro está bloqueado');
  const uid = req.user!.id;
  const { thread, post } = await prisma.$transaction(async (tx) => {
    const thread = await tx.forumThread.create({ data: { forumId: f.id, authorId: uid, title: d.title } });
    const post = await tx.forumPost.create({ data: { threadId: thread.id, authorId: uid, content: d.content } });
    return { thread, post };
  });
  await awardPoints(uid, 'FORUM_POST', { type: 'post', id: post.id });
  if (f.effCourseId != null) {
    const staff = (await courseStaffIds(f.effCourseId)).filter((id) => id !== uid);
    await notify(staff, {
      type: 'FORUM_THREAD',
      title: `Nuevo hilo en ${f.title}`,
      body: `${fullName(req.user!)}: ${d.title}`,
      link: threadLink(thread.id),
    });
  }
  res.status(201).json({ data: { id: thread.id, forumId: f.id, title: thread.title, firstPostId: post.id, createdAt: thread.createdAt } });
});

type PostRow = Prisma.ForumPostGetPayload<{ include: { author: { select: typeof userSel } } }>;
const shapePost = (p: PostRow) => ({
  id: p.id,
  threadId: p.threadId,
  parentId: p.parentId,
  content: p.content,
  status: p.status,
  isHidden: p.status === 'HIDDEN',
  editedAt: p.editedAt,
  createdAt: p.createdAt,
  author: shapeUser(p.author),
});

router.get('/threads/:id', async (req, res) => {
  const { thread, forum, mod } = await loadThreadCtx(req, idParam(req));
  const rows = await prisma.forumPost.findMany({
    where: { threadId: thread.id, ...(mod ? {} : { status: { not: 'HIDDEN' } }) },
    orderBy: { createdAt: 'asc' },
    include: { author: { select: userSel } },
  });
  const author = await prisma.user.findUniqueOrThrow({ where: { id: thread.authorId }, select: userSel });
  res.json({
    data: {
      id: thread.id,
      forumId: forum.id,
      forum: { id: forum.id, title: forum.title, type: forum.type, courseId: forum.effCourseId, isLocked: forum.isLocked },
      title: thread.title,
      isPinned: thread.isPinned,
      isLocked: thread.isLocked,
      status: thread.status,
      isHidden: thread.status === 'HIDDEN',
      createdAt: thread.createdAt,
      lastPostAt: thread.lastPostAt,
      author: shapeUser(author),
      canModerate: mod,
      postCount: rows.length,
      posts: buildTree(rows.map(shapePost)),
    },
  });
});

router.post('/threads/:id/posts', async (req, res) => {
  const { thread, forum } = await loadThreadCtx(req, idParam(req));
  const d = body(req, z.object({ content: zContent, parentId: zOptId }));
  if (thread.isLocked) throw forbidden('Este hilo está bloqueado');
  if (forum.isLocked) throw forbidden('Este foro está bloqueado');
  const uid = req.user!.id;
  let parentAuthorId: number | null = null;
  if (d.parentId) {
    const parent = await prisma.forumPost.findUnique({ where: { id: d.parentId } });
    if (!parent || parent.threadId !== thread.id) throw badRequest('El mensaje al que respondes no pertenece a este hilo');
    if (parent.status === 'HIDDEN') throw badRequest('No puedes responder a un mensaje oculto');
    parentAuthorId = parent.authorId;
  }
  const post = await prisma.$transaction(async (tx) => {
    const created = await tx.forumPost.create({
      data: { threadId: thread.id, authorId: uid, parentId: d.parentId ?? null, content: d.content },
      include: { author: { select: userSel } },
    });
    await tx.forumThread.update({ where: { id: thread.id }, data: { lastPostAt: created.createdAt } });
    return created;
  });
  await awardPoints(uid, 'FORUM_POST', { type: 'post', id: post.id });
  const link = threadLink(thread.id);
  const who = fullName(req.user!);
  if (parentAuthorId && parentAuthorId !== uid) {
    await notify(parentAuthorId, { type: 'FORUM_REPLY', title: `${who} respondió tu mensaje`, body: snippet(d.content), link });
  }
  if (thread.authorId !== uid && thread.authorId !== parentAuthorId) {
    await notify(thread.authorId, { type: 'FORUM_REPLY', title: `${who} respondió en tu hilo "${snippet(thread.title, 60)}"`, body: snippet(d.content), link });
  }
  res.status(201).json({ data: { ...shapePost(post), replies: [] } });
});

// ───────────────────────── Mensajes (edición / borrado) ─────────────────────────

async function loadPostCtx(req: Parameters<typeof canModerate>[0], id: number) {
  const post = await prisma.forumPost.findUnique({ where: { id }, include: { thread: true } });
  if (!post) throw notFound('Mensaje no encontrado');
  const forum = await loadForum(post.thread.forumId);
  await assertForumAccess(req, forum);
  const mod = await canModerate(req, forum.effCourseId);
  return { post, forum, mod };
}

router.patch('/posts/:id', async (req, res) => {
  const { post, mod } = await loadPostCtx(req, idParam(req));
  const d = body(req, z.object({ content: zContent }));
  const isAuthor = post.authorId === req.user!.id;
  if (!mod) {
    if (!isAuthor) throw forbidden('Solo el autor puede editar este mensaje');
    if (post.status === 'HIDDEN') throw forbidden('Este mensaje fue ocultado por un moderador');
    if (Date.now() - post.createdAt.getTime() > EDIT_WINDOW_MS) throw forbidden('Solo puedes editar tu mensaje durante los primeros 30 minutos');
    if (post.thread.isLocked) throw forbidden('Este hilo está bloqueado');
  }
  const updated = await prisma.forumPost.update({
    where: { id: post.id },
    data: { content: d.content, editedAt: new Date() },
    include: { author: { select: userSel } },
  });
  if (!isAuthor) await audit(req, 'community.post.edit', 'ForumPost', post.id, { authorId: post.authorId });
  res.json({ data: shapePost(updated) });
});

router.delete('/posts/:id', async (req, res) => {
  const { post, mod } = await loadPostCtx(req, idParam(req));
  const isAuthor = post.authorId === req.user!.id;
  if (!isAuthor && !mod) throw forbidden('Solo el autor o un moderador puede eliminar este mensaje');
  await prisma.forumPost.delete({ where: { id: post.id } });
  if (!isAuthor) await audit(req, 'community.post.delete', 'ForumPost', post.id, { authorId: post.authorId, threadId: post.threadId });
  res.json({ ok: true });
});

export default router;
