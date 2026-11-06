import crypto from 'node:crypto';
import { Router, type Request, type Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { prisma } from '../../lib/prisma.js';
import { body } from '../../lib/validate.js';
import { badRequest, unauthorized, AppError } from '../../lib/errors.js';
import { audit } from '../../lib/audit.js';
import { emailLayout, sendMail } from '../../lib/mailer.js';
import { fileUrl, IMAGE_EXT, saveFile, uploader } from '../../lib/upload.js';
import { ACCESS_COOKIE, REFRESH_COOKIE, requireAuth } from '../../middleware/auth.js';

const r = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.NODE_ENV === 'test' ? 1000 : 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMIT', message: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.' } },
});

const sha256 = (s: string) => crypto.createHash('sha256').update(s).digest('hex');
const MAX_FAILED = 5;
const DUMMY_HASH = bcrypt.hashSync('cehacis-dummy-password', 12);
const LOCK_MIN = 15;

/** Contraseña: 8+ caracteres, al menos una letra y un número. */
export const zPassword = z
  .string()
  .min(8, 'Mínimo 8 caracteres')
  .max(128)
  .regex(/[A-Za-z]/, 'Debe incluir al menos una letra')
  .regex(/\d/, 'Debe incluir al menos un número');

export const hashPassword = (p: string) => bcrypt.hash(p, 12);

function setAuthCookies(res: Response, access: string, refresh: string) {
  const base = { httpOnly: true, sameSite: 'lax' as const, secure: env.COOKIE_SECURE };
  res.cookie(ACCESS_COOKIE, access, { ...base, path: '/', maxAge: env.ACCESS_TOKEN_TTL_MIN * 60 * 1000 });
  res.cookie(REFRESH_COOKIE, refresh, { ...base, path: '/api/auth', maxAge: env.REFRESH_TOKEN_TTL_DAYS * 86400 * 1000 });
}

function clearAuthCookies(res: Response) {
  res.clearCookie(ACCESS_COOKIE, { path: '/' });
  res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
}

async function issueSession(req: Request, res: Response, userId: number) {
  const access = jwt.sign({ sub: String(userId) }, env.JWT_ACCESS_SECRET, { expiresIn: `${env.ACCESS_TOKEN_TTL_MIN}m` });
  const refresh = crypto.randomBytes(48).toString('hex');
  await prisma.session.create({
    data: {
      userId,
      tokenHash: sha256(refresh),
      userAgent: req.get('user-agent')?.slice(0, 255),
      ip: req.ip?.slice(0, 64),
      expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 86400 * 1000),
    },
  });
  setAuthCookies(res, access, refresh);
}

/** Perfil + permisos efectivos (lo que el frontend usa para su navegación). */
async function mePayload(userId: number) {
  const u = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: {
      role: { include: { permissions: { include: { permission: true } } } },
      student: { include: { level: true } },
      instructor: true,
    },
  });
  return {
    id: u.id,
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    phone: u.phone,
    avatarUrl: u.avatarUrl,
    status: u.status,
    role: u.role.key,
    roleName: u.role.name,
    permissions: u.role.permissions.map((p) => p.permission.key),
    student: u.student ? { points: u.student.points, level: u.student.level } : null,
    instructor: u.instructor ? { headline: u.instructor.headline } : null,
    createdAt: u.createdAt,
  };
}

const registerSchema = z.object({
  firstName: z.string().trim().min(2, 'Escribe tu nombre').max(100),
  lastName: z.string().trim().min(2, 'Escribe tu apellido').max(100),
  email: z.string().trim().toLowerCase().email('Correo inválido').max(191),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
  password: zPassword,
  acceptTerms: z.literal(true, { errorMap: () => ({ message: 'Debes aceptar los términos' }) }),
});

r.post('/register', authLimiter, async (req, res) => {
  const data = body(req, registerSchema);
  const exists = await prisma.user.findUnique({ where: { email: data.email } });
  if (exists) throw new AppError(409, 'Ya existe una cuenta con ese correo. Inicia sesión o recupera tu contraseña.', 'CONFLICT');
  const role = await prisma.role.findUniqueOrThrow({ where: { key: 'STUDENT' } });
  const user = await prisma.user.create({
    data: {
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone || null,
      passwordHash: await hashPassword(data.password),
      roleId: role.id,
      student: { create: {} },
    },
  });
  await issueSession(req, res, user.id);
  await sendMail(
    user.email,
    'Bienvenido a CEHACIS',
    emailLayout(`Hola, ${user.firstName}`, 'Tu cuenta en el campus de CEHACIS está lista. Explora el catálogo y comienza tu entrenamiento.', { label: 'Ir al campus', url: env.APP_URL + '/campus' }),
  );
  await audit(req, 'auth.register', 'user', user.id);
  res.status(201).json({ user: await mePayload(user.id) });
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Correo inválido'),
  password: z.string().min(1, 'Escribe tu contraseña').max(128),
});

