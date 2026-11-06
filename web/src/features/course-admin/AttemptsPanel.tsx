import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, ApiError, type Paged } from '@/lib/api';
import { useAction, useTableParams } from '@/lib/hooks';
import { dateTime, fullName, num } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { Avatar, DataTable, Pagination, SearchInput, Tag, Toolbar, statusTone, type Column } from '@/components/ui/Data';
import { EmptyState, ErrorState, PageLoader } from '@/components/ui/Feedback';
import { Input, Select, Textarea } from '@/components/ui/Form';
import { Drawer } from '@/components/ui/Overlay';
import { toast } from 'sonner';
import { ATTEMPT_STATUS, toOptions, type UserBrief } from './shared';

interface AttemptRow {
  id: number; user: UserBrief & { email: string }; status: string; startedAt: string; submittedAt: string | null; score: number | null; maxScore: number | null; percentage: number | null; passed: boolean | null;
}
interface AttemptDetail {
  attempt: { id: number; status: string; startedAt: string; submittedAt: string | null; score: number | null; maxScore: number | null; percentage: number | null; passed: boolean | null; feedback: string | null; user: UserBrief & { email: string } };
  assessment: { id: number; title: string; type: string; passingScore: number };
  answers: { id: number; selectedOptionIds: number[] | null; textAnswer: string | null; scaleValue: number | null; isCorrect: boolean | null; pointsAwarded: number | null; feedback: string | null;
    question: { id: number; type: string; text: string; explanation: string | null; points: number; scaleMax: number | null; options: { id: number; text: string; isCorrect: boolean }[] } }[];
}

export default function AttemptsPanel({ assessmentId }: { assessmentId: number }) {
  const t = useTableParams();
  const [open, setOpen] = useState<number | null>(null);
  const query = { page: t.page, pageSize: 20, q: t.get('aq'), status: t.get('astatus') };
  const q = useQuery({ queryKey: ['attempts', assessmentId, query], queryFn: () => api.get<Paged<AttemptRow>>(`/assessments/${assessmentId}/attempts`, query), placeholderData: (p) => p });

  const columns: Column<AttemptRow>[] = [
    { key: 'user', header: 'Estudiante', className: 'min-w-[14rem]', cell: (a) => <span className="flex items-center gap-2"><Avatar user={a.user} size={26} /><span><span className="block font-semibold">{fullName(a.user)}</span><span className="block text-xs text-muted">{a.user.email}</span></span></span> },
    { key: 'status', header: 'Estado', cell: (a) => <Tag tone={a.status === 'SUBMITTED' ? 'warning' : statusTone(a.status)}>{ATTEMPT_STATUS[a.status] ?? a.status}</Tag> },
    { key: 'date', header: 'Enviado', cell: (a) => dateTime(a.submittedAt ?? a.startedAt) },
    { key: 'score', header: 'Puntos', align: 'right', cell: (a) => (a.score == null ? '—' : `${num(a.score, 1)} / ${num(a.maxScore, 1)}`) },
    { key: 'pct', header: 'Porcentaje', align: 'right', cell: (a) => (a.percentage == null ? '—' : `${num(a.percentage, 1)} %`) },
    { key: 'passed', header: 'Resultado', cell: (a) => (a.passed == null ? '—' : <Tag tone={a.passed ? 'success' : 'danger'}>{a.passed ? 'Aprobado' : 'No aprobado'}</Tag>) },
    { key: 'go', header: <span className="sr-only">Abrir</span>, align: 'right', cell: (a) => <Button size="sm" variant="outline" disabled={a.status === 'IN_PROGRESS'} onClick={() => setOpen(a.id)}>{a.status === 'SUBMITTED' ? 'Calificar' : 'Ver'}</Button> },
  ];

  return (
    <div>
      <Toolbar>
        <SearchInput className="w-full sm:w-72" value={t.get('aq')} onChange={(v) => t.set({ aq: v })} placeholder="Buscar estudiante" />
        <Select aria-label="Estado" wrapperClassName="w-44" value={t.get('astatus')} onChange={(e) => t.set({ astatus: e.target.value })} placeholder="Todos los estados" options={toOptions(ATTEMPT_STATUS)} />
      </Toolbar>
      {q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : (
        <>
          <DataTable columns={columns} rows={q.data?.data} rowKey={(a) => a.id} loading={q.isLoading} empty={<EmptyState title="Aún no hay intentos" description="Cuando los estudiantes respondan la evaluación aparecerán aquí." />} />
          {q.data && <Pagination page={q.data.meta.page} pages={q.data.meta.pages} total={q.data.meta.total} onPage={(p) => t.set({ page: p }, false)} />}
        </>
      )}
      {open != null && <AttemptDrawer attemptId={open} assessmentId={assessmentId} onClose={() => setOpen(null)} />}
    </div>
  );
}

