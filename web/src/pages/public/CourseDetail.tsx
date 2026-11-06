import { useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import clsx from 'clsx';
import { BadgeCheck, BookOpen, Check, ChevronDown, ChevronRight, Clock, MonitorPlay, PlayCircle, Signal, Star } from 'lucide-react';
import { api, ApiError, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Facts } from '@/components/ui/Data';
import { EmptyState, ErrorState, PageLoader } from '@/components/ui/Feedback';
import { Modal } from '@/components/ui/Overlay';
import { RichTextView } from '@/components/ui/RichText';
import { date, LEVELS, MODALITIES } from '@/lib/format';
import { isFreeCourse, priceLabel, toList, usePageTitle, type CourseDetailData } from '@/features/public/data';
import { Description, Wrap } from '@/features/public/parts';
import { CourseCardView } from '@/features/public/CourseCardView';
import { courseArt } from '@/features/home/course-art';

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const minutes = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}` : `${m} min`);

/** Sección del cuerpo de la ficha: título de sección y contenido, separadas por un filete fino. */
function Section({ id, title, aside, children }: { id: string; title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="border-t border-hairline py-10 first:border-t-0 first:pt-0 lg:py-12">
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 id={id} className="text-[clamp(1.375rem,1.15rem+0.7vw,1.75rem)] font-extrabold leading-tight tracking-[-0.025em]">
          {title}
        </h2>
        {aside && <p className="text-sm text-muted tnum">{aside}</p>}
      </div>
      {children}
    </section>
  );
}

const initials = (a: string, b: string) => `${a.charAt(0)}${b.charAt(0)}`.toUpperCase();

export default function CourseDetail() {
  const { slug } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const [preview, setPreview] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState(false);

  const q = useQuery({
    queryKey: ['public', 'course', slug],
    queryFn: async () => (await api.get<{ data: CourseDetailData }>(`/public/courses/${slug}`)).data,
    retry: (n, e) => !(e instanceof ApiError && e.status === 404) && n < 2,
  });
  const c = q.data;
  usePageTitle(c?.title ?? 'Curso');

  // La barra de inscripción fija en móvil reserva su espacio en todo el documento (ver index.css).
  useEffect(() => {
    if (!c) return;
    document.documentElement.classList.add('has-mobile-bar');
    return () => document.documentElement.classList.remove('has-mobile-bar');
  }, [c]);

  if (q.isLoading) return <PageLoader />;
  if (q.error instanceof ApiError && q.error.status === 404)
    return (
      <Wrap className="py-10">
        <EmptyState title="No encontramos este curso." description="Puede que ya no esté disponible." action={<ButtonLink to="/cursos" variant="primary">Ver cursos</ButtonLink>} />
      </Wrap>
    );
  if (q.isError || !c)
    return (
      <Wrap className="py-10">
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      </Wrap>
    );

  const free = isFreeCourse(c);
  const soldOut = c.seatsLeft !== null && c.seatsLeft <= 0;
  const objectives = toList(c.objectives);
  const price = priceLabel(c);
  const lessonsTotal = c.lessonsCount || c.outline.reduce((a, m) => a + m.lessons.length, 0);
  const outlineMin = c.outline.reduce((a, m) => a + m.lessons.reduce((b, l) => b + (l.durationMin ?? 0), 0), 0);
  const previewFor = (title: string) => c.previewLessons.find((p) => p.title === title);
  const open = c.previewLessons.find((p) => p.title === preview);
  const art = c.imageUrl ? { src: c.imageUrl, alt: c.title } : courseArt(c);
  const level = LEVELS[c.level] ?? c.level;
  const facilitators = c.instructors.map((i) => `${i.firstName} ${i.lastName}`).join(', ');

  async function enroll() {
    if (!c) return;
    if (!user) {
      nav(`/ingresar?next=${encodeURIComponent(`/cursos/${c.slug}`)}`);
      return;
    }
    setEnrolling(true);
    try {
      await api.post(`/classroom/enroll/${c.id}`);
      toast.success('Inscripción confirmada');
      nav(`/campus/cursos/${c.id}`);
    } catch (e) {
      if (e instanceof ApiError && e.status === 409 && !/cupo/i.test(e.message)) nav(`/campus/cursos/${c.id}`);
      else if (e instanceof ApiError && e.status === 402) nav(`/checkout?items=COURSE:${c.id}`);
      else toast.error(errorMessage(e));
    } finally {
      setEnrolling(false);
    }
  }

  const cta = (className?: string) => {
    const cls = clsx('h-12! rounded-lg! px-7', className);
    return soldOut ? (
      <Button size="lg" variant="primary" className={cls} disabled>
        Cupos agotados
      </Button>
    ) : free ? (
      <Button size="lg" variant="primary" className={cls} loading={enrolling} onClick={enroll}>
        Inscribirme gratis
      </Button>
    ) : (
      <ButtonLink to={`/checkout?items=COURSE:${c.id}`} size="lg" variant="primary" className={cls}>
        Inscribirme · {price}
      </ButtonLink>
    );
  };

  const headerFacts = [
    { icon: Signal, label: `Nivel ${level.toLowerCase()}` },
    c.durationHours ? { icon: Clock, label: `${c.durationHours} h` } : null,
    lessonsTotal ? { icon: BookOpen, label: plural(lessonsTotal, 'lección', 'lecciones') } : null,
    { icon: MonitorPlay, label: MODALITIES[c.modality] ?? c.modality },
    c.certificateEnabled ? { icon: BadgeCheck, label: 'Certificado verificable' } : null,
  ].filter((f): f is { icon: typeof Clock; label: string } => f !== null);

  return (
    <div>
      {/* Encabezado: ruta, título, entradilla, datos clave y portada temática */}
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
                  <Link to="/cursos" className="text-graphite no-underline hover:text-ink hover:underline">Cursos</Link>
                </li>
                <ChevronRight className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
                <li aria-current="page" className="min-w-0 truncate text-ink">{c.title.replace(/^Curso de /, '')}</li>
              </ol>
            </nav>

            <h1 className="mt-6 text-[clamp(2.25rem,1.55rem+2.3vw,3.75rem)] font-extrabold leading-[1.02] tracking-[-0.035em]">{c.title}</h1>
            {c.subtitle && <p className="mt-4 max-w-2xl text-xl leading-snug text-graphite">{c.subtitle}</p>}

            {(c.rating && c.rating.count > 0) || facilitators ? (
              <p className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                {c.rating && c.rating.count > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <Star className="size-4 fill-orange text-orange" aria-hidden />
                    <span className="font-semibold tnum">{c.rating.avg.toFixed(1)}</span>
                    <span className="text-muted tnum">({plural(c.rating.count, 'reseña', 'reseñas')})</span>
                  </span>
                )}
                {facilitators && (
                  <span className="text-graphite">
                    Facilita <span className="font-semibold text-ink">{facilitators}</span>
                  </span>
                )}
              </p>
            ) : null}

            <ul className="mt-6 flex flex-wrap gap-2">
              {headerFacts.map((f) => (
                <li key={f.label} className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-paper px-3 py-1.5 text-sm font-medium">
                  <f.icon className="size-4 text-orange-strong" strokeWidth={1.75} aria-hidden />
                  {f.label}
                </li>
              ))}
            </ul>

            <div className="mt-8 hidden flex-wrap items-center gap-x-5 gap-y-3 sm:flex">
              {cta()}
              {!user && free && <p className="text-sm text-muted">Necesitas una cuenta para inscribirte.</p>}
              {c.seatsLeft !== null && !soldOut && <p className="text-sm font-semibold tnum">{plural(c.seatsLeft, 'cupo disponible', 'cupos disponibles')}</p>}
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="relative overflow-hidden rounded-2xl bg-paper shadow-float">
              <img src={art.src} alt={art.alt} width={800} height={450} className="aspect-[3/2] w-full object-cover" />
            </div>
          </div>
        </Wrap>
      </header>

      <Wrap className="py-10 lg:grid lg:grid-cols-12 lg:gap-14 lg:py-14">
        <div className="min-w-0 lg:col-span-8">
          {objectives.length > 0 && (
            <Section id="aprenderas" title="Lo que aprenderás">
              <ul className="grid gap-x-8 gap-y-4 rounded-xl border border-hairline p-6 sm:grid-cols-2 lg:p-7">
                {objectives.map((o, i) => (
                  <li key={i} className="flex gap-3 leading-snug">
                    <Check className="mt-0.5 size-5 shrink-0 text-orange-strong" strokeWidth={2} aria-hidden />
                    <span>{o}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {c.competencies.length > 0 && (
            <Section id="habilidades" title="Habilidades que desarrollarás" aside="Evaluadas con rúbrica">
              <ul className="flex flex-wrap gap-2">
                {c.competencies.map((k) => (
                  <li key={k.id} className="rounded-full bg-orange-tint px-4 py-2 text-[0.9375rem] font-semibold">
                    {k.name}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {(c.description || c.audience || c.requirements) && (
            <Section id="descripcion" title="Sobre este curso">
              <Description text={c.description} />
              {(c.audience || c.requirements) && (
                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  {c.audience && (
                    <div className="rounded-xl bg-sand p-5">
                      <h3 className="font-bold">Para quién es</h3>
                      <p className="mt-2 text-[0.9375rem] leading-relaxed text-graphite">{c.audience}</p>
                    </div>
                  )}
                  {c.requirements && (
                    <div className="rounded-xl bg-sand p-5">
                      <h3 className="font-bold">Qué necesitas</h3>
                      <p className="mt-2 text-[0.9375rem] leading-relaxed text-graphite">{c.requirements}</p>
                    </div>
                  )}
                </div>
              )}
            </Section>
          )}

          <Section
            id="temario"
            title="Temario"
            aside={
              c.outline.length > 0
                ? [plural(c.outline.length, 'módulo', 'módulos'), plural(lessonsTotal, 'lección', 'lecciones'), outlineMin ? minutes(outlineMin) : null].filter(Boolean).join(' · ')
                : undefined
            }
          >
            {c.outline.length === 0 ? (
              <p className="text-graphite">El temario se publicará pronto.</p>
            ) : (
              <ol className="space-y-3">
                {c.outline.map((m, mi) => {
                  const mMin = m.lessons.reduce((a, l) => a + (l.durationMin ?? 0), 0);
                  return (
                    <li key={mi}>
                      <details open={mi === 0} className="group rounded-xl border border-hairline bg-paper open:border-line-strong">
                        <summary className="flex cursor-pointer list-none items-center gap-4 px-5 py-4 [&::-webkit-details-marker]:hidden">
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm text-muted">Módulo {mi + 1}</span>
                            <span className="block text-lg font-bold leading-snug tracking-[-0.01em]">{m.title}</span>
                          </span>
                          <span className="hidden shrink-0 text-sm text-muted tnum sm:block">
                            {plural(m.lessons.length, 'lección', 'lecciones')}
                            {mMin ? ` · ${minutes(mMin)}` : ''}
                          </span>
                          <ChevronDown className="size-5 shrink-0 text-graphite transition-transform duration-200 group-open:rotate-180" strokeWidth={1.75} aria-hidden />
                        </summary>
                        <ul className="border-t border-hairline px-5 py-2">
                          {m.lessons.map((l, li) => {
                            const pv = l.isPreview && previewFor(l.title);
                            return (
                              <li key={li} className="flex items-center gap-3 py-2.5 text-[0.9375rem]">
                                {pv ? (
                                  <PlayCircle className="size-4 shrink-0 text-orange-strong" strokeWidth={1.75} aria-hidden />
                                ) : (
                                  <span className="w-4 shrink-0 text-center text-xs text-muted tnum">{li + 1}</span>
                                )}
                                <span className="min-w-0 flex-1">
                                  {l.title}
                                  {pv && (
                                    <button type="button" onClick={() => setPreview(l.title)} className="ml-3 text-sm font-semibold text-orange-strong underline underline-offset-4">
                                      Vista previa
                                    </button>
                                  )}
                                </span>
                                {l.durationMin ? <span className="shrink-0 text-sm text-muted tnum">{l.durationMin} min</span> : null}
                              </li>
                            );
                          })}
                        </ul>
                      </details>
                    </li>
                  );
                })}
              </ol>
            )}
          </Section>

          {c.instructors.length > 0 && (
            <Section id="facilitadores" title={c.instructors.length === 1 ? 'Facilitador' : 'Facilitadores'}>
              <ul className="grid gap-4 sm:grid-cols-2">
                {c.instructors.map((i) => (
                  <li key={i.id} className="flex items-center gap-4 rounded-xl border border-hairline p-5">
                    {i.avatarUrl ? (
                      <img src={i.avatarUrl} alt="" className="size-14 shrink-0 rounded-full object-cover" />
                    ) : (
                      <span className="grid size-14 shrink-0 place-items-center rounded-full bg-orange-tint font-bold text-orange-strong" aria-hidden>
                        {initials(i.firstName, i.lastName)}
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="font-bold">
                        {i.firstName} {i.lastName}
                      </p>
                      {i.headline && <p className="text-sm text-graphite">{i.headline}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {c.reviews.length > 0 && (
            <Section
              id="resenas"
              title="Reseñas"
              aside={c.rating && c.rating.count > 0 ? `${c.rating.avg.toFixed(1)} de 5 · ${plural(c.rating.count, 'reseña', 'reseñas')}` : undefined}
            >
              <ul className="grid gap-4 sm:grid-cols-2">
                {c.reviews.map((r, i) => (
                  <li key={i} className="rounded-xl border border-hairline p-5">
                    <p className="flex items-center gap-0.5" aria-label={`${r.rating} de 5`}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star key={n} className={clsx('size-4', n <= r.rating ? 'fill-orange text-orange' : 'text-line-strong')} aria-hidden />
                      ))}
                    </p>
                    {r.comment && <p className="mt-3 leading-relaxed">{r.comment}</p>}
                    <p className="mt-3 text-sm text-muted">
                      <span className="font-semibold text-ink">{r.name}</span> · {date(r.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>

        {/* Tarjeta de inscripción: fija al desplazarse en escritorio; en móvil, solo los datos (la compra va en la barra inferior) */}
        <aside className="mt-2 lg:col-span-4 lg:mt-0">
          <div className="rounded-xl border border-hairline bg-paper p-6 lg:sticky lg:top-24 lg:shadow-lift">
            <div className="hidden lg:block">
              <p className="text-3xl font-extrabold tracking-tight tnum">{price}</p>
              <div className="mt-4">{cta('w-full')}</div>
              {!user && free && <p className="mt-2 text-xs text-muted">Necesitas una cuenta para inscribirte.</p>}
            </div>
            <h2 className="text-sm font-bold lg:mt-6">Este curso incluye</h2>
            <Facts
              className="mt-3"
              items={[
                { label: 'Modalidad', value: MODALITIES[c.modality] ?? c.modality },
                { label: 'Nivel', value: level },
                { label: 'Duración', value: c.durationHours ? `${c.durationHours} h` : '—' },
                { label: 'Lecciones', value: lessonsTotal },
                { label: 'Inicio', value: c.startDate ? date(c.startDate) : 'Cuando quieras' },
                ...(c.seatsLeft !== null ? [{ label: 'Cupos disponibles', value: c.seatsLeft }] : []),
                { label: 'Certificado', value: c.certificateEnabled ? 'Sí, verificable' : 'No incluido' },
                ...(c.passingScore ? [{ label: 'Aprobación mínima', value: `${c.passingScore} %` }] : []),
              ]}
            />
            {c.programs.length > 0 && (
              <p className="mt-4 text-sm text-graphite">
                Incluido en:{' '}
                {c.programs.map((p, i) => (
                  <span key={p.id}>
                    {i > 0 && ', '}
                    <Link to={`/programas/${p.slug}`} className="font-semibold text-ink underline underline-offset-4">{p.title}</Link>
                  </span>
                ))}
              </p>
            )}
          </div>
        </aside>
      </Wrap>

      {c.relatedCourses.length > 0 && (
        <section aria-labelledby="relacionados" className="border-t border-hairline bg-sand py-14 lg:py-20">
          <Wrap>
            <h2 id="relacionados" className="text-[clamp(1.75rem,1.3rem+1.4vw,2.5rem)] font-extrabold leading-[1.05] tracking-[-0.03em]">
              Sigue aprendiendo
            </h2>
            <p className="mt-3 text-lg text-graphite">Cursos que entrenan competencias cercanas.</p>
            <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {c.relatedCourses.map((r) => (
                <CourseCardView key={r.id} course={r} />
              ))}
            </ul>
          </Wrap>
        </section>
      )}

      {/* Barra de compra móvil */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-4 border-t border-hairline bg-paper/95 px-4 py-3 shadow-float backdrop-blur lg:hidden">
        <p className="text-xl font-extrabold tracking-tight tnum">{price}</p>
        <div className="flex-1">{cta('w-full')}</div>
      </div>

      <Modal open={!!open} onClose={() => setPreview(null)} title={open?.title ?? ''} description="Vista previa gratuita" size="lg">
        <RichTextView html={open?.content} />
        {open && !open.content && <p className="text-graphite">Esta lección no tiene contenido de vista previa.</p>}
      </Modal>
    </div>
  );
}
