import { Prisma } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { audit } from '../../lib/audit.js';
import { badRequest, conflict, forbidden, notFound } from '../../lib/errors.js';
import { getPage, paged } from '../../lib/pagination.js';
import { prisma } from '../../lib/prisma.js';
import { body, idParam, query, zId, zOptDate, zOptId, zText } from '../../lib/validate.js';
import { assertCourseAccess, assertCourseStaff, can, requireAuth, requirePermission } from '../../middleware/auth.js';
import {
  expiresAt,
  finalizeSubmission,
  isExpired,
  loadAssessment,
  notifyGraded,
  num,
  onGraded,
  round2,
  sanitizeAnswer,
  seededShuffle,
  validateQuestionShape,
  NON_PASSING_TYPES,
  type RawAnswer,
} from './assessments.service.js';

const router = Router();
router.use(requireAuth);
const staff = requirePermission('assessments.manage', 'assessments.grade');

const TYPES = ['QUIZ', 'DIAGNOSTIC', 'SELF_ASSESSMENT', 'FINAL', 'PRACTICAL', 'PEER'] as const;
const QTYPES = ['MULTIPLE_CHOICE', 'MULTIPLE_SELECT', 'TRUE_FALSE', 'OPEN', 'SCALE'] as const;
const userSel = { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } as const;

// ───────────────────────── Esquemas ─────────────────────────

const assessmentFields = {
  lessonId: zOptId,
  title: zText(200).min(1, 'El título es obligatorio'),
  description: zText(10000).nullable().optional(),
  type: z.enum(TYPES),
  timeLimitMin: z.coerce.number().int().min(1).max(1440).nullable().optional(),
  maxAttempts: z.coerce.number().int().min(0).max(100),
  passingScore: z.coerce.number().int().min(0).max(100),
  weight: z.coerce.number().int().min(0).max(100),
  shuffle: z.boolean(),
  showResults: z.boolean(),
  isPublished: z.boolean(),
  availableFrom: zOptDate,
  availableUntil: zOptDate,
  rubricId: zOptId,
};

const createSchema = z.object({
  courseId: zId,
  ...assessmentFields,
  maxAttempts: assessmentFields.maxAttempts.default(1),
  passingScore: assessmentFields.passingScore.default(70),
  weight: assessmentFields.weight.default(0),
  shuffle: z.boolean().default(false),
  showResults: z.boolean().default(true),
  isPublished: z.boolean().default(true),
  type: assessmentFields.type.default('QUIZ'),
});
const updateSchema = z.object(assessmentFields).partial();

const optionSchema = z.object({ text: zText(500).min(1, 'El texto de la opción es obligatorio'), isCorrect: z.boolean().optional() });
const questionFields = {
  type: z.enum(QTYPES),
  text: zText(10000).min(1, 'El enunciado es obligatorio'),
  explanation: zText(10000).nullable().optional(),
  points: z.coerce.number().int().min(0).max(1000),
  scaleMax: z.coerce.number().int().nullable().optional(),
  competencyId: zOptId,
  options: z.array(optionSchema).max(20),
};
const questionCreateSchema = z.object({ ...questionFields, points: questionFields.points.default(1), options: questionFields.options.default([]) });
const questionUpdateSchema = z.object(questionFields).partial();

const answerItem = z.object({
  questionId: zId,
  selectedOptionIds: z.array(zId).max(50).nullable().optional(),
  textAnswer: z.string().max(20000).nullable().optional(),
  scaleValue: z.coerce.number().int().nullable().optional(),
});
const answersSchema = z.object({ answers: z.array(answerItem).max(500).default([]) });

// ───────────────────────── Utilidades ─────────────────────────

function checkWindow(from?: Date | null, until?: Date | null) {
  if (from && until && from >= until) throw badRequest('La fecha de cierre debe ser posterior a la de apertura');
}

async function checkRefs(courseId: number, lessonId?: number | null, rubricId?: number | null) {
  if (lessonId) {
    const l = await prisma.lesson.findFirst({ where: { id: lessonId, module: { courseId } }, select: { id: true } });
    if (!l) throw badRequest('La lección no pertenece al curso');
  }
  if (rubricId) {
    const r = await prisma.rubric.findUnique({ where: { id: rubricId }, select: { id: true } });
    if (!r) throw badRequest('La rúbrica no existe');
  }
}

