import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { FileSpreadsheet, UserPlus } from 'lucide-react';
import { api, ApiError, download, errorMessage, type Paged } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { date, fullName, relative } from '@/lib/format';
import { useAction, useTableParams } from '@/lib/hooks';
import { PageHeader } from '@/components/ui/Page';
import { Button } from '@/components/ui/Button';
import { Avatar, DataTable, Pagination, SearchInput, Tag, Toolbar, statusTone, type Column } from '@/components/ui/Data';
import { Input, Select } from '@/components/ui/Form';
import { Modal } from '@/components/ui/Overlay';
import { EmptyState, ErrorState } from '@/components/ui/Feedback';
import { courseOptions, useCourses } from '@/features/operations/shared';

interface Student {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  status: string;
  createdAt: string;
  lastLoginAt: string | null;
  points: number;
  level: { number: number; name: string } | null;
  enrollments: { active: number; completed: number };
}

export const STUDENT_STATUS: Record<string, string> = { ACTIVE: 'Activo', PENDING: 'Pendiente', SUSPENDED: 'Suspendido' };

const blank = { firstName: '', lastName: '', email: '', phone: '', password: '', documentId: '', birthDate: '', occupation: '', city: '', country: '' };

function NewStudent({ open, onClose }: { open: boolean; onClose: () => void }) {
  const nav = useNavigate();
  const [f, setF] = useState(blank);
  const [err, setErr] = useState<Record<string, string>>({});
  const create = useAction(
    () => {
      const body = Object.fromEntries(Object.entries(f).filter(([, v]) => v.trim() !== ''));
      return api.post<{ data: { id: number }; invitationSent: boolean }>('/people/students', body);
    },
    {
      invalidate: [['people', 'students']],
      silentError: true,
      onSuccess: (r) => {
        toast.success(r.invitationSent ? 'Estudiante creado. Se envió un enlace para crear la contraseña.' : 'Estudiante creado');
        setF(blank);
        onClose();
        nav(`/panel/estudiantes/${r.data.id}`);
      },
    },
  );
  const set = (k: keyof typeof blank, v: string) => setF((s) => ({ ...s, [k]: v }));
  const submit = () => {
    setErr({});
    create.mutate(undefined, {
      onError: (e) => {
        if (e instanceof ApiError) setErr(e.fieldErrors);
        toast.error(errorMessage(e));
      },
    });
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Nuevo estudiante"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" loading={create.isPending} onClick={submit}>Crear estudiante</Button>
        </>
      }
    >
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <Input label="Nombre" required value={f.firstName} onChange={(e) => set('firstName', e.target.value)} error={err.firstName} />
        <Input label="Apellido" required value={f.lastName} onChange={(e) => set('lastName', e.target.value)} error={err.lastName} />
        <Input label="Correo" type="email" required value={f.email} onChange={(e) => set('email', e.target.value)} error={err.email} />
        <Input label="Teléfono" type="tel" value={f.phone} onChange={(e) => set('phone', e.target.value)} error={err.phone} />
        <Input wrapperClassName="sm:col-span-2" label="Contraseña (opcional)" type="password" autoComplete="new-password" value={f.password} onChange={(e) => set('password', e.target.value)} error={err.password} hint="Si la dejas vacía se enviará un enlace para crearla." />
        <Input label="Documento de identidad" value={f.documentId} onChange={(e) => set('documentId', e.target.value)} error={err.documentId} />
        <Input label="Fecha de nacimiento" type="date" value={f.birthDate} onChange={(e) => set('birthDate', e.target.value)} error={err.birthDate} />
        <Input label="Ocupación" value={f.occupation} onChange={(e) => set('occupation', e.target.value)} error={err.occupation} />
        <Input label="Ciudad" value={f.city} onChange={(e) => set('city', e.target.value)} error={err.city} />
        <Input label="País" value={f.country} onChange={(e) => set('country', e.target.value)} error={err.country} />
        <button type="submit" className="sr-only" tabIndex={-1}>Crear</button>
      </form>
    </Modal>
  );
}

