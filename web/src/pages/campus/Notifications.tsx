import { useNavigate } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { CheckCheck } from 'lucide-react';
import { api, type Paged } from '@/lib/api';
import { useAction, useTableParams } from '@/lib/hooks';
import { relative } from '@/lib/format';
import { PageHeader } from '@/components/ui/Page';
import { EmptyState } from '@/components/ui/Feedback';
import { Button } from '@/components/ui/Button';
import { Pagination, Tabs } from '@/components/ui/Data';
import { Q } from '@/features/campus/shared';

interface Notif { id: number; type: string; title: string; body: string | null; link: string | null; readAt: string | null; createdAt: string }

export default function Notifications() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const t = useTableParams();
  const filter = t.get('f') === 'unread' ? 'unread' : 'all';
  const q = useQuery({
    queryKey: ['notifications', 'list', filter, t.page],
    queryFn: () => api.get<Paged<Notif>>('/community/notifications', { unread: filter === 'unread' ? 1 : undefined, page: t.page, pageSize: 20 }),
    placeholderData: (p) => p,
  });
  const readAll = useAction(() => api.post('/community/notifications/read-all'), { invalidate: [['notifications']], success: 'Todas marcadas como leídas' });
  const open = async (n: Notif) => {
    if (!n.readAt) {
      try {
        await api.post(`/community/notifications/${n.id}/read`);
        qc.invalidateQueries({ queryKey: ['notifications'] });
      } catch {
        /* no bloquea la navegación */
      }
    }
    if (n.link) nav(n.link);
  };

  return (
    <div className="animate-rise">
      <PageHeader
        title="Notificaciones"
        actions={<Button variant="outline" icon={<CheckCheck className="size-4" />} loading={readAll.isPending} onClick={() => readAll.mutate()}>Marcar todas como leídas</Button>}
      />
      <Tabs
        className="mb-4"
        tabs={[{ key: 'all', label: 'Todas' }, { key: 'unread', label: 'No leídas' }]}
        value={filter}
        onChange={(k) => t.set({ f: k === 'unread' ? 'unread' : null })}
      />
      <Q query={q}>
        {(r) =>
          r.data.length === 0 ? (
            <EmptyState title={filter === 'unread' ? 'No tienes notificaciones sin leer' : 'No tienes notificaciones'} description="Aquí verás respuestas, mensajes, calificaciones y avisos importantes." />
          ) : (
            <>
              <ul className="divide-y divide-line border-y border-ink">
                {r.data.map((n) => (
                  <li key={n.id}>
                    <button type="button" onClick={() => open(n)} className="flex w-full items-start gap-3 px-2 py-3.5 text-left hover:bg-stone">
                      <span className={clsx('mt-1.5 size-2.5 shrink-0', n.readAt ? 'border border-line-strong' : 'bg-orange')} aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className={clsx('block text-sm', n.readAt ? 'font-medium' : 'font-bold')}>
                          {!n.readAt && <span className="sr-only">No leída: </span>}
                          {n.title}
                        </span>
                        {n.body && <span className="block whitespace-pre-wrap break-words text-sm text-graphite">{n.body}</span>}
                      </span>
                      <span className="shrink-0 text-xs text-muted">{relative(n.createdAt)}</span>
                    </button>
                  </li>
                ))}
              </ul>
              <Pagination page={r.meta.page} pages={r.meta.pages} total={r.meta.total} onPage={(p) => t.set({ page: p }, false)} />
            </>
          )
        }
      </Q>
    </div>
  );
}
