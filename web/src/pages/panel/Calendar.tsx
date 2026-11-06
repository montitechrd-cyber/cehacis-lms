import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ClipboardCheck, Pencil, Plus, Trash2 } from 'lucide-react';
import { api, ApiError, errorMessage, type Paged } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { EVENT_TYPES, dateTime, fullName } from '@/lib/format';
import { PageHeader } from '@/components/ui/Page';
import { Button } from '@/components/ui/Button';
import { Input, Select, Switch, Textarea } from '@/components/ui/Form';
import { Drawer, ConfirmDialog } from '@/components/ui/Overlay';
import { Alert, ErrorState } from '@/components/ui/Feedback';
import { Toolbar } from '@/components/ui/Data';
import { CalendarMonth, EventAgenda, useCalendarEvents, type CalendarEvent } from '@/features/operations/CalendarMonth';
import { EventDetailModal } from '@/features/operations/EventDetail';
import { StudentPicker, courseOptions, fromLocalInput, toLocalInput, useCourses, type PersonBrief } from '@/features/operations/shared';

interface Conflict {
  id: number;
  title: string;
  startAt: string;
  endAt: string;
}

interface FormState {
  title: string;
  description: string;
  type: string;
  courseId: string;
  groupId: string;
  instructorId: string;
  startAt: string;
  endAt: string;
  location: string;
  meetingUrl: string;
  recordingUrl: string;
  isPublic: boolean;
  reminderMinutes: string;
  participants: PersonBrief[];
}

const emptyForm = (): FormState => {
  const start = new Date();
  start.setMinutes(0, 0, 0);
  start.setHours(start.getHours() + 1);
  const end = new Date(start.getTime() + 3600000);
  return {
    title: '', description: '', type: 'CLASS', courseId: '', groupId: '', instructorId: '',
    startAt: toLocalInput(start.toISOString()), endAt: toLocalInput(end.toISOString()),
    location: '', meetingUrl: '', recordingUrl: '', isPublic: false, reminderMinutes: '60', participants: [],
  };
};

function fromEvent(ev: CalendarEvent): FormState {
  return {
    title: ev.title, description: ev.description ?? '', type: ev.type, courseId: ev.course ? String(ev.course.id) : '', groupId: ev.group ? String(ev.group.id) : '',
    instructorId: ev.instructor ? String(ev.instructor.id) : '', startAt: toLocalInput(ev.startAt), endAt: toLocalInput(ev.endAt), location: ev.location ?? '',
    meetingUrl: ev.meetingUrl ?? '', recordingUrl: ev.recordingUrl ?? '', isPublic: ev.isPublic, reminderMinutes: ev.reminderMinutes != null ? String(ev.reminderMinutes) : '',
    participants: ev.participantList ?? [],
  };
}

