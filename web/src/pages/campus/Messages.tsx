import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { ArrowLeft, Mail, Send, SquarePen } from 'lucide-react';
import { api } from '@/lib/api';
import { useAction } from '@/lib/hooks';
import { useAuth } from '@/lib/auth';
import { dateTime, fullName, relative } from '@/lib/format';
import { PageHeader } from '@/components/ui/Page';
import { Alert, EmptyState, SkeletonRows } from '@/components/ui/Feedback';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Form';
import { Modal } from '@/components/ui/Overlay';
import { Avatar } from '@/components/ui/Data';
import { ContactPicker, PlainText, Q, type CommunityUser } from '@/features/campus/shared';

interface Conversation {
  id: number;
  subject: string | null;
  updatedAt: string;
  participants: CommunityUser[];
  lastMessage: { id: number; body: string; senderId: number; createdAt: string } | null;
  unreadCount: number;
}
interface Message { id: number; body: string; senderId: number; sender: CommunityUser; createdAt: string }
interface Thread {
  data: Message[];
  meta: { hasMore: boolean; nextBefore: number | null };
  conversation: { id: number; subject: string | null; participants: CommunityUser[] };
}

function Conv({ id }: { id: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['messages', 'thread', id],
    queryFn: async () => {
      const r = await api.get<Thread>(`/community/conversations/${id}/messages`);
      qc.invalidateQueries({ queryKey: ['messages', 'list'] });
      return r;
    },
    refetchInterval: 15_000,
  });
  const [older, setOlder] = useState<Message[]>([]);
  const [before, setBefore] = useState<{ hasMore: boolean; next: number | null } | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [body, setBody] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { setOlder([]); setBefore(null); setBody(''); }, [id]);
  const count = q.data?.data.length;
  const lastId = q.data?.data[q.data.data.length - 1]?.id;
  useEffect(() => endRef.current?.scrollIntoView({ block: 'end' }), [lastId, count]);

  const send = useAction((b: string) => api.post(`/community/conversations/${id}/messages`, { body: b }), {
    invalidate: [['messages', 'thread', id], ['messages', 'list']],
    onSuccess: () => setBody(''),
  });
  const loadOlder = async () => {
    const cursor = before ? before.next : q.data?.meta.nextBefore;
    if (!cursor) return;
    setLoadingOlder(true);
    try {
      const r = await api.get<Thread>(`/community/conversations/${id}/messages`, { before: cursor });
      setOlder((o) => [...r.data, ...o]);
      setBefore({ hasMore: r.meta.hasMore, next: r.meta.nextBefore });
    } finally {
      setLoadingOlder(false);
    }
  };

  return (
    <Q query={q}>
      {(t) => {
        const others = t.conversation.participants.filter((p) => p.id !== user?.id);
        const hasMore = before ? before.hasMore : t.meta.hasMore;
        const msgs = [...older, ...t.data];
        return (
          <div className="flex h-full min-h-[60vh] flex-col">
            <header className="flex items-center gap-3 border-b border-ink pb-3">
              <Link to="/campus/mensajes" className="inline-flex size-9 items-center justify-center hover:bg-stone lg:hidden" aria-label="Volver a la bandeja"><ArrowLeft className="size-4" /></Link>
              <div className="min-w-0">
                <h2 className="truncate text-lg font-bold tracking-tight">{t.conversation.subject || others.map(fullName).join(', ') || 'Conversación'}</h2>
                <p className="truncate text-xs text-graphite">Con {others.map(fullName).join(', ') || 'ti mismo'}</p>
              </div>
            </header>
            <div className="flex-1 overflow-y-auto py-2" style={{ maxHeight: '60vh' }}>
              {hasMore && <div className="py-2 text-center"><Button size="sm" variant="ghost" loading={loadingOlder} onClick={loadOlder}>Cargar mensajes anteriores</Button></div>}
              <ol>
                {msgs.map((m) => {
                  const mine = m.senderId === user?.id;
                  return (
                    <li key={m.id} className="border-b border-line py-3">
                      <p className="flex items-baseline gap-2 text-xs text-muted">
                        <span className={clsx('text-sm font-bold', mine ? 'text-ink' : 'text-graphite')}>{mine ? 'Tú' : fullName(m.sender)}</span>
                        {dateTime(m.createdAt)}
                      </p>
                      <PlainText className="mt-1 text-[0.9375rem] leading-relaxed">{m.body}</PlainText>
                    </li>
                  );
                })}
              </ol>
              <div ref={endRef} />
            </div>
            <form className="border-t border-line pt-3" onSubmit={(e) => { e.preventDefault(); if (body.trim()) send.mutate(body.trim()); }}>
              <Textarea label="Responder" rows={3} value={body} onChange={(e) => setBody(e.target.value)} maxLength={10000} />
              <div className="mt-2 flex justify-end"><Button type="submit" variant="primary" icon={<Send className="size-4" />} loading={send.isPending} disabled={!body.trim()}>Enviar</Button></div>
            </form>
          </div>
        );
      }}
    </Q>
  );
}

