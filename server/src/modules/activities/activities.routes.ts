import path from 'node:path';
import { Router } from 'express';
import { z } from 'zod';
import { assertCourseAccess, assertCourseStaff, can, requireAuth, requirePermission } from '../../middleware/auth.js';
import { prisma } from '../../lib/prisma.js';
import { audit } from '../../lib/audit.js';
import { badRequest, conflict, forbidden, notFound } from '../../lib/errors.js';
import { body, idParam, parse, query, zId, zOptDate, zOptId, zText } from '../../lib/validate.js';
import { getPage, paged } from '../../lib/pagination.js';
import { notify } from '../../lib/notify.js';
import { awardPoints } from '../../lib/gamification.js';
import { saveFile, uploader } from '../../lib/upload.js';
import { recordCompetency } from '../competencies/competencies.service.js';
import { rubricOut } from '../competencies/competencies.routes.js';
import {
  SUBMISSION_TYPES,
  TYPE_EXT,
  allowedTypes,
  assertPublished,
  courseInstructorIds,
  discardUploads,
  fileOut,
  groupInclude,
  groupOut,
  isEnrolled,
  loadActivity,
  loadGroup,
  myGroupFor,
  refreshProgress,
  round2,
  submissionStudents,
  userSel,
  validateCriterionScores,
  weightedScore,
} from './activities.service.js';

const r = Router();
r.use(requireAuth);

const manage = requirePermission('activities.manage');
const uname = (u: { firstName: string; lastName: string }) => `${u.firstName} ${u.lastName}`.trim();

const rubricInclude = {
  scale: true,
  criteria: {
    orderBy: { order: 'asc' as const },
    include: { levels: { orderBy: { score: 'asc' as const } }, competency: { select: { id: true, key: true, name: true } } },
  },
};

const activityBase = (a: any) => ({
  id: a.id,
  courseId: a.courseId,
  lessonId: a.lessonId,
  title: a.title,
  description: a.description,
  instructions: a.instructions,
  scenario: a.scenario,
  roles: Array.isArray(a.roles) ? a.roles : [],
  type: a.type,
  submissionTypes: Array.isArray(a.submissionTypes) ? a.submissionTypes : [],
  dueDate: a.dueDate,
  maxScore: a.maxScore,
  rubricId: a.rubricId,
  peerReview: a.peerReview,
  peerReviewsRequired: a.peerReviewsRequired,
  isPublished: a.isPublished,
  createdAt: a.createdAt,
  updatedAt: a.updatedAt,
});

const subOut = (s: any) => ({
  id: s.id,
  activityId: s.activityId,
  userId: s.userId,
  groupId: s.groupId,
  text: s.text,
  linkUrl: s.linkUrl,
  status: s.status,
  score: s.score != null ? Number(s.score) : null,
  submittedAt: s.submittedAt,
  gradedAt: s.gradedAt,
  files: (s.files ?? []).map((f: any) => fileOut(f.file)),
});

// ───────────── Esquemas ─────────────
const rolesSchema = z.array(z.object({ name: z.string().trim().min(1).max(100), brief: zText(2000).default('') })).max(20);
const activityFields = {
  lessonId: zOptId,
  title: z.string().trim().min(2, 'Título requerido').max(200),
  description: zText(10000).nullable().optional(),
  instructions: zText(20000).nullable().optional(),
  scenario: zText(20000).nullable().optional(),
  roles: rolesSchema.optional(),
  type: z.enum(['INDIVIDUAL', 'GROUP', 'ROLE_PLAY', 'NEGOTIATION', 'DIFFICULT_CONVERSATION', 'PUBLIC_SPEAKING', 'CASE_STUDY']).default('INDIVIDUAL'),
  submissionTypes: z.array(z.enum(SUBMISSION_TYPES)).min(1, 'Elige al menos un tipo de entrega').optional(),
  dueDate: zOptDate,
  maxScore: z.coerce.number().int().min(1).max(10000).default(100),
  rubricId: zOptId,
  peerReview: z.boolean().default(false),
  peerReviewsRequired: z.coerce.number().int().min(0).max(20).default(0),
  isPublished: z.boolean().default(true),
  competencyIds: z.array(zId).max(50).optional(),
};
const createSchema = z.object({ courseId: zId, ...activityFields });
const patchSchema = z.object(activityFields).partial();

