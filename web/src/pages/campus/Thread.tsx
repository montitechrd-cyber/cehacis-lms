import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { Eye, EyeOff, Flag, Lock, Pencil, Pin, Reply, Trash2, Unlock } from 'lucide-react';
import { api } from '@/lib/api';
import { useAction } from '@/lib/hooks';
import { useAuth } from '@/lib/auth';
import { dateTime, fullName } from '@/lib/format';
import { PageHeader } from '@/components/ui/Page';
import { Alert } from '@/components/ui/Feedback';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Form';
import { ConfirmDialog, Modal } from '@/components/ui/Overlay';
import { Avatar, Tag } from '@/components/ui/Data';
import { PlainText, Q, type CommunityUser } from '@/features/campus/shared';

interface Post {
  id: number;
  parentId: number | null;
  content: string;
  isHidden: boolean;
  editedAt: string | null;
  createdAt: string;
  author: CommunityUser;
  replies: Post[];
}
interface ThreadData {
  id: number;
  forumId: number;
  forum: { id: number; title: string; isLocked: boolean };
  title: string;
  isPinned: boolean;
  isLocked: boolean;
  isHidden: boolean;
  canModerate: boolean;
  posts: Post[];
}

const EDIT_MS = 30 * 60 * 1000;

export default function Thread() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const key = ['community', 'thread', id];
  const q = useQuery({ queryKey: key, queryFn: async () => (await api.get<{ data: ThreadData }>(`/community/threads/${id}`)).data });
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const [text, setText] = useState('');
  const [main, setMain] = useState('');
  const [del, setDel] = useState<Post | null>(null);
  const [report, setReport] = useState<{ type: 'FORUM_POST' | 'THREAD'; id: number } | null>(null);
  const [reason, setReason] = useState('');

  const done = () => { setReplyTo(null); setEditing(null); setText(''); };
  const post = useAction((v: { content: string; parentId?: number }) => api.post(`/community/threads/${id}/posts`, v), { invalidate: [key], success: 'Respuesta publicada', onSuccess: () => { done(); setMain(''); } });
  const edit = useAction((v: { id: number; content: string }) => api.patch(`/community/posts/${v.id}`, { content: v.content }), { invalidate: [key], success: 'Mensaje editado', onSuccess: done });
  const remove = useAction((pid: number) => api.del(`/community/posts/${pid}`), { invalidate: [key], success: 'Mensaje eliminado', onSuccess: () => setDel(null) });
  const flag = useAction((v: { type: 'FORUM_POST' | 'THREAD'; id: number; reason: string }) => api.post('/community/reports', { targetType: v.type, targetId: v.id, reason: v.reason }), {
    success: 'Reporte enviado. Gracias por avisar.',
    onSuccess: () => { setReport(null); setReason(''); },
  });
  const modThread = useAction((v: { path: string; body: object }) => api.post(`/community/threads/${id}/${v.path}`, v.body), { invalidate: [key] });
  const modStatus = useAction((v: { type: 'FORUM_POST' | 'THREAD'; id: number; status: 'VISIBLE' | 'HIDDEN' }) => api.post(`/community/moderation/${v.type}/${v.id}/status`, { status: v.status }), { invalidate: [key] });

  const renderPost = (p: Post, depth: number, t: ThreadData) => {
    const mine = user?.id === p.author.id;
    const canEdit = mine ? Date.now() - new Date(p.createdAt).getTime() < EDIT_MS || t.canModerate : t.canModerate;
    const canDel = mine || t.canModerate;
    const locked = t.isLocked || t.forum.isLocked;
    return (
      <li key={p.id} className={clsx(depth > 0 && 'mt-0')}>
        <article className={clsx('border-t border-line py-4', p.isHidden && 'bg-danger-soft/40')} aria-label={`Mensaje de ${fullName(p.author)}`}>
          <header className="flex items-center gap-3">
            <Avatar user={p.author} size={32} />
            <div className="min-w-0 text-sm">
              <p className="font-semibold">{fullName(p.author)}</p>
              <p className="text-xs text-muted">{dateTime(p.createdAt)}{p.editedAt && ' · editado'}</p>
            </div>
            {p.isHidden && <Tag tone="danger">Oculto</Tag>}
          </header>
          {editing === p.id ? (
            <div className="mt-3">
              <Textarea label="Editar mensaje" rows={4} value={text} onChange={(e) => setText(e.target.value)} maxLength={10000} />
              <div className="mt-2 flex gap-2">
                <Button size="sm" variant="primary" loading={edit.isPending} disabled={!text.trim()} onClick={() => edit.mutate({ id: p.id, content: text.trim() })}>Guardar</Button>
                <Button size="sm" variant="ghost" onClick={done}>Cancelar</Button>
              </div>
            </div>
          ) : (
            <PlainText className="mt-3 text-[0.9375rem] leading-relaxed">{p.content}</PlainText>
          )}
          <div className="mt-2 flex flex-wrap gap-1 text-graphite">
            {!locked && <Button size="sm" variant="ghost" icon={<Reply className="size-3.5" />} onClick={() => { setReplyTo(p.id); setEditing(null); setText(''); }}>Responder</Button>}
            {canEdit && <Button size="sm" variant="ghost" icon={<Pencil className="size-3.5" />} onClick={() => { setEditing(p.id); setReplyTo(null); setText(p.content); }}>Editar</Button>}
            {canDel && <Button size="sm" variant="ghost" icon={<Trash2 className="size-3.5" />} onClick={() => setDel(p)}>Borrar</Button>}
            {!mine && <Button size="sm" variant="ghost" icon={<Flag className="size-3.5" />} onClick={() => setReport({ type: 'FORUM_POST', id: p.id })}>Reportar</Button>}
            {t.canModerate && (
              <Button size="sm" variant="ghost" icon={p.isHidden ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />} onClick={() => modStatus.mutate({ type: 'FORUM_POST', id: p.id, status: p.isHidden ? 'VISIBLE' : 'HIDDEN' })}>
                {p.isHidden ? 'Mostrar' : 'Ocultar'}
              </Button>
            )}
          </div>
          {replyTo === p.id && (
            <div className="mt-3">
              <Textarea label={`Responder a ${fullName(p.author)}`} rows={3} value={text} onChange={(e) => setText(e.target.value)} maxLength={10000} autoFocus />
              <div className="mt-2 flex gap-2">
                <Button size="sm" variant="primary" loading={post.isPending} disabled={!text.trim()} onClick={() => post.mutate({ content: text.trim(), parentId: p.id })}>Publicar respuesta</Button>
                <Button size="sm" variant="ghost" onClick={done}>Cancelar</Button>
              </div>
            </div>
          )}
        </article>
        {p.replies.length > 0 && (
          <ul className={clsx(depth < 3 ? 'ml-4 border-l border-line pl-4 sm:ml-8 sm:pl-6' : '')}>
            {p.replies.map((r) => renderPost(r, depth + 1, t))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <div className="animate-rise">
      <Q query={q}>
        {(t) => {
          const locked = t.isLocked || t.forum.isLocked;
          return (
            <>
              <PageHeader
                crumbs={[{ label: 'Comunidad', to: '/campus/comunidad' }, { label: t.forum.title, to: `/campus/comunidad/foro/${t.forum.id}` }, { label: t.title }]}
                title={
                  <span className="flex flex-wrap items-center gap-3">
                    {t.title}
                    {t.isPinned && <Tag tone="ink"><Pin className="size-3" /> Fijado</Tag>}
                    {t.isLocked && <Tag tone="warning"><Lock className="size-3" /> Bloqueado</Tag>}
                    {t.isHidden && <Tag tone="danger">Oculto</Tag>}
                  </span>
                }
                actions={
                  t.canModerate && (
                    <>
                      <Button size="sm" variant="outline" icon={<Pin className="size-4" />} onClick={() => modThread.mutate({ path: 'pin', body: { isPinned: !t.isPinned } })}>{t.isPinned ? 'Desfijar' : 'Fijar'}</Button>
                      <Button size="sm" variant="outline" icon={t.isLocked ? <Unlock className="size-4" /> : <Lock className="size-4" />} onClick={() => modThread.mutate({ path: 'lock', body: { isLocked: !t.isLocked } })}>{t.isLocked ? 'Desbloquear' : 'Bloquear'}</Button>
                      <Button size="sm" variant="outline" icon={t.isHidden ? <Eye className="size-4" /> : <EyeOff className="size-4" />} onClick={() => modStatus.mutate({ type: 'THREAD', id: t.id, status: t.isHidden ? 'VISIBLE' : 'HIDDEN' })}>{t.isHidden ? 'Mostrar' : 'Ocultar'}</Button>
                    </>
                  )
                }
              />
              {locked && <div className="mb-6"><Alert tone="warning" title="Conversación bloqueada">No se pueden publicar nuevas respuestas en este hilo.</Alert></div>}
              <ul className="max-w-4xl border-b border-line">{t.posts.map((p) => renderPost(p, 0, t))}</ul>
              {!locked && (
                <div className="mt-8 max-w-4xl">
                  <Textarea label="Tu respuesta" rows={4} value={main} onChange={(e) => setMain(e.target.value)} maxLength={10000} hint="Texto plano." />
                  <div className="mt-3 flex justify-end">
                    <Button variant="primary" loading={post.isPending && replyTo === null} disabled={!main.trim()} onClick={() => post.mutate({ content: main.trim() })}>Responder al hilo</Button>
                  </div>
                </div>
              )}
              <div className="mt-6"><Button variant="link" onClick={() => nav(`/campus/comunidad/foro/${t.forum.id}`)}>Volver al foro</Button></div>
              <div className="mt-2">
                {user?.id !== undefined && <Button size="sm" variant="ghost" icon={<Flag className="size-3.5" />} onClick={() => setReport({ type: 'THREAD', id: t.id })}>Reportar hilo</Button>}
              </div>
            </>
          );
        }}
      </Q>
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} onConfirm={() => del && remove.mutate(del.id)} loading={remove.isPending} title="Borrar mensaje" description="Se borrará el mensaje y todas sus respuestas. Esta acción no se puede deshacer." confirmLabel="Borrar" />
      <Modal
        open={!!report}
        onClose={() => setReport(null)}
        title="Reportar contenido"
        description="Cuéntanos qué te preocupa. El equipo de moderación lo revisará."
        footer={
          <>
            <Button variant="ghost" onClick={() => setReport(null)}>Cancelar</Button>
            <Button variant="danger" loading={flag.isPending} disabled={reason.trim().length < 3} onClick={() => report && flag.mutate({ ...report, reason: reason.trim() })}>Enviar reporte</Button>
          </>
        }
      >
        <Textarea label="Motivo" rows={4} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} required />
      </Modal>
    </div>
  );
}
