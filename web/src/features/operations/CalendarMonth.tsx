import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, ChevronLeft, ChevronRight, ClipboardCheck, Flag, GraduationCap, User, Video, Wrench, type LucideIcon } from 'lucide-react';
import { api } from '@/lib/api';
import { EVENT_TYPES, date, fullName, time } from '@/lib/format';
import { Button, IconButton } from '@/components/ui/Button';
import { Tag } from '@/components/ui/Data';

export interface CalendarEvent {
  id: number;
  title: string;
  description: string | null;
  type: string;
  course: { id: number; title: string } | null;
  group: { id: number; name: string } | null;
  instructor: { id: number; firstName: string; lastName: string; avatarUrl: string | null } | null;
  startAt: string;
  endAt: string;
  location: string | null;
  meetingUrl: string | null;
  meetingProvider: string | null;
  recordingUrl: string | null;
  isPublic: boolean;
  reminderMinutes: number | null;
  participants: number;
  canManage: boolean;
  participantList?: { id: number; firstName: string; lastName: string; email: string; avatarUrl: string | null }[];
}

/** El tipo de evento se distingue por un icono, no por el color de fondo. */
const TYPE_ICON: Record<string, LucideIcon> = {
  CLASS: GraduationCap,
  WORKSHOP: Wrench,
  INDIVIDUAL_SESSION: User,
  VIRTUAL_CLASS: Video,
  EXAM: ClipboardCheck,
  DEADLINE: Flag,
  OTHER: CalendarDays,
};
export const eventClass = (_t?: string) => 'bg-stone text-ink';
export function EventGlyph({ type, className }: { type: string; className?: string }) {
  const Icon = TYPE_ICON[type] ?? TYPE_ICON.OTHER;
  return <Icon className={clsx('size-3 shrink-0', className)} aria-hidden />;
}

const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/** Rango de la rejilla (semanas completas, lunes a domingo) para un mes dado. */
export function gridRange(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(first.getFullYear(), first.getMonth(), 1 - offset);
  const last = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const end = new Date(last.getFullYear(), last.getMonth(), last.getDate() + (6 - ((last.getDay() + 6) % 7)), 23, 59, 59);
  return { start, end };
}

/** Eventos del mes visible (incluye los días de relleno de la rejilla). */
export function useCalendarEvents(month: Date, extra: Record<string, string | number | undefined> = {}) {
  const { start, end } = gridRange(month);
  return useQuery({
    queryKey: ['calendar', 'events', start.toISOString(), end.toISOString(), extra],
    queryFn: async () => (await api.get<{ data: CalendarEvent[] }>('/calendar/events', { from: start.toISOString(), to: end.toISOString(), ...extra })).data,
  });
}

function eventsOn(events: CalendarEvent[], day: Date) {
  const s = startOfDay(day).getTime();
  const e = s + 86400000;
  return events.filter((ev) => new Date(ev.startAt).getTime() < e && new Date(ev.endAt).getTime() > s);
}

export function EventLine({ ev, onClick }: { ev: CalendarEvent; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-start gap-3 py-3 text-left hover:bg-stone sm:px-2">
      <span className="w-20 shrink-0 text-sm font-semibold tnum">
        {time(ev.startAt)}
        <span className="block text-xs font-normal text-muted">{time(ev.endAt)}</span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{ev.title}</span>
        <span className="block truncate text-xs text-graphite">{[ev.course?.title, ev.location, ev.instructor && fullName(ev.instructor)].filter(Boolean).join(' · ') || EVENT_TYPES[ev.type]}</span>
      </span>
      <Tag tone="outline" className="gap-1.5"><EventGlyph type={ev.type} />{EVENT_TYPES[ev.type] ?? ev.type}</Tag>
    </button>
  );
}

