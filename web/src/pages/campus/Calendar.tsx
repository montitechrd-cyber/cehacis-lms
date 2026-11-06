import { useState } from 'react';
import { CalendarPlus } from 'lucide-react';
import { PageHeader, Section } from '@/components/ui/Page';
import { Alert, ErrorState } from '@/components/ui/Feedback';
import { CalendarMonth, EventAgenda, useCalendarEvents, type CalendarEvent } from '@/features/operations/CalendarMonth';
import { EventDetailModal } from '@/features/operations/EventDetail';
import { toast } from 'sonner';

export default function CampusCalendar() {
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selected, setSelected] = useState<CalendarEvent | null>(null);
  const q = useCalendarEvents(month);
  const feed = `${window.location.origin}/api/calendar/me.ics`;

  const upcoming = (q.data ?? []).filter((e) => new Date(e.endAt) >= new Date()).slice(0, 6);

  return (
    <div className="animate-rise">
      <PageHeader
        title="Calendario"
        description="Tus clases, talleres, sesiones y fechas límite."
        actions={
          <a
            href="/api/calendar/me.ics"
            download="cehacis.ics"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-sm border border-ink bg-paper px-4 text-sm font-semibold text-ink hover:bg-ink hover:text-paper"
          >
            <CalendarPlus className="size-4" aria-hidden />
            Suscribirme al calendario
          </a>
        }
      />
      <Alert tone="info" title="Lleva tu calendario a Google u Outlook">
        <p>
          Usa este enlace para suscribirte desde Google Calendar, Outlook o Apple Calendar («Añadir calendario desde URL»). Se incluyen tus próximos 90 días.{' '}
          <button
            type="button"
            className="font-semibold underline underline-offset-4"
            onClick={() => navigator.clipboard?.writeText(feed).then(() => toast.success('Enlace copiado'), () => toast.error('No se pudo copiar'))}
          >
            Copiar enlace
          </button>
        </p>
      </Alert>
      <div className="mt-8">
        {q.isError ? (
          <ErrorState error={q.error} onRetry={() => q.refetch()} />
        ) : (
          <CalendarMonth month={month} onMonthChange={setMonth} events={q.data ?? []} loading={q.isLoading} onSelect={setSelected} />
        )}
      </div>
      {upcoming.length > 0 && (
        <Section title="Próximos eventos" className="mt-12">
          <EventAgenda events={upcoming} onSelect={setSelected} />
        </Section>
      )}
      <EventDetailModal event={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
