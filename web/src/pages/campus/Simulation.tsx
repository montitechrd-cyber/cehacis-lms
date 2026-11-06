import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Flag, Send } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAction } from '@/lib/hooks';
import { LEVELS, date, dateTime, fullName } from '@/lib/format';
import { useAuth } from '@/lib/auth';
import { PageHeader } from '@/components/ui/Page';
import { Alert } from '@/components/ui/Feedback';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Form';
import { Tag, statusTone } from '@/components/ui/Data';
import { ConfirmDialog } from '@/components/ui/Overlay';
import { PlainText, Q, SegmentScore, aiErrorMessage } from '@/features/campus/shared';
import type { Scenario } from './Coach';
import { VoiceWave } from '@/components/brand/Emblem';

interface Msg { id?: number; role: 'user' | 'assistant'; content: string; createdAt: string }
interface Dimension { key: string; score: number; evidence: string; suggestion: string }
interface Evaluation {
  dimensions: Dimension[];
  summary: string;
  strengths: string[];
  improvements: string[];
  exercises: { title: string; description: string }[];
  disclaimer: string;
  originalScores?: Record<string, number>;
}
interface SimDetail {
  simulation: {
    id: number;
    status: 'ACTIVE' | 'COMPLETED' | 'ABANDONED';
    evaluationStatus: 'PENDING' | 'AI_GENERATED' | 'REVIEWED';
    startedAt: string;
    endedAt: string | null;
    reviewedAt: string | null;
    scenario: { id: number; title: string; description: string; objectives: string[]; difficulty: string };
    reviewedBy: { firstName: string; lastName: string } | null;
  };
  messages: Msg[];
  evaluation: Evaluation | null;
  reviewerNotes: string | null;
}

const DIM: Record<string, string> = {
  claridad: 'Claridad', empatia: 'Empatía', asertividad: 'Asertividad', escucha_activa: 'Escucha activa',
  argumentacion: 'Argumentación', persuasion: 'Persuasión', manejo_conflictos: 'Manejo de conflictos',
};
const MAX_TURNS = 30;