async function checkCompetency(id?: number | null) {
  if (id && !(await prisma.competency.findUnique({ where: { id }, select: { id: true } }))) throw badRequest('La competencia no existe');
}

async function staffAssessment(req: Parameters<typeof assertCourseStaff>[0], id: number) {
  const a = await loadAssessment(id);
  await assertCourseStaff(req, a.courseId);
  return a;
}

function assessmentOut(a: Record<string, any>) {
  return { ...a };
}

async function attemptsInfo(assessmentId: number, userId: number) {
  return prisma.assessmentAttempt.findMany({
    where: { assessmentId, userId },
    orderBy: { startedAt: 'asc' },
    select: { id: true, status: true, percentage: true, passed: true, submittedAt: true, startedAt: true },
  });
}

/** Preguntas para el estudiante, sin isCorrect. */
async function studentQuestions(assessment: { id: number; shuffle: boolean }, attemptId: number) {
  const qs = await prisma.question.findMany({ where: { assessmentId: assessment.id }, orderBy: { order: 'asc' }, include: { options: { orderBy: { order: 'asc' } } } });
  const list = assessment.shuffle ? seededShuffle(qs, attemptId) : qs;
  return list.map((q) => ({
    id: q.id,
    type: q.type,
    text: q.text,
    points: q.points,
    scaleMax: q.scaleMax,
    options: (assessment.shuffle ? seededShuffle(q.options, attemptId * 31 + q.id) : q.options).map((o) => ({ id: o.id, text: o.text })),
  }));
}

function toRawMap(items: { questionId: number; selectedOptionIds?: unknown; textAnswer?: string | null; scaleValue?: number | null }[]) {
  const m = new Map<number, RawAnswer>();
  for (const a of items) {
    m.set(a.questionId, {
      questionId: a.questionId,
      selectedOptionIds: Array.isArray(a.selectedOptionIds) ? (a.selectedOptionIds as number[]) : null,
      textAnswer: a.textAnswer ?? null,
      scaleValue: a.scaleValue ?? null,
    });
  }
  return m;
}

async function ownAttempt(req: Parameters<typeof assertCourseStaff>[0], attemptId: number) {
  const attempt = await prisma.assessmentAttempt.findUnique({ where: { id: attemptId }, include: { assessment: true } });
  if (!attempt || attempt.userId !== req.user!.id) throw notFound('Intento no encontrado');
  return attempt;
}

// ───────────────────────── Estudiante (rutas fijas primero) ─────────────────────────

router.get('/me/grades', async (req, res) => {
  const userId = req.user!.id;
  const enrollments = await prisma.enrollment.findMany({
    where: { userId, status: { in: ['ACTIVE', 'COMPLETED'] } },
    include: { course: { select: { id: true, title: true, slug: true, imageUrl: true } } },
    orderBy: { enrolledAt: 'desc' },
  });
  const courseIds = enrollments.map((e) => e.courseId);
  const [assessments, attempts] = await Promise.all([
    prisma.assessment.findMany({ where: { courseId: { in: courseIds }, isPublished: true }, orderBy: { id: 'asc' } }),
    prisma.assessmentAttempt.findMany({ where: { userId, assessment: { courseId: { in: courseIds } } }, orderBy: { startedAt: 'asc' } }),
  ]);
  const data = enrollments.map((e) => ({
    course: e.course,
    enrollmentStatus: e.status,
    progressPct: e.progressPct,
    finalGrade: num(e.finalGrade),
    assessments: assessments
      .filter((a) => a.courseId === e.courseId)
      .map((a) => {
        const mine = attempts.filter((t) => t.assessmentId === a.id);
        const graded = mine.filter((t) => t.status === 'GRADED');
        const best = graded.reduce<(typeof graded)[number] | null>((b, t) => (!b || Number(t.percentage) > Number(b.percentage) ? t : b), null);
        const status = best ? 'GRADED' : mine.some((t) => t.status === 'SUBMITTED') ? 'SUBMITTED' : mine.some((t) => t.status === 'IN_PROGRESS') ? 'IN_PROGRESS' : 'NOT_STARTED';
        return {
          id: a.id,
          title: a.title,
          type: a.type,
          weight: a.weight,
          passingScore: a.passingScore,
          maxAttempts: a.maxAttempts,
          attemptsUsed: mine.length,
          status,
          bestAttemptId: best?.id ?? null,
          bestPercentage: num(best?.percentage),
          passed: best ? best.passed : null,
          pendingGrading: mine.some((t) => t.status === 'SUBMITTED'),
        };
      }),
  }));
  res.json({ data });
});

