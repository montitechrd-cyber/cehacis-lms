import { useState } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { toast } from 'sonner';
import { FileDown } from 'lucide-react';
import { api, download, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { EVENT_TYPES, dateTime, fullName, money, num, pct } from '@/lib/format';
import { PageHeader, Section } from '@/components/ui/Page';
import { Button } from '@/components/ui/Button';
import { DataTable, Ledger, ProgressRule, Tag, statusTone } from '@/components/ui/Data';
import { Input } from '@/components/ui/Form';
import { EmptyState, ErrorState, PageLoader } from '@/components/ui/Feedback';
import { Segmented, chartTooltip, shortDay, ymd } from '@/features/operations/shared';

interface Dash {
  range: { from: string; to: string };
  kpis: {
    totalStudents: number; activeStudents: number; totalCourses: number; publishedCourses: number; inDevelopmentCourses: number; enrollments: number; completions: number;
    completionRate: number | null; approvalRate: number | null; attendanceRate: number | null;
    revenue: number | null; revenueReal: number | null; revenueTest: number | null; pendingPayments: number | null;
    satisfaction: { courseAvg: number | null; instructorAvg: number | null; count: number } | null;
  };
  series: { enrollments: { date: string; count: number }[]; revenue: { date: string; amount: number }[]; completions: { date: string; count: number }[] };
  topCourses: { course: { id: number; title: string; code: string }; enrollments: number; completions: number; revenue: number | null }[];
  instructorPerformance: { instructor: { id: number; firstName: string; lastName: string }; courses: number; students: number; avgRating: number | null; completionRate: number | null; pendingGrading: number }[];
  competencyAverages: { competency: { id: number; name: string }; avg: number | null; count: number }[];
}

interface InstructorDash {
  courses: { id: number; title: string; code: string; status: string; enrolled: number; avgProgress: number | null; pendingGrading: number; attendanceRate: number | null; rating: number | null }[];
  pendingGrading: { attempts: number; submissions: number; total: number };
  upcomingSessions: { id: number; title: string; type: string; startAt: string; endAt: string; location: string | null; meetingUrl: string | null; course: { id: number; title: string } | null }[];
  attendanceRate: number | null;
  rating: { avg: number | null; count: number };
}

type Preset = '7' | '30' | '90' | '365' | 'custom';
const NO = 'Sin datos';
const INK = '#1b2236';
const AXIS = { fontSize: 11, fill: 'var(--color-graphite)' };
const LEGEND = { wrapperStyle: { fontSize: 12, color: 'var(--color-graphite)', paddingTop: 8 }, iconType: 'square' as const, iconSize: 10 };

/** Tabla con scroll horizontal propio (DataTable) y pista de desplazamiento visible en móvil. */
function ScrollTable({ children }: { children: React.ReactNode }) {
  return (
    <div>
      {children}
      <p className="mt-2 text-xs text-muted sm:hidden">Desliza para ver más columnas →</p>
    </div>
  );
}

function rangeFor(p: Preset, from: string, to: string) {
  if (p === 'custom') return { from, to };
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - Number(p));
  return { from: ymd(start), to: ymd(end) };
}

function ChartBox({ label, children, height = 260 }: { label: string; children: React.ReactNode; height?: number }) {
  return (
    <div style={{ height }} role="img" aria-label={label}>
      <ResponsiveContainer width="100%" height="100%">{children as React.ReactElement}</ResponsiveContainer>
    </div>
  );
}

