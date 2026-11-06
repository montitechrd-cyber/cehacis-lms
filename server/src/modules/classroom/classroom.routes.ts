import { Router, type Request } from 'express';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { AppError, badRequest, conflict, forbidden, notFound } from '../../lib/errors.js';
import { body, idParam, query, zId } from '../../lib/validate.js';
import { getPage, paged } from '../../lib/pagination.js';
import { audit } from '../../lib/audit.js';
import { notify } from '../../lib/notify.js';
import { fileUrl } from '../../lib/upload.js';
import { assertCourseAccess, assertCourseStaff, can, requireAuth, requirePermission, taughtCourseIds } from '../../middleware/auth.js';
import { buildOutline, completeLesson, computeOutline, isLessonCompletable, recalcEnrollment } from './classroom.service.js';

const router = Router();
router.use(requireAuth);

const USER_SEL = { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } as const;

async function isStaff(req: Request, courseId: number) {
  try {
    await assertCourseStaff(req, courseId);
    return true;
  } catch {
    return false;
  }
}

/** Carga la lección con su contexto y valida acceso (incluye curso sin publicar y publicación). */
async function loadLessonCtx(req: Request, lessonId: number) {
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, include: { module: { include: { course: true } } } });
  if (!lesson || lesson.module.course.deletedAt) throw notFound('Lección no encontrada');
  const course = lesson.module.course;
  await assertCourseAccess(req, course.id);
  const staff = await isStaff(req, course.id);
  if (!staff) {
    if (course.status === 'DRAFT' || course.status === 'IN_DEVELOPMENT') throw notFound('Lección no encontrada');
    if (!lesson.isPublished || !lesson.module.isPublished) throw notFound('Lección no encontrada');
  }
  return { lesson, course, staff };
}

/** Lanza 423 si la lección está bloqueada para un estudiante. */
async function assertUnlocked(userId: number, courseId: number, lessonId: number, staff: boolean) {
  if (staff) return;
  const { byId, requires } = await buildOutline(userId, courseId, { staff: false });
  const l = byId.get(lessonId);
  if (l?.status === 'locked') throw new AppError(423, l.lockReason ?? 'Lección bloqueada', 'LOCKED', { requiredLessonId: requires.get(lessonId) ?? null });
}

const progressDto = (p: { status: string; completedAt: Date | null; timeSpentSec: number } | null) =>
  p ? { status: p.status, completedAt: p.completedAt, timeSpentSec: p.timeSpentSec } : { status: 'NOT_STARTED', completedAt: null, timeSpentSec: 0 };

async function viewResponse(userId: number, courseId: number, lessonId: number, hasEnrollment: boolean) {
  const progress = await prisma.lessonProgress.findUnique({ where: { userId_lessonId: { userId, lessonId } } });
  const enr = hasEnrollment ? await prisma.enrollment.findUnique({ where: { userId_courseId: { userId, courseId } }, select: { progressPct: true } }) : null;
  return { progress: progressDto(progress), completed: progress?.status === 'COMPLETED', enrollmentProgress: enr?.progressPct ?? 0 };
}

// ───────────────────────── Mis cursos ─────────────────────────

