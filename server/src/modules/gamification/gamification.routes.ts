import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { body, query, idParam, zId, zOptId, zDate, zText } from '../../lib/validate.js';
import { AppError, badRequest, notFound, conflict, forbidden } from '../../lib/errors.js';
import { audit } from '../../lib/audit.js';
import { notify } from '../../lib/notify.js';
import { awardPoints, POINT_EVENTS, type PointEvent } from '../../lib/gamification.js';
import { requireAuth, requirePermission } from '../../middleware/auth.js';
import { BADGE_CRITERIA, CHALLENGE_CRITERIA, badgeMetric, challengeProgress } from './gamification.service.js';

const r = Router();
r.use(requireAuth);
const manage = requirePermission('gamification.manage');

const userSel = { id: true, firstName: true, lastName: true, avatarUrl: true } as const;

// ───────── Reglas de puntos ─────────
async function ensureRules() {
  const existing = await prisma.pointRule.findMany();
  const have = new Set(existing.map((x) => x.event));
  const missing = (Object.keys(POINT_EVENTS) as PointEvent[]).filter((e) => !have.has(e));
  if (missing.length) {
    await prisma.pointRule.createMany({ data: missing.map((event) => ({ event, name: POINT_EVENTS[event], points: 0, isActive: false })), skipDuplicates: true });
  }
  return prisma.pointRule.findMany({ orderBy: { id: 'asc' } });
}

r.get('/rules', manage, async (_req, res) => {
  res.json({ data: await ensureRules() });
});

r.put('/rules/:id', manage, async (req, res) => {
  const id = idParam(req);
  const d = body(req, z.object({
    points: z.coerce.number().int().min(0).max(100000).optional(),
    isActive: z.boolean().optional(),
    dailyCap: z.coerce.number().int().min(0).max(1000000).nullable().optional(),
    name: zText(120).min(1).optional(),
  }));
  if (!(await prisma.pointRule.findUnique({ where: { id } }))) throw notFound('Regla no encontrada');
  const data = await prisma.pointRule.update({ where: { id }, data: { ...d, dailyCap: d.dailyCap === 0 ? null : d.dailyCap } });
  await audit(req, 'gamification.rule.update', 'point_rule', id, d);
  res.json({ data });
});

// ───────── Niveles ─────────
const levelSchema = z.object({ number: z.coerce.number().int().min(1), name: zText(80).min(1), minPoints: z.coerce.number().int().min(0) });

r.get('/levels', async (_req, res) => {
  res.json({ data: await prisma.level.findMany({ orderBy: { number: 'asc' } }) });
});
r.post('/levels', manage, async (req, res) => {
  const d = body(req, levelSchema);
  if (await prisma.level.findUnique({ where: { number: d.number } })) throw conflict('Ya existe un nivel con ese número');
  const data = await prisma.level.create({ data: d });
  await audit(req, 'gamification.level.create', 'level', data.id, d);
  res.status(201).json({ data });
});
r.patch('/levels/:id', manage, async (req, res) => {
  const id = idParam(req);
  const d = body(req, levelSchema.partial());
  if (!(await prisma.level.findUnique({ where: { id } }))) throw notFound('Nivel no encontrado');
  if (d.number != null) {
    const dup = await prisma.level.findUnique({ where: { number: d.number } });
    if (dup && dup.id !== id) throw conflict('Ya existe un nivel con ese número');
  }
  const data = await prisma.level.update({ where: { id }, data: d });
  await audit(req, 'gamification.level.update', 'level', id, d);
  res.json({ data });
});
r.delete('/levels/:id', manage, async (req, res) => {
  const id = idParam(req);
  if (!(await prisma.level.findUnique({ where: { id } }))) throw notFound('Nivel no encontrado');
  await prisma.level.delete({ where: { id } });
  await audit(req, 'gamification.level.delete', 'level', id);
  res.json({ ok: true });
});

