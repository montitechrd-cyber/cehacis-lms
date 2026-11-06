import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Save } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
import { useAction } from '@/lib/hooks';
import { ASSESSMENT_TYPES } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { Tabs, Tag } from '@/components/ui/Data';
import { ErrorState, PageLoader } from '@/components/ui/Feedback';
import { Input, Select, Switch, Textarea } from '@/components/ui/Form';
import { PageHeader } from '@/components/ui/Page';
import { toOptions, toLocalInput, fromLocalInput, useBeforeUnload } from '@/features/course-admin/shared';
import QuestionBuilder, { type Question } from '@/features/course-admin/QuestionBuilder';
import AttemptsPanel from '@/features/course-admin/AttemptsPanel';

interface AssessmentFull {
  id: number; courseId: number; lessonId: number | null; title: string; description: string | null; type: string; timeLimitMin: number | null; maxAttempts: number; passingScore: number; weight: number;
  shuffle: boolean; showResults: boolean; isPublished: boolean; availableFrom: string | null; availableUntil: string | null; rubricId: number | null; attemptCount: number; questions: Question[];
}

export default function AssessmentEditor() {
  const id = Number(useParams().id);
  const [sp, setSp] = useSearchParams();
  const tab = (['config', 'preguntas', 'intentos'].includes(sp.get('tab') ?? '') ? sp.get('tab') : 'config') as 'config' | 'preguntas' | 'intentos';
  const q = useQuery({ queryKey: ['assessment', id], queryFn: () => api.get<{ data: AssessmentFull }>(`/assessments/${id}`) });
  const course = useQuery({ queryKey: ['course-title', q.data?.data.courseId], enabled: !!q.data, queryFn: () => api.get<{ data: { id: number; title: string } }>(`/catalog/courses/${q.data!.data.courseId}`) });

  if (q.isLoading) return <PageLoader />;
  if (q.isError || !q.data) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const a = q.data.data;

  return (
    <div className="animate-rise">
      <PageHeader
        crumbs={[{ label: 'Cursos', to: '/panel/cursos' }, { label: course.data?.data.title ?? 'Curso', to: `/panel/cursos/${a.courseId}?tab=evaluaciones` }, { label: a.title }]}
        title={<span className="flex flex-wrap items-center gap-3">{a.title}<Tag tone={a.isPublished ? 'success' : 'warning'}>{a.isPublished ? 'Publicada' : 'Borrador'}</Tag></span>}
        description={`${ASSESSMENT_TYPES[a.type] ?? a.type} · ${a.questions.length} preguntas · ${a.attemptCount} intentos`}
      />
      <Tabs className="mb-6" value={tab} onChange={(k) => { const n = new URLSearchParams(sp); n.set('tab', k); setSp(n, { replace: true }); }}
        tabs={[{ key: 'config', label: 'Configuración' }, { key: 'preguntas', label: 'Preguntas', count: a.questions.length }, { key: 'intentos', label: 'Intentos', count: a.attemptCount }]} />
      {tab === 'config' && <ConfigForm a={a} />}
      {tab === 'preguntas' && <QuestionBuilder assessmentId={a.id} questions={a.questions} onChanged={() => q.refetch()} />}
      {tab === 'intentos' && <AttemptsPanel assessmentId={a.id} />}
    </div>
  );
}