router.get('/my-courses', async (req, res) => {
  const { status } = query(req, z.object({ status: z.enum(['active', 'completed']).optional() }));
  const userId = req.user!.id;
  const statuses = status === 'active' ? ['ACTIVE' as const] : status === 'completed' ? ['COMPLETED' as const] : ['ACTIVE' as const, 'COMPLETED' as const];
  const enrollments = await prisma.enrollment.findMany({
    where: { userId, status: { in: statuses }, course: { deletedAt: null } },
    orderBy: { enrolledAt: 'desc' },
    include: {
      lastLesson: { select: { id: true, title: true } },
      course: {
        include: {
          category: { select: { id: true, name: true, slug: true } },
          instructors: { include: { instructor: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } } },
        },
      },
    },
  });
  const data = await Promise.all(
    enrollments.map(async (e) => {
      let nextLesson: { id: number; title: string } | null = null;
      if (e.status === 'ACTIVE') {
        const { outline } = await buildOutline(userId, e.courseId);
        const next = outline.modules.flatMap((m) => m.lessons).find((l) => l.status !== 'completed' && l.status !== 'locked');
        if (next) nextLesson = { id: next.id, title: next.title };
      }
      const c = e.course;
      return {
        enrollment: { id: e.id, status: e.status, progressPct: e.progressPct, enrolledAt: e.enrolledAt, completedAt: e.completedAt, finalGrade: e.finalGrade == null ? null : Number(e.finalGrade) },
        course: { id: c.id, title: c.title, slug: c.slug, code: c.code, imageUrl: c.imageUrl, level: c.level, modality: c.modality, durationHours: c.durationHours, category: c.category },
        instructors: c.instructors.map((i) => i.instructor),
        lastLesson: e.lastLesson,
        nextLesson,
      };
    }),
  );
  res.json(data);
});

// ───────────────────────── Inscripción ─────────────────────────

router.post('/enroll/:courseId', async (req, res) => {
  const courseId = idParam(req, 'courseId');
  const userId = req.user!.id;
  const course = await prisma.course.findFirst({ where: { id: courseId, deletedAt: null, status: 'PUBLISHED' } });
  if (!course) throw notFound('Curso no disponible');

  const existing = await prisma.enrollment.findUnique({ where: { userId_courseId: { userId, courseId } } });
  if (existing && (existing.status === 'ACTIVE' || existing.status === 'COMPLETED')) throw conflict('Ya estás inscrito en este curso');

  let source: 'FREE' | 'SUBSCRIPTION';
  if (course.isFree || Number(course.price) === 0) source = 'FREE';
  else {
    const sub = await prisma.subscription.findFirst({
      where: { userId, status: 'ACTIVE', currentPeriodEnd: { gt: new Date() }, plan: { includesAll: true } },
      select: { id: true },
    });
    if (!sub) throw new AppError(402, 'Este curso requiere compra', 'PAYMENT_REQUIRED');
    source = 'SUBSCRIPTION';
  }

  if (course.capacity != null) {
    const taken = await prisma.enrollment.count({ where: { courseId, status: { in: ['ACTIVE', 'COMPLETED'] } } });
    if (taken >= course.capacity) throw conflict('El curso alcanzó su cupo máximo');
  }

  const enrollment = existing
    ? await prisma.enrollment.update({ where: { id: existing.id }, data: { status: 'ACTIVE', source, completedAt: null } })
    : await prisma.enrollment.create({ data: { userId, courseId, status: 'ACTIVE', source } }).catch((e: { code?: string }) => {
        if (e?.code === 'P2002') throw conflict('Ya estás inscrito en este curso');
        throw e;
      });
  await notify(userId, { type: 'ENROLLMENT', title: `Te inscribiste en «${course.title}»`, body: 'Ya puedes comenzar a estudiar.', link: `/campus/cursos/${course.id}` });
  res.status(201).json({ enrollment: { id: enrollment.id, status: enrollment.status, source: enrollment.source, progressPct: enrollment.progressPct, enrolledAt: enrollment.enrolledAt } });
});

// ───────────────────────── Navegación ─────────────────────────

router.get('/courses/:courseId/outline', async (req, res) => {
  const courseId = idParam(req, 'courseId');
  await assertCourseAccess(req, courseId);
  const staff = await isStaff(req, courseId);
  if (!staff) {
    const c = await prisma.course.findFirst({ where: { id: courseId, deletedAt: null }, select: { status: true } });
    if (!c || c.status === 'DRAFT' || c.status === 'IN_DEVELOPMENT') throw notFound('Curso no encontrado');
  }
  res.json(await computeOutline(req.user!.id, courseId, { staff }));
});

