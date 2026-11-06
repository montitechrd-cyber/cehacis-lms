import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Save, Star, Trash2 } from 'lucide-react';
import { api, ApiError, errorMessage, type Paged } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { COURSE_STATUS, EVENT_TYPES, date, dateTime, fullName, num } from '@/lib/format';
import { useAction } from '@/lib/hooks';
import { PageHeader, Section } from '@/components/ui/Page';
import { Button, IconButton } from '@/components/ui/Button';
import { Avatar, DataTable, Ledger, Pagination, SearchInput, Tabs, Tag, statusTone } from '@/components/ui/Data';
import { Checkbox, Input, Switch, Textarea } from '@/components/ui/Form';
import { EmptyState, ErrorState, PageLoader } from '@/components/ui/Feedback';
import { ChipsInput, WEEKDAYS, useCourses } from '@/features/operations/shared';

interface Detail {
  profile: {
    id: number; firstName: string; lastName: string; email: string; avatarUrl: string | null; phone: string | null; status: string; createdAt: string; lastLoginAt: string | null;
    headline: string | null; bio: string | null; specialties: string[]; yearsExperience: number | null; linkedinUrl: string | null; isPublic: boolean;
  };
  courses: { id: number; title: string; code: string; status: string; enrollments: number }[];
  groups: { id: number; name: string; startDate: string | null; endDate: string | null; capacity: number | null; course: { id: number; title: string }; enrollments: number }[];
  students: number;
  evaluations: { avg: number | null; count: number; recent: { rating: number; comment: string | null; createdAt: string; course: { id: number; title: string } }[] };
  upcomingEvents: { id: number; title: string; type: string; startAt: string; endAt: string; course: { id: number; title: string } | null }[];
  availability: { id: number; weekday: number; startTime: string; endTime: string }[];
}

type TabKey = 'profile' | 'courses' | 'students' | 'evals' | 'agenda';

function ProfileForm({ d }: { d: Detail }) {
  const { can } = useAuth();
  const p = d.profile;
  const init = () => ({ firstName: p.firstName, lastName: p.lastName, email: p.email, phone: p.phone ?? '', headline: p.headline ?? '', bio: p.bio ?? '', yearsExperience: p.yearsExperience != null ? String(p.yearsExperience) : '', linkedinUrl: p.linkedinUrl ?? '', isPublic: p.isPublic });
  const [f, setF] = useState(init);
  const [spec, setSpec] = useState(p.specialties);
  const [err, setErr] = useState<Record<string, string>>({});
  useEffect(() => { setF(init()); setSpec(p.specialties); }, [d]); // eslint-disable-line react-hooks/exhaustive-deps
  const admin = can('instructors.manage');
  const save = useAction(
    () => api.patch(`/people/instructors/${p.id}`, {
      firstName: f.firstName, lastName: f.lastName, phone: f.phone, headline: f.headline, bio: f.bio, specialties: spec, linkedinUrl: f.linkedinUrl, isPublic: f.isPublic,
      yearsExperience: f.yearsExperience === '' ? null : Number(f.yearsExperience),
      ...(admin ? { email: f.email } : {}),
    }),
    { success: 'Perfil guardado', invalidate: [['people', 'instructors']], silentError: true },
  );
  const set = (k: keyof typeof f, v: string | boolean) => setF((s) => ({ ...s, [k]: v }));
  return (
    <form className="grid max-w-3xl gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); setErr({}); save.mutate(undefined, { onError: (x) => { if (x instanceof ApiError) setErr(x.fieldErrors); toast.error(errorMessage(x)); } }); }}>
      <Input label="Nombre" required value={f.firstName} onChange={(e) => set('firstName', e.target.value)} error={err.firstName} />
      <Input label="Apellido" required value={f.lastName} onChange={(e) => set('lastName', e.target.value)} error={err.lastName} />
      <Input label="Correo" type="email" disabled={!admin} value={f.email} onChange={(e) => set('email', e.target.value)} error={err.email} />
      <Input label="Teléfono" value={f.phone} onChange={(e) => set('phone', e.target.value)} error={err.phone} />
      <Input wrapperClassName="sm:col-span-2" label="Titular profesional" value={f.headline} onChange={(e) => set('headline', e.target.value)} error={err.headline} />
      <Textarea wrapperClassName="sm:col-span-2" label="Biografía" rows={4} value={f.bio} onChange={(e) => set('bio', e.target.value)} error={err.bio} />
      <div className="sm:col-span-2"><ChipsInput label="Especialidades" value={spec} onChange={setSpec} /></div>
      <Input label="Años de experiencia" type="number" min={0} value={f.yearsExperience} onChange={(e) => set('yearsExperience', e.target.value)} error={err.yearsExperience} />
      <Input label="LinkedIn" type="url" value={f.linkedinUrl} onChange={(e) => set('linkedinUrl', e.target.value)} error={err.linkedinUrl} />
      <div className="sm:col-span-2"><Switch checked={f.isPublic} onChange={(v) => set('isPublic', v)} label="Perfil público" hint="Visible en la página pública de facilitadores." /></div>
      <div className="sm:col-span-2"><Button type="submit" variant="primary" icon={<Save className="size-4" />} loading={save.isPending}>Guardar perfil</Button></div>
    </form>
  );
}