async function checkRefs(courseId: number, d: { lessonId?: number | null; rubricId?: number | null; competencyIds?: number[] }) {
  if (d.lessonId && !(await prisma.lesson.findFirst({ where: { id: d.lessonId, module: { courseId } }, select: { id: true } })))
    throw badRequest('La lección no pertenece al curso');
  if (d.rubricId && !(await prisma.rubric.findUnique({ where: { id: d.rubricId }, select: { id: true } }))) throw badRequest('La rúbrica indicada no existe');
  const ids = [...new Set(d.competencyIds ?? [])];
  if (ids.length && (await prisma.competency.count({ where: { id: { in: ids } } })) !== ids.length) throw badRequest('Alguna competencia indicada no existe');
}

// ═════════════ ESTUDIANTE (rutas fijas primero) ═════════════

r.get('/me', async (req, res) => {
  const q = query(req, z.object({ courseId: zId.optional() }));
  const uid = req.user!.id;
  const enr = await prisma.enrollment.findMany({
    where: { userId: uid, status: { in: ['ACTIVE', 'COMPLETED'] }, ...(q.courseId ? { courseId: q.courseId } : {}) },
    select: { courseId: true },
  });
  const courseIds = enr.map((e) => e.courseId);
  if (!courseIds.length) return res.json([]);
  const acts = await prisma.practicalActivity.findMany({
    where: { courseId: { in: courseIds }, isPublished: true },
    orderBy: [{ dueDate: { sort: 'asc', nulls: 'last' } }, { id: 'asc' }],
    include: { course: { select: { id: true, title: true } } },
  });
  const myGroups = await prisma.activityGroupMember.findMany({ where: { userId: uid, group: { activityId: { in: acts.map((a) => a.id) } } }, select: { groupId: true, group: { select: { activityId: true } } } });
  const groupIds = myGroups.map((g) => g.groupId);
  const subs = await prisma.activitySubmission.findMany({
    where: { activityId: { in: acts.map((a) => a.id) }, OR: [{ userId: uid }, ...(groupIds.length ? [{ groupId: { in: groupIds } }] : [])] },
    orderBy: { submittedAt: 'desc' },
  });
  res.json(
    acts.map((a) => {
      const s = subs.find((x) => x.activityId === a.id);
      return {
        ...activityBase(a),
        course: a.course,
        mySubmission: s ? { id: s.id, status: s.status, score: s.score != null ? Number(s.score) : null, submittedAt: s.submittedAt, gradedAt: s.gradedAt } : null,
        hasGroup: myGroups.some((g) => g.group.activityId === a.id),
        isOverdue: !!a.dueDate && a.dueDate < new Date() && !s,
      };
    }),
  );
});

r.get('/feedback/me', async (req, res) => {
  const rows = await prisma.feedback.findMany({
    where: { studentId: req.user!.id },
    orderBy: { createdAt: 'desc' },
    include: {
      author: { select: userSel },
      submission: { select: { id: true, activity: { select: { id: true, title: true, maxScore: true, course: { select: { id: true, title: true } } } } } },
      attempt: { select: { id: true, assessment: { select: { id: true, title: true, course: { select: { id: true, title: true } } } } } },
      rubricScores: { include: { criterion: { select: { id: true, title: true, maxScore: true, weight: true } } } },
    },
  });
  res.json(
    rows.map((f) => ({
      id: f.id,
      target: f.target,
      comment: f.comment,
      observations: f.observations,
      recommendations: f.recommendations,
      totalScore: f.totalScore != null ? Number(f.totalScore) : null,
      createdAt: f.createdAt,
      author: f.author,
      course: f.submission?.activity.course ?? f.attempt?.assessment.course ?? null,
      activity: f.submission ? { id: f.submission.activity.id, title: f.submission.activity.title, maxScore: f.submission.activity.maxScore, submissionId: f.submission.id } : null,
      assessment: f.attempt ? { id: f.attempt.assessment.id, title: f.attempt.assessment.title, attemptId: f.attempt.id } : null,
      rubricScores: f.rubricScores.map((s) => ({ id: s.id, criterionId: s.criterionId, criterion: s.criterion, score: Number(s.score), comment: s.comment })),
    })),
  );
});

// ═════════════ CALIFICACIÓN / REVISIÓN POR PARES (rutas /submissions/:sid) ═════════════

