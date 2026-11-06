import { useState } from 'react';
import { useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Pencil, Plus, Shuffle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError, type Paged } from '@/lib/api';
import { useAction, useTableParams } from '@/lib/hooks';
import { ACTIVITY_TYPES, date, dateTime, fullName, num } from '@/lib/format';
import { Button, IconButton } from '@/components/ui/Button';
import { Avatar, DataTable, Facts, Ledger, Pagination, Tag, Toolbar, statusTone, type Column } from '@/components/ui/Data';
import { EmptyState, ErrorState, PageLoader } from '@/components/ui/Feedback';
import { Checkbox, Input, Select } from '@/components/ui/Form';
import { ConfirmDialog, Modal } from '@/components/ui/Overlay';
import { PageHeader, Section } from '@/components/ui/Page';
import SubmissionGrader, { type SubmissionRow } from '@/features/course-admin/SubmissionGrader';
import { SUBMISSION_STATUS, SUBMISSION_TYPES, toOptions, type Rubric, type UserBrief } from '@/features/course-admin/shared';

interface ActGroup { id: number; activityId: number; name: string; members: { userId: number; role: string | null; user: UserBrief & { email: string } }[] }
interface ActivityFull {
  id: number; courseId: number; title: string; description: string | null; instructions: string | null; scenario: string | null; roles: { name: string; brief: string }[]; type: string; submissionTypes: string[];
  dueDate: string | null; maxScore: number; rubricId: number | null; peerReview: boolean; peerReviewsRequired: number; isPublished: boolean;
  competencies: { id: number; name: string }[]; rubric: Rubric | null; groups: ActGroup[];
}
interface EnrollRow { id: number; status: string; user: UserBrief & { email: string } }