function Report({ ev, reviewed, notes, reviewer, reviewedAt }: { ev: Evaluation; reviewed: boolean; notes: string | null; reviewer: string | null; reviewedAt: string | null }) {
  return (
    <section className="mt-12" aria-labelledby="informe">
      <h2 id="informe" className="border-b border-ink pb-2.5 text-2xl font-bold tracking-tight">Informe de la simulación</h2>
      {reviewed && (
        <div className="mt-4">
          <Alert tone="success" title="Revisada por un facilitador">
            {reviewer ? `${reviewer} ajustó las puntuaciones` : 'Un facilitador ajustó las puntuaciones'}
            {reviewedAt ? ` el ${date(reviewedAt)}` : ''}. Las puntuaciones mostradas son las ajustadas.
            {notes && <PlainText className="mt-2 text-ink">{notes}</PlainText>}
          </Alert>
        </div>
      )}
      <p className="mt-5 max-w-3xl text-lg leading-relaxed">{ev.summary}</p>
      <ul className="mt-6 divide-y divide-line border-y border-line">
        {ev.dimensions.map((d) => {
          const orig = ev.originalScores?.[d.key];
          return (
            <li key={d.key} className="grid gap-x-8 gap-y-2 py-4 md:grid-cols-[220px_1fr]">
              <div>
                <p className="font-semibold">{DIM[d.key] ?? d.key}</p>
                <p className="mt-2 text-2xl font-bold tnum">{d.score}<span className="text-sm font-normal text-muted"> / 5</span></p>
                <SegmentScore score={d.score} label={`${DIM[d.key] ?? d.key}: ${d.score} de 5`} />
                {reviewed && orig !== undefined && orig !== d.score && <p className="mt-1 text-xs text-muted">Puntuación original de la IA: {orig}</p>}
              </div>
              <div className="text-sm">
                <p className="text-graphite">Evidencia</p>
                <blockquote className="mt-0.5 whitespace-pre-wrap border-t border-line pt-1 italic">“{d.evidence}”</blockquote>
                <p className="mt-3 text-graphite">Sugerencia</p>
                <p className="mt-0.5 whitespace-pre-wrap">{d.suggestion}</p>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="mt-8 grid gap-8 md:grid-cols-2">
        <div>
          <h3 className="border-b border-line pb-2 font-bold">Fortalezas</h3>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm">{ev.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
        </div>
        <div>
          <h3 className="border-b border-line pb-2 font-bold">Aspectos por mejorar</h3>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm">{ev.improvements.map((s, i) => <li key={i}>{s}</li>)}</ul>
        </div>
      </div>
      {ev.exercises.length > 0 && (
        <div className="mt-8">
          <h3 className="border-b border-line pb-2 font-bold">Ejercicios recomendados</h3>
          <ol className="mt-3 divide-y divide-line">
            {ev.exercises.map((e, i) => (
              <li key={i} className="py-3 text-sm">
                <p className="font-semibold">{e.title}</p>
                <p className="text-graphite">{e.description}</p>
              </li>
            ))}
          </ol>
        </div>
      )}
      <div className="mt-8">
        <Alert tone="info">{ev.disclaimer}</Alert>
      </div>
    </section>
  );
}

export default function Simulation() {
  const { id } = useParams();
  const qc = useQueryClient();
  const { user } = useAuth();
  const key = ['ai', 'simulation', id];
  const q = useQuery({ queryKey: key, queryFn: () => api.get<SimDetail>(`/ai/simulations/${id}`) });
  const scenarios = useQuery({ queryKey: ['ai', 'scenarios'], queryFn: async () => (await api.get<{ data: Scenario[] }>('/ai/scenarios')).data });
  const [text, setText] = useState('');
  const [pending, setPending] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [shortMsg, setShortMsg] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const send = useMutation({
    mutationFn: (content: string) => api.post<{ message: Msg }>(`/ai/simulations/${id}/messages`, { content }),
    onSuccess: (r, content) => {
      qc.setQueryData<SimDetail>(key, (old) =>
        old ? { ...old, messages: [...old.messages, { role: 'user', content, createdAt: new Date().toISOString() }, r.message] } : old,
      );
      setPending(null);
    },
    onError: (e, content) => {
      setPending(null);
      setText(content);
      setSendError(aiErrorMessage(e));
    },
  });
  const finish = useAction(() => api.post<{ evaluation: Evaluation | null; message: string }>(`/ai/simulations/${id}/finish`), {
    invalidate: [key, ['ai', 'simulations', 'me']],
    onSuccess: (r) => {
      setConfirm(false);
      if (!r.evaluation) setShortMsg(r.message);
    },
    silentError: true,
  });
  useEffect(() => {
    if (finish.error) {
      setConfirm(false);
      toast.error(aiErrorMessage(finish.error));
    }
  }, [finish.error]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' }); }, [q.data?.messages.length, pending]);

  const submit = () => {
    const c = text.trim();
    if (!c || send.isPending) return;
    setSendError(null);
    setPending(c);
    setText('');
    send.mutate(c);
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="animate-rise">
      <Q query={q}>
        {(d) => {
          const { simulation: s } = d;
          const active = s.status === 'ACTIVE';
          const turns = d.messages.filter((m) => m.role === 'user').length + (pending ? 1 : 0);
          const full = scenarios.data?.find((x) => x.id === s.scenario.id);
          const name = fullName(user) === '—' ? 'Tú' : 'Tú';
          return (
            <>
              <PageHeader
                crumbs={[{ label: 'Entrenador con IA', to: '/campus/ia' }, { label: s.scenario.title }]}
                title={s.scenario.title}
                actions={
                  active ? (
                    <Button variant="ink" icon={<Flag className="size-4" />} onClick={() => setConfirm(true)} disabled={send.isPending}>Finalizar y evaluar</Button>
                  ) : (
                    <Tag tone={statusTone(s.evaluationStatus)}>{s.evaluationStatus === 'REVIEWED' ? 'Revisada por facilitador' : s.evaluationStatus === 'AI_GENERATED' ? 'Evaluada por IA' : 'Finalizada'}</Tag>
                  )
                }
              />
              <div className="grid gap-10 lg:grid-cols-[1fr_300px]">
                <div className="min-w-0">
                  <ol className="border-t border-ink" aria-label="Guion de la conversación" aria-live="polite">
                    {d.messages.map((m, i) => <Turn key={m.id ?? i} m={m} you={name} />)}
                    {pending && <Turn m={{ role: 'user', content: pending, createdAt: '' }} you={name} />}
                    {send.isPending && (
                      <li className="grid gap-1 border-b border-line py-5 sm:grid-cols-[120px_1fr] sm:gap-6">
                        <span className="text-sm font-bold">Interlocutor</span>
                        <span className="inline-flex items-center gap-2 text-graphite"><VoiceWave bars={7} height={14} animated className="text-orange" /> escribiendo…</span>
                      </li>
                    )}
                  </ol>
                  <div ref={endRef} />
                  {shortMsg && <div className="mt-6"><Alert tone="warning" title="Simulación muy corta">{shortMsg}</Alert></div>}
                  {active ? (
                    <div className="mt-6">
                      {sendError && <div className="mb-3"><Alert tone="danger">{sendError}</Alert></div>}
                      <Textarea
                        label="Tu intervención"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        onKeyDown={onKey}
                        maxLength={2000}
                        rows={3}
                        disabled={turns >= MAX_TURNS}
                        hint={`Enter envía, Mayús+Enter agrega una línea. Escribe /pausa para que el personaje salga del rol. ${turns} de ${MAX_TURNS} intervenciones.`}
                      />
                      <div className="mt-3 flex justify-end">
                        <Button variant="primary" icon={<Send className="size-4" />} onClick={submit} loading={send.isPending} disabled={!text.trim() || turns >= MAX_TURNS}>Enviar</Button>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-6 text-sm text-graphite">Simulación finalizada el {dateTime(s.endedAt)}.</p>
                  )}
                  {d.evaluation && <Report ev={d.evaluation} reviewed={s.evaluationStatus === 'REVIEWED'} notes={d.reviewerNotes} reviewer={s.reviewedBy ? fullName(s.reviewedBy) : null} reviewedAt={s.reviewedAt} />}
                  {!active && !d.evaluation && !shortMsg && <p className="mt-6"><Alert tone="info">Esta simulación no tiene evaluación (fue muy corta o no se pudo generar).</Alert></p>}
                </div>
                <aside className="lg:sticky lg:top-6 lg:self-start" aria-label="Escenario">
                  <div className="border-t border-ink pt-3">
                    <h2 className="font-bold">Escenario</h2>
                    <p className="mt-2 text-sm text-graphite">{s.scenario.description}</p>
                    <div className="mt-3"><Tag tone="ink">{LEVELS[s.scenario.difficulty] ?? s.scenario.difficulty}</Tag></div>
                    {s.scenario.objectives.length > 0 && (
                      <>
                        <h3 className="mt-5 text-sm font-bold">Objetivos</h3>
                        <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm">{s.scenario.objectives.map((o, i) => <li key={i}>{o}</li>)}</ul>
                      </>
                    )}
                    {full && full.competencies.length > 0 && (
                      <>
                        <h3 className="mt-5 text-sm font-bold">Competencias</h3>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">{full.competencies.map((c) => <Tag key={c.id} tone="outline">{c.name}</Tag>)}</div>
                      </>
                    )}
                  </div>
                </aside>
              </div>
              <ConfirmDialog
                open={confirm}
                onClose={() => setConfirm(false)}
                onConfirm={() => finish.mutate()}
                loading={finish.isPending}
                tone="ink"
                title="Finalizar y evaluar"
                confirmLabel="Finalizar"
                description="La conversación se cerrará y no podrás seguir escribiendo. Se generará una evaluación formativa con IA, que un facilitador podrá revisar."
              />
            </>
          );
        }}
      </Q>
    </div>
  );
}

function Turn({ m, you }: { m: Msg; you: string }) {
  const mine = m.role === 'user';
  return (
    <li className="grid gap-1 border-b border-line py-5 sm:grid-cols-[120px_1fr] sm:gap-6">
      <span className="flex items-center gap-2 text-sm font-bold">
        {mine && <span className="size-2 bg-orange" aria-hidden />}
        {mine ? you : 'Interlocutor'}
      </span>
      <PlainText className={mine ? 'text-[1.0625rem] leading-relaxed' : 'text-[1.0625rem] leading-relaxed text-graphite'}>{m.content}</PlainText>
    </li>
  );
}
