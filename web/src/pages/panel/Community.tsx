import { useState } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { EyeOff, Lock, LockOpen, Pencil, Pin, Plus, Trash2 } from 'lucide-react';
import { api, ApiError, type Paged } from '@/lib/api';
import { useAction, useTableParams } from '@/lib/hooks';
import { useAuth } from '@/lib/auth';
import { dateTime, fullName } from '@/lib/format';
import { Button, IconButton } from '@/components/ui/Button';
import { Input, Select, Switch, Textarea } from '@/components/ui/Form';
import { Alert, EmptyState, ErrorState, SkeletonRows } from '@/components/ui/Feedback';
import { ConfirmDialog, Drawer } from '@/components/ui/Overlay';
import { PageHeader } from '@/components/ui/Page';
import { DataTable, Pagination, Tabs, Tag, statusTone } from '@/components/ui/Data';
import { AUDIENCES, RowActions, useCourseOptions, useDeleter, useTab } from '@/features/system/shared';

interface U { id: number; firstName: string; lastName: string; avatarUrl: string | null; role: string }
interface Announcement { id: number; title: string; body: string; audience: string; courseId: number | null; isPinned: boolean; publishedAt: string; author: U; course: { id: number; title: string } | null }
interface Forum { id: number; title: string; description: string | null; type: string; courseId: number | null; course: { id: number; title: string } | null; group: { name: string } | null; isLocked: boolean; threadCount: number; postCount: number; lastActivity: string | null }
interface Report {
  id: number; targetType: string; targetId: number; reason: string; status: string; createdAt: string; reporter: U;
  target: { exists: true; content: string; status: string; author: U; link: string } | { exists: false };
}

const FORUM_TYPES: Record<string, string> = { GENERAL: 'General', EXPERIENCES: 'Experiencias', QA: 'Preguntas y respuestas', COURSE: 'De un curso', GROUP: 'De un grupo' };
const TARGETS: Record<string, string> = { FORUM_POST: 'Mensaje de foro', THREAD: 'Hilo', LESSON_COMMENT: 'Comentario de lección' };

export default function Community() {
  const { can } = useAuth();
  const tabs = [
    ...(can('announcements.manage') ? [{ key: 'announcements' as const, label: 'Anuncios' }] : []),
    ...(can('community.moderate') ? [{ key: 'forums' as const, label: 'Foros' }, { key: 'moderation' as const, label: 'Moderación' }] : []),
  ];
  const [tab, setTab] = useTab(tabs.map((t) => t.key));
  return (
    <div>
      <PageHeader title="Comunidad y anuncios" description="Publica anuncios, administra los foros y atiende los reportes de contenido." />
      <Tabs tabs={tabs} value={tab} onChange={setTab} className="mb-6" />
      {tab === 'announcements' && <Announcements />}
      {tab === 'forums' && <Forums />}
      {tab === 'moderation' && <Moderation />}
    </div>
  );
}

function Announcements() {
  const { user, can } = useAuth();
  const isAdmin = can('courses.manage');
  const t = useTableParams();
  const q = useQuery({ queryKey: ['panel-announcements', t.page], queryFn: () => api.get<Paged<Announcement>>('/community/announcements', { page: t.page, pageSize: 20 }) });
  const [edit, setEdit] = useState<Announcement | 'new' | null>(null);
  const del = useDeleter({ path: (id) => `/community/announcements/${id}`, invalidate: [['panel-announcements']], title: 'Eliminar anuncio', description: 'El anuncio dejará de mostrarse a su audiencia.', success: 'Anuncio eliminado' });
  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setEdit('new')}>Nuevo anuncio</Button>
      </div>
      {q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : (
        <DataTable
          loading={q.isLoading}
          rows={q.data?.data}
          rowKey={(r) => r.id}
          empty={<EmptyState title="Aún no hay anuncios" description="Los anuncios aparecen en el espacio de los estudiantes y pueden notificarse por correo." action={<Button variant="primary" onClick={() => setEdit('new')}>Crear el primero</Button>} />}
          columns={[
            { key: 't', header: 'Anuncio', cell: (r) => (<div className="max-w-md"><p className="font-semibold">{r.isPinned && <Pin className="mr-1 inline size-3.5 text-orange-deep" aria-label="Fijado" />}{r.title}</p><p className="line-clamp-1 text-xs text-muted">{r.body}</p></div>) },
            { key: 'a', header: 'Audiencia', cell: (r) => <Tag tone="outline">{r.course ? r.course.title : AUDIENCES[r.audience]}</Tag> },
            { key: 'au', header: 'Autor', cell: (r) => fullName(r.author) },
            { key: 'd', header: 'Publicado', cell: (r) => dateTime(r.publishedAt) },
            {
              key: 'x', header: <span className="sr-only">Acciones</span>, align: 'right',
              cell: (r) => (isAdmin || r.author.id === user?.id) ? (
                <RowActions>
                  <IconButton label="Editar" size="sm" onClick={() => setEdit(r)}><Pencil className="size-4" /></IconButton>
                  <IconButton label="Eliminar" size="sm" onClick={() => del.ask(r.id)}><Trash2 className="size-4" /></IconButton>
                </RowActions>
              ) : null,
            },
          ]}
        />
      )}
      {q.data && <Pagination page={q.data.meta.page} pages={q.data.meta.pages} total={q.data.meta.total} onPage={(p) => t.set({ page: p }, false)} />}
      {edit && <AnnouncementDrawer item={edit === 'new' ? null : edit} onClose={() => setEdit(null)} />}
      {del.dialog}
    </div>
  );
}

