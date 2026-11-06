import type { Request } from 'express';
import { prisma } from '../../lib/prisma.js';
import { badRequest, notFound } from '../../lib/errors.js';
import { assertCourseStaff } from '../../middleware/auth.js';

export const userBrief = { id: true, firstName: true, lastName: true, avatarUrl: true } as const;
export const INSTRUCTOR_ROLES = ['INSTRUCTOR', 'ACADEMIC_ADMIN', 'SUPERADMIN'];

export const slugify = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100)
    .replace(/-+$/g, '') || 'item';

/** Devuelve `base`, `base-2`, `base-3`... hasta encontrar uno libre. */
export async function uniqueSlug(exists: (slug: string) => Promise<boolean>, base: string) {
  let s = base;
  let i = 2;
  while (await exists(s)) s = `${base}-${i++}`;
  return s;
}

export const num = (d: unknown) => (d == null ? null : Number(d));
export const isHttpUrl = (u: string) => /^https?:\/\/[^\s]+$/i.test(u);

/** Verifica que todos los ids existan como facilitadores válidos (activos, con rol de enseñanza). */
export async function assertInstructors(ids: number[]) {
  if (!ids.length) return;
  const uniq = [...new Set(ids)];
  const rows = await prisma.user.findMany({
    where: { id: { in: uniq }, deletedAt: null, status: 'ACTIVE', role: { key: { in: INSTRUCTOR_ROLES } } },
    select: { id: true },
  });
  if (rows.length !== uniq.length) throw badRequest('Algún facilitador no existe o no tiene un rol habilitado (Instructor, Administrador académico o Superadmin)');
}

export async function assertCompetencies(ids: number[]) {
  if (!ids.length) return;
  const uniq = [...new Set(ids)];
  const n = await prisma.competency.count({ where: { id: { in: uniq } } });
  if (n !== uniq.length) throw badRequest('Alguna competencia no existe');
}

export async function getCourseOr404(id: number) {
  const c = await prisma.course.findFirst({ where: { id, deletedAt: null } });
  if (!c) throw notFound('Curso no encontrado');
  return c;
}

/** Valida el acceso de personal al curso y que no esté eliminado. */
export async function staffCourse(req: Request, courseId: number) {
  await getCourseOr404(courseId);
  await assertCourseStaff(req, courseId);
}

export async function moduleCtx(id: number) {
  const m = await prisma.courseModule.findUnique({ where: { id } });
  if (!m) throw notFound('Módulo no encontrado');
  return m;
}

export async function lessonCtx(id: number) {
  const l = await prisma.lesson.findUnique({ where: { id }, include: { module: { select: { id: true, courseId: true } } } });
  if (!l) throw notFound('Lección no encontrada');
  return l;
}

export async function resourceCtx(id: number) {
  const r = await prisma.lessonResource.findUnique({ where: { id }, include: { lesson: { select: { id: true, module: { select: { courseId: true } } } } } });
  if (!r) throw notFound('Recurso no encontrado');
  return r;
}

export async function folderCtx(id: number) {
  const f = await prisma.folder.findUnique({ where: { id } });
  if (!f) throw notFound('Carpeta no encontrada');
  if (!f.courseId) throw badRequest('La carpeta no pertenece a un curso');
  return f as typeof f & { courseId: number };
}

export async function groupCtx(id: number) {
  const g = await prisma.courseGroup.findUnique({ where: { id } });
  if (!g) throw notFound('Grupo no encontrado');
  return g;
}

/** Reasigna `order` = índice según la lista de ids dada (todos deben pertenecer al conjunto permitido). */
export function checkOrderIds(ids: number[], allowed: number[], what: string) {
  const set = new Set(allowed);
  if (new Set(ids).size !== ids.length) throw badRequest(`Hay ${what} repetidos en la lista`);
  for (const id of ids) if (!set.has(id)) throw badRequest(`El ${what} ${id} no pertenece a este contenedor`);
}
