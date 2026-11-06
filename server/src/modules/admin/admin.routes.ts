import crypto from 'node:crypto';
import path from 'node:path';
import { Router } from 'express';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { PERMISSIONS } from '../../config/permissions.js';
import { prisma } from '../../lib/prisma.js';
import { audit } from '../../lib/audit.js';
import { badRequest, conflict, notConfigured, notFound } from '../../lib/errors.js';
import { body, idParam, query, zOptDate, zText } from '../../lib/validate.js';
import { getPage, paged, orderBy } from '../../lib/pagination.js';
import { emailLayout, escapeHtml, sendMail, smtpConfigured } from '../../lib/mailer.js';
import { getBrand, getSetting, setSetting, type BrandSettings } from '../../lib/settings.js';
import { IMAGE_EXT, UPLOAD_ROOT, fileUrl, saveFile, uploader } from '../../lib/upload.js';
import { clearRoleCache, requirePermission } from '../../middleware/auth.js';
import { getAi } from '../../integrations/ai/anthropic.js';
import { integrationStatus } from '../../integrations/payments/gateway.js';
import { videoStatus } from '../../integrations/video/provider.js';
import { hashPassword, zPassword } from '../auth/auth.routes.js';

const r = Router();

const sha256 = (s: string) => crypto.createHash('sha256').update(s).digest('hex');
const relUploads = () => path.relative(process.cwd(), UPLOAD_ROOT).split(path.sep).join('/') || '.';

// ───────────────────────── Usuarios ─────────────────────────

const userSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  avatarUrl: true,
  status: true,
  lastLoginAt: true,
  failedLogins: true,
  lockedUntil: true,
  createdAt: true,
  role: { select: { key: true, name: true } },
} as const;

interface UserRow {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatarUrl: string | null;
  status: string;
  lastLoginAt: Date | null;
  failedLogins: number;
  lockedUntil: Date | null;
  createdAt: Date;
  role: { key: string; name: string };
}

const userDto = (u: UserRow) => ({
  id: u.id,
  email: u.email,
  firstName: u.firstName,
  lastName: u.lastName,
  phone: u.phone,
  avatarUrl: u.avatarUrl,
  status: u.status,
  role: u.role,
  lastLoginAt: u.lastLoginAt,
  failedLogins: u.failedLogins,
  isLocked: !!u.lockedUntil && u.lockedUntil > new Date(),
  createdAt: u.createdAt,
});

const zStatus = z.enum(['ACTIVE', 'PENDING', 'SUSPENDED']);

async function ensureProfile(userId: number, role: string) {
  if (role === 'STUDENT') await prisma.studentProfile.upsert({ where: { userId }, update: {}, create: { userId } });
  if (role === 'INSTRUCTOR') await prisma.instructorProfile.upsert({ where: { userId }, update: {}, create: { userId } });
}

function otherActiveSuperadmins(excludeId: number) {
  return prisma.user.count({ where: { id: { not: excludeId }, deletedAt: null, status: 'ACTIVE', role: { key: 'SUPERADMIN' } } });
}

async function sendResetLink(user: { id: number; email: string; firstName: string }, opts: { invite: boolean }) {
  const token = crypto.randomBytes(32).toString('hex');
  const hours = opts.invite ? 72 : 1;
  await prisma.passwordReset.create({ data: { userId: user.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + hours * 3600 * 1000) } });
  const url = `${env.APP_URL}/restablecer?token=${token}`;
  const text = opts.invite
    ? `Se creó una cuenta para ti en el campus de CEHACIS. Define tu contraseña con el siguiente enlace (vence en ${hours} horas).`
    : `Un administrador solicitó restablecer tu contraseña. El enlace vence en ${hours} hora. Si no esperabas este mensaje, ignóralo.`;
  return sendMail(
    user.email,
    opts.invite ? 'Bienvenido a CEHACIS: crea tu contraseña' : 'Restablece tu contraseña',
    emailLayout(`Hola, ${user.firstName}`, escapeHtml(text), { label: 'Crear contraseña', url }),
  );
}

