import { Router } from 'express';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { body, idParam, query, zId } from '../../lib/validate.js';
import { getPage, orderBy, paged } from '../../lib/pagination.js';
import { audit } from '../../lib/audit.js';
import { conflict, forbidden, notFound } from '../../lib/errors.js';
import { can, requireAuth, requirePermission } from '../../middleware/auth.js';
import { zPassword } from '../auth/auth.routes.js';
import {
  assertStudentInScope, attendanceStats, emailSchema, num, optDate, optStr, provisionPassword,
  revokeSessions, sendInvitation, studentScope, userBrief,
} from './people.service.js';

const r = Router();
r.use(requireAuth);

const profileFields = {
  documentId: optStr(30),
  birthDate: optDate,
  occupation: optStr(120),
  city: optStr(100),
  country: optStr(100),
};

const listQuery = z.object({
  status: z.enum(['ACTIVE', 'PENDING', 'SUSPENDED']).optional(),
  courseId: zId.optional(),
});

// ───────── Listado ─────────
r.get('/students', async (req, res) => {
  const scope = await studentScope(req);
  const p = getPage(req);
  const q = query(req, listQuery);
  const where: Prisma.UserWhereInput = { role: { key: 'STUDENT' }, deletedAt: null };
  const and: Prisma.UserWhereInput[] = [];
  if (q.status) where.status = q.status;
  if (p.search) {
    and.push({ OR: [{ firstName: { contains: p.search } }, { lastName: { contains: p.search } }, { email: { contains: p.search } }] });
  }
  if (!scope.all) {
    if (q.courseId && !scope.courseIds.includes(q.courseId)) throw forbidden('No impartes ese curso');
    and.push({ enrollments: { some: { courseId: q.courseId ?? { in: scope.courseIds } } } });
  } else if (q.courseId) {
    and.push({ enrollments: { some: { courseId: q.courseId } } });
  }
  if (and.length) where.AND = and;

  const [total, rows] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: orderBy(p, ['createdAt', 'firstName', 'lastName', 'email', 'lastLoginAt'], 'createdAt'),
      skip: p.skip,
      take: p.take,
      select: { ...userBrief, phone: true, status: true, createdAt: true, lastLoginAt: true, student: { select: { points: true, level: { select: { number: true, name: true } } } } },
    }),
  ]);
  const ids = rows.map((u) => u.id);
  const enr = ids.length
    ? await prisma.enrollment.groupBy({
        by: ['userId', 'status'],
        where: { userId: { in: ids }, status: { in: ['ACTIVE', 'COMPLETED'] }, ...(scope.all ? {} : { courseId: { in: scope.courseIds } }) },
        _count: { _all: true },
      })
    : [];
  const data = rows.map((u) => {
    const c = (s: string) => enr.find((e) => e.userId === u.id && e.status === s)?._count._all ?? 0;
    return {
      id: u.id, firstName: u.firstName, lastName: u.lastName, email: u.email, phone: u.phone, avatarUrl: u.avatarUrl,
      status: u.status, createdAt: u.createdAt, lastLoginAt: u.lastLoginAt,
      points: u.student?.points ?? 0,
      level: u.student?.level ?? null,
      enrollments: { active: c('ACTIVE'), completed: c('COMPLETED') },
    };
  });
  res.json(paged(data, total, p));
});

// ───────── Alta ─────────
const createSchema = z.object({
  firstName: z.string().trim().min(1, 'Escribe el nombre').max(100),
  lastName: z.string().trim().min(1, 'Escribe el apellido').max(100),
  email: emailSchema,
  phone: optStr(30),
  password: zPassword.optional(),
  ...profileFields,
});