router.get('/courses/:courseId/gradebook', staff, async (req, res) => {
  const courseId = idParam(req, 'courseId');
  await assertCourseStaff(req, courseId);
  const [assessments, activities, enrollments] = await Promise.all([
    prisma.assessment.findMany({ where: { courseId }, orderBy: { id: 'asc' }, select: { id: true, title: true, type: true, weight: true } }),
    prisma.practicalActivity.findMany({ where: { courseId }, orderBy: { id: 'asc' }, select: { id: true, title: true, maxScore: true } }),
    prisma.enrollment.findMany({
      where: { courseId, status: { in: ['ACTIVE', 'COMPLETED'] } },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
      orderBy: { user: { lastName: 'asc' } },
    }),
  ]);
  const userIds = enrollments.map((e) => e.userId);
  const [best, subs] = await Promise.all([
    prisma.assessmentAttempt.groupBy({
      by: ['assessmentId', 'userId'],
      where: { assessment: { courseId }, userId: { in: userIds }, status: 'GRADED' },
      _max: { percentage: true },
    }),
    prisma.activitySubmission.findMany({
      where: { activity: { courseId }, userId: { in: userIds }, status: 'GRADED', score: { not: null } },
      orderBy: { submittedAt: 'asc' },
      select: { activityId: true, userId: true, score: true },
    }),
  ]);
  const bestMap = new Map(best.map((b) => [`${b.userId}:${b.assessmentId}`, num(b._max.percentage)]));
  const subMap = new Map(subs.map((s) => [`${s.userId}:${s.activityId}`, num(s.score)]));
  const rows = enrollments.map((e) => {
    const cells: Record<string, number | null> = {};
    for (const a of assessments) cells['a' + a.id] = bestMap.get(`${e.userId}:${a.id}`) ?? null;
    for (const a of activities) cells['act' + a.id] = subMap.get(`${e.userId}:${a.id}`) ?? null;
    return { user: e.user, enrollmentStatus: e.status, progressPct: e.progressPct, finalGrade: num(e.finalGrade), cells };
  });
  res.json({ assessments, activities, rows });
});

// ───────────────────────── Intentos (por id de intento) ─────────────────────────

router.get('/attempts/:attemptId', staff, async (req, res) => {
  const id = idParam(req, 'attemptId');
  const attempt = await prisma.assessmentAttempt.findUnique({
    where: { id },
    include: {
      user: { select: userSel },
      gradedBy: { select: userSel },
      assessment: true,
      answers: { include: { question: { include: { options: { orderBy: { order: 'asc' } } } } } },
    },
  });
  if (!attempt) throw notFound('Intento no encontrado');
  await assertCourseStaff(req, attempt.assessment.courseId);
  const answers = attempt.answers
    .sort((a, b) => a.question.order - b.question.order || a.question.id - b.question.id)
    .map((a) => ({
      id: a.id,
      selectedOptionIds: a.selectedOptionIds,
      textAnswer: a.textAnswer,
      scaleValue: a.scaleValue,
      isCorrect: a.isCorrect,
      pointsAwarded: num(a.pointsAwarded),
      feedback: a.feedback,
      question: {
        id: a.question.id,
        type: a.question.type,
        text: a.question.text,
        explanation: a.question.explanation,
        points: a.question.points,
        scaleMax: a.question.scaleMax,
        competencyId: a.question.competencyId,
        options: a.question.options.map((o) => ({ id: o.id, text: o.text, isCorrect: o.isCorrect })),
      },
    }));
  res.json({
    attempt: {
      id: attempt.id,
      assessmentId: attempt.assessmentId,
      status: attempt.status,
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,
      score: num(attempt.score),
      maxScore: num(attempt.maxScore),
      percentage: num(attempt.percentage),
      passed: attempt.passed,
      feedback: attempt.feedback,
      user: attempt.user,
      gradedBy: attempt.gradedBy,
    },
    assessment: {
      id: attempt.assessment.id,
      title: attempt.assessment.title,
      type: attempt.assessment.type,
      passingScore: attempt.assessment.passingScore,
      rubricId: attempt.assessment.rubricId,
      courseId: attempt.assessment.courseId,
    },
    answers,
  });
});

