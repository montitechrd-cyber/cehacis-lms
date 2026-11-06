import { Link, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, BookOpen, ChevronRight, Clock, Layers, MonitorPlay, Route } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { ButtonLink } from '@/components/ui/Button';
import { Facts } from '@/components/ui/Data';
import { EmptyState, ErrorState, PageLoader } from '@/components/ui/Feedback';
import { LEVELS } from '@/lib/format';
import { priceLabel, usePageTitle, type CourseCard, type Program } from '@/features/public/data';
import { Description, Wrap } from '@/features/public/parts';
import { cardArt, courseArt } from '@/features/home/course-art';

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const coverOf = (c: Pick<CourseCard, 'imageUrl' | 'title' | 'slug'>) => cardArt(c) ?? (c.imageUrl ? { src: c.imageUrl, alt: '' } : { ...courseArt(c), alt: '' });

/** Paso de la ruta del programa: número, portada, título, datos y precio del curso. */
function RouteStep({ course, step, last }: { course: CourseCard; step: number; last: boolean }) {
  const cover = coverOf(course);
  return (
    <li className="relative grid grid-cols-[2.5rem_1fr] gap-x-4 sm:gap-x-6">
      {/* Línea de la ruta entre pasos */}
      {!last && <span className="absolute bottom-0 left-5 top-12 w-px -translate-x-1/2 bg-hairline" aria-hidden />}
      <span className="relative z-10 grid size-10 place-items-center rounded-full bg-orange font-bold text-paper tnum" aria-hidden>
        {step}
      </span>
      <article className="group relative mb-6 flex flex-col overflow-hidden rounded-xl border border-hairline bg-paper transition-[box-shadow,border-color] duration-200 ease-out hover:border-line-strong hover:shadow-lift sm:flex-row">
        <div className="aspect-[16/9] shrink-0 overflow-hidden bg-sand sm:aspect-auto sm:w-56">
          <img src={cover.src} alt={cover.alt} loading="lazy" className="size-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03] motion-reduce:transition-none" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col p-5 sm:p-6">
          <p className="text-sm text-muted">
            <span className="sr-only">Paso {step}: </span>
            {LEVELS[course.level] ?? course.level}
          </p>
          <h3 className="mt-1 text-lg font-bold leading-snug tracking-[-0.01em]">
            <Link to={`/cursos/${course.slug}`} className="text-ink no-underline after:absolute after:inset-0 group-hover:underline group-hover:underline-offset-4">
              {course.title}
            </Link>
          </h3>
          {course.subtitle && <p className="mt-1.5 line-clamp-2 text-[0.9375rem] text-graphite">{course.subtitle}</p>}
          <div className="mt-auto flex flex-wrap items-center justify-between gap-x-6 gap-y-2 pt-4">
            <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-graphite">
              {course.durationHours ? (
                <li className="inline-flex items-center gap-1.5 tnum">
                  <Clock className="size-4 text-muted" strokeWidth={1.75} aria-hidden /> {course.durationHours} h
                </li>
              ) : null}
              {course.lessonsCount > 0 && (
                <li className="inline-flex items-center gap-1.5 tnum">
                  <BookOpen className="size-4 text-muted" strokeWidth={1.75} aria-hidden /> {plural(course.lessonsCount, 'lección', 'lecciones')}
                </li>
              )}
            </ul>
            <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-orange-strong">
              Ver curso <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
            </p>
          </div>
        </div>
      </article>
    </li>
  );
}

