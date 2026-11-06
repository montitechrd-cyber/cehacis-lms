import type { ReactNode } from 'react';
import { ExternalLink, Video } from 'lucide-react';
import { EVENT_TYPES, dateTime, fullName, time } from '@/lib/format';
import { Modal } from '@/components/ui/Overlay';
import { Facts, Tag } from '@/components/ui/Data';
import { ButtonLink } from '@/components/ui/Button';
import { eventClass, type CalendarEvent } from './CalendarMonth';

/** Detalle de evento (solo lectura) con acciones opcionales en el pie. */
export function EventDetailModal({ event, onClose, actions }: { event: CalendarEvent | null; onClose: () => void; actions?: ReactNode }) {
  const ev = event;
  return (
    <Modal
      open={!!ev}
      onClose={onClose}
      title={ev?.title ?? ''}
      description={ev ? `${dateTime(ev.startAt)} – ${time(ev.endAt)}` : undefined}
      footer={
        ev && (
          <>
            {ev.meetingUrl && (
              <ButtonLink to={ev.meetingUrl} variant="primary" icon={<Video className="size-4" />} target="_blank" rel="noopener noreferrer">
                Unirme a la reunión
              </ButtonLink>
            )}
            {actions}
          </>
        )
      }
    >
      {ev && (
        <div className="space-y-4">
          <Tag className={eventClass(ev.type)}>{EVENT_TYPES[ev.type] ?? ev.type}</Tag>
          {ev.description && <p className="whitespace-pre-line text-sm text-graphite">{ev.description}</p>}
          <Facts
            items={[
              ...(ev.course ? [{ label: 'Curso', value: ev.course.title }] : []),
              ...(ev.group ? [{ label: 'Grupo', value: ev.group.name }] : []),
              ...(ev.instructor ? [{ label: 'Facilitador', value: fullName(ev.instructor) }] : []),
              ...(ev.location ? [{ label: 'Lugar', value: ev.location }] : []),
              ...(ev.meetingProvider ? [{ label: 'Plataforma', value: ev.meetingProvider }] : []),
              ...(ev.reminderMinutes != null ? [{ label: 'Recordatorio', value: `${ev.reminderMinutes} min antes` }] : []),
              { label: 'Visibilidad', value: ev.isPublic ? 'Público' : 'Solo participantes' },
            ]}
          />
          {ev.participantList && ev.participantList.length > 0 && (
            <div>
              <p className="mb-1 text-sm font-semibold">Participantes</p>
              <p className="text-sm text-graphite">{ev.participantList.map((p) => fullName(p)).join(', ')}</p>
            </div>
          )}
          {ev.recordingUrl && (
            <a href={ev.recordingUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold underline underline-offset-4">
              <ExternalLink className="size-4" aria-hidden /> Ver grabación
            </a>
          )}
        </div>
      )}
    </Modal>
  );
}
