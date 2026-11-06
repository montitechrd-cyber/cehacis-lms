import { prisma } from './prisma.js';
import { notify } from './notify.js';

/**
 * Eventos que otorgan puntos. El valor real de cada evento se configura en la tabla point_rules
 * (panel admin → Gamificación). Si una regla está inactiva o no existe, no se otorgan puntos.
 */
export const POINT_EVENTS = {
  LESSON_COMPLETED: 'Lección completada',
  MODULE_COMPLETED: 'Módulo completado',
  COURSE_COMPLETED: 'Curso completado',
  ASSESSMENT_PASSED: 'Evaluación aprobada',
  PERFECT_SCORE: 'Puntuación perfecta',
  ACTIVITY_SUBMITTED: 'Actividad práctica entregada',
  PEER_REVIEW_GIVEN: 'Evaluación entre compañeros realizada',
  FORUM_POST: 'Participación en foro',
  SIMULATION_COMPLETED: 'Simulación con IA completada',
  ATTENDANCE_PRESENT: 'Asistencia a sesión',
  CHALLENGE_COMPLETED: 'Reto semanal completado',
  RECOGNITION_RECEIVED: 'Reconocimiento recibido',
} as const;

export type PointEvent = keyof typeof POINT_EVENTS;

/**
 * Otorga puntos según la regla configurada. Idempotente por (evento, refType, refId) para no duplicar
 * puntos si una acción se repite. Recalcula nivel e insignias. Nunca lanza.
 */
export async function awardPoints(userId: number, event: PointEvent, ref?: { type: string; id: number }, reason?: string) {
  try {
    const rule = await prisma.pointRule.findUnique({ where: { event } });
    if (!rule || !rule.isActive || rule.points === 0) return 0;
    if (ref) {
      const dup = await prisma.pointTransaction.findFirst({ where: { userId, event, refType: ref.type, refId: ref.id } });
      if (dup) return 0;
    }
    if (rule.dailyCap) {
      const since = new Date();
      since.setHours(0, 0, 0, 0);
      const today = await prisma.pointTransaction.aggregate({ where: { userId, event, createdAt: { gte: since } }, _sum: { points: true } });
      if ((today._sum.points ?? 0) >= rule.dailyCap) return 0;
    }
    await prisma.pointTransaction.create({
      data: { userId, points: rule.points, event, reason: reason ?? rule.name, refType: ref?.type, refId: ref?.id },
    });
    const profile = await prisma.studentProfile.upsert({
      where: { userId },
      update: { points: { increment: rule.points } },
      create: { userId, points: rule.points },
    });
    await syncLevel(userId, profile.points, profile.levelId);
    await evaluateBadges(userId);
    return rule.points;
  } catch (e) {
    console.error('[gamification] awardPoints', e);
    return 0;
  }
}

async function syncLevel(userId: number, points: number, currentLevelId: number | null) {
  const level = await prisma.level.findFirst({ where: { minPoints: { lte: points } }, orderBy: { minPoints: 'desc' } });
  if (level && level.id !== currentLevelId) {
    await prisma.studentProfile.update({ where: { userId }, data: { levelId: level.id } });
    if (currentLevelId) await notify(userId, { type: 'LEVEL_UP', title: `Subiste al nivel ${level.number}: ${level.name}`, link: '/campus/logros' });
  }
}

/**
 * Criterios de insignia soportados (badges.criteria JSON):
 *  { type: 'POINTS', min }                       puntos totales
 *  { type: 'COURSES_COMPLETED', min }            cursos completados
 *  { type: 'LESSONS_COMPLETED', min }            lecciones completadas
 *  { type: 'SIMULATIONS_COMPLETED', min }        simulaciones IA completadas
 *  { type: 'FORUM_POSTS', min }                  mensajes en foros
 *  { type: 'COMPETENCY_SCORE', min }             nota >= min en la competencia de la insignia
 *  { type: 'CERTIFICATES', min }                 certificados obtenidos
 */
export async function evaluateBadges(userId: number) {
  const [badges, owned] = await Promise.all([
    prisma.badge.findMany({ where: { isActive: true } }),
    prisma.achievement.findMany({ where: { userId }, select: { badgeId: true } }),
  ]);
  const has = new Set(owned.map((o) => o.badgeId));
  const pending = badges.filter((b) => !has.has(b.id));
  if (!pending.length) return;

  const cache: Record<string, number> = {};
  const metric = async (type: string, competencyId?: number | null): Promise<number> => {
    const key = type + (competencyId ?? '');
    if (key in cache) return cache[key]!;
    let v = 0;
    switch (type) {
      case 'POINTS':
        v = (await prisma.studentProfile.findUnique({ where: { userId } }))?.points ?? 0;
        break;
      case 'COURSES_COMPLETED':
        v = await prisma.enrollment.count({ where: { userId, status: 'COMPLETED' } });
        break;
      case 'LESSONS_COMPLETED':
        v = await prisma.lessonProgress.count({ where: { userId, status: 'COMPLETED' } });
        break;
      case 'SIMULATIONS_COMPLETED':
        v = await prisma.aiSimulation.count({ where: { userId, status: 'COMPLETED' } });
        break;
      case 'FORUM_POSTS':
        v = await prisma.forumPost.count({ where: { authorId: userId } });
        break;
      case 'CERTIFICATES':
        v = await prisma.certificate.count({ where: { userId, status: 'VALID' } });
        break;
      case 'COMPETENCY_SCORE': {
        if (!competencyId) break;
        const last = await prisma.studentCompetency.findFirst({ where: { userId, competencyId, isReviewed: true }, orderBy: { recordedAt: 'desc' } });
        v = last ? Number(last.score) : 0;
        break;
      }
    }
    cache[key] = v;
    return v;
  };

  for (const b of pending) {
    const c = b.criteria as { type?: string; min?: number };
    if (!c?.type || c.min == null) continue;
    if ((await metric(c.type, b.competencyId)) >= c.min) {
      await prisma.achievement.create({ data: { userId, badgeId: b.id } }).catch(() => null);
      await notify(userId, { type: 'BADGE', title: `Nueva insignia: ${b.name}`, body: b.description, link: '/campus/logros' });
    }
  }
}
