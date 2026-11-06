import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { badRequest, conflict, forbidden, notFound } from '../../lib/errors.js';
import { body, idParam, query, zId } from '../../lib/validate.js';
import { getPage, paged } from '../../lib/pagination.js';
import { audit } from '../../lib/audit.js';
import { notify } from '../../lib/notify.js';
import { awardPoints } from '../../lib/gamification.js';
import { assertCourseAccess, can, isAdmin, requireAuth, requirePermission } from '../../middleware/auth.js';
import { getAi } from '../../integrations/ai/anthropic.js';
import type { ChatTurn } from '../../integrations/ai/provider.js';
import {
  assertCanReview, canReviewStudent, clampScore, DIMENSION_COMPETENCY, DIMENSIONS, DISCLAIMER, EVALUATION_SCHEMA, EVALUATION_SYSTEM,
  htmlToText, MAX_USER_TURNS, msgOut, normalizeEvaluation, requireAi, simulationSystemPrompt, studentIdsOfInstructor, userSelect,
  type DimensionKey, type Evaluation,
} from './ai.service.js';
import { recommend } from './ai.recommendations.js';

const r = Router();
r.use(requireAuth);

const aiLimiter = rateLimit({
  windowMs: 60_000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => `u${req.user?.id ?? 'anon'}`,
  validate: false,
  message: { error: { code: 'RATE_LIMIT', message: 'Demasiadas solicitudes a la IA. Espera un momento e inténtalo de nuevo.' } },
});

// ───────── estado ─────────
r.get('/status', (_req, res) => {
  const ai = getAi();
  res.json({ configured: ai.isConfigured(), provider: ai.name, model: ai.model, features: ['simulator', 'evaluator', 'recommendations', 'tutor'] });
});

// ───────── escenarios ─────────
const scenarioInclude = { competencies: { select: { competency: { select: { id: true, key: true, name: true } } } } } as const;

type ScenarioRow = Prisma.AiScenarioGetPayload<{ include: typeof scenarioInclude }>;
function scenarioOut(s: ScenarioRow, full: boolean) {
  const base = {
    id: s.id, key: s.key, title: s.title, description: s.description, objectives: s.objectives, difficulty: s.difficulty, isActive: s.isActive,
    competencies: s.competencies.map((c) => c.competency),
  };
  return full ? { ...base, persona: s.persona, context: s.context, openingLine: s.openingLine } : base;
}

r.get('/scenarios', async (req, res) => {
  const all = req.query.all === '1' && can(req, 'ai.manage');
  const rows = await prisma.aiScenario.findMany({ where: all ? {} : { isActive: true }, include: scenarioInclude, orderBy: [{ difficulty: 'asc' }, { id: 'asc' }] });
  res.json({ data: rows.map((s) => scenarioOut(s, all)) });
});

const scenarioSchema = z.object({
  key: z.string().trim().min(2).max(60).regex(/^[a-z0-9_-]+$/i, 'Usa solo letras, números, guion y guion bajo'),
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().min(1).max(5000),
  persona: z.string().trim().min(2).max(3000),
  context: z.string().trim().min(2).max(5000),
  objectives: z.array(z.string().trim().min(1).max(300)).max(12).default([]),
  difficulty: z.enum(['BASIC', 'INTERMEDIATE', 'ADVANCED']).default('BASIC'),
  openingLine: z.string().trim().min(1).max(2000),
  isActive: z.boolean().default(true),
  competencyIds: z.array(zId).max(20).default([]),
});

async function checkCompetencies(ids: number[]) {
  if (!ids.length) return;
  const n = await prisma.competency.count({ where: { id: { in: ids } } });
  if (n !== new Set(ids).size) throw badRequest('Alguna competencia indicada no existe');
}

r.post('/scenarios', requirePermission('ai.manage'), async (req, res) => {
  const d = body(req, scenarioSchema);
  if (await prisma.aiScenario.findUnique({ where: { key: d.key } })) throw conflict('Ya existe un escenario con esa clave');
  await checkCompetencies(d.competencyIds);
  const { competencyIds, objectives, ...rest } = d;
  const created = await prisma.aiScenario.create({
    data: { ...rest, objectives, competencies: { create: [...new Set(competencyIds)].map((competencyId) => ({ competencyId })) } },
    include: scenarioInclude,
  });
  await audit(req, 'ai.scenario.create', 'ai_scenario', created.id, { key: created.key });
  res.status(201).json(scenarioOut(created, true));
});

