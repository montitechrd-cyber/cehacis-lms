import { Prisma, type AssessmentType, type QuestionType } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { badRequest, notFound } from '../../lib/errors.js';
import { awardPoints } from '../../lib/gamification.js';
import { notify } from '../../lib/notify.js';
import { recalcEnrollment, tryCompleteLessons } from '../classroom/classroom.service.js';

export const GRACE_MS = 60_000;
export const NON_PASSING_TYPES: AssessmentType[] = ['DIAGNOSTIC', 'SELF_ASSESSMENT'];

export const num = (v: unknown): number | null => (v == null ? null : Number(v));
export const round2 = (n: number) => Math.round(n * 100) / 100;

export function expiresAt(startedAt: Date, timeLimitMin: number | null): Date | null {
  return timeLimitMin ? new Date(startedAt.getTime() + timeLimitMin * 60_000) : null;
}

export function isExpired(startedAt: Date, timeLimitMin: number | null, now = new Date()): boolean {
  const exp = expiresAt(startedAt, timeLimitMin);
  return !!exp && now.getTime() > exp.getTime() + GRACE_MS;
}

/** PRNG determinista para que el orden barajado de un intento sea estable al reanudarlo. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededShuffle<T>(arr: T[], seed: number): T[] {
  const rnd = mulberry32(seed);
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

// ───────────────────────── Validación de preguntas ─────────────────────────

export interface OptionInput {
  text: string;
  isCorrect?: boolean;
}

/** Valida la coherencia tipo/opciones/escala. Devuelve opciones normalizadas. */
export function validateQuestionShape(type: QuestionType, options: OptionInput[], scaleMax: number | null | undefined) {
  const correct = options.filter((o) => o.isCorrect).length;
  switch (type) {
    case 'MULTIPLE_CHOICE':
      if (options.length < 2) throw badRequest('La opción múltiple requiere al menos 2 opciones');
      if (correct !== 1) throw badRequest('La opción múltiple debe tener exactamente 1 respuesta correcta');
      break;
    case 'MULTIPLE_SELECT':
      if (options.length < 2) throw badRequest('La selección múltiple requiere al menos 2 opciones');
      if (correct < 1) throw badRequest('La selección múltiple debe tener al menos 1 respuesta correcta');
      break;
    case 'TRUE_FALSE':
      if (options.length !== 2) throw badRequest('Verdadero/Falso requiere exactamente 2 opciones');
      if (correct !== 1) throw badRequest('Verdadero/Falso debe tener exactamente 1 respuesta correcta');
      break;
    case 'OPEN':
      if (options.length) throw badRequest('Las preguntas abiertas no llevan opciones');
      break;
    case 'SCALE':
      if (options.length) throw badRequest('Las preguntas de escala no llevan opciones');
      if (!scaleMax || scaleMax < 2 || scaleMax > 10) throw badRequest('La escala debe tener un máximo entre 2 y 10');
      break;
  }
  return options.map((o, i) => ({ text: o.text, isCorrect: type === 'SCALE' || type === 'OPEN' ? false : !!o.isCorrect, order: i }));
}

// ───────────────────────── Calificación automática ─────────────────────────

export interface QuestionWithOptions {
  id: number;
  type: QuestionType;
  points: number;
  scaleMax: number | null;
  competencyId: number | null;
  options: { id: number; isCorrect: boolean }[];
}

export interface RawAnswer {
  questionId: number;
  selectedOptionIds?: number[] | null;
  textAnswer?: string | null;
  scaleValue?: number | null;
}

export interface AutoResult {
  questionId: number;
  isCorrect: boolean | null;
  pointsAwarded: number | null; // null = pendiente de calificación manual
}

export function autoGrade(q: QuestionWithOptions, a: RawAnswer | undefined): AutoResult {
  switch (q.type) {
    case 'MULTIPLE_CHOICE':
    case 'TRUE_FALSE': {
      const sel = a?.selectedOptionIds ?? [];
      const right = q.options.find((o) => o.isCorrect);
      const ok = sel.length === 1 && !!right && sel[0] === right.id;
      return { questionId: q.id, isCorrect: ok, pointsAwarded: ok ? q.points : 0 };
    }
    case 'MULTIPLE_SELECT': {
      const sel = new Set(a?.selectedOptionIds ?? []);
      const right = q.options.filter((o) => o.isCorrect).map((o) => o.id);
      const ok = sel.size === right.length && right.every((id) => sel.has(id));
      return { questionId: q.id, isCorrect: ok, pointsAwarded: ok ? q.points : 0 };
    }
    case 'SCALE':
      return { questionId: q.id, isCorrect: null, pointsAwarded: q.points };
    case 'OPEN':
      return { questionId: q.id, isCorrect: null, pointsAwarded: null };
  }
}

/** Limpia una respuesta cruda contra las preguntas del examen (ids de opciones válidos, escala en rango). */
export function sanitizeAnswer(q: QuestionWithOptions, a: RawAnswer) {
  const valid = new Set(q.options.map((o) => o.id));
  let selected: number[] | null = null;
  if (q.type === 'MULTIPLE_CHOICE' || q.type === 'TRUE_FALSE' || q.type === 'MULTIPLE_SELECT') {
    selected = [...new Set((a.selectedOptionIds ?? []).filter((id) => valid.has(id)))];
    if (q.type !== 'MULTIPLE_SELECT') selected = selected.slice(0, 1);
  }
  let scale: number | null = null;
  if (q.type === 'SCALE' && a.scaleValue != null && q.scaleMax && a.scaleValue >= 1 && a.scaleValue <= q.scaleMax) scale = Math.round(a.scaleValue);
  const text = q.type === 'OPEN' ? (a.textAnswer ?? '').slice(0, 20000) : null;
  return { selectedOptionIds: selected, textAnswer: text, scaleValue: scale };
}