export default function Students() {
  const t = useTableParams();
  const nav = useNavigate();
  const { can } = useAuth();
  const courses = useCourses();
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const params = { q: t.get('q'), status: t.get('status'), courseId: t.get('courseId'), page: t.page, pageSize: 20, sort: t.get('sort') || undefined, order: t.get('sort') ? t.get('order') || 'desc' : undefined };
  const q = useQuery({ queryKey: ['people', 'students', 'list', params], queryFn: () => api.get<Paged<Student>>('/people/students', params), placeholderData: (p) => p });

  const cols: Column<Student>[] = [
    {
      key: 'lastName', header: 'Estudiante', sortable: true,
      cell: (s) => (
        <div className="flex min-w-0 items-center gap-3">
          <Avatar user={s} size={36} />
          <div className="min-w-0">
            <p className="truncate font-semibold">{fullName(s)}</p>
            <p className="truncate text-xs text-muted">{s.email}</p>
          </div>
        </div>
      ),
    },
    { key: 'status', header: 'Estado', cell: (s) => <Tag tone={statusTone(s.status)}>{STUDENT_STATUS[s.status] ?? s.status}</Tag> },
    { key: 'courses', header: 'Cursos', cell: (s) => <span>{s.enrollments.active} activos · {s.enrollments.completed} completados</span> },
    { key: 'points', header: 'Puntos / nivel', cell: (s) => <span>{s.points} pts{s.level ? ` · Nv. ${s.level.number} ${s.level.name}` : ''}</span> },
    { key: 'lastLoginAt', header: 'Último acceso', sortable: true, cell: (s) => (s.lastLoginAt ? relative(s.lastLoginAt) : 'Nunca') },
    { key: 'createdAt', header: 'Alta', sortable: true, cell: (s) => date(s.createdAt) },
  ];

  const doExport = async () => {
    setExporting(true);
    try {
      await download(`/reports/export/students?format=xlsx${t.get('courseId') ? `&courseId=${t.get('courseId')}` : ''}`, 'estudiantes.xlsx');
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="animate-rise">
      <PageHeader
        title="Estudiantes"
        description="Expedientes digitales, trayectoria y seguimiento académico."
        actions={
          <>
            {can('students.manage', 'reports.view') && (
              <Button variant="outline" icon={<FileSpreadsheet className="size-4" />} loading={exporting} onClick={doExport}>Exportar Excel</Button>
            )}
            {can('students.manage') && (
              <Button variant="primary" icon={<UserPlus className="size-4" />} onClick={() => setOpen(true)}>Nuevo estudiante</Button>
            )}
          </>
        }
      />
      <Toolbar>
        <SearchInput className="w-full sm:w-72" value={t.get('q')} onChange={(v) => t.set({ q: v })} placeholder="Buscar por nombre o correo" />
        <Select label="Estado" wrapperClassName="w-full sm:w-44" value={t.get('status')} onChange={(e) => t.set({ status: e.target.value })} placeholder="Todos" options={Object.entries(STUDENT_STATUS).map(([value, label]) => ({ value, label }))} />
        <Select label="Curso" wrapperClassName="w-full sm:w-64" value={t.get('courseId')} onChange={(e) => t.set({ courseId: e.target.value })} placeholder="Todos los cursos" options={courseOptions(courses.data)} />
      </Toolbar>
      {q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : (
        <>
          <DataTable
            columns={cols}
            rows={q.data?.data}
            rowKey={(s) => s.id}
            loading={q.isLoading}
            sort={t.sort}
            onSort={t.toggleSort}
            onRowClick={(s) => nav(`/panel/estudiantes/${s.id}`)}
            empty={
              <EmptyState
                title={t.get('q') || t.get('status') || t.get('courseId') ? 'Ningún estudiante coincide con los filtros' : 'Todavía no hay estudiantes'}
                description="Los estudiantes se registran solos desde el sitio o puedes crearlos aquí."
                action={can('students.manage') && <Button variant="primary" onClick={() => setOpen(true)}>Nuevo estudiante</Button>}
              />
            }
          />
          <Pagination page={q.data?.meta.page ?? 1} pages={q.data?.meta.pages ?? 1} total={q.data?.meta.total} onPage={(p) => t.set({ page: p }, false)} />
        </>
      )}
      <NewStudent open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
