import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { badRequest, conflict, notFound } from '../../lib/errors.js';
import { body, query, idParam } from '../../lib/validate.js';
import { getPage, paged } from '../../lib/pagination.js';
import { audit } from '../../lib/audit.js';
import { notify } from '../../lib/notify.js';
import { isAdmin, requirePermission, assertCourseAccess, taughtCourseIds } from '../../middleware/auth.js';
import {
  userSel, shapeUser, canModerate, assertModerator, loadForum, assertForumAccess, loadThreadCtx,
  courseStaffIds, adminIds, snippet, threadLink,
} from './common.js';

const router = Router();

export const TARGET_TYPES = ['FORUM_POST', 'THREAD', 'LESSON_COMMENT'] as const;
type TargetType = (typeof TARGET_TYPES)[number];

export interface Resolved {
  targetType: TargetType;
  targetId: number;
  courseId: number | null;
  forumId: number | null;
  threadId: number | null;
  lessonId: number | null;
  content: string;
  status: string;
  author: ReturnType<typeof shapeUser>;
  link: string;
}

/** Resuelve en lote el contenido, curso y autor de los objetivos de moderación. */
export async function resolveTargets(items: { targetType: string; targetId: number }[]) {
  const out = new Map<string, Resolved>();
  const ids = (t: TargetType) => [...new Set(items.filter((i) => i.targetType === t).map((i) => i.targetId))];
  const forumSel = { select: { courseId: true, group: { select: { courseId: true } } } } as const;
  const [posts, threads, comments] = await Promise.all([
    prisma.forumPost.findMany({
      where: { id: { in: ids('FORUM_POST') } },
      include: { author: { select: userSel }, thread: { select: { id: true, forumId: true, forum: forumSel } } },
    }),
    prisma.forumThread.findMany({
      where: { id: { in: ids('THREAD') } },
      include: { author: { select: userSel }, forum: forumSel, posts: { orderBy: { createdAt: 'asc' }, take: 1, select: { content: true } } },
    }),
    prisma.lessonComment.findMany({
      where: { id: { in: ids('LESSON_COMMENT') } },
      include: { user: { select: userSel }, lesson: { select: { id: true, module: { select: { courseId: true } } } } },
    }),
  ]);
  for (const p of posts) {
    out.set(`FORUM_POST:${p.id}`, {
      targetType: 'FORUM_POST', targetId: p.id, courseId: p.thread.forum.courseId ?? p.thread.forum.group?.courseId ?? null,
      forumId: p.thread.forumId, threadId: p.thread.id, lessonId: null, content: p.content, status: p.status,
      author: shapeUser(p.author), link: threadLink(p.thread.id),
    });
  }
  for (const t of threads) {
    out.set(`THREAD:${t.id}`, {
      targetType: 'THREAD', targetId: t.id, courseId: t.forum.courseId ?? t.forum.group?.courseId ?? null,
      forumId: t.forumId, threadId: t.id, lessonId: null, content: `${t.title}\n${t.posts[0]?.content ?? ''}`.trim(), status: t.status,
      author: shapeUser(t.author), link: threadLink(t.id),
    });
  }
  for (const c of comments) {
    out.set(`LESSON_COMMENT:${c.id}`, {
      targetType: 'LESSON_COMMENT', targetId: c.id, courseId: c.lesson.module.courseId,
      forumId: null, threadId: null, lessonId: c.lesson.id, content: c.content, status: c.status,
      author: shapeUser(c.user), link: `/campus/leccion/${c.lesson.id}`,
    });
  }
  return out;
}

async function resolveOne(type: TargetType, id: number) {
  const t = (await resolveTargets([{ targetType: type, targetId: id }])).get(`${type}:${id}`);
  if (!t) throw notFound('Contenido no encontrado');
  return t;
}

// ───────────────────────── Hilos: fijar y bloquear ─────────────────────────

