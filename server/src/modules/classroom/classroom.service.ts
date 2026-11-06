import type { CompletionRule, ProgressStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { notFound } from '../../lib/errors.js';
import { awardPoints } from '../../lib/gamification.js';
import { notify } from '../../lib/notify.js';
import { issueCertificateIfEligible } from '../certificates/certificates.service.js';

export type LessonStatus = 'completed' | 'in_progress' | 'available' | 'locked';

export interface OutlineLesson {
  id: number;
  title: string;
  order: number;
  durationMin: number;
  completionRule: CompletionRule;
  status: LessonStatus;
  lockReason: string | null;
  resourceTypes: string[];
}

export interface OutlineModule {
  id: number;
  title: string;
  order: number;
  availableFrom: Date | null;
  lessons: OutlineLesson[];
}

export interface Outline {
  course: { id: number; code: string; title: string; slug: string; enforceSequence: boolean; passingScore: number };
  progressPct: number;
  currentLessonId: number | null;
  modules: OutlineModule[];
  flat: number[];
}

const dateFmt = new Intl.DateTimeFormat('es-DO', { dateStyle: 'long', timeZone: 'America/Santo_Domingo' });

/** Versión interna: además del esquema, devuelve qué lección bloquea a cada lección. */
export async function buildOutline(userId: number, courseId: number, opts: { staff?: boolean } = {}) {
  const staff = !!opts.staff;
  const course = await prisma.course.findFirst({ where: { id: courseId, deletedAt: null } });
  if (!course) throw notFound('Curso no encontrado');

  const modules = await prisma.courseModule.findMany({
    where: { courseId, ...(staff ? {} : { isPublished: true }) },
    orderBy: [{ order: 'asc' }, { id: 'asc' }],
    include: {
      lessons: {
        where: staff ? {} : { isPublished: true },
        orderBy: [{ order: 'asc' }, { id: 'asc' }],
        include: { resources: { select: { type: true } } },
      },
    },
  });

  const lessonIds = modules.flatMap((m) => m.lessons.map((l) => l.id));
  const [progressRows, enrollment] = await Promise.all([
    lessonIds.length ? prisma.lessonProgress.findMany({ where: { userId, lessonId: { in: lessonIds } } }) : Promise.resolve([]),
    prisma.enrollment.findUnique({ where: { userId_courseId: { userId, courseId } }, select: { lastLessonId: true } }),
  ]);
  const progress = new Map<number, ProgressStatus>(progressRows.map((p) => [p.lessonId, p.status]));

  const now = new Date();
  const requires = new Map<number, number | null>();
  const flat: number[] = [];
  const titles = new Map<number, string>();
  let prev: { id: number; title: string } | null = null;

  const outModules: OutlineModule[] = modules.map((m) => ({
    id: m.id,
    title: m.title,
    order: m.order,
    availableFrom: m.availableFrom,
    lessons: m.lessons.map((l) => {
      let lockReason: string | null = null;
      let requiredLessonId: number | null = null;
      if (!staff) {
        const from = [m.availableFrom, l.availableFrom].filter((d): d is Date => !!d && d > now).sort((a, b) => b.getTime() - a.getTime())[0];
        if (from) lockReason = `Disponible el ${dateFmt.format(from)}`;
        else if (course.enforceSequence && prev && progress.get(prev.id) !== 'COMPLETED') {
          lockReason = `Completa «${prev.title}» para desbloquear`;
          requiredLessonId = prev.id;
        }
      }
      const p = progress.get(l.id);
      const status: LessonStatus = p === 'COMPLETED' ? 'completed' : lockReason ? 'locked' : p === 'IN_PROGRESS' ? 'in_progress' : 'available';
      requires.set(l.id, requiredLessonId);
      flat.push(l.id);
      titles.set(l.id, l.title);
      prev = { id: l.id, title: l.title };
      return {
        id: l.id,
        title: l.title,
        order: l.order,
        durationMin: l.durationMin,
        completionRule: l.completionRule,
        status,
        lockReason,
        resourceTypes: [...new Set(l.resources.map((r) => r.type as string))],
      };
    }),
  }));

  const all = outModules.flatMap((m) => m.lessons);
  const publishedCount = all.length;
  const completed = all.filter((l) => l.status === 'completed').length;
  const progressPct = publishedCount ? Math.round((completed / publishedCount) * 100) : 0;
  const byId = new Map(all.map((l) => [l.id, l]));
  const last = enrollment?.lastLessonId ? byId.get(enrollment.lastLessonId) : undefined;
  const firstOpen = all.find((l) => l.status !== 'completed' && l.status !== 'locked');
  const currentLessonId = last && last.status !== 'locked' && last.status !== 'completed' ? last.id : (firstOpen?.id ?? last?.id ?? null);

  const outline: Outline = {
    course: { id: course.id, code: course.code, title: course.title, slug: course.slug, enforceSequence: course.enforceSequence, passingScore: course.passingScore },
    progressPct,
    currentLessonId,
    modules: outModules,
    flat,
  };
  return { outline, requires, byId };
}

export async function computeOutline(userId: number, courseId: number, opts?: { staff?: boolean }): Promise<Outline> {
  return (await buildOutline(userId, courseId, opts)).outline;
}

/** Evalúa si la lección cumple su regla de finalización para el usuario. */
export async function isLessonCompletable(userId: number, lessonId: number): Promise<{ ok: boolean; missing: string[] }> {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { resources: { where: { isRequired: true }, select: { id: true, title: true } }, requiredAssessment: { select: { title: true } }, requiredActivity: { select: { title: true } } },
  });
  if (!lesson) throw notFound('Lección no encontrada');
  const missing: string[] = [];
  switch (lesson.completionRule) {
    case 'VIEW':
    case 'MANUAL':
      break;
    case 'RESOURCES': {
      if (!lesson.resources.length) break;
      const seen = await prisma.resourceProgress.findMany({ where: { userId, resourceId: { in: lesson.resources.map((r) => r.id) } }, select: { resourceId: true } });
      const done = new Set(seen.map((s) => s.resourceId));
      for (const r of lesson.resources) if (!done.has(r.id)) missing.push(`Revisar el recurso «${r.title}»`);
      break;
    }
    case 'ASSESSMENT': {
      if (!lesson.requiredAssessmentId) break; // sin evaluación vinculada: no se bloquea al estudiante
      const ok = await prisma.assessmentAttempt.findFirst({ where: { userId, assessmentId: lesson.requiredAssessmentId, passed: true }, select: { id: true } });
      if (!ok) missing.push(`Aprobar la evaluación «${lesson.requiredAssessment?.title ?? ''}»`);
      break;
    }
    case 'ACTIVITY': {
      if (!lesson.requiredActivityId) break;
      const sub = await prisma.activitySubmission.findFirst({
        // Una entrega devuelta para corregir no cuenta hasta que se reenvíe.
        where: { activityId: lesson.requiredActivityId, status: { not: 'RETURNED' }, OR: [{ userId }, { group: { members: { some: { userId } } } }] },
        select: { id: true },
      });
      if (!sub) missing.push(`Entregar la actividad «${lesson.requiredActivity?.title ?? ''}»`);
      break;
    }
  }
  return { ok: missing.length === 0, missing };
}

