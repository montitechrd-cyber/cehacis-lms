import fs from 'node:fs';
import path from 'node:path';
import { prisma } from '../../lib/prisma.js';
import { filePath, fileUrl } from '../../lib/upload.js';
import { badRequest, forbidden, notFound } from '../../lib/errors.js';
import { recalcEnrollment, tryCompleteLessons } from '../classroom/classroom.service.js';

export const SUBMISSION_TYPES = ['VIDEO', 'AUDIO', 'FILE', 'TEXT', 'LINK'] as const;
export type SubmissionType = (typeof SUBMISSION_TYPES)[number];

export const TYPE_EXT: Record<'VIDEO' | 'AUDIO' | 'FILE', string[]> = {
  VIDEO: ['.mp4', '.webm', '.mov'],
  AUDIO: ['.mp3', '.m4a', '.wav', '.ogg', '.webm'],
  FILE: ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.zip', '.png', '.jpg', '.jpeg', '.webp', '.gif'],
};

export const userSel = { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } as const;

export const round2 = (n: number) => Math.round(n * 100) / 100;

export function allowedTypes(a: { submissionTypes: unknown }): SubmissionType[] {
  const v = Array.isArray(a.submissionTypes) ? (a.submissionTypes as string[]).filter((t): t is SubmissionType => (SUBMISSION_TYPES as readonly string[]).includes(t)) : [];
  return v.length ? v : [...SUBMISSION_TYPES];
}

export function fileOut(f: { id: number; originalName: string; mimeType: string; size: number }) {
  return { id: f.id, name: f.originalName, mimeType: f.mimeType, size: f.size, url: fileUrl(f.id) };
}

/** Elimina archivos subidos por multer (cuando la entrega se rechaza). */
export function discardUploads(files: Express.Multer.File[] | undefined) {
  for (const f of files ?? []) {
    try {
      fs.unlinkSync(filePath(path.basename(f.filename)));
    } catch {
      /* ya no existe */
    }
  }
}

export async function isEnrolled(userId: number, courseId: number) {
  const e = await prisma.enrollment.findUnique({ where: { userId_courseId: { userId, courseId } } });
  return !!e && (e.status === 'ACTIVE' || e.status === 'COMPLETED');
}

export async function loadActivity(id: number) {
  const a = await prisma.practicalActivity.findUnique({ where: { id } });
  if (!a) throw notFound('Actividad no encontrada');
  return a;
}

export async function loadGroup(gid: number) {
  const g = await prisma.activityGroup.findUnique({ where: { id: gid }, include: { activity: true } });
  if (!g) throw notFound('Grupo no encontrado');
  return g;
}

export const groupInclude = {
  members: { include: { user: { select: userSel } }, orderBy: { userId: 'asc' as const } },
} as const;

export function groupOut(g: { id: number; name: string; activityId: number; members: { userId: number; role: string | null; user: unknown }[] }) {
  return {
    id: g.id,
    activityId: g.activityId,
    name: g.name,
    members: g.members.map((m) => ({ userId: m.userId, role: m.role, user: m.user })),
  };
}

/** Estudiantes a los que aplica una entrega: los miembros del grupo, o el autor. */
export async function submissionStudents(sub: { userId: number; groupId: number | null }) {
  if (!sub.groupId) return [sub.userId];
  const m = await prisma.activityGroupMember.findMany({ where: { groupId: sub.groupId }, select: { userId: true } });
  return [...new Set([sub.userId, ...m.map((x) => x.userId)])];
}

/** Puntuación ponderada de una rúbrica sobre activity.maxScore (2 decimales). */
export function weightedScore(
  criteria: { id: number; weight: number; maxScore: number }[],
  scores: { criterionId: number; score: number }[],
  maxScore: number,
) {
  const by = new Map(scores.map((s) => [s.criterionId, s.score]));
  let num = 0;
  let den = 0;
  for (const c of criteria) {
    num += ((by.get(c.id) ?? 0) / c.maxScore) * c.weight;
    den += c.weight;
  }
  return den ? round2((num / den) * maxScore) : 0;
}

/** Valida rangos y pertenencia de las puntuaciones a los criterios. Exige cubrir todos los criterios. */
export function validateCriterionScores(
  criteria: { id: number; title: string; maxScore: number }[],
  scores: { criterionId: number; score: number }[],
  requireAll = true,
) {
  const errors: Record<string, string> = {};
  const byId = new Map(criteria.map((c) => [c.id, c]));
  const seen = new Set<number>();
  scores.forEach((s, i) => {
    const c = byId.get(s.criterionId);
    if (!c) errors[`rubricScores.${i}.criterionId`] = 'El criterio no pertenece a la rúbrica de la actividad';
    else if (seen.has(s.criterionId)) errors[`rubricScores.${i}.criterionId`] = 'Criterio repetido';
    else if (s.score < 0 || s.score > c.maxScore) errors[`rubricScores.${i}.score`] = `${c.title}: la nota debe estar entre 0 y ${c.maxScore}`;
    seen.add(s.criterionId);
  });
  if (requireAll) for (const c of criteria) if (!seen.has(c.id)) errors[`criterion.${c.id}`] = `Falta calificar el criterio "${c.title}"`;
  if (Object.keys(errors).length) throw badRequest('Revisa las puntuaciones de la rúbrica', errors);
}

/** Recalcula progreso del alumno tras una entrega o calificación. Nunca lanza. */
export async function refreshProgress(userId: number, courseId: number) {
  try {
    await tryCompleteLessons(userId, courseId);
    await recalcEnrollment(userId, courseId);
  } catch (e) {
    console.error('[activities] refreshProgress', e);
  }
}

export async function courseInstructorIds(courseId: number) {
  const rows = await prisma.courseInstructor.findMany({ where: { courseId }, select: { instructorId: true } });
  return rows.map((r) => r.instructorId);
}

/** Grupo del usuario en una actividad (o null). */
export async function myGroupFor(activityId: number, userId: number) {
  return prisma.activityGroup.findFirst({
    where: { activityId, members: { some: { userId } } },
    include: groupInclude,
  });
}

export function assertPublished(a: { isPublished: boolean }, staff: boolean) {
  if (!a.isPublished && !staff) throw forbidden('Esta actividad aún no está publicada');
}
