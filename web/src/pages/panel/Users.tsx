import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { KeyRound, Pencil, Plus, Trash2, Unlock } from 'lucide-react';
import { api, ApiError, type Paged } from '@/lib/api';
import { useAction, useTableParams } from '@/lib/hooks';
import { useAuth } from '@/lib/auth';
import { dateTime, fullName, ROLES } from '@/lib/format';
import { Button, IconButton } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Form';
import { EmptyState, ErrorState } from '@/components/ui/Feedback';
import { Modal } from '@/components/ui/Overlay';
import { PageHeader } from '@/components/ui/Page';
import { Avatar, DataTable, Pagination, SearchInput, Tag, statusTone } from '@/components/ui/Data';
import { RowActions, useDeleter } from '@/features/system/shared';

interface UserDto {
  id: number; email: string; firstName: string; lastName: string; phone: string | null; avatarUrl: string | null; status: string;
  role: { key: string; name: string }; lastLoginAt: string | null; isLocked: boolean; createdAt: string;
}
const STATUS: Record<string, string> = { ACTIVE: 'Activo', PENDING: 'Pendiente', SUSPENDED: 'Suspendido' };
const opts = (o: Record<string, string>) => Object.entries(o).map(([value, label]) => ({ value, label }));

export default function Users() {
  const { user: me } = useAuth();
  const t = useTableParams();
  const params = { q: t.get('q'), role: t.get('role'), status: t.get('status'), page: t.page, pageSize: 20, sort: t.get('sort'), order: t.get('order') };
  const q = useQuery({ queryKey: ['adm-users', params], queryFn: () => api.get<Paged<UserDto>>('/admin/users', params) });
  const [edit, setEdit] = useState<UserDto | 'new' | null>(null);
  const del = useDeleter({ path: (id) => `/admin/users/${id}`, invalidate: [['adm-users']], title: 'Eliminar usuario', description: 'La cuenta se desactivará y se cerrarán sus sesiones. Su historial académico se conserva.', success: 'Usuario eliminado' });
  const reset = useAction((id: number) => api.post<{ emailStatus: string; message: string }>(`/admin/users/${id}/reset-password`), { onSuccess: (r) => (r.emailStatus === 'SENT' ? toast.success(r.message) : toast.warning(r.message)) });
  const unlock = useAction((id: number) => api.post(`/admin/users/${id}/unlock`), { success: 'Usuario desbloqueado', invalidate: [['adm-users']] });

  return (
    <div>
      <PageHeader title="Usuarios" description="Crea cuentas, cambia roles y estados, y atiende bloqueos y restablecimientos de contraseña."
        actions={<Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setEdit('new')}>Nuevo usuario</Button>} />
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <SearchInput className="w-full sm:w-80" placeholder="Nombre, correo o teléfono" value={t.get('q')} onChange={(v) => t.set({ q: v })} />
        <div className="w-full sm:w-52"><Select label="Rol" placeholder="Todos" value={t.get('role')} onChange={(e) => t.set({ role: e.target.value })} options={opts(ROLES)} /></div>
        <div className="w-full sm:w-44"><Select label="Estado" placeholder="Todos" value={t.get('status')} onChange={(e) => t.set({ status: e.target.value })} options={opts(STATUS)} /></div>
      </div>
      {q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : (
        <DataTable loading={q.isLoading} rows={q.data?.data} rowKey={(r) => r.id} sort={t.sort} onSort={t.toggleSort}
          empty={<EmptyState title="No hay usuarios con esos filtros" action={<Button variant="outline" onClick={() => t.set({ q: '', role: '', status: '' })}>Limpiar filtros</Button>} />}
          columns={[
            { key: 'firstName', header: 'Usuario', sortable: true, cell: (r) => (<div className="flex items-center gap-3"><Avatar user={r} size={32} /><div><p className="font-semibold">{fullName(r)}{r.id === me?.id && <span className="ml-1 text-xs font-normal text-muted">(tú)</span>}</p><p className="text-xs text-muted">{r.email}</p></div></div>) },
            { key: 'role', header: 'Rol', cell: (r) => ROLES[r.role.key] ?? r.role.name },
            { key: 'status', header: 'Estado', sortable: true, cell: (r) => (<span className="flex flex-wrap gap-1"><Tag tone={statusTone(r.status)}>{STATUS[r.status] ?? r.status}</Tag>{r.isLocked && <Tag tone="danger">Bloqueado</Tag>}</span>) },
            { key: 'lastLoginAt', header: 'Último acceso', sortable: true, cell: (r) => (r.lastLoginAt ? dateTime(r.lastLoginAt) : 'Nunca') },
            { key: 'x', header: <span className="sr-only">Acciones</span>, align: 'right', cell: (r) => (
              <RowActions>
                {r.isLocked && <IconButton label="Desbloquear" size="sm" onClick={() => unlock.mutate(r.id)}><Unlock className="size-4" /></IconButton>}
                <IconButton label="Enviar enlace de restablecimiento" size="sm" onClick={() => reset.mutate(r.id)}><KeyRound className="size-4" /></IconButton>
                <IconButton label="Editar" size="sm" onClick={() => setEdit(r)}><Pencil className="size-4" /></IconButton>
                {r.id !== me?.id && <IconButton label="Eliminar" size="sm" onClick={() => del.ask(r.id)}><Trash2 className="size-4" /></IconButton>}
              </RowActions>) },
          ]} />
      )}
      {q.data && <Pagination page={q.data.meta.page} pages={q.data.meta.pages} total={q.data.meta.total} onPage={(p) => t.set({ page: p }, false)} />}
      {edit && <UserModal item={edit === 'new' ? null : edit} self={edit !== 'new' && edit.id === me?.id} onClose={() => setEdit(null)} />}
      {del.dialog}
    </div>
  );
}

