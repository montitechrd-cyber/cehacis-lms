import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, CheckCircle2, ListTree, Lock, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { toast } from 'sonner';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Alert, EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback';
import { Drawer } from '@/components/ui/Overlay';
import { StepRow } from '@/components/ui/StepRow';
import { Tag } from '@/components/ui/Data';
import { RichTextView } from '@/components/ui/RichText';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { COMPLETION_RULES } from '@/lib/format';
import { CourseOutline } from '@/features/classroom/CourseOutline';
import { LessonResources } from '@/features/classroom/LessonResources';
import { LessonComments, TutorPanel } from '@/features/classroom/LessonSocial';
import { flatLessons, type CompleteResult, type LessonData, type NavLesson, type Outline } from '@/features/classroom/types';
import { ButterflyMark } from '@/components/brand/Emblem';

const TOC_KEY = 'cehacis.aula.toc';

function readToc() {
  try {
    return localStorage.getItem(TOC_KEY) !== '0';
  } catch {
    return true;
  }
}

function Locked({ error }: { error: ApiError }) {
  const req = (error.details as { requiredLessonId?: number | null } | undefined)?.requiredLessonId;
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-8">
      <Lock className="mb-5 size-10" aria-hidden />
      <h1 className="text-title font-bold tracking-tight">Esta lección aún está bloqueada</h1>
      <p className="mt-4 text-lg text-graphite">{error.message}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        {req ? (
          <ButtonLink to={`/campus/leccion/${req}`} variant="primary" size="lg" iconRight={<ArrowRight className="size-4" />}>
            Ir a la lección requerida
          </ButtonLink>
        ) : null}
        <ButtonLink to="/campus/cursos" variant="outline" size="lg">
          Mis cursos
        </ButtonLink>
      </div>
    </div>
  );
}

