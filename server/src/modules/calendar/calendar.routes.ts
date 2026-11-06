import { Router, type Request } from 'express';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { body, idParam, query, zId } from '../../lib/validate.js';
import { audit } from '../../lib/audit.js';
import { notify } from '../../lib/notify.js';
import { awardPoints } from '../../lib/gamification.js';
import { AppError, badRequest, forbidden, notFound } from '../../lib/errors.js';
import { assertCourseStaff, can, requireAuth, taughtCourseIds } from '../../middleware/auth.js';
import { detectMeetingProvider } from '../../integrations/video/provider.js';
import { recalcEnrollment } from '../classroom/classroom.service.js';

const r = Router();
r.use(requireAuth);

const userBrief = { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } as const;
const EVENT_TYPES = ['CLASS', 'WORKSHOP', 'INDIVIDUAL_SESSION', 'VIRTUAL_CLASS', 'EXAM', 'DEADLINE', 'OTHER'] as const;
const ATT_STATUS = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'] as const;

// ───────── Contexto de acceso ─────────
/** Administración del calendario completo. */
const isCalendarAdmin = (req: Request) => can(req, 'calendar.manage') && can(req, 'courses.manage');

interface Ctx {
  me: number;
  admin: boolean;
  taught: Set<number>;
  /** courseId -> groupId de la inscripción vigente */
  enrolled: Map<number, number | null>;
}
async function loadCtx(req: Request): Promise<Ctx> {
  const me = req.user!.id;
  const [taught, enr] = await Promise.all([
    taughtCourseIds(me),
    prisma.enrollment.findMany({ where: { userId: me, status: { in: ['ACTIVE', 'COMPLETED'] } }, select: { courseId: true, groupId: true } }),
  ]);
  return { me, admin: isCalendarAdmin(req), taught: new Set(taught), enrolled: new Map(enr.map((e) => [e.courseId, e.groupId])) };
}

/** Condición Prisma de los eventos que el usuario puede ver. `mine` excluye lo global (públicos y "todo" del administrador). */
function visibleWhere(ctx: Ctx, mine = false): Prisma.EventWhereInput {
  if (ctx.admin && !mine) return {};
  const or: Prisma.EventWhereInput[] = [{ instructorId: ctx.me }, { participants: { some: { userId: ctx.me } } }];
  if (!mine) or.push({ isPublic: true });
  if (ctx.taught.size) or.push({ courseId: { in: [...ctx.taught] } });
  for (const [courseId, groupId] of ctx.enrolled) {
    or.push({ courseId, OR: groupId ? [{ groupId: null }, { groupId }] : [{ groupId: null }] });
  }
  return { OR: or };
}

interface EvLike { courseId: number | null; groupId: number | null; instructorId: number | null; participants?: { userId: number }[] }
/** ¿Puede ver enlaces de reunión/grabación y administrar? */
function hasAccess(ctx: Ctx, ev: EvLike) {
  if (ctx.admin || ev.instructorId === ctx.me) return true;
  if (ev.participants?.some((p) => p.userId === ctx.me)) return true;
  if (ev.courseId == null) return false;
  if (ctx.taught.has(ev.courseId)) return true;
  if (!ctx.enrolled.has(ev.courseId)) return false;
  return ev.groupId == null || ctx.enrolled.get(ev.courseId) === ev.groupId;
}
/** Alcance de gestión (editar/borrar/programar). */
function canManageEvent(req: Request, ctx: Ctx, ev: EvLike) {
  if (ctx.admin) return true;
  if (!can(req, 'calendar.manage')) return false;
  if (ev.instructorId === ctx.me) return true;
  return ev.courseId != null && ctx.taught.has(ev.courseId);
}
/** Alcance de asistencia: personal del curso o instructor del evento. */
function isEventStaff(req: Request, ctx: Ctx, ev: EvLike) {
  if (ev.instructorId === ctx.me) return true;
  if (ev.courseId != null) return can(req, 'courses.manage') || ctx.taught.has(ev.courseId);
  return ctx.admin;
}

const eventInclude = {
  course: { select: { id: true, title: true } },
  group: { select: { id: true, name: true } },
  instructor: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
  _count: { select: { participants: true } },
} satisfies Prisma.EventInclude;

