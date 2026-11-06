import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { CheckCheck, Save } from 'lucide-react';
import { api } from '@/lib/api';
import { ATTENDANCE, EVENT_TYPES, dateTime, fullName } from '@/lib/format';
import { useAction } from '@/lib/hooks';
import { PageHeader } from '@/components/ui/Page';
import { Button } from '@/components/ui/Button';
import { Avatar, Tag } from '@/components/ui/Data';
import { EmptyState, ErrorState, SkeletonRows } from '@/components/ui/Feedback';
import { Segmented } from '@/features/operations/shared';

interface Roster {
  event: { id: number; title: string; type: string; startAt: string; endAt: string; course: { id: number; title: string } | null; group: { id: number; name: string } | null };
  data: { user: { id: number; firstName: string; lastName: string; email: string; avatarUrl: string | null }; source: 'enrollment' | 'participant'; status: string | null; notes: string | null; recordedAt: string | null }[];
}

type Row = { status: string | null; notes: string };

export default function Attendance() {
  const { eventId } = useParams();
  const q = useQuery({ queryKey: ['calendar', 'attendance', eventId], queryFn: () => api.get<Roster>(`/calendar/events/${eventId}/attendance`) });
  const [rows, setRows] = useState<Record<number, Row>>({});
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!q.data) return;
    setRows(Object.fromEntries(q.data.data.map((r) => [r.user.id, { status: r.status, notes: r.notes ?? '' }])));
    setDirty(false);
  }, [q.data]);

  const save = useAction(
    () => {
      const records = Object.entries(rows)
        .filter(([, r]) => r.status)
        .map(([id, r]) => ({ userId: Number(id), status: r.status, notes: r.notes }));
      return api.put<{ saved: number }>(`/calendar/events/${eventId}/attendance`, { records });
    },
    { success: (r) => `Asistencia guardada (${r.saved} registros)`, invalidate: [['calendar', 'attendance']] },
  );

  const setRow = (id: number, patch: Partial<Row>) => {
    setRows((s) => ({ ...s, [id]: { ...(s[id] ?? { status: null, notes: '' }), ...patch } }));
    setDirty(true);
  };
  const markAll = () => {
    setRows((s) => Object.fromEntries(Object.entries(s).map(([id, r]) => [id, { ...r, status: 'PRESENT' }])));
    setDirty(true);
  };

  const ev = q.data?.event;
  const counted = Object.values(rows).filter((r) => r.status).length;
  const total = q.data?.data.length ?? 0;

  return (
    <div className="animate-rise">
      <PageHeader
        crumbs={[{ label: 'Calendario', to: '/panel/calendario' }, { label: 'Asistencia' }]}
        title={ev ? ev.title : 'Asistencia'}
        description={ev && `${EVENT_TYPES[ev.type] ?? ev.type} · ${dateTime(ev.startAt)}${ev.course ? ` · ${ev.course.title}` : ''}${ev.group ? ` · ${ev.group.name}` : ''}`}
        actions={
          total > 0 && (
            <>
              <Button variant="outline" icon={<CheckCheck className="size-4" />} onClick={markAll}>
                Marcar todos presentes
              </Button>
              <Button variant="primary" icon={<Save className="size-4" />} loading={save.isPending} disabled={!counted} onClick={() => save.mutate(undefined, { onSuccess: () => setDirty(false) })}>
                Guardar asistencia
              </Button>
            </>
          )
        }
      />
      {q.isLoading ? (
        <SkeletonRows rows={6} />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : total === 0 ? (
        <EmptyState title="Este evento no tiene participantes" description="La lista se forma con los inscritos del curso (o del grupo) y los participantes explícitos del evento." />
      ) : (
        <>
          <p className="mb-3 text-sm text-graphite tnum" aria-live="polite">
            {counted} de {total} registrados{dirty && ' · cambios sin guardar'}
          </p>
          <ul className="divide-y divide-line border-y border-ink">
            {q.data!.data.map((r) => {
              const row = rows[r.user.id] ?? { status: r.status, notes: '' };
              return (
                <li key={r.user.id} className="grid gap-3 py-4 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,16rem)] lg:items-center">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar user={r.user} size={36} />
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{fullName(r.user)}</p>
                      <p className="truncate text-xs text-muted">
                        {r.user.email} {r.source === 'participant' && <Tag className="ml-1">Participante</Tag>}
                      </p>
                    </div>
                  </div>
                  <Segmented
                    label={`Asistencia de ${fullName(r.user)}`}
                    size="sm"
                    value={(row.status ?? '') as string}
                    onChange={(k) => setRow(r.user.id, { status: k })}
                    options={Object.entries(ATTENDANCE).map(([key, label]) => ({ key, label }))}
                  />
                  <input
                    aria-label={`Notas de ${fullName(r.user)}`}
                    placeholder="Notas"
                    value={row.notes}
                    onChange={(e) => setRow(r.user.id, { notes: e.target.value })}
                    className="h-9 w-full rounded-sm border border-line-strong bg-paper px-3 text-sm placeholder:text-muted focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
                  />
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
