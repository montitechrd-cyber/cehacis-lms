import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { ArrowLeft, ArrowRight, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Form';
import { Alert } from '@/components/ui/Feedback';
import { ConfirmDialog } from '@/components/ui/Overlay';
import { api, errorMessage } from '@/lib/api';

export interface RunQuestion {
  id: number;
  type: string;
  text: string;
  points: number;
  scaleMax: number | null;
  options: { id: number; text: string }[];
}
export interface AnswerDraft {
  questionId: number;
  selectedOptionIds?: number[] | null;
  textAnswer?: string | null;
  scaleValue?: number | null;
}
export interface StartedAttempt {
  attempt: { id: number; startedAt: string; expiresAt: string | null };
  questions: RunQuestion[];
  answers: AnswerDraft[];
}

const isAnswered = (q: RunQuestion, a?: AnswerDraft) => {
  if (!a) return false;
  if (q.type === 'OPEN') return !!a.textAnswer?.trim();
  if (q.type === 'SCALE') return a.scaleValue != null;
  return !!a.selectedOptionIds?.length;
};
const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export function AttemptRunner({ run, onSubmitted }: { run: StartedAttempt; onSubmitted: (attemptId: number) => void }) {
  const { attempt, questions } = run;
  const [answers, setAnswers] = useState<Record<number, AnswerDraft>>(() => Object.fromEntries(run.answers.map((a) => [a.questionId, a])));
  const [idx, setIdx] = useState(0);
  const [save, setSave] = useState<{ state: 'idle' | 'saving' | 'saved' | 'error'; at?: Date }>({ state: 'idle' });
  const [left, setLeft] = useState<number | null>(attempt.expiresAt ? Math.max(0, Math.ceil((new Date(attempt.expiresAt).getTime() - Date.now()) / 1000)) : null);
  const [confirm, setConfirm] = useState(false);
  const [sending, setSending] = useState(false);
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const dirty = useRef(false);
  const submitted = useRef(false);
  const warned = useRef(false);
  const h2 = useRef<HTMLHeadingElement>(null);

  const payload = useCallback(() => ({ answers: Object.values(answersRef.current).filter((a) => a.selectedOptionIds?.length || a.textAnswer || a.scaleValue != null) }), []);

  const doSave = useCallback(async () => {
    if (submitted.current || !dirty.current) return;
    dirty.current = false;
    setSave((s) => ({ ...s, state: 'saving' }));
    try {
      await api.put(`/assessments/attempts/${attempt.id}/answers`, payload());
      setSave({ state: 'saved', at: new Date() });
    } catch {
      dirty.current = true;
      setSave((s) => ({ ...s, state: 'error' }));
    }
  }, [attempt.id, payload]);

  // Guardado automático de borrador (debounce)
  useEffect(() => {
    if (!dirty.current) return;
    const t = setTimeout(doSave, 1200);
    return () => clearTimeout(t);
  }, [answers, doSave]);

  const submit = useCallback(async () => {
    if (submitted.current) return;
    submitted.current = true;
    setSending(true);
    try {
      await api.post(`/assessments/attempts/${attempt.id}/submit`, payload());
      onSubmitted(attempt.id);
    } catch (e) {
      submitted.current = false;
      setSending(false);
      toast.error(errorMessage(e));
    }
  }, [attempt.id, onSubmitted, payload]);

  // Temporizador
  useEffect(() => {
    if (!attempt.expiresAt) return;
    const end = new Date(attempt.expiresAt).getTime();
    const t = setInterval(() => {
      const s = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      setLeft(s);
      if (s <= 60 && s > 0 && !warned.current) {
        warned.current = true;
        toast.warning('Queda 1 minuto. La evaluación se enviará automáticamente.');
      }
      if (s === 0) {
        clearInterval(t);
        toast.info('Se acabó el tiempo: enviando tus respuestas.');
        submit();
      }
    }, 1000);
    return () => clearInterval(t);
  }, [attempt.expiresAt, submit]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (!submitted.current) e.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);

  const set = (qid: number, patch: Partial<AnswerDraft>) => {
    dirty.current = true;
    setAnswers((a) => ({ ...a, [qid]: { ...a[qid], questionId: qid, ...patch } }));
  };

  const q = questions[idx]!;
  const a = answers[q.id];
  const unanswered = useMemo(() => questions.filter((x) => !isAnswered(x, answers[x.id])).length, [questions, answers]);
  const urgent = left != null && left <= 60;

  return (
    <div>
      <div className="sticky top-16 z-20 -mx-4 flex flex-wrap items-center justify-between gap-3 border-b border-ink bg-paper px-4 py-3 sm:-mx-8 sm:px-8">
        <p className="text-sm font-semibold tnum">
          Pregunta {idx + 1} de {questions.length}
        </p>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-xs text-muted" role="status" aria-live="polite">
            {save.state === 'saving' ? 'Guardando…' : save.state === 'saved' ? `Guardado ${save.at?.toLocaleTimeString('es', { timeStyle: 'short' })}` : save.state === 'error' ? 'No se pudo guardar; reintentando' : 'Borrador automático'}
          </span>
          {left != null && (
            <span className={clsx('inline-flex items-center gap-1.5 font-bold tnum', urgent && 'text-danger')} role="timer" aria-label={`Tiempo restante ${clock(left)}`}>
              <Clock className="size-4" aria-hidden /> {clock(left)}
            </span>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_220px]">
        <div className="max-w-2xl">
          {urgent && <div className="mb-5"><Alert tone="danger" title="Queda menos de un minuto">Tus respuestas se enviarán al llegar a cero.</Alert></div>}
          <h2 ref={h2} tabIndex={-1} className="text-2xl font-bold leading-snug tracking-tight outline-none">
            {q.text}
          </h2>
          <p className="mt-1 text-xs text-muted tnum">{q.points} {q.points === 1 ? 'punto' : 'puntos'}</p>

          <div className="mt-6">
            {(q.type === 'MULTIPLE_CHOICE' || q.type === 'TRUE_FALSE') && (
              <fieldset>
                <legend className="sr-only">Selecciona una opción</legend>
                <div className="space-y-2">
                  {q.options.map((o) => (
                    <label key={o.id} className={clsx('flex cursor-pointer items-start gap-3 border p-3.5 text-[0.9375rem]', a?.selectedOptionIds?.includes(o.id) ? 'border-ink bg-stone' : 'border-line-strong hover:border-ink')}>
                      <input type="radio" name={`q${q.id}`} checked={!!a?.selectedOptionIds?.includes(o.id)} onChange={() => set(q.id, { selectedOptionIds: [o.id] })} className="mt-1 size-4 accent-ink" />
                      <span>{o.text}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
            {q.type === 'MULTIPLE_SELECT' && (
              <fieldset>
                <legend className="mb-2 text-sm text-graphite">Selecciona todas las que correspondan.</legend>
                <div className="space-y-2">
                  {q.options.map((o) => {
                    const on = !!a?.selectedOptionIds?.includes(o.id);
                    return (
                      <label key={o.id} className={clsx('flex cursor-pointer items-start gap-3 border p-3.5 text-[0.9375rem]', on ? 'border-ink bg-stone' : 'border-line-strong hover:border-ink')}>
                        <input type="checkbox" checked={on} onChange={() => set(q.id, { selectedOptionIds: on ? (a?.selectedOptionIds ?? []).filter((x) => x !== o.id) : [...(a?.selectedOptionIds ?? []), o.id] })} className="mt-1 size-4 accent-ink" />
                        <span>{o.text}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            )}
            {q.type === 'OPEN' && (
              <Textarea label="Tu respuesta" rows={8} value={a?.textAnswer ?? ''} onChange={(e) => set(q.id, { textAnswer: e.target.value })} hint={`${(a?.textAnswer ?? '').length} caracteres`} />
            )}
            {q.type === 'SCALE' && (
              <fieldset>
                <legend className="sr-only">Elige un valor en la escala</legend>
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: q.scaleMax ?? 5 }, (_, i) => i + 1).map((v) => (
                    <label key={v} className={clsx('flex size-12 cursor-pointer items-center justify-center border text-base font-bold tnum', a?.scaleValue === v ? 'border-ink bg-ink text-paper' : 'border-line-strong hover:border-ink')}>
                      <input type="radio" name={`q${q.id}`} className="sr-only" checked={a?.scaleValue === v} onChange={() => set(q.id, { scaleValue: v })} />
                      {v}
                    </label>
                  ))}
                </div>
                <p className="mt-2 flex max-w-sm justify-between text-xs text-muted">
                  <span>1 · Mínimo</span>
                  <span>{q.scaleMax ?? 5} · Máximo</span>
                </p>
              </fieldset>
            )}
          </div>

          <div className="mt-8 flex items-center justify-between gap-3 border-t border-line pt-5">
            <Button variant="outline" disabled={idx === 0} onClick={() => setIdx(idx - 1)} icon={<ArrowLeft className="size-4" />}>
              Anterior
            </Button>
            {idx < questions.length - 1 ? (
              <Button variant="ink" onClick={() => setIdx(idx + 1)} iconRight={<ArrowRight className="size-4" />}>
                Siguiente
              </Button>
            ) : (
              <Button variant="primary" onClick={() => setConfirm(true)} loading={sending}>
                Enviar evaluación
              </Button>
            )}
          </div>
        </div>

        <nav aria-label="Navegador de preguntas" className="lg:sticky lg:top-40 lg:self-start">
          <ol className="grid grid-cols-6 gap-1.5 sm:grid-cols-10 lg:grid-cols-4">
            {questions.map((x, i) => {
              const done = isAnswered(x, answers[x.id]);
              return (
                <li key={x.id}>
                  <button
                    type="button"
                    onClick={() => setIdx(i)}
                    aria-current={i === idx ? 'step' : undefined}
                    className={clsx('relative flex h-10 w-full items-center justify-center border text-sm font-bold tnum', done ? 'border-ink bg-ink text-paper' : 'border-line-strong bg-paper text-ink hover:border-ink', i === idx && 'outline-2 outline-offset-1 outline-orange')}
                  >
                    {i + 1}
                    <span className="sr-only">{done ? ' respondida' : ' sin responder'}</span>
                  </button>
                </li>
              );
            })}
          </ol>
          <p className="mt-3 text-xs text-graphite">Relleno: respondida · vacío: sin responder.</p>
          <Button className="mt-4 w-full max-lg:hidden" variant="outline" onClick={() => setConfirm(true)} loading={sending}>
            Enviar evaluación
          </Button>
        </nav>
      </div>

      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={() => {
          setConfirm(false);
          submit();
        }}
        tone="ink"
        title="¿Enviar la evaluación?"
        confirmLabel="Enviar ahora"
        description={unanswered > 0 ? `Tienes ${unanswered} ${unanswered === 1 ? 'pregunta sin responder' : 'preguntas sin responder'}. Una vez enviada no podrás modificarla.` : 'Has respondido todas las preguntas. Una vez enviada no podrás modificarla.'}
      />
    </div>
  );
}