router.get('/lessons/:lessonId', async (req, res) => {
  const lessonId = idParam(req, 'lessonId');
  const userId = req.user!.id;
  const { lesson, course, staff } = await loadLessonCtx(req, lessonId);
  const { outline, requires, byId } = await buildOutline(userId, course.id, { staff });
  const entry = byId.get(lessonId);
  if (!staff && entry?.status === 'locked') throw new AppError(423, entry.lockReason ?? 'Lección bloqueada', 'LOCKED', { requiredLessonId: requires.get(lessonId) ?? null });

  const resources = await prisma.lessonResource.findMany({
    where: { lessonId },
    orderBy: [{ order: 'asc' }, { id: 'asc' }],
    include: {
      file: true,
      folder: { include: { files: { orderBy: { originalName: 'asc' } } } },
      assessment: true,
      activity: true,
      forum: { select: { id: true, title: true, _count: { select: { threads: true } } } },
      event: true,
    },
  });
  const visible = staff ? resources : resources.filter((r) => (!r.assessment || r.assessment.isPublished) && (!r.activity || r.activity.isPublished));

  const asmIds = visible.map((r) => r.assessmentId).filter((x): x is number => x != null);
  const actIds = visible.map((r) => r.activityId).filter((x): x is number => x != null);
  const [viewedRows, attempts, subs, progress] = await Promise.all([
    prisma.resourceProgress.findMany({ where: { userId, resourceId: { in: visible.map((r) => r.id) } }, select: { resourceId: true } }),
    asmIds.length ? prisma.assessmentAttempt.findMany({ where: { userId, assessmentId: { in: asmIds } }, select: { assessmentId: true, percentage: true, passed: true } }) : Promise.resolve([]),
    actIds.length
      ? prisma.activitySubmission.findMany({
          where: { activityId: { in: actIds }, OR: [{ userId }, { group: { members: { some: { userId } } } }] },
          orderBy: { submittedAt: 'desc' },
          select: { activityId: true, status: true },
        })
      : Promise.resolve([]),
    prisma.lessonProgress.findUnique({ where: { userId_lessonId: { userId, lessonId } } }),
  ]);
  const viewed = new Set(viewedRows.map((v) => v.resourceId));
  const fileDto = (f: { id: number; originalName: string; mimeType: string; size: number }) => ({ id: f.id, originalName: f.originalName, mimeType: f.mimeType, size: f.size, url: fileUrl(f.id) });

  const req2 = await isLessonCompletable(userId, lessonId);
  const idx = outline.flat.indexOf(lessonId);
  const nav = (id: number | undefined) => (id == null ? null : byId.get(id));
  const prevL = nav(outline.flat[idx - 1]);
  const nextL = nav(outline.flat[idx + 1]);

  res.json({
    lesson: {
      id: lesson.id, title: lesson.title, summary: lesson.summary, content: lesson.content, durationMin: lesson.durationMin,
      completionRule: lesson.completionRule, moduleId: lesson.moduleId, moduleTitle: lesson.module.title,
    },
    resources: visible.map((r) => {
      const mine = attempts.filter((a) => a.assessmentId === r.assessmentId);
      const sub = subs.find((s) => s.activityId === r.activityId);
      return {
        id: r.id, type: r.type, title: r.title, description: r.description, url: r.url, isRequired: r.isRequired, isDownloadable: r.isDownloadable,
        viewed: viewed.has(r.id),
        file: r.file ? fileDto(r.file) : null,
        folder: r.folder ? { id: r.folder.id, name: r.folder.name, files: r.folder.files.map(fileDto) } : null,
        assessment: r.assessment
          ? {
              id: r.assessment.id, title: r.assessment.title, type: r.assessment.type, passingScore: r.assessment.passingScore, maxAttempts: r.assessment.maxAttempts,
              attemptsUsed: mine.length,
              bestPercentage: mine.length ? Math.max(...mine.map((a) => Number(a.percentage ?? 0))) : null,
              passed: mine.some((a) => a.passed === true),
            }
          : null,
        activity: r.activity ? { id: r.activity.id, title: r.activity.title, type: r.activity.type, dueDate: r.activity.dueDate, submitted: !!sub, status: sub?.status ?? null } : null,
        forum: r.forum ? { id: r.forum.id, title: r.forum.title, threadCount: r.forum._count.threads } : null,
        event: r.event ? { id: r.event.id, title: r.event.title, startAt: r.event.startAt, endAt: r.event.endAt, meetingUrl: r.event.meetingUrl, recordingUrl: r.event.recordingUrl } : null,
      };
    }),
    progress: { status: progress?.status ?? 'NOT_STARTED', completedAt: progress?.completedAt ?? null },
    requirement: { rule: lesson.completionRule, ok: req2.ok, missing: req2.missing },
    navigation: {
      prev: prevL ? { id: prevL.id, title: prevL.title, locked: prevL.status === 'locked' } : null,
      next: nextL ? { id: nextL.id, title: nextL.title, locked: nextL.status === 'locked', lockReason: nextL.lockReason } : null,
      index: idx + 1,
      total: outline.flat.length,
    },
    course: { id: course.id, title: course.title, slug: course.slug, enforceSequence: course.enforceSequence },
  });
});

