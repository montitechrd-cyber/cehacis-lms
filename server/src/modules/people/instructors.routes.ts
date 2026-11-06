import { Router, type Request } from 'express';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { body, idParam, zId } from '../../lib/validate.js';
import { getPage, paged } from '../../lib/pagination.js';
import { audit } from '../../lib/audit.js';
import { badRequest, conflict, forbidden, notFound } from '../../lib/errors.js';
import { assertCourseStaff, can, requireAuth, requirePermission } from '../../middleware/auth.js';
import { zPassword } from '../auth/auth.routes.js';
import { emailSchema, optStr, provisionPassword, revokeSessions, sendInvitation, userBrief } from './people.service.js';

const r = Router();
r.use(requireAuth);

const isStaffUser = (req: Request) => req.user!.role !== 'STUDENT';
const canManageInstructors = (req: Request) => can(req, 'instructors.manage');
function assertManageOrSelf(req: Request, id: number) {
  if (!canManageInstructors(req) && req.user!.id !== id) throw forbidden();
}
async function instructorOr404(id: number) {
  const u = await prisma.user.findFirst({ where: { id, deletedAt: null, role: { key: 'INSTRUCTOR' } } });
  if (!u) throw notFound('Facilitador no encontrado');
  return u;
}

const specialties = z.array(z.string().trim().min(1).max(80)).max(30);
const profileFields = {
  headline: optStr(160),
  bio: optStr(10000),
  specialties: specialties.optional(),
  yearsExperience: z.coerce.number().int().min(0).max(80).nullish(),
  linkedinUrl: z.union([z.literal(''), z.string().trim().url('URL inválida').max(300)]).nullish().transform((v) => (v === undefined ? undefined : v || null)),
  isPublic: z.boolean().optional(),
};
const profileData = (d: { headline?: string | null; bio?: string | null; specialties?: string[]; yearsExperience?: number | null; linkedinUrl?: string | null; isPublic?: boolean }) => ({
  headline: d.headline, bio: d.bio, specialties: d.specialties, yearsExperience: d.yearsExperience, linkedinUrl: d.linkedinUrl, isPublic: d.isPublic,
});
const specList = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

