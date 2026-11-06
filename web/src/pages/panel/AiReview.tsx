import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import { useAction } from '@/lib/hooks';
import { dateTime, fullName } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { Select, Textarea } from '@/components/ui/Form';
import { Alert, ErrorState, PageLoader } from '@/components/ui/Feedback';
import { PageHeader, Panel, Section } from '@/components/ui/Page';
import { Avatar, Tag, statusTone } from '@/components/ui/Data';
import { EVAL_STATUS } from './Ai';

interface Dimension { key: string; score: number; evidence: string; suggestion: string }
interface Evaluation {
  dimensions: Dimension[]; summary: string; strengths: string[]; improvements: string[]; exercises: { title: string; description: string }[];
  disclaimer: string; originalScores?: Record<string, number>;
}
interface Detail {
  simulation: {
    id: number; status: string; evaluationStatus: string; startedAt: string; endedAt: string | null; reviewedAt: string | null; model: string; provider: string;
    scenario: { id: number; title: string; description: string; objectives: string[] };
    student: { id: number; firstName: string; lastName: string; email: string; avatarUrl: string | null };
    reviewedBy: { id: number; firstName: string; lastName: string } | null;
  };
  messages: { id: number; role: 'user' | 'assistant'; content: string; createdAt: string }[];
  evaluation: Evaluation | null;
  reviewerNotes: string | null;
}

const DIMENSIONS: Record<string, string> = {
  claridad: 'Claridad', empatia: 'Empatía', asertividad: 'Asertividad', escucha_activa: 'Escucha activa',
  argumentacion: 'Argumentación', persuasion: 'Persuasión', manejo_conflictos: 'Manejo de conflictos',
};
const SCORES = [1, 2, 3, 4, 5].map((n) => ({ value: n, label: String(n) }));

export default function AiReview() {
  const { id } = useParams();
  const q = useQuery({ queryKey: ['ai-sim', id], queryFn: () => api.get<Detail>(`/ai/simulations/${id}`) });
  const [scores, setScores] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState('');
  const [err, setErr] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!q.data) return;
    setScores(Object.fromEntries((q.data.evaluation?.dimensions ?? []).map((d) => [d.key, d.score])));
    setNotes(q.data.reviewerNotes ?? '');
  }, [q.data]);
  const save = useAction(
    () => api.post(`/ai/simulations/${id}/review`, { dimensions: Object.entries(scores).map(([key, score]) => ({ key, score })), reviewerNotes: notes }),
    { success: 'Revisión guardada y estudiante notificado', invalidate: [['ai-sim', id], ['ai-reviews']] },
  );

  if (q.isLoading) return <PageLoader />;
  if (q.isError || !q.data) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const { simulation: s, messages, evaluation: ev } = q.data;
  const reviewed = s.evaluationStatus === 'REVIEWED';
  const personaName = s.scenario.title;

  return (
    <div>
      <PageHeader
        crumbs={[{ label: 'Inteligencia artificial', to: '/panel/ia' }, { label: `Simulación ${s.id}` }]}
        title={s.scenario.title}
        description={
          <span className="flex flex-wrap items-center gap-3">
            <Avatar user={s.student} size={28} /> <span>{fullName(s.student)} · {s.student.email}</span>
            <Tag tone={statusTone(s.evaluationStatus)}>{EVAL_STATUS[s.evaluationStatus]}</Tag>
          </span>
        }
      />
      <Alert tone="info" title="La IA no diagnostica">
        La evaluación es retroalimentación formativa generada automáticamente. No es un diagnóstico ni una medición objetiva: tú, como facilitador, tienes la última palabra y puedes ajustar cada puntuación.
      </Alert>

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Section title="Transcripción" description={`${messages.length} intervenciones · iniciada ${dateTime(s.startedAt)}`} className="mb-0">
          <ol className="space-y-4" aria-label="Guion de la simulación">
            {messages.map((m) => (
              <li key={m.id} className="grid grid-cols-[6.5rem_1fr] gap-3 border-b border-line pb-3 text-sm">
                <span className="text-xs font-bold uppercase tracking-[0.06em] text-graphite">{m.role === 'user' ? 'Estudiante' : 'Personaje'}</span>
                <p className="whitespace-pre-wrap break-words">{m.content}</p>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-xs text-muted">Escenario: {personaName}. Modelo: {s.provider} {s.model}.</p>
        </Section>

        <div>
          {!ev ? (
            <Alert tone="warning" title="Sin evaluación">La simulación fue muy corta o aún no se ha evaluado, por lo que no hay puntuaciones que revisar.</Alert>
          ) : (
            <>
              <Section title="Evaluación de la IA" className="mb-8">
                <p className="mb-4 text-sm">{ev.summary}</p>
                <ul className="divide-y divide-line border-y border-line">
                  {ev.dimensions.map((d) => {
                    const orig = ev.originalScores?.[d.key];
                    return (
                      <li key={d.key} className="py-3 text-sm">
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="font-semibold">{DIMENSIONS[d.key] ?? d.key}</span>
                          <span className="tnum font-bold">{d.score}/5{orig != null && orig !== d.score && <span className="ml-2 text-xs font-normal text-muted">IA: {orig}</span>}</span>
                        </div>
                        <p className="mt-1 text-graphite"><span className="font-semibold">Evidencia:</span> {d.evidence}</p>
                        <p className="text-graphite"><span className="font-semibold">Sugerencia:</span> {d.suggestion}</p>
                      </li>
                    );
                  })}
                </ul>
                <div className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
                  <div><p className="font-bold">Fortalezas</p><ul className="mt-1 list-disc pl-4 text-graphite">{ev.strengths.map((x, i) => <li key={i}>{x}</li>)}</ul></div>
                  <div><p className="font-bold">A mejorar</p><ul className="mt-1 list-disc pl-4 text-graphite">{ev.improvements.map((x, i) => <li key={i}>{x}</li>)}</ul></div>
                </div>
                {ev.exercises.length > 0 && (
                  <div className="mt-4 text-sm"><p className="font-bold">Ejercicios sugeridos</p>
                    <ul className="mt-1 space-y-1 text-graphite">{ev.exercises.map((x, i) => <li key={i}><span className="font-semibold">{x.title}.</span> {x.description}</li>)}</ul>
                  </div>
                )}
                <p className="mt-4 text-xs text-muted">{ev.disclaimer}</p>
              </Section>

              <Panel>
                <h2 className="text-lg font-bold tracking-tight">Tu revisión</h2>
                {reviewed && s.reviewedBy && <p className="mt-1 text-sm text-graphite">Revisada por {fullName(s.reviewedBy)} el {dateTime(s.reviewedAt)}. Puedes volver a ajustarla.</p>}
                <form className="mt-4 space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(undefined, { onError: (x) => x instanceof ApiError && setErr(x.fieldErrors) }); }}>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {ev.dimensions.map((d) => (
                      <Select key={d.key} label={DIMENSIONS[d.key] ?? d.key} options={SCORES} value={scores[d.key] ?? d.score} onChange={(e) => setScores({ ...scores, [d.key]: Number(e.target.value) })} />
                    ))}
                  </div>
                  <Textarea label="Notas del revisor" required rows={5} value={notes} error={err.reviewerNotes} hint="Visible para el estudiante. Entre 1 y 4000 caracteres." maxLength={4000} onChange={(e) => setNotes(e.target.value)} />
                  <div className="flex justify-end"><Button type="submit" variant="primary" loading={save.isPending} disabled={!notes.trim()}>{reviewed ? 'Actualizar revisión' : 'Guardar revisión'}</Button></div>
                </form>
              </Panel>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