export default function ActivityReview() {
  const id = Number(useParams().id);
  const t = useTableParams();
  const [open, setOpen] = useState<SubmissionRow | null>(null);
  const a = useQuery({ queryKey: ['activity', id, 'review'], queryFn: () => api.get<ActivityFull>(`/activities/${id}`) });
  const query = { status: t.get('estado'), page: t.page, pageSize: 20 };
  const subs = useQuery({ queryKey: ['activity-submissions', id, query], queryFn: () => api.get<Paged<SubmissionRow>>(`/activities/${id}/submissions`, query), placeholderData: (p) => p });
  const list = useQuery({ queryKey: ['course-activities', a.data?.courseId], enabled: !!a.data, queryFn: () => api.get<{ id: number; submissionsCount: number; pendingCount: number; gradedCount: number; returnedCount: number; groupsCount: number }[]>('/activities', { courseId: a.data!.courseId }) });

  if (a.isLoading) return <PageLoader />;
  if (a.isError || !a.data) return <ErrorState error={a.error} onRetry={() => a.refetch()} />;
  const act = a.data;
  const stats = list.data?.find((x) => x.id === id);

  const columns: Column<SubmissionRow>[] = [
    { key: 'user', header: 'Estudiante', className: 'min-w-[14rem]', cell: (s) => <span className="flex items-center gap-2"><Avatar user={s.user} size={26} /><span><span className="block font-semibold">{fullName(s.user)}</span><span className="block text-xs text-muted">{s.group ? s.group.name : s.user.email}</span></span></span> },
    { key: 'status', header: 'Estado', cell: (s) => <Tag tone={statusTone(s.status)}>{SUBMISSION_STATUS[s.status] ?? s.status}</Tag> },
    { key: 'date', header: 'Entregada', cell: (s) => dateTime(s.submittedAt) },
    { key: 'files', header: 'Contenido', cell: (s) => [s.text ? 'Texto' : '', s.linkUrl ? 'Enlace' : '', s.files.length ? `${s.files.length} archivo(s)` : ''].filter(Boolean).join(' · ') || '—' },
    { key: 'score', header: 'Nota', align: 'right', cell: (s) => (s.score == null ? '—' : `${num(s.score, 2)} / ${act.maxScore}`) },
    { key: 'go', header: <span className="sr-only">Abrir</span>, align: 'right', cell: (s) => <Button size="sm" variant={s.status === 'SUBMITTED' ? 'primary' : 'outline'} onClick={() => setOpen(s)}>{s.status === 'SUBMITTED' ? 'Calificar' : 'Abrir'}</Button> },
  ];

  return (
    <div className="animate-rise">
      <PageHeader
        crumbs={[{ label: 'Cursos', to: '/panel/cursos' }, { label: 'Curso', to: `/panel/cursos/${act.courseId}?tab=practicas` }, { label: act.title }]}
        title={act.title}
        description={`${ACTIVITY_TYPES[act.type] ?? act.type}${act.dueDate ? ` · fecha límite ${dateTime(act.dueDate)}` : ''}`}
      />
      <Ledger className="mb-8" items={[
        { label: 'Entregas', value: stats?.submissionsCount ?? '—' },
        { label: 'Por calificar', value: stats?.pendingCount ?? '—' },
        { label: 'Calificadas', value: stats?.gradedCount ?? '—' },
        { label: 'Devueltas', value: stats?.returnedCount ?? '—' },
      ]} />

      <Section title="Entregas">
        <Toolbar>
          <Select aria-label="Estado de la entrega" wrapperClassName="w-48" value={t.get('estado')} onChange={(e) => t.set({ estado: e.target.value })} placeholder="Todos los estados" options={toOptions(SUBMISSION_STATUS)} />
        </Toolbar>
        {subs.isError ? <ErrorState error={subs.error} onRetry={() => subs.refetch()} /> : (
          <>
            <DataTable columns={columns} rows={subs.data?.data} rowKey={(s) => s.id} loading={subs.isLoading} empty={<EmptyState title="Sin entregas" description={t.get('estado') ? 'No hay entregas con ese estado.' : 'Aún nadie ha entregado esta actividad.'} />} />
            {subs.data && <Pagination page={subs.data.meta.page} pages={subs.data.meta.pages} total={subs.data.meta.total} onPage={(p) => t.set({ page: p }, false)} />}
          </>
        )}
      </Section>

      <Section title="Resumen de la actividad">
        <div className="grid gap-8 lg:grid-cols-2">
          <Facts items={[
            { label: 'Puntuación máxima', value: act.maxScore },
            { label: 'Fecha límite', value: act.dueDate ? date(act.dueDate) : 'Sin fecha' },
            { label: 'Rúbrica', value: act.rubric?.title ?? 'Sin rúbrica' },
            { label: 'Tipos de entrega', value: act.submissionTypes.map((x) => SUBMISSION_TYPES[x] ?? x).join(', ') || 'Todos' },
            { label: 'Revisión entre pares', value: act.peerReview ? `Sí (${act.peerReviewsRequired})` : 'No' },
            { label: 'Competencias', value: act.competencies.map((c) => c.name).join(', ') || '—' },
          ]} />
          <div className="grid gap-3 text-sm">
            {act.description && <p>{act.description}</p>}
            {act.scenario && <p><strong>Escenario: </strong>{act.scenario}</p>}
            {act.instructions && <p><strong>Instrucciones: </strong>{act.instructions}</p>}
            {act.roles.length > 0 && <ul className="list-disc pl-5">{act.roles.map((r, i) => <li key={i}><strong>{r.name}</strong>{r.brief && `: ${r.brief}`}</li>)}</ul>}
          </div>
        </div>
      </Section>

      <GroupsSection activity={act} onChanged={() => { a.refetch(); }} />

      {open && <SubmissionGrader submission={open} rubric={act.rubric} maxScore={act.maxScore} activityId={id} onClose={() => setOpen(null)} />}
    </div>
  );
}