function CoursesAssign({ d }: { d: Detail }) {
  const { can } = useAuth();
  const all = useCourses();
  const [sel, setSel] = useState<number[]>(d.courses.map((c) => c.id));
  const [q, setQ] = useState('');
  useEffect(() => setSel(d.courses.map((c) => c.id)), [d]);
  const save = useAction(() => api.put(`/people/instructors/${d.profile.id}/courses`, { courseIds: sel }), { success: 'Cursos asignados', invalidate: [['people', 'instructors']] });
  const admin = can('instructors.manage');
  const list = (all.data ?? []).filter((c) => c.title.toLowerCase().includes(q.toLowerCase()) || c.code?.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <Section title="Cursos asignados">
        <DataTable
          rows={d.courses} rowKey={(c) => c.id}
          empty={<p className="border-y border-line py-8 text-center text-sm text-graphite">Sin cursos asignados.</p>}
          columns={[
            { key: 'a', header: 'Curso', cell: (c) => <Link className="font-semibold underline-offset-4 hover:underline" to={`/panel/cursos/${c.id}`}>{c.title}</Link> },
            { key: 'b', header: 'Estado', cell: (c) => <Tag tone={statusTone(c.status)}>{COURSE_STATUS[c.status] ?? c.status}</Tag> },
            { key: 'c', header: 'Inscritos', align: 'right', cell: (c) => c.enrollments },
          ]}
        />
      </Section>
      {admin && (
        <Section title="Cambiar asignación" description="Marca los cursos que impartirá y guarda.">
          <SearchInput value={q} onChange={setQ} placeholder="Filtrar cursos" className="mb-3" />
          {all.isLoading ? <PageLoader /> : all.isError ? <ErrorState error={all.error} onRetry={() => all.refetch()} /> : (
            <ul className="max-h-96 divide-y divide-line overflow-y-auto border-y border-line">
              {list.map((c) => (
                <li key={c.id} className="py-2.5">
                  <Checkbox label={c.title} hint={c.code} checked={sel.includes(c.id)} onChange={(e) => setSel((s) => (e.target.checked ? [...s, c.id] : s.filter((x) => x !== c.id)))} />
                </li>
              ))}
              {!list.length && <li className="py-6 text-sm text-graphite">No hay cursos que coincidan.</li>}
            </ul>
          )}
          <Button className="mt-4" variant="primary" loading={save.isPending} onClick={() => save.mutate()}>Guardar asignación ({sel.length})</Button>
        </Section>
      )}
    </div>
  );
}

function StudentsList({ id }: { id: number }) {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const r = useQuery({
    queryKey: ['people', 'instructors', id, 'students', q, page],
    queryFn: () => api.get<Paged<{ id: number; status: string; progressPct: number; enrolledAt: string; user: { id: number; firstName: string; lastName: string; email: string; avatarUrl: string | null }; course: { id: number; title: string }; group: { id: number; name: string } | null }>>(`/people/instructors/${id}/students`, { q, page, pageSize: 15 }),
    placeholderData: (p) => p,
  });
  return (
    <div>
      <SearchInput className="mb-4 w-full sm:w-72" value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Buscar estudiante" />
      {r.isError ? <ErrorState error={r.error} onRetry={() => r.refetch()} /> : (
        <>
          <DataTable
            rows={r.data?.data} rowKey={(x) => x.id} loading={r.isLoading}
            empty={<EmptyState title="Sin estudiantes" description="Aparecerán al inscribirse en sus cursos." />}
            columns={[
              { key: 'a', header: 'Estudiante', cell: (x) => <Link to={`/panel/estudiantes/${x.user.id}`} className="flex items-center gap-3"><Avatar user={x.user} size={30} /><span><span className="block font-semibold">{fullName(x.user)}</span><span className="text-xs text-muted">{x.user.email}</span></span></Link> },
              { key: 'b', header: 'Curso', cell: (x) => <span>{x.course.title}{x.group && <span className="text-muted"> · {x.group.name}</span>}</span> },
              { key: 'c', header: 'Progreso', align: 'right', cell: (x) => `${Math.round(x.progressPct)} %` },
              { key: 'd', header: 'Inscripción', cell: (x) => date(x.enrolledAt) },
            ]}
          />
          <Pagination page={r.data?.meta.page ?? 1} pages={r.data?.meta.pages ?? 1} total={r.data?.meta.total} onPage={setPage} />
        </>
      )}
    </div>
  );
}

