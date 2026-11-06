import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Pencil, Plus, Trash2, Users } from 'lucide-react';
import { api, ApiError, type Paged } from '@/lib/api';
import { useAction } from '@/lib/hooks';
import { date, fullName } from '@/lib/format';
import { Button, IconButton } from '@/components/ui/Button';
import { Avatar, DataTable, type Column } from '@/components/ui/Data';
import { EmptyState, ErrorState, PageLoader } from '@/components/ui/Feedback';
import { Checkbox, Input, Select } from '@/components/ui/Form';
import { ConfirmDialog, Modal } from '@/components/ui/Overlay';
import { toast } from 'sonner';
import { fromDateInput, toDateInput, type CourseFull, type GroupItem, type UserBrief } from './shared';

export interface EnrollmentRow {
  id: number;
  status: string;
  source: string;
  progressPct: number;
  finalGrade: number | null;
  enrolledAt: string;
  groupId: number | null;
  user: UserBrief & { email: string };
  group: { id: number; name: string } | null;
}

export default function TabGrupos({ course }: { course: CourseFull }) {
  const key = ['groups', course.id];
  const q = useQuery({ queryKey: key, queryFn: () => api.get<{ data: GroupItem[] }>(`/catalog/courses/${course.id}/groups`) });
  const [edit, setEdit] = useState<GroupItem | 'new' | null>(null);
  const [members, setMembers] = useState<GroupItem | null>(null);
  const [del, setDel] = useState<GroupItem | null>(null);
  const rm = useAction((id: number) => api.del(`/catalog/groups/${id}`), { success: 'Grupo eliminado', invalidate: [key, ['course', course.id], ['course-enrollments']], onSuccess: () => setDel(null) });

  const columns: Column<GroupItem>[] = [
    { key: 'name', header: 'Grupo', cell: (g) => <span className="font-semibold">{g.name}</span> },
    { key: 'inst', header: 'Facilitador', cell: (g) => (g.instructor ? <span className="inline-flex items-center gap-2"><Avatar user={g.instructor} size={22} />{fullName(g.instructor)}</span> : <span className="text-muted">—</span>) },
    { key: 'dates', header: 'Fechas', cell: (g) => (g.startDate || g.endDate ? `${date(g.startDate)} – ${date(g.endDate)}` : '—') },
    { key: 'cap', header: 'Integrantes', align: 'right', cell: (g) => `${g.enrollmentsCount}${g.capacity ? ` / ${g.capacity}` : ''}` },
    { key: 'act', header: <span className="sr-only">Acciones</span>, align: 'right', cell: (g) => (
      <div className="flex items-center justify-end gap-1">
        <Button size="sm" variant="outline" icon={<Users className="size-4" />} onClick={() => setMembers(g)}>Integrantes</Button>
        <IconButton label={`Editar ${g.name}`} size="sm" onClick={() => setEdit(g)}><Pencil className="size-4" /></IconButton>
        <IconButton label={`Eliminar ${g.name}`} size="sm" onClick={() => setDel(g)}><Trash2 className="size-4 text-danger" /></IconButton>
      </div>
    ) },
  ];

  return (
    <div>
      <div className="mb-4 flex justify-end"><Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setEdit('new')}>Nuevo grupo</Button></div>
      {q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : (
        <DataTable columns={columns} rows={q.data?.data} rowKey={(g) => g.id} loading={q.isLoading}
          empty={<EmptyState title="Este curso no tiene grupos" description="Los grupos permiten organizar cohortes, asignar facilitadores y filtrar eventos y foros." action={<Button variant="primary" onClick={() => setEdit('new')}>Nuevo grupo</Button>} />} />
      )}
      {edit && <GroupModal course={course} group={edit === 'new' ? null : edit} onClose={() => setEdit(null)} />}
      {members && <MembersModal course={course} group={members} onClose={() => setMembers(null)} />}
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} title="Eliminar grupo" description={`Se eliminará «${del?.name}». Sus integrantes quedarán sin grupo.`} confirmLabel="Eliminar" loading={rm.isPending} onConfirm={() => del && rm.mutate(del.id)} />
    </div>
  );
}