router.post('/threads/:id/pin', async (req, res) => {
  const { thread, forum } = await loadThreadCtx(req, idParam(req));
  const d = body(req, z.object({ isPinned: z.boolean() }));
  await assertModerator(req, forum.effCourseId);
  await prisma.forumThread.update({ where: { id: thread.id }, data: { isPinned: d.isPinned } });
  await audit(req, d.isPinned ? 'community.thread.pin' : 'community.thread.unpin', 'ForumThread', thread.id);
  res.json({ data: { id: thread.id, isPinned: d.isPinned } });
});

router.post('/threads/:id/lock', async (req, res) => {
  const { thread, forum } = await loadThreadCtx(req, idParam(req));
  const d = body(req, z.object({ isLocked: z.boolean() }));
  await assertModerator(req, forum.effCourseId);
  await prisma.forumThread.update({ where: { id: thread.id }, data: { isLocked: d.isLocked } });
  await audit(req, d.isLocked ? 'community.thread.lock' : 'community.thread.unlock', 'ForumThread', thread.id);
  res.json({ data: { id: thread.id, isLocked: d.isLocked } });
});

// ───────────────────────── Ocultar / mostrar contenido ─────────────────────────

async function setStatus(type: TargetType, id: number, status: 'VISIBLE' | 'HIDDEN') {
  if (type === 'FORUM_POST') await prisma.forumPost.update({ where: { id }, data: { status } });
  else if (type === 'THREAD') await prisma.forumThread.update({ where: { id }, data: { status } });
  else await prisma.lessonComment.update({ where: { id }, data: { status } });
}

router.post('/moderation/:targetType/:id/status', async (req, res) => {
  const type = z.enum(TARGET_TYPES, { errorMap: () => ({ message: 'Tipo de contenido inválido' }) }).parse(req.params.targetType);
  const id = idParam(req);
  const d = body(req, z.object({ status: z.enum(['VISIBLE', 'HIDDEN']) }));
  const t = await resolveOne(type, id);
  await assertModerator(req, t.courseId);
  await setStatus(type, id, d.status);
  await audit(req, 'community.moderate.status', type, id, { from: t.status, to: d.status, authorId: t.author.id });
  res.json({ data: { targetType: type, targetId: id, status: d.status } });
});

// ───────────────────────── Reportes ─────────────────────────

router.post('/reports', async (req, res) => {
  const d = body(
    req,
    z.object({
      targetType: z.enum(TARGET_TYPES),
      targetId: z.coerce.number().int().positive(),
      reason: z.string().trim().min(3, 'Indica el motivo del reporte').max(500, 'Máximo 500 caracteres'),
    }),
  );
  const t = await resolveOne(d.targetType, d.targetId);
  if (t.forumId != null) await assertForumAccess(req, await loadForum(t.forumId));
  else if (t.courseId != null) await assertCourseAccess(req, t.courseId);
  if (t.author.id === req.user!.id) throw badRequest('No puedes reportar tu propio contenido');
  const dup = await prisma.contentReport.findFirst({
    where: { reporterId: req.user!.id, targetType: d.targetType, targetId: d.targetId, status: 'OPEN' },
  });
  if (dup) throw conflict('Ya reportaste este contenido');
  const report = await prisma.contentReport.create({
    data: { reporterId: req.user!.id, targetType: d.targetType, targetId: d.targetId, reason: d.reason },
  });
  const recipients = (t.courseId != null ? await courseStaffIds(t.courseId) : []).concat(await adminIds());
  await notify(
    recipients.filter((id) => id !== req.user!.id),
    { type: 'CONTENT_REPORT', title: 'Nuevo contenido reportado', body: snippet(d.reason, 200), link: '/panel/comunidad?tab=moderacion' },
  );
  res.status(201).json({ data: { id: report.id, status: report.status, createdAt: report.createdAt } });
});