r.get('/users', requirePermission('users.manage'), async (req, res) => {
  const p = getPage(req);
  const f = query(req, z.object({ role: z.string().max(50).optional(), status: zStatus.optional() }).passthrough());
  const where = {
    deletedAt: null,
    ...(f.role ? { role: { key: f.role } } : {}),
    ...(f.status ? { status: f.status } : {}),
    ...(p.search
      ? { OR: [{ email: { contains: p.search } }, { firstName: { contains: p.search } }, { lastName: { contains: p.search } }, { phone: { contains: p.search } }] }
      : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: userSelect,
      orderBy: orderBy(p, ['createdAt', 'email', 'firstName', 'lastName', 'lastLoginAt', 'status']),
      skip: p.skip,
      take: p.take,
    }),
    prisma.user.count({ where }),
  ]);
  res.json(paged(rows.map(userDto), total, p));
});

r.get('/users/:id', requirePermission('users.manage'), async (req, res) => {
  const id = idParam(req);
  const u = await prisma.user.findFirst({
    where: { id, deletedAt: null },
    select: { ...userSelect, student: { select: { points: true, city: true, country: true } }, instructor: { select: { headline: true, isPublic: true } } },
  });
  if (!u) throw notFound('Usuario no encontrado');
  res.json({ data: { ...userDto(u), student: u.student, instructor: u.instructor } });
});

const createUserSchema = z.object({
  email: z.string().trim().toLowerCase().email('Correo inválido').max(191),
  firstName: z.string().trim().min(2, 'Escribe el nombre').max(100),
  lastName: z.string().trim().min(2, 'Escribe el apellido').max(100),
  phone: z.string().trim().max(30).nullable().optional(),
  role: z.string().trim().min(1).max(50),
  password: zPassword.optional(),
});

r.post('/users', requirePermission('users.manage'), async (req, res) => {
  const data = body(req, createUserSchema);
  const role = await prisma.role.findUnique({ where: { key: data.role } });
  if (!role) throw badRequest('El rol indicado no existe');
  if (await prisma.user.findUnique({ where: { email: data.email } })) throw conflict('Ya existe un usuario con ese correo');
  const user = await prisma.user.create({
    data: {
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone || null,
      roleId: role.id,
      passwordHash: await hashPassword(data.password ?? crypto.randomBytes(24).toString('base64url') + 'a1'),
      status: 'ACTIVE',
    },
    select: userSelect,
  });
  await ensureProfile(user.id, role.key);
  let emailSent = false;
  if (!data.password) {
    const mail = await sendResetLink(user, { invite: true });
    emailSent = mail.status === 'SENT';
  }
  await audit(req, 'user.create', 'user', user.id, { email: user.email, role: role.key, tempPassword: !data.password });
  res.status(201).json({ data: userDto(user), emailSent, passwordMode: data.password ? 'provided' : 'reset_link' });
});

const patchUserSchema = z.object({
  firstName: z.string().trim().min(2).max(100).optional(),
  lastName: z.string().trim().min(2).max(100).optional(),
  phone: z.string().trim().max(30).nullable().optional(),
  status: zStatus.optional(),
  role: z.string().trim().min(1).max(50).optional(),
});

r.patch('/users/:id', requirePermission('users.manage'), async (req, res) => {
  const id = idParam(req);
  const data = body(req, patchUserSchema);
  const target = await prisma.user.findFirst({ where: { id, deletedAt: null }, include: { role: true } });
  if (!target) throw notFound('Usuario no encontrado');

  let roleId: number | undefined;
  let newRoleKey: string = target.role.key;
  if (data.role && data.role !== target.role.key) {
    const role = await prisma.role.findUnique({ where: { key: data.role } });
    if (!role) throw badRequest('El rol indicado no existe');
    roleId = role.id;
    newRoleKey = role.key;
  }
  const statusChanges = data.status !== undefined && data.status !== target.status;
  if (id === req.user!.id && (roleId !== undefined || (statusChanges && data.status !== 'ACTIVE'))) {
    throw badRequest('No puedes cambiar tu propio rol ni suspender tu propia cuenta');
  }
  const demoting = target.role.key === 'SUPERADMIN' && (newRoleKey !== 'SUPERADMIN' || (statusChanges && data.status !== 'ACTIVE'));
  if (demoting && (await otherActiveSuperadmins(id)) === 0) throw badRequest('Debe existir al menos un Superadministrador activo');

  const updated = await prisma.user.update({
    where: { id },
    data: { firstName: data.firstName, lastName: data.lastName, phone: data.phone, status: data.status, roleId },
    select: userSelect,
  });
  if (roleId !== undefined) await ensureProfile(id, newRoleKey);
  if (data.status === 'SUSPENDED') await prisma.session.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
  await audit(req, 'user.update', 'user', id, { changes: data, previousRole: target.role.key, previousStatus: target.status });
  res.json({ data: userDto(updated) });
});

