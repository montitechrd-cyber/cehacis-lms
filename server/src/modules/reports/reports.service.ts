import type { Request } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { badRequest } from '../../lib/errors.js';
import { query } from '../../lib/validate.js';

export interface Range {
  from: Date;
  to: Date;
}

const DAY = 86_400_000;
const r2 = (n: number) => Math.round(n * 100) / 100;
const pct = (num: number, den: number) => (den > 0 ? r2((num / den) * 100) : null);

function parseDate(s: string, endOfDay: boolean): Date {
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) throw badRequest('Fecha inválida');
  if (endOfDay && /^\d{4}-\d{2}-\d{2}$/.test(s)) d.setUTCHours(23, 59, 59, 999);
  return d;
}

const rangeSchema = z.object({ from: z.string().max(40).optional(), to: z.string().max(40).optional() });

/** Rango del dashboard: por defecto los últimos 30 días. */
export function getRange(req: Request): Range {
  const q = query(req, rangeSchema);
  const to = q.to ? parseDate(q.to, true) : new Date();
  const from = q.from ? parseDate(q.from, false) : new Date(to.getTime() - 30 * DAY);
  if (from > to) throw badRequest('La fecha inicial debe ser anterior a la final');
  if (to.getTime() - from.getTime() > 5 * 366 * DAY) throw badRequest('El rango máximo es de 5 años');
  return { from, to };
}

/** Rango opcional para exportaciones: solo se aplica si el usuario lo envía. */
export function getOptionalRange(req: Request): { from?: Date; to?: Date } {
  const q = query(req, rangeSchema);
  const from = q.from ? parseDate(q.from, false) : undefined;
  const to = q.to ? parseDate(q.to, true) : undefined;
  if (from && to && from > to) throw badRequest('La fecha inicial debe ser anterior a la final');
  return { from, to };
}

export const dateFilter = (r: { from?: Date; to?: Date }) => (r.from || r.to ? { gte: r.from, lte: r.to } : undefined);

// ───────── series por día / semana ─────────
const dayKey = (d: Date) => d.toISOString().slice(0, 10);
function weekKey(d: Date) {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dow = (x.getUTCDay() + 6) % 7; // lunes = 0
  x.setUTCDate(x.getUTCDate() - dow);
  return dayKey(x);
}

function makeBuckets(range: Range) {
  const weekly = range.to.getTime() - range.from.getTime() > 92 * DAY;
  const keyOf = weekly ? weekKey : dayKey;
  const keys: string[] = [];
  const step = weekly ? 7 * DAY : DAY;
  let cur = new Date(weekly ? weekKey(range.from) + 'T00:00:00Z' : dayKey(range.from) + 'T00:00:00Z').getTime();
  while (cur <= range.to.getTime()) {
    keys.push(dayKey(new Date(cur)));
    cur += step;
  }
  return { keys, keyOf };
}

function toSeries<T extends 'count' | 'amount'>(range: Range, items: { at: Date; v: number }[], field: T) {
  const { keys, keyOf } = makeBuckets(range);
  const acc = new Map<string, number>(keys.map((k) => [k, 0]));
  for (const it of items) {
    const k = keyOf(it.at);
    if (acc.has(k)) acc.set(k, acc.get(k)! + it.v);
  }
  return keys.map((date) => ({ date, [field]: field === 'amount' ? r2(acc.get(date)!) : acc.get(date)! })) as ({ date: string } & Record<T, number>)[];
}