const gradeSchema = z.object({
  rubricScores: z.array(z.object({ criterionId: zId, score: z.coerce.number(), comment: zText(5000).nullable().optional() })).max(100).default([]),
  comment: zText(10000).nullable().optional(),
  observations: zText(10000).nullable().optional(),
  recommendations: zText(10000).nullable().optional(),
  score: z.coerce.number().min(0).optional(),
  status: z.enum(['GRADED', 'RETURNED']).default('GRADED'),
});

r.post('/submissions/:sid/grade', manage, async (req, res) => {
  const sid = idParam(req, 'sid');
  const d = body(req, gradeSchema);
  const sub = await prisma.activitySubmission.findUnique({
    where: { id: sid },
    include: { activity: { include: { rubric: { include: { criteria: { orderBy: { order: 'asc' } } } } } } },
  });
  if (!sub) throw notFound('Entrega no encontrada');
  const act = sub.activity;
  await assertCourseStaff(req, act.courseId);
  const criteria = act.rubric?.criteria ?? [];
  let total: number | null;
  if (criteria.length && d.rubricScores.length) {
    validateCriterionScores(criteria, d.rubricScores);
    total = weightedScore(criteria, d.rubricScores, act.maxScore);
  } else if (criteria.length && d.status === 'GRADED') {
    throw badRequest('Califica todos los criterios de la rúbrica', { rubricScores: 'Requerido' });
  } else if (d.score != null) {
    if (d.score > act.maxScore) throw badRequest(`La nota no puede superar ${act.maxScore}`, { score: `Máximo ${act.maxScore}` });
    total = round2(d.score);
  } else if (d.status === 'GRADED') {
    throw badRequest('Indica la nota', { score: 'Requerido' });
  } else {
    total = null;
  }

  const students = await submissionStudents(sub);
  const me = req.user!;
  await prisma.$transaction(async (tx) => {
    await tx.activitySubmission.update({
      where: { id: sid },
      data: { status: d.status, score: total, gradedAt: new Date(), gradedById: me.id },
    });
    for (const studentId of students) {
      await tx.feedback.create({
        data: {
          target: 'SUBMISSION',
          submissionId: sid,
          authorId: me.id,
          studentId,
          comment: d.comment ?? null,
          observations: d.observations ?? null,
          recommendations: d.recommendations ?? null,
          totalScore: total,
          rubricScores: { create: d.rubricScores.map((s) => ({ criterionId: s.criterionId, score: s.score, comment: s.comment ?? null })) },
        },
      });
    }
    if (d.status === 'GRADED' && d.rubricScores.length) {
      // Re-calificar reemplaza los resultados de competencia previos de esta entrega.
      await tx.studentCompetency.deleteMany({ where: { source: 'RUBRIC', sourceRefId: sid, userId: { in: students } } });
    }
  });

  if (d.status === 'GRADED') {
    const byCrit = new Map(criteria.map((c) => [c.id, c]));
    for (const s of d.rubricScores) {
      const c = byCrit.get(s.criterionId);
      if (!c?.competencyId) continue;
      for (const studentId of students) {
        await recordCompetency({
          userId: studentId,
          competencyId: c.competencyId,
          score: round2((s.score / c.maxScore) * 5),
          scaleMax: 5,
          source: 'RUBRIC',
          courseId: act.courseId,
          sourceRefId: sid,
          evaluatorId: me.id,
          notes: s.comment ?? null,
          isReviewed: true,
        });
      }
    }
  }

  await notify(students, {
    type: 'ACTIVITY_GRADED',
    title: d.status === 'GRADED' ? `Calificaron tu entrega: ${act.title}` : `Tu entrega requiere ajustes: ${act.title}`,
    body: total != null ? `Nota: ${total} / ${act.maxScore}` : 'Revisa los comentarios de tu facilitador.',
    link: `/campus/practicas/${act.id}`,
  });
  for (const studentId of students) await refreshProgress(studentId, act.courseId);
  await audit(req, 'activity.grade', 'ActivitySubmission', sid, { status: d.status, score: total, students: students.length });
  res.json({ id: sid, status: d.status, score: total, students });
});

const peerSchema = z.object({
  scores: z.array(z.object({ criterionId: zId, score: z.coerce.number() })).max(100).default([]),
  comment: zText(5000).nullable().optional(),
});