function EventDrawer({ open, editing, onClose, onSaved }: { open: boolean; editing: CalendarEvent | null; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [conflicts, setConflicts] = useState<Conflict[] | null>(null);
  const [saving, setSaving] = useState(false);
  const courses = useCourses(open);
  const instructors = useQuery({
    queryKey: ['people', 'instructors', 'options'],
    queryFn: () => api.get<Paged<{ id: number; firstName: string; lastName: string }>>('/people/instructors', { pageSize: 100 }),
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });
  const groups = useQuery({
    queryKey: ['catalog', 'groups', f.courseId],
    queryFn: () => api.get<{ data: { id: number; name: string }[] }>(`/catalog/courses/${f.courseId}/groups`),
    enabled: open && !!f.courseId,
  });
  const detail = useQuery({
    queryKey: ['calendar', 'event', editing?.id],
    queryFn: () => api.get<{ data: CalendarEvent }>(`/calendar/events/${editing!.id}`),
    enabled: open && !!editing,
  });

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setConflicts(null);
    setF(editing ? fromEvent(detail.data?.data ?? editing) : emptyForm());
  }, [open, editing?.id, detail.data]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((s) => ({ ...s, [k]: v }));

  const save = async (force = false) => {
    setErrors({});
    if (!f.title.trim()) return setErrors({ title: 'Escribe un título' });
    if (!f.startAt || !f.endAt) return setErrors({ startAt: 'Indica inicio y fin' });
    if (new Date(f.endAt) <= new Date(f.startAt)) return setErrors({ endAt: 'El fin debe ser posterior al inicio' });
    const body = {
      title: f.title.trim(),
      description: f.description,
      type: f.type,
      courseId: f.courseId ? Number(f.courseId) : null,
      groupId: f.groupId ? Number(f.groupId) : null,
      instructorId: f.instructorId ? Number(f.instructorId) : null,
      startAt: fromLocalInput(f.startAt),
      endAt: fromLocalInput(f.endAt),
      location: f.location,
      meetingUrl: f.meetingUrl,
      recordingUrl: f.recordingUrl,
      isPublic: f.isPublic,
      reminderMinutes: f.reminderMinutes === '' ? null : Number(f.reminderMinutes),
      participantIds: f.participants.map((p) => p.id),
    };
    setSaving(true);
    try {
      const url = (editing ? `/calendar/events/${editing.id}` : '/calendar/events') + (force ? '?force=true' : '');
      const r = editing ? await api.patch<{ warnings?: string[] }>(url, body) : await api.post<{ warnings?: string[] }>(url, body);
      toast.success(editing ? 'Evento actualizado' : 'Evento creado');
      r.warnings?.forEach((w) => toast.warning(w));
      onSaved();
      onClose();
    } catch (e) {
      if (e instanceof ApiError && e.code === 'EVENT_CONFLICT') {
        setConflicts(((e.details as { conflicts?: Conflict[] } | undefined)?.conflicts) ?? []);
      } else if (e instanceof ApiError && Object.keys(e.fieldErrors).length) {
        setErrors(e.fieldErrors);
        toast.error(e.message);
      } else toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={editing ? 'Editar evento' : 'Nuevo evento'}
      width="max-w-2xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" loading={saving} onClick={() => save(false)}>
            {editing ? 'Guardar cambios' : 'Crear evento'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {conflicts && (
          <Alert
            tone="warning"
            title="El facilitador ya tiene eventos en ese horario"
            action={
              <Button size="sm" variant="ink" loading={saving} onClick={() => save(true)}>
                Guardar de todos modos
              </Button>
            }
          >
            <ul className="mt-1 list-disc pl-4">
              {conflicts.map((c) => (
                <li key={c.id}>
                  {c.title} · {dateTime(c.startAt)}
                </li>
              ))}
            </ul>
          </Alert>
        )}
        <Input label="Título" required value={f.title} onChange={(e) => set('title', e.target.value)} error={errors.title} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Tipo" value={f.type} onChange={(e) => set('type', e.target.value)} options={Object.entries(EVENT_TYPES).map(([value, label]) => ({ value, label }))} />
          <Select label="Facilitador" value={f.instructorId} onChange={(e) => set('instructorId', e.target.value)} placeholder="Sin asignar" options={(instructors.data?.data ?? []).map((i) => ({ value: i.id, label: fullName(i) }))} error={errors.instructorId} />
          <Select label="Curso" value={f.courseId} onChange={(e) => setF((s) => ({ ...s, courseId: e.target.value, groupId: '' }))} placeholder="Sin curso" options={courseOptions(courses.data)} />
          <Select label="Grupo" value={f.groupId} onChange={(e) => set('groupId', e.target.value)} placeholder="Todo el curso" disabled={!f.courseId} options={(groups.data?.data ?? []).map((g) => ({ value: g.id, label: g.name }))} />
          <Input label="Inicio" type="datetime-local" required value={f.startAt} onChange={(e) => set('startAt', e.target.value)} error={errors.startAt} />
          <Input label="Fin" type="datetime-local" required value={f.endAt} onChange={(e) => set('endAt', e.target.value)} error={errors.endAt} />
        </div>
        <Input label="Lugar" value={f.location} onChange={(e) => set('location', e.target.value)} />
        <Input label="Enlace de reunión" type="url" placeholder="https://" value={f.meetingUrl} onChange={(e) => set('meetingUrl', e.target.value)} error={errors.meetingUrl} />
        <Input label="Enlace de grabación" type="url" placeholder="https://" value={f.recordingUrl} onChange={(e) => set('recordingUrl', e.target.value)} error={errors.recordingUrl} />
        <Textarea label="Descripción" rows={3} value={f.description} onChange={(e) => set('description', e.target.value)} />
        <Input label="Recordatorio (minutos antes)" type="number" min={0} value={f.reminderMinutes} onChange={(e) => set('reminderMinutes', e.target.value)} hint="Déjalo vacío para no enviar recordatorio" />
        <Switch checked={f.isPublic} onChange={(v) => set('isPublic', v)} label="Evento público" hint="Visible para cualquier usuario con sesión, sin enlaces de reunión." />
        {(f.type === 'INDIVIDUAL_SESSION' || f.participants.length > 0) && (
          <StudentPicker label="Participantes" value={f.participants} onChange={(v) => set('participants', v)} hint="Para sesiones individuales, elige a los estudiantes que asisten." />
        )}
      </div>
    </Drawer>
  );
}

export default function PanelCalendar() {
  const { can } = useAuth();
  const qc = useQueryClient();
  const canManage = can('calendar.manage');
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [courseId, setCourseId] = useState('');
  const [type, setType] = useState('');
  const [selected, setSelected] = useState<CalendarEvent | null>(null);
  const [drawer, setDrawer] = useState<{ open: boolean; editing: CalendarEvent | null }>({ open: false, editing: null });
  const [toDelete, setToDelete] = useState<CalendarEvent | null>(null);
  const [deleting, setDeleting] = useState(false);
  const courses = useCourses();
  const q = useCalendarEvents(month, { courseId: courseId || undefined, type: type || undefined });

  const refresh = () => qc.invalidateQueries({ queryKey: ['calendar'] });

  const remove = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api.del(`/calendar/events/${toDelete.id}`);
      toast.success('Evento eliminado');
      setToDelete(null);
      setSelected(null);
      refresh();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setDeleting(false);
    }
  };

  const upcoming = (q.data ?? []).filter((e) => new Date(e.endAt) >= new Date()).slice(0, 8);

  return (
    <div className="animate-rise">
      <PageHeader
        title="Calendario y asistencia"
        description="Clases, talleres, sesiones individuales y fechas límite. Abre un evento para registrar asistencia."
        actions={
          canManage && (
            <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setDrawer({ open: true, editing: null })}>
              Nuevo evento
            </Button>
          )
        }
      />
      <Toolbar>
        <Select label="Curso" wrapperClassName="w-full sm:w-64" value={courseId} onChange={(e) => setCourseId(e.target.value)} placeholder="Todos los cursos" options={courseOptions(courses.data)} />
        <Select label="Tipo" wrapperClassName="w-full sm:w-52" value={type} onChange={(e) => setType(e.target.value)} placeholder="Todos los tipos" options={Object.entries(EVENT_TYPES).map(([value, label]) => ({ value, label }))} />
      </Toolbar>
      {q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : (
        <CalendarMonth month={month} onMonthChange={setMonth} events={q.data ?? []} loading={q.isLoading} onSelect={setSelected} />
      )}
      {upcoming.length > 0 && (
        <section className="mt-12 hidden md:block">
          <h2 className="mb-3 border-b border-ink pb-2.5 text-lg font-bold tracking-tight">Agenda próxima</h2>
          <EventAgenda events={upcoming} onSelect={setSelected} />
        </section>
      )}

      <EventDetailModal
        event={selected}
        onClose={() => setSelected(null)}
        actions={
          selected && (
            <>
              <Link to={`/panel/asistencia/${selected.id}`} className="inline-flex h-10 items-center gap-2 rounded-sm border border-ink bg-paper px-4 text-sm font-semibold hover:bg-ink hover:text-paper">
                <ClipboardCheck className="size-4" aria-hidden /> Registrar asistencia
              </Link>
              {selected.canManage && canManage && (
                <>
                  <Button variant="outline" icon={<Pencil className="size-4" />} onClick={() => { setDrawer({ open: true, editing: selected }); setSelected(null); }}>
                    Editar
                  </Button>
                  <Button variant="danger" icon={<Trash2 className="size-4" />} onClick={() => setToDelete(selected)}>
                    Eliminar
                  </Button>
                </>
              )}
            </>
          )
        }
      />
      <EventDrawer open={drawer.open} editing={drawer.editing} onClose={() => setDrawer({ open: false, editing: null })} onSaved={refresh} />
      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={remove}
        loading={deleting}
        title="Eliminar evento"
        confirmLabel="Eliminar"
        description={`Se eliminará «${toDelete?.title}» y se notificará la cancelación si aún no ha terminado.`}
      />
    </div>
  );
}