// ───────────────────────── Progreso ─────────────────────────

router.post('/lessons/:lessonId/view', async (req, res) => {
  const lessonId = idParam(req, 'lessonId');
  const userId = req.user!.id;
  const { secondsSpent } = body(req, z.object({ secondsSpent: z.coerce.number().int().min(0).max(3600).optional() }));
  const { lesson, course, staff } = await loadLessonCtx(req, lessonId);
  await assertUnlocked(userId, course.id, lessonId, staff);

  const enr = await prisma.enrollment.findUnique({ where: { userId_courseId: { userId, courseId: course.id } } });
  if (!enr || (enr.status !== 'ACTIVE' && enr.status !== 'COMPLETED')) {
    // vista previa del personal: no se registra progreso
    return void res.json({ progress: progressDto(null), completed: false, enrollmentProgress: 0 });
  }
  const secs = secondsSpent ?? 0;
  const now = new Date();
  await prisma.lessonProgress.upsert({
    where: { userId_lessonId: { userId, lessonId } },
    create: { userId, lessonId, status: 'IN_PROGRESS', timeSpentSec: secs },
    update: { lastViewAt: now, timeSpentSec: { increment: secs } },
  });
  await prisma.enrollment.update({ where: { id: enr.id }, data: { lastLessonId: lessonId } });
  if (lesson.completionRule === 'VIEW') await completeLesson(userId, lessonId);
  await recalcEnrollment(userId, course.id);
  res.json(await viewResponse(userId, course.id, lessonId, true));
});

router.post('/resources/:resourceId/view', async (req, res) => {
  const resourceId = idParam(req, 'resourceId');
  const userId = req.user!.id;
  const resource = await prisma.lessonResource.findUnique({ where: { id: resourceId }, select: { id: true, lessonId: true } });
  if (!resource) throw notFound('Recurso no encontrado');
  const { lesson, course, staff } = await loadLessonCtx(req, resource.lessonId);
  await assertUnlocked(userId, course.id, lesson.id, staff);

  const enr = await prisma.enrollment.findUnique({ where: { userId_courseId: { userId, courseId: course.id } } });
  if (!enr || (enr.status !== 'ACTIVE' && enr.status !== 'COMPLETED')) {
    return void res.json({ progress: progressDto(null), completed: false, enrollmentProgress: 0 });
  }
  await prisma.resourceProgress.upsert({ where: { userId_resourceId: { userId, resourceId } }, create: { userId, resourceId }, update: { viewedAt: new Date() } });
  await prisma.lessonProgress.upsert({
    where: { userId_lessonId: { userId, lessonId: lesson.id } },
    create: { userId, lessonId: lesson.id, status: 'IN_PROGRESS' },
    update: { lastViewAt: new Date() },
  });
  if (lesson.completionRule === 'RESOURCES') {
    const r = await isLessonCompletable(userId, lesson.id);
    if (r.ok) await completeLesson(userId, lesson.id);
  }
  await recalcEnrollment(userId, course.id);
  res.json(await viewResponse(userId, course.id, lesson.id, true));
});

