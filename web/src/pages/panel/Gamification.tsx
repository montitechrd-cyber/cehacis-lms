import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useAction } from '@/lib/hooks';
import { useAuth } from '@/lib/auth';
import { date, dateTime, fullName, num } from '@/lib/format';
import { Button, IconButton } from '@/components/ui/Button';
import { Input, Select, Switch, Textarea } from '@/components/ui/Form';
import { EmptyState, ErrorState, SkeletonRows } from '@/components/ui/Feedback';
import { Drawer, Modal } from '@/components/ui/Overlay';
import { PageHeader } from '@/components/ui/Page';
import { Avatar, DataTable, Tabs, Tag } from '@/components/ui/Data';
import { BADGE_ICONS, BadgeIcon, RowActions, numOrNull, useCompetencies, useCourseOptions, useDeleter, useTab } from '@/features/system/shared';

interface Rule { id: number; event: string; name: string; points: number; isActive: boolean; dailyCap: number | null }
interface Level { id: number; number: number; name: string; minPoints: number }
interface Badge { id: number; key: string; name: string; description: string; icon: string; criteria: { type: string; min: number }; competencyId: number | null; points: number; isActive: boolean }
interface Challenge { id: number; title: string; description: string; startsAt: string; endsAt: string; points: number; criteria: { type: string; target: number }; competencyId: number | null; isActive: boolean }

const EVENTS: Record<string, string> = {
  LESSON_COMPLETED: 'Lección completada', MODULE_COMPLETED: 'Módulo completado', COURSE_COMPLETED: 'Curso completado', ASSESSMENT_PASSED: 'Evaluación aprobada',
  PERFECT_SCORE: 'Puntuación perfecta', ACTIVITY_SUBMITTED: 'Actividad entregada', PEER_REVIEW_GIVEN: 'Revisión entre pares', FORUM_POST: 'Mensaje en foro',
  SIMULATION_COMPLETED: 'Simulación completada', ATTENDANCE_PRESENT: 'Asistencia', CHALLENGE_COMPLETED: 'Reto completado', RECOGNITION_RECEIVED: 'Reconocimiento recibido',
};
const BADGE_CRITERIA: Record<string, string> = {
  POINTS: 'Puntos acumulados', COURSES_COMPLETED: 'Cursos completados', LESSONS_COMPLETED: 'Lecciones completadas', SIMULATIONS_COMPLETED: 'Simulaciones completadas',
  FORUM_POSTS: 'Mensajes en foros', COMPETENCY_SCORE: 'Puntaje en una competencia', CERTIFICATES: 'Certificados obtenidos',
};
const CHALLENGE_CRITERIA: Record<string, string> = {
  LESSONS_COMPLETED: 'Lecciones completadas', ASSESSMENTS_PASSED: 'Evaluaciones aprobadas', FORUM_POSTS: 'Mensajes en foros',
  SIMULATIONS_COMPLETED: 'Simulaciones completadas', ACTIVITIES_SUBMITTED: 'Actividades entregadas', ATTENDANCE: 'Asistencias',
};
const opts = (o: Record<string, string>) => Object.entries(o).map(([value, label]) => ({ value, label }));

export default function Gamification() {
  const tabs = [
    { key: 'rules' as const, label: 'Reglas de puntos' }, { key: 'levels' as const, label: 'Niveles' }, { key: 'badges' as const, label: 'Insignias' },
    { key: 'challenges' as const, label: 'Retos semanales' }, { key: 'leaderboard' as const, label: 'Clasificación' },
  ];
  const [tab, setTab] = useTab(tabs.map((t) => t.key));
  return (
    <div>
      <PageHeader title="Gamificación" description="Define cuántos puntos vale cada acción, los niveles, las insignias y los retos que motivan a los estudiantes." />
      <Tabs tabs={tabs} value={tab} onChange={setTab} className="mb-6" />
      {tab === 'rules' && <Rules />}
      {tab === 'levels' && <Levels />}
      {tab === 'badges' && <Badges />}
      {tab === 'challenges' && <Challenges />}
      {tab === 'leaderboard' && <Leaderboard />}
    </div>
  );
}