r.post('/students', requirePermission('students.manage'), async (req, res) => {
  const d = body(req, createSchema);
  if (await prisma.user.findUnique({ where: { email: d.email } })) throw conflict('Ya existe una cuenta con ese correo');
  const role = await prisma.role.findUniqueOrThrow({ where: { key: 'STUDENT' } });
  const { hash, temporary } = await provisionPassword(d.password);
  const user = await prisma.user.create({
    data: {
      email: d.email, firstName: d.firstName, lastName: d.lastName, phone: d.phone ?? null, passwordHash: hash, roleId: role.id,
      student: { create: { documentId: d.documentId ?? null, birthDate: d.birthDate ?? null, occupation: d.occupation ?? null, city: d.city ?? null, country: d.country ?? null } },
    },
    select: { ...userBrief, phone: true, status: true, createdAt: true },
  });
  await sendInvitation(user.id, user.email, user.firstName, temporary);
  await audit(req, 'student.create', 'user', user.id, { email: user.email, temporaryPassword: temporary });
  res.status(201).json({ data: user, invitationSent: temporary });
});

// ───────── Expediente ─────────
r.get('/students/:id', async (req, res) => {
  const id = idParam(req);
  const scope = await studentScope(req);
  const courseIds = await assertStudentInScope(scope, id);
  const cf = courseIds ? { in: courseIds } : undefined;
  const isManager = can(req, 'students.manage');

  const user = await prisma.user.findFirst({
    where: { id, deletedAt: null, role: { key: 'STUDENT' } },
    select: { ...userBrief, phone: true, status: true, createdAt: true, lastLoginAt: true, emailVerifiedAt: true, student: { include: { level: true } } },
  });
  if (!user) throw notFound('Estudiante no encontrado');

  const showPayments = can(req, 'payments.manage') || isManager;
  const noteWhere: Prisma.AcademicNoteWhereInput = {
    studentId: id,
    ...(cf ? { OR: [{ courseId: cf }, { courseId: null }] } : {}),
    ...(isManager ? {} : { AND: [{ OR: [{ isPrivate: false }, { authorId: req.user!.id }] }] }),
  };

  const [enrollments, attempts, subs, att, comps, certs, ach, orders, notes] = await Promise.all([
    prisma.enrollment.findMany({
      where: { userId: id, ...(cf ? { courseId: cf } : {}) },
      orderBy: { enrolledAt: 'desc' },
      include: { course: { select: { id: true, title: true, code: true } }, group: { select: { id: true, name: true } } },
    }),
    prisma.assessmentAttempt.findMany({
      where: { userId: id, status: { in: ['SUBMITTED', 'GRADED'] }, ...(cf ? { assessment: { courseId: cf } } : {}) },
      select: { assessmentId: true, percentage: true, passed: true, assessment: { select: { id: true, title: true, type: true, course: { select: { id: true, title: true } } } } },
    }),
    prisma.activitySubmission.findMany({
      where: { userId: id, ...(cf ? { activity: { courseId: cf } } : {}) },
      orderBy: { submittedAt: 'desc' },
      select: { status: true, score: true, submittedAt: true, activity: { select: { id: true, title: true, course: { select: { id: true, title: true } } } } },
    }),
    prisma.attendance.findMany({
      where: { userId: id, ...(cf ? { event: { courseId: cf } } : {}) },
      orderBy: { event: { startAt: 'desc' } },
      select: { status: true, event: { select: { id: true, title: true, startAt: true, course: { select: { id: true, title: true } } } } },
    }),
    prisma.studentCompetency.findMany({
      where: { userId: id, isReviewed: true, ...(cf ? { courseId: cf } : {}) },
      orderBy: { recordedAt: 'desc' },
      include: { competency: { select: { id: true, name: true } } },
    }),
    prisma.certificate.findMany({ where: { userId: id, ...(cf ? { courseId: cf } : {}) }, orderBy: { issuedAt: 'desc' }, select: { id: true, code: true, title: true, issuedAt: true, status: true } }),
    prisma.achievement.findMany({ where: { userId: id }, orderBy: { awardedAt: 'desc' }, select: { awardedAt: true, badge: { select: { name: true, icon: true } } } }),
    showPayments ? prisma.order.findMany({ where: { userId: id }, orderBy: { createdAt: 'desc' }, select: { id: true, number: true, total: true, status: true, createdAt: true } }) : Promise.resolve([]),
    prisma.academicNote.findMany({
      where: noteWhere,
      orderBy: { createdAt: 'desc' },
      select: { id: true, note: true, isPrivate: true, createdAt: true, author: { select: { id: true, firstName: true, lastName: true } }, course: { select: { id: true, title: true } } },
    }),
  ]);

  // Mejor resultado por evaluación
  const gradeMap = new Map<number, { assessment: (typeof attempts)[number]['assessment']; bestPercentage: number | null; passed: boolean; attempts: number }>();
  for (const a of attempts) {
    const g = gradeMap.get(a.assessmentId) ?? { assessment: a.assessment, bestPercentage: null, passed: false, attempts: 0 };
    g.attempts++;
    const pct = num(a.percentage);
    if (pct != null && (g.bestPercentage == null || pct > g.bestPercentage)) g.bestPercentage = pct;
    if (a.passed) g.passed = true;
    gradeMap.set(a.assessmentId, g);
  }
  // Última puntuación por competencia (los registros vienen ordenados de más reciente a más antiguo)
  const compMap = new Map<number, { competency: { id: number; name: string }; latest: Record<string, unknown>; count: number }>();
  for (const c of comps) {
    const cur = compMap.get(c.competencyId);
    if (cur) cur.count++;
    else compMap.set(c.competencyId, { competency: c.competency, latest: { score: Number(c.score), scaleMax: c.scaleMax, source: c.source, isReviewed: c.isReviewed, recordedAt: c.recordedAt }, count: 1 });
  }
  const attSummary = attendanceStats(att.map((a) => a.status));
  const finals = enrollments.map((e) => num(e.finalGrade)).filter((v): v is number => v != null);

  const { student, ...u } = user;
  res.json({
    profile: {
      ...u,
      documentId: student?.documentId ?? null, birthDate: student?.birthDate ?? null, occupation: student?.occupation ?? null,
      city: student?.city ?? null, country: student?.country ?? null, bio: student?.bio ?? null,
    },
    stats: {
      enrolled: enrollments.filter((e) => e.status !== 'CANCELLED').length,
      completed: enrollments.filter((e) => e.status === 'COMPLETED').length,
      avgGrade: finals.length ? Math.round((finals.reduce((s, v) => s + v, 0) / finals.length) * 100) / 100 : null,
      attendancePct: attSummary.pct,
      points: student?.points ?? 0,
      level: student?.level ? { number: student.level.number, name: student.level.name } : null,
      certificates: certs.filter((c) => c.status === 'VALID').length,
    },
    enrollments: enrollments.map((e) => ({
      id: e.id, status: e.status, progressPct: e.progressPct, finalGrade: num(e.finalGrade), enrolledAt: e.enrolledAt, completedAt: e.completedAt, course: e.course, group: e.group,
    })),
    grades: [...gradeMap.values()],
    activities: subs.map((s) => ({ activity: s.activity, status: s.status, score: num(s.score), submittedAt: s.submittedAt })),
    attendance: att.map((a) => ({ event: a.event, status: a.status })),
    attendanceSummary: attSummary,
    competencies: [...compMap.values()],
    certificates: certs,
    achievements: ach,
    ...(showPayments ? { payments: orders.map((o) => ({ order: { id: o.id, number: o.number, total: Number(o.total), status: o.status, createdAt: o.createdAt } })) } : {}),
    notes,
  });
});