r.patch('/scenarios/:id', requirePermission('ai.manage'), async (req, res) => {
  const id = idParam(req);
  const d = body(req, scenarioSchema.partial());
  const cur = await prisma.aiScenario.findUnique({ where: { id } });
  if (!cur) throw notFound('Escenario no encontrado');
  if (d.key && d.key !== cur.key && (await prisma.aiScenario.findUnique({ where: { key: d.key } }))) throw conflict('Ya existe un escenario con esa clave');
  const { competencyIds, ...rest } = d;
  if (competencyIds) await checkCompetencies(competencyIds);
  const updated = await prisma.$transaction(async (tx) => {
    if (competencyIds) {
      await tx.aiScenarioCompetency.deleteMany({ where: { scenarioId: id } });
      await tx.aiScenarioCompetency.createMany({ data: [...new Set(competencyIds)].map((competencyId) => ({ scenarioId: id, competencyId })) });
    }
    return tx.aiScenario.update({ where: { id }, data: rest, include: scenarioInclude });
  });
  await audit(req, 'ai.scenario.update', 'ai_scenario', id, { fields: Object.keys(d) });
  res.json(scenarioOut(updated, true));
});

r.delete('/scenarios/:id', requirePermission('ai.manage'), async (req, res) => {
  const id = idParam(req);
  const cur = await prisma.aiScenario.findUnique({ where: { id }, include: { _count: { select: { simulations: true } } } });
  if (!cur) throw notFound('Escenario no encontrado');
  if (cur._count.simulations > 0) throw conflict('El escenario tiene simulaciones registradas. Desactívalo en lugar de eliminarlo.');
  await prisma.aiScenario.delete({ where: { id } });
  await audit(req, 'ai.scenario.delete', 'ai_scenario', id, { key: cur.key });
  res.json({ ok: true });
});

// ───────── simulaciones ─────────
const simScenarioSelect = { id: true, key: true, title: true, description: true, objectives: true, difficulty: true } as const;
const simBase = {
  id: true, scenarioId: true, status: true, provider: true, model: true, evaluationStatus: true, startedAt: true, endedAt: true, reviewedAt: true,
  scenario: { select: simScenarioSelect },
} as const;

r.post('/simulations', async (req, res) => {
  const { scenarioId } = body(req, z.object({ scenarioId: zId }));
  const sc = await prisma.aiScenario.findFirst({ where: { id: scenarioId, isActive: true } });
  if (!sc) throw notFound('Escenario no encontrado o inactivo');
  const ai = getAi();
  const sim = await prisma.aiSimulation.create({ data: { userId: req.user!.id, scenarioId, provider: ai.name, model: ai.model } });
  const opening = await prisma.aiInteraction.create({ data: { userId: req.user!.id, simulationId: sim.id, kind: 'SIMULATION', role: 'assistant', content: sc.openingLine } });
  const simulation = await prisma.aiSimulation.findUniqueOrThrow({ where: { id: sim.id }, select: simBase });
  res.status(201).json({ simulation, messages: [msgOut(opening)] });
});

r.get('/simulations/me', async (req, res) => {
  const p = getPage(req);
  const where = { userId: req.user!.id };
  const [rows, total] = await Promise.all([
    prisma.aiSimulation.findMany({
      where,
      orderBy: { startedAt: 'desc' },
      skip: p.skip,
      take: p.take,
      select: { ...simBase, _count: { select: { interactions: { where: { role: 'user' } } } } },
    }),
    prisma.aiSimulation.count({ where }),
  ]);
  res.json(paged(rows.map(({ _count, ...s }) => ({ ...s, turns: _count.interactions })), total, p));
});