function AttemptDrawer({ attemptId, assessmentId, onClose }: { attemptId: number; assessmentId: number; onClose: () => void }) {
  const q = useQuery({ queryKey: ['attempt', attemptId], queryFn: () => api.get<AttemptDetail>(`/assessments/attempts/${attemptId}`) });
  const [grades, setGrades] = useState<Record<number, { points: string; feedback: string }>>({});
  const [general, setGeneral] = useState('');
  useEffect(() => {
    if (!q.data) return;
    const g: Record<number, { points: string; feedback: string }> = {};
    q.data.answers.forEach((a) => { g[a.id] = { points: a.pointsAwarded != null ? String(a.pointsAwarded) : '', feedback: a.feedback ?? '' }; });
    setGrades(g);
    setGeneral(q.data.attempt.feedback ?? '');
  }, [q.data]);

  const save = useAction(
    () => api.post(`/assessments/attempts/${attemptId}/grade`, {
      answers: (q.data?.answers ?? []).filter((a) => grades[a.id]?.points !== '').map((a) => ({ answerId: a.id, pointsAwarded: Number(grades[a.id]!.points), feedback: grades[a.id]!.feedback.trim() || undefined })),
      feedback: general.trim() || undefined,
    }),
    { success: 'Intento calificado', invalidate: [['attempts', assessmentId], ['attempt', attemptId], ['gradebook']], silentError: true, onSuccess: onClose },
  );
  const submit = async () => {
    const d = q.data!;
    for (const a of d.answers) {
      const g = grades[a.id];
      if (a.question.type === 'OPEN' && (!g || g.points === '')) return toast.error('Asigna puntos a todas las preguntas abiertas');
      if (g && g.points !== '' && (Number(g.points) < 0 || Number(g.points) > a.question.points)) return toast.error(`Los puntos de cada pregunta van de 0 a su máximo (${a.question.points})`);
    }
    try { await save.mutateAsync(); } catch (e) { toast.error(e instanceof ApiError ? e.message : 'No se pudo calificar'); }
  };

  const d = q.data;
  return (
    <Drawer open onClose={onClose} width="max-w-3xl" title={d ? `Intento de ${fullName(d.attempt.user)}` : 'Intento'}
      footer={<><Button variant="ghost" onClick={onClose}>Cerrar</Button>{d && d.attempt.status !== 'IN_PROGRESS' && <Button variant="primary" loading={save.isPending} onClick={submit}>{d.attempt.status === 'GRADED' ? 'Actualizar calificación' : 'Guardar calificación'}</Button>}</>}>
      {q.isLoading ? <PageLoader /> : q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : d && (
        <div className="grid gap-5">
          <p className="text-sm text-graphite tnum">{d.assessment.title} · enviado {dateTime(d.attempt.submittedAt)} · aprueba con {d.assessment.passingScore} %{d.attempt.percentage != null && <> · actual <strong>{num(d.attempt.percentage, 1)} %</strong></>}</p>
          <ol className="divide-y divide-line border-y border-ink">
            {d.answers.map((a, i) => {
              const g = grades[a.id] ?? { points: '', feedback: '' };
              const selected = new Set(a.selectedOptionIds ?? []);
              return (
                <li key={a.id} className="grid gap-2 py-4">
                  <p className="font-semibold"><span className="mr-2 tnum">{i + 1}.</span>{a.question.text}</p>
                  {a.question.options.length > 0 && (
                    <ul className="grid gap-0.5 text-sm">
                      {a.question.options.map((o) => (
                        <li key={o.id} className={selected.has(o.id) ? 'font-semibold' : 'text-graphite'}>
                          {selected.has(o.id) ? '▣' : '▢'} {o.text} {o.isCorrect && <Tag tone="success">Correcta</Tag>}
                        </li>
                      ))}
                    </ul>
                  )}
                  {a.question.type === 'OPEN' && <p className="whitespace-pre-wrap rounded-sm bg-stone p-3 text-sm">{a.textAnswer || <span className="text-muted">Sin respuesta</span>}</p>}
                  {a.question.type === 'SCALE' && <p className="text-sm">Respuesta: <strong className="tnum">{a.scaleValue ?? '—'}</strong> de {a.question.scaleMax}</p>}
                  <div className="grid items-start gap-3 sm:grid-cols-[8rem_1fr]">
                    <Input label={`Puntos (máx. ${a.question.points})`} type="number" min={0} max={a.question.points} step="0.25" value={g.points} onChange={(e) => setGrades({ ...grades, [a.id]: { ...g, points: e.target.value } })} />
                    <Input label="Comentario" value={g.feedback} onChange={(e) => setGrades({ ...grades, [a.id]: { ...g, feedback: e.target.value } })} />
                  </div>
                </li>
              );
            })}
          </ol>
          <Textarea label="Comentario general" value={general} onChange={(e) => setGeneral(e.target.value)} rows={3} />
        </div>
      )}
    </Drawer>
  );
}
