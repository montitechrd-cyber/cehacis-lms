import { Link, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, CalendarClock, Check, Circle, MessagesSquare } from 'lucide-react';
import { ButtonLink } from '@/components/ui/Button';
import { EmptyState, ErrorState, PageLoader, SkeletonRows } from '@/components/ui/Feedback';
import { ProgressRule, Tag, statusTone } from '@/components/ui/Data';
import { Section } from '@/components/ui/Page';
import { api } from '@/lib/api';
import { ACTIVITY_TYPES, ASSESSMENT_TYPES, EVENT_TYPES, dateTime, pct, courseSerial } from '@/lib/format';
import { CourseOutline } from '@/features/classroom/CourseOutline';
import { flatLessons, isoIn, type EventItem, type MyCourse, type Outline } from '@/features/classroom/types';
import { Colonnade } from '@/components/brand/Emblem';

interface ProgressData {
  enrollment: { status: string; progressPct: number } | null;
  totals: { lessonsTotal: number; lessonsCompleted: number; timeSpentSec: number };
  modules: { id: number; title: string; assessments: AssessItem[]; activities: ActItem[] }[];
  courseLevel: { assessments: AssessItem[]; activities: ActItem[] };
}
interface AssessItem { id: number; title: string; type: string; passingScore: number; attemptsUsed: number; bestPercentage: number | null; passed: boolean | null }
interface ActItem { id: number; title: string; type: string; dueDate: string | null; submitted: boolean; status: string | null; score?: number | null; maxScore?: number }
interface Requirements {
  certificateEnabled: boolean;
  passingScore: number;
  requireAllLessons: boolean;
  minAttendancePct: number;
  finalAssessments: { id: number; title: string; passingScore: number }[];
  enrollment: null | {
    status: string;
    progressPct: number;
    lessons: { completed: number; total: number; met: boolean };
    assessments: { id: number; title: string; passingScore: number; attempts: number; bestPercentage: number | null; met: boolean }[];
    grade: { value: number | null; required: number; enforced: boolean; met: boolean };
    attendance: { attended: number; sessions: number; pendingRecord: number; upcoming: number; pct: number | null; met: boolean };
    eligible: boolean;
    certificate: { id: number; code: string } | null;
  };
}

function attendanceNote(a: { pct: number | null; pendingRecord: number; upcoming: number }) {
  const parts: string[] = [];
  if (a.pct != null) parts.push(pct(a.pct));
  if (a.upcoming) parts.push(`${a.upcoming} ${a.upcoming === 1 ? 'sesión pendiente' : 'sesiones pendientes'}`);
  if (a.pendingRecord) parts.push(`${a.pendingRecord} sin registrar`);
  return parts.length ? parts.join(' · ') : 'sin sesiones aún';
}

function Met({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 py-2.5 text-sm">
      {ok ? <Check className="mt-0.5 size-4 shrink-0 text-ink" aria-label="Cumplido" /> : <Circle className="mt-0.5 size-4 shrink-0 text-muted" aria-label="Pendiente" />}
      <span>{children}</span>
    </li>
  );
}