r.post('/users/:id/reset-password', requirePermission('users.manage'), async (req, res) => {
  const id = idParam(req);
  const user = await prisma.user.findFirst({ where: { id, deletedAt: null }, select: { id: true, email: true, firstName: true } });
  if (!user) throw notFound('Usuario no encontrado');
  const mail = await sendResetLink(user, { invite: false });
  await audit(req, 'user.reset_password', 'user', id);
  res.json({
    ok: true,
    emailStatus: mail.status,
    message: mail.status === 'SENT' ? 'Enlace de restablecimiento enviado' : 'Enlace generado; el correo quedó en la bandeja de salida sin enviarse',
  });
});

r.post('/users/:id/unlock', requirePermission('users.manage'), async (req, res) => {
  const id = idParam(req);
  if (!(await prisma.user.findFirst({ where: { id, deletedAt: null }, select: { id: true } }))) throw notFound('Usuario no encontrado');
  await prisma.user.update({ where: { id }, data: { failedLogins: 0, lockedUntil: null } });
  await audit(req, 'user.unlock', 'user', id);
  res.json({ ok: true });
});

r.delete('/users/:id', requirePermission('users.manage'), async (req, res) => {
  const id = idParam(req);
  if (id === req.user!.id) throw badRequest('No puedes eliminar tu propia cuenta');
  const target = await prisma.user.findFirst({ where: { id, deletedAt: null }, include: { role: true } });
  if (!target) throw notFound('Usuario no encontrado');
  if (target.role.key === 'SUPERADMIN' && (await otherActiveSuperadmins(id)) === 0) throw badRequest('Debe existir al menos un Superadministrador activo');
  await prisma.$transaction([
    prisma.user.update({ where: { id }, data: { deletedAt: new Date(), status: 'SUSPENDED' } }),
    prisma.session.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } }),
  ]);
  await audit(req, 'user.delete', 'user', id, { email: target.email });
  res.json({ ok: true });
});

// ───────────────────────── Roles y permisos ─────────────────────────

r.get('/roles', requirePermission('roles.manage'), async (_req, res) => {
  const roles = await prisma.role.findMany({
    orderBy: { id: 'asc' },
    include: { permissions: { include: { permission: true } }, _count: { select: { users: { where: { deletedAt: null } } } } },
  });
  res.json({
    data: roles.map((ro) => ({
      id: ro.id,
      key: ro.key,
      name: ro.name,
      description: ro.description,
      isSystem: ro.isSystem,
      editable: ro.key !== 'SUPERADMIN',
      usersCount: ro._count.users,
      permissions: ro.permissions.map((p) => p.permission.key).sort(),
    })),
  });
});

r.get('/permissions', requirePermission('roles.manage'), async (_req, res) => {
  const perms = await prisma.permission.findMany({ orderBy: [{ module: 'asc' }, { key: 'asc' }] });
  const groups = new Map<string, { key: string; description: string }[]>();
  for (const p of perms) {
    const desc = p.description ?? PERMISSIONS[p.key as keyof typeof PERMISSIONS] ?? p.key;
    const list = groups.get(p.module) ?? [];
    list.push({ key: p.key, description: desc });
    groups.set(p.module, list);
  }
  res.json({ data: [...groups.entries()].map(([module, permissions]) => ({ module, permissions })) });
});