r.post('/submissions/:sid/peer-reviews', async (req, res) => {
  const sid = idParam(req, 'sid');
  const d = body(req, peerSchema);
  const me = req.user!.id;
  const sub = await prisma.activitySubmission.findUnique({
    where: { id: sid },
    include: { activity: { include: { rubric: { include: { criteria: { orderBy: { order: 'asc' } } } } } } },
  });
  if (!sub) throw notFound('Entrega no encontrada');
  const act = sub.activity;
  if (!act.peerReview || !act.isPublished) throw badRequest('Esta actividad no tiene revisión entre pares');
  if (!(await isEnrolled(me, act.courseId))) throw forbidden('No estás inscrito en este curso');
  const owners = await submissionStudents(sub);
  if (owners.includes(me)) throw badRequest('No puedes evaluar tu propia entrega');
  if (await prisma.peerReview.findUnique({ where: { submissionId_reviewerId: { submissionId: sid, reviewerId: me } } })) throw conflict('Ya evaluaste esta entrega');
  const criteria = act.rubric?.criteria ?? [];
  let score: number | null = null;
  if (criteria.length) {
    validateCriterionScores(criteria, d.scores);
    score = weightedScore(criteria, d.scores, act.maxScore);
  } else if (!d.comment?.trim()) {
    throw badRequest('Escribe un comentario para tu compañero', { comment: 'Requerido' });
  }
  const pr = await prisma.peerReview.create({
    data: { submissionId: sid, reviewerId: me, score, scores: d.scores, comment: d.comment ?? null },
  });
  const byCrit = new Map(criteria.map((c) => [c.id, c]));
  for (const s of d.scores) {
    const c = byCrit.get(s.criterionId);
    if (!c?.competencyId) continue;
    for (const studentId of owners) {
      await recordCompetency({
        userId: studentId,
        competencyId: c.competencyId,
        score: round2((s.score / c.maxScore) * 5),
        scaleMax: 5,
        source: 'PEER',
        courseId: act.courseId,
        sourceRefId: sid,
        evaluatorId: null,
        isReviewed: true,
      });
    }
  }
  await awardPoints(me, 'PEER_REVIEW_GIVEN', { type: 'PEER_REVIEW', id: pr.id });
  await audit(req, 'activity.peer_review', 'PeerReview', pr.id, { submissionId: sid });
  res.status(201).json({ id: pr.id, submissionId: sid, score, createdAt: pr.createdAt });
});

// ═════════════ GRUPOS (rutas /groups/:gid) ═════════════

async function validateMembers(activityId: number, courseId: number, userIds: number[], exceptGroupId?: number) {
  const ids = [...new Set(userIds)];
  if (ids.length) {
    const ok = await prisma.enrollment.findMany({ where: { courseId, userId: { in: ids }, status: { in: ['ACTIVE', 'COMPLETED'] } }, select: { userId: true } });
    if (ok.length !== ids.length) throw badRequest('Todos los integrantes deben estar inscritos activamente en el curso');
    const dup = await prisma.activityGroupMember.findFirst({
      where: { userId: { in: ids }, group: { activityId, ...(exceptGroupId ? { id: { not: exceptGroupId } } : {}) } },
    });
    if (dup) throw conflict('Un estudiante ya pertenece a otro grupo de esta actividad');
  }
  return ids;
}

const groupSchema = z.object({ name: z.string().trim().min(1, 'Nombre requerido').max(120), userIds: z.array(zId).max(100).default([]) });

r.patch('/groups/:gid', manage, async (req, res) => {
  const g = await loadGroup(idParam(req, 'gid'));
  await assertCourseStaff(req, g.activity.courseId);
  const d = body(req, groupSchema.partial());
  const ids = d.userIds ? await validateMembers(g.activityId, g.activity.courseId, d.userIds, g.id) : null;
  if (ids && (await prisma.activitySubmission.count({ where: { groupId: g.id } })) > 0) throw conflict('El grupo ya tiene una entrega: no se pueden cambiar sus integrantes');
  await prisma.$transaction(async (tx) => {
    if (d.name) await tx.activityGroup.update({ where: { id: g.id }, data: { name: d.name } });
    if (ids) {
      await tx.activityGroupMember.deleteMany({ where: { groupId: g.id } });
      await tx.activityGroupMember.createMany({ data: ids.map((userId) => ({ groupId: g.id, userId })) });
    }
  });
  await audit(req, 'activity.group.update', 'ActivityGroup', g.id);
  const out = await prisma.activityGroup.findUniqueOrThrow({ where: { id: g.id }, include: groupInclude });
  res.json(groupOut(out));
});