function AnnouncementDrawer({ item, onClose }: { item: Announcement | null; onClose: () => void }) {
  const { can } = useAuth();
  const isAdmin = can('courses.manage');
  const { options, loading } = useCourseOptions();
  const [f, setF] = useState({ title: item?.title ?? '', body: item?.body ?? '', audience: item?.audience ?? (isAdmin ? 'ALL' : 'COURSE'), courseId: item?.courseId ? String(item.courseId) : '', isPinned: item?.isPinned ?? false, notify: false });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const save = useAction(
    (b: Record<string, unknown>) => (item ? api.patch(`/community/announcements/${item.id}`, b) : api.post('/community/announcements', b)),
    { success: item ? 'Anuncio actualizado' : 'Anuncio publicado', invalidate: [['panel-announcements']], onSuccess: onClose },
  );
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const body = item
      ? { title: f.title, body: f.body, isPinned: f.isPinned }
      : { title: f.title, body: f.body, audience: f.audience, courseId: f.audience === 'COURSE' ? Number(f.courseId) || undefined : undefined, isPinned: f.isPinned, notify: f.notify };
    save.mutate(body, { onError: (err) => err instanceof ApiError && setErrors(err.fieldErrors) });
  };
  const audOpts = Object.entries(AUDIENCES).filter(([k]) => isAdmin || k === 'COURSE').map(([value, label]) => ({ value, label }));
  return (
    <Drawer open onClose={onClose} title={item ? 'Editar anuncio' : 'Nuevo anuncio'}
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button type="submit" form="ann-form" variant="primary" loading={save.isPending}>{item ? 'Guardar' : 'Publicar'}</Button></>}>
      <form id="ann-form" onSubmit={submit} className="space-y-4">
        <Input label="Título" required value={f.title} error={errors.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
        <Textarea label="Mensaje" required rows={7} value={f.body} error={errors.body} onChange={(e) => setF({ ...f, body: e.target.value })} />
        {!item && (
          <>
            <Select label="Audiencia" options={audOpts} value={f.audience} onChange={(e) => setF({ ...f, audience: e.target.value })} />
            {f.audience === 'COURSE' && <Select label="Curso" required placeholder={loading ? 'Cargando…' : 'Elige un curso'} options={options} value={f.courseId} error={errors.courseId} onChange={(e) => setF({ ...f, courseId: e.target.value })} />}
            <Switch label="Notificar por correo" hint="Envía notificación y correo a la audiencia (no a ti)." checked={f.notify} onChange={(v) => setF({ ...f, notify: v })} />
          </>
        )}
        {item && <p className="text-xs text-muted">La audiencia no se puede cambiar una vez publicado el anuncio.</p>}
        <Switch label="Fijar arriba" checked={f.isPinned} onChange={(v) => setF({ ...f, isPinned: v })} />
      </form>
    </Drawer>
  );
}

