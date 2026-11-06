import { useState } from 'react';
import { useLocation, useParams, useSearchParams } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, X } from 'lucide-react';
import clsx from 'clsx';
import { Alert, ErrorState, PageLoader } from '@/components/ui/Feedback';
import { Button, ButtonLink } from '@/components/ui/Button';
import { DataTable, Facts, Tag, statusTone, type Column } from '@/components/ui/Data';
import { PageHeader, Section } from '@/components/ui/Page';
import { api } from '@/lib/api';
import { useAction } from '@/lib/hooks';
import { ASSESSMENT_TYPES, QUESTION_TYPES, dateTime, pct } from '@/lib/format';
import { AttemptRunner, type StartedAttempt } from '@/features/classroom/AttemptRunner';

interface Overview {
  assessment: { id: number; courseId: number; title: string; description: string | null; type: string; timeLimitMin: number | null; maxAttempts: number; passingScore: number; questionCount: number; availableFrom: string | null; availableUntil: string | null };
  attempts: { id: number; status: string; percentage: number | null; passed: boolean | null; submittedAt: string | null }[];
  attemptsRemaining: number | null;
  canStart: boolean;
  reason: string | null;
  inProgressAttemptId: number | null;
}
interface Result {
  attempt: { id: number; status: string; submittedAt: string | null; score: number | null; maxScore: number | null; percentage: number | null; passed: boolean | null; feedback: string | null };
  assessment: { id: number; title: string; type: string; passingScore: number; showResults: boolean };
  showResults: boolean;
  pendingManualGrading: boolean;
  questions?: {
    id: number;
    type: string;
    text: string;
    points: number;
    scaleMax: number | null;
    options: { id: number; text: string; isCorrect?: boolean }[];
    selectedOptionIds: number[] | null;
    textAnswer: string | null;
    scaleValue: number | null;
    isCorrect: boolean | null;
    pointsAwarded: number | null;
    feedback: string | null;
    explanation: string | null;
  }[];
}

const ATT_STATUS: Record<string, string> = { IN_PROGRESS: 'En curso', SUBMITTED: 'Pendiente de calificar', GRADED: 'Calificado' };