export default function Messages() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const [sp, setSp] = useSearchParams();
  const to = sp.get('to');
  const list = useQuery({
    queryKey: ['messages', 'list'],
    queryFn: async () => (await api.get<{ data: Conversation[] }>('/community/conversations')).data,
    refetchInterval: 30_000,
  });
  const [open, setOpen] = useState(!!to);
  const [rec, setRec] = useState<CommunityUser[]>([]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [toNote, setToNote] = useState<string | null>(null);
  const contacts = useQuery({
    queryKey: ['community', 'contacts', ''],
    queryFn: async () => (await api.get<{ data: CommunityUser[] }>('/community/contacts', { q: '' })).data,
    enabled: !!to,
  });
  useEffect(() => {
    if (!to || !contacts.data) return;
    const u = contacts.data.find((c) => c.id === Number(to));
    if (u) setRec([u]);
    else setToNote('No se encontró ese destinatario entre tus contactos; búscalo por nombre.');
    setOpen(true);
    const n = new URLSearchParams(sp);
    n.delete('to');
    setSp(n, { replace: true });
  }, [to, contacts.data]); // eslint-disable-line react-hooks/exhaustive-deps

  const create = useAction(
    () => api.post<{ data: { id: number } }>('/community/conversations', { recipientIds: rec.map((r) => r.id), subject: subject.trim() || undefined, body: body.trim() }),
    {
      invalidate: [['messages', 'list']],
      success: 'Mensaje enviado',
      onSuccess: (r) => { setOpen(false); setRec([]); setSubject(''); setBody(''); nav(`/campus/mensajes/${r.data.id}`); },
    },
  );

  const unreadTotal = (list.data ?? []).reduce((a, c) => a + c.unreadCount, 0);

  return (
    <div className="animate-rise">
      <div className={clsx(id && 'hidden lg:block')}>
        <PageHeader
          title="Mensajes"
          description={unreadTotal ? `Tienes ${unreadTotal} mensaje${unreadTotal === 1 ? '' : 's'} sin leer.` : 'Conversaciones con facilitadores, compañeros y administración.'}
          actions={<Button variant="primary" icon={<SquarePen className="size-4" />} onClick={() => setOpen(true)}>Nueva conversación</Button>}
        />
      </div>
      <div className="grid gap-8 lg:grid-cols-[340px_1fr]">
        <section className={clsx(id && 'hidden lg:block')} aria-label="Conversaciones">
          {list.isLoading ? (
            <SkeletonRows />
          ) : list.isError ? (
            <Alert tone="danger">No se pudieron cargar tus conversaciones.</Alert>
          ) : list.data!.length === 0 ? (
            <EmptyState title="Tu bandeja está vacía" description="Escribe a un facilitador o compañero para iniciar una conversación." action={<Button variant="primary" onClick={() => setOpen(true)}>Nueva conversación</Button>} />
          ) : (
            <ul className="divide-y divide-line border-y border-ink">
              {list.data!.map((c) => {
                const others = c.participants.filter((p) => p.id !== user?.id);
                const active = String(c.id) === id;
                return (
                  <li key={c.id}>
                    <Link to={`/campus/mensajes/${c.id}`} aria-current={active ? 'page' : undefined} className={clsx('flex gap-3 px-2 py-3 no-underline hover:bg-stone', active && 'bg-stone')}>
                      <Avatar user={others[0]} size={36} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className={clsx('truncate text-sm', c.unreadCount ? 'font-bold' : 'font-semibold')}>{c.subject || others.map(fullName).join(', ') || 'Conversación'}</span>
                          <span className="shrink-0 text-xs text-muted">{relative(c.updatedAt)}</span>
                        </span>
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-xs text-graphite">{c.lastMessage ? c.lastMessage.body : 'Sin mensajes'}</span>
                          {c.unreadCount > 0 && <span className="inline-flex min-w-5 shrink-0 items-center justify-center bg-orange px-1 text-[0.6875rem] font-bold text-ink tnum" aria-label={`${c.unreadCount} sin leer`}>{c.unreadCount}</span>}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
        <section aria-label="Conversación abierta" className={clsx(!id && 'hidden lg:block')}>
          {id ? <Conv id={id} /> : (
            <div className="hidden border-t border-ink py-12 lg:block">
              <Mail className="mb-3 size-6 text-graphite" aria-hidden />
              <p className="text-xl font-bold tracking-tight">Selecciona una conversación</p>
              <p className="mt-1 text-graphite">O inicia una nueva con el botón de arriba.</p>
            </div>
          )}
        </section>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Nueva conversación"
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button variant="primary" loading={create.isPending} disabled={!rec.length || !body.trim()} onClick={() => create.mutate()}>Enviar</Button>
          </>
        }
      >
        <div className="space-y-4">
          {toNote && <Alert tone="warning">{toNote}</Alert>}
          <ContactPicker selected={rec} onChange={setRec} />
          <Input label="Asunto" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} hint="Opcional." />
          <Textarea label="Mensaje" required rows={5} value={body} onChange={(e) => setBody(e.target.value)} maxLength={10000} />
        </div>
      </Modal>
    </div>
  );
}