export default function Lesson() {
  const { lessonId: idParam } = useParams();
  const lessonId = Number(idParam);
  const nav = useNavigate();
  const qc = useQueryClient();
  const { isStaff } = useAuth();

  const [courseId, setCourseId] = useState<number | null>(null);
  const [tocOpen, setTocOpen] = useState(readToc);
  const [drawer, setDrawer] = useState(false);
  const [done, setDone] = useState<{ lessonId: number; res: CompleteResult } | null>(null);
  const [completing, setCompleting] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);

  const lq = useQuery({
    queryKey: ['lesson', lessonId],
    queryFn: () => api.get<LessonData>(`/classroom/lessons/${lessonId}`),
    retry: (n, e) => !(e instanceof ApiError && [403, 404, 423].includes(e.status)) && n < 1,
  });
  const data = lq.data;
  useEffect(() => {
    if (data?.course.id) setCourseId(data.course.id);
  }, [data?.course.id]);

  const oq = useQuery({
    queryKey: ['outline', courseId],
    queryFn: () => api.get<Outline>(`/classroom/courses/${courseId}/outline`),
    enabled: !!courseId,
  });
  const outline = oq.data;
  const lessons = useMemo(() => flatLessons(outline), [outline]);
  const pos = lessons.findIndex((l) => l.id === lessonId);

  // Navegación: la del servidor cuando es de esta lección; si no, derivada del índice.
  const nav2 = useMemo(() => {
    const fromOutline = (i: number): NavLesson | null => {
      const l = lessons[i];
      return l ? { id: l.id, title: l.title, locked: l.status === 'locked', lockReason: l.lockReason } : null;
    };
    if (data && data.lesson.id === lessonId) return { prev: data.navigation.prev, next: data.navigation.next };
    if (pos >= 0) return { prev: fromOutline(pos - 1), next: fromOutline(pos + 1) };
    return { prev: null, next: null };
  }, [data, lessonId, lessons, pos]);

  // Foco en el título al cambiar de lección
  useEffect(() => {
    if (data && data.lesson.id === lessonId) {
      titleRef.current?.focus({ preventScroll: true });
      window.scrollTo({ top: 0 });
    }
  }, [data?.lesson.id, lessonId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setDone(null);
    setDrawer(false);
  }, [lessonId]);

  // Seguimiento de vista y tiempo
  const ok = !!data && data.lesson.id === lessonId;
  useEffect(() => {
    if (!ok) return;
    let last = Date.now();
    let alive = true;
    api
      .post<{ completed: boolean }>(`/classroom/lessons/${lessonId}/view`)
      .then(() => {
        if (!alive) return;
        qc.invalidateQueries({ queryKey: ['outline'] });
        qc.invalidateQueries({ queryKey: ['lesson', lessonId] });
      })
      .catch(() => undefined);
    const flush = () => {
      const s = Math.min(3600, Math.round((Date.now() - last) / 1000));
      last = Date.now();
      if (s > 0) api.post(`/classroom/lessons/${lessonId}/view`, { secondsSpent: s }).catch(() => undefined);
    };
    const t = setInterval(() => (document.hidden ? (last = Date.now()) : flush()), 60_000);
    const onHide = () => document.hidden && flush();
    document.addEventListener('visibilitychange', onHide);
    return () => {
      alive = false;
      clearInterval(t);
      document.removeEventListener('visibilitychange', onHide);
      flush();
    };
  }, [ok, lessonId]); // eslint-disable-line react-hooks/exhaustive-deps

  const markView = useCallback(
    (rid: number) => {
      api
        .post(`/classroom/resources/${rid}/view`)
        .then(() => {
          qc.invalidateQueries({ queryKey: ['lesson', lessonId] });
          qc.invalidateQueries({ queryKey: ['outline'] });
        })
        .catch(() => undefined);
    },
    [qc, lessonId],
  );

  const complete = async () => {
    setCompleting(true);
    try {
      const res = await api.post<CompleteResult>(`/classroom/lessons/${lessonId}/complete`);
      toast.success('Lección completada');
      setDone({ lessonId, res });
      await Promise.all([qc.invalidateQueries({ queryKey: ['lesson', lessonId] }), qc.invalidateQueries({ queryKey: ['outline'] }), qc.invalidateQueries({ queryKey: ['my-courses'] })]);
    } catch (e) {
      const miss = e instanceof ApiError ? (e.details as { missing?: string[] } | undefined)?.missing : undefined;
      toast.error(miss?.length ? `Falta: ${miss.join('; ')}` : e instanceof ApiError ? e.message : 'No se pudo completar la lección');
    } finally {
      setCompleting(false);
    }
  };

  const go = useCallback((n: NavLesson | null) => n && !n.locked && nav(`/campus/leccion/${n.id}`), [nav]);
  const navRef = useRef(nav2);
  navRef.current = nav2;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable)) return;
      if (document.querySelector('dialog[open], [aria-modal="true"]')) return;
      if (e.key === 'ArrowLeft') go(navRef.current.prev);
      if (e.key === 'ArrowRight') go(navRef.current.next);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go]);

  const toggleToc = () => {
    setTocOpen((v) => {
      try {
        localStorage.setItem(TOC_KEY, v ? '0' : '1');
      } catch {
        /* sin almacenamiento */
      }
      return !v;
    });
  };

  if (lq.error instanceof ApiError && lq.error.status === 423 && !courseId) return <Locked error={lq.error} />;

  const steps = lessons.map((l) => ({ id: l.id, title: l.title, status: l.status }));
  const next = nav2.next;
  const prev = nav2.prev;
  const position = pos >= 0 ? `Lección ${pos + 1} de ${lessons.length}` : data ? `Lección ${data.navigation.index} de ${data.navigation.total}` : '';
  const finished = done?.res.courseCompleted && done.lessonId === lessonId;

  return (
    <div className="-mx-4 -mt-8 sm:-mx-8 sm:-mt-10">
      {/* Barra superior fija del aula */}
      <div className="sticky top-16 z-20 border-b border-ink bg-paper">
        <div className="flex items-center gap-2 px-4 pt-2.5 sm:gap-4 sm:px-8">
          <div className="min-w-0 flex-1">
            {courseId ? (
              <Link to={`/campus/cursos/${courseId}`} className="block truncate text-sm font-bold no-underline hover:underline">
                {outline?.course.title ?? data?.course.title ?? 'Curso'}
              </Link>
            ) : (
              <Skeleton className="h-4 w-48" />
            )}
            <p className="text-xs text-graphite tnum" aria-live="polite">
              {position}
              {isStaff && <Tag tone="info" className="ml-2">Vista previa</Tag>}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button size="sm" variant="outline" className="lg:hidden" icon={<ListTree className="size-4" />} onClick={() => setDrawer(true)}>
              <span className="max-sm:sr-only">Contenido</span>
            </Button>
            <Button size="sm" variant="outline" className="max-lg:hidden" icon={tocOpen ? <PanelLeftClose className="size-4" /> : <PanelLeftOpen className="size-4" />} onClick={toggleToc} aria-expanded={tocOpen}>
              Contenido
            </Button>
            <Button size="sm" variant="outline" disabled={!prev || prev.locked} onClick={() => go(prev)} icon={<ArrowLeft className="size-4" />} aria-keyshortcuts="ArrowLeft" title={prev ? `Anterior: ${prev.title}` : 'No hay lección anterior'}>
              <span className="max-sm:sr-only">Anterior</span>
            </Button>
            <span title={next ? (next.locked ? (next.lockReason ?? 'Lección bloqueada') : `Siguiente: ${next.title}`) : 'Es la última lección'}>
              <Button size="sm" variant={next?.locked ? 'outline' : 'primary'} disabled={!next || next.locked} onClick={() => go(next)} iconRight={next?.locked ? <Lock className="size-4" /> : <ArrowRight className="size-4" />} aria-keyshortcuts="ArrowRight" aria-describedby={next?.locked ? 'lock-reason' : undefined}>
                <span className="max-sm:sr-only">Siguiente</span>
              </Button>
            </span>
          </div>
        </div>
        <div className="px-4 pb-3 pt-3 sm:px-8">
          {steps.length > 0 ? <StepRow steps={steps} currentId={lessonId} onSelect={(id) => nav(`/campus/leccion/${id}`)} /> : <Skeleton className="h-2.5 w-full" />}
        </div>
      </div>

      <div className={tocOpen ? 'lg:grid lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-x-12 lg:px-8' : 'lg:px-8'}>
        {tocOpen && (
          <aside className="hidden lg:block" aria-label="Tabla de contenidos">
            <div className="sticky top-44 max-h-[calc(100dvh-12rem)] overflow-y-auto py-8 pr-2">
              {outline ? <CourseOutline outline={outline} currentId={lessonId} /> : oq.error ? <ErrorState error={oq.error} onRetry={() => oq.refetch()} /> : <Skeleton className="h-64 w-full" />}
            </div>
          </aside>
        )}
        <section aria-label="Lección" className="min-w-0 px-4 py-8 sm:px-8 lg:px-0 lg:py-10">
          {lq.isLoading || (lq.isFetching && data && data.lesson.id !== lessonId) ? (
            <div className="max-w-3xl space-y-4" aria-busy>
              <Skeleton className="h-12 w-3/4" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : lq.error instanceof ApiError && lq.error.status === 423 ? (
            <Locked error={lq.error} />
          ) : lq.error ? (
            <ErrorState error={lq.error} onRetry={() => lq.refetch()} />
          ) : !data ? (
            <EmptyState title="Lección no disponible" />
          ) : finished ? (
            <div className="max-w-2xl animate-rise py-8">
              <ButterflyMark className="mb-6 w-16 text-orange" />
              <h1 ref={titleRef} tabIndex={-1} className="text-display font-bold outline-none">
                ¡Curso completado!
              </h1>
              <p className="mt-5 text-lg text-graphite">Has terminado «{data.course.title}». Revisa si ya cumples los requisitos para tu certificado.</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <ButtonLink to="/campus/certificados" variant="primary" size="lg">
                  Ver mis certificados
                </ButtonLink>
                <ButtonLink to={`/campus/cursos/${data.course.id}`} variant="outline" size="lg">
                  Volver al curso
                </ButtonLink>
              </div>
            </div>
          ) : (
            <article className="animate-rise">
              <h1 ref={titleRef} tabIndex={-1} className="max-w-3xl text-title font-bold tracking-tight outline-none">
                {data.lesson.title}
              </h1>
              <p className="mt-3 text-sm text-graphite">
                {data.lesson.moduleTitle}
                {data.lesson.durationMin ? <span className="tnum"> · {data.lesson.durationMin} min</span> : null}
              </p>
              {data.lesson.summary && <p className="mt-4 max-w-2xl text-lg leading-relaxed text-graphite">{data.lesson.summary}</p>}
              <RichTextView html={data.lesson.content} className="mt-8" />

              <LessonResources resources={data.resources} lessonId={lessonId} onView={markView} />

              {/* Requisito */}
              <section className="mt-12 border-t border-ink pt-4" aria-labelledby="requisito">
                <h2 id="requisito" className="text-xl font-bold tracking-tight">
                  Para completar esta lección
                </h2>
                <p className="mt-1 text-sm text-graphite">{COMPLETION_RULES[data.requirement.rule] ?? data.requirement.rule}</p>
                {data.progress.status === 'COMPLETED' ? (
                  <p className="mt-4 inline-flex items-center gap-2 font-semibold">
                    <CheckCircle2 className="size-5" aria-hidden /> Lección completada
                  </p>
                ) : (
                  <>
                    {!data.requirement.ok && data.requirement.missing.length > 0 && (
                      <div className="mt-4 max-w-xl">
                        <Alert tone="warning" title="Aún falta">
                          <ul className="list-disc pl-4">
                            {data.requirement.missing.map((m) => (
                              <li key={m}>{m}</li>
                            ))}
                          </ul>
                        </Alert>
                      </div>
                    )}
                    <div className="mt-5">
                      <Button variant="ink" size="lg" loading={completing} disabled={data.requirement.rule !== 'MANUAL' && !data.requirement.ok} onClick={complete} icon={<CheckCircle2 className="size-4" />}>
                        Marcar como completada
                      </Button>
                    </div>
                  </>
                )}
                {done && done.lessonId === lessonId && (
                  <div className="mt-5 max-w-xl animate-rise">
                    <Alert
                      tone="success"
                      title="¡Buen trabajo!"
                      action={
                        done.res.next ? (
                          <ButtonLink to={`/campus/leccion/${done.res.next.id}`} size="sm" variant="primary" iconRight={<ArrowRight className="size-4" />}>
                            Ir a la siguiente
                          </ButtonLink>
                        ) : undefined
                      }
                    >
                      Tu progreso en el curso es {Math.round(done.res.enrollmentProgress)} %.
                      {done.res.next ? ` Sigue con «${done.res.next.title}».` : ''}
                    </Alert>
                  </div>
                )}
                {next?.locked && (
                  <p id="lock-reason" className="mt-4 flex max-w-xl items-start gap-2 text-sm text-graphite">
                    <Lock className="mt-0.5 size-4 shrink-0" aria-hidden /> Para avanzar: {next.lockReason ?? 'completa los requisitos de esta lección.'}
                  </p>
                )}
              </section>

              <div className="mt-10 flex max-w-2xl items-center justify-between gap-3 border-t border-line pt-5">
                <Button variant="outline" disabled={!prev || prev.locked} onClick={() => go(prev)} icon={<ArrowLeft className="size-4" />}>
                  Anterior
                </Button>
                <Button variant={next?.locked ? 'outline' : 'primary'} disabled={!next || next.locked} onClick={() => go(next)} title={next?.locked ? (next.lockReason ?? 'Lección bloqueada') : undefined} aria-describedby={next?.locked ? 'lock-reason' : undefined} iconRight={next?.locked ? <Lock className="size-4" /> : <ArrowRight className="size-4" />}>
                  Siguiente
                </Button>
              </div>

              <TutorPanel lessonId={lessonId} />
              <LessonComments lessonId={lessonId} />
            </article>
          )}
        </section>
      </div>

      <Drawer open={drawer} onClose={() => setDrawer(false)} title="Contenido del curso" width="max-w-sm">
        {outline ? <CourseOutline outline={outline} currentId={lessonId} onNavigate={() => setDrawer(false)} /> : <Skeleton className="h-64 w-full" />}
      </Drawer>
    </div>
  );
}