function ConfigForm({ a }: { a: AssessmentFull }) {
  const init = () => ({
    title: a.title, description: a.description ?? '', type: a.type, timeLimitMin: a.timeLimitMin ? String(a.timeLimitMin) : '', maxAttempts: String(a.maxAttempts), passingScore: String(a.passingScore), weight: String(a.weight),
    shuffle: a.shuffle, showResults: a.showResults, isPublished: a.isPublished, availableFrom: toLocalInput(a.availableFrom), availableUntil: toLocalInput(a.availableUntil), rubricId: a.rubricId ? String(a.rubricId) : '',
  });
  const [f, setF] = useState(init);
  const [base, setBase] = useState(() => JSON.stringify(init()));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const dirty = JSON.stringify(f) !== base;
  useBeforeUnload(dirty);
  useEffect(() => { const v = init(); setF(v); setBase(JSON.stringify(v)); }, [a.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const rubrics = useQuery({ queryKey: ['rubrics', a.courseId], queryFn: () => api.get<{ id: number; title: string }[]>('/competencies/rubrics', { courseId: a.courseId }) });

  const save = useAction(
    () => api.patch(`/assessments/${a.id}`, {
      title: f.title.trim(), description: f.description.trim() || null, type: f.type, timeLimitMin: f.timeLimitMin ? Number(f.timeLimitMin) : null,
      maxAttempts: Number(f.maxAttempts) || 0, passingScore: Number(f.passingScore) || 0, weight: Number(f.weight) || 0, shuffle: f.shuffle, showResults: f.showResults, isPublished: f.isPublished,
      availableFrom: fromLocalInput(f.availableFrom), availableUntil: fromLocalInput(f.availableUntil), rubricId: f.rubricId ? Number(f.rubricId) : null,
    }),
    { success: 'Configuración guardada', invalidate: [['assessment', a.id], ['course-assessments', a.courseId]], silentError: true, onSuccess: () => setBase(JSON.stringify(f)) },
  );
  const submit = async () => {
    setErrors({});
    const e: Record<string, string> = {};
    if (f.title.trim().length < 2) e.title = 'Escribe un título';
    if (f.timeLimitMin && (Number(f.timeLimitMin) < 1 || Number(f.timeLimitMin) > 1440)) e.timeLimitMin = 'Entre 1 y 1440 minutos';
    if (f.availableFrom && f.availableUntil && new Date(f.availableFrom) >= new Date(f.availableUntil)) e.availableUntil = 'Debe ser posterior al inicio';
    if (Object.keys(e).length) return setErrors(e);
    try { await save.mutateAsync(); } catch (ex) { if (ex instanceof ApiError) { setErrors(ex.fieldErrors); toast.error(ex.message); } }
  };
  const isRubric = ['PRACTICAL', 'PEER'].includes(f.type);

  return (
    <form className="grid max-w-3xl gap-5" onSubmit={(e) => { e.preventDefault(); submit(); }}>
      <Input label="Título" required value={f.title} error={errors.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
      <Textarea label="Descripción" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} rows={3} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Tipo" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} options={toOptions(ASSESSMENT_TYPES)} />
        <Input label="Tiempo límite (min)" type="number" min={1} max={1440} value={f.timeLimitMin} error={errors.timeLimitMin} onChange={(e) => setF({ ...f, timeLimitMin: e.target.value })} hint="Vacío = sin límite" />
        <Input label="Intentos permitidos" type="number" min={0} value={f.maxAttempts} onChange={(e) => setF({ ...f, maxAttempts: e.target.value })} hint="0 = ilimitados" />
        <Input label="Nota de aprobación (%)" type="number" min={0} max={100} value={f.passingScore} onChange={(e) => setF({ ...f, passingScore: e.target.value })} />
        <Input label="Peso en la nota final (%)" type="number" min={0} max={100} value={f.weight} onChange={(e) => setF({ ...f, weight: e.target.value })} />
        <Select label="Rúbrica" value={f.rubricId} onChange={(e) => setF({ ...f, rubricId: e.target.value })} placeholder="Sin rúbrica" options={(rubrics.data ?? []).map((r) => ({ value: r.id, label: r.title }))} hint={isRubric ? 'Recomendada para evaluaciones prácticas o entre compañeros.' : undefined} />
        <Input label="Disponible desde" type="datetime-local" value={f.availableFrom} onChange={(e) => setF({ ...f, availableFrom: e.target.value })} />
        <Input label="Disponible hasta" type="datetime-local" value={f.availableUntil} error={errors.availableUntil} onChange={(e) => setF({ ...f, availableUntil: e.target.value })} />
      </div>
      <Switch checked={f.shuffle} onChange={(v) => setF({ ...f, shuffle: v })} label="Barajar preguntas y opciones" />
      <Switch checked={f.showResults} onChange={(v) => setF({ ...f, showResults: v })} label="Mostrar resultados al estudiante" hint="Incluye respuestas correctas y explicaciones." />
      <Switch checked={f.isPublished} onChange={(v) => setF({ ...f, isPublished: v })} label="Publicada" hint="Solo las evaluaciones publicadas son visibles para los estudiantes." />
      <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-ink bg-paper py-3">
        <span className="text-sm text-muted" role="status">{dirty ? 'Hay cambios sin guardar' : 'Todo guardado'}</span>
        <Button type="submit" variant="primary" icon={<Save className="size-4" />} loading={save.isPending} disabled={!dirty}>Guardar cambios</Button>
      </div>
    </form>
  );
}