function UserModal({ item, self, onClose }: { item: UserDto | null; self: boolean; onClose: () => void }) {
  const [f, setF] = useState({ email: item?.email ?? '', firstName: item?.firstName ?? '', lastName: item?.lastName ?? '', phone: item?.phone ?? '', role: item?.role.key ?? 'STUDENT', status: item?.status ?? 'ACTIVE', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const save = useAction(
    (b: Record<string, unknown>) => (item ? api.patch(`/admin/users/${item.id}`, b) : api.post<{ emailSent: boolean; passwordMode: string }>('/admin/users', b)),
    {
      success: item ? 'Usuario actualizado' : undefined, invalidate: [['adm-users']],
      onSuccess: (r) => {
        if (!item) {
          const x = r as { emailSent?: boolean; passwordMode?: string };
          if (x.passwordMode === 'reset_link') toast.success(x.emailSent ? 'Usuario creado. Se envió un enlace para definir su contraseña.' : 'Usuario creado. No se pudo enviar el correo: usa "Enviar enlace de restablecimiento" más tarde.');
          else toast.success('Usuario creado con la contraseña indicada');
        }
        onClose();
      },
    },
  );
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const body = item
      ? { firstName: f.firstName, lastName: f.lastName, phone: f.phone.trim() || null, ...(self ? {} : { role: f.role, status: f.status }) }
      : { email: f.email, firstName: f.firstName, lastName: f.lastName, phone: f.phone.trim() || undefined, role: f.role, password: f.password || undefined };
    save.mutate(body, { onError: (x) => x instanceof ApiError && setErrors(x.fieldErrors) });
  };
  return (
    <Modal open onClose={onClose} title={item ? 'Editar usuario' : 'Nuevo usuario'} description={item ? item.email : 'Sin contraseña, el usuario recibirá un enlace para crearla (vigente 72 horas).'}
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button type="submit" form="user-form" variant="primary" loading={save.isPending}>{item ? 'Guardar' : 'Crear usuario'}</Button></>}>
      <form id="user-form" className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
        {!item && <Input wrapperClassName="sm:col-span-2" label="Correo electrónico" type="email" required value={f.email} error={errors.email} onChange={set('email')} />}
        <Input label="Nombre" required value={f.firstName} error={errors.firstName} onChange={set('firstName')} />
        <Input label="Apellido" required value={f.lastName} error={errors.lastName} onChange={set('lastName')} />
        <Input label="Teléfono" type="tel" value={f.phone} error={errors.phone} onChange={set('phone')} />
        <Select label="Rol" options={opts(ROLES)} value={f.role} disabled={self} onChange={set('role')} />
        {item && <Select label="Estado" options={opts(STATUS)} value={f.status} disabled={self} onChange={set('status')} hint={self ? 'No puedes cambiar tu propio rol ni estado.' : 'Suspender cierra las sesiones del usuario.'} />}
        {!item && <Input wrapperClassName="sm:col-span-2" label="Contraseña (opcional)" type="password" autoComplete="new-password" value={f.password} error={errors.password} hint="Mínimo 8 caracteres con letra y número." onChange={set('password')} />}
      </form>
    </Modal>
  );
}