r.delete('/groups/:gid', manage, async (req, res) => {
  const g = await loadGroup(idParam(req, 'gid'));
  await assertCourseStaff(req, g.activity.courseId);
  if ((await prisma.activitySubmission.count({ where: { groupId: g.id } })) > 0) throw conflict('El grupo ya tiene una entrega y no puede eliminarse');
  await prisma.activityGroup.delete({ where: { id: g.id } });
  await audit(req, 'activity.group.delete', 'ActivityGroup', g.id);
  res.json({ ok: true });
});

// ═════════════ GESTIÓN DE ACTIVIDADES ═════════════

r.get('/', manage, async (req, res) => {
  const q = query(req, z.object({ courseId: zId }));
  await assertCourseStaff(req, q.courseId);
  const acts = await prisma.practicalActivity.findMany({
    where: { courseId: q.courseId },
    orderBy: [{ dueDate: { sort: 'asc', nulls: 'last' } }, { id: 'asc' }],
    include: { _count: { select: { groups: true } } },
  });
  const grouped = await prisma.activitySubmission.groupBy({ by: ['activityId', 'status'], where: { activityId: { in: acts.map((a) => a.id) } }, _count: { _all: true } });
  res.json(
    acts.map((a) => {
      const mine = grouped.filter((g) => g.activityId === a.id);
      const count = (s: string) => mine.find((g) => g.status === s)?._count._all ?? 0;
      return {
        ...activityBase(a),
        groupsCount: a._count.groups,
        submissionsCount: mine.reduce((s, g) => s + g._count._all, 0),
        pendingCount: count('SUBMITTED'),
        gradedCount: count('GRADED'),
        returnedCount: count('RETURNED'),
      };
    }),
  );
});

r.post('/', manage, async (req, res) => {
  const d = body(req, createSchema);
  await assertCourseStaff(req, d.courseId);
  await checkRefs(d.courseId, d);
  const a = await prisma.practicalActivity.create({
    data: {
      courseId: d.courseId,
      lessonId: d.lessonId ?? null,
      title: d.title,
      description: d.description ?? null,
      instructions: d.instructions ?? null,
      scenario: d.scenario ?? null,
      roles: d.roles ?? [],
      type: d.type,
      submissionTypes: d.submissionTypes ?? ['FILE', 'TEXT'],
      dueDate: d.dueDate ?? null,
      maxScore: d.maxScore,
      rubricId: d.rubricId ?? null,
      peerReview: d.peerReview,
      peerReviewsRequired: d.peerReview ? d.peerReviewsRequired : 0,
      isPublished: d.isPublished,
      competencies: { create: [...new Set(d.competencyIds ?? [])].map((competencyId) => ({ competencyId })) },
    },
  });
  await audit(req, 'activity.create', 'PracticalActivity', a.id, { courseId: d.courseId });
  res.status(201).json({ ...activityBase(a), competencyIds: d.competencyIds ?? [] });
});