// ───────── Insignias ─────────
const badgeSchema = z.object({
  key: z.string().trim().min(2).max(60).regex(/^[a-z0-9_-]+$/i, 'Solo letras, números, guion y guion bajo'),
  name: zText(120).min(1),
  description: zText(500).min(1),
  icon: zText(40).min(1).default('award'),
  criteria: z.object({ type: z.enum(BADGE_CRITERIA), min: z.coerce.number().min(0) }),
  competencyId: zOptId,
  points: z.coerce.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

r.get('/badges', async (req, res) => {
  const all = req.user!.permissions.has('gamification.manage');
  const data = await prisma.badge.findMany({ where: all ? {} : { isActive: true }, orderBy: { id: 'asc' } });
  res.json({ data });
});
r.post('/badges', manage, async (req, res) => {
  const d = body(req, badgeSchema);
  if (d.criteria.type === 'COMPETENCY_SCORE' && !d.competencyId) throw badRequest('El criterio COMPETENCY_SCORE requiere competencyId');
  if (await prisma.badge.findUnique({ where: { key: d.key } })) throw conflict('Ya existe una insignia con esa clave');
  const data = await prisma.badge.create({ data: { ...d, competencyId: d.competencyId ?? null } });
  await audit(req, 'gamification.badge.create', 'badge', data.id, { key: d.key });
  res.status(201).json({ data });
});
r.patch('/badges/:id', manage, async (req, res) => {
  const id = idParam(req);
  const d = body(req, badgeSchema.partial());
  if (!(await prisma.badge.findUnique({ where: { id } }))) throw notFound('Insignia no encontrada');
  if (d.key) {
    const dup = await prisma.badge.findUnique({ where: { key: d.key } });
    if (dup && dup.id !== id) throw conflict('Ya existe una insignia con esa clave');
  }
  const data = await prisma.badge.update({ where: { id }, data: d });
  await audit(req, 'gamification.badge.update', 'badge', id, d);
  res.json({ data });
});
r.delete('/badges/:id', manage, async (req, res) => {
  const id = idParam(req);
  if (!(await prisma.badge.findUnique({ where: { id } }))) throw notFound('Insignia no encontrada');
  await prisma.badge.delete({ where: { id } });
  await audit(req, 'gamification.badge.delete', 'badge', id);
  res.json({ ok: true });
});

// ───────── Retos ─────────
const challengeSchema = z.object({
  title: zText(200).min(1),
  description: zText(5000).min(1),
  startsAt: zDate,
  endsAt: zDate,
  points: z.coerce.number().int().min(0).default(50),
  criteria: z.object({ type: z.enum(CHALLENGE_CRITERIA), target: z.coerce.number().int().min(1) }),
  competencyId: zOptId,
  isActive: z.boolean().default(true),
});

r.get('/challenges', async (req, res) => {
  const q = query(req, z.object({ all: z.string().optional() }));
  const wantAll = (q.all === '1' || q.all === 'true') && req.user!.permissions.has('gamification.manage');
  const now = new Date();
  const data = await prisma.challenge.findMany({
    where: wantAll ? {} : { isActive: true, startsAt: { lte: now }, endsAt: { gte: now } },
    orderBy: { startsAt: 'desc' },
  });
  res.json({ data });
});
r.post('/challenges', manage, async (req, res) => {
  const d = body(req, challengeSchema);
  if (d.endsAt <= d.startsAt) throw badRequest('La fecha de fin debe ser posterior al inicio');
  const data = await prisma.challenge.create({ data: { ...d, competencyId: d.competencyId ?? null } });
  await audit(req, 'gamification.challenge.create', 'challenge', data.id, { title: d.title });
  res.status(201).json({ data });
});
r.patch('/challenges/:id', manage, async (req, res) => {
  const id = idParam(req);
  const d = body(req, challengeSchema.partial());
  const cur = await prisma.challenge.findUnique({ where: { id } });
  if (!cur) throw notFound('Reto no encontrado');
  if ((d.endsAt ?? cur.endsAt) <= (d.startsAt ?? cur.startsAt)) throw badRequest('La fecha de fin debe ser posterior al inicio');
  const data = await prisma.challenge.update({ where: { id }, data: d });
  await audit(req, 'gamification.challenge.update', 'challenge', id, d);
  res.json({ data });
});
r.delete('/challenges/:id', manage, async (req, res) => {
  const id = idParam(req);
  if (!(await prisma.challenge.findUnique({ where: { id } }))) throw notFound('Reto no encontrado');
  await prisma.challenge.delete({ where: { id } });
  await audit(req, 'gamification.challenge.delete', 'challenge', id);
  res.json({ ok: true });
});

r.post('/challenges/:id/claim', async (req, res) => {
  const id = idParam(req);
  const userId = req.user!.id;
  const ch = await prisma.challenge.findUnique({ where: { id } });
  const now = new Date();
  if (!ch || !ch.isActive) throw notFound('Reto no encontrado');
  if (ch.startsAt > now) throw badRequest('Este reto aún no ha comenzado');
  const done = await prisma.challengeCompletion.findUnique({ where: { challengeId_userId: { challengeId: id, userId } } });
  if (done) throw conflict('Ya reclamaste este reto');
  const progress = await challengeProgress(userId, ch);
  if (progress.current < progress.target) throw badRequest('Aún no cumples los requisitos del reto', { progress });
  try {
    await prisma.challengeCompletion.create({ data: { challengeId: id, userId } });
  } catch {
    throw conflict('Ya reclamaste este reto');
  }
  const awarded = await awardPoints(userId, 'CHALLENGE_COMPLETED', { type: 'challenge', id }, `Reto: ${ch.title}`);
  await notify(userId, { type: 'CHALLENGE', title: `Reto completado: ${ch.title}`, link: '/campus/logros' });
  res.json({ ok: true, pointsAwarded: awarded, progress });
});

// ───────── Estudiante: resumen ─────────
r.get('/me', async (req, res) => {
  const userId = req.user!.id;
  const now = new Date();
  const profile = await prisma.studentProfile.findUnique({ where: { userId }, include: { level: true } });
  const points = profile?.points ?? 0;
  const [levels, badges, owned, recent, challenges, completions, recs, higher] = await Promise.all([
    prisma.level.findMany({ orderBy: { number: 'asc' } }),
    prisma.badge.findMany({ where: { isActive: true }, orderBy: { id: 'asc' } }),
    prisma.achievement.findMany({ where: { userId } }),
    prisma.pointTransaction.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 20 }),
    prisma.challenge.findMany({ where: { isActive: true, startsAt: { lte: now }, endsAt: { gte: now } }, orderBy: { endsAt: 'asc' } }),
    prisma.challengeCompletion.findMany({ where: { userId } }),
    prisma.recognition.findMany({ where: { toId: userId }, orderBy: { createdAt: 'desc' }, take: 10, include: { from: { select: { firstName: true, lastName: true } } } }),
    prisma.studentProfile.count({ where: { points: { gt: points } } }),
  ]);

  const cur = profile?.level ?? [...levels].reverse().find((l) => l.minPoints <= points) ?? null;
  const next = levels.find((l) => l.minPoints > points) ?? null;
  const lv = (l: { number: number; name: string; minPoints: number } | null) => (l ? { number: l.number, name: l.name, minPoints: l.minPoints } : null);
  let progressToNext = 1;
  if (next) {
    const base = cur?.minPoints ?? 0;
    progressToNext = Math.max(0, Math.min(1, (points - base) / Math.max(1, next.minPoints - base)));
  }

  const ownedMap = new Map(owned.map((o) => [o.badgeId, o.awardedAt]));
  const badgeOut = await Promise.all(
    badges.map(async (b) => {
      const c = (b.criteria ?? {}) as { type?: string; min?: number };
      const target = Number(c.min) || 0;
      const earned = ownedMap.has(b.id);
      const current = earned ? target : Math.min(target, await badgeMetric(userId, c.type ?? '', b.competencyId));
      return { id: b.id, key: b.key, name: b.name, description: b.description, icon: b.icon, earned, awardedAt: ownedMap.get(b.id) ?? null, progress: { current, target } };
    }),
  );
  const doneSet = new Set(completions.map((c) => c.challengeId));
  const challengeOut = await Promise.all(
    challenges.map(async (c) => ({
      id: c.id, title: c.title, description: c.description, endsAt: c.endsAt, points: c.points,
      progress: await challengeProgress(userId, c), completed: doneSet.has(c.id),
    })),
  );

  res.json({
    points,
    level: lv(cur),
    nextLevel: lv(next),
    progressToNext,
    rank: higher + 1,
    badges: badgeOut,
    recent,
    challenges: challengeOut,
    recognitions: recs,
  });
});

