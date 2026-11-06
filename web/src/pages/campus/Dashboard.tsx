import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, CalendarClock } from 'lucide-react';
import { Alert, ErrorState, Skeleton, SkeletonRows } from '@/components/ui/Feedback';
import { ButtonLink } from '@/components/ui/Button';
import { ProgressRule, Tag } from '@/components/ui/Data';
import { Section } from '@/components/ui/Page';
import { StepRow } from '@/components/ui/StepRow';
import { api, type Paged } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { EVENT_TYPES, dateTime, num, relative } from '@/lib/format';
import { flatLessons, isoIn, type Announcement, type EventItem, type MyCourse, type Outline } from '@/features/classroom/types';
import { Colonnade } from '@/components/brand/Emblem';

interface Gami {
  points: number;
  level: { number: number; name: string } | null;
  rank: number | null;
  challenges: { id: number; title: string; description: string; endsAt: string; points: number; progress: { current: number; target: number }; completed: boolean }[];
}
interface ActivityMe {
  id: number;
  title: string;
  dueDate: string | null;
  isOverdue: boolean;
  course: { id: number; title: string };
  mySubmission: { id: number; status: string } | null;
}
interface GradesCourse {
  course: { id: number; title: string };
  assessments: { id: number; title: string; status: string; passed: boolean | null }[];
}

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
};

