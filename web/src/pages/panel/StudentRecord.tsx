import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip } from 'recharts';
import { toast } from 'sonner';
import { Award, Mail, Pencil, Target, Trash2, UserCheck, UserX } from 'lucide-react';
import { api, ApiError, download, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { ASSESSMENT_TYPES, ATTENDANCE, COMPETENCY_SOURCE, ENROLLMENT_STATUS, ORDER_STATUS, date, dateTime, fullName, money, num, pct } from '@/lib/format';
import { useAction } from '@/lib/hooks';
import { PageHeader, Section } from '@/components/ui/Page';
import { Button, ButtonLink, IconButton } from '@/components/ui/Button';
import { Avatar, DataTable, Facts, Ledger, ProgressRule, Tabs, Tag, statusTone, type Column } from '@/components/ui/Data';
import { Checkbox, Input, Select, Textarea } from '@/components/ui/Form';
import { ConfirmDialog, Modal } from '@/components/ui/Overlay';
import { EmptyState, ErrorState, PageLoader } from '@/components/ui/Feedback';
import { chartTooltip } from '@/features/operations/shared';
import { STUDENT_STATUS } from './Students';

interface Record_ {
  profile: {
    id: number; firstName: string; lastName: string; email: string; avatarUrl: string | null; phone: string | null; status: string; createdAt: string;
    lastLoginAt: string | null; emailVerifiedAt: string | null; documentId: string | null; birthDate: string | null; occupation: string | null; city: string | null; country: string | null; bio: string | null;
  };
  stats: { enrolled: number; completed: number; avgGrade: number | null; attendancePct: number | null; points: number; level: { number: number; name: string } | null; certificates: number };
  enrollments: { id: number; status: string; progressPct: number; finalGrade: number | null; enrolledAt: string; completedAt: string | null; course: { id: number; title: string; code: string }; group: { id: number; name: string } | null }[];
  grades: { assessment: { id: number; title: string; type: string; course: { id: number; title: string } }; bestPercentage: number | null; passed: boolean | null; attempts: number }[];
  activities: { activity: { id: number; title: string; course: { id: number; title: string } }; status: string; score: number | null; submittedAt: string | null }[];
  attendance: { event: { id: number; title: string; startAt: string; course: { id: number; title: string } | null }; status: string }[];
  attendanceSummary: { present: number; late: number; absent: number; excused: number; pct: number | null };
  competencies: { competency: { id: number; name: string }; latest: { score: number; scaleMax: number; source: string; isReviewed: boolean; recordedAt: string }; count: number }[];
  certificates: { id: number; code: string; title: string; issuedAt: string; status: string }[];
  achievements: { badge: { name: string; icon: string }; awardedAt: string }[];
  payments?: { order: { id: number; number: string; total: number; status: string; createdAt: string } }[];
  notes: { id: number; note: string; isPrivate: boolean; createdAt: string; author: { id: number; firstName: string; lastName: string }; course: { id: number; title: string } | null }[];
}

interface Competency {
  id: number; key: string; name: string; group: string | null; isActive: boolean; scale: { min: number; max: number; labels: string[] | null };
}

type TabKey = 'path' | 'grades' | 'attendance' | 'competencies' | 'certs' | 'achievements' | 'payments' | 'notes';

const sub = 'text-xs text-muted';

function EditModal({ open, onClose, rec }: { open: boolean; onClose: () => void; rec: Record_['profile'] }) {
  const init = () => ({ firstName: rec.firstName, lastName: rec.lastName, email: rec.email, phone: rec.phone ?? '', documentId: rec.documentId ?? '', birthDate: rec.birthDate?.slice(0, 10) ?? '', occupation: rec.occupation ?? '', city: rec.city ?? '', country: rec.country ?? '', bio: rec.bio ?? '' });
  const [f, setF] = useState(init);
  const [err, setErr] = useState<Record<string, string>>({});
  useEffect(() => { if (open) { setF(init()); setErr({}); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const save = useAction(() => api.patch(`/people/students/${rec.id}`, f), { success: 'Expediente actualizado', invalidate: [['people', 'students']], onSuccess: onClose, silentError: true });
  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }));
  return (
    <Modal open={open} onClose={onClose} size="lg" title="Editar estudiante"
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button variant="primary" loading={save.isPending} onClick={() => save.mutate(undefined, { onError: (e) => { if (e instanceof ApiError) setErr(e.fieldErrors); toast.error(errorMessage(e)); } })}>Guardar</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Nombre" required value={f.firstName} onChange={(e) => set('firstName', e.target.value)} error={err.firstName} />
        <Input label="Apellido" required value={f.lastName} onChange={(e) => set('lastName', e.target.value)} error={err.lastName} />
        <Input label="Correo" type="email" required value={f.email} onChange={(e) => set('email', e.target.value)} error={err.email} />
        <Input label="Teléfono" value={f.phone} onChange={(e) => set('phone', e.target.value)} error={err.phone} />
        <Input label="Documento" value={f.documentId} onChange={(e) => set('documentId', e.target.value)} error={err.documentId} />
        <Input label="Fecha de nacimiento" type="date" value={f.birthDate} onChange={(e) => set('birthDate', e.target.value)} error={err.birthDate} />
        <Input label="Ocupación" value={f.occupation} onChange={(e) => set('occupation', e.target.value)} error={err.occupation} />
        <Input label="Ciudad" value={f.city} onChange={(e) => set('city', e.target.value)} error={err.city} />
        <Input label="País" value={f.country} onChange={(e) => set('country', e.target.value)} error={err.country} />
        <Textarea wrapperClassName="sm:col-span-2" label="Biografía" rows={3} value={f.bio} onChange={(e) => set('bio', e.target.value)} error={err.bio} />
      </div>
    </Modal>
  );
}

function EvalModal({ open, onClose, rec }: { open: boolean; onClose: () => void; rec: Record_ }) {
  const [courseId, setCourseId] = useState('');
  const [scores, setScores] = useState<Record<number, string>>({});
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [err, setErr] = useState<Record<string, string>>({});
  const comps = useQuery({ queryKey: ['competencies', 'active'], queryFn: () => api.get<Competency[]>('/competencies'), enabled: open });
  useEffect(() => { if (open) { setCourseId(rec.enrollments[0] ? String(rec.enrollments[0].course.id) : ''); setScores({}); setNotes({}); setErr({}); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const ratings = (comps.data ?? []).filter((c) => scores[c.id]).map((c) => ({ competencyId: c.id, score: Number(scores[c.id]), notes: notes[c.id] || undefined }));
  const save = useAction(
    () => api.post('/competencies/evaluations', { userId: rec.profile.id, ...(courseId ? { courseId: Number(courseId) } : {}), ratings }),
    { success: 'Evaluación registrada', invalidate: [['people', 'students', 'record']], onSuccess: onClose, silentError: true },
  );
  const courses = Array.from(new Map(rec.enrollments.map((e) => [e.course.id, e.course])).values());
  return (
    <Modal open={open} onClose={onClose} size="lg" title="Registrar evaluación de competencias" description={`Estudiante: ${fullName(rec.profile)}. Califica solo las competencias que observaste.`}
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button variant="primary" disabled={!ratings.length} loading={save.isPending} onClick={() => save.mutate(undefined, { onError: (e) => { if (e instanceof ApiError) setErr(e.fieldErrors); toast.error(errorMessage(e)); } })}>Registrar {ratings.length || ''}</Button></>}>
      <Select label="Curso" value={courseId} onChange={(e) => setCourseId(e.target.value)} placeholder="Sin curso" options={courses.map((c) => ({ value: c.id, label: c.title }))} />
      {comps.isLoading ? <PageLoader /> : comps.isError ? <ErrorState error={comps.error} onRetry={() => comps.refetch()} /> : (
        <ul className="mt-5 divide-y divide-line border-y border-line">
          {(comps.data ?? []).map((c, i) => {
            const levels = Array.from({ length: c.scale.max - c.scale.min + 1 }, (_, k) => c.scale.min + k);
            const e = err[`ratings.${ratings.findIndex((r) => r.competencyId === c.id)}.score`];
            return (
              <li key={c.id} className="py-3">
                <fieldset>
                  <legend className="mb-2 text-sm font-semibold">{c.name} {c.group && <span className="font-normal text-muted">· {c.group}</span>}</legend>
                  <div className="flex flex-wrap items-center gap-1" role="radiogroup" aria-label={`Puntuación de ${c.name}`}>
                    {levels.map((l) => (
                      <button key={l} type="button" role="radio" aria-checked={scores[c.id] === String(l)} title={c.scale.labels?.[l - c.scale.min]}
                        onClick={() => setScores((s) => ({ ...s, [c.id]: s[c.id] === String(l) ? '' : String(l) }))}
                        className={`size-9 border text-sm font-bold tnum ${scores[c.id] === String(l) ? 'border-ink bg-ink text-paper' : 'border-line-strong bg-paper hover:bg-stone'}`}>{l}</button>
                    ))}
                    {scores[c.id] && c.scale.labels && <span className="ml-2 text-xs text-graphite">{c.scale.labels[Number(scores[c.id]) - c.scale.min]}</span>}
                  </div>
                  {e && <p className="mt-1 text-xs font-semibold text-danger">{e}</p>}
                  {scores[c.id] && <input aria-label={`Notas sobre ${c.name}`} placeholder="Notas (opcional)" value={notes[c.id] ?? ''} onChange={(ev) => setNotes((s) => ({ ...s, [c.id]: ev.target.value }))} className="mt-2 h-9 w-full rounded-sm border border-line-strong px-3 text-sm focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink" />}
                </fieldset>
                {i === 0 && null}
              </li>
            );
          })}
          {!comps.data?.length && <li className="py-6 text-sm text-graphite">No hay competencias activas en el catálogo.</li>}
        </ul>
      )}
    </Modal>
  );
}

function Notes({ rec }: { rec: Record_ }) {
  const [text, setText] = useState('');
  const [courseId, setCourseId] = useState('');
  const [priv, setPriv] = useState(true);
  const [del, setDel] = useState<number | null>(null);
  const add = useAction(() => api.post(`/people/students/${rec.profile.id}/notes`, { note: text.trim(), isPrivate: priv, ...(courseId ? { courseId: Number(courseId) } : {}) }), {
    success: 'Nota guardada', invalidate: [['people', 'students', 'record']], onSuccess: () => setText(''),
  });
  const remove = useAction((id: number) => api.del(`/people/notes/${id}`), { success: 'Nota eliminada', invalidate: [['people', 'students', 'record']], onSuccess: () => setDel(null) });
  const courses = Array.from(new Map(rec.enrollments.map((e) => [e.course.id, e.course])).values());
  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div>
        {rec.notes.length === 0 ? <EmptyState title="Sin notas académicas" description="Registra observaciones sobre el avance del estudiante." /> : (
          <ul className="divide-y divide-line border-y border-ink">
            {rec.notes.map((n) => (
              <li key={n.id} className="flex gap-4 py-4">
                <div className="min-w-0 flex-1">
                  <p className="whitespace-pre-line">{n.note}</p>
                  <p className={`mt-1 ${sub}`}>{fullName(n.author)} · {dateTime(n.createdAt)}{n.course && ` · ${n.course.title}`} · <Tag tone={n.isPrivate ? 'warning' : 'neutral'}>{n.isPrivate ? 'Privada' : 'Pública'}</Tag></p>
                </div>
                <IconButton size="sm" label="Eliminar nota" onClick={() => setDel(n.id)}><Trash2 className="size-4" /></IconButton>
              </li>
            ))}
          </ul>
        )}
      </div>
      <form className="space-y-3 self-start bg-stone p-5" onSubmit={(e) => { e.preventDefault(); if (text.trim()) add.mutate(); }}>
        <Textarea label="Nueva nota" rows={4} value={text} onChange={(e) => setText(e.target.value)} />
        <Select label="Curso (opcional)" value={courseId} onChange={(e) => setCourseId(e.target.value)} placeholder="General" options={courses.map((c) => ({ value: c.id, label: c.title }))} />
        <Checkbox label="Privada" hint="Las notas privadas solo las ve su autor y la administración." checked={priv} onChange={(e) => setPriv(e.target.checked)} />
        <Button type="submit" variant="ink" loading={add.isPending} disabled={!text.trim()}>Guardar nota</Button>
      </form>
      <ConfirmDialog open={del !== null} onClose={() => setDel(null)} onConfirm={() => del !== null && remove.mutate(del)} loading={remove.isPending} title="Eliminar nota" confirmLabel="Eliminar" description="Esta acción no se puede deshacer." />
    </div>
  );
}

export default function StudentRecord() {
  const { id } = useParams();
  const { can } = useAuth();
  const [sp, setSp] = useSearchParams();
  const tab = (sp.get('tab') as TabKey) || 'path';
  const [editOpen, setEditOpen] = useState(false);
  const [evalOpen, setEvalOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const q = useQuery({ queryKey: ['people', 'students', 'record', id], queryFn: () => api.get<Record_>(`/people/students/${id}`) });
  const toggle = useAction((status: string) => api.patch(`/people/students/${id}`, { status }), {
    success: 'Estado actualizado', invalidate: [['people', 'students']], onSuccess: () => setStatusOpen(false),
  });

  if (q.isLoading) return <PageLoader />;
  if (q.isError || !q.data) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const r = q.data;
  const p = r.profile;
  const suspended = p.status === 'SUSPENDED';
  const manage = can('students.manage');

  const tabs: { key: TabKey; label: string; count?: number }[] = [
    { key: 'path', label: 'Trayectoria', count: r.enrollments.length },
    { key: 'grades', label: 'Calificaciones' },
    { key: 'attendance', label: 'Asistencia' },
    { key: 'competencies', label: 'Competencias', count: r.competencies.length },
    { key: 'certs', label: 'Certificados', count: r.certificates.length },
    { key: 'achievements', label: 'Logros', count: r.achievements.length },
    ...(r.payments ? [{ key: 'payments' as TabKey, label: 'Pagos', count: r.payments.length }] : []),
    { key: 'notes', label: 'Notas académicas', count: r.notes.length },
  ];

  const enrCols: Column<Record_['enrollments'][number]>[] = [
    { key: 'course', header: 'Curso', cell: (e) => <div><p className="font-semibold">{e.course.title}</p><p className={sub}>{e.course.code}{e.group && ` · ${e.group.name}`}</p></div> },
    { key: 'status', header: 'Estado', cell: (e) => <Tag tone={statusTone(e.status)}>{ENROLLMENT_STATUS[e.status] ?? e.status}</Tag> },
    { key: 'progress', header: 'Progreso', className: 'min-w-40', cell: (e) => <ProgressRule value={e.progressPct} /> },
    { key: 'grade', header: 'Nota final', align: 'right', cell: (e) => (e.finalGrade != null ? num(e.finalGrade, 1) : '—') },
    { key: 'enrolled', header: 'Inscripción', cell: (e) => date(e.enrolledAt) },
    { key: 'completed', header: 'Completado', cell: (e) => date(e.completedAt) },
  ];

  const radar = r.competencies.map((c) => ({ name: c.competency.name, value: Math.round((c.latest.score / (c.latest.scaleMax || 5)) * 50) / 10 }));

  return (
    <div className="animate-rise">
      <PageHeader
        crumbs={[{ label: 'Estudiantes', to: '/panel/estudiantes' }, { label: fullName(p) }]}
        title={
          <span className="flex items-center gap-4">
            <Avatar user={p} size={56} />
            <span className="min-w-0 break-words">{fullName(p)}</span>
          </span>
        }
        description={
          <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <a href={`mailto:${p.email}`} className="underline">{p.email}</a>
            {p.phone && <span>{p.phone}</span>}
            <Tag tone={statusTone(p.status)}>{STUDENT_STATUS[p.status] ?? p.status}</Tag>
            <span>Registrado el {date(p.createdAt)}</span>
          </span>
        }
        actions={
          <>
            <ButtonLink to={`/campus/mensajes?to=${p.id}`} variant="outline" icon={<Mail className="size-4" />}>Enviar mensaje</ButtonLink>
            {can('courses.teach', 'students.manage') && <Button variant="outline" icon={<Target className="size-4" />} onClick={() => setEvalOpen(true)}>Evaluar competencias</Button>}
            {manage && <Button variant="outline" icon={<Pencil className="size-4" />} onClick={() => setEditOpen(true)}>Editar</Button>}
            {manage && (
              <Button variant={suspended ? 'primary' : 'outline'} icon={suspended ? <UserCheck className="size-4" /> : <UserX className="size-4" />} onClick={() => setStatusOpen(true)}>
                {suspended ? 'Activar' : 'Suspender'}
              </Button>
            )}
          </>
        }
      />
      <Ledger
        className="mb-10"
        items={[
          { label: 'Cursos inscritos', value: r.stats.enrolled, note: `${r.stats.completed} completados` },
          { label: 'Promedio final', value: r.stats.avgGrade != null ? num(r.stats.avgGrade, 1) : 'Sin datos' },
          { label: 'Asistencia', value: r.stats.attendancePct != null ? pct(r.stats.attendancePct) : 'Sin datos' },
          { label: 'Puntos', value: r.stats.points, note: r.stats.level ? `Nivel ${r.stats.level.number} · ${r.stats.level.name}` : undefined },
          { label: 'Certificados', value: r.stats.certificates },
        ]}
      />
      <Tabs className="mb-8" tabs={tabs} value={tab} onChange={(k) => setSp({ tab: k }, { replace: true })} />

      {tab === 'path' && (
        <DataTable columns={enrCols} rows={r.enrollments} rowKey={(e) => e.id} empty={<EmptyState title="Sin inscripciones" description="Este estudiante aún no está inscrito en cursos." />} />
      )}

      {tab === 'grades' && (
        <div className="space-y-10">
          <Section title="Evaluaciones">
            <DataTable
              rows={r.grades} rowKey={(g) => g.assessment.id}
              empty={<p className="border-y border-line py-8 text-center text-sm text-graphite">Sin evaluaciones registradas.</p>}
              columns={[
                { key: 'a', header: 'Evaluación', cell: (g) => <div><p className="font-semibold">{g.assessment.title}</p><p className={sub}>{g.assessment.course.title} · {ASSESSMENT_TYPES[g.assessment.type] ?? g.assessment.type}</p></div> },
                { key: 'b', header: 'Mejor resultado', align: 'right', cell: (g) => (g.bestPercentage != null ? pct(g.bestPercentage, 1) : '—') },
                { key: 'c', header: 'Intentos', align: 'right', cell: (g) => g.attempts },
                { key: 'd', header: 'Resultado', cell: (g) => (g.passed == null ? '—' : <Tag tone={g.passed ? 'success' : 'danger'}>{g.passed ? 'Aprobada' : 'No aprobada'}</Tag>) },
              ]}
            />
          </Section>
          <Section title="Prácticas y actividades">
            <DataTable
              rows={r.activities} rowKey={(a) => a.activity.id}
              empty={<p className="border-y border-line py-8 text-center text-sm text-graphite">Sin entregas de actividades.</p>}
              columns={[
                { key: 'a', header: 'Actividad', cell: (a) => <div><p className="font-semibold">{a.activity.title}</p><p className={sub}>{a.activity.course.title}</p></div> },
                { key: 'b', header: 'Estado', cell: (a) => <Tag tone={statusTone(a.status)}>{a.status}</Tag> },
                { key: 'c', header: 'Puntuación', align: 'right', cell: (a) => (a.score != null ? num(a.score, 1) : '—') },
                { key: 'd', header: 'Entregada', cell: (a) => date(a.submittedAt) },
              ]}
            />
          </Section>
        </div>
      )}

      {tab === 'attendance' && (
        <div className="space-y-8">
          <Ledger items={[
            { label: 'Presente', value: r.attendanceSummary.present }, { label: 'Tarde', value: r.attendanceSummary.late },
            { label: 'Ausente', value: r.attendanceSummary.absent }, { label: 'Justificado', value: r.attendanceSummary.excused },
            { label: 'Asistencia', value: r.attendanceSummary.pct != null ? pct(r.attendanceSummary.pct) : 'Sin datos' },
          ]} />
          <DataTable
            rows={r.attendance} rowKey={(a) => a.event.id}
            empty={<p className="border-y border-line py-8 text-center text-sm text-graphite">Aún no hay sesiones registradas.</p>}
            columns={[
              { key: 'a', header: 'Sesión', cell: (a) => <div><p className="font-semibold">{a.event.title}</p><p className={sub}>{a.event.course?.title}</p></div> },
              { key: 'b', header: 'Fecha', cell: (a) => dateTime(a.event.startAt) },
              { key: 'c', header: 'Estado', cell: (a) => <Tag tone={statusTone(a.status)}>{ATTENDANCE[a.status] ?? a.status}</Tag> },
            ]}
          />
        </div>
      )}

      {tab === 'competencies' && (
        <div className="space-y-6">
          {can('courses.teach', 'students.manage') && <Button variant="primary" icon={<Target className="size-4" />} onClick={() => setEvalOpen(true)}>Registrar evaluación de competencias</Button>}
          {r.competencies.length === 0 ? <EmptyState title="Sin competencias evaluadas" description="Aparecerán al revisar rúbricas, evaluaciones o al registrar una evaluación del facilitador." /> : (
            <div className="grid gap-10 lg:grid-cols-2">
              <div className="h-80" role="img" aria-label={`Radar de competencias: ${radar.map((d) => `${d.name} ${d.value} de 5`).join(', ')}`}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radar} outerRadius="72%">
                    <PolarGrid stroke="#d9d9d4" />
                    <PolarAngleAxis dataKey="name" tick={{ fill: '#4a4a4d', fontSize: 11 }} />
                    <PolarRadiusAxis domain={[0, 5]} tickCount={6} tick={{ fill: '#616165', fontSize: 10 }} axisLine={false} />
                    <Radar dataKey="value" name="Nivel (0-5)" stroke="#1b2236" strokeWidth={2} fill="#EE7A2F" fillOpacity={0.3} />
                    <Tooltip {...chartTooltip} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <DataTable
                rows={r.competencies} rowKey={(c) => c.competency.id}
                columns={[
                  { key: 'a', header: 'Competencia', cell: (c) => <span className="font-semibold">{c.competency.name}</span> },
                  { key: 'b', header: 'Último', align: 'right', cell: (c) => `${num(c.latest.score, 1)} / ${c.latest.scaleMax}` },
                  { key: 'c', header: 'Fuente', cell: (c) => COMPETENCY_SOURCE[c.latest.source] ?? c.latest.source },
                  { key: 'd', header: 'Registros', align: 'right', cell: (c) => c.count },
                ]}
              />
            </div>
          )}
        </div>
      )}

      {tab === 'certs' && (
        <DataTable
          rows={r.certificates} rowKey={(c) => c.id}
          empty={<EmptyState title="Sin certificados" description="Se emiten al completar cursos con certificación." />}
          columns={[
            { key: 'a', header: 'Certificado', cell: (c) => <div><p className="font-semibold">{c.title}</p><p className={`${sub} tnum`}>{c.code}</p></div> },
            { key: 'b', header: 'Emitido', cell: (c) => date(c.issuedAt) },
            { key: 'c', header: 'Estado', cell: (c) => <Tag tone={c.status === 'VALID' ? 'success' : 'danger'}>{c.status === 'VALID' ? 'Vigente' : 'Revocado'}</Tag> },
            { key: 'd', header: <span className="sr-only">PDF</span>, align: 'right', cell: (c) => <Button size="sm" variant="outline" onClick={() => download(`/certificates/${c.id}/pdf`, `certificado-${c.code}.pdf`).catch((e) => toast.error(errorMessage(e)))}>Descargar PDF</Button> },
          ]}
        />
      )}

      {tab === 'achievements' && (
        r.achievements.length === 0 ? <EmptyState title="Sin logros todavía" icon={<Award className="size-6" />} /> : (
          <ul className="divide-y divide-line border-y border-ink">
            {r.achievements.map((a, i) => (
              <li key={i} className="flex items-center justify-between gap-4 py-3"><span className="flex items-center gap-3 font-semibold"><Award className="size-4" aria-hidden />{a.badge.name}</span><span className={sub}>{date(a.awardedAt)}</span></li>
            ))}
          </ul>
        )
      )}

      {tab === 'payments' && r.payments && (
        <DataTable
          rows={r.payments} rowKey={(x) => x.order.id}
          empty={<EmptyState title="Sin pagos registrados" />}
          columns={[
            { key: 'a', header: 'Pedido', cell: (x) => <span className="font-semibold tnum">{x.order.number}</span> },
            { key: 'b', header: 'Fecha', cell: (x) => date(x.order.createdAt) },
            { key: 'c', header: 'Total', align: 'right', cell: (x) => money(x.order.total) },
            { key: 'd', header: 'Estado', cell: (x) => <Tag tone={statusTone(x.order.status)}>{ORDER_STATUS[x.order.status] ?? x.order.status}</Tag> },
          ]}
        />
      )}

      {tab === 'notes' && <Notes rec={r} />}

      <Section title="Perfil" className="mt-14">
        <Facts items={[
          { label: 'Documento', value: p.documentId ?? '—' }, { label: 'Nacimiento', value: date(p.birthDate) }, { label: 'Ocupación', value: p.occupation ?? '—' },
          { label: 'Ubicación', value: [p.city, p.country].filter(Boolean).join(', ') || '—' }, { label: 'Último acceso', value: dateTime(p.lastLoginAt) },
          { label: 'Correo verificado', value: p.emailVerifiedAt ? date(p.emailVerifiedAt) : 'No' },
        ]} />
        {p.bio && <p className="mt-4 max-w-2xl text-sm text-graphite">{p.bio}</p>}
        <p className="mt-4 text-sm"><Link to="/panel/estudiantes" className="underline">Volver a estudiantes</Link></p>
      </Section>

      {manage && <EditModal open={editOpen} onClose={() => setEditOpen(false)} rec={p} />}
      <EvalModal open={evalOpen} onClose={() => setEvalOpen(false)} rec={r} />
      <ConfirmDialog
        open={statusOpen} onClose={() => setStatusOpen(false)} loading={toggle.isPending}
        tone={suspended ? 'ink' : 'danger'}
        title={suspended ? 'Activar estudiante' : 'Suspender estudiante'}
        confirmLabel={suspended ? 'Activar' : 'Suspender'}
        description={suspended ? 'Podrá volver a iniciar sesión.' : 'Se cerrarán sus sesiones y no podrá ingresar hasta que lo actives.'}
        onConfirm={() => toggle.mutate(suspended ? 'ACTIVE' : 'SUSPENDED')}
      />
    </div>
  );
}