/** Lista agenda agrupada por día. */
export function EventAgenda({ events, onSelect, emptyText = 'No hay eventos en este periodo.' }: { events: CalendarEvent[]; onSelect: (e: CalendarEvent) => void; emptyText?: string }) {
  const groups = useMemo(() => {
    const m = new Map<string, CalendarEvent[]>();
    [...events].sort((a, b) => +new Date(a.startAt) - +new Date(b.startAt)).forEach((e) => {
      const k = startOfDay(new Date(e.startAt)).toISOString();
      m.set(k, [...(m.get(k) ?? []), e]);
    });
    return [...m.entries()];
  }, [events]);
  if (!groups.length) return <p className="border-y border-line py-8 text-center text-sm text-graphite">{emptyText}</p>;
  return (
    <div className="border-t border-ink">
      {groups.map(([k, evs]) => {
        const d = new Date(k);
        return (
          <section key={k} className="border-b border-line py-3">
            <h3 className={clsx('mb-1 text-sm font-bold capitalize', sameDay(d, new Date()) && 'text-orange-deep')}>
              {date(d, { weekday: 'long', day: 'numeric', month: 'long' })}
              {sameDay(d, new Date()) && ' · hoy'}
            </h3>
            <div className="divide-y divide-line">
              {evs.map((ev) => (
                <EventLine key={ev.id} ev={ev} onClick={() => onSelect(ev)} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

/** Rejilla mensual (escritorio). En móvil se muestra la agenda del mes. */
export function CalendarMonth({
  month,
  onMonthChange,
  events,
  loading,
  onSelect,
}: {
  month: Date;
  onMonthChange: (d: Date) => void;
  events: CalendarEvent[];
  loading?: boolean;
  onSelect: (e: CalendarEvent) => void;
}) {
  const [openDay, setOpenDay] = useState<Date | null>(null);
  const { start } = gridRange(month);
  const { end } = gridRange(month);
  const days: Date[] = [];
  for (let d = new Date(start); d <= end; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) days.push(d);
  const today = new Date();
  const label = date(month, { month: 'long', year: 'numeric' });
  const monthEvents = events.filter((e) => {
    const s = new Date(e.startAt);
    return s.getMonth() === month.getMonth() && s.getFullYear() === month.getFullYear();
  });
  const go = (n: number) => {
    setOpenDay(null);
    onMonthChange(new Date(month.getFullYear(), month.getMonth() + n, 1));
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold capitalize tracking-tight" aria-live="polite">
          {label}
        </h2>
        <div className="flex items-center gap-1">
          <IconButton label="Mes anterior" onClick={() => go(-1)}>
            <ChevronLeft className="size-5" />
          </IconButton>
          <Button variant="outline" size="sm" onClick={() => onMonthChange(new Date(today.getFullYear(), today.getMonth(), 1))}>
            Hoy
          </Button>
          <IconButton label="Mes siguiente" onClick={() => go(1)}>
            <ChevronRight className="size-5" />
          </IconButton>
        </div>
      </div>

      {/* Móvil: agenda */}
      <div className={clsx('md:hidden', loading && 'opacity-60')}>
        <EventAgenda events={monthEvents} onSelect={onSelect} emptyText="No hay eventos este mes." />
      </div>

      {/* Escritorio: rejilla */}
      <div className={clsx('hidden md:block', loading && 'opacity-60')} role="grid" aria-label={`Calendario de ${label}`}>
        <div className="grid grid-cols-7 border-t border-ink" role="row">
          {DAY_NAMES.map((n) => (
            <div key={n} role="columnheader" className="px-2 py-2 text-[0.75rem] font-semibold uppercase tracking-[0.06em] text-graphite">
              {n}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 border-l border-line">
          {days.map((d) => {
            const inMonth = d.getMonth() === month.getMonth();
            const isToday = sameDay(d, today);
            const evs = eventsOn(events, d);
            const shown = evs.slice(0, 3);
            return (
              <div key={d.toISOString()} role="gridcell" className={clsx('min-h-28 border-b border-r border-line p-1.5', !inMonth && 'bg-stone/60')}>
                <span className={clsx('inline-flex size-6 items-center justify-center text-xs font-bold tnum', isToday ? 'bg-orange text-ink' : inMonth ? 'text-ink' : 'text-muted')} aria-label={date(d, { dateStyle: 'full' }) + (isToday ? ' (hoy)' : '')}>
                  {d.getDate()}
                </span>
                <ul className="mt-1 space-y-0.5">
                  {shown.map((ev) => (
                    <li key={ev.id}>
                      <button type="button" onClick={() => onSelect(ev)} title={`${ev.title} · ${time(ev.startAt)}`} className={clsx('flex w-full items-center gap-1 truncate border-l border-ink px-1.5 py-0.5 text-left text-[0.6875rem] font-semibold hover:bg-stone-2', eventClass(ev.type))}>
                        <EventGlyph type={ev.type} /><span className="tnum">{time(ev.startAt)}</span> <span className="truncate">{ev.title}</span>
                      </button>
                    </li>
                  ))}
                </ul>
                {evs.length > shown.length && (
                  <button type="button" onClick={() => setOpenDay(d)} className="mt-0.5 px-1 text-[0.6875rem] font-semibold text-graphite underline">
                    +{evs.length - shown.length} más
                  </button>
                )}
              </div>
            );
          })}
        </div>
        {openDay && (
          <div className="mt-4 border-t border-ink pt-3">
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-sm font-bold capitalize">{date(openDay, { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
              <button type="button" onClick={() => setOpenDay(null)} className="text-xs font-semibold underline">
                Cerrar
              </button>
            </div>
            <div className="divide-y divide-line">
              {eventsOn(events, openDay).map((ev) => (
                <EventLine key={ev.id} ev={ev} onClick={() => onSelect(ev)} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
