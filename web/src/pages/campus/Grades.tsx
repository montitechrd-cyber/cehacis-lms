import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { DataTable, Tag, statusTone, type Column } from '@/components/ui/Data';
import { EmptyState, ErrorState, SkeletonRows } from '@/components/ui/Feedback';
import { ButtonLink } from '@/components/ui/Button';
import { PageHeader, Section } from '@/components/ui/Page';
import { api } from '@/lib/api';
import { ACTIVITY_TYPES, ASSESSMENT_TYPES, dateTime, fullName, pct, relative } from '@/lib/format';

interface GA {
  id: number;
  title: string;
  type: string;
  weight: number;
  passingScore: number;
  maxAttempts: number;
  attemptsUsed: number;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'GRADED';
  bestPercentage: number | null;
  passed: boolean | null;
  pendingGrading: boolean;
}
interface GC {
  course: { id: number; title: string; slug: string };
  enrollmentStatus: string;
  progressPct: number;
  finalGrade: number | null;
  assessments: GA[];
}
interface Act {
  id: number;
  title: string;
  type: string;
  maxScore: number;
  dueDate: string | null;
  isOverdue: boolean;
  course: { id: number; title: string };
  mySubmission: { id: number; status: string; score: number | null; submittedAt: string } | null;
}
interface Fb {
  id: number;
  target: 'SUBMISSION' | 'ATTEMPT';
  comment: string | null;
  observations: string | null;
  recommendations: string | null;
  totalScore: number | null;
  createdAt: string;
  author: { firstName: string; lastName: string };
  course: { id: number; title: string } | null;
  activity: { id: number; title: string; maxScore: number } | null;
  assessment: { id: number; title: string } | null;
  rubricScores: { id: number; criterion: { title: string; maxScore: number }; score: number; comment: string | null }[];
}

const STATUS: Record<string, string> = { NOT_STARTED: 'Sin iniciar', IN_PROGRESS: 'En curso', SUBMITTED: 'En calificación', GRADED: 'Calificada' };
const SUB: Record<string, string> = { SUBMITTED: 'Entregada', GRADED: 'Calificada', RETURNED: 'Devuelta' };