r.put('/roles/:id/permissions', requirePermission('roles.manage'), async (req, res) => {
  const id = idParam(req);
  const { permissionKeys } = body(req, z.object({ permissionKeys: z.array(z.string().max(80)).max(200) }));
  const role = await prisma.role.findUnique({ where: { id } });
  if (!role) throw notFound('Rol no encontrado');
  if (role.key === 'SUPERADMIN') throw badRequest('Los permisos del Superadministrador no se pueden modificar');
  const keys = [...new Set(permissionKeys)];
  const perms = await prisma.permission.findMany({ where: { key: { in: keys } } });
  if (perms.length !== keys.length) {
    const found = new Set(perms.map((p) => p.key));
    throw badRequest('Hay permisos que no existen', { unknown: keys.filter((k) => !found.has(k)) });
  }
  const before = await prisma.rolePermission.findMany({ where: { roleId: id }, include: { permission: true } });
  await prisma.$transaction([
    prisma.rolePermission.deleteMany({ where: { roleId: id } }),
    prisma.rolePermission.createMany({ data: perms.map((p) => ({ roleId: id, permissionId: p.id })) }),
  ]);
  clearRoleCache();
  await audit(req, 'role.permissions_update', 'role', id, { role: role.key, before: before.map((b) => b.permission.key).sort(), after: [...keys].sort() });
  res.json({ ok: true, permissions: keys });
});

// ───────────────────────── Configuración de marca ─────────────────────────

const hex = z.string().trim().regex(/^#[0-9A-Fa-f]{6}$/, 'Usa el formato #RRGGBB');
const urlOrPath = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === '' || v.startsWith('/') || /^https?:\/\/\S+$/i.test(v), 'Debe ser una URL http(s) o una ruta que empiece con /');

const brandSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  legalName: z.string().trim().max(250).optional(),
  tagline: z.string().trim().max(250).optional(),
  logoUrl: urlOrPath.optional(),
  primaryColor: hex.optional(),
  inkColor: hex.optional(),
  contactEmail: z.union([z.string().trim().length(0), z.string().trim().email('Correo inválido').max(191)]).optional(),
  contactPhone: z.string().trim().max(40).optional(),
  whatsapp: z.string().trim().max(30).optional(),
  instagram: z.string().trim().max(100).optional(),
  address: z.string().trim().max(300).optional(),
  currency: z.string().trim().length(3, 'Código de moneda de 3 letras').toUpperCase().optional(),
});

r.get('/settings/brand', requirePermission('settings.manage'), async (_req, res) => {
  res.json({ data: await getBrand() });
});

r.put('/settings/brand', requirePermission('settings.manage'), async (req, res) => {
  const data = body(req, brandSchema);
  const current = await getBrand();
  const next = { ...current, ...Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)) } as BrandSettings;
  await setSetting('brand', next);
  await audit(req, 'settings.brand_update', 'setting', 'brand', { fields: Object.keys(data) });
  res.json({ data: next });
});

r.post('/settings/logo', requirePermission('settings.manage'), uploader({ maxMb: 5, only: IMAGE_EXT }).single('logo'), async (req, res) => {
  if (!req.file) throw badRequest('Adjunta una imagen en el campo "logo"');
  const file = await saveFile(req.file, req.user!.id, { isPublic: true });
  const brand = { ...(await getBrand()), logoUrl: fileUrl(file.id) };
  await setSetting('brand', brand);
  await audit(req, 'settings.logo_update', 'setting', 'brand', { fileId: file.id });
  res.status(201).json({ data: brand, file: { id: file.id, url: fileUrl(file.id) } });
});

// ───────────────────────── Integraciones (solo estado, sin secretos) ─────────────────────────

r.get('/integrations', requirePermission('settings.manage'), (_req, res) => {
  const ai = getAi();
  res.json({
    data: {
      ai: { configured: ai.isConfigured(), provider: ai.name, model: ai.model },
      email: { configured: smtpConfigured(), from: env.SMTP_FROM },
      payments: integrationStatus(),
      video: videoStatus(),
      storage: { driver: 'local', path: relUploads() },
    },
  });
});

// ───────────────────────── Auditoría ─────────────────────────

r.get('/audit', requirePermission('audit.read'), async (req, res) => {
  const p = getPage(req, 50);
  const f = query(
    req,
    z
      .object({
        userId: z.coerce.number().int().positive().optional(),
        entity: z.string().max(60).optional(),
        action: z.string().max(80).optional(),
        from: zOptDate,
        to: zOptDate,
      })
      .passthrough(),
  );
  // Si "to" viene solo como fecha (medianoche UTC) se incluye el día completo.
  const to = f.to ? new Date(f.to.getTime() + (f.to.getTime() % 86400000 === 0 ? 86400000 - 1 : 0)) : undefined;
  const where = {
    ...(f.userId ? { userId: f.userId } : {}),
    ...(f.entity ? { entity: f.entity } : {}),
    ...(f.action ? { action: { contains: f.action } } : {}),
    ...(f.from || to ? { createdAt: { ...(f.from ? { gte: f.from } : {}), ...(to ? { lte: to } : {}) } } : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: p.skip,
      take: p.take,
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
    }),
    prisma.auditLog.count({ where }),
  ]);
  res.json(
    paged(
      rows.map((a) => ({ id: a.id, action: a.action, entity: a.entity, entityId: a.entityId, meta: a.meta, ip: a.ip, userAgent: a.userAgent, createdAt: a.createdAt, user: a.user })),
      total,
      p,
    ),
  );
});