function Forums() {
  const { can } = useAuth();
  const isAdmin = can('courses.manage');
  const q = useQuery({ queryKey: ['panel-forums'], queryFn: () => api.get<{ data: Forum[] }>('/community/forums') });
  const [edit, setEdit] = useState<Forum | 'new' | null>(null);
  const lock = useAction((v: { id: number; isLocked: boolean }) => api.post(`/community/forums/${v.id}/lock`, { isLocked: v.isLocked }), { success: 'Foro actualizado', invalidate: [['panel-forums']] });
  const del = useDeleter({ path: (id) => `/community/forums/${id}`, invalidate: [['panel-forums']], title: 'Eliminar foro', description: 'Se borrarán también todos sus hilos y mensajes. Esta acción no se puede deshacer.', success: 'Foro eliminado' });
  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setEdit('new')}>Nuevo foro</Button>
      </div>
      {q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : q.isLoading ? <SkeletonRows /> : !q.data?.data.length ? (
        <EmptyState title="No hay foros" description="Crea un foro general, de experiencias o de un curso." action={<Button variant="primary" onClick={() => setEdit('new')}>Crear foro</Button>} />
      ) : (
        <DataTable
          rows={q.data.data}
          rowKey={(r) => r.id}
          columns={[
            { key: 't', header: 'Foro', cell: (r) => (<div><Link to={`/campus/comunidad/foro/${r.id}`} className="font-semibold hover:underline">{r.title}</Link>{r.description && <p className="line-clamp-1 text-xs text-muted">{r.description}</p>}</div>) },
            { key: 'ty', header: 'Tipo', cell: (r) => <span>{FORUM_TYPES[r.type]}{r.course && <span className="block text-xs text-muted">{r.course.title}</span>}{r.group && <span className="block text-xs text-muted">{r.group.name}</span>}</span> },
            { key: 'h', header: 'Hilos', align: 'right', cell: (r) => r.threadCount },
            { key: 'p', header: 'Mensajes', align: 'right', cell: (r) => r.postCount },
            { key: 'l', header: 'Actividad', cell: (r) => dateTime(r.lastActivity) },
            { key: 's', header: 'Estado', cell: (r) => r.isLocked ? <Tag tone="danger">Bloqueado</Tag> : <Tag tone="success">Abierto</Tag> },
            {
              key: 'x', header: <span className="sr-only">Acciones</span>, align: 'right',
              cell: (r) => (
                <RowActions>
                  <IconButton label={r.isLocked ? 'Desbloquear foro' : 'Bloquear foro'} size="sm" onClick={() => lock.mutate({ id: r.id, isLocked: !r.isLocked })}>{r.isLocked ? <LockOpen className="size-4" /> : <Lock className="size-4" />}</IconButton>
                  {(isAdmin || r.courseId != null) && <IconButton label="Editar" size="sm" onClick={() => setEdit(r)}><Pencil className="size-4" /></IconButton>}
                  {(isAdmin || r.courseId != null) && <IconButton label="Eliminar" size="sm" onClick={() => del.ask(r.id)}><Trash2 className="size-4" /></IconButton>}
                </RowActions>
              ),
            },
          ]}
        />
      )}
      {edit && <ForumDrawer item={edit === 'new' ? null : edit} onClose={() => setEdit(null)} />}
      {del.dialog}
    </div>
  );
}

function ForumDrawer({ item, onClose }: { item: Forum | null; onClose: () => void }) {
  const { can } = useAuth();
  const isAdmin = can('courses.manage');
  const { options } = useCourseOptions();
  const [f, setF] = useState({ title: item?.title ?? '', description: item?.description ?? '', type: item?.type ?? (isAdmin ? 'GENERAL' : 'COURSE'), courseId: item?.courseId ? String(item.courseId) : '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const save = useAction(
    (b: Record<string, unknown>) => (item ? api.patch(`/community/forums/${item.id}`, b) : api.post('/community/forums', b)),
    { success: item ? 'Foro actualizado' : 'Foro creado', invalidate: [['panel-forums']], onSuccess: onClose },
  );
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const body = item
      ? { title: f.title, description: f.description || null }
      : { title: f.title, description: f.description || undefined, type: f.type, courseId: f.type === 'COURSE' ? Number(f.courseId) || undefined : undefined };
    save.mutate(body, { onError: (err) => err instanceof ApiError && setErrors(err.fieldErrors) });
  };
  const typeOpts = ['GENERAL', 'EXPERIENCES', 'QA', 'COURSE'].filter((k) => isAdmin || k === 'COURSE').map((value) => ({ value, label: FORUM_TYPES[value]! }));
  return (
    <Drawer open onClose={onClose} title={item ? 'Editar foro' : 'Nuevo foro'}
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button type="submit" form="forum-form" variant="primary" loading={save.isPending}>Guardar</Button></>}>
      <form id="forum-form" onSubmit={submit} className="space-y-4">
        <Input label="Título" required value={f.title} error={errors.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
        <Textarea label="Descripción" rows={3} value={f.description} error={errors.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
        {!item && <Select label="Tipo" options={typeOpts} value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} />}
        {!item && f.type === 'COURSE' && <Select label="Curso" required placeholder="Elige un curso" options={options} value={f.courseId} error={errors.courseId} onChange={(e) => setF({ ...f, courseId: e.target.value })} />}
      </form>
    </Drawer>
  );
}