function Continue({ m }: { m: MyCourse }) {
  const oq = useQuery({ queryKey: ['outline', m.course.id], queryFn: () => api.get<Outline>(`/classroom/courses/${m.course.id}/outline`) });
  const lessons = flatLessons(oq.data);
  const go = oq.data?.currentLessonId ?? m.nextLesson?.id ?? m.lastLesson?.id;
  const goTitle = lessons.find((l) => l.id === go)?.title ?? m.nextLesson?.title ?? m.lastLesson?.title;
  return (
    <div className="animate-rise relative isolate overflow-hidden bg-orange px-5 py-7 sm:px-8 sm:py-9">
      <Colonnade className="-z-10 text-ink" opacity={0.06} />
      <Link to={`/campus/cursos/${m.course.id}`} className="block text-[clamp(1.25rem,1rem+1vw,2rem)] font-bold leading-[1.02] tracking-[-0.03em] no-underline hover:underline">
        {m.course.title}
      </Link>
      {goTitle && <p className="mt-2 text-sm">Siguiente: <strong>{goTitle}</strong></p>}
      <div className="mt-6 grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          {oq.data && lessons.length > 0 ? <StepRow steps={lessons.map((l) => ({ id: l.id, title: l.title, status: l.status }))} currentId={go} tone="orange" /> : oq.isLoading ? <Skeleton className="h-2.5 w-full" /> : null}
          <p className="mt-3 text-sm tnum">{Math.round(m.enrollment.progressPct)} % completado</p>
        </div>
        {go && (
          <ButtonLink to={`/campus/leccion/${go}`} variant="ink" size="lg" iconRight={<ArrowRight className="size-4" />}>
            Continuar
          </ButtonLink>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user, isStaff } = useAuth();
  const courses = useQuery({ queryKey: ['my-courses', 'active'], queryFn: () => api.get<MyCourse[]>('/classroom/my-courses', { status: 'active' }) });
  const gami = useQuery({ queryKey: ['gamification', 'me'], queryFn: () => api.get<Gami>('/gamification/me') });
  const events = useQuery({ queryKey: ['events', 'week'], queryFn: () => api.get<{ data: EventItem[] }>('/calendar/events', { from: new Date().toISOString(), to: isoIn(7) }) });
  const acts = useQuery({ queryKey: ['activities', 'me'], queryFn: () => api.get<ActivityMe[]>('/activities/me') });
  const grades = useQuery({ queryKey: ['assessments', 'grades'], queryFn: () => api.get<{ data: GradesCourse[] }>('/assessments/me/grades') });
  const ann = useQuery({ queryKey: ['announcements', 'recent'], queryFn: () => api.get<Paged<Announcement>>('/community/announcements', { pageSize: 4 }) });

  const active = courses.data ?? [];
  const recent = active.find((c) => c.lastLesson) ?? active[0];
  const pendingActs = (acts.data ?? []).filter((a) => !a.mySubmission || a.mySubmission.status === 'RETURNED');
  const pendingAssess = (grades.data?.data ?? []).flatMap((c) => c.assessments.filter((a) => a.status === 'NOT_STARTED' || a.status === 'IN_PROGRESS').map((a) => ({ ...a, course: c.course })));
  const pendingLoading = acts.isLoading || grades.isLoading;
  const challenge = gami.data?.challenges.find((c) => !c.completed) ?? gami.data?.challenges[0];
  const sessions = (events.data?.data ?? []).filter((e) => new Date(e.endAt) > new Date());

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-title font-bold tracking-tight">
          {greeting()}, {user?.firstName}
        </h1>
      </header>
      {isStaff && (
        <div className="mb-8">
          <Alert tone="info" title="Tienes acceso al panel de gestión" action={<ButtonLink to="/panel" size="sm" variant="outline">Ir al panel</ButtonLink>}>
            Esta es tu vista de estudiante del campus.
          </Alert>
        </div>
      )}

      {courses.isLoading ? <Skeleton className="h-56 w-full" /> : courses.error ? <ErrorState error={courses.error} onRetry={() => courses.refetch()} /> : recent ? (
        <Continue m={recent} />
      ) : (
        <div className="border-t border-ink py-10">
          <p className="text-2xl font-bold tracking-tight">Aún no estás inscrito en ningún curso</p>
          <p className="mt-2 text-graphite">Explora el catálogo y empieza tu primer curso.</p>
          <ButtonLink to="/cursos" variant="primary" className="mt-5">Explorar el catálogo</ButtonLink>
        </div>
      )}

      <p className="mt-8 text-sm text-graphite tnum">
        <Link to="/campus/cursos" className="font-semibold text-ink underline underline-offset-4">{courses.isLoading ? '…' : active.length} {active.length === 1 ? 'curso activo' : 'cursos activos'}</Link>
        {' · '}{gami.data ? num(gami.data.points) : '…'} puntos
        {gami.data?.level && <>{' · '}Nivel {gami.data.level.number}, {gami.data.level.name}</>}
        {gami.data?.rank && <>{' · '}<Link to="/campus/logros" className="font-semibold text-ink underline underline-offset-4">Puesto {gami.data.rank} en la clasificación</Link></>}
      </p>

      <div className="mt-12 grid gap-x-14 lg:grid-cols-2">
        <Section title="Próximas sesiones" description="Los próximos 7 días" actions={<Link to="/campus/calendario" className="text-sm font-semibold underline underline-offset-4">Calendario</Link>}>
          {events.isLoading ? <SkeletonRows rows={2} /> : events.error ? <ErrorState error={events.error} onRetry={() => events.refetch()} /> : !sessions.length ? (
            <p className="border-y border-line py-6 text-sm text-graphite">No tienes sesiones esta semana.</p>
          ) : (
            <ul className="divide-y divide-line border-y border-line">
              {sessions.map((e) => (
                <li key={e.id} className="flex gap-3 py-3 text-sm">
                  <CalendarClock className="mt-0.5 size-4 shrink-0 text-graphite" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{e.title}</p>
                    <p className="text-xs text-graphite tnum">{EVENT_TYPES[e.type] ?? e.type} · {dateTime(e.startAt)}{e.course ? ` · ${e.course.title}` : ''}</p>
                  </div>
                  {e.meetingUrl && <a href={e.meetingUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 text-xs font-semibold underline underline-offset-4">Unirse</a>}
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Pendientes">
          {pendingLoading ? <SkeletonRows rows={3} /> : acts.error || grades.error ? <ErrorState error={acts.error ?? grades.error} onRetry={() => { acts.refetch(); grades.refetch(); }} /> : !pendingActs.length && !pendingAssess.length ? (
            <p className="border-y border-line py-6 text-sm text-graphite">Estás al día: no tienes entregas ni evaluaciones pendientes.</p>
          ) : (
            <ul className="divide-y divide-line border-y border-line">
              {pendingAssess.map((a) => (
                <li key={`e${a.id}`} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <div className="min-w-0">
                    <Link to={`/campus/evaluaciones/${a.id}`} className="font-semibold hover:underline">{a.title}</Link>
                    <p className="text-xs text-graphite">Evaluación · {a.course.title}</p>
                  </div>
                  <Tag tone="warning">{a.status === 'IN_PROGRESS' ? 'En curso' : 'Por hacer'}</Tag>
                </li>
              ))}
              {pendingActs.map((a) => (
                <li key={`p${a.id}`} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <div className="min-w-0">
                    <Link to={`/campus/practicas/${a.id}`} className="font-semibold hover:underline">{a.title}</Link>
                    <p className="text-xs text-graphite tnum">Práctica · {a.course.title}{a.dueDate ? ` · hasta ${dateTime(a.dueDate)}` : ''}</p>
                  </div>
                  <Tag tone={a.isOverdue ? 'danger' : a.mySubmission ? 'info' : 'warning'}>{a.isOverdue ? 'Vencida' : a.mySubmission ? 'Devuelta' : 'Por entregar'}</Tag>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Anuncios recientes">
          {ann.isLoading ? <SkeletonRows rows={2} /> : ann.error ? <ErrorState error={ann.error} onRetry={() => ann.refetch()} /> : !ann.data?.data.length ? (
            <p className="border-y border-line py-6 text-sm text-graphite">No hay anuncios recientes.</p>
          ) : (
            <ul className="divide-y divide-line border-y border-line">
              {ann.data.data.map((a) => (
                <li key={a.id} className="py-3">
                  <p className="text-sm font-semibold">{a.title} {a.isPinned && <Tag tone="orange">Fijado</Tag>}</p>
                  <p className="mt-0.5 line-clamp-2 text-sm text-graphite">{a.body}</p>
                  <p className="mt-1 text-xs text-muted">{a.course ? `${a.course.title} · ` : ''}{relative(a.publishedAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Reto semanal" actions={<Link to="/campus/logros" className="text-sm font-semibold underline underline-offset-4">Ver logros</Link>}>
          {gami.isLoading ? <SkeletonRows rows={1} /> : gami.error ? <ErrorState error={gami.error} onRetry={() => gami.refetch()} /> : !challenge ? (
            <p className="border-y border-line py-6 text-sm text-graphite">No hay un reto activo por ahora.</p>
          ) : (
            <div className="border-y border-line py-4">
              <p className="font-semibold">{challenge.title} <Tag tone="outline">{challenge.points} pts</Tag></p>
              <p className="mt-1 text-sm text-graphite">{challenge.description}</p>
              <ProgressRule className="mt-3" value={challenge.progress.target ? (challenge.progress.current / challenge.progress.target) * 100 : 0} label={`Avance del reto: ${challenge.progress.current} de ${challenge.progress.target}`} showValue={false} />
              <p className="mt-1.5 text-xs text-muted tnum">{challenge.progress.current} de {challenge.progress.target} · termina {dateTime(challenge.endsAt)}</p>
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}