// ───────── Edición / baja ─────────
const patchSchema = z.object({
  firstName: z.string().trim().min(1).max(100).optional(),
  lastName: z.string().trim().min(1).max(100).optional(),
  email: emailSchema.optional(),
  phone: optStr(30),
  status: z.enum(['ACTIVE', 'SUSPENDED']).optional(),
  ...profileFields,
  bio: optStr(5000),
});

async function studentOr404(id: number) {
  const u = await prisma.user.findFirst({ where: { id, deletedAt: null, role: { key: 'STUDENT' } } });
  if (!u) throw notFound('Estudiante no encontrado');
  return u;
}

r.patch('/students/:id', requirePermission('students.manage'), async (req, res) => {
  const id = idParam(req);
  const d = body(req, patchSchema);
  const cur = await studentOr404(id);
  if (d.email && d.email !== cur.email && (await prisma.user.findUnique({ where: { email: d.email } }))) throw conflict('Ya existe una cuenta con ese correo');
  const prof = { documentId: d.documentId, birthDate: d.birthDate, occupation: d.occupation, city: d.city, country: d.country, bio: d.bio };
  const user = await prisma.user.update({
    where: { id },
    data: {
      firstName: d.firstName, lastName: d.lastName, email: d.email, phone: d.phone, status: d.status,
      student: { upsert: { create: { ...prof }, update: { ...prof } } },
    },
    select: { ...userBrief, phone: true, status: true },
  });
  if (d.status === 'SUSPENDED') await revokeSessions(id);
  await audit(req, 'student.update', 'user', id, { fields: Object.keys(d) });
  res.json({ data: user });
});

