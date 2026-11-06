import type { Request } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { can, isAdmin, assertCourseAccess, taughtCourseIds } from '../../middleware/auth.js';
import { forbidden, notFound } from '../../lib/errors.js';

/** Contenido de usuario: texto plano, sin HTML, máx. 10.000 caracteres. */
export const zContent = z
  .string({ required_error: 'El contenido es obligatorio' })
  .trim()
  .min(1, 'El contenido no puede estar vacío')
  .max(10000, 'El contenido no puede superar 10.000 caracteres');

export const ACTIVE_ENROLLMENT = ['ACTIVE', 'COMPLETED'] as const;
export const ADMIN_ROLES = ['SUPERADMIN', 'ACADEMIC_ADMIN'];

export const userSel = {
  id: true,
  firstName: true,
  lastName: true,
  avatarUrl: true,
  role: { select: { key: true } },
} satisfies Prisma.UserSelect;
type UserRow = Prisma.UserGetPayload<{ select: typeof userSel }>;

export const shapeUser = (u: UserRow) => ({
  id: u.id,
  firstName: u.firstName,
  lastName: u.lastName,
  avatarUrl: u.avatarUrl,
  role: u.role.key,
});

export const fullName = (u: { firstName: string; lastName: string }) => `${u.firstName} ${u.lastName}`;
export const snippet = (s: string, n = 140) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

// ───────── Árbol de respuestas ─────────
export type TreeNode<T> = T & { replies: TreeNode<T>[] };
/** Arma el árbol por parentId. Los nodos cuyo padre no está en la lista (p. ej. oculto) se descartan. */
export function buildTree<T extends { id: number; parentId: number | null }>(rows: T[]): TreeNode<T>[] {
  const map = new Map<number, TreeNode<T>>();
  for (const r of rows) map.set(r.id, { ...r, replies: [] } as TreeNode<T>);
  const roots: TreeNode<T>[] = [];
  for (const n of map.values()) {
    if (n.parentId == null) roots.push(n);
    else map.get(n.parentId)?.replies.push(n);
  }
  return roots;
}

// ───────── Personal y moderación ─────────
export async function teachesCourse(userId: number, courseId: number) {
  return !!(await prisma.courseInstructor.findUnique({ where: { courseId_instructorId: { courseId, instructorId: userId } } }));
}

/** Administrador (courses.manage) o facilitador asignado. */
export async function isCourseStaff(req: Request, courseId: number) {
  if (can(req, 'courses.manage')) return true;
  return teachesCourse(req.user!.id, courseId);
}

/** Moderador: permiso community.moderate; facilitadores solo en sus cursos; administradores en todo. */
export async function canModerate(req: Request, courseId: number | null) {
  if (!can(req, 'community.moderate')) return false;
  if (isAdmin(req)) return true;
  return courseId != null && teachesCourse(req.user!.id, courseId);
}

export async function assertModerator(req: Request, courseId: number | null) {
  if (!(await canModerate(req, courseId))) throw forbidden('Solo los moderadores pueden realizar esta acción');
}

export async function courseStaffIds(courseId: number) {
  const rows = await prisma.courseInstructor.findMany({ where: { courseId }, select: { instructorId: true } });
  return rows.map((r) => r.instructorId);
}

export async function adminIds() {
  const rows = await prisma.user.findMany({
    where: { status: 'ACTIVE', deletedAt: null, role: { key: { in: ADMIN_ROLES } } },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

// ───────── Foros: carga y acceso ─────────
export async function loadForum(id: number) {
  const f = await prisma.forum.findUnique({ where: { id }, include: { group: { select: { courseId: true } } } });
  if (!f) throw notFound('Foro no encontrado');
  return { ...f, effCourseId: f.courseId ?? f.group?.courseId ?? null };
}
export type LoadedForum = Awaited<ReturnType<typeof loadForum>>;

/** Foro de grupo → miembros del grupo o personal del curso; de curso → assertCourseAccess; global → cualquiera. */
export async function assertForumAccess(req: Request, f: LoadedForum) {
  if (f.effCourseId == null) return;
  if (f.groupId != null) {
    if (await isCourseStaff(req, f.effCourseId)) return;
    const enr = await prisma.enrollment.findUnique({ where: { userId_courseId: { userId: req.user!.id, courseId: f.effCourseId } } });
    if (enr && enr.groupId === f.groupId && enr.status !== 'CANCELLED' && enr.status !== 'PENDING_PAYMENT') return;
    throw forbidden('No perteneces a este grupo');
  }
  await assertCourseAccess(req, f.effCourseId);
}

/** Filtro Prisma con los foros que el usuario puede ver. */
export async function forumAccessWhere(req: Request): Promise<Prisma.ForumWhereInput> {
  if (can(req, 'courses.manage')) return {};
  const uid = req.user!.id;
  const [taught, enr] = await Promise.all([
    taughtCourseIds(uid),
    prisma.enrollment.findMany({ where: { userId: uid, status: { in: [...ACTIVE_ENROLLMENT] } }, select: { courseId: true, groupId: true } }),
  ]);
  const courseIds = [...new Set([...taught, ...enr.map((e) => e.courseId)])];
  const groupIds = enr.map((e) => e.groupId).filter((g): g is number => g != null);
  const or: Prisma.ForumWhereInput[] = [{ courseId: null, groupId: null }];
  if (courseIds.length) or.push({ courseId: { in: courseIds }, groupId: null });
  if (groupIds.length) or.push({ groupId: { in: groupIds } });
  if (taught.length) or.push({ courseId: { in: taught } }, { group: { is: { courseId: { in: taught } } } });
  return { OR: or };
}

/** Hilo + foro + acceso + si el usuario modera. Los hilos HIDDEN solo los ven moderadores. */
export async function loadThreadCtx(req: Request, id: number) {
  const thread = await prisma.forumThread.findUnique({ where: { id } });
  if (!thread) throw notFound('Hilo no encontrado');
  const forum = await loadForum(thread.forumId);
  await assertForumAccess(req, forum);
  const mod = await canModerate(req, forum.effCourseId);
  if (thread.status === 'HIDDEN' && !mod) throw notFound('Hilo no encontrado');
  return { thread, forum, mod };
}

export const threadLink = (threadId: number) => `/campus/comunidad/hilo/${threadId}`;