function Rules() {
  const q = useQuery({ queryKey: ['gm-rules'], queryFn: () => api.get<{ data: Rule[] }>('/gamification/rules') });
  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  if (q.isLoading) return <SkeletonRows />;
  return (
    <div>
      <p className="mb-3 max-w-2xl text-sm text-graphite">Edita una fila y pulsa Guardar. Una regla inactiva o con 0 puntos no otorga nada. El tope diario limita los puntos que un estudiante puede ganar por esta acción cada día (vacío = sin tope).</p>
      <div className="overflow-x-auto border-t border-ink">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-line text-left text-[0.75rem] font-semibold uppercase tracking-[0.06em] text-graphite">
              <th scope="col" className="px-3 py-3">Evento</th><th scope="col" className="px-3 py-3">Nombre</th><th scope="col" className="px-3 py-3">Puntos</th>
              <th scope="col" className="px-3 py-3">Tope diario</th><th scope="col" className="px-3 py-3">Activa</th><th scope="col" className="px-3 py-3"><span className="sr-only">Guardar</span></th>
            </tr>
          </thead>
          <tbody>{q.data?.data.map((r) => <RuleRow key={`${r.id}-${r.points}-${r.dailyCap}-${r.isActive}-${r.name}`} rule={r} />)}</tbody>
        </table>
      </div>
    </div>
  );
}

function RuleRow({ rule }: { rule: Rule }) {
  const [name, setName] = useState(rule.name);
  const [points, setPoints] = useState(String(rule.points));
  const [cap, setCap] = useState(rule.dailyCap ? String(rule.dailyCap) : '');
  const [active, setActive] = useState(rule.isActive);
  const dirty = name !== rule.name || Number(points) !== rule.points || (numOrNull(cap) ?? null) !== (rule.dailyCap || null) || active !== rule.isActive;
  const save = useAction(() => api.put(`/gamification/rules/${rule.id}`, { name, points: Number(points) || 0, dailyCap: numOrNull(cap), isActive: active }), { success: 'Regla guardada', invalidate: [['gm-rules']] });
  const cell = 'h-9 w-full rounded-sm border border-line-strong bg-paper px-2 text-sm focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink';
  return (
    <tr className="border-b border-line">
      <td className="px-3 py-2 text-xs text-muted">{EVENTS[rule.event] ?? rule.event}<span className="block font-mono text-[0.6875rem]">{rule.event}</span></td>
      <td className="px-3 py-2"><input aria-label={`Nombre de ${rule.event}`} className={cell} value={name} onChange={(e) => setName(e.target.value)} /></td>
      <td className="w-28 px-3 py-2"><input aria-label={`Puntos de ${rule.event}`} type="number" min={0} className={cell} value={points} onChange={(e) => setPoints(e.target.value)} /></td>
      <td className="w-32 px-3 py-2"><input aria-label={`Tope diario de ${rule.event}`} type="number" min={0} className={cell} placeholder="Sin tope" value={cap} onChange={(e) => setCap(e.target.value)} /></td>
      <td className="px-3 py-2"><input aria-label={`Regla ${rule.event} activa`} type="checkbox" className="size-4 accent-ink" checked={active} onChange={(e) => setActive(e.target.checked)} /></td>
      <td className="px-3 py-2 text-right"><Button size="sm" variant={dirty ? 'primary' : 'outline'} disabled={!dirty} loading={save.isPending} onClick={() => save.mutate()}>Guardar</Button></td>
    </tr>
  );
}

function Levels() {
  const q = useQuery({ queryKey: ['gm-levels'], queryFn: () => api.get<{ data: Level[] }>('/gamification/levels') });
  const [edit, setEdit] = useState<Level | 'new' | null>(null);
  const del = useDeleter({ path: (id) => `/gamification/levels/${id}`, invalidate: [['gm-levels']], title: 'Eliminar nivel', description: 'Los estudiantes recalcularán su nivel con los niveles restantes.', success: 'Nivel eliminado' });
  return (
    <div>
      <div className="mb-4 flex justify-end"><Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setEdit('new')}>Nuevo nivel</Button></div>
      {q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : (
        <DataTable loading={q.isLoading} rows={q.data?.data} rowKey={(r) => r.id}
          empty={<EmptyState title="Sin niveles" description="Los niveles marcan el progreso según los puntos acumulados." action={<Button variant="primary" onClick={() => setEdit('new')}>Crear nivel</Button>} />}
          columns={[
            { key: 'n', header: 'Nivel', cell: (r) => <span className="font-bold">{r.number}</span> },
            { key: 'na', header: 'Nombre', cell: (r) => r.name },
            { key: 'p', header: 'Desde (puntos)', align: 'right', cell: (r) => num(r.minPoints) },
            { key: 'x', header: <span className="sr-only">Acciones</span>, align: 'right', cell: (r) => (<RowActions><IconButton label="Editar" size="sm" onClick={() => setEdit(r)}><Pencil className="size-4" /></IconButton><IconButton label="Eliminar" size="sm" onClick={() => del.ask(r.id)}><Trash2 className="size-4" /></IconButton></RowActions>) },
          ]} />
      )}
      {edit && <LevelModal item={edit === 'new' ? null : edit} onClose={() => setEdit(null)} />}
      {del.dialog}
    </div>
  );
}