r.delete('/students/:id', requirePermission('students.manage'), async (req, res) => {
  const id = idParam(req);
  await studentOr404(id);
  await prisma.user.update({ where: { id }, data: { deletedAt: new Date(), status: 'SUSPENDED' } });
  await revokeSessions(id);
  await audit(req, 'student.delete', 'user', id);
  res.json({ ok: true });
});

// ───────── Notas académicas ─────────
const noteSchema = z.object({ note: z.string().trim().min(1, 'Escribe la nota').max(5000), courseId: zId.nullish(), isPrivate: z.boolean().default(true) });

r.post('/students/:id/notes', async (req, res) => {
  const id = idParam(req);
  const d = body(req, noteSchema);
  const scope = await studentScope(req);
  await studentOr404(id);
  await assertStudentInScope(scope, id);
  if (!scope.all && d.courseId && !scope.courseIds.includes(d.courseId)) throw forbidden('No impartes ese curso');
  const note = await prisma.academicNote.create({
    data: { studentId: id, authorId: req.user!.id, courseId: d.courseId ?? null, note: d.note, isPrivate: d.isPrivate },
    select: { id: true, note: true, isPrivate: true, createdAt: true, author: { select: { id: true, firstName: true, lastName: true } }, course: { select: { id: true, title: true } } },
  });
  await audit(req, 'student.note_create', 'academic_note', note.id, { studentId: id });
  res.status(201).json({ data: note });
});

r.delete('/notes/:noteId', async (req, res) => {
  const noteId = idParam(req, 'noteId');
  const n = await prisma.academicNote.findUnique({ where: { id: noteId } });
  if (!n) throw notFound('Nota no encontrada');
  if (n.authorId !== req.user!.id && !can(req, 'students.manage')) throw forbidden();
  await prisma.academicNote.delete({ where: { id: noteId } });
  await audit(req, 'student.note_delete', 'academic_note', noteId, { studentId: n.studentId });
  res.json({ ok: true });
});

// ───────── Mi perfil de estudiante ─────────
const meSchema = z.object({ ...profileFields, bio: optStr(5000) });

async function myProfile(userId: number) {
  const u = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { ...userBrief, phone: true, student: { select: { documentId: true, birthDate: true, occupation: true, city: true, country: true, bio: true, points: true } } },
  });
  const { student, ...rest } = u;
  return {
    ...rest,
    documentId: student?.documentId ?? null, birthDate: student?.birthDate ?? null, occupation: student?.occupation ?? null,
    city: student?.city ?? null, country: student?.country ?? null, bio: student?.bio ?? null, points: student?.points ?? 0,
  };
}

r.get('/me/profile', async (req, res) => {
  await prisma.studentProfile.upsert({ where: { userId: req.user!.id }, update: {}, create: { userId: req.user!.id } });
  res.json({ data: await myProfile(req.user!.id) });
});

r.patch('/me/profile', async (req, res) => {
  const d = body(req, meSchema);
  const data = { documentId: d.documentId, birthDate: d.birthDate, occupation: d.occupation, city: d.city, country: d.country, bio: d.bio };
  await prisma.studentProfile.upsert({ where: { userId: req.user!.id }, update: data, create: { userId: req.user!.id, ...data } });
  res.json({ data: await myProfile(req.user!.id) });
});

export default r;