router.post('/lessons/:lessonId/complete', async (req, res) => {
  const lessonId = idParam(req, 'lessonId');
  const userId = req.user!.id;
  const { lesson, course, staff } = await loadLessonCtx(req, lessonId);
  await assertUnlocked(userId, course.id, lessonId, staff);
  const enr = await prisma.enrollment.findUnique({ where: { userId_courseId: { userId, courseId: course.id } } });
  if (!enr || (enr.status !== 'ACTIVE' && enr.status !== 'COMPLETED')) throw badRequest('Debes estar inscrito para registrar tu progreso');

  const check = lesson.completionRule === 'MANUAL' ? { ok: true, missing: [] as string[] } : await isLessonCompletable(userId, lessonId);
  if (!check.ok) throw badRequest('Aún no cumples los requisitos para completar esta lección', { missing: check.missing });
  await completeLesson(userId, lessonId);
  const rec = await recalcEnrollment(userId, course.id);

  const { outline, byId } = await buildOutline(userId, course.id);
  const nextId = outline.flat[outline.flat.indexOf(lessonId) + 1];
  const next = nextId != null ? byId.get(nextId) : undefined;
  res.json({
    completed: true,
    enrollmentProgress: rec.progressPct,
    next: next && next.status !== 'locked' ? { id: next.id, title: next.title } : null,
    courseCompleted: rec.courseCompleted,
  });
});

router.get('/courses/:courseId/progress', async (req, res) => {
  const courseId = idParam(req, 'courseId');
  const userId = req.user!.id;
  await assertCourseAccess(req, courseId);
  const [enr, modules, assessments, activities] = await Promise.all([
    prisma.enrollment.findUnique({ where: { userId_courseId: { userId, courseId } } }),
    prisma.courseModule.findMany({
      where: { courseId, isPublished: true },
      orderBy: [{ order: 'asc' }, { id: 'asc' }],
      include: { lessons: { where: { isPublished: true }, select: { id: true } } },
    }),
    prisma.assessment.findMany({ where: { courseId, isPublished: true }, select: { id: true, title: true, type: true, lessonId: true, passingScore: true } }),
    prisma.practicalActivity.findMany({ where: { courseId, isPublished: true }, select: { id: true, title: true, type: true, lessonId: true, dueDate: true, maxScore: true } }),
  ]);
  const lessonIds = modules.flatMap((m) => m.lessons.map((l) => l.id));
  const [prog, attempts, subs] = await Promise.all([
    lessonIds.length ? prisma.lessonProgress.findMany({ where: { userId, lessonId: { in: lessonIds } } }) : Promise.resolve([]),
    assessments.length ? prisma.assessmentAttempt.findMany({ where: { userId, assessmentId: { in: assessments.map((a) => a.id) } }, select: { assessmentId: true, percentage: true, passed: true } }) : Promise.resolve([]),
    activities.length
      ? prisma.activitySubmission.findMany({
          where: { activityId: { in: activities.map((a) => a.id) }, OR: [{ userId }, { group: { members: { some: { userId } } } }] },
          orderBy: { submittedAt: 'desc' },
          select: { activityId: true, status: true, score: true, submittedAt: true },
        })
      : Promise.resolve([]),
  ]);
  const progById = new Map(prog.map((p) => [p.lessonId, p]));
  const lessonModule = new Map<number, number>();
  for (const m of modules) for (const l of m.lessons) lessonModule.set(l.id, m.id);

  const asmDto = (a: (typeof assessments)[number]) => {
    const mine = attempts.filter((t) => t.assessmentId === a.id);
    return {
      id: a.id, title: a.title, type: a.type, passingScore: a.passingScore, attemptsUsed: mine.length,
      bestPercentage: mine.length ? Math.max(...mine.map((t) => Number(t.percentage ?? 0))) : null,
      passed: mine.some((t) => t.passed === true),
    };
  };
  const actDto = (a: (typeof activities)[number]) => {
    const s = subs.find((x) => x.activityId === a.id);
    return { id: a.id, title: a.title, type: a.type, dueDate: a.dueDate, submitted: !!s, status: s?.status ?? null, score: s?.score == null ? null : Number(s.score), maxScore: a.maxScore, submittedAt: s?.submittedAt ?? null };
  };

  const modOut = modules.map((m) => {
    const ps = m.lessons.map((l) => progById.get(l.id));
    return {
      id: m.id, title: m.title, order: m.order,
      lessonsTotal: m.lessons.length,
      lessonsCompleted: ps.filter((p) => p?.status === 'COMPLETED').length,
      timeSpentSec: ps.reduce((s, p) => s + (p?.timeSpentSec ?? 0), 0),
      assessments: assessments.filter((a) => a.lessonId != null && lessonModule.get(a.lessonId) === m.id).map(asmDto),
      activities: activities.filter((a) => a.lessonId != null && lessonModule.get(a.lessonId) === m.id).map(actDto),
    };
  });
  res.json({
    enrollment: enr ? { id: enr.id, status: enr.status, progressPct: enr.progressPct, finalGrade: enr.finalGrade == null ? null : Number(enr.finalGrade), completedAt: enr.completedAt } : null,
    totals: {
      lessonsTotal: lessonIds.length,
      lessonsCompleted: modOut.reduce((s, m) => s + m.lessonsCompleted, 0),
      timeSpentSec: modOut.reduce((s, m) => s + m.timeSpentSec, 0),
    },
    modules: modOut,
    courseLevel: {
      assessments: assessments.filter((a) => a.lessonId == null || !lessonModule.has(a.lessonId)).map(asmDto),
      activities: activities.filter((a) => a.lessonId == null || !lessonModule.has(a.lessonId)).map(actDto),
    },
  });
});