function LevelModal({ item, onClose }: { item: Level | null; onClose: () => void }) {
  const [f, setF] = useState({ number: item ? String(item.number) : '', name: item?.name ?? '', minPoints: item ? String(item.minPoints) : '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const save = useAction((b: Record<string, unknown>) => (item ? api.patch(`/gamification/levels/${item.id}`, b) : api.post('/gamification/levels', b)), {
    success: 'Nivel guardado', invalidate: [['gm-levels']], onSuccess: onClose,
  });
  return (
    <Modal open onClose={onClose} title={item ? 'Editar nivel' : 'Nuevo nivel'} size="sm"
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button type="submit" form="lvl-form" variant="primary" loading={save.isPending}>Guardar</Button></>}>
      <form id="lvl-form" className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate({ number: Number(f.number), name: f.name, minPoints: Number(f.minPoints) }, { onError: (x) => x instanceof ApiError && setErrors(x.fieldErrors) }); }}>
        <Input label="Número" type="number" min={1} required value={f.number} error={errors.number} onChange={(e) => setF({ ...f, number: e.target.value })} />
        <Input label="Nombre" required value={f.name} error={errors.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <Input label="Puntos mínimos" type="number" min={0} required value={f.minPoints} error={errors.minPoints} onChange={(e) => setF({ ...f, minPoints: e.target.value })} />
      </form>
    </Modal>
  );
}

function Badges() {
  const q = useQuery({ queryKey: ['gm-badges'], queryFn: () => api.get<{ data: Badge[] }>('/gamification/badges') });
  const [edit, setEdit] = useState<Badge | 'new' | null>(null);
  const del = useDeleter({ path: (id) => `/gamification/badges/${id}`, invalidate: [['gm-badges']], title: 'Eliminar insignia', description: 'También se retirará de los estudiantes que ya la obtuvieron.', success: 'Insignia eliminada' });
  return (
    <div>
      <div className="mb-4 flex justify-end"><Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setEdit('new')}>Nueva insignia</Button></div>
      {q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : (
        <DataTable loading={q.isLoading} rows={q.data?.data} rowKey={(r) => r.id}
          empty={<EmptyState title="Sin insignias" description="Reconoce logros como completar cursos o participar en foros." action={<Button variant="primary" onClick={() => setEdit('new')}>Crear insignia</Button>} />}
          columns={[
            { key: 'i', header: <span className="sr-only">Icono</span>, cell: (r) => <span className="inline-flex size-9 items-center justify-center bg-ink text-paper"><BadgeIcon name={r.icon} /></span> },
            { key: 'n', header: 'Insignia', cell: (r) => (<div><p className="font-semibold">{r.name}</p><p className="font-mono text-[0.6875rem] text-muted">{r.key}</p></div>) },
            { key: 'c', header: 'Criterio', cell: (r) => `${BADGE_CRITERIA[r.criteria.type] ?? r.criteria.type}: ${r.criteria.min}` },
            { key: 'p', header: 'Puntos', align: 'right', cell: (r) => r.points },
            { key: 's', header: 'Estado', cell: (r) => <Tag tone={r.isActive ? 'success' : 'neutral'}>{r.isActive ? 'Activa' : 'Inactiva'}</Tag> },
            { key: 'x', header: <span className="sr-only">Acciones</span>, align: 'right', cell: (r) => (<RowActions><IconButton label="Editar" size="sm" onClick={() => setEdit(r)}><Pencil className="size-4" /></IconButton><IconButton label="Eliminar" size="sm" onClick={() => del.ask(r.id)}><Trash2 className="size-4" /></IconButton></RowActions>) },
          ]} />
      )}
      {edit && <BadgeDrawer item={edit === 'new' ? null : edit} onClose={() => setEdit(null)} />}
      {del.dialog}
    </div>
  );
}