function ResultView({ attemptId, courseId, lessonId, onAgain, canAgain }: { attemptId: number; courseId?: number; lessonId?: number; onAgain: () => void; canAgain: boolean }) {
  const q = useQuery({ queryKey: ['attempt-result', attemptId], queryFn: () => api.get<Result>(`/assessments/attempts/${attemptId}/result`) });
  if (q.isLoading) return <PageLoader />;
  if (q.error || !q.data) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const r = q.data;
  const pending = r.pendingManualGrading;
  return (
    <div>
      <div className="animate-rise border-b border-ink pb-8">
        <p className="text-[clamp(3rem,2rem+5vw,6rem)] font-bold leading-none tracking-[-0.05em] tnum">{r.attempt.percentage != null ? pct(r.attempt.percentage, r.attempt.percentage % 1 ? 1 : 0) : '—'}</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {pending ? <Tag tone="warning">Pendiente de calificación</Tag> : r.attempt.passed != null ? <Tag tone={r.attempt.passed ? 'success' : 'danger'}>{r.attempt.passed ? 'Aprobado' : 'No aprobado'}</Tag> : null}
          {r.attempt.score != null && <span className="text-sm text-graphite tnum">{r.attempt.score} de {r.attempt.maxScore} puntos · mínimo para aprobar {r.assessment.passingScore} %</span>}
        </div>
        {pending && (
          <div className="mt-5 max-w-xl">
            <Alert tone="warning" title="Tu facilitador debe calificar las respuestas abiertas">
              La nota mostrada es provisional (las preguntas abiertas cuentan como 0 por ahora). Te notificaremos cuando esté lista.
            </Alert>
          </div>
        )}
        {r.attempt.feedback && <p className="mt-5 max-w-xl whitespace-pre-wrap text-sm">{r.attempt.feedback}</p>}
        <div className="mt-6 flex flex-wrap gap-3">
          {lessonId && <ButtonLink to={`/campus/leccion/${lessonId}`} variant="primary">Volver a la lección</ButtonLink>}
          {courseId && <ButtonLink to={`/campus/cursos/${courseId}`} variant={lessonId ? 'outline' : 'primary'}>Volver al curso</ButtonLink>}
          {canAgain && <Button variant="outline" onClick={onAgain}>Ver resumen e intentar de nuevo</Button>}
        </div>
      </div>

      {r.showResults && r.questions ? (
        <Section title="Detalle por pregunta" className="mt-10">
          <ol className="divide-y divide-line border-y border-line">
            {r.questions.map((qu, i) => (
              <li key={qu.id} className="py-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <p className="max-w-2xl font-semibold"><span className="mr-2 text-muted tnum">{i + 1}.</span>{qu.text}</p>
                  {qu.isCorrect === true ? <Tag tone="success"><Check className="size-3" aria-hidden /> Correcta</Tag> : qu.isCorrect === false ? <Tag tone="danger"><X className="size-3" aria-hidden /> Incorrecta</Tag> : qu.type === 'OPEN' && qu.pointsAwarded == null ? <Tag tone="warning">Por calificar</Tag> : <Tag tone="neutral">{QUESTION_TYPES[qu.type]}</Tag>}
                </div>
                {qu.options.length > 0 && (
                  <ul className="mt-3 space-y-1.5 text-sm">
                    {qu.options.map((o) => {
                      const sel = qu.selectedOptionIds?.includes(o.id);
                      return (
                        <li key={o.id} className={clsx('flex items-center gap-2 border px-3 py-2', o.isCorrect ? 'border-ink bg-stone' : sel ? 'border-danger bg-danger-soft' : 'border-line')}>
                          <span className="flex-1">{o.text}</span>
                          {sel && <span className="text-xs font-semibold">Tu respuesta</span>}
                          {o.isCorrect && <span className="text-xs font-semibold">Correcta</span>}
                        </li>
                      );
                    })}
                  </ul>
                )}
                {qu.type === 'OPEN' && <p className="mt-3 whitespace-pre-wrap bg-stone p-3 text-sm">{qu.textAnswer || 'Sin respuesta'}</p>}
                {qu.type === 'SCALE' && <p className="mt-3 text-sm">Tu valor: <strong className="tnum">{qu.scaleValue ?? '—'}</strong> de {qu.scaleMax}</p>}
                {qu.pointsAwarded != null && <p className="mt-2 text-xs text-muted tnum">{qu.pointsAwarded} / {qu.points} puntos</p>}
                {qu.explanation && <p className="mt-3 text-sm text-graphite"><strong>Explicación: </strong>{qu.explanation}</p>}
                {qu.feedback && <p className="mt-2 text-sm text-graphite"><strong>Comentario: </strong>{qu.feedback}</p>}
              </li>
            ))}
          </ol>
        </Section>
      ) : (
        <p className="mt-8 text-sm text-graphite">El detalle por pregunta no está habilitado para esta evaluación.</p>
      )}
    </div>
  );
}