type EventRow = Prisma.EventGetPayload<{ include: typeof eventInclude }> & { participants?: { userId: number }[] };
function shape(ev: EventRow, ctx: Ctx, req: Request) {
  const access = hasAccess(ctx, ev);
  return {
    id: ev.id, title: ev.title, description: ev.description, type: ev.type,
    course: ev.course, group: ev.group, instructor: ev.instructor,
    startAt: ev.startAt, endAt: ev.endAt, location: ev.location,
    meetingUrl: access ? ev.meetingUrl : null,
    meetingProvider: access ? ev.meetingProvider : null,
    recordingUrl: access ? ev.recordingUrl : null,
    isPublic: ev.isPublic, reminderMinutes: ev.reminderMinutes,
    participants: ev._count.participants,
    canManage: canManageEvent(req, ctx, ev),
  };
}

async function loadEvent(id: number) {
  const ev = await prisma.event.findUnique({ where: { id }, include: eventInclude });
  if (!ev) throw notFound('Evento no encontrado');
  return ev;
}

// ───────── Listado y detalle ─────────
const listQuery = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  courseId: zId.optional(),
  type: z.enum(EVENT_TYPES).optional(),
});

r.get('/events', async (req, res) => {
  const q = query(req, listQuery);
  const ctx = await loadCtx(req);
  const and: Prisma.EventWhereInput[] = [visibleWhere(ctx)];
  if (q.from) and.push({ endAt: { gte: q.from } });
  if (q.to) and.push({ startAt: { lte: q.to } });
  if (q.courseId) and.push({ courseId: q.courseId });
  if (q.type) and.push({ type: q.type });
  const rows = await prisma.event.findMany({
    where: { AND: and },
    orderBy: { startAt: 'asc' },
    take: 1000,
    include: { ...eventInclude, participants: { where: { userId: ctx.me }, select: { userId: true } } },
  });
  res.json({ data: rows.map((e) => shape(e, ctx, req)) });
});

r.get('/events/:id', async (req, res) => {
  const id = idParam(req);
  const ctx = await loadCtx(req);
  const ev = await prisma.event.findFirst({
    where: { AND: [{ id }, visibleWhere(ctx)] },
    include: { ...eventInclude, participants: { select: { userId: true } } },
  });
  if (!ev) throw notFound('Evento no encontrado');
  const staff = canManageEvent(req, ctx, ev) || isEventStaff(req, ctx, ev);
  const participantUsers = staff
    ? await prisma.eventParticipant.findMany({ where: { eventId: id }, select: { user: { select: userBrief } } })
    : [];
  res.json({ data: { ...shape(ev, ctx, req), participantList: staff ? participantUsers.map((p) => p.user) : undefined } });
});

// ───────── Alta / edición / baja ─────────
const eventFields = {
  title: z.string().trim().min(1, 'Escribe el título').max(200),
  description: z.string().trim().max(10000).nullish(),
  type: z.enum(EVENT_TYPES).default('CLASS'),
  courseId: zId.nullish(),
  groupId: zId.nullish(),
  instructorId: zId.nullish(),
  startAt: z.coerce.date(),
  endAt: z.coerce.date(),
  location: z.string().trim().max(255).nullish(),
  meetingUrl: z.union([z.literal(''), z.string().trim().url('Enlace de reunión inválido').max(1000)]).nullish(),
  recordingUrl: z.union([z.literal(''), z.string().trim().url('Enlace de grabación inválido').max(1000)]).nullish(),
  isPublic: z.boolean().default(false),
  reminderMinutes: z.coerce.number().int().min(0).max(10080).nullish(),
  participantIds: z.array(zId).max(200).optional(),
};
const createSchema = z.object(eventFields).refine((d) => d.endAt > d.startAt, { message: 'La hora de fin debe ser posterior al inicio', path: ['endAt'] });
const patchSchema = z.object(eventFields).partial();
const forceQuery = z.object({ force: z.enum(['true', 'false']).optional() });
const nz = (v: string | null | undefined) => (v === undefined ? undefined : v || null);