// ───────── Listado (selects y administración) ─────────
r.get('/instructors', async (req, res) => {
  if (!canManageInstructors(req) && !can(req, 'courses.manage') && !isStaffUser(req)) throw forbidden();
  const p = getPage(req, 100);
  const where: Prisma.UserWhereInput = { role: { key: 'INSTRUCTOR' }, deletedAt: null };
  if (p.search) where.OR = [{ firstName: { contains: p.search } }, { lastName: { contains: p.search } }, { email: { contains: p.search } }];
  const rows = await prisma.user.findMany({
    where,
    orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    select: { ...userBrief, status: true, instructor: true, _count: { select: { courseInstructors: true } } },
  });
  const ids = rows.map((u) => u.id);
  const ratings = ids.length ? await prisma.instructorEvaluation.groupBy({ by: ['instructorId'], where: { instructorId: { in: ids } }, _avg: { rating: true } }) : [];
  const data = rows.map((u) => ({
    id: u.id, firstName: u.firstName, lastName: u.lastName, email: u.email, avatarUrl: u.avatarUrl, status: u.status,
    profile: u.instructor ? { headline: u.instructor.headline, specialties: specList(u.instructor.specialties), yearsExperience: u.instructor.yearsExperience, isPublic: u.instructor.isPublic } : null,
    courses: u._count.courseInstructors,
    rating: (() => { const v = ratings.find((x) => x.instructorId === u.id)?._avg.rating; return v == null ? null : Math.round(v * 100) / 100; })(),
  }));
  res.json(paged(data.slice(p.skip, p.skip + p.take), data.length, p));
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

r.post('/instructors', requirePermission('instructors.manage'), async (req, res) => {
  const d = body(req, createSchema);
  if (await prisma.user.findUnique({ where: { email: d.email } })) throw conflict('Ya existe una cuenta con ese correo');
  const role = await prisma.role.findUniqueOrThrow({ where: { key: 'INSTRUCTOR' } });
  const { hash, temporary } = await provisionPassword(d.password);
  const user = await prisma.user.create({
    data: {
      email: d.email, firstName: d.firstName, lastName: d.lastName, phone: d.phone ?? null, passwordHash: hash, roleId: role.id,
      instructor: {
        create: {
          headline: d.headline ?? null, bio: d.bio ?? null, specialties: d.specialties ?? [], yearsExperience: d.yearsExperience ?? null,
          linkedinUrl: d.linkedinUrl ?? null, isPublic: d.isPublic ?? true,
        },
      },
    },
    select: { ...userBrief, phone: true, status: true, createdAt: true },
  });
  await sendInvitation(user.id, user.email, user.firstName, temporary);
  await audit(req, 'instructor.create', 'user', user.id, { email: user.email, temporaryPassword: temporary });
  res.status(201).json({ data: user, invitationSent: temporary });
});

// ───────── Detalle ─────────
r.get('/instructors/:id', async (req, res) => {
  const id = idParam(req);
  assertManageOrSelf(req, id);
  const user = await prisma.user.findFirst({
    where: { id, deletedAt: null, role: { key: 'INSTRUCTOR' } },
    select: { ...userBrief, phone: true, status: true, createdAt: true, lastLoginAt: true, instructor: true },
  });
  if (!user) throw notFound('Facilitador no encontrado');

  const links = await prisma.courseInstructor.findMany({
    where: { instructorId: id },
    include: { course: { select: { id: true, title: true, code: true, status: true, _count: { select: { enrollments: true } } } } },
  });
  const courseIds = links.map((l) => l.courseId);
  const [groups, studentRows, evalAgg, recent, upcoming, availability] = await Promise.all([
    prisma.courseGroup.findMany({
      where: { instructorId: id },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, startDate: true, endDate: true, capacity: true, course: { select: { id: true, title: true } }, _count: { select: { enrollments: true } } },
    }),
    prisma.enrollment.findMany({ where: { courseId: { in: courseIds }, status: { in: ['ACTIVE', 'COMPLETED'] } }, distinct: ['userId'], select: { userId: true } }),
    prisma.instructorEvaluation.aggregate({ where: { instructorId: id }, _avg: { rating: true }, _count: { _all: true } }),
    prisma.instructorEvaluation.findMany({
      where: { instructorId: id }, orderBy: { createdAt: 'desc' }, take: 10,
      select: { rating: true, comment: true, createdAt: true, course: { select: { id: true, title: true } } },
    }),
    prisma.event.findMany({
      where: { instructorId: id, startAt: { gte: new Date() } }, orderBy: { startAt: 'asc' }, take: 10,
      select: { id: true, title: true, type: true, startAt: true, endAt: true, course: { select: { id: true, title: true } } },
    }),
    prisma.instructorAvailability.findMany({ where: { instructorId: id }, orderBy: [{ weekday: 'asc' }, { startTime: 'asc' }], select: { id: true, weekday: true, startTime: true, endTime: true } }),
  ]);

  const { instructor: ip, ...u } = user;
  res.json({
    profile: {
      ...u,
      headline: ip?.headline ?? null, bio: ip?.bio ?? null, specialties: specList(ip?.specialties), yearsExperience: ip?.yearsExperience ?? null,
      linkedinUrl: ip?.linkedinUrl ?? null, isPublic: ip?.isPublic ?? true,
    },
    courses: links.map((l) => ({ id: l.course.id, title: l.course.title, code: l.course.code, status: l.course.status, enrollments: l.course._count.enrollments })),
    groups: groups.map((g) => ({ id: g.id, name: g.name, startDate: g.startDate, endDate: g.endDate, capacity: g.capacity, course: g.course, enrollments: g._count.enrollments })),
    students: studentRows.length,
    evaluations: {
      avg: evalAgg._avg.rating == null ? null : Math.round(evalAgg._avg.rating * 100) / 100,
      count: evalAgg._count._all,
      recent, // comentarios visibles solo para quien puede abrir este detalle (administración o el propio facilitador)
    },
    upcomingEvents: upcoming,
    availability,
  });
});

// ───────── Edición ─────────
const patchSchema = z.object({
  firstName: z.string().trim().min(1).max(100).optional(),
  lastName: z.string().trim().min(1).max(100).optional(),
  phone: optStr(30),
  email: emailSchema.optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED']).optional(),
  ...profileFields,
});

r.patch('/instructors/:id', async (req, res) => {
  const id = idParam(req);
  assertManageOrSelf(req, id);
  const d = body(req, patchSchema);
  const manage = canManageInstructors(req);
  if (!manage && (d.email !== undefined || d.status !== undefined)) throw forbidden('Solo administración puede cambiar el correo o el estado');
  const cur = await instructorOr404(id);
  if (d.email && d.email !== cur.email && (await prisma.user.findUnique({ where: { email: d.email } }))) throw conflict('Ya existe una cuenta con ese correo');
  const prof = profileData(d);
  const user = await prisma.user.update({
    where: { id },
    data: {
      firstName: d.firstName, lastName: d.lastName, phone: d.phone, email: d.email, status: d.status,
      instructor: { upsert: { create: { ...prof, specialties: prof.specialties ?? [] }, update: { ...prof } } },
    },
    select: { ...userBrief, phone: true, status: true },
  });
  if (d.status === 'SUSPENDED') await revokeSessions(id);
  await audit(req, 'instructor.update', 'user', id, { fields: Object.keys(d), self: req.user!.id === id });
  res.json({ data: user });
});

r.put('/instructors/:id/courses', requirePermission('instructors.manage'), async (req, res) => {
  const id = idParam(req);
  const { courseIds } = body(req, z.object({ courseIds: z.array(zId).max(500) }));
  await instructorOr404(id);
  const ids = [...new Set(courseIds)];
  const found = await prisma.course.count({ where: { id: { in: ids }, deletedAt: null } });
  if (found !== ids.length) throw badRequest('Alguno de los cursos no existe');
  const before = await prisma.courseInstructor.findMany({ where: { instructorId: id }, select: { courseId: true } });
  await prisma.$transaction([
    prisma.courseInstructor.deleteMany({ where: { instructorId: id } }),
    prisma.courseInstructor.createMany({ data: ids.map((courseId) => ({ courseId, instructorId: id, isLead: true })) }),
  ]);
  await audit(req, 'instructor.set_courses', 'user', id, { before: before.map((b) => b.courseId), after: ids });
  res.json({ ok: true, courseIds: ids });
});

// ───────── Estudiantes del facilitador ─────────
r.get('/instructors/:id/students', async (req, res) => {
  const id = idParam(req);
  assertManageOrSelf(req, id);
  await instructorOr404(id);
  const p = getPage(req);
  const courseIds = (await prisma.courseInstructor.findMany({ where: { instructorId: id }, select: { courseId: true } })).map((c) => c.courseId);
  const where: Prisma.EnrollmentWhereInput = {
    courseId: { in: courseIds },
    status: { in: ['ACTIVE', 'COMPLETED'] },
    ...(p.search ? { user: { OR: [{ firstName: { contains: p.search } }, { lastName: { contains: p.search } }, { email: { contains: p.search } }] } } : {}),
  };
  const [total, rows] = await Promise.all([
    prisma.enrollment.count({ where }),
    prisma.enrollment.findMany({
      where, orderBy: { enrolledAt: 'desc' }, skip: p.skip, take: p.take,
      select: { id: true, status: true, progressPct: true, enrolledAt: true, user: { select: userBrief }, course: { select: { id: true, title: true, code: true } }, group: { select: { id: true, name: true } } },
    }),
  ]);
  res.json(paged(rows, total, p));
});

// ───────── Evaluación docente ─────────
const evalSchema = z.object({ courseId: zId, rating: z.coerce.number().int().min(1, 'Entre 1 y 5').max(5, 'Entre 1 y 5'), comment: z.string().trim().max(3000).optional().default('') });

r.post('/instructors/:id/evaluations', async (req, res) => {
  const id = idParam(req);
  const d = body(req, evalSchema);
  await instructorOr404(id);
  const teaches = await prisma.courseInstructor.findUnique({ where: { courseId_instructorId: { courseId: d.courseId, instructorId: id } } });
  if (!teaches) throw badRequest('Ese facilitador no imparte el curso indicado');
  const staff = canManageInstructors(req);
  if (!staff) {
    const enr = await prisma.enrollment.findUnique({ where: { userId_courseId: { userId: req.user!.id, courseId: d.courseId } } });
    if (!enr || !['ACTIVE', 'COMPLETED'].includes(enr.status)) throw forbidden('Solo estudiantes inscritos en el curso pueden evaluar al facilitador');
  }
  const dup = await prisma.instructorEvaluation.findFirst({ where: { instructorId: id, evaluatorId: req.user!.id, courseId: d.courseId } });
  if (dup) throw conflict('Ya evaluaste a este facilitador en este curso');
  const ev = await prisma.instructorEvaluation.create({
    data: { instructorId: id, evaluatorId: req.user!.id, courseId: d.courseId, rating: d.rating, comment: d.comment || null },
    select: { id: true, rating: true, comment: true, courseId: true, createdAt: true },
  });
  if (staff) await audit(req, 'instructor.evaluation_create', 'instructor_evaluation', ev.id, { instructorId: id });
  res.status(201).json({ data: ev });
});

r.get('/instructors/:id/evaluations', async (req, res) => {
  const id = idParam(req);
  assertManageOrSelf(req, id);
  const p = getPage(req);
  const where = { instructorId: id };
  const [total, rows, agg] = await Promise.all([
    prisma.instructorEvaluation.count({ where }),
    prisma.instructorEvaluation.findMany({
      where, orderBy: { createdAt: 'desc' }, skip: p.skip, take: p.take,
      select: { id: true, rating: true, comment: true, createdAt: true, course: { select: { id: true, title: true } }, evaluator: { select: { id: true, firstName: true, lastName: true } } },
    }),
    prisma.instructorEvaluation.aggregate({ where, _avg: { rating: true } }),
  ]);
  // El facilitador evaluado ve los comentarios de forma anónima; administración ve quién evaluó.
  const anonymous = !canManageInstructors(req);
  const data = rows.map((e) => ({ ...e, evaluator: anonymous ? null : e.evaluator }));
  res.json({ ...paged(data, total, p), summary: { avg: agg._avg.rating == null ? null : Math.round(agg._avg.rating * 100) / 100, count: total } });
});

// ───────── Reseñas de curso ─────────
const reviewSchema = z.object({ rating: z.coerce.number().int().min(1, 'Entre 1 y 5').max(5, 'Entre 1 y 5'), comment: z.string().trim().max(3000).optional().default('') });

r.post('/courses/:courseId/reviews', async (req, res) => {
  const courseId = idParam(req, 'courseId');
  const d = body(req, reviewSchema);
  const userId = req.user!.id;
  const enr = await prisma.enrollment.findUnique({ where: { userId_courseId: { userId, courseId } } });
  if (!enr || !['ACTIVE', 'COMPLETED'].includes(enr.status)) throw forbidden('Debes estar inscrito en el curso para reseñarlo');
  const review = await prisma.courseReview.upsert({
    where: { courseId_userId: { courseId, userId } },
    create: { courseId, userId, rating: d.rating, comment: d.comment || null, isApproved: false },
    update: { rating: d.rating, comment: d.comment || null, isApproved: false },
    select: { id: true, courseId: true, rating: true, comment: true, isApproved: true, createdAt: true },
  });
  res.status(201).json({ data: review });
});

r.get('/courses/:courseId/reviews', async (req, res) => {
  const courseId = idParam(req, 'courseId');
  await assertCourseStaff(req, courseId);
  const p = getPage(req);
  const [total, rows, agg] = await Promise.all([
    prisma.courseReview.count({ where: { courseId } }),
    prisma.courseReview.findMany({
      where: { courseId }, orderBy: { createdAt: 'desc' }, skip: p.skip, take: p.take,
      select: { id: true, rating: true, comment: true, isApproved: true, createdAt: true, user: { select: userBrief } },
    }),
    prisma.courseReview.aggregate({ where: { courseId }, _avg: { rating: true } }),
  ]);
  res.json({ ...paged(rows, total, p), summary: { avg: agg._avg.rating == null ? null : Math.round(agg._avg.rating * 100) / 100, count: total } });
});

r.patch('/reviews/:id', requirePermission('courses.manage'), async (req, res) => {
  const id = idParam(req);
  const { isApproved } = body(req, z.object({ isApproved: z.boolean() }));
  const cur = await prisma.courseReview.findUnique({ where: { id } });
  if (!cur) throw notFound('Reseña no encontrada');
  const review = await prisma.courseReview.update({ where: { id }, data: { isApproved }, select: { id: true, courseId: true, rating: true, comment: true, isApproved: true } });
  await audit(req, isApproved ? 'review.approve' : 'review.reject', 'course_review', id, { courseId: cur.courseId });
  res.json({ data: review });
});

export default r;