router.get('/moderation/reports', requirePermission('community.moderate'), async (req, res) => {
  const q = query(req, z.object({ status: z.enum(['OPEN', 'RESOLVED', 'DISMISSED', 'ALL']).default('OPEN') }));
  const p = getPage(req);
  const where = q.status === 'ALL' ? {} : { status: q.status };
  const include = { reporter: { select: userSel }, resolvedBy: { select: userSel } } as const;
  const admin = isAdmin(req);

  let rows;
  let total: number;
  let targets: Map<string, Resolved>;
  if (admin) {
    [rows, total] = await Promise.all([
      prisma.contentReport.findMany({ where, include, orderBy: { createdAt: 'desc' }, skip: p.skip, take: p.take }),
      prisma.contentReport.count({ where }),
    ]);
    targets = await resolveTargets(rows);
  } else {
    // Facilitadores: solo reportes de contenido de sus cursos (se filtra tras resolver el objetivo).
    const taught = new Set(await taughtCourseIds(req.user!.id));
    const all = await prisma.contentReport.findMany({ where, include, orderBy: { createdAt: 'desc' }, take: 1000 });
    const all_targets = await resolveTargets(all);
    const mine = all.filter((r) => {
      const t = all_targets.get(`${r.targetType}:${r.targetId}`);
      return t?.courseId != null && taught.has(t.courseId);
    });
    total = mine.length;
    rows = mine.slice(p.skip, p.skip + p.take);
    targets = all_targets;
  }

  res.json(
    paged(
      rows.map((r) => {
        const t = targets.get(`${r.targetType}:${r.targetId}`);
        return {
          id: r.id,
          targetType: r.targetType,
          targetId: r.targetId,
          reason: r.reason,
          status: r.status,
          createdAt: r.createdAt,
          resolvedAt: r.resolvedAt,
          reporter: shapeUser(r.reporter),
          resolvedBy: r.resolvedBy ? shapeUser(r.resolvedBy) : null,
          target: t
            ? { exists: true, courseId: t.courseId, forumId: t.forumId, threadId: t.threadId, lessonId: t.lessonId, content: t.content, status: t.status, author: t.author, link: t.link }
            : { exists: false },
        };
      }),
      total,
      p,
    ),
  );
});

router.patch('/moderation/reports/:id', requirePermission('community.moderate'), async (req, res) => {
  const id = idParam(req);
  const d = body(req, z.object({ status: z.enum(['RESOLVED', 'DISMISSED']), hideContent: z.boolean().optional() }));
  const report = await prisma.contentReport.findUnique({ where: { id } });
  if (!report) throw notFound('Reporte no encontrado');
  if (report.status !== 'OPEN') throw conflict('Este reporte ya fue gestionado');
  const type = report.targetType as TargetType;
  const target = (await resolveTargets([{ targetType: type, targetId: report.targetId }])).get(`${type}:${report.targetId}`);
  if (target) await assertModerator(req, target.courseId);
  else if (!(await canModerate(req, null))) throw notFound('Reporte no encontrado');
  let hidden = false;
  if (d.hideContent && target && TARGET_TYPES.includes(type)) {
    await setStatus(type, report.targetId, 'HIDDEN');
    hidden = true;
  }
  const updated = await prisma.contentReport.update({
    where: { id },
    data: { status: d.status, resolvedById: req.user!.id, resolvedAt: new Date() },
  });
  await audit(req, 'community.report.' + d.status.toLowerCase(), 'ContentReport', id, { targetType: type, targetId: report.targetId, hidden });
  await notify(report.reporterId, {
    type: 'REPORT_REVIEWED',
    title: 'Revisamos tu reporte',
    body: d.status === 'RESOLVED' ? 'Gracias por avisarnos; tomamos medidas sobre el contenido.' : 'Revisamos el contenido y no encontramos una infracción.',
  });
  res.json({ data: { id, status: updated.status, resolvedAt: updated.resolvedAt, contentHidden: hidden } });
});

export default router;