r.get('/simulations/:id', async (req, res) => {
  const id = idParam(req);
  const sim = await prisma.aiSimulation.findUnique({
    where: { id },
    select: {
      ...simBase, userId: true, evaluation: true, reviewerNotes: true,
      user: { select: userSelect },
      reviewedBy: { select: { id: true, firstName: true, lastName: true } },
      interactions: { where: { kind: 'SIMULATION' }, orderBy: { id: 'asc' }, select: { id: true, role: true, content: true, createdAt: true } },
    },
  });
  if (!sim) throw notFound('Simulación no encontrada');
  const owner = sim.userId === req.user!.id;
  if (!owner && !(await canReviewStudent(req, sim.userId))) throw forbidden('No tienes acceso a esta simulación');
  const { interactions, evaluation, reviewerNotes, userId: _u, user, reviewedBy, ...simulation } = sim;
  res.json({
    simulation: { ...simulation, student: user, reviewedBy },
    messages: interactions.map(msgOut),
    evaluation,
    reviewerNotes,
  });
});

r.post('/simulations/:id/messages', aiLimiter, async (req, res) => {
  const id = idParam(req);
  const { content } = body(req, z.object({ content: z.string().trim().min(1, 'Escribe un mensaje').max(2000, 'Máximo 2000 caracteres') }));
  const sim = await prisma.aiSimulation.findUnique({ where: { id }, include: { scenario: true } });
  if (!sim || sim.userId !== req.user!.id) throw notFound('Simulación no encontrada');
  if (sim.status !== 'ACTIVE') throw conflict('Esta simulación ya finalizó');
  const ai = requireAi();

  const history = await prisma.aiInteraction.findMany({ where: { simulationId: id, kind: 'SIMULATION' }, orderBy: { id: 'asc' }, select: { role: true, content: true } });
  const userTurns = history.filter((h) => h.role === 'user').length;
  if (userTurns >= MAX_USER_TURNS) throw badRequest(`Alcanzaste el máximo de ${MAX_USER_TURNS} intervenciones. Finaliza la simulación para recibir tu retroalimentación.`);

  const turns: ChatTurn[] = history.map((h) => ({ role: h.role === 'user' ? 'user' : 'assistant', content: h.content }));
  // El proveedor exige que la conversación empiece con el usuario: se antepone una señal de inicio.
  if (turns[0]?.role === 'assistant') turns.unshift({ role: 'user', content: '[Inicia la simulación con tu primera intervención.]' });
  turns.push({ role: 'user', content });

  const reply = await ai.chat(simulationSystemPrompt(sim.scenario), turns, { maxTokens: 600 });
  await prisma.aiInteraction.create({ data: { userId: req.user!.id, simulationId: id, kind: 'SIMULATION', role: 'user', content, tokensIn: reply.tokensIn } });
  const saved = await prisma.aiInteraction.create({
    data: { userId: req.user!.id, simulationId: id, kind: 'SIMULATION', role: 'assistant', content: reply.text, tokensOut: reply.tokensOut },
  });
  res.json({ message: { role: 'assistant', content: saved.content, createdAt: saved.createdAt } });
});

const MIN_EVAL_TURNS = 2;