export default function ProgramDetail() {
  const { slug } = useParams();
  const q = useQuery({
    queryKey: ['public', 'program', slug],
    queryFn: async () => (await api.get<{ data: Program }>(`/public/programs/${slug}`)).data,
    retry: (n, e) => !(e instanceof ApiError && e.status === 404) && n < 2,
  });
  const p = q.data;
  usePageTitle(p?.title ?? 'Programa');

  if (q.isLoading) return <PageLoader />;
  if (q.error instanceof ApiError && q.error.status === 404)
    return (
      <Wrap className="py-10">
        <EmptyState title="No encontramos este programa." action={<ButtonLink to="/programas" variant="primary">Ver programas</ButtonLink>} />
      </Wrap>
    );
  if (q.isError || !p)
    return (
      <Wrap className="py-10">
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      </Wrap>
    );

  const paid = Number(p.price) > 0;
  const price = priceLabel(p);
  const count = p.coursesCount || p.courses.length;
  const lessons = p.courses.reduce((a, c) => a + (c.lessonsCount || 0), 0);
  const covers = p.imageUrl ? [{ src: p.imageUrl, alt: '' }] : p.courses.slice(0, 3).map(coverOf);

  const cta = (className = '') =>
    paid ? (
      <ButtonLink to={`/checkout?items=PROGRAM:${p.id}`} variant="primary" size="lg" className={`h-12! rounded-lg! px-7 ${className}`}>
        Inscribirme · {price}
      </ButtonLink>
    ) : null;

  const headerFacts = [
    { icon: Layers, label: plural(count, 'curso', 'cursos') },
    p.totalHours ? { icon: Clock, label: `${p.totalHours} h en total` } : null,
    lessons ? { icon: BookOpen, label: plural(lessons, 'lección', 'lecciones') } : null,
    { icon: MonitorPlay, label: '100 % online' },
  ].filter((f): f is { icon: typeof Clock; label: string } => f !== null);

  return (
    <>
      {/* Encabezado: ruta, título, entradilla, datos y las portadas de los cursos del programa */}
      <header className="border-b border-hairline bg-sand">
        <Wrap className="grid gap-10 py-8 sm:py-10 lg:grid-cols-12 lg:items-center lg:gap-14 lg:py-14">
          <div className="min-w-0 animate-rise lg:col-span-7">
            <nav aria-label="Ruta de navegación">
              <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted">
                <li>
                  <Link to="/" className="text-graphite no-underline hover:text-ink hover:underline">Inicio</Link>
                </li>
                <ChevronRight className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
                <li>
                  <Link to="/programas" className="text-graphite no-underline hover:text-ink hover:underline">Programas</Link>
                </li>
                <ChevronRight className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
                <li aria-current="page" className="min-w-0 truncate text-ink">{p.title}</li>
              </ol>
            </nav>

            <p className="mt-6 inline-flex items-center gap-1.5 rounded-md bg-orange-tint px-2.5 py-1 text-sm font-semibold text-orange-strong">
              <Route className="size-4" strokeWidth={1.75} aria-hidden /> Programa formativo
            </p>
            <h1 className="mt-3 text-[clamp(2.25rem,1.55rem+2.3vw,3.75rem)] font-extrabold leading-[1.02] tracking-[-0.035em]">{p.title}</h1>
            {p.summary && <p className="mt-4 max-w-2xl text-xl leading-snug text-graphite">{p.summary}</p>}

            <ul className="mt-6 flex flex-wrap gap-2">
              {headerFacts.map((f) => (
                <li key={f.label} className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-paper px-3 py-1.5 text-sm font-medium tnum">
                  <f.icon className="size-4 text-orange-strong" strokeWidth={1.75} aria-hidden />
                  {f.label}
                </li>
              ))}
            </ul>

            {paid && <div className="mt-8">{cta()}</div>}
          </div>

          {covers.length > 0 && (
            <div className="lg:col-span-5" aria-hidden>
              {covers.length === 1 ? (
                <img src={covers[0].src} alt="" className="aspect-[16/10] w-full rounded-2xl object-cover shadow-float" />
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {covers.map((cv, i) => (
                    <img
                      key={i}
                      src={cv.src}
                      alt=""
                      className={`w-full rounded-2xl object-cover shadow-float ${covers.length === 3 && i === 0 ? 'col-span-2 aspect-[16/8]' : 'aspect-[4/3]'}`}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </Wrap>
      </header>

      <Wrap className="py-10 lg:grid lg:grid-cols-12 lg:gap-14 lg:py-14">
        <div className="min-w-0 lg:col-span-8">
          {p.description && (
            <section aria-labelledby="sobre-programa" className="border-b border-hairline pb-10 lg:pb-12">
              <h2 id="sobre-programa" className="mb-6 text-[clamp(1.375rem,1.15rem+0.7vw,1.75rem)] font-extrabold leading-tight tracking-[-0.025em]">
                Sobre el programa
              </h2>
              <Description text={p.description} />
            </section>
          )}

          <section aria-labelledby="ruta" className={p.description ? 'pt-10 lg:pt-12' : ''}>
            <div className="mb-6 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
              <h2 id="ruta" className="text-[clamp(1.375rem,1.15rem+0.7vw,1.75rem)] font-extrabold leading-tight tracking-[-0.025em]">
                Tu ruta, curso a curso
              </h2>
              {p.courses.length > 0 && <p className="text-sm text-muted">Te recomendamos seguirlos en este orden.</p>}
            </div>
            {p.courses.length === 0 ? (
              <p className="rounded-xl bg-sand p-6 text-graphite">Este programa aún no tiene cursos publicados.</p>
            ) : (
              <ol>
                {p.courses.map((c, i) => (
                  <RouteStep key={c.id} course={c} step={i + 1} last={i === p.courses.length - 1} />
                ))}
              </ol>
            )}
          </section>
        </div>

        <aside className="mt-4 lg:col-span-4 lg:mt-0">
          <div className="rounded-xl border border-hairline bg-paper p-6 lg:sticky lg:top-24 lg:shadow-lift">
            {paid ? (
              <>
                <p className="text-3xl font-extrabold tracking-tight tnum">{price}</p>
                <p className="mt-1 text-sm text-muted">Un solo pago por {count === 1 ? 'el curso' : `los ${count} cursos`}.</p>
                <div className="mt-4">{cta('w-full')}</div>
              </>
            ) : (
              <p className="rounded-lg bg-orange-tint p-4 text-sm leading-relaxed">
                Este programa no tiene costo conjunto: inscríbete en cada curso desde la ruta.
              </p>
            )}
            <h2 className="mt-6 text-sm font-bold">El programa incluye</h2>
            <Facts
              className="mt-3"
              items={[
                { label: 'Cursos', value: count },
                { label: 'Horas totales', value: p.totalHours ? `${p.totalHours} h` : '—' },
                ...(lessons ? [{ label: 'Lecciones', value: lessons }] : []),
                { label: 'Modalidad', value: 'Online' },
              ]}
            />
          </div>
        </aside>
      </Wrap>
    </>
  );
}