/** Marca la lección como completada (idempotente) y otorga puntos. Devuelve true si se completó ahora. */
export async function completeLesson(userId: number, lessonId: number): Promise<boolean> {
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, select: { id: true, moduleId: true } });
  if (!lesson) return false;
  const existing = await prisma.lessonProgress.findUnique({ where: { userId_lessonId: { userId, lessonId } } });
  if (existing?.status === 'COMPLETED') return false;
  const now = new Date();
  await prisma.lessonProgress.upsert({
    where: { userId_lessonId: { userId, lessonId } },
    create: { userId, lessonId, status: 'COMPLETED', completedAt: now },
    update: { status: 'COMPLETED', completedAt: now },
  });
  await awardPoints(userId, 'LESSON_COMPLETED', { type: 'lesson', id: lessonId });
  const pending = await prisma.lesson.count({
    where: { moduleId: lesson.moduleId, isPublished: true, NOT: { progress: { some: { userId, status: 'COMPLETED' } } } },
  });
  if (pending === 0) await awardPoints(userId, 'MODULE_COMPLETED', { type: 'module', id: lesson.moduleId });
  return true;
}

/**
 * Una entrega devuelta para corregir deja de cumplir el requisito: reabre las lecciones que dependían de esa
 * actividad (solo mientras la inscripción siga activa; un curso ya cerrado no se reabre).
 */
export async function reopenActivityLessons(userIds: number[], activityId: number, courseId: number) {
  if (!userIds.length) return;
  const active = await prisma.enrollment.findMany({ where: { courseId, status: 'ACTIVE', userId: { in: userIds } }, select: { userId: true } });
  if (!active.length) return;
  const lessons = await prisma.lesson.findMany({ where: { completionRule: 'ACTIVITY', requiredActivityId: activityId }, select: { id: true } });
  if (!lessons.length) return;
  await prisma.lessonProgress.updateMany({
    where: { userId: { in: active.map((a) => a.userId) }, lessonId: { in: lessons.map((l) => l.id) }, status: 'COMPLETED' },
    data: { status: 'IN_PROGRESS', completedAt: null },
  });
}

