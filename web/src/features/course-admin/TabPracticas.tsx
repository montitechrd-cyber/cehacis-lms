import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
import { useAction } from '@/lib/hooks';
import { ACTIVITY_TYPES, date } from '@/lib/format';
import { Button, IconButton } from '@/components/ui/Button';
import { DataTable, Tag, type Column } from '@/components/ui/Data';
import { EmptyState, ErrorState, PageLoader } from '@/components/ui/Feedback';
import { Checkbox, Input, Select, Switch, Textarea } from '@/components/ui/Form';
import { ConfirmDialog, Drawer } from '@/components/ui/Overlay';
import { SUBMISSION_TYPES, fromLocalInput, toLocalInput, toOptions, type ActivityListItem, type CompetencyOpt, type CourseFull } from './shared';

interface ActivityDetail {
  id: number; courseId: number; lessonId: number | null; title: string; description: string | null; instructions: string | null; scenario: string | null;
  roles: { name: string; brief: string }[]; type: string; submissionTypes: string[]; dueDate: string | null; maxScore: number; rubricId: number | null;
  peerReview: boolean; peerReviewsRequired: number; isPublished: boolean; competencyIds: number[];
}

export default function TabPracticas({ course }: { course: CourseFull }) {
  const nav = useNavigate();
  const [edit, setEdit] = useState<number | 'new' | null>(null);
  const [del, setDel] = useState<ActivityListItem | null>(null);
  const q = useQuery({ queryKey: ['course-activities', course.id], queryFn: () => api.get<ActivityListItem[]>('/activities', { courseId: course.id }) });
  const remove = useAction((id: number) => api.del(`/activities/${id}`), { success: 'Actividad eliminada', invalidate: [['course-activities', course.id]], onSuccess: () => setDel(null) });

  const columns: Column<ActivityListItem>[] = [
    { key: 'title', header: 'Actividad', className: 'min-w-[14rem]', cell: (a) => <button type="button" className="text-left font-semibold hover:underline" onClick={() => setEdit(a.id)}>{a.title}</button> },
    { key: 'type', header: 'Tipo', cell: (a) => ACTIVITY_TYPES[a.type] ?? a.type },
    { key: 'due', header: 'Fecha límite', cell: (a) => date(a.dueDate) },
    { key: 'sub', header: 'Entregas', align: 'right', cell: (a) => a.submissionsCount },
    { key: 'pend', header: 'Pendientes', align: 'right', cell: (a) => (a.pendingCount ? <Tag tone="warning">{a.pendingCount}</Tag> : 0) },
    { key: 'pub', header: 'Estado', cell: (a) => <Tag tone={a.isPublished ? 'success' : 'warning'}>{a.isPublished ? 'Publicada' : 'Oculta'}</Tag> },
    { key: 'act', header: <span className="sr-only">Acciones</span>, align: 'right', cell: (a) => (
      <div className="flex items-center justify-end gap-1">
        <Button size="sm" variant="outline" onClick={() => nav(`/panel/actividades/${a.id}`)}>Revisar entregas</Button>
        <IconButton label={`Editar ${a.title}`} size="sm" onClick={() => setEdit(a.id)}><Pencil className="size-4" /></IconButton>
        <IconButton label={`Eliminar ${a.title}`} size="sm" onClick={() => setDel(a)}><Trash2 className="size-4 text-danger" /></IconButton>
      </div>
    ) },
  ];

  return (
    <div>
      <div className="mb-4 flex justify-end"><Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setEdit('new')}>Nueva actividad</Button></div>
      {q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : (
        <DataTable columns={columns} rows={q.data} rowKey={(a) => a.id} loading={q.isLoading}
          empty={<EmptyState title="Este curso no tiene actividades prácticas" description="Define role-playing, casos, oratoria o ejercicios con rúbrica." action={<Button variant="primary" onClick={() => setEdit('new')}>Nueva actividad</Button>} />} />
      )}
      {edit !== null && <ActivityDrawer course={course} id={edit} onClose={() => setEdit(null)} />}
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} title="Eliminar actividad" description={`Se eliminará «${del?.title}». Si ya tiene entregas, el servidor lo impedirá: en ese caso despublícala.`} confirmLabel="Eliminar" loading={remove.isPending} onConfirm={() => del && remove.mutate(del.id)} />
    </div>
  );
}