// ───────────────────────── Gestión de inscripciones ─────────────────────────

const manage = requirePermission('students.manage', 'courses.teach');

const enrollmentDto = (e: {
  id: number; status: string; source: string; progressPct: number; finalGrade: Prisma.Decimal | null; enrolledAt: Date; completedAt: Date | null; groupId: number | null;
  user: { id: number; firstName: string; lastName: string; email: string; avatarUrl: string | null };
  group: { id: number; name: string } | null;
  course: { id: number; title: string; slug: string };
}) => ({
  id: e.id, status: e.status, source: e.source, progressPct: e.progressPct, finalGrade: e.finalGrade == null ? null : Number(e.finalGrade),
  enrolledAt: e.enrolledAt, completedAt: e.completedAt, groupId: e.groupId, user: e.user, group: e.group, course: e.course,
});
const enrollInclude = { user: { select: USER_SEL }, group: { select: { id: true, name: true } }, course: { select: { id: true, title: true, slug: true } } } as const;

router.get('/enrollments', manage, async (req, res) => {
  const q = query(req, z.object({ courseId: zId.optional(), status: z.enum(['PENDING_PAYMENT', 'ACTIVE', 'COMPLETED', 'CANCELLED']).optional() }));
  const p = getPage(req);
  const where: Prisma.EnrollmentWhereInput = {};
  if (q.courseId) {
    await assertCourseStaff(req, q.courseId);
    where.courseId = q.courseId;
  } else if (!can(req, 'courses.manage')) {
    where.courseId = { in: await taughtCourseIds(req.user!.id) };
  }
  if (q.status) where.status = q.status;
  if (p.search) {
    where.user = { OR: [{ firstName: { contains: p.search } }, { lastName: { contains: p.search } }, { email: { contains: p.search } }] };
  }
  const [rows, total] = await Promise.all([
    prisma.enrollment.findMany({ where, include: enrollInclude, orderBy: { enrolledAt: 'desc' }, skip: p.skip, take: p.take }),
    prisma.enrollment.count({ where }),
  ]);
  res.json(paged(rows.map(enrollmentDto), total, p));
});