router.post('/attempts/:attemptId/grade', staff, async (req, res) => {
  const id = idParam(req, 'attemptId');
  const input = body(
    req,
    z.object({
      answers: z.array(z.object({ answerId: zId, pointsAwarded: z.coerce.number().min(0), feedback: zText(5000).nullable().optional() })).max(500).default([]),
      feedback: zText(10000).nullable().optional(),
    }),
  );
  const attempt = await prisma.assessmentAttempt.findUnique({
    where: { id },
    include: { assessment: { include: { questions: true } }, answers: true },
  });
  if (!attempt) throw notFound('Intento no encontrado');
  await assertCourseStaff(req, attempt.assessment.courseId);
  if (attempt.status === 'IN_PROGRESS') throw conflict('El estudiante aún no ha enviado este intento');

  const qMap = new Map(attempt.assessment.questions.map((q) => [q.id, q]));
  const ansMap = new Map(attempt.answers.map((a) => [a.id, a]));
  const points = new Map<number, number>(attempt.answers.map((a) => [a.id, Number(a.pointsAwarded ?? NaN)]));
  const updates: { id: number; points: number; feedback?: string | null }[] = [];
  for (const item of input.answers) {
    const a = ansMap.get(item.answerId);
    if (!a) throw badRequest(`La respuesta ${item.answerId} no pertenece a este intento`);
    const max = qMap.get(a.questionId)!.points;
    if (item.pointsAwarded > max) throw badRequest(`Los puntos no pueden superar ${max} en la respuesta ${item.answerId}`);
    points.set(a.id, round2(item.pointsAwarded));
    updates.push({ id: a.id, points: round2(item.pointsAwarded), feedback: item.feedback });
  }
  const pending = attempt.answers.filter((a) => qMap.get(a.questionId)!.type === 'OPEN' && Number.isNaN(points.get(a.id)!));
  if (pending.length) throw badRequest('Faltan por calificar respuestas abiertas', { answerIds: pending.map((a) => a.id) });

  const score = round2([...points.values()].reduce((s, v) => s + (Number.isNaN(v) ? 0 : v), 0));
  const maxScore = attempt.assessment.questions.reduce((s, q) => s + q.points, 0);
  const percentage = maxScore > 0 ? round2((score / maxScore) * 100) : 0;
  const passed = NON_PASSING_TYPES.includes(attempt.assessment.type) ? true : percentage >= attempt.assessment.passingScore;

  await prisma.$transaction([
    ...updates.map((u) =>
      prisma.attemptAnswer.update({
        where: { id: u.id },
        data: { pointsAwarded: u.points, ...(u.feedback !== undefined ? { feedback: u.feedback } : {}) },
      }),
    ),
    prisma.assessmentAttempt.update({
      where: { id },
      data: {
        status: 'GRADED',
        score,
        maxScore,
        percentage,
        passed,
        gradedById: req.user!.id,
        ...(input.feedback !== undefined ? { feedback: input.feedback } : {}),
      },
    }),
  ]);
  await audit(req, 'assessment.grade', 'AssessmentAttempt', id, { score, percentage, passed });
  await onGraded(id);
  await notifyGraded(attempt.userId, attempt.assessmentId, attempt.assessment.title);
  res.json({ attempt: { id, status: 'GRADED', score, maxScore, percentage, passed, gradedById: req.user!.id } });
});