type Slots = Record<number, { startTime: string; endTime: string }[]>;

function Availability({ d }: { d: Detail }) {
  const toSlots = (): Slots => {
    const s: Slots = {};
    d.availability.forEach((a) => (s[a.weekday] = [...(s[a.weekday] ?? []), { startTime: a.startTime, endTime: a.endTime }]));
    return s;
  };
  const [slots, setSlots] = useState<Slots>(toSlots);
  useEffect(() => setSlots(toSlots()), [d]); // eslint-disable-line react-hooks/exhaustive-deps
  const bad = Object.values(slots).flat().some((s) => !s.startTime || !s.endTime || s.endTime <= s.startTime);
  const save = useAction(
    () => api.put('/calendar/availability', { instructorId: d.profile.id, slots: Object.entries(slots).flatMap(([wd, list]) => list.map((s) => ({ weekday: Number(wd), ...s }))) }),
    { success: 'Disponibilidad guardada', invalidate: [['people', 'instructors']] },
  );
  const upd = (wd: number, i: number, k: 'startTime' | 'endTime', v: string) => setSlots((s) => ({ ...s, [wd]: s[wd]!.map((x, j) => (j === i ? { ...x, [k]: v } : x)) }));
  return (
    <div>
      <ul className="divide-y divide-line border-y border-ink">
        {[1, 2, 3, 4, 5, 6, 0].map((wd) => (
          <li key={wd} className="grid gap-2 py-3 sm:grid-cols-[9rem_minmax(0,1fr)] sm:items-start">
            <p className="pt-2 text-sm font-semibold">{WEEKDAYS[wd]}</p>
            <div className="space-y-2">
              {(slots[wd] ?? []).map((s, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2">
                  <input type="time" aria-label={`${WEEKDAYS[wd]} franja ${i + 1} inicio`} value={s.startTime} onChange={(e) => upd(wd, i, 'startTime', e.target.value)} className="h-9 rounded-sm border border-line-strong px-2 text-sm" />
                  <span aria-hidden>–</span>
                  <input type="time" aria-label={`${WEEKDAYS[wd]} franja ${i + 1} fin`} value={s.endTime} onChange={(e) => upd(wd, i, 'endTime', e.target.value)} className="h-9 rounded-sm border border-line-strong px-2 text-sm" />
                  <IconButton size="sm" label={`Quitar franja de ${WEEKDAYS[wd]}`} onClick={() => setSlots((x) => ({ ...x, [wd]: x[wd]!.filter((_, j) => j !== i) }))}><Trash2 className="size-4" /></IconButton>
                </div>
              ))}
              <button type="button" className="inline-flex items-center gap-1 text-sm font-semibold underline underline-offset-4" onClick={() => setSlots((x) => ({ ...x, [wd]: [...(x[wd] ?? []), { startTime: '09:00', endTime: '12:00' }] }))}>
                <Plus className="size-3.5" aria-hidden /> {slots[wd]?.length ? 'Agregar franja' : 'Agregar franja disponible'}
              </button>
            </div>
          </li>
        ))}
      </ul>
      {bad && <p className="mt-3 text-sm font-semibold text-danger">Revisa las franjas: la hora de fin debe ser posterior al inicio.</p>}
      <Button className="mt-4" variant="primary" icon={<Save className="size-4" />} disabled={bad} loading={save.isPending} onClick={() => save.mutate()}>Guardar disponibilidad</Button>
    </div>
  );
}