r.get('/:id/student', async (req, res) => {
  const id = idParam(req);
  const uid = req.user!.id;
  const a = await prisma.practicalActivity.findUnique({
    where: { id },
    include: { competencies: { include: { competency: { select: { id: true, key: true, name: true, group: true } } } }, rubric: { include: rubricInclude }, course: { select: { id: true, title: true } } },
  });
  if (!a) throw notFound('Actividad no encontrada');
  await assertCourseAccess(req, a.courseId);
  assertPublished(a, can(req, 'activities.manage'));
  const group = await myGroupFor(id, uid);
  const sub = await prisma.activitySubmission.findFirst({
    where: { activityId: id, OR: [{ userId: uid }, ...(group ? [{ groupId: group.id }] : [])] },
    orderBy: { submittedAt: 'desc' },
    include: { files: { include: { file: true } } },
  });
  const [feedback, reviews, done] = await Promise.all([
    sub
      ? prisma.feedback.findMany({
          where: { submissionId: sub.id, studentId: uid },
          orderBy: { createdAt: 'desc' },
          include: { author: { select: userSel }, rubricScores: { include: { criterion: { select: { id: true, title: true, maxScore: true, weight: true } } } } },
        })
      : [],
    sub ? prisma.peerReview.findMany({ where: { submissionId: sub.id }, orderBy: { createdAt: 'asc' } }) : [],
    a.peerReview ? prisma.peerReview.count({ where: { reviewerId: uid, submission: { activityId: id } } }) : 0,
  ]);
  const overdue = !!a.dueDate && a.dueDate < new Date();
  res.json({
    activity: {
      ...activityBase(a),
      course: a.course,
      submissionTypes: allowedTypes(a),
      competencies: a.competencies.map((c) => c.competency),
      rubric: a.rubric ? rubricOut(a.rubric) : null,
    },
    myGroup: group ? { ...groupOut(group) } : null,
    mySubmission: sub ? subOut(sub) : null,
    canSubmit: sub ? sub.status === 'RETURNED' : !overdue,
    feedback: feedback.map((f) => ({
      id: f.id,
      comment: f.comment,
      observations: f.observations,
      recommendations: f.recommendations,
      totalScore: f.totalScore != null ? Number(f.totalScore) : null,
      createdAt: f.createdAt,
      author: f.author,
      rubricScores: f.rubricScores.map((s) => ({ id: s.id, criterionId: s.criterionId, criterion: s.criterion, score: Number(s.score), comment: s.comment })),
    })),
    peerReviewsReceived: reviews.map((p) => ({
      id: p.id,
      score: p.score != null ? Number(p.score) : null,
      scores: Array.isArray(p.scores) ? p.scores : [],
      comment: p.comment,
      createdAt: p.createdAt,
    })),
    peerReviewsGiven: done,
  });
});

r.get('/:id/peer-queue', async (req, res) => {
  const id = idParam(req);
  const uid = req.user!.id;
  const a = await prisma.practicalActivity.findUnique({ where: { id }, include: { rubric: { include: rubricInclude } } });
  if (!a) throw notFound('Actividad no encontrada');
  if (!a.peerReview || !a.isPublished) throw badRequest('Esta actividad no tiene revisión entre pares');
  if (!(await isEnrolled(uid, a.courseId))) throw forbidden('No estás inscrito en este curso');
  const group = await myGroupFor(id, uid);
  const [given, subs] = await Promise.all([
    prisma.peerReview.count({ where: { reviewerId: uid, submission: { activityId: id } } }),
    prisma.activitySubmission.findMany({
      where: {
        activityId: id,
        userId: { not: uid },
        ...(group ? { OR: [{ groupId: null }, { groupId: { not: group.id } }] } : {}),
        peerReviews: { none: { reviewerId: uid } },
      },
      orderBy: [{ peerReviews: { _count: 'asc' } }, { submittedAt: 'asc' }],
      take: Math.max(1, a.peerReviewsRequired),
      include: { files: { include: { file: true } } },
    }),
  ]);
  res.json({
    required: a.peerReviewsRequired,
    given,
    rubric: a.rubric ? rubricOut(a.rubric) : null,
    maxScore: a.maxScore,
    items: subs.map((s) => ({
      id: s.id,
      text: s.text,
      linkUrl: s.linkUrl,
      submittedAt: s.submittedAt,
      files: s.files.map((f) => fileOut(f.file)),
    })),
  });
});