function BadgeDrawer({ item, onClose }: { item: Badge | null; onClose: () => void }) {
  const { options } = useCompetencies();
  const [f, setF] = useState({
    key: item?.key ?? '', name: item?.name ?? '', description: item?.description ?? '', icon: item?.icon ?? 'award', type: item?.criteria.type ?? 'POINTS',
    min: item ? String(item.criteria.min) : '1', competencyId: item?.competencyId ? String(item.competencyId) : '', points: item ? String(item.points) : '0', isActive: item?.isActive ?? true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const save = useAction((b: Record<string, unknown>) => (item ? api.patch(`/gamification/badges/${item.id}`, b) : api.post('/gamification/badges', b)), {
    success: 'Insignia guardada', invalidate: [['gm-badges']], onSuccess: onClose,
  });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  return (
    <Drawer open onClose={onClose} title={item ? 'Editar insignia' : 'Nueva insignia'}
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button type="submit" form="badge-form" variant="primary" loading={save.isPending}>Guardar</Button></>}>
      <form id="badge-form" className="space-y-4" onSubmit={(e) => {
        e.preventDefault();
        save.mutate({ key: f.key, name: f.name, description: f.description, icon: f.icon, criteria: { type: f.type, min: Number(f.min) }, competencyId: f.type === 'COMPETENCY_SCORE' ? Number(f.competencyId) || null : null, points: Number(f.points) || 0, isActive: f.isActive },
          { onError: (x) => x instanceof ApiError && setErrors(x.fieldErrors) });
      }}>
        <Input label="Clave" required value={f.key} error={errors.key} onChange={set('key')} />
        <Input label="Nombre" required value={f.name} error={errors.name} onChange={set('name')} />
        <Textarea label="Descripción" rows={2} value={f.description} error={errors.description} onChange={set('description')} />
        <div className="flex items-end gap-4">
          <Select wrapperClassName="flex-1" label="Icono" options={Object.entries(BADGE_ICONS).map(([value, v]) => ({ value, label: v.label }))} value={f.icon} onChange={set('icon')} />
          <span className="inline-flex size-10 shrink-0 items-center justify-center bg-ink text-paper" aria-hidden><BadgeIcon name={f.icon} className="size-5" /></span>
        </div>
        <Select label="Se obtiene por" options={opts(BADGE_CRITERIA)} value={f.type} onChange={set('type')} />
        <Input label="Mínimo requerido" type="number" min={1} required value={f.min} error={errors.criteria} onChange={set('min')} />
        {f.type === 'COMPETENCY_SCORE' && <Select label="Competencia" required placeholder="Elige una competencia" options={options} value={f.competencyId} onChange={set('competencyId')} />}
        <Input label="Puntos extra al obtenerla" type="number" min={0} value={f.points} onChange={set('points')} />
        <Switch label="Insignia activa" checked={f.isActive} onChange={(v) => setF({ ...f, isActive: v })} />
      </form>
    </Drawer>
  );
}

function Challenges() {
  const q = useQuery({ queryKey: ['gm-challenges'], queryFn: () => api.get<{ data: Challenge[] }>('/gamification/challenges', { all: 1 }) });
  const [edit, setEdit] = useState<Challenge | 'new' | null>(null);
  const del = useDeleter({ path: (id) => `/gamification/challenges/${id}`, invalidate: [['gm-challenges']], title: 'Eliminar reto', description: 'Se perderá el progreso registrado de este reto.', success: 'Reto eliminado' });
  return (
    <div>
      <div className="mb-4 flex justify-end"><Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setEdit('new')}>Nuevo reto</Button></div>
      {q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : (
        <DataTable loading={q.isLoading} rows={q.data?.data} rowKey={(r) => r.id}
          empty={<EmptyState title="Sin retos" description="Un reto fija una meta con fechas, por ejemplo cinco lecciones en una semana." action={<Button variant="primary" onClick={() => setEdit('new')}>Crear reto</Button>} />}
          columns={[
            { key: 't', header: 'Reto', cell: (r) => (<div className="max-w-sm"><p className="font-semibold">{r.title}</p><p className="line-clamp-1 text-xs text-muted">{r.description}</p></div>) },
            { key: 'm', header: 'Meta', cell: (r) => `${r.criteria.target} · ${CHALLENGE_CRITERIA[r.criteria.type] ?? r.criteria.type}` },
            { key: 'f', header: 'Vigencia', cell: (r) => `${date(r.startsAt)} – ${date(r.endsAt)}` },
            { key: 'p', header: 'Puntos', align: 'right', cell: (r) => r.points },
            { key: 's', header: 'Estado', cell: (r) => <Tag tone={r.isActive ? 'success' : 'neutral'}>{r.isActive ? 'Activo' : 'Inactivo'}</Tag> },
            { key: 'x', header: <span className="sr-only">Acciones</span>, align: 'right', cell: (r) => (<RowActions><IconButton label="Editar" size="sm" onClick={() => setEdit(r)}><Pencil className="size-4" /></IconButton><IconButton label="Eliminar" size="sm" onClick={() => del.ask(r.id)}><Trash2 className="size-4" /></IconButton></RowActions>) },
          ]} />
      )}
      {edit && <ChallengeDrawer item={edit === 'new' ? null : edit} onClose={() => setEdit(null)} />}
      {del.dialog}
    </div>
  );
}