r.post('/simulations/:id/finish', aiLimiter, async (req, res) => {
  const id = idParam(req);
  const sim = await prisma.aiSimulation.findUnique({ where: { id }, include: { scenario: true, user: { select: { id: true, firstName: true, lastName: true } } } });
  if (!sim || sim.userId !== req.user!.id) throw notFound('Simulación no encontrada');
  if (sim.status !== 'ACTIVE') throw conflict('Esta simulación ya finalizó');

  const history = await prisma.aiInteraction.findMany({ where: { simulationId: id, kind: 'SIMULATION' }, orderBy: { id: 'asc' }, select: { role: true, content: true } });
  const userTurns = history.filter((h) => h.role === 'user').length;

  if (userTurns < MIN_EVAL_TURNS) {
    const simulation = await prisma.aiSimulation.update({ where: { id }, data: { status: 'COMPLETED', endedAt: new Date() }, select: simBase });
    res.json({
      simulation, evaluation: null,
      message: 'La simulación fue muy corta para generar una evaluación. Participa al menos en 2 intervenciones para recibir retroalimentación.',
    });
    return;
  }

  const ai = requireAi();
  const transcript = history.map((h) => `${h.role === 'user' ? 'ESTUDIANTE' : 'PERSONAJE'}: ${h.content}`).join('\n');
  const prompt = `Escenario: ${sim.scenario.title}\nContexto: ${sim.scenario.context}\nPersonaje simulado: ${sim.scenario.persona}\nObjetivos: ${
    Array.isArray(sim.scenario.objectives) ? (sim.scenario.objectives as unknown[]).map(String).join('; ') : ''
  }\n\nTranscripción:\n<transcripcion>\n${transcript}\n</transcripcion>`;
  const res1 = await ai.json<unknown>(EVALUATION_SYSTEM, prompt, EVALUATION_SCHEMA as unknown as Record<string, unknown>, { maxTokens: 4000 });
  const evaluation = normalizeEvaluation(res1.data);
  if (!evaluation) throw badRequest('La IA no devolvió una evaluación válida. Inténtalo de nuevo.');

  const simulation = await prisma.aiSimulation.update({
    where: { id },
    data: { status: 'COMPLETED', endedAt: new Date(), evaluation: evaluation as unknown as Prisma.InputJsonValue, evaluationStatus: 'AI_GENERATED' },
    select: simBase,
  });
  await prisma.aiInteraction.create({
    data: { userId: sim.userId, simulationId: id, kind: 'EVALUATION', role: 'assistant', content: evaluation.summary.slice(0, 5000) || 'Evaluación generada', tokensIn: res1.tokensIn, tokensOut: res1.tokensOut },
  });

  // Registro de competencias (sin revisar hasta que un facilitador lo confirme)
  const comps = await prisma.competency.findMany({ where: { key: { in: Object.values(DIMENSION_COMPETENCY) } }, select: { id: true, key: true } });
  const compByKey = new Map(comps.map((c) => [c.key, c.id]));
  const records = evaluation.dimensions.flatMap((d) => {
    const cid = compByKey.get(DIMENSION_COMPETENCY[d.key]);
    return cid ? [{ userId: sim.userId, competencyId: cid, score: d.score, scaleMax: 5, source: 'AI' as const, sourceRefId: id, notes: d.evidence || null, isReviewed: false }] : [];
  });
  if (records.length) await prisma.studentCompetency.createMany({ data: records });

  await awardPoints(sim.userId, 'SIMULATION_COMPLETED', { type: 'simulation', id });

  // Aviso a facilitadores de los cursos del estudiante; si no hay, a administradores académicos
  const instructors = await prisma.courseInstructor.findMany({
    where: { course: { enrollments: { some: { userId: sim.userId, status: { in: ['ACTIVE', 'COMPLETED'] } } } } },
    select: { instructorId: true },
    distinct: ['instructorId'],
  });
  let recipients = instructors.map((i) => i.instructorId);
  if (!recipients.length) {
    recipients = (await prisma.user.findMany({ where: { role: { key: 'ACADEMIC_ADMIN' }, status: 'ACTIVE', deletedAt: null }, select: { id: true } })).map((u) => u.id);
  }
  await notify(recipients, {
    type: 'AI_REVIEW',
    title: 'Simulación pendiente de revisión',
    body: `${sim.user.firstName} ${sim.user.lastName} completó "${sim.scenario.title}". Revisa la evaluación generada por IA.`,
    link: `/panel/ia/revisiones/${id}`,
  }).catch((e) => console.error('[ai] notify', e));

  res.json({ simulation, evaluation, message: 'Simulación finalizada. Esta es tu retroalimentación formativa.' });
});

// ───────── revisión docente ─────────
r.get('/reviews', requirePermission('ai.review'), async (req, res) => {
  const q = query(req, z.object({ status: z.enum(['AI_GENERATED', 'REVIEWED']).optional() }));
  const p = getPage(req);
  const where: Prisma.AiSimulationWhereInput = { evaluationStatus: q.status ? q.status : { in: ['AI_GENERATED', 'REVIEWED'] } };
  if (!isAdmin(req)) where.userId = { in: await studentIdsOfInstructor(req.user!.id) };
  if (p.search) {
    where.user = { OR: [{ firstName: { contains: p.search } }, { lastName: { contains: p.search } }, { email: { contains: p.search } }] };
  }
  const [rows, total] = await Promise.all([
    prisma.aiSimulation.findMany({
      where, orderBy: { endedAt: 'desc' }, skip: p.skip, take: p.take,
      select: {
        id: true, status: true, evaluationStatus: true, startedAt: true, endedAt: true, reviewedAt: true,
        user: { select: userSelect }, scenario: { select: { id: true, key: true, title: true } },
      },
    }),
    prisma.aiSimulation.count({ where }),
  ]);
  res.json(paged(rows.map(({ user, ...s }) => ({ ...s, student: user })), total, p));
});