// ───────────────────────── Bandeja de correo ─────────────────────────

const outboxSelect = { id: true, to: true, subject: true, status: true, error: true, sentAt: true, createdAt: true } as const;

r.get('/outbox', requirePermission('settings.manage'), async (req, res) => {
  const p = getPage(req);
  const { status } = query(req, z.object({ status: z.enum(['QUEUED', 'SENT', 'FAILED', 'LOGGED']).optional() }).passthrough());
  const where = {
    ...(status ? { status } : {}),
    ...(p.search ? { OR: [{ to: { contains: p.search } }, { subject: { contains: p.search } }] } : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.emailOutbox.findMany({ where, orderBy: { createdAt: 'desc' }, skip: p.skip, take: p.take, select: outboxSelect }),
    prisma.emailOutbox.count({ where }),
  ]);
  res.json(paged(rows, total, p));
});

r.get('/outbox/:id', requirePermission('settings.manage'), async (req, res) => {
  const row = await prisma.emailOutbox.findUnique({ where: { id: idParam(req) }, select: { ...outboxSelect, html: true } });
  if (!row) throw notFound('Correo no encontrado');
  res.json({ data: row });
});

r.post('/outbox/:id/retry',requirePermission('settings.manage'), async (req, res) => {
  const id = idParam(req);
  const row = await prisma.emailOutbox.findUnique({ where: { id } });
  if (!row) throw notFound('Correo no encontrado');
  if (!smtpConfigured()) throw notConfigured('El envío de correo (SMTP) no está configurado en el servidor');
  if (row.status === 'SENT') throw badRequest('Este correo ya fue enviado');
  const attempt = await sendMail(row.to, row.subject, row.html);
  // sendMail registra una fila nueva: se consolida el resultado en la original y se descarta el duplicado.
  await prisma.emailOutbox.delete({ where: { id: attempt.id } });
  const updated = await prisma.emailOutbox.update({
    where: { id },
    data: { status: attempt.status, error: attempt.error, sentAt: attempt.sentAt },
    select: outboxSelect,
  });
  await audit(req, 'outbox.retry', 'email_outbox', id, { result: updated.status });
  res.json({ data: updated });
});

// ───────────────────────── Mensajes de contacto ─────────────────────────

const zContactStatus = z.enum(['NEW', 'READ', 'ANSWERED']);

r.get('/contact-messages', requirePermission('settings.manage', 'users.manage'), async (req, res) => {
  const p = getPage(req);
  const { status } = query(req, z.object({ status: zContactStatus.optional() }).passthrough());
  const where = {
    ...(status ? { status } : {}),
    ...(p.search ? { OR: [{ name: { contains: p.search } }, { email: { contains: p.search } }, { subject: { contains: p.search } }] } : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.contactMessage.findMany({ where, orderBy: { createdAt: 'desc' }, skip: p.skip, take: p.take }),
    prisma.contactMessage.count({ where }),
  ]);
  res.json(paged(rows, total, p));
});

r.patch('/contact-messages/:id', requirePermission('settings.manage', 'users.manage'), async (req, res) => {
  const id = idParam(req);
  const { status } = body(req, z.object({ status: zContactStatus }));
  if (!(await prisma.contactMessage.findUnique({ where: { id }, select: { id: true } }))) throw notFound('Mensaje no encontrado');
  const msg = await prisma.contactMessage.update({ where: { id }, data: { status } });
  await audit(req, 'contact_message.update', 'contact_message', id, { status });
  res.json({ data: msg });
});

// ───────────────────────── FAQ ─────────────────────────