/** Solapamiento con otros eventos del instructor. */
async function findConflicts(instructorId: number, startAt: Date, endAt: Date, excludeId?: number) {
  return prisma.event.findMany({
    where: { instructorId, startAt: { lt: endAt }, endAt: { gt: startAt }, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { id: true, title: true, startAt: true, endAt: true },
    orderBy: { startAt: 'asc' },
  });
}

const hhmm = (d: Date) => d.getHours() * 60 + d.getMinutes();
const toMin = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5));
/** Advertencias de disponibilidad (no bloquean). */
async function availabilityWarnings(instructorId: number, startAt: Date, endAt: Date): Promise<string[]> {
  const slots = await prisma.instructorAvailability.findMany({ where: { instructorId } });
  if (!slots.length) return [];
  const sameDay = startAt.toDateString() === endAt.toDateString();
  const ok = sameDay && slots.some((s) => s.weekday === startAt.getDay() && toMin(s.startTime) <= hhmm(startAt) && toMin(s.endTime) >= hhmm(endAt));
  return ok ? [] : ['El evento queda fuera de la disponibilidad registrada del facilitador'];
}

async function recipients(ev: { courseId: number | null; groupId: number | null }, participantIds: number[], exclude: number[]) {
  const ids = new Set<number>(participantIds);
  if (ev.courseId) {
    const enr = await prisma.enrollment.findMany({
      where: { courseId: ev.courseId, status: { in: ['ACTIVE', 'COMPLETED'] }, ...(ev.groupId ? { groupId: ev.groupId } : {}) },
      select: { userId: true },
    });
    enr.forEach((e) => ids.add(e.userId));
  }
  exclude.forEach((x) => ids.delete(x));
  return [...ids];
}

const fmt = (d: Date) => d.toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' });

async function validateRefs(courseId: number | null | undefined, groupId: number | null | undefined, participantIds?: number[]) {
  if (courseId) {
    const c = await prisma.course.findFirst({ where: { id: courseId, deletedAt: null }, select: { id: true } });
    if (!c) throw badRequest('El curso no existe');
  }
  if (groupId) {
    if (!courseId) throw badRequest('Para elegir un grupo debes indicar el curso');
    const g = await prisma.courseGroup.findFirst({ where: { id: groupId, courseId }, select: { id: true } });
    if (!g) throw badRequest('El grupo no pertenece al curso');
  }
  if (participantIds?.length) {
    const n = await prisma.user.count({ where: { id: { in: participantIds }, deletedAt: null } });
    if (n !== new Set(participantIds).size) throw badRequest('Alguno de los participantes no existe');
  }
}

r.post('/events', async (req, res) => {
  if (!can(req, 'calendar.manage')) throw forbidden();
  const d = body(req, createSchema);
  const { force } = query(req, forceQuery);
  const ctx = await loadCtx(req);

  let instructorId = d.instructorId ?? null;
  if (!ctx.admin) {
    // Facilitador: solo sus cursos, o sesiones individuales donde él es el instructor.
    if (d.courseId) {
      if (!ctx.taught.has(d.courseId)) throw forbidden('Solo puedes programar eventos en tus cursos');
      if (instructorId && instructorId !== ctx.me) {
        const link = await prisma.courseInstructor.findUnique({ where: { courseId_instructorId: { courseId: d.courseId, instructorId } } });
        if (!link) throw badRequest('El instructor no está asignado al curso');
      }
    } else {
      if (d.type !== 'INDIVIDUAL_SESSION') throw forbidden('Sin curso, solo puedes programar sesiones individuales');
      if (instructorId && instructorId !== ctx.me) throw forbidden('En sesiones individuales el instructor eres tú');
    }
    instructorId = instructorId ?? ctx.me;
  }
  await validateRefs(d.courseId, d.groupId, d.participantIds);
  if (instructorId) {
    const ins = await prisma.user.findFirst({ where: { id: instructorId, deletedAt: null }, select: { id: true } });
    if (!ins) throw badRequest('El instructor no existe');
  }

  let warnings: string[] = [];
  if (instructorId) {
    const conflicts = await findConflicts(instructorId, d.startAt, d.endAt);
    if (conflicts.length && force !== 'true') {
      throw new AppError(409, 'El instructor ya tiene un evento en ese horario. Repite con ?force=true para programarlo de todos modos.', 'EVENT_CONFLICT', { conflicts });
    }
    warnings = await availabilityWarnings(instructorId, d.startAt, d.endAt);
  }

  const meetingUrl = d.meetingUrl || null;
  const participantIds = [...new Set(d.participantIds ?? [])];
  const ev = await prisma.event.create({
    data: {
      title: d.title, description: d.description || null, type: d.type, courseId: d.courseId ?? null, groupId: d.groupId ?? null, instructorId,
      startAt: d.startAt, endAt: d.endAt, location: d.location || null, meetingUrl, meetingProvider: detectMeetingProvider(meetingUrl),
      recordingUrl: d.recordingUrl || null, isPublic: d.isPublic, reminderMinutes: d.reminderMinutes ?? 60, createdById: ctx.me,
      participants: participantIds.length ? { create: participantIds.map((userId) => ({ userId })) } : undefined,
    },
    include: eventInclude,
  });

  const to = await recipients(ev, [...participantIds, ...(instructorId ? [instructorId] : [])], [ctx.me]);
  await notify(to, { type: 'EVENT', title: `Nuevo evento: ${ev.title}`, body: `${fmt(ev.startAt)}${ev.location ? ' · ' + ev.location : ''}`, link: '/campus/calendario', email: true });
  await audit(req, 'event.create', 'event', ev.id, { title: ev.title, courseId: ev.courseId, instructorId, forced: force === 'true' });
  res.status(201).json({ data: shape(ev, ctx, req), warnings });
});