const reviewSchema = z.object({
  dimensions: z.array(z.object({ key: z.enum(DIMENSIONS), score: z.coerce.number().int().min(1).max(5) })).min(1).max(7),
  reviewerNotes: z.string().trim().min(1, 'Escribe tus observaciones').max(4000),
});

r.post('/simulations/:id/review', requirePermission('ai.review'), async (req, res) => {
  const id = idParam(req);
  const d = body(req, reviewSchema);
  const sim = await prisma.aiSimulation.findUnique({ where: { id } });
  if (!sim) throw notFound('Simulación no encontrada');
  await assertCanReview(req, sim.userId);
  const ev = sim.evaluation as unknown as Evaluation | null;
  if (!ev || !Array.isArray(ev.dimensions) || sim.evaluationStatus === 'PENDING') throw conflict('Esta simulación no tiene una evaluación para revisar');

  const original = ev.originalScores ?? Object.fromEntries(ev.dimensions.map((x) => [x.key, x.score]));
  const adjusted = new Map(d.dimensions.map((x) => [x.key, clampScore(x.score)]));
  const updated: Evaluation = {
    ...ev,
    disclaimer: ev.disclaimer || DISCLAIMER,
    originalScores: original,
    dimensions: ev.dimensions.map((x) => ({ ...x, score: adjusted.get(x.key) ?? x.score })),
  };
  const now = new Date();
  const simulation = await prisma.aiSimulation.update({
    where: { id },
    data: { evaluation: updated as unknown as Prisma.InputJsonValue, evaluationStatus: 'REVIEWED', reviewedById: req.user!.id, reviewedAt: now, reviewerNotes: d.reviewerNotes },
    select: simBase,
  });

  const comps = await prisma.competency.findMany({ where: { key: { in: Object.values(DIMENSION_COMPETENCY) } }, select: { id: true, key: true } });
  const keyToCompId = new Map(comps.map((c) => [c.key, c.id]));
  for (const dim of updated.dimensions) {
    const cid = keyToCompId.get(DIMENSION_COMPETENCY[dim.key as DimensionKey]);
    if (!cid) continue;
    await prisma.studentCompetency.updateMany({
      where: { userId: sim.userId, competencyId: cid, source: 'AI', sourceRefId: id },
      data: { score: dim.score, isReviewed: true, evaluatorId: req.user!.id },
    });
  }

  await prisma.feedback.create({
    data: { target: 'SIMULATION', simulationId: id, authorId: req.user!.id, studentId: sim.userId, comment: d.reviewerNotes },
  });
  await notify(sim.userId, {
    type: 'AI_REVIEW',
    title: 'Tu simulación fue revisada por un facilitador',
    body: d.reviewerNotes.slice(0, 300),
    link: `/campus/ia/simulaciones/${id}`,
  }).catch((e) => console.error('[ai] notify', e));
  await audit(req, 'ai.review', 'ai_simulation', id, { studentId: sim.userId });

  res.json({ simulation, evaluation: updated, reviewerNotes: d.reviewerNotes });
});

// ───────── tutor académico ─────────
const MAX_CONTEXT = 12_000;