// ───────── dashboard ─────────
export async function buildDashboard(range: Range, includeRevenue: boolean) {
  const { from, to } = range;
  const inRange = { gte: from, lte: to };
  const notCancelled = { not: 'CANCELLED' as const };
  const studentWhere = { role: { key: 'STUDENT' }, deletedAt: null };

  const [
    totalStudents, loginUsers, viewUsers, totalCourses, publishedCourses, inDevelopmentCourses,
    enrollmentsInRange, enrollmentRows, completionRows, totalEnr, totalCompleted,
    attendanceGroups, reviewAgg, evalAgg,
  ] = await Promise.all([
    prisma.user.count({ where: studentWhere }),
    prisma.user.findMany({ where: { ...studentWhere, lastLoginAt: inRange }, select: { id: true } }),
    prisma.lessonProgress.groupBy({ by: ['userId'], where: { lastViewAt: inRange, user: studentWhere } }),
    prisma.course.count({ where: { deletedAt: null } }),
    prisma.course.count({ where: { deletedAt: null, status: 'PUBLISHED' } }),
    prisma.course.count({ where: { deletedAt: null, status: { in: ['DRAFT', 'IN_DEVELOPMENT'] } } }),
    prisma.enrollment.count({ where: { enrolledAt: inRange, status: notCancelled } }),
    prisma.enrollment.findMany({ where: { enrolledAt: inRange, status: notCancelled }, select: { enrolledAt: true } }),
    prisma.enrollment.findMany({ where: { completedAt: inRange }, select: { completedAt: true } }),
    prisma.enrollment.count({ where: { status: notCancelled } }),
    prisma.enrollment.count({ where: { status: 'COMPLETED' } }),
    prisma.attendance.groupBy({ by: ['status'], where: { event: { startAt: inRange } }, _count: { _all: true } }),
    prisma.courseReview.aggregate({ where: { createdAt: inRange }, _avg: { rating: true }, _count: { _all: true } }),
    prisma.instructorEvaluation.aggregate({ where: { createdAt: inRange }, _avg: { rating: true }, _count: { _all: true } }),
  ]);

  const activeSet = new Set<number>([...loginUsers.map((u) => u.id), ...viewUsers.map((u) => u.userId)]);

  // tasa de aprobación
  const gradedBase = { status: 'GRADED' as const, submittedAt: inRange };
  let apTotal = await prisma.assessmentAttempt.count({ where: { ...gradedBase, assessment: { type: 'FINAL' } } });
  let apPassed = 0;
  if (apTotal > 0) {
    apPassed = await prisma.assessmentAttempt.count({ where: { ...gradedBase, passed: true, assessment: { type: 'FINAL' } } });
  } else {
    const types = { in: ['QUIZ', 'FINAL', 'PRACTICAL'] as ('QUIZ' | 'FINAL' | 'PRACTICAL')[] };
    apTotal = await prisma.assessmentAttempt.count({ where: { ...gradedBase, assessment: { type: types } } });
    if (apTotal > 0) apPassed = await prisma.assessmentAttempt.count({ where: { ...gradedBase, passed: true, assessment: { type: types } } });
  }

  const attTotal = attendanceGroups.reduce((s, g) => s + g._count._all, 0);
  const attOk = attendanceGroups.filter((g) => g.status === 'PRESENT' || g.status === 'LATE').reduce((s, g) => s + g._count._all, 0);

  const satCount = reviewAgg._count._all + evalAgg._count._all;

  // ingresos
  let revenue: Record<string, number> | null = null;
  let pendingPayments: number | null = null;
  let revenueSeries: { date: string; amount: number }[] = [];
  let paidOrders: { id: number; total: unknown; paidAt: Date | null; createdAt: Date; payments: { status: string; isTest: boolean }[] }[] = [];
  if (includeRevenue) {
    paidOrders = await prisma.order.findMany({
      where: { status: 'PAID', paidAt: inRange },
      select: { id: true, total: true, paidAt: true, createdAt: true, payments: { select: { status: true, isTest: true } } },
    });
    pendingPayments = await prisma.order.count({ where: { status: 'PENDING' } });
    let test = 0;
    let real = 0;
    for (const o of paidOrders) {
      const approved = o.payments.filter((p) => p.status === 'APPROVED');
      const isTest = approved.length ? approved.some((p) => p.isTest) : o.payments.some((p) => p.isTest) || o.payments.length === 0;
      if (isTest) test += Number(o.total);
      else real += Number(o.total);
    }
    revenue = { total: r2(test + real), real: r2(real), test: r2(test) };
    revenueSeries = toSeries(range, paidOrders.map((o) => ({ at: o.paidAt ?? o.createdAt, v: Number(o.total) })), 'amount');
  }

  const kpis = {
    totalStudents,
    activeStudents: activeSet.size,
    totalCourses,
    publishedCourses,
    inDevelopmentCourses,
    enrollments: enrollmentsInRange,
    completions: completionRows.length,
    completionRate: pct(totalCompleted, totalEnr),
    approvalRate: pct(apPassed, apTotal),
    attendanceRate: pct(attOk, attTotal),
    revenue: revenue ? revenue.total : null,
    revenueReal: revenue ? revenue.real : null,
    revenueTest: revenue ? revenue.test : null,
    pendingPayments,
    satisfaction: {
      courseAvg: reviewAgg._avg.rating != null ? r2(reviewAgg._avg.rating) : null,
      instructorAvg: evalAgg._avg.rating != null ? r2(evalAgg._avg.rating) : null,
      count: satCount,
    },
  };

  const series = {
    enrollments: toSeries(range, enrollmentRows.map((e) => ({ at: e.enrolledAt, v: 1 })), 'count'),
    revenue: revenueSeries.length || !includeRevenue ? revenueSeries : toSeries(range, [], 'amount'),
    completions: toSeries(range, completionRows.map((e) => ({ at: e.completedAt!, v: 1 })), 'count'),
  };

  const [topCourses, instructorPerformance, competencyAverages] = await Promise.all([
    buildTopCourses(range, includeRevenue),
    buildInstructorPerformance(),
    buildCompetencyAverages(range),
  ]);

  return {
    range: { from: from.toISOString(), to: to.toISOString() },
    kpis,
    series,
    topCourses,
    instructorPerformance,
    competencyAverages,
  };
}