r.post('/:id/submissions', uploader({ maxMb: 500 }).array('files', 5), async (req, res) => {
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  let ok = false;
  try {
    const id = idParam(req);
    const uid = req.user!.id;
    const a = await loadActivity(id);
    if (!a.isPublished) throw forbidden('Esta actividad aún no está publicada');
    if (!(await isEnrolled(uid, a.courseId))) throw forbidden('No estás inscrito en este curso');
    const f = parse(
      z.object({
        text: z.preprocess((v) => (typeof v === 'string' && !v.trim() ? undefined : v), zText(50000).optional()),
        linkUrl: z.preprocess((v) => (typeof v === 'string' && !v.trim() ? undefined : v), z.string().trim().url('Enlace inválido').max(1000).optional()),
      }),
      req.body ?? {},
    );
    const types = allowedTypes(a);
    if (f.text && !types.includes('TEXT')) throw badRequest('Esta actividad no admite respuesta de texto');
    if (f.linkUrl && !types.includes('LINK')) throw badRequest('Esta actividad no admite enlaces');
    const allowedExt = new Set(types.filter((t): t is 'VIDEO' | 'AUDIO' | 'FILE' => t === 'VIDEO' || t === 'AUDIO' || t === 'FILE').flatMap((t) => TYPE_EXT[t]));
    for (const file of files) {
      const ext = path.extname(file.originalname).toLowerCase();
      if (!allowedExt.has(ext)) throw badRequest(`El archivo "${file.originalname}" no es de un tipo permitido para esta actividad (${types.join(', ')})`);
    }
    if (!f.text && !f.linkUrl && !files.length) throw badRequest('Agrega tu entrega: texto, enlace o archivos');

    const group = a.type === 'GROUP' ? await myGroupFor(id, uid) : null;
    if (a.type === 'GROUP' && !group) throw badRequest('Aún no tienes un grupo asignado para esta actividad');
    const existing = await prisma.activitySubmission.findFirst({
      where: group ? { activityId: id, groupId: group.id } : { activityId: id, userId: uid, groupId: null },
      orderBy: { submittedAt: 'desc' },
    });
    if (existing && existing.status !== 'RETURNED') throw conflict('Ya enviaste esta actividad');
    if (a.dueDate && a.dueDate < new Date() && existing?.status !== 'RETURNED') throw badRequest('La fecha límite de entrega ya venció');

    const saved: Awaited<ReturnType<typeof saveFile>>[] = [];
    for (const file of files) saved.push(await saveFile(file, uid));
    const data = { userId: uid, text: f.text ?? null, linkUrl: f.linkUrl ?? null, status: 'SUBMITTED' as const, score: null, submittedAt: new Date(), gradedAt: null, gradedById: null };
    const sub = await prisma.$transaction(async (tx) => {
      if (existing) {
        await tx.submissionFile.deleteMany({ where: { submissionId: existing.id } });
        await tx.activitySubmission.update({ where: { id: existing.id }, data });
        if (saved.length) await tx.submissionFile.createMany({ data: saved.map((s) => ({ submissionId: existing.id, fileId: s.id })) });
        return existing;
      }
      const created = await tx.activitySubmission.create({ data: { ...data, activityId: id, groupId: group?.id ?? null } });
      if (saved.length) await tx.submissionFile.createMany({ data: saved.map((s) => ({ submissionId: created.id, fileId: s.id })) });
      return created;
    });
    ok = true;

    const members = group ? group.members.map((m) => m.userId) : [uid];
    await awardPoints(uid, 'ACTIVITY_SUBMITTED', { type: 'SUBMISSION', id: sub.id });
    for (const m of members) await refreshProgress(m, a.courseId);
    const instructors = await courseInstructorIds(a.courseId);
    await notify(instructors, {
      type: 'ACTIVITY_SUBMITTED',
      title: `Nueva entrega: ${a.title}`,
      body: `${uname(req.user!)}${group ? ` (${group.name})` : ''} envió su entrega.`,
      link: `/panel/actividades/${a.id}`,
    });
    const full = await prisma.activitySubmission.findUniqueOrThrow({ where: { id: sub.id }, include: { files: { include: { file: true } } } });
    res.status(201).json(subOut(full));
  } finally {
    if (!ok) discardUploads(files);
  }
});

r.post('/:id/groups', manage, async (req, res) => {
  const a = await loadActivity(idParam(req));
  await assertCourseStaff(req, a.courseId);
  const d = body(req, groupSchema);
  const ids = await validateMembers(a.id, a.courseId, d.userIds);
  const g = await prisma.activityGroup.create({
    data: { activityId: a.id, name: d.name, members: { create: ids.map((userId) => ({ userId })) } },
    include: groupInclude,
  });
  await audit(req, 'activity.group.create', 'ActivityGroup', g.id, { activityId: a.id });
  res.status(201).json(groupOut(g));
});