r.post('/login', authLimiter, async (req, res) => {
  const { email, password } = body(req, loginSchema);
  const user = await prisma.user.findUnique({ where: { email } });
  const fail = () => new AppError(401, 'Correo o contraseña incorrectos', 'INVALID_CREDENTIALS');
  if (!user || user.deletedAt) {
    await bcrypt.compare(password, DUMMY_HASH); // tiempo constante: no revela si el correo existe
    throw fail();
  }
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw new AppError(423, 'Cuenta bloqueada temporalmente por intentos fallidos. Inténtalo más tarde.', 'LOCKED');
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    const failed = user.failedLogins + 1;
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLogins: failed, lockedUntil: failed >= MAX_FAILED ? new Date(Date.now() + LOCK_MIN * 60000) : null },
    });
    await audit(req, 'auth.login_failed', 'user', user.id);
    throw fail();
  }
  if (user.status === 'SUSPENDED') throw new AppError(403, 'Tu cuenta está suspendida. Contacta a la administración.', 'SUSPENDED');
  await prisma.user.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() } });
  await issueSession(req, res, user.id);
  await audit(req, 'auth.login', 'user', user.id);
  res.json({ user: await mePayload(user.id) });
});

/** Rota el refresh token (uso único) y emite un nuevo access token. */
r.post('/refresh', async (req, res) => {
  const token: string | undefined = req.cookies?.[REFRESH_COOKIE];
  if (!token) throw unauthorized('Sesión expirada');
  const session = await prisma.session.findUnique({ where: { tokenHash: sha256(token) }, include: { user: true } });
  if (!session || session.revokedAt || session.expiresAt < new Date() || session.user.status !== 'ACTIVE' || session.user.deletedAt) {
    if (session && session.revokedAt) {
      // Reutilización de un token ya rotado: posible robo. Se revocan todas las sesiones del usuario.
      await prisma.session.updateMany({ where: { userId: session.userId, revokedAt: null }, data: { revokedAt: new Date() } });
    }
    clearAuthCookies(res);
    throw unauthorized('Sesión expirada');
  }
  await prisma.session.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
  await issueSession(req, res, session.userId);
  res.json({ user: await mePayload(session.userId) });
});

r.post('/logout', async (req, res) => {
  const token: string | undefined = req.cookies?.[REFRESH_COOKIE];
  if (token) await prisma.session.updateMany({ where: { tokenHash: sha256(token), revokedAt: null }, data: { revokedAt: new Date() } });
  clearAuthCookies(res);
  res.json({ ok: true });
});

r.get('/me', requireAuth, async (req, res) => {
  res.json({ user: await mePayload(req.user!.id) });
});

const profileSchema = z.object({
  firstName: z.string().trim().min(2).max(100),
  lastName: z.string().trim().min(2).max(100),
  phone: z.string().trim().max(30).nullable().optional(),
  avatarUrl: z.string().trim().max(500).nullable().optional(),
});

r.patch('/me', requireAuth, async (req, res) => {
  const data = body(req, profileSchema);
  await prisma.user.update({ where: { id: req.user!.id }, data });
  res.json({ user: await mePayload(req.user!.id) });
});

/** Foto de perfil: imagen pública (visible para compañeros y facilitadores). */
r.post('/me/avatar', requireAuth, uploader({ only: IMAGE_EXT, maxMb: 5 }).single('avatar'), async (req, res) => {
  if (!req.file) throw badRequest('Selecciona una imagen');
  const file = await saveFile(req.file, req.user!.id, { isPublic: true });
  await prisma.user.update({ where: { id: req.user!.id }, data: { avatarUrl: fileUrl(file.id) } });
  res.json({ user: await mePayload(req.user!.id) });
});

const changePwSchema =z.object({ currentPassword: z.string().min(1), newPassword: zPassword });

r.post('/change-password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = body(req, changePwSchema);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } });
  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) throw badRequest('La contraseña actual no es correcta');
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(newPassword) } });
  await prisma.session.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } });
  await issueSession(req, res, user.id);
  await audit(req, 'auth.password_changed', 'user', user.id);
  res.json({ ok: true });
});

r.post('/forgot-password', authLimiter, async (req, res) => {
  const { email } = body(req, z.object({ email: z.string().trim().toLowerCase().email() }));
  const user = await prisma.user.findUnique({ where: { email } });
  if (user && !user.deletedAt) {
    const token = crypto.randomBytes(32).toString('hex');
    await prisma.passwordReset.create({ data: { userId: user.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + 60 * 60 * 1000) } });
    const url = `${env.APP_URL}/restablecer?token=${token}`;
    await sendMail(user.email, 'Restablece tu contraseña', emailLayout('Restablecer contraseña', 'Recibimos una solicitud para restablecer tu contraseña. El enlace vence en 1 hora. Si no fuiste tú, ignora este correo.', { label: 'Crear nueva contraseña', url }));
  }
  // Respuesta idéntica exista o no la cuenta (evita enumeración de usuarios).
  res.json({ ok: true, message: 'Si el correo está registrado, recibirás instrucciones para restablecer tu contraseña.' });
});

r.post('/reset-password', authLimiter, async (req, res) => {
  const { token, password } = body(req, z.object({ token: z.string().min(20).max(200), password: zPassword }));
  const row = await prisma.passwordReset.findUnique({ where: { tokenHash: sha256(token) } });
  if (!row || row.usedAt || row.expiresAt < new Date()) throw badRequest('El enlace no es válido o ya venció. Solicita uno nuevo.');
  await prisma.$transaction([
    prisma.user.update({ where: { id: row.userId }, data: { passwordHash: await hashPassword(password), failedLogins: 0, lockedUntil: null } }),
    prisma.passwordReset.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
    prisma.session.updateMany({ where: { userId: row.userId, revokedAt: null }, data: { revokedAt: new Date() } }),
  ]);
  await audit(null, 'auth.password_reset', 'user', row.userId);
  res.json({ ok: true });
});

export default r;