router.put('/attempts/:attemptId/answers', async (req, res) => {
  const id = idParam(req, 'attemptId');
  const { answers } = body(req, answersSchema);
  const attempt = await ownAttempt(req, id);
  if (attempt.status !== 'IN_PROGRESS') throw conflict('Este intento ya fue enviado');
  if (isExpired(attempt.startedAt, attempt.assessment.timeLimitMin)) throw conflict('El tiempo del intento ha terminado');
  const qs = await prisma.question.findMany({ where: { assessmentId: attempt.assessmentId }, include: { options: true } });
  const qMap = new Map(qs.map((q) => [q.id, q]));
  const ops = answers.map((a) => {
    const q = qMap.get(a.questionId);
    if (!q) throw badRequest(`La pregunta ${a.questionId} no pertenece a esta evaluación`);
    const c = sanitizeAnswer(q, a as RawAnswer);
    const data = { selectedOptionIds: c.selectedOptionIds ?? Prisma.JsonNull, textAnswer: c.textAnswer, scaleValue: c.scaleValue };
    return prisma.attemptAnswer.upsert({
      where: { attemptId_questionId: { attemptId: id, questionId: q.id } },
      update: data,
      create: { attemptId: id, questionId: q.id, ...data },
    });
  });
  await prisma.$transaction(ops);
  res.json({ saved: ops.length, savedAt: new Date().toISOString() });
});

router.post('/attempts/:attemptId/submit', async (req, res) => {
  const id = idParam(req, 'attemptId');
  const { answers } = body(req, answersSchema);
  const attempt = await ownAttempt(req, id);
  if (attempt.status !== 'IN_PROGRESS') throw conflict('Este intento ya fue enviado');
  const saved = await prisma.attemptAnswer.findMany({ where: { attemptId: id } });
  const merged = toRawMap(saved);
  if (!isExpired(attempt.startedAt, attempt.assessment.timeLimitMin)) {
    const valid = new Set((await prisma.question.findMany({ where: { assessmentId: attempt.assessmentId }, select: { id: true } })).map((q) => q.id));
    for (const a of answers) {
      if (!valid.has(a.questionId)) throw badRequest(`La pregunta ${a.questionId} no pertenece a esta evaluación`);
      merged.set(a.questionId, a as RawAnswer);
    }
  }
  const done = await finalizeSubmission(id, merged);
  res.json({
    attempt: { id: done.id, status: done.status, submittedAt: done.submittedAt, score: num(done.score), maxScore: num(done.maxScore), percentage: num(done.percentage), passed: done.passed },
    pendingManualGrading: done.status === 'SUBMITTED',
  });
});

router.get('/attempts/:attemptId/result', async (req, res) => {
  const id = idParam(req, 'attemptId');
  const attempt = await ownAttempt(req, id);
  if (attempt.status === 'IN_PROGRESS') throw conflict('El intento aún está en curso');
  const a = attempt.assessment;
  const out: Record<string, unknown> = {
    attempt: {
      id: attempt.id,
      status: attempt.status,
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,
      score: num(attempt.score),
      maxScore: num(attempt.maxScore),
      percentage: num(attempt.percentage),
      passed: attempt.passed,
      feedback: attempt.status === 'GRADED' ? attempt.feedback : null,
    },
    assessment: { id: a.id, title: a.title, type: a.type, passingScore: a.passingScore, showResults: a.showResults },
    showResults: a.showResults,
    pendingManualGrading: attempt.status === 'SUBMITTED',
  };
  if (a.showResults) {
    const answers = await prisma.attemptAnswer.findMany({
      where: { attemptId: id },
      include: { question: { include: { options: { orderBy: { order: 'asc' } } } } },
    });
    out.questions = answers
      .sort((x, y) => x.question.order - y.question.order || x.question.id - y.question.id)
      .map((r) => ({
        id: r.question.id,
        type: r.question.type,
        text: r.question.text,
        points: r.question.points,
        scaleMax: r.question.scaleMax,
        options: r.question.options.map((o) => ({ id: o.id, text: o.text, isCorrect: o.isCorrect })),
        selectedOptionIds: r.selectedOptionIds,
        textAnswer: r.textAnswer,
        scaleValue: r.scaleValue,
        isCorrect: r.isCorrect,
        pointsAwarded: num(r.pointsAwarded),
        feedback: r.feedback,
        explanation: r.question.explanation,
      }));
  }
  res.json(out);
});

// ───────────────────────── Preguntas (por id de pregunta) ─────────────────────────