const toLocalDay = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('sv-SE') : '');

function ChallengeDrawer({ item, onClose }: { item: Challenge | null; onClose: () => void }) {
  const [f, setF] = useState({
    title: item?.title ?? '', description: item?.description ?? '', startsAt: toLocalDay(item?.startsAt), endsAt: toLocalDay(item?.endsAt),
    points: item ? String(item.points) : '0', type: item?.criteria.type ?? 'LESSONS_COMPLETED', target: item ? String(item.criteria.target) : '5', isActive: item?.isActive ?? true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const save = useAction((b: Record<string, unknown>) => (item ? api.patch(`/gamification/challenges/${item.id}`, b) : api.post('/gamification/challenges', b)), {
    success: 'Reto guardado', invalidate: [['gm-challenges']], onSuccess: onClose,
  });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  return (
    <Drawer open onClose={onClose} title={item ? 'Editar reto' : 'Nuevo reto semanal'}
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button type="submit" form="ch-form" variant="primary" loading={save.isPending}>Guardar</Button></>}>
      <form id="ch-form" className="space-y-4" onSubmit={(e) => {
        e.preventDefault();
        save.mutate({
          title: f.title, description: f.description, startsAt: new Date(`${f.startsAt}T00:00:00`).toISOString(), endsAt: new Date(`${f.endsAt}T23:59:59`).toISOString(),
          points: Number(f.points) || 0, criteria: { type: f.type, target: Number(f.target) }, competencyId: null, isActive: f.isActive,
        }, { onError: (x) => x instanceof ApiError && setErrors(x.fieldErrors) });
      }}>
        <Input label="Título" required value={f.title} error={errors.title} onChange={set('title')} />
        <Textarea label="Descripción" rows={3} value={f.description} error={errors.description} onChange={set('description')} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Inicia" type="date" required value={f.startsAt} onChange={set('startsAt')} />
          <Input label="Termina" type="date" required value={f.endsAt} error={errors.endsAt} onChange={set('endsAt')} />
        </div>
        <Select label="Qué cuenta" options={opts(CHALLENGE_CRITERIA)} value={f.type} onChange={set('type')} />
        <Input label="Meta" type="number" min={1} required value={f.target} error={errors.criteria} onChange={set('target')} hint="Cantidad a alcanzar dentro de las fechas del reto." />
        <Input label="Puntos del reto" type="number" min={0} value={f.points} onChange={set('points')} hint="El valor real otorgado lo define la regla Reto completado." />
        <Switch label="Reto activo" checked={f.isActive} onChange={(v) => setF({ ...f, isActive: v })} />
      </form>
    </Drawer>
  );
}

interface Row { rank: number; user: { id: number; firstName: string; lastName: string; avatarUrl: string | null }; points: number; level: { number: number; name: string } | null }

function Leaderboard() {
  const { can } = useAuth();
  const [period, setPeriod] = useState('all');
  const [courseId, setCourseId] = useState('');
  const { options } = useCourseOptions(can('courses.manage', 'courses.teach'));
  const q = useQuery({ queryKey: ['gm-board', period, courseId], queryFn: () => api.get<{ data: Row[] }>('/gamification/leaderboard', { period, courseId }) });
  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="w-full sm:w-48"><Select label="Periodo" value={period} onChange={(e) => setPeriod(e.target.value)} options={[{ value: 'week', label: 'Últimos 7 días' }, { value: 'month', label: 'Último mes' }, { value: 'all', label: 'Histórico' }]} /></div>
        <div className="w-full sm:w-72"><Select label="Curso" value={courseId} onChange={(e) => setCourseId(e.target.value)} placeholder="Todos los cursos" options={options} /></div>
      </div>
      {q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : (
        <DataTable loading={q.isLoading} rows={q.data?.data} rowKey={(r) => r.user.id}
          empty={<EmptyState title="Aún no hay clasificación" description="Nadie ha acumulado puntos en este periodo." />}
          columns={[
            { key: 'r', header: '#', cell: (r) => <span className="font-bold">{r.rank}</span> },
            { key: 'u', header: 'Estudiante', cell: (r) => (<div className="flex items-center gap-3"><Avatar user={r.user} size={28} />{fullName(r.user)}</div>) },
            { key: 'l', header: 'Nivel', cell: (r) => (r.level ? `${r.level.number} · ${r.level.name}` : '—') },
            { key: 'p', header: 'Puntos', align: 'right', cell: (r) => num(r.points) },
          ]} />
      )}
    </div>
  );
}

void dateTime;
