import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../lib/errors.js';
import { getAi } from '../../integrations/ai/anthropic.js';

export interface Recommendation {
  type: 'course' | 'activity' | 'exercise';
  refId: number | null;
  courseId: number | null;
  title: string;
  reason: string;
}

const r1 = (n: number) => Math.round(n * 10) / 10;

async function gatherContext(userId: number) {
  const [records, enrollments] = await Promise.all([
    prisma.studentCompetency.findMany({
      where: { userId },
      orderBy: { recordedAt: 'desc' },
      select: { competencyId: true, score: true, scaleMax: true, competency: { select: { id: true, name: true } } },
    }),
    prisma.enrollment.findMany({ where: { userId, status: { not: 'CANCELLED' } }, select: { courseId: true, status: true } }),
  ]);

  // última puntuación por competencia, normalizada a escala 0..5
  const latest = new Map<number, { id: number; name: string; score: number }>();
  for (const rec of records) {
    if (!latest.has(rec.competencyId)) {
      latest.set(rec.competencyId, { id: rec.competency.id, name: rec.competency.name, score: r1((Number(rec.score) / (rec.scaleMax || 5)) * 5) });
    }
  }
  const competencies = [...latest.values()].sort((a, b) => a.score - b.score);

  const enrolledIds = enrollments.map((e) => e.courseId);
  const activeIds = enrollments.filter((e) => e.status === 'ACTIVE').map((e) => e.courseId);

  const [courses, activities] = await Promise.all([
    prisma.course.findMany({
      where: { status: 'PUBLISHED', deletedAt: null, id: { notIn: enrolledIds.length ? enrolledIds : [0] } },
      take: 60,
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true, level: true, subtitle: true, competencies: { select: { competencyId: true } } },
    }),
    activeIds.length
      ? prisma.practicalActivity.findMany({
          where: { courseId: { in: activeIds }, isPublished: true, submissions: { none: { userId } } },
          take: 30,
          orderBy: [{ dueDate: 'asc' }, { id: 'asc' }],
          select: { id: true, title: true, type: true, dueDate: true, courseId: true, course: { select: { title: true } }, competencies: { select: { competencyId: true } } },
        })
      : Promise.resolve([]),
  ]);

  return {
    competencies,
    courses: courses.map((c) => ({ id: c.id, title: c.title, level: c.level, subtitle: c.subtitle, competencyIds: c.competencies.map((x) => x.competencyId) })),
    activities: activities.map((a) => ({
      id: a.id, title: a.title, type: a.type, dueDate: a.dueDate, courseId: a.courseId, courseTitle: a.course.title, competencyIds: a.competencies.map((x) => x.competencyId),
    })),
  };
}

type Ctx = Awaited<ReturnType<typeof gatherContext>>;

function byRules(ctx: Ctx): Recommendation[] {
  const out: Recommendation[] = [];
  const used = new Set<number>();
  const low = ctx.competencies.slice(0, 3);

  for (const comp of low) {
    for (const c of ctx.courses.filter((x) => x.competencyIds.includes(comp.id) && !used.has(x.id)).slice(0, 2)) {
      used.add(c.id);
      out.push({ type: 'course', refId: c.id, courseId: c.id, title: c.title, reason: `Desarrolla la competencia "${comp.name}", donde tu puntaje más reciente es ${comp.score} de 5.` });
    }
  }
  for (const a of ctx.activities.slice(0, 3)) {
    out.push({
      type: 'activity', refId: a.id, courseId: a.courseId, title: a.title,
      reason: `Tienes una actividad práctica pendiente en "${a.courseTitle}"${a.dueDate ? ` con fecha límite ${a.dueDate.toISOString().slice(0, 10)}` : ''}.`,
    });
  }
  if (!ctx.competencies.length) {
    out.unshift({
      type: 'exercise', refId: null, courseId: null, title: 'Realiza una simulación de diagnóstico',
      reason: 'Aún no tienes competencias registradas. Una simulación con el entrenador de IA o una evaluación diagnóstica ayuda a identificar tu punto de partida.',
    });
    for (const c of ctx.courses.filter((x) => x.level === 'BASIC').slice(0, 3)) {
      out.push({ type: 'course', refId: c.id, courseId: c.id, title: c.title, reason: 'Curso de nivel básico recomendado para comenzar a desarrollar tus habilidades.' });
    }
  }
  return out.slice(0, 6);
}

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['recommendations'],
  properties: {
    recommendations: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['type', 'refId', 'title', 'reason'],
        properties: {
          type: { type: 'string', enum: ['course', 'activity', 'exercise'] },
          refId: { type: ['integer', 'null'] },
          title: { type: 'string' },
          reason: { type: 'string' },
        },
      },
    },
  },
} as const;