/** Califica y guarda un intento IN_PROGRESS con las respuestas dadas (ya fusionadas con el borrador). */
export async function finalizeSubmission(attemptId: number, merged: Map<number, RawAnswer>) {
  const attempt = await prisma.assessmentAttempt.findUniqueOrThrow({
    where: { id: attemptId },
    include: { assessment: { include: { questions: { orderBy: { order: 'asc' }, include: { options: true } } } } },
  });
  const { assessment } = attempt;
  const questions = assessment.questions;
  let score = 0;
  let maxScore = 0;
  let hasOpen = false;
  const ops = questions.map((q) => {
    const raw = merged.get(q.id) ?? { questionId: q.id };
    const clean = sanitizeAnswer(q, raw);
    const r = autoGrade(q, { ...raw, selectedOptionIds: clean.selectedOptionIds });
    maxScore += q.points;
    if (r.pointsAwarded == null) hasOpen = true;
    else score += r.pointsAwarded;
    const data = {
      selectedOptionIds: clean.selectedOptionIds ?? Prisma.JsonNull,
      textAnswer: clean.textAnswer,
      scaleValue: clean.scaleValue,
      isCorrect: r.isCorrect,
      pointsAwarded: r.pointsAwarded,
    };
    return prisma.attemptAnswer.upsert({
      where: { attemptId_questionId: { attemptId, questionId: q.id } },
      update: data,
      create: { attemptId, questionId: q.id, ...data },
    });
  });
  const percentage = maxScore > 0 ? round2((score / maxScore) * 100) : 0;
  const graded = !hasOpen;
  const passed = graded ? (NON_PASSING_TYPES.includes(assessment.type) ? true : percentage >= assessment.passingScore) : null;
  const results = await prisma.$transaction([
    ...ops,
    prisma.assessmentAttempt.update({
      where: { id: attemptId },
      data: { status: graded ? 'GRADED' : 'SUBMITTED', submittedAt: new Date(), score, maxScore, percentage, passed },
    }),
  ]);
  const updated = results[results.length - 1] as Awaited<ReturnType<typeof prisma.assessmentAttempt.update>>;
  if (graded) await onGraded(attemptId);
  return updated;
}

/** Efectos al quedar un intento GRADED: puntos, competencias, lecciones y matrícula. Nunca lanza. */
export async function onGraded(attemptId: number) {
  try {
    const attempt = await prisma.assessmentAttempt.findUnique({
      where: { id: attemptId },
      include: { assessment: { include: { questions: true } }, answers: true },
    });
    if (!attempt || attempt.status !== 'GRADED') return;
    const { assessment, userId } = attempt;
    const courseId = assessment.courseId;

    if (attempt.passed) await awardPoints(userId, 'ASSESSMENT_PASSED', { type: 'assessment', id: assessment.id });
    if (attempt.percentage != null && Number(attempt.percentage) >= 100) await awardPoints(userId, 'PERFECT_SCORE', { type: 'assessment', id: assessment.id });

    // Competencias (idempotente por intento: se reemplazan los registros previos del mismo intento)
    await prisma.studentCompetency.deleteMany({ where: { userId, sourceRefId: attempt.id, source: { in: ['SELF', 'ASSESSMENT'] }, courseId } });
    const byAnswer = new Map(attempt.answers.map((a) => [a.questionId, a]));
    const rows: { competencyId: number; score: number; source: 'SELF' | 'ASSESSMENT' }[] = [];
    const groups = new Map<number, { got: number; max: number }>();
    for (const q of assessment.questions) {
      if (!q.competencyId) continue;
      const a = byAnswer.get(q.id);
      if (q.type === 'SCALE') {
        if (a?.scaleValue != null && q.scaleMax) rows.push({ competencyId: q.competencyId, score: round2((a.scaleValue / q.scaleMax) * 5), source: 'SELF' });
      } else {
        const g = groups.get(q.competencyId) ?? { got: 0, max: 0 };
        g.got += Number(a?.pointsAwarded ?? 0);
        g.max += q.points;
        groups.set(q.competencyId, g);
      }
    }
    for (const [competencyId, g] of groups) if (g.max > 0) rows.push({ competencyId, score: round2((g.got / g.max) * 5), source: 'ASSESSMENT' });
    if (rows.length) {
      await prisma.studentCompetency.createMany({
        data: rows.map((r) => ({ userId, competencyId: r.competencyId, courseId, score: Math.min(r.score, 99.99), scaleMax: 5, source: r.source, sourceRefId: attempt.id })),
      });
    }

    await tryCompleteLessons(userId, courseId);
    await recalcEnrollment(userId, courseId);
  } catch (e) {
    console.error('[assessments] onGraded', e);
  }
}

export async function notifyGraded(userId: number, assessmentId: number, title: string) {
  await notify(userId, {
    type: 'ASSESSMENT_GRADED',
    title: `Tu evaluación "${title}" fue calificada`,
    link: `/campus/evaluaciones/${assessmentId}`,
  }).catch((e) => console.error('[assessments] notify', e));
}

export async function loadAssessment(id: number) {
  const a = await prisma.assessment.findUnique({ where: { id } });
  if (!a) throw notFound('Evaluación no encontrada');
  return a;
}