export default function InstructorDetail() {
  const { id } = useParams();
  const [sp, setSp] = useSearchParams();
  const tab = (sp.get('tab') as TabKey) || 'profile';
  const q = useQuery({ queryKey: ['people', 'instructors', 'detail', id], queryFn: () => api.get<Detail>(`/people/instructors/${id}`) });
  if (q.isLoading) return <PageLoader />;
  if (q.isError || !q.data) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const d = q.data;
  const p = d.profile;
  return (
    <div className="animate-rise">
      <PageHeader
        crumbs={[{ label: 'Facilitadores', to: '/panel/facilitadores' }, { label: fullName(p) }]}
        title={<span className="flex items-center gap-4"><Avatar user={p} size={56} /><span className="break-words">{fullName(p)}</span></span>}
        description={<span className="flex flex-wrap items-center gap-x-4 gap-y-1">{p.headline && <span>{p.headline}</span>}<a className="underline" href={`mailto:${p.email}`}>{p.email}</a><Tag tone={statusTone(p.status)}>{p.status === 'ACTIVE' ? 'Activo' : 'Suspendido'}</Tag></span>}
      />
      <Ledger className="mb-10" items={[
        { label: 'Cursos', value: d.courses.length }, { label: 'Grupos', value: d.groups.length }, { label: 'Estudiantes', value: d.students },
        { label: 'Valoración', value: d.evaluations.avg != null ? num(d.evaluations.avg, 1) : 'Sin datos', note: `${d.evaluations.count} evaluaciones` },
      ]} />
      <Tabs className="mb-8" value={tab} onChange={(k) => setSp({ tab: k }, { replace: true })} tabs={[
        { key: 'profile', label: 'Perfil' }, { key: 'courses', label: 'Cursos y grupos', count: d.courses.length }, { key: 'students', label: 'Estudiantes', count: d.students },
        { key: 'evals', label: 'Evaluaciones', count: d.evaluations.count }, { key: 'agenda', label: 'Agenda y disponibilidad' },
      ]} />
      {tab === 'profile' && <ProfileForm d={d} />}
      {tab === 'courses' && (
        <div className="space-y-10">
          <CoursesAssign d={d} />
          <Section title="Grupos">
            <DataTable
              rows={d.groups} rowKey={(g) => g.id}
              empty={<p className="border-y border-line py-8 text-center text-sm text-graphite">Sin grupos a cargo.</p>}
              columns={[
                { key: 'a', header: 'Grupo', cell: (g) => <span className="font-semibold">{g.name}</span> },
                { key: 'b', header: 'Curso', cell: (g) => g.course.title },
                { key: 'c', header: 'Periodo', cell: (g) => `${date(g.startDate)} – ${date(g.endDate)}` },
                { key: 'd', header: 'Inscritos', align: 'right', cell: (g) => `${g.enrollments}${g.capacity ? ` / ${g.capacity}` : ''}` },
              ]}
            />
          </Section>
        </div>
      )}
      {tab === 'students' && <StudentsList id={p.id} />}
      {tab === 'evals' && (
        d.evaluations.count === 0 ? <EmptyState title="Sin evaluaciones de desempeño" description="Los estudiantes inscritos pueden valorar al facilitador." /> : (
          <div>
            <p className="mb-4 flex items-center gap-2 text-lg font-bold"><Star className="size-5" aria-hidden />{d.evaluations.avg != null ? num(d.evaluations.avg, 1) : 'Sin datos'} <span className="text-sm font-normal text-graphite">de 5 · {d.evaluations.count} evaluaciones</span></p>
            <ul className="divide-y divide-line border-y border-ink">
              {d.evaluations.recent.map((e, i) => (
                <li key={i} className="py-4">
                  <p className="text-sm font-semibold tnum">{e.rating} / 5 <span className="font-normal text-muted">· {e.course.title} · {date(e.createdAt)}</span></p>
                  {e.comment ? <p className="mt-1 text-graphite">{e.comment}</p> : <p className="mt-1 text-sm text-muted">Sin comentario</p>}
                </li>
              ))}
            </ul>
          </div>
        )
      )}
      {tab === 'agenda' && (
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)]">
          <Section title="Disponibilidad semanal" description="Franjas en las que puede recibir sesiones. Se usa para advertir al programar eventos."><Availability d={d} /></Section>
          <Section title="Próximos eventos" actions={<Link className="text-sm font-semibold underline" to="/panel/calendario">Ir al calendario</Link>}>
            {d.upcomingEvents.length === 0 ? <p className="border-y border-line py-8 text-center text-sm text-graphite">Sin eventos próximos.</p> : (
              <ul className="divide-y divide-line border-y border-ink">
                {d.upcomingEvents.map((e) => (
                  <li key={e.id} className="py-3"><p className="font-semibold">{e.title}</p><p className="text-xs text-muted">{EVENT_TYPES[e.type] ?? e.type} · {dateTime(e.startAt)}{e.course && ` · ${e.course.title}`}</p></li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      )}
    </div>
  );
}