function Moderation() {
  const t = useTableParams({ status: 'OPEN' });
  const status = t.get('status');
  const q = useQuery({ queryKey: ['panel-reports', status, t.page], queryFn: () => api.get<Paged<Report>>('/community/moderation/reports', { status, page: t.page }) });
  const [hide, setHide] = useState<Report | null>(null);
  const act = useAction((v: { id: number; status: 'RESOLVED' | 'DISMISSED'; hideContent?: boolean }) => api.patch(`/community/moderation/reports/${v.id}`, { status: v.status, hideContent: v.hideContent }), {
    success: 'Reporte gestionado', invalidate: [['panel-reports']], onSuccess: () => setHide(null),
  });
  return (
    <div>
      <div className="mb-4 max-w-xs">
        <Select label="Estado" value={status} onChange={(e) => t.set({ status: e.target.value })} options={[{ value: 'OPEN', label: 'Abiertos' }, { value: 'RESOLVED', label: 'Resueltos' }, { value: 'DISMISSED', label: 'Descartados' }, { value: 'ALL', label: 'Todos' }]} />
      </div>
      {q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : q.isLoading ? <SkeletonRows /> : !q.data?.data.length ? (
        <EmptyState title="Sin reportes en esta vista" description="Cuando un estudiante reporte un mensaje, hilo o comentario aparecerá aquí." />
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {q.data.data.map((r) => (
            <li key={r.id} className="grid gap-4 py-5 lg:grid-cols-[1fr_auto]">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Tag tone={statusTone(r.status)}>{r.status === 'OPEN' ? 'Abierto' : r.status === 'RESOLVED' ? 'Resuelto' : 'Descartado'}</Tag>
                  <span className="text-xs text-muted">{TARGETS[r.targetType]} · {dateTime(r.createdAt)}</span>
                </div>
                <p className="mt-2 text-sm"><span className="font-semibold">Motivo:</span> {r.reason}</p>
                <p className="text-xs text-muted">Reportado por {fullName(r.reporter)}</p>
                {r.target.exists ? (
                  <blockquote className="mt-3 border-l border-line-strong pl-3 text-sm">
                    <p className="whitespace-pre-wrap break-words">{r.target.content}</p>
                    <p className="mt-1 text-xs text-muted">
                      {fullName(r.target.author)} {r.target.status === 'HIDDEN' && <Tag tone="danger" className="ml-1">Oculto</Tag>} · <Link to={r.target.link} className="underline">Ver en contexto</Link>
                    </p>
                  </blockquote>
                ) : <p className="mt-3 text-sm text-muted">El contenido reportado ya no existe.</p>}
              </div>
              {r.status === 'OPEN' && (
                <div className="flex flex-wrap items-start gap-2 lg:flex-col lg:items-stretch">
                  {r.target.exists && <Button size="sm" variant="danger" icon={<EyeOff className="size-4" />} onClick={() => setHide(r)}>Resolver y ocultar</Button>}
                  <Button size="sm" variant="outline" loading={act.isPending && act.variables?.id === r.id} onClick={() => act.mutate({ id: r.id, status: 'RESOLVED', hideContent: false })}>Resolver sin ocultar</Button>
                  <Button size="sm" variant="ghost" onClick={() => act.mutate({ id: r.id, status: 'DISMISSED' })}>Descartar</Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {q.data && <Pagination page={q.data.meta.page} pages={q.data.meta.pages} total={q.data.meta.total} onPage={(p) => t.set({ page: p }, false)} />}
      <div className="mt-6"><Alert tone="info">Las acciones de moderación quedan registradas en la auditoría.</Alert></div>
      <ConfirmDialog open={!!hide} onClose={() => setHide(null)} loading={act.isPending} title="Ocultar contenido" confirmLabel="Resolver y ocultar"
        description="El contenido dejará de verse para los estudiantes y el reporte se marcará como resuelto. El reportante será notificado."
        onConfirm={() => hide && act.mutate({ id: hide.id, status: 'RESOLVED', hideContent: true })} />
    </div>
  );
}