router.patch('/questions/:qid', staff, async (req, res) => {
  const qid = idParam(req, 'qid');
  const input = body(req, questionUpdateSchema);
  const q = await prisma.question.findUnique({ where: { id: qid }, include: { options: { orderBy: { order: 'asc' } }, assessment: true } });
  if (!q) throw notFound('Pregunta no encontrada');
  await assertCourseStaff(req, q.assessment.courseId);

  const type = input.type ?? q.type;
  const noOptions = type === 'OPEN' || type === 'SCALE';
  const replace = input.options !== undefined || (input.type !== undefined && input.type !== q.type && noOptions);
  const options = input.options ?? (noOptions ? [] : q.options.map((o) => ({ text: o.text, isCorrect: o.isCorrect })));
  const scaleMax = type === 'SCALE' ? (input.scaleMax !== undefined ? input.scaleMax : q.scaleMax) : null;
  const normalized = validateQuestionShape(type, options, scaleMax);
  if (input.competencyId !== undefined) await checkCompetency(input.competencyId);

  if (replace && (await prisma.attemptAnswer.count({ where: { questionId: qid } })) > 0) {
    throw conflict('No se pueden reemplazar las opciones: ya existen respuestas de estudiantes a esta pregunta');
  }
  await prisma.$transaction(async (tx) => {
    await tx.question.update({
      where: { id: qid },
      data: {
        type,
        ...(input.text !== undefined ? { text: input.text } : {}),
        ...(input.explanation !== undefined ? { explanation: input.explanation } : {}),
        ...(input.points !== undefined ? { points: input.points } : {}),
        ...(input.competencyId !== undefined ? { competencyId: input.competencyId } : {}),
        scaleMax,
      },
    });
    if (replace) {
      await tx.questionOption.deleteMany({ where: { questionId: qid } });
      if (normalized.length) await tx.questionOption.createMany({ data: normalized.map((o) => ({ ...o, questionId: qid })) });
    }
  });
  await audit(req, 'question.update', 'Question', qid);
  res.json({ data: await questionFull(qid) });
});

router.delete('/questions/:qid', staff, async (req, res) => {
  const qid = idParam(req, 'qid');
  const q = await prisma.question.findUnique({ where: { id: qid }, include: { assessment: true } });
  if (!q) throw notFound('Pregunta no encontrada');
  await assertCourseStaff(req, q.assessment.courseId);
  if ((await prisma.attemptAnswer.count({ where: { questionId: qid } })) > 0 && !(can(req, 'courses.manage') && req.query.force === 'true')) {
    throw conflict('La pregunta ya tiene respuestas de estudiantes');
  }
  await prisma.question.delete({ where: { id: qid } });
  await audit(req, 'question.delete', 'Question', qid, { assessmentId: q.assessmentId });
  res.json({ ok: true });
});

async function questionFull(qid: number) {
  return prisma.question.findUnique({ where: { id: qid }, include: { options: { orderBy: { order: 'asc' }, select: { id: true, text: true, isCorrect: true, order: true } } } });
}

// ───────────────────────── Gestión de evaluaciones ─────────────────────────

router.get('/', staff, async (req, res) => {
  const { courseId } = query(req, z.object({ courseId: zId }));
  await assertCourseStaff(req, courseId);
  const rows = await prisma.assessment.findMany({
    where: { courseId },
    orderBy: { id: 'asc' },
    include: { _count: { select: { questions: true, attempts: true } } },
  });
  res.json({
    data: rows.map(({ _count, ...a }) => ({ ...a, questionCount: _count.questions, attemptCount: _count.attempts })),
  });
});

router.post('/', staff, async (req, res) => {
  const input = body(req, createSchema);
  await assertCourseStaff(req, input.courseId);
  checkWindow(input.availableFrom, input.availableUntil);
  await checkRefs(input.courseId, input.lessonId, input.rubricId);
  const created = await prisma.assessment.create({ data: input });
  await audit(req, 'assessment.create', 'Assessment', created.id, { courseId: created.courseId, title: created.title });
  res.status(201).json({ data: created });
});

router.get('/:id', staff, async (req, res) => {
  const id = idParam(req);
  const a = await staffAssessment(req, id);
  const [questions, attempts] = await Promise.all([
    prisma.question.findMany({
      where: { assessmentId: id },
      orderBy: [{ order: 'asc' }, { id: 'asc' }],
      include: { options: { orderBy: { order: 'asc' }, select: { id: true, text: true, isCorrect: true, order: true } } },
    }),
    prisma.assessmentAttempt.count({ where: { assessmentId: id } }),
  ]);
  res.json({ data: { ...assessmentOut(a), attemptCount: attempts, questions } });
});

