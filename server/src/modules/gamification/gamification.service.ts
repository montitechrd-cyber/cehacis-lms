import { prisma } from '../../lib/prisma.js';

export const BADGE_CRITERIA = ['POINTS', 'COURSES_COMPLETED', 'LESSONS_COMPLETED', 'SIMULATIONS_COMPLETED', 'FORUM_POSTS', 'COMPETENCY_SCORE', 'CERTIFICATES'] as const;
export const CHALLENGE_CRITERIA = ['LESSONS_COMPLETED', 'ASSESSMENTS_PASSED', 'FORUM_POSTS', 'SIMULATIONS_COMPLETED', 'ACTIVITIES_SUBMITTED', 'ATTENDANCE'] as const;

/** Valor actual de una métrica de insignia para un usuario (mismos criterios que lib/gamification.ts). */
export async function badgeMetric(userId: number, type: string, competencyId?: number | null): Promise<number> {
  switch (type) {
    case 'POINTS':
      return (await prisma.studentProfile.findUnique({ where: { userId } }))?.points ?? 0;
    case 'COURSES_COMPLETED':
      return prisma.enrollment.count({ where: { userId, status: 'COMPLETED' } });
    case 'LESSONS_COMPLETED':
      return prisma.lessonProgress.count({ where: { userId, status: 'COMPLETED' } });
    case 'SIMULATIONS_COMPLETED':
      return prisma.aiSimulation.count({ where: { userId, status: 'COMPLETED' } });
    case 'FORUM_POSTS':
      return prisma.forumPost.count({ where: { authorId: userId } });
    case 'CERTIFICATES':
      return prisma.certificate.count({ where: { userId, status: 'VALID' } });
    case 'COMPETENCY_SCORE': {
      if (!competencyId) return 0;
      const last = await prisma.studentCompetency.findFirst({ where: { userId, competencyId, isReviewed: true }, orderBy: { recordedAt: 'desc' } });
      return last ? Number(last.score) : 0;
    }
    default:
      return 0;
  }
}

/** Progreso de un reto: cuenta eventos del usuario dentro de [startsAt, endsAt]. */
export async function challengeProgress(userId: number, ch: { startsAt: Date; endsAt: Date; criteria: unknown }) {
  const c = (ch.criteria ?? {}) as { type?: string; target?: number };
  const target = Number(c.target) || 0;
  const range = { gte: ch.startsAt, lte: ch.endsAt };
  let current = 0;
  switch (c.type) {
    case 'LESSONS_COMPLETED':
      current = await prisma.lessonProgress.count({ where: { userId, status: 'COMPLETED', completedAt: range } });
      break;
    case 'ASSESSMENTS_PASSED':
      current = await prisma.assessmentAttempt.count({ where: { userId, passed: true, submittedAt: range } });
      break;
    case 'FORUM_POSTS':
      current = await prisma.forumPost.count({ where: { authorId: userId, createdAt: range } });
      break;
    case 'SIMULATIONS_COMPLETED':
      current = await prisma.aiSimulation.count({ where: { userId, status: 'COMPLETED', endedAt: range } });
      break;
    case 'ACTIVITIES_SUBMITTED':
      current = await prisma.activitySubmission.count({ where: { userId, submittedAt: range } });
      break;
    case 'ATTENDANCE':
      current = await prisma.attendance.count({ where: { userId, status: { in: ['PRESENT', 'LATE'] }, recordedAt: range } });
      break;
  }
  return { current, target };
}