function GroupsSection({ activity, onChanged }: { activity: ActivityFull; onChanged: () => void }) {
  const [edit, setEdit] = useState<ActGroup | 'new' | null>(null);
  const [auto, setAuto] = useState(false);
  const [size, setSize] = useState('3');
  const [del, setDel] = useState<ActGroup | null>(null);
  const done = { invalidate: [['activity', activity.id]], onSuccess: () => { setEdit(null); setAuto(false); setDel(null); onChanged(); } };
  const rm = useAction((gid: number) => api.del(`/activities/groups/${gid}`), { ...done, success: 'Grupo eliminado' });
  const autoGroup = useAction(() => api.post(`/activities/${activity.id}/groups/auto`, { size: Number(size) }), { ...done, success: 'Grupos creados' });

  return (
    <Section title="Grupos de la actividad" description="Para actividades grupales: una entrega por grupo."
      actions={<><Button size="sm" variant="outline" icon={<Shuffle className="size-4" />} onClick={() => setAuto(true)}>Auto-agrupar</Button><Button size="sm" variant="primary" icon={<Plus className="size-4" />} onClick={() => setEdit('new')}>Nuevo grupo</Button></>}>
      {activity.groups.length === 0 ? <EmptyState title="Sin grupos" description="Crea grupos manualmente o repártelos al azar con un tamaño fijo." /> : (
        <ul className="divide-y divide-line border-y border-line">
          {activity.groups.map((g) => (
            <li key={g.id} className="flex flex-wrap items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{g.name} <span className="text-xs font-normal text-muted tnum">({g.members.length})</span></p>
                <p className="text-sm text-graphite">{g.members.map((m) => fullName(m.user)).join(', ') || 'Sin integrantes'}</p>
              </div>
              <IconButton label={`Editar ${g.name}`} size="sm" onClick={() => setEdit(g)}><Pencil className="size-4" /></IconButton>
              <IconButton label={`Eliminar ${g.name}`} size="sm" onClick={() => setDel(g)}><Trash2 className="size-4 text-danger" /></IconButton>
            </li>
          ))}
        </ul>
      )}
      {edit && <GroupModal activity={activity} group={edit === 'new' ? null : edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); onChanged(); }} />}
      <Modal open={auto} onClose={() => setAuto(false)} size="sm" title="Auto-agrupar" description="Se borrarán los grupos actuales y se repartirán al azar los inscritos activos."
        footer={<><Button variant="ghost" onClick={() => setAuto(false)}>Cancelar</Button><Button variant="primary" loading={autoGroup.isPending} disabled={Number(size) < 1} onClick={() => autoGroup.mutate()}>Crear grupos</Button></>}>
        <Input label="Integrantes por grupo" type="number" min={1} value={size} onChange={(e) => setSize(e.target.value)} />
      </Modal>
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} title="Eliminar grupo" description={`Se eliminará «${del?.name}». No es posible si ya entregó.`} confirmLabel="Eliminar" loading={rm.isPending} onConfirm={() => del && rm.mutate(del.id)} />
    </Section>
  );
}

function GroupModal({ activity, group, onClose, onSaved }: { activity: ActivityFull; group: ActGroup | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(group?.name ?? '');
  const [sel, setSel] = useState<number[]>(group?.members.map((m) => m.userId) ?? []);
  const enr = useQuery({ queryKey: ['course-enrollments', activity.courseId, 'active'], queryFn: () => api.get<Paged<EnrollRow>>('/classroom/enrollments', { courseId: activity.courseId, status: 'ACTIVE', pageSize: 100 }) });
  const taken = new Set(activity.groups.filter((g) => g.id !== group?.id).flatMap((g) => g.members.map((m) => m.userId)));
  const save = useAction(
    () => (group ? api.patch(`/activities/groups/${group.id}`, { name: name.trim(), userIds: sel }) : api.post(`/activities/${activity.id}/groups`, { name: name.trim(), userIds: sel })),
    { success: 'Grupo guardado', invalidate: [['activity', activity.id]], silentError: true, onSuccess: onSaved },
  );
  const submit = async () => {
    if (!name.trim()) return toast.error('Escribe un nombre');
    try { await save.mutateAsync(); } catch (e) { toast.error(e instanceof ApiError ? e.message : 'No se pudo guardar'); }
  };
  return (
    <Modal open onClose={onClose} title={group ? 'Editar grupo' : 'Nuevo grupo'}
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button variant="primary" loading={save.isPending} onClick={submit}>Guardar ({sel.length})</Button></>}>
      <div className="grid gap-4">
        <Input label="Nombre" required value={name} onChange={(e) => setName(e.target.value)} />
        <fieldset>
          <legend className="mb-1 text-[0.8125rem] font-semibold">Integrantes</legend>
          {enr.isLoading ? <PageLoader /> : enr.isError ? <ErrorState error={enr.error} onRetry={() => enr.refetch()} /> : (
            <ul className="max-h-72 divide-y divide-line overflow-y-auto border-y border-line">
              {(enr.data?.data ?? []).map((e) => (
                <li key={e.id} className="py-2">
                  <Checkbox label={fullName(e.user)} hint={taken.has(e.user.id) ? 'Ya está en otro grupo' : e.user.email} disabled={taken.has(e.user.id)} checked={sel.includes(e.user.id)} onChange={(ev) => setSel(ev.target.checked ? [...sel, e.user.id] : sel.filter((x) => x !== e.user.id))} />
                </li>
              ))}
            </ul>
          )}
        </fieldset>
      </div>
    </Modal>
  );
}