export default function Assessment() {
  const id = Number(useParams().assessmentId);
  const lessonId = (useLocation().state as { lessonId?: number } | null)?.lessonId;
  const qc = useQueryClient();
  const [sp, setSp] = useSearchParams();
  const resultId = Number(sp.get('resultado')) || null;
  const [run, setRun] = useState<StartedAttempt | null>(null);

  const ov = useQuery({ queryKey: ['assessment', id, 'overview'], queryFn: () => api.get<Overview>(`/assessments/${id}/overview`) });
  const start = useAction(() => api.post<StartedAttempt>(`/assessments/${id}/attempts`), { onSuccess: (r) => setRun(r) });

  if (ov.isLoading) return <PageLoader />;
  if (ov.error || !ov.data) return <ErrorState error={ov.error} onRetry={() => ov.refetch()} />;
  const { assessment: a, attempts } = ov.data;
  const crumbs = [{ label: 'Mis cursos', to: '/campus/cursos' }, { label: 'Curso', to: `/campus/cursos/${a.courseId}` }, { label: a.title }];

  if (run)
    return (
      <div>
        <h1 className="sr-only">{a.title}</h1>
        <AttemptRunner
          key={run.attempt.id}
          run={run}
          onSubmitted={(attemptId) => {
            setRun(null);
            qc.invalidateQueries({ queryKey: ['assessment', id] });
            qc.invalidateQueries({ queryKey: ['assessments', 'grades'] });
            qc.invalidateQueries({ queryKey: ['lesson'] });
            qc.invalidateQueries({ queryKey: ['outline'] });
            setSp({ resultado: String(attemptId) });
          }}
        />
      </div>
    );

  if (resultId)
    return (
      <div>
        <PageHeader title={a.title} crumbs={crumbs} />
        <ResultView attemptId={resultId} courseId={a.courseId} lessonId={lessonId} canAgain onAgain={() => setSp({})} />
      </div>
    );

  const cols: Column<Overview['attempts'][number]>[] = [
    { key: 'n', header: 'Intento', cell: (r) => `#${attempts.length - attempts.indexOf(r)}` },
    { key: 'd', header: 'Enviado', cell: (r) => (r.submittedAt ? dateTime(r.submittedAt) : '—') },
    { key: 'p', header: 'Nota', align: 'right', cell: (r) => (r.percentage != null ? pct(r.percentage, 1) : '—') },
    { key: 's', header: 'Estado', cell: (r) => (r.status === 'GRADED' && r.passed != null ? <Tag tone={r.passed ? 'success' : 'danger'}>{r.passed ? 'Aprobado' : 'No aprobado'}</Tag> : <Tag tone={statusTone(r.status)}>{ATT_STATUS[r.status] ?? r.status}</Tag>) },
    { key: 'a', header: '', align: 'right', cell: (r) => (r.status !== 'IN_PROGRESS' ? <button type="button" className="text-sm font-semibold underline underline-offset-4" onClick={() => setSp({ resultado: String(r.id) })}>Ver resultado</button> : null) },
  ];

  return (
    <div>
      <PageHeader title={a.title} description={a.description ?? undefined} crumbs={crumbs} />
      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          <Section title="Tus intentos">
            <DataTable columns={cols} rows={attempts} rowKey={(r) => r.id} empty={<p className="border-y border-line py-6 text-sm text-graphite">Aún no has hecho ningún intento.</p>} />
          </Section>
        </div>
        <aside>
          <Facts
            items={[
              { label: 'Tipo', value: ASSESSMENT_TYPES[a.type] ?? a.type },
              { label: 'Preguntas', value: a.questionCount },
              { label: 'Intentos', value: a.maxAttempts === 0 ? 'Ilimitados' : `${attempts.length} de ${a.maxAttempts}` },
              { label: 'Nota mínima', value: `${a.passingScore} %` },
              { label: 'Tiempo', value: a.timeLimitMin ? `${a.timeLimitMin} min` : 'Sin límite' },
              ...(a.availableFrom ? [{ label: 'Disponible desde', value: dateTime(a.availableFrom) }] : []),
              ...(a.availableUntil ? [{ label: 'Disponible hasta', value: dateTime(a.availableUntil) }] : []),
            ]}
          />
          <div className="mt-6 space-y-3">
            {!ov.data.canStart && ov.data.reason && <Alert tone="warning">{ov.data.reason}</Alert>}
            {a.timeLimitMin && ov.data.canStart && !ov.data.inProgressAttemptId && <Alert tone="info">Al iniciar, el reloj de {a.timeLimitMin} minutos empieza a correr y no se detiene.</Alert>}
            <Button size="lg" variant="primary" className="w-full" disabled={!ov.data.canStart && !ov.data.inProgressAttemptId} loading={start.isPending} onClick={() => start.mutate()}>
              {ov.data.inProgressAttemptId ? 'Continuar intento en curso' : 'Iniciar evaluación'}
            </Button>
            {lessonId ? <ButtonLink to={`/campus/leccion/${lessonId}`} variant="outline" className="w-full">Volver a la lección</ButtonLink> : <ButtonLink to={`/campus/cursos/${a.courseId}`} variant="outline" className="w-full">Volver al curso</ButtonLink>}
          </div>
        </aside>
      </div>
    </div>
  );
}
