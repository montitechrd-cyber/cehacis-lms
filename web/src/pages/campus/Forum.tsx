import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { EyeOff, Lock, MessageSquarePlus, Pin } from 'lucide-react';
import { api, ApiError, type Paged } from '@/lib/api';
import { useAction, useTableParams } from '@/lib/hooks';
import { fullName, num, relative } from '@/lib/format';
import { PageHeader } from '@/components/ui/Page';
import { Alert, EmptyState } from '@/components/ui/Feedback';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Form';
import { Modal } from '@/components/ui/Overlay';
import { Pagination, SearchInput, Tag } from '@/components/ui/Data';
import { Q, type CommunityUser } from '@/features/campus/shared';

interface ThreadRow {
  id: number;
  title: string;
  isPinned: boolean;
  isLocked: boolean;
  isHidden: boolean;
  lastPostAt: string;
  postCount: number;
  author: CommunityUser;
}
type Res = Paged<ThreadRow> & { forum: { id: number; title: string; type: string; courseId: number | null; isLocked: boolean }; canModerate: boolean };

export default function Forum() {
  const { id } = useParams();
  const nav = useNavigate();
  const t = useTableParams();
  const q = t.get('q');
  const q1 = useQuery({
    queryKey: ['community', 'forum', id, q, t.page],
    queryFn: () => api.get<Res>(`/community/forums/${id}/threads`, { q, page: t.page, pageSize: 15 }),
    placeholderData: (p) => p,
  });
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const create = useAction(() => api.post<{ data: { id: number } }>(`/community/forums/${id}/threads`, { title: title.trim(), content: content.trim() }), {
    success: 'Hilo creado',
    invalidate: [['community', 'forum', id]],
    silentError: true,
    onSuccess: (r) => {
      setOpen(false);
      setTitle('');
      setContent('');
      nav(`/campus/comunidad/hilo/${r.data.id}`);
    },
  });
  const submit = async () => {
    setErrors({});
    try {
      await create.mutateAsync();
    } catch (e) {
      if (e instanceof ApiError) {
        const fe = e.fieldErrors;
        setErrors({ ...fe, form: fe.title || fe.content ? '' : e.message });
      }
    }
  };

  return (
    <div className="animate-rise">
      <Q query={q1}>
        {(r) => (
          <>
            <PageHeader
              crumbs={[{ label: 'Comunidad', to: '/campus/comunidad' }, { label: r.forum.title }]}
              title={r.forum.title}
              actions={!r.forum.isLocked && <Button variant="primary" icon={<MessageSquarePlus className="size-4" />} onClick={() => setOpen(true)}>Nuevo hilo</Button>}
            />
            {r.forum.isLocked && (
              <div className="mb-6">
                <Alert tone="warning" title="Foro bloqueado">Este foro está bloqueado: puedes leer los hilos, pero no crear nuevos.</Alert>
              </div>
            )}
            <div className="mb-4 max-w-md">
              <SearchInput value={q} onChange={(v) => t.set({ q: v })} placeholder="Buscar hilos" />
            </div>
            {r.data.length === 0 ? (
              <EmptyState title={q ? 'Sin resultados' : 'Aún no hay hilos'} description={q ? 'Prueba con otras palabras.' : 'Inicia la primera conversación de este foro.'} />
            ) : (
              <ul className="divide-y divide-line border-y border-ink">
                {r.data.map((th) => (
                  <li key={th.id}>
                    <Link to={`/campus/comunidad/hilo/${th.id}`} className="grid gap-x-6 gap-y-1 py-4 no-underline hover:bg-stone md:grid-cols-[1fr_auto]">
                      <span className="min-w-0">
                        <span className="flex flex-wrap items-center gap-2 font-bold">
                          {th.isPinned && <Pin className="size-4" aria-label="Fijado" />}
                          {th.isLocked && <Lock className="size-4 text-muted" aria-label="Bloqueado" />}
                          {th.title}
                          {th.isHidden && <Tag tone="danger"><EyeOff className="size-3" /> Oculto</Tag>}
                        </span>
                        <span className="text-xs text-graphite">{fullName(th.author)}</span>
                      </span>
                      <span className="text-sm text-graphite tnum md:text-right">
                        {num(th.postCount)} mensajes
                        <span className="block text-xs text-muted">{relative(th.lastPostAt)}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <Pagination page={r.meta.page} pages={r.meta.pages} total={r.meta.total} onPage={(p) => t.set({ page: p }, false)} />
          </>
        )}
      </Q>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Nuevo hilo"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button variant="primary" loading={create.isPending} disabled={title.trim().length < 3 || !content.trim()} onClick={submit}>Publicar</Button>
          </>
        }
      >
        <div className="space-y-4">
          {errors.form && <Alert tone="danger">{errors.form}</Alert>}
          <Input label="Título" required value={title} onChange={(e) => setTitle(e.target.value)} maxLength={250} error={errors.title} />
          <Textarea label="Contenido" required rows={6} value={content} onChange={(e) => setContent(e.target.value)} maxLength={10000} error={errors.content} hint="Texto plano." />
        </div>
      </Modal>
    </div>
  );
}