r.patch('/events/:id', async (req, res) => {
  const id = idParam(req);
  const d = body(req, patchSchema);
  const { force } = query(req, forceQuery);
  const ctx = await loadCtx(req);
  const cur = await loadEvent(id);
  if (!canManageEvent(req, ctx, cur)) throw forbidden('No puedes modificar este evento');

  const startAt = d.startAt ?? cur.startAt;
  const endAt = d.endAt ?? cur.endAt;
  if (endAt <= startAt) throw badRequest('La hora de fin debe ser posterior al inicio');
  const courseId = d.courseId === undefined ? cur.courseId : d.courseId;
  const groupId = d.groupId === undefined ? cur.groupId : d.groupId;
  const instructorId = d.instructorId === undefined ? cur.instructorId : d.instructorId;
  if (!ctx.admin) {
    if (courseId !== cur.courseId && courseId && !ctx.taught.has(courseId)) throw forbidden('Solo puedes programar eventos en tus cursos');
    if (instructorId !== cur.instructorId && instructorId !== ctx.me) throw forbidden('No puedes reasignar el instructor');
  }
  await validateRefs(courseId, groupId, d.participantIds);

  let warnings: string[] = [];
  if (instructorId) {
    const timeChanged = d.startAt || d.endAt || instructorId !== cur.instructorId;
    if (timeChanged) {
      const conflicts = await findConflicts(instructorId, startAt, endAt, id);
      if (conflicts.length && force !== 'true') {
        throw new AppError(409, 'El instructor ya tiene un evento en ese horario. Repite con ?force=true para guardarlo de todos modos.', 'EVENT_CONFLICT', { conflicts });
      }
      warnings = await availabilityWarnings(instructorId, startAt, endAt);
    }
  }

  const meetingUrl = nz(d.meetingUrl);
  const participantIds = d.participantIds ? [...new Set(d.participantIds)] : undefined;
  await prisma.$transaction(async (tx) => {
    await tx.event.update({
      where: { id },
      data: {
        title: d.title, description: nz(d.description), type: d.type, courseId, groupId, instructorId, startAt: d.startAt, endAt: d.endAt,
        location: nz(d.location), meetingUrl, meetingProvider: meetingUrl === undefined ? undefined : detectMeetingProvider(meetingUrl),
        recordingUrl: nz(d.recordingUrl), isPublic: d.isPublic, reminderMinutes: d.reminderMinutes,
        // Si cambia el horario, el recordatorio debe volver a enviarse
        ...(d.startAt ? { reminderSentAt: null } : {}),
      },
    });
    if (participantIds) {
      await tx.eventParticipant.deleteMany({ where: { eventId: id } });
      if (participantIds.length) await tx.eventParticipant.createMany({ data: participantIds.map((userId) => ({ eventId: id, userId })) });
    }
  });
  const ev = await loadEvent(id);

  if (d.startAt || d.endAt || meetingUrl !== undefined || d.location !== undefined) {
    const pids = (await prisma.eventParticipant.findMany({ where: { eventId: id }, select: { userId: true } })).map((p) => p.userId);
    const to = await recipients(ev, [...pids, ...(ev.instructorId ? [ev.instructorId] : [])], [ctx.me]);
    await notify(to, { type: 'EVENT', title: `Evento actualizado: ${ev.title}`, body: `${fmt(ev.startAt)}${ev.location ? ' · ' + ev.location : ''}`, link: '/campus/calendario', email: true });
  }
  await audit(req, 'event.update', 'event', id, { fields: Object.keys(d) });
  res.json({ data: shape(ev, ctx, req), warnings });
});