function GroupModal({ course, group, onClose }: { course: CourseFull; group: GroupItem | null; onClose: () => void }) {
  const [f, setF] = useState({ name: group?.name ?? '', instructorId: group?.instructorId ? String(group.instructorId) : '', startDate: toDateInput(group?.startDate), endDate: toDateInput(group?.endDate), capacity: group?.capacity ? String(group.capacity) : '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const save = useAction(
    () => {
      const body = { name: f.name.trim(), instructorId: f.instructorId ? Number(f.instructorId) : null, startDate: fromDateInput(f.startDate), endDate: fromDateInput(f.endDate), capacity: f.capacity ? Number(f.capacity) : null };
      return group ? api.patch(`/catalog/groups/${group.id}`, body) : api.post(`/catalog/courses/${course.id}/groups`, body);
    },
    { success: 'Grupo guardado', invalidate: [['groups', course.id], ['course', course.id]], silentError: true, onSuccess: onClose },
  );
  const submit = async () => {
    setErrors({});
    if (!f.name.trim()) return setErrors({ name: 'Escribe un nombre' });
    try { await save.mutateAsync(); } catch (e) { if (e instanceof ApiError) { setErrors(e.fieldErrors); toast.error(e.message); } }
  };
  return (
    <Modal open onClose={onClose} title={group ? 'Editar grupo' : 'Nuevo grupo'}
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button variant="primary" loading={save.isPending} onClick={submit}>Guardar</Button></>}>
      <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <Input label="Nombre" required value={f.name} error={errors.name} onChange={(e) => setF({ ...f, name: e.target.value })} maxLength={120} />
        <Select label="Facilitador" value={f.instructorId} onChange={(e) => setF({ ...f, instructorId: e.target.value })} placeholder="Sin facilitador" options={course.instructors.map((u) => ({ value: u.id, label: fullName(u) }))} hint="Se listan los facilitadores del curso." />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Inicio" type="date" value={f.startDate} onChange={(e) => setF({ ...f, startDate: e.target.value })} />
          <Input label="Fin" type="date" value={f.endDate} onChange={(e) => setF({ ...f, endDate: e.target.value })} error={errors.endDate} />
        </div>
        <Input label="Cupo" type="number" min={1} value={f.capacity} onChange={(e) => setF({ ...f, capacity: e.target.value })} hint="Vacío = sin límite" error={errors.capacity} />
      </form>
    </Modal>
  );
}

function MembersModal({ course, group, onClose }: { course: CourseFull; group: GroupItem; onClose: () => void }) {
  const q = useQuery({ queryKey: ['course-enrollments', course.id, 'all'], queryFn: () => api.get<Paged<EnrollmentRow>>('/classroom/enrollments', { courseId: course.id, pageSize: 100 }) });
  const [sel, setSel] = useState<number[] | null>(null);
  useEffect(() => { if (q.data && sel === null) setSel(q.data.data.filter((e) => e.groupId === group.id).map((e) => e.id)); }, [q.data, sel, group.id]);
  const save = useAction(() => api.put(`/catalog/groups/${group.id}/members`, { enrollmentIds: sel ?? [] }), {
    success: 'Integrantes actualizados', invalidate: [['groups', course.id], ['course-enrollments'], ['course', course.id]], onSuccess: onClose,
  });
  const active = (q.data?.data ?? []).filter((e) => e.status !== 'CANCELLED');
  return (
    <Modal open onClose={onClose} title={`Integrantes de «${group.name}»`} description={group.capacity ? `Cupo máximo: ${group.capacity}` : undefined}
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button variant="primary" loading={save.isPending} onClick={() => save.mutate()}>Guardar ({sel?.length ?? 0})</Button></>}>
      {q.isLoading || sel === null ? <PageLoader /> : q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : active.length === 0 ? (
        <p className="text-sm text-graphite">El curso no tiene inscritos todavía. Inscribe estudiantes en la pestaña Inscripciones.</p>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {active.map((e) => (
            <li key={e.id} className="py-2">
              <Checkbox label={fullName(e.user)} hint={`${e.user.email}${e.group && e.group.id !== group.id ? ` · hoy en ${e.group.name}` : ''}`} checked={sel.includes(e.id)} onChange={(ev) => setSel(ev.target.checked ? [...sel, e.id] : sel.filter((x) => x !== e.id))} />
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
