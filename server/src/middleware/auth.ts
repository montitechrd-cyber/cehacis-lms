import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import type { PermissionKey, RoleKey } from '../config/permissions.js';
import { prisma } from '../lib/prisma.js';
import { forbidden, unauthorized } from '../lib/errors.js';

export interface AuthUser {
  id: number;
  email: string;
  role: RoleKey;
  permissions: Set<string>;
  firstName: string;
  lastName: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export const ACCESS_COOKIE = 'cehacis_at';
export const REFRESH_COOKIE = 'cehacis_rt';
export const CSRF_COOKIE = 'cehacis_csrf';

// Caché corta de permisos por rol para no consultar la BD en cada petición.
const roleCache = new Map<number, { key: RoleKey; perms: Set<string>; at: number }>();
export function clearRoleCache() {
  roleCache.clear();
}

async function rolePerms(roleId: number) {
  const hit = roleCache.get(roleId);
  if (hit && Date.now() - hit.at < 60_000) return hit;
  const role = await prisma.role.findUniqueOrThrow({
    where: { id: roleId },
    include: { permissions: { include: { permission: true } } },
  });
  const v = { key: role.key as RoleKey, perms: new Set(role.permissions.map((p) => p.permission.key)), at: Date.now() };
  roleCache.set(roleId, v);
  return v;
}

/** Adjunta req.user si hay un token de acceso válido. No exige sesión. */
export async function loadUser(req: Request, _res: Response, next: NextFunction) {
  const bearer = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : undefined;
  const token: string | undefined = req.cookies?.[ACCESS_COOKIE] ?? bearer;
  if (!token) return next();
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as { sub: string };
    const user = await prisma.user.findUnique({ where: { id: Number(payload.sub) } });
    if (user && user.status === 'ACTIVE' && !user.deletedAt) {
      const r = await rolePerms(user.roleId);
      req.user = { id: user.id, email: user.email, role: r.key, permissions: r.perms, firstName: user.firstName, lastName: user.lastName };
    }
  } catch {
    // token expirado o inválido: se trata como anónimo; el cliente renovará con /auth/refresh
  }
  next();
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next(unauthorized());
  next();
}

/** Exige al menos uno de los permisos indicados. */
export function requirePermission(...perms: PermissionKey[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(unauthorized());
    if (!perms.some((p) => req.user!.permissions.has(p))) return next(forbidden());
    next();
  };
}

export const can = (req: Request, perm: PermissionKey) => !!req.user?.permissions.has(perm);
export const isAdmin = (req: Request) => req.user?.role === 'SUPERADMIN' || req.user?.role === 'ACADEMIC_ADMIN';

/** Ids de cursos que el usuario imparte (vacío para no facilitadores). */
export async function taughtCourseIds(userId: number) {
  const rows = await prisma.courseInstructor.findMany({ where: { instructorId: userId }, select: { courseId: true } });
  return rows.map((r) => r.courseId);
}

/**
 * Verifica que el usuario pueda gestionar un curso: administradores (courses.manage)
 * o facilitadores asignados al curso. Lanza 403 si no.
 */
export async function assertCourseStaff(req: Request, courseId: number) {
  if (!req.user) throw unauthorized();
  if (req.user.permissions.has('courses.manage')) return;
  const link = await prisma.courseInstructor.findUnique({ where: { courseId_instructorId: { courseId, instructorId: req.user.id } } });
  if (!link) throw forbidden('Solo los facilitadores asignados pueden gestionar este curso');
}

/** Verifica acceso de lectura al contenido de un curso: personal del curso o estudiante inscrito activo/completado. */
export async function assertCourseAccess(req: Request, courseId: number) {
  if (!req.user) throw unauthorized();
  if (req.user.permissions.has('courses.manage')) return;
  const [teach, enr] = await Promise.all([
    prisma.courseInstructor.findUnique({ where: { courseId_instructorId: { courseId, instructorId: req.user.id } } }),
    prisma.enrollment.findUnique({ where: { userId_courseId: { userId: req.user.id, courseId } } }),
  ]);
  if (teach) return;
  if (enr && (enr.status === 'ACTIVE' || enr.status === 'COMPLETED')) return;
  throw forbidden('No estás inscrito en este curso');
}