r.delete('/events/:id', async (req, res) => {
  const id = idParam(req);
  const ctx = await loadCtx(req);
  const ev = await loadEvent(id);
  if (!canManageEvent(req, ctx, ev)) throw forbidden('No puedes eliminar este evento');
  const pids = (await prisma.eventParticipant.findMany({ where: { eventId: id }, select: { userId: true } })).map((p) => p.userId);
  const to = await recipients(ev, [...pids, ...(ev.instructorId ? [ev.instructorId] : [])], [ctx.me]);
  await prisma.event.delete({ where: { id } });
  if (ev.endAt > new Date()) await notify(to, { type: 'EVENT', title: `Evento cancelado: ${ev.title}`, body: fmt(ev.startAt), link: '/campus/calendario', email: true });
  await audit(req, 'event.delete', 'event', id, { title: ev.title, courseId: ev.courseId });
  res.json({ ok: true });
});

// ───────── Asistencia ─────────
/** Persona a evaluar en un evento: inscritos del curso (filtrados por grupo) + participantes. */
async function loadRoster(ev: { id: number; courseId: number | null; groupId: number | null }) {
  const users = new Map<number, { user: Prisma.UserGetPayload<{ select: typeof userBrief }>; source: 'enrollment' | 'participant' }>();
  if (ev.courseId) {
    const enr = await prisma.enrollment.findMany({
      where: { courseId: ev.courseId, status: { in: ['ACTIVE', 'COMPLETED'] }, ...(ev.groupId ? { groupId: ev.groupId } : {}) },
      select: { user: { select: userBrief } },
      orderBy: { user: { lastName: 'asc' } },
    });
    enr.forEach((e) => users.set(e.user.id, { user: e.user, source: 'enrollment' }));
  }
  const parts = await prisma.eventParticipant.findMany({ where: { eventId: ev.id }, select: { user: { select: userBrief } } });
  parts.forEach((p) => { if (!users.has(p.user.id)) users.set(p.user.id, { user: p.user, source: 'participant' }); });
  return users;
}

r.get('/events/:id/attendance', async (req, res) => {
  const id = idParam(req);
  const ctx = await loadCtx(req);
  const ev = await loadEvent(id);
  if (!isEventStaff(req, ctx, ev)) throw forbidden('Solo el personal del curso puede ver la asistencia');
  const [roster, records] = await Promise.all([loadRoster(ev), prisma.attendance.findMany({ where: { eventId: id } })]);
  const rec = new Map(records.map((a) => [a.userId, a]));
  const data = [...roster.values()].map(({ user, source }) => ({
    user, source, status: rec.get(user.id)?.status ?? null, notes: rec.get(user.id)?.notes ?? null, recordedAt: rec.get(user.id)?.recordedAt ?? null,
  }));
  res.json({ event: { id: ev.id, title: ev.title, type: ev.type, startAt: ev.startAt, endAt: ev.endAt, course: ev.course, group: ev.group }, data });
});

const attendanceSchema = z.object({
  records: z.array(z.object({ userId: zId, status: z.enum(ATT_STATUS), notes: z.string().trim().max(500).nullish() })).min(1, 'Envía al menos un registro').max(500),
});