export default function Grades() {
  const g = useQuery({ queryKey: ['assessments', 'grades'], queryFn: () => api.get<{ data: GC[] }>('/assessments/me/grades') });
  const a = useQuery({ queryKey: ['activities', 'me'], queryFn: () => api.get<Act[]>('/activities/me') });
  const f = useQuery({ queryKey: ['activities', 'feedback'], queryFn: () => api.get<Fb[]>('/activities/feedback/me') });

  const aCols: Column<GA>[] = [
    { key: 't', header: 'Evaluación', cell: (r) => <Link to={`/campus/evaluaciones/${r.id}`} className="font-semibold hover:underline">{r.title}</Link> },
    { key: 'ty', header: 'Tipo', cell: (r) => ASSESSMENT_TYPES[r.type] ?? r.type },
    { key: 'i', header: 'Intentos', align: 'right', cell: (r) => `${r.attemptsUsed}/${r.maxAttempts === 0 ? '∞' : r.maxAttempts}` },
    { key: 'b', header: 'Mejor nota', align: 'right', cell: (r) => (r.bestPercentage != null ? pct(r.bestPercentage, 1) : '—') },
    { key: 's', header: 'Estado', cell: (r) => (r.pendingGrading ? <Tag tone="warning">Pendiente de calificar</Tag> : r.status === 'GRADED' && r.passed != null ? <Tag tone={r.passed ? 'success' : 'danger'}>{r.passed ? 'Aprobada' : 'No aprobada'}</Tag> : <Tag tone={statusTone(r.status)}>{STATUS[r.status]}</Tag>) },
  ];
  const pCols: Column<Act>[] = [
    { key: 't', header: 'Práctica', cell: (r) => <Link to={`/campus/practicas/${r.id}`} className="font-semibold hover:underline">{r.title}</Link> },
    { key: 'ty', header: 'Tipo', cell: (r) => ACTIVITY_TYPES[r.type] ?? r.type },
    { key: 'd', header: 'Fecha límite', cell: (r) => (r.dueDate ? dateTime(r.dueDate) : '—') },
    { key: 'n', header: 'Nota', align: 'right', cell: (r) => (r.mySubmission?.score != null ? `${r.mySubmission.score}/${r.maxScore}` : '—') },
    { key: 's', header: 'Estado', cell: (r) => (r.mySubmission ? <Tag tone={statusTone(r.mySubmission.status)}>{SUB[r.mySubmission.status] ?? r.mySubmission.status}</Tag> : <Tag tone={r.isOverdue ? 'danger' : 'warning'}>{r.isOverdue ? 'Vencida' : 'Sin entregar'}</Tag>) },
  ];

  return (
    <div>
      <PageHeader title="Calificaciones" description="Tus notas de evaluaciones y prácticas, y la retroalimentación que has recibido." />
      {g.isLoading ? (
        <SkeletonRows rows={4} />
      ) : g.error ? (
        <ErrorState error={g.error} onRetry={() => g.refetch()} />
      ) : !g.data?.data.length ? (
        <EmptyState title="Aún no tienes calificaciones" description="Inscríbete en un curso para ver aquí tus notas." action={<ButtonLink to="/cursos" variant="primary">Explorar el catálogo</ButtonLink>} />
      ) : (
        g.data.data.map((c) => {
          const acts = (a.data ?? []).filter((x) => x.course.id === c.course.id);
          return (
            <Section
              key={c.course.id}
              title={<Link to={`/campus/cursos/${c.course.id}`} className="no-underline hover:underline">{c.course.title}</Link>}
              description={`Progreso ${pct(c.progressPct)}${c.finalGrade != null ? ` · Nota final ${c.finalGrade}` : ''}`}
            >
              <DataTable columns={aCols} rows={c.assessments} rowKey={(r) => r.id} empty={<p className="border-y border-line py-5 text-sm text-graphite">Sin evaluaciones publicadas.</p>} />
              <div className="mt-6">
                {a.isLoading ? <SkeletonRows rows={2} /> : a.error ? <ErrorState error={a.error} onRetry={() => a.refetch()} /> : (
                  <DataTable columns={pCols} rows={acts} rowKey={(r) => r.id} empty={<p className="border-y border-line py-5 text-sm text-graphite">Sin prácticas publicadas.</p>} />
                )}
              </div>
            </Section>
          );
        })
      )}

      <Section title="Retroalimentación recibida">
        {f.isLoading ? (
          <SkeletonRows rows={3} />
        ) : f.error ? (
          <ErrorState error={f.error} onRetry={() => f.refetch()} />
        ) : !f.data?.length ? (
          <p className="border-y border-line py-6 text-sm text-graphite">Todavía no has recibido retroalimentación.</p>
        ) : (
          <ul className="divide-y divide-line border-y border-line">
            {f.data.map((x) => {
              const to = x.activity ? `/campus/practicas/${x.activity.id}` : x.assessment ? `/campus/evaluaciones/${x.assessment.id}` : null;
              const title = x.activity?.title ?? x.assessment?.title ?? 'Retroalimentación';
              return (
                <li key={x.id} className="py-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-semibold">{to ? <Link to={to} className="hover:underline">{title}</Link> : title}</p>
                    {x.totalScore != null && <p className="text-lg font-bold tnum">{x.totalScore}{x.activity ? `/${x.activity.maxScore}` : ''}</p>}
                  </div>
                  <p className="text-xs text-graphite">{x.course?.title ? `${x.course.title} · ` : ''}{fullName(x.author)} · {relative(x.createdAt)}</p>
                  {x.rubricScores.length > 0 && (
                    <ul className="mt-3 grid gap-x-8 text-sm sm:grid-cols-2">
                      {x.rubricScores.map((s) => (
                        <li key={s.id} className="flex justify-between gap-3 border-b border-line py-1.5">
                          <span>{s.criterion.title}</span>
                          <span className="font-semibold tnum">{s.score}/{s.criterion.maxScore}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {x.comment && <p className="mt-3 whitespace-pre-wrap text-sm">{x.comment}</p>}
                  {x.observations && <p className="mt-2 whitespace-pre-wrap text-sm"><strong>Observaciones: </strong>{x.observations}</p>}
                  {x.recommendations && <p className="mt-2 whitespace-pre-wrap text-sm"><strong>Recomendaciones: </strong>{x.recommendations}</p>}
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </div>
  );
}