const SYSTEM = `Eres el orientador académico de CEHACIS (habilidades de comunicación y habilidades sociales). Recomiendas, en español, los siguientes pasos de aprendizaje a un estudiante a partir de sus competencias, los cursos disponibles y sus actividades pendientes.
Reglas:
- Máximo 6 recomendaciones, priorizando las competencias con menor puntaje.
- type "course": refId debe ser un id de la lista de cursos. type "activity": refId debe ser un id de la lista de actividades. type "exercise": ejercicio práctico breve que propones tú, con refId null.
- No inventes cursos ni actividades ni ids. No hagas diagnósticos psicológicos.
- "reason" explica en una o dos frases por qué le conviene, citando la competencia cuando aplique.`;

/** Devuelve { source, recommendations, tokensIn, tokensOut }. Usa IA si está configurada; si falla, cae a reglas. */
export async function recommend(userId: number) {
  const ctx = await gatherContext(userId);
  const ai = getAi();
  if (ai.isConfigured()) {
    try {
      const prompt = JSON.stringify({
        competencias_del_estudiante_de_menor_a_mayor_puntaje_sobre_5: ctx.competencies.slice(0, 12).map((c) => ({ id: c.id, nombre: c.name, puntaje: c.score })),
        cursos_disponibles_no_inscrito: ctx.courses.map((c) => ({ id: c.id, titulo: c.title, nivel: c.level, competenciaIds: c.competencyIds })),
        actividades_practicas_pendientes: ctx.activities.map((a) => ({ id: a.id, titulo: a.title, curso: a.courseTitle, tipo: a.type, competenciaIds: a.competencyIds })),
      });
      const res = await ai.json<{ recommendations?: { type?: string; refId?: number | null; title?: string; reason?: string }[] }>(SYSTEM, prompt, SCHEMA as unknown as Record<string, unknown>, { maxTokens: 2000 });
      const courseMap = new Map(ctx.courses.map((c) => [c.id, c]));
      const actMap = new Map(ctx.activities.map((a) => [a.id, a]));
      const recs: Recommendation[] = [];
      for (const x of res.data.recommendations ?? []) {
        const title = String(x.title ?? '').trim().slice(0, 200);
        const reason = String(x.reason ?? '').trim().slice(0, 600);
        if (!title || !reason) continue;
        if (x.type === 'course' && x.refId != null && courseMap.has(x.refId)) {
          recs.push({ type: 'course', refId: x.refId, courseId: x.refId, title: courseMap.get(x.refId)!.title, reason });
        } else if (x.type === 'activity' && x.refId != null && actMap.has(x.refId)) {
          const a = actMap.get(x.refId)!;
          recs.push({ type: 'activity', refId: a.id, courseId: a.courseId, title: a.title, reason });
        } else if (x.type === 'exercise') {
          recs.push({ type: 'exercise', refId: null, courseId: null, title, reason });
        }
      }
      if (recs.length) return { source: 'ia' as const, recommendations: recs.slice(0, 6), tokensIn: res.tokensIn, tokensOut: res.tokensOut };
    } catch (e) {
      if (!(e instanceof AppError)) throw e;
      // proveedor saturado o con error: se usan las reglas
    }
  }
  return { source: 'reglas' as const, recommendations: byRules(ctx), tokensIn: undefined, tokensOut: undefined };
}