r.put('/events/:id/attendance', async (req, res) => {
  const id = idParam(req);
  const { records } = body(req, attendanceSchema);
  const ctx = await loadCtx(req);
  const ev = await loadEvent(id);
  if (!isEventStaff(req, ctx, ev)) throw forbidden('Solo el personal del curso puede registrar asistencia');
  const roster = await loadRoster(ev);
  const bad = records.filter((x) => !roster.has(x.userId));
  if (bad.length) throw badRequest('Algunos usuarios no pertenecen a este evento', { userIds: bad.map((b) => b.userId) });

  // Si un usuario aparece repetido, prevalece el último registro
  const unique = [...new Map(records.map((x) => [x.userId, x])).values()];
  await prisma.$transaction(
    unique.map((x) =>
      prisma.attendance.upsert({
        where: { eventId_userId: { eventId: id, userId: x.userId } },
        create: { eventId: id, userId: x.userId, status: x.status, notes: x.notes || null, recordedById: ctx.me },
        update: { status: x.status, notes: x.notes || null, recordedById: ctx.me, recordedAt: new Date() },
      }),
    ),
  );
  for (const x of unique) {
    if (x.status === 'PRESENT' || x.status === 'LATE') await awardPoints(x.userId, 'ATTENDANCE_PRESENT', { type: 'event', id });
    if (ev.courseId) await recalcEnrollment(x.userId, ev.courseId);
  }
  await audit(req, 'attendance.record', 'event', id, { count: unique.length });
  res.json({ ok: true, saved: unique.length });
});

function summarize(statuses: string[]) {
  const s = { present: 0, late: 0, absent: 0, excused: 0 };
  for (const st of statuses) {
    if (st === 'PRESENT') s.present++;
    else if (st === 'LATE') s.late++;
    else if (st === 'ABSENT') s.absent++;
    else if (st === 'EXCUSED') s.excused++;
  }
  return { ...s, total: statuses.length, pct: statuses.length ? Math.round(((s.present + s.late) / statuses.length) * 100) : 0 };
}

r.get('/attendance/me', async (req, res) => {
  const rows = await prisma.attendance.findMany({
    where: { userId: req.user!.id },
    orderBy: { event: { startAt: 'desc' } },
    take: 500,
    select: { status: true, notes: true, recordedAt: true, event: { select: { id: true, title: true, type: true, startAt: true, endAt: true, course: { select: { id: true, title: true } } } } },
  });
  res.json({ data: rows, summary: summarize(rows.map((x) => x.status)) });
});

r.get('/attendance/course/:courseId', async (req, res) => {
  const courseId = idParam(req, 'courseId');
  await assertCourseStaff(req, courseId);
  const now = new Date();
  const [events, enrollments] = await Promise.all([
    prisma.event.findMany({ where: { courseId, startAt: { lte: now } }, orderBy: { startAt: 'asc' }, select: { id: true, title: true, type: true, startAt: true, groupId: true } }),
    prisma.enrollment.findMany({
      where: { courseId, status: { in: ['ACTIVE', 'COMPLETED'] } },
      orderBy: { user: { lastName: 'asc' } },
      select: { id: true, groupId: true, user: { select: userBrief } },
    }),
  ]);
  const records = events.length
    ? await prisma.attendance.findMany({ where: { eventId: { in: events.map((e) => e.id) }, userId: { in: enrollments.map((e) => e.user.id) } }, select: { eventId: true, userId: true, status: true } })
    : [];
  const byKey = new Map(records.map((x) => [`${x.userId}:${x.eventId}`, x.status]));
  const students = enrollments.map((en) => {
    // 'NA' = el evento es de otro grupo y no aplica al estudiante; null = sin registro
    const cells = events.map((ev) => (ev.groupId && ev.groupId !== en.groupId ? 'NA' : (byKey.get(`${en.user.id}:${ev.id}`) ?? null)));
    const applicable = cells.filter((c) => c !== 'NA');
    const recorded = applicable.filter((c): c is NonNullable<typeof c> & string => c !== null);
    const s = summarize(recorded);
    return {
      user: en.user, enrollmentId: en.id, groupId: en.groupId, cells,
      summary: { present: s.present, late: s.late, absent: s.absent, excused: s.excused, pct: applicable.length ? Math.round(((s.present + s.late) / applicable.length) * 100) : 0 },
    };
  });
  res.json({ events, students });
});

// ───────── Disponibilidad ─────────
const timeStr = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Formato HH:MM');

r.get('/availability', async (req, res) => {
  const { instructorId } = query(req, z.object({ instructorId: zId.optional() }));
  const target = instructorId ?? req.user!.id;
  if (target !== req.user!.id && req.user!.role === 'STUDENT') throw forbidden();
  const data = await prisma.instructorAvailability.findMany({
    where: { instructorId: target },
    orderBy: [{ weekday: 'asc' }, { startTime: 'asc' }],
    select: { id: true, weekday: true, startTime: true, endTime: true },
  });
  res.json({ instructorId: target, data });
});