const faqSchema = z.object({
  question: zText(300).min(3, 'Escribe la pregunta'),
  answer: zText(5000).min(3, 'Escribe la respuesta'),
  isPublished: z.boolean().optional(),
});

r.get('/faqs', requirePermission('settings.manage'), async (_req, res) => {
  res.json({ data: await prisma.faq.findMany({ orderBy: [{ order: 'asc' }, { id: 'asc' }] }) });
});

r.post('/faqs', requirePermission('settings.manage'), async (req, res) => {
  const data = body(req, faqSchema);
  const last = await prisma.faq.aggregate({ _max: { order: true } });
  const faq = await prisma.faq.create({ data: { ...data, order: (last._max.order ?? 0) + 1 } });
  await audit(req, 'faq.create', 'faq', faq.id);
  res.status(201).json({ data: faq });
});

r.put('/faqs/order', requirePermission('settings.manage'), async (req, res) => {
  const { ids } = body(req, z.object({ ids: z.array(z.coerce.number().int().positive()).min(1).max(500) }));
  const unique = [...new Set(ids)];
  if ((await prisma.faq.count({ where: { id: { in: unique } } })) !== unique.length) throw badRequest('Algunas preguntas no existen');
  await prisma.$transaction(unique.map((id, i) => prisma.faq.update({ where: { id }, data: { order: i + 1 } })));
  await audit(req, 'faq.reorder', 'faq', null, { ids: unique });
  res.json({ ok: true });
});

r.patch('/faqs/:id', requirePermission('settings.manage'), async (req, res) => {
  const id = idParam(req);
  const data = body(req, faqSchema.partial());
  if (!(await prisma.faq.findUnique({ where: { id }, select: { id: true } }))) throw notFound('Pregunta no encontrada');
  const faq = await prisma.faq.update({ where: { id }, data });
  await audit(req, 'faq.update', 'faq', id);
  res.json({ data: faq });
});

r.delete('/faqs/:id', requirePermission('settings.manage'), async (req, res) => {
  const id = idParam(req);
  if (!(await prisma.faq.findUnique({ where: { id }, select: { id: true } }))) throw notFound('Pregunta no encontrada');
  await prisma.faq.delete({ where: { id } });
  await audit(req, 'faq.delete', 'faq', id);
  res.json({ ok: true });
});

// ───────────────────────── Respaldo (informativo; no ejecuta mysqldump) ─────────────────────────

interface BackupSetting {
  lastBackupAt: string | null;
  note: string | null;
  markedBy: { id: number; name: string } | null;
}

r.get('/backup/info', requirePermission('settings.manage'), async (_req, res) => {
  const last = await getSetting<BackupSetting>('backup', { lastBackupAt: null, note: null, markedBy: null });
  let host = 'localhost';
  let port = '3306';
  let db = 'cehacis';
  try {
    const u = new URL(env.DATABASE_URL);
    host = u.hostname || host;
    port = u.port || port;
    db = u.pathname.replace(/^\//, '') || db;
  } catch {
    // URL no analizable: se usan valores genéricos en el comando de ejemplo
  }
  res.json({
    data: {
      lastBackup: last,
      command: `mysqldump -h ${host} -P ${port} -u <USUARIO> -p --single-transaction --routines --triggers ${db} > cehacis_$(date +%F).sql`,
      uploadsPath: relUploads(),
      instructions: [
        'Ejecuta el comando de mysqldump desde un servidor con acceso a la base de datos; la API no lo ejecuta por seguridad.',
        'Respalda también la carpeta de archivos subidos (uploadsPath), pues la base de datos solo guarda sus referencias.',
        'Guarda las copias fuera del servidor (almacenamiento cifrado) y prueba restaurarlas periódicamente.',
        'Después de respaldar, registra la fecha con POST /api/admin/backup/mark.',
      ],
    },
  });
});

r.post('/backup/mark', requirePermission('settings.manage'), async (req, res) => {
  const { note } = body(req, z.object({ note: zText(500).optional() }));
  const value: BackupSetting = {
    lastBackupAt: new Date().toISOString(),
    note: note || null,
    markedBy: { id: req.user!.id, name: `${req.user!.firstName} ${req.user!.lastName}` },
  };
  await setSetting('backup', value);
  await audit(req, 'backup.mark', 'setting', 'backup', { note: value.note });
  res.status(201).json({ data: value });
});

export default r;