router.patch('/:id', staff, async (req, res) => {
  const id = idParam(req);
  const a = await staffAssessment(req, id);
  const input = body(req, updateSchema);
  checkWindow(input.availableFrom !== undefined ? input.availableFrom : a.availableFrom, input.availableUntil !== undefined ? input.availableUntil : a.availableUntil);
  await checkRefs(a.courseId, input.lessonId, input.rubricId);
  const updated = await prisma.assessment.update({ where: { id }, data: input });
  await audit(req, 'assessment.update', 'Assessment', id, { fields: Object.keys(input) });
  res.json({ data: updated });
});

router.delete('/:id', staff, async (req, res) => {
  const id = idParam(req);
  const a = await staffAssessment(req, id);
  const attempts = await prisma.assessmentAttempt.count({ where: { assessmentId: id } });
  if (attempts > 0) {
    if (req.query.force !== 'true') throw conflict(`La evaluación tiene ${attempts} intento(s) registrado(s). Despublícala o usa force=true`);
    if (!can(req, 'courses.manage')) throw forbidden('Solo un administrador puede forzar el borrado de una evaluación con intentos');
  }
  await prisma.assessment.delete({ where: { id } });
  await audit(req, 'assessment.delete', 'Assessment', id, { title: a.title, attempts, forced: attempts > 0 });
  res.json({ ok: true });
});

router.post('/:id/questions', staff, async (req, res) => {
  const id = idParam(req);
  await staffAssessment(req, id);
  const input = body(req, questionCreateSchema);
  const scaleMax = input.type === 'SCALE' ? input.scaleMax : null;
  const opts = validateQuestionShape(input.type, input.options, scaleMax);
  await checkCompetency(input.competencyId);
  const last = await prisma.question.aggregate({ where: { assessmentId: id }, _max: { order: true } });
  const q = await prisma.question.create({
    data: {
      assessmentId: id,
      type: input.type,
      text: input.text,
      explanation: input.explanation ?? null,
      points: input.points,
      scaleMax,
      competencyId: input.competencyId ?? null,
      order: (last._max.order ?? -1) + 1,
      options: { create: opts },
    },
  });
  await audit(req, 'question.create', 'Question', q.id, { assessmentId: id, type: q.type });
  res.status(201).json({ data: await questionFull(q.id) });
});

router.put('/:id/questions/order', staff, async (req, res) => {
  const id = idParam(req);
  await staffAssessment(req, id);
  const { ids } = body(req, z.object({ ids: z.array(zId).min(1).max(500) }));
  const existing = await prisma.question.findMany({ where: { assessmentId: id }, select: { id: true } });
  const set = new Set(existing.map((q) => q.id));
  if (ids.length !== set.size || new Set(ids).size !== ids.length || !ids.every((x) => set.has(x))) {
    throw badRequest('La lista debe contener exactamente todas las preguntas de la evaluación, sin repetir');
  }
  await prisma.$transaction(ids.map((qid, i) => prisma.question.update({ where: { id: qid }, data: { order: i } })));
  await audit(req, 'question.reorder', 'Assessment', id);
  res.json({ ok: true, ids });
});

router.get('/:id/attempts', staff, async (req, res) => {
  const id = idParam(req);
  await staffAssessment(req, id);
  const p = getPage(req);
  const status = z.enum(['IN_PROGRESS', 'SUBMITTED', 'GRADED']).optional().parse(req.query.status || undefined);
  const where = {
    assessmentId: id,
    ...(status ? { status } : {}),
    ...(p.search
      ? { user: { OR: [{ firstName: { contains: p.search } }, { lastName: { contains: p.search } }, { email: { contains: p.search } }] } }
      : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.assessmentAttempt.findMany({ where, orderBy: { startedAt: p.order }, skip: p.skip, take: p.take, include: { user: { select: userSel } } }),
    prisma.assessmentAttempt.count({ where }),
  ]);
  res.json(
    paged(
      rows.map((t) => ({
        id: t.id,
        user: t.user,
        status: t.status,
        startedAt: t.startedAt,
        submittedAt: t.submittedAt,
        score: num(t.score),
        maxScore: num(t.maxScore),
        percentage: num(t.percentage),
        passed: t.passed,
        gradedById: t.gradedById,
      })),
      total,
      p,
    ),
  );
});

