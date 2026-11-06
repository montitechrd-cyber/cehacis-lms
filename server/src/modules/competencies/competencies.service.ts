import type { Request } from 'express';
import type { CompetencySource, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { forbidden } from '../../lib/errors.js';

export interface RecordCompetencyInput {
  userId: number;
  competencyId: number;
  score: number;
  scaleMax: number;
  source: CompetencySource;
  courseId?: number | null;
  sourceRefId?: number | null;
  evaluatorId?: number | null;
  notes?: string | null;
  isReviewed?: boolean;
}

/** Registra un resultado de competencia para un estudiante. */
export function recordCompetency(i: RecordCompetencyInput) {
  return prisma.studentCompetency.create({
    data: {
      userId: i.userId,
      competencyId: i.competencyId,
      score: Math.round(i.score * 100) / 100,
      scaleMax: i.scaleMax,
      source: i.source,
      courseId: i.courseId ?? null,
      sourceRefId: i.sourceRefId ?? null,
      evaluatorId: i.evaluatorId ?? null,
      notes: i.notes ?? null,
      isReviewed: i.isReviewed ?? true,
    },
  });
}

export function scaleOf(s: { min: number; max: number; labels: Prisma.JsonValue } | null | undefined) {
  if (!s) return { min: 1, max: 5, labels: null as string[] | null };
  return { min: s.min, max: s.max, labels: Array.isArray(s.labels) ? (s.labels as string[]) : null };
}

/** ¿El facilitador imparte algún curso donde el alumno está inscrito? (courseId opcional para uno concreto) */
export async function teachesStudent(instructorId: number, studentId: number, courseId?: number | null) {
  const where: Prisma.EnrollmentWhereInput = {
    userId: studentId,
    status: { in: ['ACTIVE', 'COMPLETED'] },
    course: { instructors: { some: { instructorId } } },
  };
  if (courseId) where.courseId = courseId;
  return (await prisma.enrollment.count({ where })) > 0;
}

/** Verifica que req.user pueda ver al estudiante. `staff` es true si NO es el propio alumno. */
export async function assertStudentAccess(req: Request, studentId: number): Promise<{ staff: boolean }> {
  const u = req.user!;
  if (u.permissions.has('students.manage')) return { staff: true };
  if (u.id === studentId) return { staff: false };
  if (u.permissions.has('students.view_assigned') && (await teachesStudent(u.id, studentId))) return { staff: true };
  throw forbidden();
}

export async function studentHistory(studentId: number, includeUnreviewed: boolean) {
  const rows = await prisma.studentCompetency.findMany({
    where: { userId: studentId, ...(includeUnreviewed ? {} : { isReviewed: true }) },
    orderBy: { recordedAt: 'asc' },
    include: {
      competency: { select: { id: true, key: true, name: true, group: true } },
      course: { select: { id: true, title: true } },
      evaluator: { select: { id: true, firstName: true, lastName: true } },
    },
  });
  const map = new Map<number, typeof rows>();
  for (const r of rows) {
    const arr = map.get(r.competencyId) ?? [];
    arr.push(r);
    map.set(r.competencyId, arr);
  }
  const competencies = [...map.values()].map((list) => {
    const reviewed = list.filter((x) => x.isReviewed);
    const base = reviewed.length ? reviewed : list;
    const last = base[base.length - 1]!;
    const avg = base.reduce((s, x) => s + Number(x.score), 0) / base.length;
    const trend = base.length > 1 ? Number(last.score) - Number(base[0]!.score) : 0;
    return {
      competency: list[0]!.competency,
      latest: { score: Number(last.score), scaleMax: last.scaleMax, source: last.source, recordedAt: last.recordedAt },
      average: Math.round(avg * 100) / 100,
      count: list.length,
      trend: Math.round(trend * 100) / 100,
      history: list.map((x) => ({
        id: x.id,
        score: Number(x.score),
        scaleMax: x.scaleMax,
        source: x.source,
        course: x.course,
        evaluator: x.evaluator,
        notes: x.notes,
        isReviewed: x.isReviewed,
        recordedAt: x.recordedAt,
      })),
    };
  });
  competencies.sort((a, b) => a.competency.name.localeCompare(b.competency.name));
  return { competencies };
}