export default function CourseHome() {
  const courseId = Number(useParams().courseId);
  const oq = useQuery({ queryKey: ['outline', courseId], queryFn: () => api.get<Outline>(`/classroom/courses/${courseId}/outline`) });
  const mine = useQuery({ queryKey: ['my-courses', 'all'], queryFn: () => api.get<MyCourse[]>('/classroom/my-courses') });
  const prog = useQuery({ queryKey: ['course-progress', courseId], queryFn: () => api.get<ProgressData>(`/classroom/courses/${courseId}/progress`) });
  const req = useQuery({ queryKey: ['cert-req', courseId], queryFn: () => api.get<Requirements>(`/certificates/requirements/${courseId}`) });
  const ev = useQuery({
    queryKey: ['events', 'course', courseId],
    queryFn: () => api.get<{ data: EventItem[] }>('/calendar/events', { courseId, from: new Date().toISOString(), to: isoIn(90) }),
  });

  if (oq.isLoading) return <PageLoader />;
  if (oq.error || !oq.data) return <ErrorState error={oq.error} onRetry={() => oq.refetch()} />;
  const o = oq.data;
  const m = mine.data?.find((x) => x.course.id === courseId);
  const lessons = flatLessons(o);
  const target = o.currentLessonId ?? m?.nextLesson?.id ?? m?.lastLesson?.id ?? lessons.find((l) => l.status !== 'locked')?.id;
  const progress = m?.enrollment.progressPct ?? o.progressPct;
  const label = progress >= 100 ? 'Repasar el curso' : progress > 0 ? 'Continuar' : 'Comenzar el curso';
  const sessions = (ev.data?.data ?? []).filter((e) => new Date(e.endAt) > new Date());

  const assessments = [...(prog.data?.modules.flatMap((x) => x.assessments) ?? []), ...(prog.data?.courseLevel.assessments ?? [])];
  const activities = [...(prog.data?.modules.flatMap((x) => x.activities) ?? []), ...(prog.data?.courseLevel.activities ?? [])];
  const r = req.data;

  return (
    <div>
      {/* Cartel del curso */}
      <header className="animate-rise relative isolate overflow-hidden bg-orange px-5 py-8 sm:px-10 sm:py-12">
        <Colonnade className="-z-10 text-ink" opacity={0.06} />
        <p className="text-sm font-semibold tnum">{courseSerial(m?.course.code ?? o.course.code)}</p>
        <h1 className="mt-3 max-w-4xl text-display font-bold">{o.course.title}</h1>
        <div className="mt-8 grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
          <div className="max-w-md">
            <p className="mb-2 text-sm font-semibold tnum">
              {prog.data ? `${prog.data.totals.lessonsCompleted} de ${prog.data.totals.lessonsTotal} lecciones` : 'Tu progreso'}
            </p>
            <ProgressRule value={progress} label="Progreso del curso" />
          </div>
          <div className="flex flex-wrap gap-3">
            {target && (
              <ButtonLink to={`/campus/leccion/${target}`} variant="ink" size="lg" iconRight={<ArrowRight className="size-4" />}>
                {label}
              </ButtonLink>
            )}
            <ButtonLink to={`/campus/cursos/${courseId}/espacio`} variant="outline" size="lg" icon={<MessagesSquare className="size-4" />}>
              Espacio del curso
            </ButtonLink>
          </div>
        </div>
      </header>

      <div className="mt-12 grid gap-x-14 gap-y-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div>
          <Section title="Tabla de contenidos">
            {o.modules.length ? <CourseOutline outline={o} detailed currentId={o.currentLessonId} /> : <EmptyState title="Este curso aún no tiene contenido publicado" />}
          </Section>
        </div>
        <div>
          <Section title="Próximas sesiones" actions={<Link to="/campus/calendario" className="text-sm font-semibold underline underline-offset-4">Calendario</Link>}>
            {ev.isLoading ? (
              <SkeletonRows rows={2} />
            ) : ev.error ? (
              <ErrorState error={ev.error} onRetry={() => ev.refetch()} />
            ) : !sessions.length ? (
              <p className="border-y border-line py-6 text-sm text-graphite">No hay sesiones programadas.</p>
            ) : (
              <ul className="divide-y divide-line border-y border-line">
                {sessions.slice(0, 6).map((e) => (
                  <li key={e.id} className="flex gap-3 py-3 text-sm">
                    <CalendarClock className="mt-0.5 size-4 shrink-0 text-graphite" aria-hidden />
                    <div className="min-w-0">
                      <p className="font-semibold">{e.title}</p>
                      <p className="text-xs text-graphite tnum">{EVENT_TYPES[e.type] ?? e.type} · {dateTime(e.startAt)}</p>
                      {e.meetingUrl && (
                        <a href={e.meetingUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold underline underline-offset-4">
                          Enlace de la clase
                        </a>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Evaluaciones y prácticas">
            {prog.isLoading ? (
              <SkeletonRows rows={3} />
            ) : prog.error ? (
              <ErrorState error={prog.error} onRetry={() => prog.refetch()} />
            ) : !assessments.length && !activities.length ? (
              <p className="border-y border-line py-6 text-sm text-graphite">Este curso no tiene evaluaciones ni prácticas publicadas.</p>
            ) : (
              <ul className="divide-y divide-line border-y border-line">
                {assessments.map((a) => (
                  <li key={`a${a.id}`} className="flex items-center justify-between gap-3 py-3 text-sm">
                    <div className="min-w-0">
                      <Link to={`/campus/evaluaciones/${a.id}`} className="font-semibold hover:underline">{a.title}</Link>
                      <p className="text-xs text-graphite tnum">{ASSESSMENT_TYPES[a.type] ?? a.type} · {a.attemptsUsed} intentos · mejor {a.bestPercentage != null ? pct(a.bestPercentage) : '—'}</p>
                    </div>
                    <Tag tone={a.passed ? 'success' : a.attemptsUsed ? 'danger' : 'neutral'}>{a.passed ? 'Aprobada' : a.attemptsUsed ? 'No aprobada' : 'Pendiente'}</Tag>
                  </li>
                ))}
                {activities.map((a) => (
                  <li key={`p${a.id}`} className="flex items-center justify-between gap-3 py-3 text-sm">
                    <div className="min-w-0">
                      <Link to={`/campus/practicas/${a.id}`} className="font-semibold hover:underline">{a.title}</Link>
                      <p className="text-xs text-graphite tnum">{ACTIVITY_TYPES[a.type] ?? a.type}{a.dueDate ? ` · hasta ${dateTime(a.dueDate)}` : ''}</p>
                    </div>
                    <Tag tone={a.status ? statusTone(a.status) : 'neutral'}>{a.status === 'GRADED' ? `Calificada${a.score != null ? ` ${a.score}` : ''}` : a.submitted ? 'Entregada' : 'Sin entregar'}</Tag>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Requisitos del certificado">
            {req.isLoading ? (
              <SkeletonRows rows={3} />
            ) : req.error || !r ? (
              <ErrorState error={req.error} onRetry={() => req.refetch()} />
            ) : !r.certificateEnabled ? (
              <p className="border-y border-line py-6 text-sm text-graphite">Este curso no emite certificado.</p>
            ) : (
              <>
                <ul className="divide-y divide-line border-y border-line">
                  {r.requireAllLessons && (
                    <Met ok={!!r.enrollment?.lessons.met}>
                      Completar todas las lecciones{r.enrollment ? <span className="text-muted tnum"> ({r.enrollment.lessons.completed}/{r.enrollment.lessons.total})</span> : null}
                    </Met>
                  )}
                  {r.finalAssessments.map((f) => {
                    const st = r.enrollment?.assessments.find((x) => x.id === f.id);
                    return (
                      <Met key={f.id} ok={!!st?.met}>
                        Aprobar «{f.title}» con {f.passingScore} % o más
                        {st && <span className="text-muted tnum"> (mejor: {st.bestPercentage != null ? pct(st.bestPercentage) : '—'})</span>}
                      </Met>
                    );
                  })}
                  {(!r.enrollment || r.enrollment.grade.enforced) && (
                    <Met ok={!!r.enrollment?.grade.met}>
                      Nota final del curso de {r.passingScore} % o más
                      {r.enrollment && <span className="text-muted tnum"> (actual: {r.enrollment.grade.value != null ? pct(r.enrollment.grade.value) : '—'})</span>}
                    </Met>
                  )}
                  {r.minAttendancePct > 0 && (
                    <Met ok={!!r.enrollment?.attendance.met}>
                      Asistencia mínima de {r.minAttendancePct} %
                      {r.enrollment && <span className="text-muted tnum"> ({attendanceNote(r.enrollment.attendance)})</span>}
                    </Met>
                  )}
                </ul>
                {r.enrollment?.certificate ? (
                  <p className="mt-3 text-sm">
                    <Link to="/campus/certificados" className="font-semibold underline underline-offset-4">Ya tienes tu certificado ({r.enrollment.certificate.code})</Link>
                  </p>
                ) : r.enrollment?.eligible ? (
                  <p className="mt-3 text-sm font-semibold">Cumples todos los requisitos.</p>
                ) : null}
              </>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}
