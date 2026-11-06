import { Link } from 'react-router';
import { ArrowRight, BadgeCheck, MessageCircle, MessageCircleQuestion } from 'lucide-react';
import { useBrand } from '@/lib/brand';
import { ButtonLink } from '@/components/ui/Button';
import { courseNumber } from '@/lib/format';
import { useCourses, useFaqs, useStats, usePageTitle, type CourseCard } from '@/features/public/data';
import { Accordion, Wrap } from '@/features/public/parts';
import { VoiceWave } from '@/components/brand/Emblem';
import { Pillars } from '@/features/home/Pillars';
import { HeroBanner } from '@/features/home/HeroBanner';
import { Method } from '@/features/home/Method';
import { Certificate } from '@/features/home/Certificate';
import { CourseCardView } from '@/features/public/CourseCardView';

const sortBySerial = (list: CourseCard[]) => [...list].sort((a, b) => (courseNumber(a.code) ?? 999) - (courseNumber(b.code) ?? 999));
const H2 = 'text-[clamp(1.75rem,1.3rem+1.4vw,2.5rem)] font-extrabold leading-[1.05] tracking-[-0.03em]';

/* ------------------------------------------------------------------- Home */

export default function Home() {
  usePageTitle('Inicio');
  const brand = useBrand();
  const courses = useCourses({ pageSize: 9, sort: 'newest' });
  const stats = useStats();
  const faqs = useFaqs();
  const list = sortBySerial(courses.data?.data ?? []);

  const facts = [
    stats.data?.publishedCourses ? `${stats.data.publishedCourses} ${stats.data.publishedCourses === 1 ? 'curso abierto' : 'cursos abiertos'}` : null,
    stats.data?.competencies ? `${stats.data.competencies} competencias medidas con rúbrica` : null,
    '100 % online, acceso 24 h',
    'Certificado verificable',
  ].filter(Boolean) as string[];

  return (
    <>
      {/* Héroe */}
      <HeroBanner />
      <section className="bg-paper" aria-label="Datos de la academia">

        <div className="border-y border-hairline bg-sand">
          <Wrap>
            <ul className="flex flex-col gap-y-2 py-5 text-sm font-semibold text-graphite sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-8">
              {facts.map((f) => (
                <li key={f} className="inline-flex items-center gap-2">
                  <BadgeCheck className="size-4 shrink-0 text-orange-strong" strokeWidth={1.75} aria-hidden />
                  {f}
                </li>
              ))}
            </ul>
          </Wrap>
        </div>
      </section>

      {/* Cursos */}
      <Wrap>
        <section className="py-16 lg:py-24" aria-labelledby="cursos">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 id="cursos" className={H2}>
                Elige tu curso
              </h2>
              <p className="mt-3 max-w-2xl text-lg text-graphite">Formación práctica para hablar en público, comunicarte con asertividad y manejar conflictos.</p>
            </div>
            <Link to="/cursos" className="inline-flex shrink-0 items-center gap-2 font-semibold text-orange-strong underline-offset-4 hover:underline">
              Ver catálogo completo <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>

          {courses.isLoading ? (
            <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-busy>
              {Array.from({ length: 3 }).map((_, i) => (
                <li key={i} className="h-[26rem] animate-pulse rounded-xl bg-sand" />
              ))}
            </ul>
          ) : courses.isError ? (
            <div className="mt-10 rounded-xl border border-hairline bg-sand p-8 text-center" role="alert">
              <p className="text-xl font-bold">No pudimos cargar los cursos.</p>
              <button type="button" onClick={() => courses.refetch()} className="mt-2 font-semibold text-orange-strong underline underline-offset-4">
                Reintentar
              </button>
            </div>
          ) : list.length === 0 ? (
            <div className="mt-10 rounded-xl border border-hairline bg-sand p-8 text-center">
              <p className="text-xl font-bold">Muy pronto publicaremos nuevos cursos.</p>
              <Link to="/contacto" className="mt-2 inline-block font-semibold text-orange-strong underline underline-offset-4">
                Escríbenos para enterarte primero
              </Link>
            </div>
          ) : (
            <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((c) => (
                <CourseCardView key={c.id} course={c} />
              ))}
            </ul>
          )}
        </section>
      </Wrap>

      <Method />
      <Pillars />
      <Certificate />

      {faqs.data && faqs.data.length > 0 && (
        <Wrap>
          <section className="grid gap-10 py-16 lg:grid-cols-12 lg:gap-14 lg:py-24" aria-labelledby="faq">
            <div className="lg:col-span-4">
              <div className="lg:sticky lg:top-28">
                <h2 id="faq" className={H2}>
                  Preguntas frecuentes
                </h2>
                <p className="mt-4 max-w-sm text-lg leading-relaxed text-graphite sm:text-xl">Lo que más nos preguntan antes de inscribirse.</p>

                <div className="mt-8 rounded-2xl bg-sand p-6 sm:p-7">
                  <span className="grid size-12 place-items-center rounded-xl bg-paper text-orange-strong">
                    <MessageCircleQuestion className="size-6" strokeWidth={1.75} aria-hidden />
                  </span>
                  <p className="mt-4 text-xl font-bold leading-snug">¿No encuentras tu respuesta?</p>
                  <p className="mt-2 text-lg leading-relaxed text-graphite">Escríbenos y te respondemos personalmente.</p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    {brand.whatsapp && (
                      <a
                        href={`https://wa.me/${brand.whatsapp}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-12 items-center gap-2 rounded-lg bg-orange px-5 font-semibold text-paper no-underline transition-colors duration-150 hover:bg-orange-strong"
                      >
                        <MessageCircle className="size-5" strokeWidth={1.75} aria-hidden /> WhatsApp
                      </a>
                    )}
                    <Link
                      to="/contacto"
                      className="inline-flex h-12 items-center rounded-lg border border-line-strong bg-paper px-5 font-semibold text-ink no-underline transition-colors duration-150 hover:border-ink"
                    >
                      Contacto
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-8">
              <Accordion items={faqs.data.slice(0, 5)} defaultOpen={faqs.data[0]?.id ?? null} />
              <Link to="/preguntas-frecuentes" className="mt-8 inline-flex items-center gap-2 text-lg font-semibold text-orange-strong underline-offset-4 hover:underline">
                Ver todas las preguntas <ArrowRight className="size-5" aria-hidden />
              </Link>
            </div>
          </section>
        </Wrap>
      )}

      {/* Cierre */}
      <Wrap className="pb-16 lg:pb-24">
        <section className="relative overflow-hidden rounded-[1.75rem] bg-orange-tint px-6 py-14 sm:px-12 lg:px-16 lg:py-20" aria-labelledby="cierre">
          <VoiceWave bars={41} height={160} className="pointer-events-none absolute -right-10 bottom-0 !flex text-orange/20" />
          <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 id="cierre" className="max-w-2xl text-balance text-[clamp(2.25rem,1.4rem+2.6vw,3.75rem)] font-extrabold leading-[1] tracking-[-0.04em]">
                Empieza hoy tu entrenamiento.
              </h2>
              <p className="mt-4 max-w-lg text-lg text-graphite">Crea tu cuenta en un minuto y elige el curso con el que quieres empezar.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <ButtonLink to="/cursos" variant="primary" size="lg" className="rounded-lg!" iconRight={<ArrowRight className="size-4" aria-hidden />}>
                Ver cursos
              </ButtonLink>
              <ButtonLink to="/registro" variant="outline" size="lg" className="rounded-lg! border-line-strong! bg-paper! hover:bg-sand! hover:text-ink!">
                Crear cuenta
              </ButtonLink>
            </div>
          </div>
        </section>
      </Wrap>
    </>
  );
}
