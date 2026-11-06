import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { useAction } from '@/lib/hooks';
import { ASSESSMENT_TYPES } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { DataTable, Tag, type Column } from '@/components/ui/Data';
import { EmptyState, ErrorState } from '@/components/ui/Feedback';
import { Input, Select } from '@/components/ui/Form';
import { Modal } from '@/components/ui/Overlay';
import { toOptions, type AssessmentListItem, type CourseFull } from './shared';

export default function TabEvaluaciones({ course }: { course: CourseFull }) {
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const q = useQuery({ queryKey: ['course-assessments', course.id], queryFn: () => api.get<{ data: AssessmentListItem[] }>('/assessments', { courseId: course.id }) });
  const lessons = course.modules.flatMap((m) => m.lessons.map((l) => ({ value: l.id, label: `${m.title} › ${l.title}` })));

  const columns: Column<AssessmentListItem>[] = [
    { key: 'title', header: 'Evaluación', className: 'min-w-[14rem]', cell: (a) => <button type="button" className="text-left font-semibold hover:underline" onClick={() => nav(`/panel/evaluaciones/${a.id}`)}>{a.title}</button> },
    { key: 'type', header: 'Tipo', cell: (a) => ASSESSMENT_TYPES[a.type] ?? a.type },
    { key: 'q', header: 'Preguntas', align: 'right', cell: (a) => a.questionCount },
    { key: 'att', header: 'Intentos', align: 'right', cell: (a) => `${a.attemptCount}${a.maxAttempts ? ` (máx. ${a.maxAttempts} por estudiante)` : ' (ilimitados)'}` },
    { key: 'pub', header: 'Estado', cell: (a) => <Tag tone={a.isPublished ? 'success' : 'warning'}>{a.isPublished ? 'Publicada' : 'Borrador'}</Tag> },
    { key: 'go', header: <span className="sr-only">Abrir</span>, align: 'right', cell: (a) => <Button size="sm" variant="outline" onClick={() => nav(`/panel/evaluaciones/${a.id}`)}>Abrir</Button> },
  ];

  return (
    <div>
      <div className="mb-4 flex justify-end"><Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setOpen(true)}>Nueva evaluación</Button></div>
      {q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : (
        <DataTable columns={columns} rows={q.data?.data} rowKey={(a) => a.id} loading={q.isLoading}
          empty={<EmptyState title="Este curso no tiene evaluaciones" description="Crea un cuestionario, una evaluación final o una autoevaluación." action={<Button variant="primary" onClick={() => setOpen(true)}>Nueva evaluación</Button>} />} />
      )}
      {open && <NewAssessment courseId={course.id} lessons={lessons} onClose={() => setOpen(false)} />}
    </div>
  );
}

function NewAssessment({ courseId, lessons, onClose }: { courseId: number; lessons: { value: number; label: string }[]; onClose: () => void }) {
  const nav = useNavigate();
  const [f, setF] = useState({ title: '', type: 'QUIZ', lessonId: '' });
  const [err, setErr] = useState<string>();
  const create = useAction(
    () => api.post<{ data: { id: number } }>('/assessments', { courseId, title: f.title.trim(), type: f.type, lessonId: f.lessonId ? Number(f.lessonId) : undefined, isPublished: false }),
    { success: 'Evaluación creada', invalidate: [['course-assessments', courseId]], onSuccess: (r) => nav(`/panel/evaluaciones/${r.data.id}`) },
  );
  const submit = () => (f.title.trim().length < 2 ? setErr('Escribe un título') : create.mutate());
  return (
    <Modal open onClose={onClose} title="Nueva evaluación" description="Se crea sin publicar; añade las preguntas en el editor."
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button variant="primary" loading={create.isPending} onClick={submit}>Crear y abrir</Button></>}>
      <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <Input label="Título" required value={f.title} error={err} onChange={(e) => { setErr(undefined); setF({ ...f, title: e.target.value }); }} />
        <Select label="Tipo" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} options={toOptions(ASSESSMENT_TYPES)} />
        <Select label="Lección (opcional)" value={f.lessonId} onChange={(e) => setF({ ...f, lessonId: e.target.value })} placeholder="Sin lección asociada" options={lessons} />
      </form>
    </Modal>
  );
}
