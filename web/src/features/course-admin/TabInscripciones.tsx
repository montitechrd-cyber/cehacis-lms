import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Pencil, Trash2, UserPlus } from 'lucide-react';
import { api, type Paged } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useAction, useTableParams } from '@/lib/hooks';
import { ENROLLMENT_STATUS, date, fullName } from '@/lib/format';
import { Button, IconButton } from '@/components/ui/Button';
import { Avatar, DataTable, Pagination, ProgressRule, SearchInput, Tag, Toolbar, statusTone, type Column } from '@/components/ui/Data';
import { EmptyState, ErrorState, PageLoader } from '@/components/ui/Feedback';
import { Select } from '@/components/ui/Form';
import { ConfirmDialog, Modal } from '@/components/ui/Overlay';
import { toOptions, type CourseFull, type GroupItem } from './shared';
import type { EnrollmentRow } from './TabGrupos';

export default function TabInscripciones({ course }: { course: CourseFull }) {
  const { can } = useAuth();
  const t = useTableParams();
  const [enrolling, setEnrolling] = useState(false);
  const [edit, setEdit] = useState<EnrollmentRow | null>(null);
  const [del, setDel] = useState<EnrollmentRow | null>(null);
  const query = { courseId: course.id, q: t.get('eq'), status: t.get('estado'), page: t.page, pageSize: 20 };
  const q = useQuery({ queryKey: ['course-enrollments', course.id, query], queryFn: () => api.get<Paged<EnrollmentRow>>('/classroom/enrollments', query), placeholderData: (p) => p });
  const rm = useAction((id: number) => api.del(`/classroom/enrollments/${id}`), { success: 'Inscripción eliminada', invalidate: [['course-enrollments'], ['course', course.id]], onSuccess: () => setDel(null) });

  const columns: Column<EnrollmentRow>[] = [
    { key: 'user', header: 'Estudiante', className: 'min-w-[14rem]', cell: (e) => <span className="flex items-center gap-2"><Avatar user={e.user} size={28} /><span><span className="block font-semibold">{fullName(e.user)}</span><span className="block text-xs text-muted">{e.user.email}</span></span></span> },
    { key: 'status', header: 'Estado', cell: (e) => <Tag tone={statusTone(e.status)}>{ENROLLMENT_STATUS[e.status] ?? e.status}</Tag> },
    { key: 'group', header: 'Grupo', cell: (e) => e.group?.name ?? <span className="text-muted">—</span> },
    { key: 'progress', header: 'Progreso', className: 'min-w-[9rem]', cell: (e) => <ProgressRule value={e.progressPct} label={`Progreso de ${fullName(e.user)}`} /> },
    { key: 'grade', header: 'Nota final', align: 'right', cell: (e) => (e.finalGrade != null ? `${e.finalGrade}` : '—') },
    { key: 'date', header: 'Inscrito', cell: (e) => date(e.enrolledAt) },
    { key: 'act', header: <span className="sr-only">Acciones</span>, align: 'right', cell: (e) => (
      <div className="flex justify-end">
        <IconButton label={`Cambiar estado o grupo de ${fullName(e.user)}`} size="sm" onClick={() => setEdit(e)}><Pencil className="size-4" /></IconButton>
        {can('courses.manage') && <IconButton label={`Quitar a ${fullName(e.user)}`} size="sm" onClick={() => setDel(e)}><Trash2 className="size-4 text-danger" /></IconButton>}
      </div>
    ) },
  ];

  return (
    <div>
      <Toolbar>
        <SearchInput className="w-full sm:w-72" value={t.get('eq')} onChange={(v) => t.set({ eq: v })} placeholder="Buscar por nombre o correo" />
        <Select aria-label="Estado" wrapperClassName="w-44" value={t.get('estado')} onChange={(e) => t.set({ estado: e.target.value })} placeholder="Todos los estados" options={toOptions(ENROLLMENT_STATUS)} />
        <Button className="ml-auto" variant="primary" icon={<UserPlus className="size-4" />} onClick={() => setEnrolling(true)}>Inscribir estudiante</Button>
      </Toolbar>
      {q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : (
        <>
          <DataTable columns={columns} rows={q.data?.data} rowKey={(e) => e.id} loading={q.isLoading}
            empty={<EmptyState title="No hay inscritos" description="Inscribe estudiantes manualmente o espera las inscripciones desde el catálogo." action={<Button variant="primary" onClick={() => setEnrolling(true)}>Inscribir estudiante</Button>} />} />
          {q.data && <Pagination page={q.data.meta.page} pages={q.data.meta.pages} total={q.data.meta.total} onPage={(p) => t.set({ page: p }, false)} />}
        </>
      )}
      {enrolling && <EnrollModal course={course} onClose={() => setEnrolling(false)} />}
      {edit && <EditEnrollment course={course} row={edit} onClose={() => setEdit(null)} />}
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} title="Quitar inscripción" description={`Se eliminará la inscripción de ${fullName(del?.user)}. Su progreso en lecciones se conserva.`} confirmLabel="Quitar" loading={rm.isPending} onConfirm={() => del && rm.mutate(del.id)} />
    </div>
  );
}