const availSchema = z.object({
  instructorId: zId.optional(),
  slots: z.array(z.object({ weekday: z.coerce.number().int().min(0).max(6), startTime: timeStr, endTime: timeStr }).refine((s) => s.endTime > s.startTime, { message: 'La hora final debe ser posterior a la inicial', path: ['endTime'] })).max(100),
});

r.put('/availability', async (req, res) => {
  const d = body(req, availSchema);
  const target = d.instructorId ?? req.user!.id;
  if (target !== req.user!.id && !(isCalendarAdmin(req) || can(req, 'instructors.manage'))) throw forbidden('Solo puedes editar tu propia disponibilidad');
  if (target === req.user!.id && !can(req, 'calendar.manage') && req.user!.role !== 'INSTRUCTOR') throw forbidden();
  const user = await prisma.user.findFirst({ where: { id: target, deletedAt: null }, select: { id: true } });
  if (!user) throw notFound('Usuario no encontrado');
  await prisma.$transaction([
    prisma.instructorAvailability.deleteMany({ where: { instructorId: target } }),
    prisma.instructorAvailability.createMany({ data: d.slots.map((s) => ({ instructorId: target, weekday: s.weekday, startTime: s.startTime, endTime: s.endTime })) }),
  ]);
  if (target !== req.user!.id) await audit(req, 'availability.update', 'user', target, { slots: d.slots.length });
  const data = await prisma.instructorAvailability.findMany({
    where: { instructorId: target }, orderBy: [{ weekday: 'asc' }, { startTime: 'asc' }], select: { id: true, weekday: true, startTime: true, endTime: true },
  });
  res.json({ instructorId: target, data });
});

// ───────── Feed iCalendar ─────────
const icsEscape = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const icsDate = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
/** Plegado de líneas a 75 octetos (RFC 5545). */
function fold(line: string) {
  const out: string[] = [];
  let cur = '';
  let bytes = 0;
  for (const ch of line) {
    const b = Buffer.byteLength(ch);
    if (bytes + b > (out.length ? 74 : 75)) {
      out.push(cur);
      cur = '';
      bytes = 0;
    }
    cur += ch;
    bytes += b;
  }
  out.push(cur);
  return out.join('\r\n ');
}

r.get('/me.ics', async (req, res) => {
  const ctx = await loadCtx(req);
  const from = new Date();
  const to = new Date(Date.now() + 90 * 86400 * 1000);
  const rows = await prisma.event.findMany({
    where: { AND: [visibleWhere(ctx, true), { endAt: { gte: from } }, { startAt: { lte: to } }] },
    orderBy: { startAt: 'asc' },
    take: 1000,
    include: { course: { select: { id: true, title: true } }, participants: { where: { userId: ctx.me }, select: { userId: true } } },
  });
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//CEHACIS//Campus//ES', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:CEHACIS'];
  const stamp = icsDate(new Date());
  for (const ev of rows) {
    const access = hasAccess(ctx, ev);
    const desc = [ev.course ? `Curso: ${ev.course.title}` : '', ev.description ?? '', access && ev.meetingUrl ? `Enlace: ${ev.meetingUrl}` : ''].filter(Boolean).join('\n');
    lines.push(
      'BEGIN:VEVENT',
      `UID:event-${ev.id}@cehacis`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${icsDate(ev.startAt)}`,
      `DTEND:${icsDate(ev.endAt)}`,
      `SUMMARY:${icsEscape(ev.title)}`,
    );
    if (desc) lines.push(`DESCRIPTION:${icsEscape(desc)}`);
    if (ev.location) lines.push(`LOCATION:${icsEscape(ev.location)}`);
    if (access && ev.meetingUrl) lines.push(`URL:${ev.meetingUrl.replace(/[\r\n]/g, '')}`);
    if (ev.reminderMinutes) lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsEscape(ev.title)}`, `TRIGGER:-PT${ev.reminderMinutes}M`, 'END:VALARM');
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="cehacis.ics"');
  res.send(lines.map(fold).join('\r\n') + '\r\n');
});

export default r;
