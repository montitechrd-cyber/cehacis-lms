import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Star, UserPlus } from 'lucide-react';
import { api, ApiError, errorMessage, type Paged } from '@/lib/api';
import { fullName, num } from '@/lib/format';
import { useAction, useTableParams } from '@/lib/hooks';
import { PageHeader } from '@/components/ui/Page';
import { Button } from '@/components/ui/Button';
import { Avatar, DataTable, Pagination, SearchInput, Tag, Toolbar, statusTone, type Column } from '@/components/ui/Data';
import { Input, Switch, Textarea } from '@/components/ui/Form';
import { Modal } from '@/components/ui/Overlay';
import { EmptyState, ErrorState } from '@/components/ui/Feedback';
import { ChipsInput } from '@/features/operations/shared';

interface Instructor {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string | null;
  status: string;
  profile: { headline: string | null; specialties: string[]; yearsExperience: number | null; isPublic: boolean } | null;
  courses: number;
  rating: number | null;
}

const blank = { firstName: '', lastName: '', email: '', phone: '', password: '', headline: '', bio: '', yearsExperience: '', linkedinUrl: '', isPublic: true };

function NewInstructor({ open, onClose }: { open: boolean; onClose: () => void }) {
  const nav = useNavigate();
  const [f, setF] = useState(blank);
  const [spec, setSpec] = useState<string[]>([]);
  const [err, setErr] = useState<Record<string, string>>({});
  const create = useAction(
    () => {
      const { yearsExperience, isPublic, ...rest } = f;
      const body: Record<string, unknown> = Object.fromEntries(Object.entries(rest).filter(([, v]) => v.trim() !== ''));
      body.specialties = spec;
      body.isPublic = isPublic;
      if (yearsExperience !== '') body.yearsExperience = Number(yearsExperience);
      return api.post<{ data: { id: number }; invitationSent: boolean }>('/people/instructors', body);
    },
    {
      invalidate: [['people', 'instructors']],
      silentError: true,
      onSuccess: (r) => {
        toast.success(r.invitationSent ? 'Facilitador creado. Se envió un enlace para crear la contraseña.' : 'Facilitador creado');
        setF(blank);
        setSpec([]);
        onClose();
        nav(`/panel/facilitadores/${r.data.id}`);
      },
    },
  );
  const set = (k: keyof typeof blank, v: string) => setF((s) => ({ ...s, [k]: v }));
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Nuevo facilitador"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" loading={create.isPending} onClick={() => { setErr({}); create.mutate(undefined, { onError: (e) => { if (e instanceof ApiError) setErr(e.fieldErrors); toast.error(errorMessage(e)); } }); }}>
            Crear facilitador
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Nombre" required value={f.firstName} onChange={(e) => set('firstName', e.target.value)} error={err.firstName} />
        <Input label="Apellido" required value={f.lastName} onChange={(e) => set('lastName', e.target.value)} error={err.lastName} />
        <Input label="Correo" type="email" required value={f.email} onChange={(e) => set('email', e.target.value)} error={err.email} />
        <Input label="Teléfono" type="tel" value={f.phone} onChange={(e) => set('phone', e.target.value)} error={err.phone} />
        <Input wrapperClassName="sm:col-span-2" label="Contraseña (opcional)" type="password" autoComplete="new-password" value={f.password} onChange={(e) => set('password', e.target.value)} error={err.password} hint="Si la dejas vacía se enviará un enlace para crearla." />
        <Input wrapperClassName="sm:col-span-2" label="Titular profesional" value={f.headline} onChange={(e) => set('headline', e.target.value)} error={err.headline} />
        <Textarea wrapperClassName="sm:col-span-2" label="Biografía" rows={3} value={f.bio} onChange={(e) => set('bio', e.target.value)} error={err.bio} />
        <div className="sm:col-span-2"><ChipsInput label="Especialidades" value={spec} onChange={setSpec} placeholder="Oratoria, liderazgo…" /></div>
        <Input label="Años de experiencia" type="number" min={0} value={f.yearsExperience} onChange={(e) => set('yearsExperience', e.target.value)} error={err.yearsExperience} />
        <Input label="LinkedIn" type="url" placeholder="https://linkedin.com/in/…" value={f.linkedinUrl} onChange={(e) => set('linkedinUrl', e.target.value)} error={err.linkedinUrl} />
        <div className="sm:col-span-2"><Switch checked={f.isPublic} onChange={(v) => setF((s) => ({ ...s, isPublic: v }))} label="Perfil público" hint="Aparece en la página pública de facilitadores." /></div>
      </div>
    </Modal>
  );
}

export default function Instructors() {
  const t = useTableParams();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const params = { q: t.get('q'), page: t.page, pageSize: 20 };
  const q = useQuery({ queryKey: ['people', 'instructors', 'list', params], queryFn: () => api.get<Paged<Instructor>>('/people/instructors', params), placeholderData: (p) => p });

  const cols: Column<Instructor>[] = [
    {
      key: 'name', header: 'Facilitador',
      cell: (i) => (
        <div className="flex min-w-0 items-center gap-3">
          <Avatar user={i} size={36} />
          <div className="min-w-0">
            <p className="truncate font-semibold">{fullName(i)}</p>
            <p className="truncate text-xs text-muted">{i.profile?.headline || i.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'spec', header: 'Especialidades',
      cell: (i) => (i.profile?.specialties.length ? <div className="flex flex-wrap gap-1">{i.profile.specialties.slice(0, 3).map((s) => <Tag key={s}>{s}</Tag>)}{i.profile.specialties.length > 3 && <Tag tone="outline">+{i.profile.specialties.length - 3}</Tag>}</div> : '—'),
    },
    { key: 'courses', header: 'Cursos', align: 'right', cell: (i) => i.courses },
    { key: 'rating', header: 'Valoración', align: 'right', cell: (i) => (i.rating != null ? <span className="inline-flex items-center gap-1"><Star className="size-3.5" aria-hidden />{num(i.rating, 1)}</span> : 'Sin datos') },
    { key: 'status', header: 'Estado', cell: (i) => <Tag tone={statusTone(i.status)}>{i.status === 'ACTIVE' ? 'Activo' : i.status === 'SUSPENDED' ? 'Suspendido' : i.status}</Tag> },
  ];

  return (
    <div className="animate-rise">
      <PageHeader title="Facilitadores" description="Equipo docente, especialidades, valoraciones y disponibilidad." actions={<Button variant="primary" icon={<UserPlus className="size-4" />} onClick={() => setOpen(true)}>Nuevo facilitador</Button>} />
      <Toolbar><SearchInput className="w-full sm:w-80" value={t.get('q')} onChange={(v) => t.set({ q: v })} placeholder="Buscar facilitador" /></Toolbar>
      {q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : (
        <>
          <DataTable columns={cols} rows={q.data?.data} rowKey={(i) => i.id} loading={q.isLoading} onRowClick={(i) => nav(`/panel/facilitadores/${i.id}`)}
            empty={<EmptyState title="Aún no hay facilitadores" description="Crea el primero para asignarle cursos." action={<Button variant="primary" onClick={() => setOpen(true)}>Nuevo facilitador</Button>} />} />
          <Pagination page={q.data?.meta.page ?? 1} pages={q.data?.meta.pages ?? 1} total={q.data?.meta.total} onPage={(p) => t.set({ page: p }, false)} />
        </>
      )}
      <NewInstructor open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