// ───────── Clasificación ─────────
r.get('/leaderboard', async (req, res) => {
  const q = query(req, z.object({ period: z.enum(['week', 'month', 'all']).default('all'), courseId: zId.optional() }));
  const me = req.user!.id;
  const levels = await prisma.level.findMany({ orderBy: { number: 'desc' } });
  const levelFor = (pts: number) => {
    const l = levels.find((x) => x.minPoints <= pts);
    return l ? { number: l.number, name: l.name } : null;
  };
  const enrolledIds = q.courseId
    ? (await prisma.enrollment.findMany({ where: { courseId: q.courseId, status: { in: ['ACTIVE', 'COMPLETED'] } }, select: { userId: true } })).map((e) => e.userId)
    : null;
  const userWhere = { status: 'ACTIVE' as const, deletedAt: null };

  let rows: { userId: number; points: number }[];
  let myPoints = 0;
  let myRank: number | null = null;

  if (q.period === 'all') {
    const where = { user: userWhere, ...(enrolledIds ? { userId: { in: enrolledIds } } : {}) };
    rows = await prisma.studentProfile.findMany({ where, orderBy: [{ points: 'desc' }, { userId: 'asc' }], take: 50, select: { userId: true, points: true } });
    const mine = await prisma.studentProfile.findUnique({ where: { userId: me } });
    myPoints = mine?.points ?? 0;
    if (mine && (!enrolledIds || enrolledIds.includes(me))) myRank = (await prisma.studentProfile.count({ where: { ...where, points: { gt: myPoints } } })) + 1;
  } else {
    const since = new Date();
    if (q.period === 'week') since.setDate(since.getDate() - 7);
    else since.setMonth(since.getMonth() - 1);
    const where = { createdAt: { gte: since }, user: userWhere, ...(enrolledIds ? { userId: { in: enrolledIds } } : {}) };
    const grouped = await prisma.pointTransaction.groupBy({ by: ['userId'], where, _sum: { points: true }, orderBy: { _sum: { points: 'desc' } }, take: 50 });
    rows = grouped.map((g) => ({ userId: g.userId, points: g._sum.points ?? 0 }));
    const mineAgg = await prisma.pointTransaction.aggregate({ where: { ...where, userId: me }, _sum: { points: true } });
    myPoints = mineAgg._sum.points ?? 0;
    if (myPoints > 0) {
      const above = await prisma.pointTransaction.groupBy({ by: ['userId'], where, _sum: { points: true }, having: { points: { _sum: { gt: myPoints } } } });
      myRank = above.length + 1;
    }
  }

  const ids = rows.map((x) => x.userId);
  const [users, profiles] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: ids } }, select: userSel }),
    prisma.studentProfile.findMany({ where: { userId: { in: ids } }, select: { userId: true, points: true } }),
  ]);
  const uMap = new Map(users.map((u) => [u.id, u]));
  const totals = new Map(profiles.map((p) => [p.userId, p.points]));
  const data = rows
    .map((x, i) => ({ rank: i + 1, user: uMap.get(x.userId), points: x.points, level: levelFor(totals.get(x.userId) ?? 0) }))
    .filter((x) => x.user);
  res.json({ data, me: { rank: myRank, points: myPoints } });
});