async function buildTopCourses(range: Range, includeRevenue: boolean) {
  const inRange = { gte: range.from, lte: range.to };
  // groupBy con filtro relacional sobre `order` genera un JOIN con columna `total` ambigua en MySQL,
  // así que primero se obtienen los pedidos pagados del rango y se agrupa por sus ids.
  const paidOrderIds = includeRevenue
    ? (await prisma.order.findMany({ where: { status: 'PAID', paidAt: inRange }, select: { id: true } })).map((o) => o.id)
    : [];
  const [enr, comp, rev] = await Promise.all([
    prisma.enrollment.groupBy({ by: ['courseId'], where: { enrolledAt: inRange, status: { not: 'CANCELLED' } }, _count: { _all: true } }),
    prisma.enrollment.groupBy({ by: ['courseId'], where: { completedAt: inRange }, _count: { _all: true } }),
    paidOrderIds.length
      ? prisma.orderItem.groupBy({ by: ['courseId'], where: { courseId: { not: null }, orderId: { in: paidOrderIds } }, _sum: { total: true } })
      : Promise.resolve([] as { courseId: number | null; _sum: { total: unknown } }[]),
  ]);
  const map = new Map<number, { enrollments: number; completions: number; revenue: number }>();
  const get = (id: number) => {
    if (!map.has(id)) map.set(id, { enrollments: 0, completions: 0, revenue: 0 });
    return map.get(id)!;
  };
  enr.forEach((e) => (get(e.courseId).enrollments = e._count._all));
  comp.forEach((e) => (get(e.courseId).completions = e._count._all));
  rev.forEach((e) => e.courseId != null && (get(e.courseId).revenue = Number(e._sum.total ?? 0)));
  const top = [...map.entries()].sort((a, b) => b[1].enrollments - a[1].enrollments || b[1].revenue - a[1].revenue).slice(0, 10);
  const courses = await prisma.course.findMany({ where: { id: { in: top.map(([id]) => id) } }, select: { id: true, title: true, code: true } });
  const cm = new Map(courses.map((c) => [c.id, c]));
  return top
    .filter(([id]) => cm.has(id))
    .map(([id, v]) => ({
      course: cm.get(id)!,
      enrollments: v.enrollments,
      completions: v.completions,
      revenue: includeRevenue ? r2(v.revenue) : null,
    }));
}

async function buildInstructorPerformance() {
  const links = await prisma.courseInstructor.findMany({
    where: { instructor: { deletedAt: null }, course: { deletedAt: null } },
    select: { courseId: true, instructor: { select: { id: true, firstName: true, lastName: true } } },
  });
  if (!links.length) return [];
  const courseIds = [...new Set(links.map((l) => l.courseId))];
  const [enrollments, attempts, subs, evals] = await Promise.all([
    prisma.enrollment.findMany({ where: { courseId: { in: courseIds }, status: { not: 'CANCELLED' } }, select: { courseId: true, userId: true, status: true } }),
    prisma.assessmentAttempt.findMany({ where: { status: 'SUBMITTED', assessment: { courseId: { in: courseIds } } }, select: { assessment: { select: { courseId: true } } } }),
    prisma.activitySubmission.findMany({ where: { status: 'SUBMITTED', activity: { courseId: { in: courseIds } } }, select: { activity: { select: { courseId: true } } } }),
    prisma.instructorEvaluation.groupBy({ by: ['instructorId'], _avg: { rating: true } }),
  ]);
  const evalMap = new Map(evals.map((e) => [e.instructorId, e._avg.rating]));
  const byInstr = new Map<number, { instructor: { id: number; firstName: string; lastName: string }; courses: Set<number> }>();
  for (const l of links) {
    if (!byInstr.has(l.instructor.id)) byInstr.set(l.instructor.id, { instructor: l.instructor, courses: new Set() });
    byInstr.get(l.instructor.id)!.courses.add(l.courseId);
  }
  const out = [...byInstr.values()].map(({ instructor, courses }) => {
    const enr = enrollments.filter((e) => courses.has(e.courseId));
    const students = new Set(enr.map((e) => e.userId)).size;
    const completed = enr.filter((e) => e.status === 'COMPLETED').length;
    const pendingGrading =
      attempts.filter((a) => courses.has(a.assessment.courseId)).length + subs.filter((s) => courses.has(s.activity.courseId)).length;
    const rating = evalMap.get(instructor.id);
    return {
      instructor,
      courses: courses.size,
      students,
      avgRating: rating != null ? r2(rating) : null,
      completionRate: pct(completed, enr.length),
      pendingGrading,
    };
  });
  return out.sort((a, b) => b.students - a.students);
}