r.post('/:id/groups/auto', manage, async (req, res) => {
  const a = await loadActivity(idParam(req));
  await assertCourseStaff(req, a.courseId);
  const { size } = body(req, z.object({ size: z.coerce.number().int().min(2, 'Mínimo 2 por grupo').max(50) }));
  if ((await prisma.activitySubmission.count({ where: { activityId: a.id, groupId: { not: null } } })) > 0)
    throw conflict('Ya hay entregas de grupo: no se pueden regenerar los grupos');
  const enr = await prisma.enrollment.findMany({ where: { courseId: a.courseId, status: 'ACTIVE' }, select: { userId: true } });
  if (!enr.length) throw badRequest('El curso no tiene estudiantes inscritos activos');
  const ids = enr.map((e) => e.userId);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j]!, ids[i]!];
  }
  const n = Math.max(1, Math.ceil(ids.length / size));
  const buckets: number[][] = Array.from({ length: n }, () => []);
  ids.forEach((uid, i) => buckets[i % n]!.push(uid));
  await prisma.$transaction(async (tx) => {
    await tx.activityGroup.deleteMany({ where: { activityId: a.id } });
    for (const [i, members] of buckets.entries()) {
      await tx.activityGroup.create({ data: { activityId: a.id, name: `Grupo ${i + 1}`, members: { create: members.map((userId) => ({ userId })) } } });
    }
  });
  await audit(req, 'activity.group.auto', 'PracticalActivity', a.id, { size, groups: n });
  const groups = await prisma.activityGroup.findMany({ where: { activityId: a.id }, orderBy: { id: 'asc' }, include: groupInclude });
  res.status(201).json(groups.map(groupOut));
});

r.get('/:id/submissions', manage, async (req, res) => {
  const a = await loadActivity(idParam(req));
  await assertCourseStaff(req, a.courseId);
  const q = query(req, z.object({ status: z.enum(['SUBMITTED', 'GRADED', 'RETURNED']).optional() }));
  const p = getPage(req);
  const where = { activityId: a.id, ...(q.status ? { status: q.status } : {}) };
  const [rows, total] = await Promise.all([
    prisma.activitySubmission.findMany({
      where,
      orderBy: { submittedAt: 'desc' },
      skip: p.skip,
      take: p.take,
      include: {
        user: { select: userSel },
        group: { select: { id: true, name: true } },
        files: { include: { file: true } },
        _count: { select: { feedbacks: true, peerReviews: true } },
      },
    }),
    prisma.activitySubmission.count({ where }),
  ]);
  res.json(
    paged(
      rows.map((s) => ({ ...subOut(s), user: s.user, group: s.group, feedbackCount: s._count.feedbacks, peerReviewCount: s._count.peerReviews })),
      total,
      p,
    ),
  );
});

r.get('/:id', manage, async (req, res) => {
  const id = idParam(req);
  const a = await prisma.practicalActivity.findUnique({
    where: { id },
    include: {
      competencies: { include: { competency: { select: { id: true, key: true, name: true, group: true } } } },
      rubric: { include: rubricInclude },
      groups: { orderBy: { id: 'asc' }, include: groupInclude },
    },
  });
  if (!a) throw notFound('Actividad no encontrada');
  await assertCourseStaff(req, a.courseId);
  res.json({
    ...activityBase(a),
    competencies: a.competencies.map((c) => c.competency),
    competencyIds: a.competencies.map((c) => c.competencyId),
    rubric: a.rubric ? rubricOut(a.rubric) : null,
    groups: a.groups.map(groupOut),
  });
});

r.patch('/:id', manage, async (req, res) => {
  const a = await loadActivity(idParam(req));
  await assertCourseStaff(req, a.courseId);
  const d = body(req, patchSchema);
  await checkRefs(a.courseId, d);
  const { competencyIds, roles, submissionTypes, ...rest } = d;
  const upd = await prisma.$transaction(async (tx) => {
    if (competencyIds) {
      await tx.activityCompetency.deleteMany({ where: { activityId: a.id } });
      await tx.activityCompetency.createMany({ data: [...new Set(competencyIds)].map((competencyId) => ({ activityId: a.id, competencyId })) });
    }
    return tx.practicalActivity.update({
      where: { id: a.id },
      data: {
        ...rest,
        ...(roles !== undefined ? { roles } : {}),
        ...(submissionTypes !== undefined ? { submissionTypes } : {}),
        ...(rest.peerReview === false ? { peerReviewsRequired: 0 } : {}),
      },
    });
  });
  await audit(req, 'activity.update', 'PracticalActivity', a.id);
  res.json(activityBase(upd));
});

r.delete('/:id', manage, async (req, res) => {
  const a = await loadActivity(idParam(req));
  await assertCourseStaff(req, a.courseId);
  if ((await prisma.activitySubmission.count({ where: { activityId: a.id } })) > 0)
    throw conflict('La actividad ya tiene entregas. Despublícala en lugar de eliminarla.');
  await prisma.practicalActivity.delete({ where: { id: a.id } });
  await audit(req, 'activity.delete', 'PracticalActivity', a.id);
  res.json({ ok: true });
});

export default r;