// ───────── Reconocimientos ─────────
r.post('/recognitions', async (req, res) => {
  const d = body(req, z.object({ toId: zId, kind: zText(60).min(1), message: zText(500).min(1) }));
  const from = req.user!;
  if (d.toId === from.id) throw badRequest('No puedes reconocerte a ti mismo');
  const to = await prisma.user.findFirst({ where: { id: d.toId, deletedAt: null, status: 'ACTIVE' }, include: { role: true } });
  if (!to) throw notFound('Usuario no encontrado');

  if (from.role === 'STUDENT') {
    if (to.role.key !== 'STUDENT') throw forbidden('Solo puedes reconocer a compañeros de curso');
    const mine = await prisma.enrollment.findMany({ where: { userId: from.id, status: { in: ['ACTIVE', 'COMPLETED'] } }, select: { courseId: true } });
    const shared = mine.length
      ? await prisma.enrollment.count({ where: { userId: to.id, status: { in: ['ACTIVE', 'COMPLETED'] }, courseId: { in: mine.map((m) => m.courseId) } } })
      : 0;
    if (!shared) throw forbidden('Solo puedes reconocer a compañeros de tus cursos');
  } else if (to.role.key !== 'STUDENT') {
    throw forbidden('El personal solo puede reconocer a estudiantes');
  }

  const since = new Date();
  since.setHours(0, 0, 0, 0);
  const today = await prisma.recognition.count({ where: { fromId: from.id, createdAt: { gte: since } } });
  if (today >= 5) throw new AppError(429, 'Alcanzaste el límite de 5 reconocimientos por día', 'RATE_LIMIT');

  const data = await prisma.recognition.create({ data: { fromId: from.id, toId: to.id, kind: d.kind, message: d.message } });
  await awardPoints(to.id, 'RECOGNITION_RECEIVED', { type: 'recognition', id: data.id });
  await notify(to.id, { type: 'RECOGNITION', title: `${from.firstName} ${from.lastName} te envió un reconocimiento: ${d.kind}`, body: d.message, link: '/campus/logros' });
  res.status(201).json({ data });
});

r.get('/recognitions', async (req, res) => {
  const q = query(req, z.object({ userId: zId.optional() }));
  const userId = q.userId ?? req.user!.id;
  const data = await prisma.recognition.findMany({
    where: { toId: userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: { from: { select: userSel } },
  });
  res.json({ data });
});

export default r;