/** Reevalúa lecciones con requisito automático (RESOURCES, ASSESSMENT, ACTIVITY) y las completa. */
export async function tryCompleteLessons(userId: number, courseId: number) {
  const enr = await prisma.enrollment.findUnique({ where: { userId_courseId: { userId, courseId } }, select: { id: true } });
  if (!enr) return { completed: [] as number[] };
  const lessons = await prisma.lesson.findMany({
    where: {
      isPublished: true,
      module: { courseId, isPublished: true },
      completionRule: { in: ['RESOURCES', 'ASSESSMENT', 'ACTIVITY'] },
      NOT: { progress: { some: { userId, status: 'COMPLETED' } } },
    },
    select: { id: true, completionRule: true },
  });
  const completed: number[] = [];
  for (const l of lessons) {
    if (l.completionRule === 'RESOURCES') {
      // los recursos solo cuentan si el estudiante ya abrió la lección
      const started = await prisma.lessonProgress.findUnique({ where: { userId_lessonId: { userId, lessonId: l.id } }, select: { id: true } });
      if (!started) continue;
    }
    const r = await isLessonCompletable(userId, l.id);
    if (r.ok && (await completeLesson(userId, l.id))) completed.push(l.id);
  }
  const rec = await recalcEnrollment(userId, courseId);
  return { completed, ...rec };
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const round2 = (n: number) => Math.round(n * 100) / 100;

/** Situación del estudiante frente a los requisitos de finalización del curso (fuente única de verdad). */
export interface CompletionStatus {
  lessons: { completed: number; total: number; met: boolean };
  finals: { id: number; title: string; passingScore: number; attempts: number; bestPercentage: number | null; met: boolean }[];
  grade: { value: number | null; required: number; enforced: boolean; met: boolean };
  attendance: { required: number; attended: number; recorded: number; pendingRecord: number; upcoming: number; pct: number | null; met: boolean };
  eligible: boolean;
}

/**
 * Evalúa los requisitos de finalización:
 * - Lecciones: todas completadas (o, si el curso no lo exige, basta con aprobar la evaluación final).
 * - Evaluaciones finales: cada una aprobada con su propio umbral.
 * - Nota final del curso >= course.passingScore. Ponderada sobre TODAS las evaluaciones con peso
 *   (las no presentadas cuentan 0); sin pesos, promedio de las finales.
 * - Asistencia >= minAttendancePct sobre las sesiones que le corresponden al estudiante; mientras haya
 *   sesiones por celebrarse o sin asistencia registrada, el requisito queda pendiente.
 */
export async function evaluateCompletion(userId: number, courseId: number): Promise<CompletionStatus | null> {
  const enr = await prisma.enrollment.findUnique({ where: { userId_courseId: { userId, courseId } }, include: { course: true } });
  if (!enr) return null;
  const course = enr.course;

  // Lecciones
  const lessonWhere = { isPublished: true, module: { courseId, isPublished: true } };
  const [total, completed] = await Promise.all([
    prisma.lesson.count({ where: lessonWhere }),
    prisma.lessonProgress.count({ where: { userId, status: 'COMPLETED', lesson: lessonWhere } }),
  ]);

  // Evaluaciones
  const assessments = await prisma.assessment.findMany({
    where: { courseId, isPublished: true },
    select: { id: true, title: true, type: true, weight: true, passingScore: true },
    orderBy: { id: 'asc' },
  });
  const attempts = assessments.length
    ? await prisma.assessmentAttempt.findMany({
        where: { userId, assessmentId: { in: assessments.map((a) => a.id) }, status: { not: 'IN_PROGRESS' } },
        select: { assessmentId: true, percentage: true, passed: true },
      })
    : [];
  const best = new Map<number, { pct: number; passed: boolean; count: number }>();
  for (const a of attempts) {
    const cur = best.get(a.assessmentId) ?? { pct: 0, passed: false, count: 0 };
    best.set(a.assessmentId, { pct: Math.max(cur.pct, Number(a.percentage ?? 0)), passed: cur.passed || a.passed === true, count: cur.count + 1 });
  }
  const finalsRaw = assessments.filter((a) => a.type === 'FINAL');
  const finals = finalsRaw.map((a) => {
    const b = best.get(a.id);
    return { id: a.id, title: a.title, passingScore: a.passingScore, attempts: b?.count ?? 0, bestPercentage: b ? b.pct : null, met: !!b?.passed };
  });

  const lessonsMet = (total > 0 && completed >= total) || (!course.requireAllLessons && finals.length > 0);

  // Nota final del curso
  const weighted = assessments.filter((a) => a.weight > 0);
  let value: number | null = null;
  let enforced = false;
  if (weighted.length) {
    const w = weighted.reduce((sum, a) => sum + a.weight, 0);
    value = weighted.reduce((sum, a) => sum + (best.get(a.id)?.pct ?? 0) * a.weight, 0) / w;
    enforced = true;
  } else if (finalsRaw.length) {
    value = avg(finalsRaw.map((a) => best.get(a.id)?.pct ?? 0));
    enforced = true;
  } else {
    value = avg([...best.values()].map((b) => b.pct)); // solo informativa: el curso no tiene componentes calificados
  }
  if (value != null) value = round2(value);
  const gradeMet = !enforced || (value != null && value >= course.passingScore);

  // Asistencia
  const now = new Date();
  const events =
    course.minAttendancePct > 0
      ? await prisma.event.findMany({
          where: { courseId, type: { not: 'DEADLINE' }, endAt: { gte: enr.enrolledAt } },
          select: {
            startAt: true,
            groupId: true,
            participants: { select: { userId: true } },
            attendance: { where: { userId }, select: { status: true } },
          },
        })
      : [];
  const mine = events.filter((e) => {
    if (e.attendance.length) return true; // el personal registró su asistencia: le corresponde
    if (e.participants.length) return e.participants.some((p) => p.userId === userId); // evento dirigido a personas concretas
    return e.groupId == null || e.groupId === enr.groupId;
  });
  const upcoming = mine.filter((e) => e.startAt >= now && !e.attendance.length).length;
  const past = mine.filter((e) => e.startAt < now || e.attendance.length > 0);
  const pendingRecord = past.filter((e) => !e.attendance.length).length;
  const recorded = past.filter((e) => e.attendance.length > 0 && e.attendance[0]!.status !== 'EXCUSED');
  const attended = recorded.filter((e) => e.attendance[0]!.status === 'PRESENT' || e.attendance[0]!.status === 'LATE').length;
  const pct = recorded.length ? Math.round((attended / recorded.length) * 100) : null;
  const attendanceMet =
    course.minAttendancePct <= 0 ||
    mine.length === 0 ||
    (upcoming === 0 && pendingRecord === 0 && (pct == null || pct >= course.minAttendancePct));

  const finalsMet = finals.every((f) => f.met);
  return {
    lessons: { completed, total, met: lessonsMet },
    finals,
    grade: { value, required: course.passingScore, enforced, met: gradeMet },
    attendance: { required: course.minAttendancePct, attended, recorded: recorded.length, pendingRecord, upcoming, pct, met: attendanceMet },
    eligible: lessonsMet && finalsMet && gradeMet && attendanceMet,
  };
}

/** Recalcula progreso del curso y lo cierra (COMPLETED + certificado) si se cumplen todos los criterios. */
export async function recalcEnrollment(userId: number, courseId: number): Promise<{ progressPct: number; courseCompleted: boolean }> {
  const enr = await prisma.enrollment.findUnique({ where: { userId_courseId: { userId, courseId } }, include: { course: true } });
  if (!enr) return { progressPct: 0, courseCompleted: false };

  const lessons = await prisma.lesson.findMany({ where: { isPublished: true, module: { courseId, isPublished: true } }, select: { id: true } });
  const total = lessons.length;
  const done = total
    ? await prisma.lessonProgress.count({ where: { userId, status: 'COMPLETED', lessonId: { in: lessons.map((l) => l.id) } } })
    : 0;
  const progressPct = total ? Math.round((done / total) * 100) : 0;
  if (progressPct !== enr.progressPct) await prisma.enrollment.update({ where: { id: enr.id }, data: { progressPct } });
  if (enr.status !== 'ACTIVE') return { progressPct, courseCompleted: enr.status === 'COMPLETED' };

  const course = enr.course;
  const status = await evaluateCompletion(userId, courseId);
  if (!status || !status.eligible) return { progressPct, courseCompleted: false };
  const lessonsOk = total > 0 && progressPct === 100;
  const finalGrade = status.grade.value;

  const upd = await prisma.enrollment.updateMany({
    where: { id: enr.id, status: 'ACTIVE' },
    data: { status: 'COMPLETED', completedAt: new Date(), progressPct: Math.max(progressPct, lessonsOk ? 100 : progressPct), finalGrade },
  });
  if (upd.count === 0) return { progressPct, courseCompleted: true };

  await awardPoints(userId, 'COURSE_COMPLETED', { type: 'course', id: courseId });
  await notify(userId, { type: 'COURSE_COMPLETED', title: `¡Completaste «${course.title}»!`, body: 'Felicitaciones por terminar el curso.', link: `/campus/cursos/${course.id}`, email: true });
  try {
    await issueCertificateIfEligible(userId, courseId);
  } catch (e) {
    console.error('[classroom] issueCertificateIfEligible', e);
  }
  return { progressPct, courseCompleted: true };
}