r.post('/tutor', aiLimiter, async (req, res) => {
  const d = body(req, z.object({ question: z.string().trim().min(1, 'Escribe tu pregunta').max(2000, 'Máximo 2000 caracteres'), courseId: zId.optional(), lessonId: zId.optional() }));
  const ai = requireAi();
  let courseId = d.courseId ?? null;
  let context = '';

  if (d.lessonId) {
    const lesson = await prisma.lesson.findUnique({ where: { id: d.lessonId }, include: { module: { select: { courseId: true, title: true, course: { select: { title: true } } } } } });
    if (!lesson) throw notFound('Lección no encontrada');
    if (courseId && courseId !== lesson.module.courseId) throw badRequest('La lección no pertenece al curso indicado');
    courseId = lesson.module.courseId;
    await assertCourseAccess(req, courseId);
    const text = htmlToText(lesson.content ?? '');
    context = `Curso: ${lesson.module.course.title}\nMódulo: ${lesson.module.title}\nLección: ${lesson.title}\n${lesson.summary ? `Resumen: ${lesson.summary}\n` : ''}\nContenido de la lección:\n${text}`.slice(0, MAX_CONTEXT);
  } else if (courseId) {
    await assertCourseAccess(req, courseId);
    const course = await prisma.course.findFirst({
      where: { id: courseId, deletedAt: null },
      select: {
        title: true, description: true, objectives: true,
        modules: { where: { isPublished: true }, orderBy: { order: 'asc' }, select: { title: true, lessons: { where: { isPublished: true }, orderBy: { order: 'asc' }, select: { title: true } } } },
      },
    });
    if (!course) throw notFound('Curso no encontrado');
    const objectives = Array.isArray(course.objectives) ? (course.objectives as unknown[]).map(String) : [];
    context = [
      `Curso: ${course.title}`,
      course.description ? `Descripción: ${htmlToText(course.description)}` : '',
      objectives.length ? `Objetivos:\n- ${objectives.join('\n- ')}` : '',
      'Temario:',
      ...course.modules.map((m, i) => `${i + 1}. ${m.title}${m.lessons.length ? '\n   - ' + m.lessons.map((l) => l.title).join('\n   - ') : ''}`),
    ].filter(Boolean).join('\n').slice(0, MAX_CONTEXT);
  }

  const system = `Eres el tutor académico de CEHACIS, una plataforma de formación en habilidades de comunicación y habilidades sociales. Responde siempre en español, con claridad y con ejemplos prácticos, basándote en el contexto del curso que se te entrega.
Reglas:
- Si la pregunta está fuera del temario o del contexto disponible, dilo con honestidad y orienta al estudiante sobre cómo abordarla o a quién consultar.
- No inventes datos del curso (fechas, notas, contenidos, políticas) que no estén en el contexto.
- No hagas diagnósticos psicológicos ni des consejo médico o legal.
- Sé conciso: explica lo esencial y ofrece profundizar.
${context ? `\n<contexto_del_curso>\n${context}\n</contexto_del_curso>` : '\nNo hay contexto de curso para esta consulta: responde en términos generales y sugiere al estudiante indicar el curso o la lección.'}`;

  const past = await prisma.aiInteraction.findMany({
    where: { userId: req.user!.id, kind: 'TUTOR', courseId },
    orderBy: { id: 'desc' },
    take: 6,
    select: { role: true, content: true },
  });
  const turns: ChatTurn[] = past.reverse().map((h) => ({ role: h.role === 'user' ? 'user' : 'assistant', content: h.content }));
  while (turns[0]?.role === 'assistant') turns.shift();
  turns.push({ role: 'user', content: d.question });

  const reply = await ai.chat(system, turns, { maxTokens: 1500 });
  await prisma.aiInteraction.create({ data: { userId: req.user!.id, kind: 'TUTOR', courseId, role: 'user', content: d.question, tokensIn: reply.tokensIn } });
  await prisma.aiInteraction.create({ data: { userId: req.user!.id, kind: 'TUTOR', courseId, role: 'assistant', content: reply.text, tokensOut: reply.tokensOut } });
  res.json({ answer: reply.text });
});

r.get('/tutor/history', async (req, res) => {
  const q = query(req, z.object({ courseId: zId.optional() }));
  const rows = await prisma.aiInteraction.findMany({
    where: { userId: req.user!.id, kind: 'TUTOR', ...(q.courseId ? { courseId: q.courseId } : {}) },
    orderBy: { id: 'desc' },
    take: 50,
    select: { id: true, role: true, content: true, courseId: true, createdAt: true },
  });
  res.json({ data: rows.reverse() });
});

// ───────── recomendaciones ─────────
r.post('/recommendations', aiLimiter, async (req, res) => {
  const result = await recommend(req.user!.id);
  if (result.source === 'ia') {
    await prisma.aiInteraction.create({
      data: {
        userId: req.user!.id, kind: 'RECOMMENDATION', role: 'assistant',
        content: JSON.stringify(result.recommendations).slice(0, 60_000), tokensIn: result.tokensIn, tokensOut: result.tokensOut,
      },
    });
  }
  res.json({ source: result.source, recommendations: result.recommendations });
});

export default r;