function AdminDashboard() {
  const { can } = useAuth();
  const [preset, setPreset] = useState<Preset>('30');
  const [custom, setCustom] = useState({ from: ymd(new Date(Date.now() - 30 * 86400000)), to: ymd(new Date()) });
  const [exporting, setExporting] = useState(false);
  const r = rangeFor(preset, custom.from, custom.to);
  const valid = !!r.from && !!r.to && r.from <= r.to;
  const q = useQuery({ queryKey: ['reports', 'dashboard', r], queryFn: () => api.get<Dash>('/reports/dashboard', r), enabled: valid, placeholderData: (p) => p });

  const exportPdf = async () => {
    setExporting(true);
    try {
      await download(`/reports/export/dashboard?format=pdf&from=${r.from}&to=${r.to}`, 'reporte-dashboard.pdf');
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setExporting(false);
    }
  };

  const d = q.data;
  const k = d?.kpis;
  const merged = d ? d.series.enrollments.map((e, i) => ({ date: e.date, inscripciones: e.count, completados: d.series.completions[i]?.count ?? 0 })) : [];
  const showRevenue = !!k && k.revenue != null;
  const nz = (v: number | null | undefined, f: (n: number) => string) => (v == null ? NO : f(v));

  return (
    <div className="animate-rise">
      <PageHeader
        title="Dashboard"
        description="Resumen académico y operativo de la institución."
        actions={<Button variant="outline" icon={<FileDown className="size-4" />} loading={exporting} disabled={!valid} onClick={exportPdf}>Exportar PDF</Button>}
      />
      <div className="mb-8 flex flex-wrap items-end gap-4">
        <Segmented<Preset> label="Rango de fechas" value={preset} onChange={setPreset} options={[{ key: '7', label: '7 días' }, { key: '30', label: '30 días' }, { key: '90', label: '90 días' }, { key: '365', label: 'Año' }, { key: 'custom', label: 'Personalizado' }]} />
        {preset === 'custom' && (
          <>
            <Input label="Desde" type="date" value={custom.from} max={custom.to} onChange={(e) => setCustom({ ...custom, from: e.target.value })} />
            <Input label="Hasta" type="date" value={custom.to} min={custom.from} onChange={(e) => setCustom({ ...custom, to: e.target.value })} />
          </>
        )}
      </div>

      {!valid ? (
        <EmptyState title="Rango no válido" description="La fecha inicial debe ser anterior o igual a la final." />
      ) : q.isLoading ? (
        <PageLoader />
      ) : q.isError || !d || !k ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : (
        <>
          <Ledger
            items={[
              { label: 'Estudiantes', value: num(k.totalStudents), note: `${num(k.activeStudents)} activos en el periodo` },
              { label: 'Cursos', value: num(k.totalCourses), note: `${k.publishedCourses} publicados · ${k.inDevelopmentCourses} en desarrollo` },
              { label: 'Inscripciones', value: num(k.enrollments) },
              { label: 'Completados', value: num(k.completions) },
              { label: 'Tasa de finalización (histórica)', value: nz(k.completionRate, (n) => pct(n, 1)), note: 'Completadas sobre todas las inscripciones no canceladas, sin límite de periodo' },
              { label: 'Tasa de aprobación', value: nz(k.approvalRate, (n) => pct(n, 1)) },
              { label: 'Asistencia', value: nz(k.attendanceRate, (n) => pct(n, 1)) },
              ...(k.revenue != null ? [{ label: 'Ingresos', value: money(k.revenue), note: k.revenueReal != null && k.revenueTest != null ? `Real ${money(k.revenueReal)} · Prueba ${money(k.revenueTest)}` : undefined }] : []),
              ...(k.pendingPayments != null ? [{ label: 'Pagos pendientes', value: num(k.pendingPayments) }] : []),
              { label: 'Satisfacción', value: k.satisfaction && k.satisfaction.courseAvg != null ? `${num(k.satisfaction.courseAvg, 1)} / 5` : NO, note: k.satisfaction ? `Facilitadores ${k.satisfaction.instructorAvg != null ? num(k.satisfaction.instructorAvg, 1) : NO} · ${k.satisfaction.count} valoraciones` : undefined },
            ]}
          />

          <div className="mt-12 grid gap-12 xl:grid-cols-2">
            <Section title="Inscripciones y completados" className="mb-0">
              <ChartBox label={`Inscripciones y completados por día. Total inscripciones ${k.enrollments}, completados ${k.completions}.`}>
                <BarChart data={merged} margin={{ top: 8, right: 8, left: -16, bottom: 0 }} barGap={2} barCategoryGap="20%">
                  <CartesianGrid vertical={false} stroke="var(--color-stone-2)" />
                  <XAxis dataKey="date" tickFormatter={shortDay} tick={AXIS} axisLine={{ stroke: '#4a4a4d' }} tickLine={false} minTickGap={24} />
                  <YAxis allowDecimals={false} tick={AXIS} axisLine={false} tickLine={false} />
                  <Tooltip {...chartTooltip} cursor={{ fill: 'var(--color-stone)' }} labelFormatter={(l) => shortDay(String(l))} />
                  <Legend {...LEGEND} />
                  <Bar dataKey="inscripciones" name="Inscripciones" fill="#EE7A2F" barSize={6} radius={0} />
                  <Bar dataKey="completados" name="Completados" fill={INK} barSize={6} radius={0} />
                </BarChart>
              </ChartBox>
            </Section>

            {showRevenue && (
              <Section title="Ingresos" className="mb-0">
                <ChartBox label={`Ingresos por periodo. Total ${money(k.revenue)}.`}>
                  <BarChart data={d.series.revenue} margin={{ top: 8, right: 8, left: -8, bottom: 0 }} barCategoryGap="20%">
                    <CartesianGrid vertical={false} stroke="var(--color-stone-2)" />
                    <XAxis dataKey="date" tickFormatter={shortDay} tick={AXIS} axisLine={{ stroke: '#4a4a4d' }} tickLine={false} minTickGap={24} />
                    <YAxis tick={AXIS} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                    <Tooltip {...chartTooltip} cursor={{ fill: 'var(--color-stone)' }} labelFormatter={(l) => shortDay(String(l))} formatter={(v) => money(Number(v))} />
                    <Legend {...LEGEND} />
                    <Bar dataKey="amount" name="Ingresos" fill="#EE7A2F" barSize={8} radius={0} />
                  </BarChart>
                </ChartBox>
              </Section>
            )}

            <Section title="Cursos más demandados" className="mb-0">
              {d.topCourses.length === 0 ? <p className="py-8 text-sm text-graphite">Sin inscripciones en el periodo.</p> : (
                <ChartBox height={Math.max(180, d.topCourses.length * 40)} label={`Cursos más demandados: ${d.topCourses.map((c) => `${c.course.title} ${c.enrollments}`).join(', ')}`}>
                  <BarChart data={d.topCourses.map((c) => ({ name: c.course.title, inscripciones: c.enrollments, completados: c.completions }))} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                    <XAxis type="number" allowDecimals={false} tick={AXIS} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" width={130} tick={AXIS} axisLine={{ stroke: '#4a4a4d' }} tickLine={false} tickFormatter={(v: string) => (v.length > 20 ? v.slice(0, 19) + '…' : v)} />
                    <Tooltip {...chartTooltip} cursor={{ fill: '#f2f2f0' }} />
                    <Bar dataKey="inscripciones" name="Inscripciones" fill="#EE7A2F" barSize={14} />
                    <Bar dataKey="completados" name="Completados" fill={INK} barSize={14} />
                  </BarChart>
                </ChartBox>
              )}
            </Section>

            <Section title="Promedio por competencia" className="mb-0" description="Escala 0 a 5, registros revisados del periodo.">
              {d.competencyAverages.length === 0 ? <p className="py-8 text-sm text-graphite">{NO}: aún no hay competencias revisadas en el periodo.</p> : (
                <ChartBox height={Math.max(180, d.competencyAverages.length * 34)} label={`Promedio por competencia: ${d.competencyAverages.map((c) => `${c.competency.name} ${c.avg ?? NO}`).join(', ')}`}>
                  <BarChart data={d.competencyAverages.map((c) => ({ name: c.competency.name, promedio: c.avg ?? 0 }))} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                    <XAxis type="number" domain={[0, 5]} tick={AXIS} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" width={130} tick={AXIS} axisLine={{ stroke: '#4a4a4d' }} tickLine={false} />
                    <Tooltip {...chartTooltip} cursor={{ fill: '#f2f2f0' }} />
                    <Bar dataKey="promedio" name="Promedio" fill={INK} barSize={12} />
                  </BarChart>
                </ChartBox>
              )}
            </Section>
          </div>

          <Section title="Desempeño de facilitadores" className="mt-12">
            <ScrollTable><DataTable
              rows={d.instructorPerformance} rowKey={(i) => i.instructor.id}
              empty={<p className="border-y border-line py-8 text-center text-sm text-graphite">Sin facilitadores con cursos asignados.</p>}
              columns={[
                { key: 'a', header: 'Facilitador', cell: (i) => (can('instructors.manage') ? <Link to={`/panel/facilitadores/${i.instructor.id}`} className="font-semibold underline-offset-4 hover:underline">{fullName(i.instructor)}</Link> : <span className="font-semibold">{fullName(i.instructor)}</span>) },
                { key: 'b', header: 'Cursos', align: 'right', cell: (i) => i.courses },
                { key: 'c', header: 'Estudiantes', align: 'right', cell: (i) => i.students },
                { key: 'd', header: 'Valoración', align: 'right', cell: (i) => (i.avgRating != null ? num(i.avgRating, 1) : NO) },
                { key: 'e', header: 'Finalización', align: 'right', cell: (i) => (i.completionRate != null ? pct(i.completionRate, 1) : NO) },
                { key: 'f', header: 'Por calificar', align: 'right', cell: (i) => i.pendingGrading },
              ]}
            /></ScrollTable>
          </Section>
          {showRevenue && d.topCourses.some((c) => c.revenue != null) && (
            <Section title="Ingresos por curso">
              <ScrollTable><DataTable
                rows={d.topCourses} rowKey={(c) => c.course.id}
                columns={[
                  { key: 'a', header: 'Curso', cell: (c) => <span className="font-semibold">{c.course.title}</span> },
                  { key: 'b', header: 'Inscripciones', align: 'right', cell: (c) => c.enrollments },
                  { key: 'c', header: 'Ingresos', align: 'right', cell: (c) => (c.revenue != null ? money(c.revenue) : NO) },
                ]}
              /></ScrollTable>
            </Section>
          )}
        </>
      )}
    </div>
  );
}