async function buildCompetencyAverages(range: Range) {
  const rows = await prisma.studentCompetency.findMany({
    where: { isReviewed: true, recordedAt: { gte: range.from, lte: range.to } },
    select: { competencyId: true, score: true, scaleMax: true },
  });
  const acc = new Map<number, { sum: number; n: number }>();
  for (const r of rows) {
    const norm = (Number(r.score) / (r.scaleMax || 5)) * 5; // normalizado a escala 0..5
    const a = acc.get(r.competencyId) ?? { sum: 0, n: 0 };
    a.sum += norm;
    a.n += 1;
    acc.set(r.competencyId, a);
  }
  if (!acc.size) return [];
  const comps = await prisma.competency.findMany({ where: { id: { in: [...acc.keys()] } }, select: { id: true, name: true } });
  return comps
    .map((c) => ({ competency: c, avg: r2(acc.get(c.id)!.sum / acc.get(c.id)!.n), count: acc.get(c.id)!.n }))
    .sort((a, b) => a.avg - b.avg);
}

// ───────── panel del facilitador ─────────
export async function buildInstructorPanel(userId: number) {
  const links = await prisma.courseInstructor.findMany({
    where: { instructorId: userId, course: { deletedAt: null } },
    select: { course: { select: { id: true, title: true, code: true, status: true } } },
  });
  const courses = links.map((l) => l.course);
  const ids = courses.map((c) => c.id);
  const now = new Date();
  if (!ids.length) {
    return { courses: [], pendingGrading: { attempts: 0, submissions: 0, total: 0 }, upcomingSessions: [], attendanceRate: null, rating: { avg: null, count: 0 } };
  }
  const [enr, attempts, subs, upcoming, attGroups, evalAll, evalByCourse] = await Promise.all([
    prisma.enrollment.groupBy({ by: ['courseId'], where: { courseId: { in: ids }, status: { not: 'CANCELLED' } }, _count: { _all: true }, _avg: { progressPct: true } }),
    prisma.assessmentAttempt.findMany({ where: { status: 'SUBMITTED', assessment: { courseId: { in: ids } } }, select: { assessment: { select: { courseId: true } } } }),
    prisma.activitySubmission.findMany({ where: { status: 'SUBMITTED', activity: { courseId: { in: ids } } }, select: { activity: { select: { courseId: true } } } }),
    prisma.event.findMany({
      where: { courseId: { in: ids }, startAt: { gte: now } },
      orderBy: { startAt: 'asc' },
      take: 10,
      select: { id: true, title: true, type: true, startAt: true, endAt: true, location: true, meetingUrl: true, course: { select: { id: true, title: true } } },
    }),
    prisma.attendance.findMany({ where: { event: { courseId: { in: ids } } }, select: { status: true, event: { select: { courseId: true } } } }),
    prisma.instructorEvaluation.aggregate({ where: { instructorId: userId }, _avg: { rating: true }, _count: { _all: true } }),
    prisma.instructorEvaluation.groupBy({ by: ['courseId'], where: { instructorId: userId, courseId: { in: ids } }, _avg: { rating: true }, _count: { _all: true } }),
  ]);
  const okStatus = (s: string) => s === 'PRESENT' || s === 'LATE';
  const rateOf = (rows: { status: string }[]) => pct(rows.filter((r) => okStatus(r.status)).length, rows.length);
  return {
    courses: courses.map((c) => {
      const e = enr.find((x) => x.courseId === c.id);
      const ev = evalByCourse.find((x) => x.courseId === c.id);
      const pa = attempts.filter((a) => a.assessment.courseId === c.id).length;
      const ps = subs.filter((s) => s.activity.courseId === c.id).length;
      return {
        ...c,
        enrolled: e?._count._all ?? 0,
        avgProgress: e?._avg.progressPct != null ? r2(e._avg.progressPct) : 0,
        pendingGrading: pa + ps,
        attendanceRate: rateOf(attGroups.filter((a) => a.event.courseId === c.id)),
        rating: ev?._avg.rating != null ? r2(ev._avg.rating) : null,
      };
    }),
    pendingGrading: { attempts: attempts.length, submissions: subs.length, total: attempts.length + subs.length },
    upcomingSessions: upcoming.map((e) => ({
      id: e.id, title: e.title, type: e.type, startAt: e.startAt, endAt: e.endAt, location: e.location, meetingUrl: e.meetingUrl, course: e.course,
    })),
    attendanceRate: rateOf(attGroups),
    rating: { avg: evalAll._avg.rating != null ? r2(evalAll._avg.rating) : null, count: evalAll._count._all },
  };
}