function ActivityDrawer({ course, id, onClose }: { course: CourseFull; id: number | 'new'; onClose: () => void }) {
  const isNew = id === 'new';
  const detail = useQuery({ queryKey: ['activity', id], enabled: !isNew, queryFn: () => api.get<ActivityDetail>(`/activities/${id}`) });
  const rubrics = useQuery({ queryKey: ['rubrics', course.id], queryFn: () => api.get<{ id: number; title: string }[]>('/competencies/rubrics', { courseId: course.id }) });
  const comps = useQuery({ queryKey: ['competencies'], queryFn: () => api.get<CompetencyOpt[]>('/competencies') });
  const [f, setF] = useState({ title: '', type: 'INDIVIDUAL', description: '', instructions: '', scenario: '', roles: [] as { name: string; brief: string }[], submissionTypes: ['FILE', 'TEXT'] as string[], dueDate: '', maxScore: '100', rubricId: '', peerReview: false, peerReviewsRequired: '0', isPublished: true, competencyIds: [] as number[], lessonId: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const a = detail.data;
    if (!a) return;
    setF({ title: a.title, type: a.type, description: a.description ?? '', instructions: a.instructions ?? '', scenario: a.scenario ?? '', roles: a.roles ?? [], submissionTypes: a.submissionTypes, dueDate: toLocalInput(a.dueDate), maxScore: String(a.maxScore), rubricId: a.rubricId ? String(a.rubricId) : '', peerReview: a.peerReview, peerReviewsRequired: String(a.peerReviewsRequired), isPublished: a.isPublished, competencyIds: a.competencyIds ?? [], lessonId: a.lessonId ? String(a.lessonId) : '' });
  }, [detail.data]);

  const save = useAction(
    () => {
      const body = {
        ...(isNew ? { courseId: course.id } : {}),
        title: f.title.trim(), type: f.type, description: f.description.trim() || null, instructions: f.instructions.trim() || null, scenario: f.scenario.trim() || null,
        roles: f.roles.filter((r) => r.name.trim()), submissionTypes: f.submissionTypes, dueDate: fromLocalInput(f.dueDate), maxScore: Number(f.maxScore) || 100,
        rubricId: f.rubricId ? Number(f.rubricId) : null, peerReview: f.peerReview, peerReviewsRequired: f.peerReview ? Number(f.peerReviewsRequired) || 0 : 0,
        isPublished: f.isPublished, competencyIds: f.competencyIds, lessonId: f.lessonId ? Number(f.lessonId) : null,
      };
      return isNew ? api.post('/activities', body) : api.patch(`/activities/${id}`, body);
    },
    { success: 'Actividad guardada', invalidate: [['course-activities', course.id], ['activity']], silentError: true, onSuccess: onClose },
  );
  const submit = async () => {
    setErrors({});
    if (f.title.trim().length < 2) return setErrors({ title: 'Escribe un título' });
    if (!f.submissionTypes.length) return setErrors({ submissionTypes: 'Elige al menos un tipo de entrega' });
    try { await save.mutateAsync(); } catch (e) { if (e instanceof ApiError) { setErrors(e.fieldErrors); toast.error(e.message); } }
  };
  const toggle = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  return (
    <Drawer open onClose={onClose} width="max-w-3xl" title={isNew ? 'Nueva actividad' : 'Editar actividad'}
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button variant="primary" loading={save.isPending} onClick={submit}>Guardar</Button></>}>
      {!isNew && detail.isLoading ? <PageLoader /> : detail.isError ? <ErrorState error={detail.error} onRetry={() => detail.refetch()} /> : (
        <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <Input label="Título" required value={f.title} error={errors.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Tipo" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} options={toOptions(ACTIVITY_TYPES)} />
            <Select label="Lección (opcional)" value={f.lessonId} onChange={(e) => setF({ ...f, lessonId: e.target.value })} placeholder="Sin lección" options={course.modules.flatMap((m) => m.lessons.map((l) => ({ value: l.id, label: `${m.title} › ${l.title}` })))} />
          </div>
          <Textarea label="Descripción" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} rows={3} />
          <Textarea label="Instrucciones" value={f.instructions} onChange={(e) => setF({ ...f, instructions: e.target.value })} rows={3} />
          <Textarea label="Escenario" value={f.scenario} onChange={(e) => setF({ ...f, scenario: e.target.value })} rows={3} hint="Contexto de la simulación, caso o conversación." />

          <fieldset className="border-t border-line pt-3">
            <legend className="text-[0.8125rem] font-semibold">Roles</legend>
            <ul className="mt-2 grid gap-3">
              {f.roles.map((r, i) => (
                <li key={i} className="grid grid-cols-[1fr_auto] items-start gap-2 sm:grid-cols-[12rem_1fr_auto]">
                  <input aria-label={`Nombre del rol ${i + 1}`} placeholder="Nombre" value={r.name} onChange={(e) => setF({ ...f, roles: f.roles.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} className="h-10 rounded-sm border border-line-strong px-3 text-sm focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink" />
                  <input aria-label={`Descripción del rol ${i + 1}`} placeholder="Indicaciones del rol" value={r.brief} onChange={(e) => setF({ ...f, roles: f.roles.map((x, j) => (j === i ? { ...x, brief: e.target.value } : x)) })} className="order-3 col-span-2 h-10 rounded-sm border border-line-strong px-3 text-sm focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink sm:order-none sm:col-span-1" />
                  <IconButton label={`Quitar rol ${i + 1}`} size="sm" onClick={() => setF({ ...f, roles: f.roles.filter((_, j) => j !== i) })}><X className="size-4" /></IconButton>
                </li>
              ))}
            </ul>
            <Button variant="ghost" size="sm" className="mt-2" icon={<Plus className="size-4" />} onClick={() => setF({ ...f, roles: [...f.roles, { name: '', brief: '' }] })}>Añadir rol</Button>
          </fieldset>

          <fieldset>
            <legend className="text-[0.8125rem] font-semibold">Tipos de entrega permitidos</legend>
            <div className="mt-2 flex flex-wrap gap-5">
              {Object.entries(SUBMISSION_TYPES).map(([k, l]) => <Checkbox key={k} label={l} checked={f.submissionTypes.includes(k)} onChange={() => setF({ ...f, submissionTypes: toggle(f.submissionTypes, k) })} />)}
            </div>
            {errors.submissionTypes && <p className="mt-1 text-xs font-semibold text-danger">{errors.submissionTypes}</p>}
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Fecha límite" type="datetime-local" value={f.dueDate} onChange={(e) => setF({ ...f, dueDate: e.target.value })} />
            <Input label="Puntuación máxima" type="number" min={1} value={f.maxScore} onChange={(e) => setF({ ...f, maxScore: e.target.value })} error={errors.maxScore} />
          </div>
          <Select label="Rúbrica" value={f.rubricId} onChange={(e) => setF({ ...f, rubricId: e.target.value })} placeholder="Sin rúbrica (nota directa)" options={(rubrics.data ?? []).map((r) => ({ value: r.id, label: r.title }))} hint="Las rúbricas se crean en Competencias y rúbricas." />
          <Switch checked={f.peerReview} onChange={(v) => setF({ ...f, peerReview: v })} label="Revisión entre pares" hint="Cada estudiante evalúa entregas anónimas de compañeros." />
          {f.peerReview && <Input label="Revisiones que debe hacer cada estudiante" type="number" min={1} value={f.peerReviewsRequired} onChange={(e) => setF({ ...f, peerReviewsRequired: e.target.value })} />}

          <fieldset>
            <legend className="text-[0.8125rem] font-semibold">Competencias</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {(comps.data ?? []).map((c) => (
                <button key={c.id} type="button" aria-pressed={f.competencyIds.includes(c.id)} onClick={() => setF({ ...f, competencyIds: f.competencyIds.includes(c.id) ? f.competencyIds.filter((x) => x !== c.id) : [...f.competencyIds, c.id] })}
                  className={`rounded-sm border px-3 py-1.5 text-sm font-medium ${f.competencyIds.includes(c.id) ? 'border-ink bg-ink text-paper' : 'border-line-strong hover:border-ink'}`}>{c.name}</button>
              ))}
            </div>
          </fieldset>
          <Switch checked={f.isPublished} onChange={(v) => setF({ ...f, isPublished: v })} label="Publicada" />
        </form>
      )}
    </Drawer>
  );
}
