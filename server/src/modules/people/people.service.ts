import crypto from 'node:crypto';
import type { Request } from 'express';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { prisma } from '../../lib/prisma.js';
import { emailLayout, sendMail } from '../../lib/mailer.js';
import { forbidden } from '../../lib/errors.js';
import { can, taughtCourseIds } from '../../middleware/auth.js';
import { hashPassword } from '../auth/auth.routes.js';

export const sha256 = (s: string) => crypto.createHash('sha256').update(s).digest('hex');

/** Campos públicos de un usuario. */
export const userBrief = { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } as const;

// ───────── Esquemas reutilizables ─────────
export const emailSchema = z.string().trim().toLowerCase().email('Correo inválido').max(191);
export const optStr = (max: number) =>
  z.string().trim().max(max).nullish().transform((v) => (v === undefined ? undefined : v || null));
export const optDate = z.preprocess((v) => (v === '' ? null : v), z.coerce.date().nullish());

export const num = (v: unknown) => (v == null ? null : Number(v));

/** Porcentaje de asistencia: (presentes + tardanzas) / total registros. */
export function attendanceStats(statuses: string[]) {
  const s = { present: 0, late: 0, absent: 0, excused: 0 };
  for (const st of statuses) {
    if (st === 'PRESENT') s.present++;
    else if (st === 'LATE') s.late++;
    else if (st === 'ABSENT') s.absent++;
    else if (st === 'EXCUSED') s.excused++;
  }
  const total = statuses.length;
  return { ...s, pct: total ? Math.round(((s.present + s.late) / total) * 100) : 0 };
}

/**
 * Crea una cuenta con contraseña definida o temporal. Si es temporal, genera un PasswordReset
 * (72 h) y envía por correo el enlace para que la persona defina su contraseña.
 */
export async function provisionPassword(password: string | undefined) {
  const plain = password ?? crypto.randomBytes(18).toString('base64url') + 'a1';
  return { hash: await hashPassword(plain), temporary: !password };
}

export async function sendInvitation(userId: number, email: string, firstName: string, temporary: boolean) {
  if (!temporary) {
    await sendMail(
      email,
      'Bienvenido a CEHACIS',
      emailLayout(`Hola, ${firstName}`, 'Se creó tu cuenta en el campus de CEHACIS. Inicia sesión con las credenciales que te entregó el equipo académico.', { label: 'Ir al campus', url: env.APP_URL + '/campus' }),
    );
    return;
  }
  const token = crypto.randomBytes(32).toString('hex');
  await prisma.passwordReset.create({ data: { userId, tokenHash: sha256(token), expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000) } });
  await sendMail(
    email,
    'Activa tu cuenta en CEHACIS',
    emailLayout(`Hola, ${firstName}`, 'Se creó tu cuenta en CEHACIS. Crea tu contraseña con el siguiente enlace (vence en 72 horas).', { label: 'Crear mi contraseña', url: `${env.APP_URL}/restablecer?token=${token}` }),
  );
}

export const revokeSessions = (userId: number) => prisma.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });

/**
 * Alcance sobre estudiantes del solicitante: 'all' (students.manage) o la lista de cursos que imparte
 * (students.view_assigned). Lanza 403 si no tiene ninguno.
 */
export type StudentScope = { all: true } | { all: false; courseIds: number[] };
export async function studentScope(req: Request): Promise<StudentScope> {
  if (can(req, 'students.manage')) return { all: true };
  if (can(req, 'students.view_assigned')) return { all: false, courseIds: await taughtCourseIds(req.user!.id) };
  throw forbidden();
}

/** Verifica que el estudiante esté dentro del alcance; devuelve los cursos visibles (undefined = todos). */
export async function assertStudentInScope(scope: StudentScope, studentId: number) {
  if (scope.all) return undefined;
  const n = await prisma.enrollment.count({ where: { userId: studentId, courseId: { in: scope.courseIds } } });
  if (!n) throw forbidden('Este estudiante no está inscrito en tus cursos');
  return scope.courseIds;
}