// ───────────────────────── Estudiante: resumen e inicio ─────────────────────────

router.get('/:id/overview', async (req, res) => {
  const id = idParam(req);
  const a = await loadAssessment(id);
  await assertCourseAccess(req, a.courseId);
  if (!a.isPublished) throw notFound('Evaluación no encontrada');
  const [attempts, questionCount] = await Promise.all([attemptsInfo(id, req.user!.id), prisma.question.count({ where: { assessmentId: id } })]);
  const inProgress = attempts.find((t) => t.status === 'IN_PROGRESS') ?? null;
  const unlimited = a.maxAttempts === 0;
  const remaining = unlimited ? null : Math.max(0, a.maxAttempts - attempts.length);
  const now = new Date();
  let reason: string | null = null;
  if (questionCount === 0) reason = 'La evaluación aún no tiene preguntas';
  else if (!inProgress && a.availableFrom && a.availableFrom > now) reason = 'La evaluación aún no está disponible';
  else if (!inProgress && a.availableUntil && a.availableUntil < now) reason = 'El plazo de la evaluación ha finalizado';
  else if (!inProgress && remaining === 0) reason = 'Has agotado el número de intentos';
  res.json({
    assessment: {
      id: a.id,
      courseId: a.courseId,
      title: a.title,
      description: a.description,
      type: a.type,
      timeLimitMin: a.timeLimitMin,
      maxAttempts: a.maxAttempts,
      passingScore: a.passingScore,
      questionCount,
      availableFrom: a.availableFrom,
      availableUntil: a.availableUntil,
    },
    attempts: attempts.map((t) => ({ id: t.id, status: t.status, percentage: num(t.percentage), passed: t.passed, submittedAt: t.submittedAt })),
    attemptsRemaining: remaining,
    canStart: reason === null,
    reason,
    inProgressAttemptId: inProgress?.id ?? null,
  });
});

router.post('/:id/attempts', async (req, res) => {
  const id = idParam(req);
  const a = await loadAssessment(id);
  await assertCourseAccess(req, a.courseId);
  if (!a.isPublished) throw notFound('Evaluación no encontrada');
  const userId = req.user!.id;

  let current = await prisma.assessmentAttempt.findFirst({ where: { assessmentId: id, userId, status: 'IN_PROGRESS' } });
  if (current && isExpired(current.startedAt, a.timeLimitMin)) {
    // Intento vencido: se envía con lo guardado y se continúa evaluando si puede iniciar otro.
    const saved = await prisma.attemptAnswer.findMany({ where: { attemptId: current.id } });
    await finalizeSubmission(current.id, toRawMap(saved));
    current = null;
  }
  if (current) {
    const saved = await prisma.attemptAnswer.findMany({ where: { attemptId: current.id } });
    res.json({
      attempt: { id: current.id, startedAt: current.startedAt, expiresAt: expiresAt(current.startedAt, a.timeLimitMin) },
      questions: await studentQuestions(a, current.id),
      answers: saved.map((s) => ({ questionId: s.questionId, selectedOptionIds: s.selectedOptionIds, textAnswer: s.textAnswer, scaleValue: s.scaleValue })),
    });
    return;
  }

  const now = new Date();
  if (a.availableFrom && a.availableFrom > now) throw conflict('La evaluación aún no está disponible');
  if (a.availableUntil && a.availableUntil < now) throw conflict('El plazo de la evaluación ha finalizado');
  if (a.maxAttempts > 0 && (await prisma.assessmentAttempt.count({ where: { assessmentId: id, userId } })) >= a.maxAttempts) {
    throw conflict('Has agotado el número de intentos');
  }
  if ((await prisma.question.count({ where: { assessmentId: id } })) === 0) throw conflict('La evaluación aún no tiene preguntas');

  const attempt = await prisma.assessmentAttempt.create({ data: { assessmentId: id, userId } });
  res.status(201).json({
    attempt: { id: attempt.id, startedAt: attempt.startedAt, expiresAt: expiresAt(attempt.startedAt, a.timeLimitMin) },
    questions: await studentQuestions(a, attempt.id),
    answers: [],
  });
});

export default router;
