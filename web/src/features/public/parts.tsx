import { useState, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router';
import clsx from 'clsx';
import { Check, Minus, Plus } from 'lucide-react';
import { ButtonLink } from '@/components/ui/Button';
import { RichTextView } from '@/components/ui/RichText';
import { LEVELS, courseNumber, courseSerial } from '@/lib/format';
import { priceLabel, type CourseCard } from './data';
import { Colonnade, TempleEmblem } from '@/components/brand/Emblem';

/** Contenedor de la retícula pública (1440 px, márgenes 16/32). */
export function Wrap({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx('mx-auto w-full max-w-[1440px] px-4 sm:px-8', className)}>{children}</div>;
}

export const rise = (i = 0): CSSProperties => ({ animationDelay: `${Math.min(i, 8) * 60}ms` });

/** Cabecera de página interior: título grotesco grande sobre regla; sin eyebrow. */
export function Masthead({ title, lead, children, tone = 'paper' }: { title: ReactNode; lead?: ReactNode; children?: ReactNode; tone?: 'paper' | 'orange' }) {
  return (
    <header className={clsx('relative isolate overflow-hidden', tone === 'orange' ? 'bg-orange' : 'border-b border-ink')}>
      {tone === 'orange' ? (
        <Colonnade className="-z-10 text-ink" opacity={0.06} />
      ) : (
        !children && (
          <TempleEmblem variant="line" strokeWidth={1} className="pointer-events-none absolute -bottom-6 right-[max(2rem,calc((100vw-1440px)/2+2rem))] -z-10 hidden w-56 text-line-strong lg:block" />
        )
      )}
      <Wrap className="grid gap-8 py-12 sm:py-16 lg:grid-cols-12 lg:py-20">
        <div className="animate-rise lg:col-span-8">
          <h1 className="text-display font-extrabold">{title}</h1>
          {lead && <p className={clsx('mt-6 max-w-2xl text-lg leading-relaxed', tone === 'orange' ? 'text-ink' : 'text-graphite')}>{lead}</p>}
        </div>
        {children && (
          <div className="animate-rise lg:col-span-4 lg:self-end" style={rise(1)}>
            {children}
          </div>
        )}
      </Wrap>
    </header>
  );
}

/** Imagen del curso o, si no existe, composición tipográfica con el número de serie. */
export function Cover({ course, className }: { course: Pick<CourseCard, 'imageUrl' | 'title' | 'code'>; className?: string }) {
  if (course.imageUrl) return <img src={course.imageUrl} alt={course.title} className={clsx('size-full object-cover', className)} loading="lazy" />;
  return (
    <div className={clsx('relative flex size-full items-end overflow-hidden bg-ink p-4 text-orange', className)} aria-hidden>
      <TempleEmblem variant="line" strokeWidth={1.2} className="absolute right-4 top-4 w-[38%] max-w-40 text-orange/70" />
      <span className="text-[clamp(3rem,9vw,6rem)] font-extrabold leading-[0.8] tracking-[-0.06em] tnum">{String(courseNumber(course.code) ?? '').padStart(2, '0')}</span>
    </div>
  );
}

/** Fila de cartelera: N.º, título, subtítulo, facilitadores, nivel, duración, precio, botón. */
export function CourseRow({ course, index = 0 }: { course: CourseCard; index?: number }) {
  const names = course.instructors.map((i) => `${i.firstName} ${i.lastName}`).join(', ');
  return (
    <li className="animate-rise grid gap-x-6 gap-y-3 border-b border-line py-6 lg:grid-cols-12 lg:items-start lg:py-8" style={rise(index)}>
      <p className="whitespace-nowrap text-sm font-bold text-orange-deep tnum lg:col-span-1 lg:pt-2">{courseSerial(course.code)}</p>
      <div className="min-w-0 lg:col-span-6">
        <h3 className="text-[clamp(1.2rem,1rem+0.6vw,1.5rem)] font-bold leading-[1.05] tracking-[-0.03em]">
          <Link to={`/cursos/${course.slug}`} className="text-ink no-underline hover:underline">
            {course.title}
          </Link>
        </h3>
        {course.subtitle && <p className="mt-2 max-w-xl text-graphite">{course.subtitle}</p>}
        {names && <p className="mt-2 text-sm text-muted">Facilita {names}</p>}
      </div>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm lg:col-span-2">
        <div>
          <dt className="text-muted">Nivel</dt>
          <dd className="font-semibold">{LEVELS[course.level] ?? course.level}</dd>
        </div>
        <div>
          <dt className="text-muted">Duración</dt>
          <dd className="font-semibold tnum">{course.durationHours ? `${course.durationHours} h` : '—'}</dd>
        </div>
      </dl>
      <div className="flex items-center justify-between gap-4 lg:col-span-3 lg:flex-col lg:items-end lg:gap-3">
        <p className="text-2xl font-bold tracking-tight tnum">{priceLabel(course)}</p>
        <ButtonLink to={`/cursos/${course.slug}`} variant="outline" size="md">
          Ver curso
        </ButtonLink>
      </div>
    </li>
  );
}

/** Texto largo: HTML saneado si lo trae; si no, párrafos. */
export function Description({ text, className }: { text?: string | null; className?: string }) {
  if (!text?.trim()) return null;
  if (/<[a-z][\s\S]*>/i.test(text)) return <RichTextView html={text} className={className} />;
  return (
    <div className={clsx('max-w-[70ch] space-y-4 text-[1.0625rem] leading-relaxed', className)}>
      {text.split(/\n{2,}/).map((p, i) => (
        <p key={i} className="whitespace-pre-line">
          {p}
        </p>
      ))}
    </div>
  );
}

/** Acordeón accesible: cada pregunta es un botón con aria-expanded. */
/** Acordeón de preguntas: tarjetas redondeadas con botón +/−; la abierta se resalta en naranja suave. */
export function Accordion({ items, defaultOpen = null }: { items: { id: number | string; question: string; answer: string }[]; defaultOpen?: number | string | null }) {
  const [open, setOpen] = useState<number | string | null>(defaultOpen);
  return (
    <ul className="flex flex-col gap-3">
      {items.map((f) => {
        const isOpen = open === f.id;
        return (
          <li
            key={f.id}
            className={clsx(
              'rounded-2xl border transition-colors duration-200 ease-out',
              isOpen ? 'border-orange/30 bg-orange-tint' : 'border-hairline bg-paper hover:border-line-strong',
            )}
          >
            <h3>
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={`faq-${f.id}`}
                id={`faq-btn-${f.id}`}
                onClick={() => setOpen(isOpen ? null : f.id)}
                className="flex w-full items-center justify-between gap-6 px-5 py-5 text-left text-lg font-bold leading-snug tracking-[-0.01em] sm:px-7 sm:py-6 sm:text-xl"
              >
                <span>{f.question}</span>
                <span
                  className={clsx(
                    'grid size-10 shrink-0 place-items-center rounded-full transition-colors duration-200',
                    isOpen ? 'bg-orange text-paper' : 'bg-sand text-ink',
                  )}
                  aria-hidden
                >
                  {isOpen ? <Minus className="size-5" strokeWidth={2} /> : <Plus className="size-5" strokeWidth={2} />}
                </span>
              </button>
            </h3>
            <div
              id={`faq-${f.id}`}
              role="region"
              aria-labelledby={`faq-btn-${f.id}`}
              hidden={!isOpen}
              className="px-5 pb-6 text-graphite sm:px-7 sm:pb-7 sm:pr-24 [&_p]:text-lg"
            >
              <Description text={f.answer} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** Sección con regla de tinta: título a la izquierda (4 col) y contenido a la derecha (8 col). */
export function Block({ title, children, className }: { title: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={clsx('border-t border-ink py-10 lg:grid lg:grid-cols-12 lg:gap-8 lg:py-14', className)}>
      <h2 className="mb-6 min-w-0 text-[clamp(1.25rem,1rem+0.7vw,1.625rem)] font-bold leading-[1.05] tracking-[-0.03em] [hyphens:auto] [text-wrap:balance] lg:col-span-4 lg:mb-0">{title}</h2>
      <div className="min-w-0 lg:col-span-8">{children}</div>
    </section>
  );
}

/** Pantallas de acceso: formulario a la izquierda, campo naranja con el lema a la derecha. */
export function AuthSplit({ title, lead, children, tagline }: { title: string; lead?: ReactNode; children: ReactNode; tagline: string }) {
  return (
    <div className="grid min-h-[calc(100dvh-4rem)] lg:grid-cols-12">
      <div className="px-4 py-10 sm:px-8 lg:col-span-7 lg:flex lg:items-center lg:justify-center lg:py-16">
        <div className="mx-auto w-full max-w-md animate-rise">
          <h1 className="text-title font-extrabold">{title}</h1>
          {lead && <p className="mt-3 text-graphite">{lead}</p>}
          <div className="mt-8">{children}</div>
        </div>
      </div>
      {/* Campo naranja con el lema y lo que incluye el campus */}
      <aside className="order-last flex items-center bg-orange-strong px-4 py-12 text-paper sm:px-8 lg:order-none lg:col-span-5 lg:px-12 lg:py-16 xl:px-16" aria-hidden>
        <div className="mx-auto w-full max-w-lg">
          <p className="text-[clamp(1.875rem,1.2rem+2vw,3rem)] font-extrabold leading-[1.02] tracking-[-0.035em]">{tagline}</p>
          <ul className="mt-10 space-y-4 text-lg font-semibold">
            {['Cursos 100% online, a tu ritmo', 'Práctica guiada con retroalimentación', 'Certificado verificable con código y QR'].map((t) => (
              <li key={t} className="flex items-start gap-3">
                <span className="mt-1 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-paper text-orange-strong">
                  <Check className="size-3.5" strokeWidth={3} />
                </span>
                {t}
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}

export function safeNext(next: string | null): string | null {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.includes('\\')) return null;
  return next;
}