function InstructorDashboard() {
  const q = useQuery({ queryKey: ['reports', 'instructor'], queryFn: () => api.get<InstructorDash>('/reports/instructor') });
  if (q.isLoading) return <PageLoader />;
  if (q.isError || !q.data) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const d = q.data;
  return (
    <div className="animate-rise">
      <PageHeader title="Mi docencia" description="Tus cursos, pendientes de calificar y próximas sesiones." />
      <Ledger
        items={[
          { label: 'Cursos a cargo', value: d.courses.length },
          { label: 'Por calificar', value: d.pendingGrading.total, note: `${d.pendingGrading.attempts} intentos · ${d.pendingGrading.submissions} entregas` },
          { label: 'Asistencia media', value: d.attendanceRate != null ? pct(d.attendanceRate, 1) : NO },
          { label: 'Valoración', value: d.rating.avg != null ? `${num(d.rating.avg, 1)} / 5` : NO, note: `${d.rating.count} evaluaciones` },
        ]}
      />
      <Section title="Mis cursos" className="mt-12">
        <ScrollTable><DataTable
          rows={d.courses} rowKey={(c) => c.id}
          empty={<EmptyState title="No tienes cursos asignados" description="Cuando la administración te asigne cursos aparecerán aquí." />}
          columns={[
            { key: 'a', header: 'Curso', cell: (c) => <Link to={`/panel/cursos/${c.id}`} className="font-semibold underline-offset-4 hover:underline">{c.title}</Link> },
            { key: 'b', header: 'Estado', cell: (c) => <Tag tone={statusTone(c.status)}>{c.status}</Tag> },
            { key: 'c', header: 'Inscritos', align: 'right', cell: (c) => c.enrolled },
            { key: 'd', header: 'Progreso medio', className: 'min-w-40', cell: (c) => (c.avgProgress != null ? <ProgressRule value={c.avgProgress} /> : NO) },
            { key: 'e', header: 'Por calificar', align: 'right', cell: (c) => c.pendingGrading },
            { key: 'f', header: 'Asistencia', align: 'right', cell: (c) => (c.attendanceRate != null ? pct(c.attendanceRate, 0) : NO) },
            { key: 'g', header: 'Valoración', align: 'right', cell: (c) => (c.rating != null ? num(c.rating, 1) : NO) },
          ]}
        /></ScrollTable>
      </Section>
      {d.pendingGrading.total > 0 && (
        <Section title="Pendientes de calificar" description={`${d.pendingGrading.total} elementos esperan tu revisión.`}>
          <ul className="divide-y divide-line border-y border-ink">
            {d.courses.filter((c) => c.pendingGrading > 0).map((c) => (
              <li key={c.id}><Link to={`/panel/cursos/${c.id}`} className="flex items-center justify-between gap-4 py-3 hover:bg-stone sm:px-2"><span className="font-semibold">{c.title}</span><span className="text-sm text-graphite tnum">{c.pendingGrading} por calificar</span></Link></li>
            ))}
          </ul>
        </Section>
      )}
      <Section title="Próximas sesiones" actions={<Link to="/panel/calendario" className="text-sm font-semibold underline">Ver calendario</Link>}>
        {d.upcomingSessions.length === 0 ? <p className="border-y border-line py-8 text-center text-sm text-graphite">No tienes sesiones programadas.</p> : (
          <ul className="divide-y divide-line border-y border-ink">
            {d.upcomingSessions.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div><p className="font-semibold">{s.title}</p><p className="text-xs text-muted">{EVENT_TYPES[s.type] ?? s.type} · {dateTime(s.startAt)}{s.course && ` · ${s.course.title}`}{s.location && ` · ${s.location}`}</p></div>
                <div className="flex gap-3 text-sm font-semibold">
                  {s.meetingUrl && <a href={s.meetingUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">Unirse</a>}
                  <Link to={`/panel/asistencia/${s.id}`} className="underline underline-offset-4">Asistencia</Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

export default function Dashboard() {
  const { can } = useAuth();
  if (can('reports.view', 'reports.academic')) return <AdminDashboard />;
  if (can('courses.teach')) return <InstructorDashboard />;
  return (
    <div className="animate-rise">
      <PageHeader title="Dashboard" />
      <EmptyState title="Bienvenido al panel" description="Tu rol no incluye reportes. Usa el menú lateral para acceder a tus herramientas." />
    </div>
  );
}