async function assertGroupInCourse(groupId: number, courseId: number) {
  const g = await prisma.courseGroup.findFirst({ where: { id: groupId, courseId }, select: { id: true } });
  if (!g) throw badRequest('El grupo no pertenece a este curso');
}

router.post('/enrollments', manage, async (req, res) => {
  const d = body(req, z.object({ userId: zId, courseId: zId, groupId: zId.nullable().optional() }));
  await assertCourseStaff(req, d.courseId);
  const [course, user] = await Promise.all([
    prisma.course.findFirst({ where: { id: d.courseId, deletedAt: null } }),
    prisma.user.findFirst({ where: { id: d.userId, deletedAt: null }, select: { id: true } }),
  ]);
  if (!course) throw notFound('Curso no encontrado');
  if (!user) throw notFound('Usuario no encontrado');
  if (d.groupId) await assertGroupInCourse(d.groupId, d.courseId);

  const existing = await prisma.enrollment.findUnique({ where: { userId_courseId: { userId: d.userId, courseId: d.courseId } } });
  if (existing && (existing.status === 'ACTIVE' || existing.status === 'COMPLETED')) throw conflict('El estudiante ya está inscrito en este curso');
  const enrollment = existing
    ? await prisma.enrollment.update({ where: { id: existing.id }, data: { status: 'ACTIVE', source: 'ADMIN', groupId: d.groupId ?? null, completedAt: null }, include: enrollInclude })
    : await prisma.enrollment.create({ data: { userId: d.userId, courseId: d.courseId, groupId: d.groupId ?? null, source: 'ADMIN', status: 'ACTIVE' }, include: enrollInclude });
  await audit(req, 'enrollment.create', 'enrollment', enrollment.id, { userId: d.userId, courseId: d.courseId, groupId: d.groupId ?? null });
  await notify(d.userId, { type: 'ENROLLMENT', title: `Fuiste inscrito en «${course.title}»`, body: 'Ya puedes acceder al curso desde tu aula virtual.', link: `/campus/cursos/${course.id}`, email: true });
  res.status(201).json(enrollmentDto(enrollment));
});

router.patch('/enrollments/:id', manage, async (req, res) => {
  const id = idParam(req);
  const d = body(req, z.object({ status: z.enum(['PENDING_PAYMENT', 'ACTIVE', 'COMPLETED', 'CANCELLED']).optional(), groupId: zId.nullable().optional() }));
  const enr = await prisma.enrollment.findUnique({ where: { id } });
  if (!enr) throw notFound('Inscripción no encontrada');
  await assertCourseStaff(req, enr.courseId);
  if (d.groupId) await assertGroupInCourse(d.groupId, enr.courseId);
  const data: Prisma.EnrollmentUncheckedUpdateInput = {};
  if (d.status && d.status !== enr.status) {
    data.status = d.status;
    if (d.status === 'COMPLETED') data.completedAt = enr.completedAt ?? new Date();
    else if (enr.status === 'COMPLETED') data.completedAt = null;
  }
  if (d.groupId !== undefined) data.groupId = d.groupId;
  const updated = await prisma.enrollment.update({ where: { id }, data, include: enrollInclude });
  await audit(req, 'enrollment.update', 'enrollment', id, { before: { status: enr.status, groupId: enr.groupId }, after: { status: updated.status, groupId: updated.groupId } });
  res.json(enrollmentDto(updated));
});

router.delete('/enrollments/:id', requirePermission('courses.manage'), async (req, res) => {
  const id = idParam(req);
  const enr = await prisma.enrollment.findUnique({ where: { id } });
  if (!enr) throw notFound('Inscripción no encontrada');
  if (!can(req, 'courses.manage')) throw forbidden();
  await prisma.enrollment.delete({ where: { id } });
  await audit(req, 'enrollment.delete', 'enrollment', id, { userId: enr.userId, courseId: enr.courseId, status: enr.status });
  res.json({ ok: true });
});

export default router;