interface StudentRow { id: number; firstName: string; lastName: string; email: string; avatarUrl: string | null }

function EnrollModal({ course, onClose }: { course: CourseFull; onClose: () => void }) {
  const [term, setTerm] = useState('');
  const [picked, setPicked] = useState<StudentRow | null>(null);
  const [groupId, setGroupId] = useState('');
  const students = useQuery({ queryKey: ['student-search', term], enabled: term.trim().length >= 2, queryFn: () => api.get<Paged<StudentRow>>('/people/students', { q: term.trim(), pageSize: 8 }) });
  const groups = useQuery({ queryKey: ['groups', course.id], queryFn: () => api.get<{ data: GroupItem[] }>(`/catalog/courses/${course.id}/groups`) });
  const save = useAction(() => api.post('/classroom/enrollments', { userId: picked!.id, courseId: course.id, groupId: groupId ? Number(groupId) : undefined }), {
    success: 'Estudiante inscrito', invalidate: [['course-enrollments'], ['course', course.id], ['groups', course.id]], onSuccess: onClose,
  });
  return (
    <Modal open onClose={onClose} title="Inscribir estudiante" description={course.title}
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button variant="primary" disabled={!picked} loading={save.isPending} onClick={() => save.mutate()}>Inscribir</Button></>}>
      <div className="grid gap-4">
        <SearchInput value={term} onChange={setTerm} placeholder="Buscar estudiante por nombre o correo (mín. 2 letras)" />
        {term.trim().length >= 2 && (students.isLoading ? <PageLoader /> : students.isError ? <ErrorState error={students.error} onRetry={() => students.refetch()} /> : !students.data?.data.length ? (
          <p className="text-sm text-graphite">Ningún estudiante coincide.</p>
        ) : (
          <ul className="divide-y divide-line border-y border-line" role="listbox" aria-label="Resultados">
            {students.data.data.map((s) => (
              <li key={s.id} role="option" aria-selected={picked?.id === s.id}>
                <button type="button" onClick={() => setPicked(s)} className={`flex w-full items-center gap-3 px-2 py-2 text-left text-sm ${picked?.id === s.id ? 'bg-stone-2' : 'hover:bg-stone'}`}>
                  <Avatar user={s} size={28} /><span><span className="block font-semibold">{fullName(s)}</span><span className="block text-xs text-muted">{s.email}</span></span>
                </button>
              </li>
            ))}
          </ul>
        ))}
        {picked && <p className="text-sm">Seleccionado: <strong>{fullName(picked)}</strong></p>}
        <Select label="Grupo (opcional)" value={groupId} onChange={(e) => setGroupId(e.target.value)} placeholder="Sin grupo" options={(groups.data?.data ?? []).map((g) => ({ value: g.id, label: g.name }))} />
      </div>
    </Modal>
  );
}

function EditEnrollment({ course, row, onClose }: { course: CourseFull; row: EnrollmentRow; onClose: () => void }) {
  const [status, setStatus] = useState(row.status);
  const [groupId, setGroupId] = useState(row.groupId ? String(row.groupId) : '');
  const groups = useQuery({ queryKey: ['groups', course.id], queryFn: () => api.get<{ data: GroupItem[] }>(`/catalog/courses/${course.id}/groups`) });
  const save = useAction(() => api.patch(`/classroom/enrollments/${row.id}`, { status, groupId: groupId ? Number(groupId) : null }), {
    success: 'Inscripción actualizada', invalidate: [['course-enrollments'], ['groups', course.id], ['course', course.id]], onSuccess: onClose,
  });
  return (
    <Modal open onClose={onClose} title={fullName(row.user)} size="sm"
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button variant="primary" loading={save.isPending} onClick={() => save.mutate()}>Guardar</Button></>}>
      <div className="grid gap-4">
        <Select label="Estado" value={status} onChange={(e) => setStatus(e.target.value)} options={toOptions(ENROLLMENT_STATUS)} />
        <Select label="Grupo" value={groupId} onChange={(e) => setGroupId(e.target.value)} placeholder="Sin grupo" options={(groups.data?.data ?? []).map((g) => ({ value: g.id, label: g.name }))} />
      </div>
    </Modal>
  );
}
