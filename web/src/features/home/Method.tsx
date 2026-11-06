import { useState, type ReactNode } from 'react';
import clsx from 'clsx';
import { ArrowLeft, ArrowRight, BadgeCheck, Bot, Check, Lock, PlayCircle, UserRound } from 'lucide-react';
import { Button, ButtonLink } from '@/components/ui/Button';
import { TempleEmblem } from '@/components/brand/Emblem';
import { Wrap } from '@/features/public/parts';

/* Vistas del aula de ejemplo, dibujadas en código. Todo es ilustrativo (lo indica la etiqueta «Ejemplo»). */

const LESSONS = ['Bienvenida al curso', 'El miedo escénico', 'Respiración y voz', 'Estructura del discurso', 'Tu primera presentación'];

function LessonRow({ i, state, label }: { i: number; state: 'done' | 'current' | 'next' | 'locked'; label: string }) {
  return (
    <li
      className={clsx(
        'flex items-center gap-3 rounded-xl border px-4 py-3',
        state === 'current' ? 'border-orange/40 bg-orange-tint' : 'border-hairline bg-paper',
        state === 'locked' && 'opacity-60',
      )}
    >
      <span
        className={clsx(
          'grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold tnum',
          state === 'done' && 'bg-orange text-paper',
          state === 'current' && 'border-2 border-orange text-orange-strong',
          (state === 'next' || state === 'locked') && 'bg-sand text-graphite',
        )}
      >
        {state === 'done' ? <Check className="size-4" strokeWidth={2.5} /> : state === 'locked' ? <Lock className="size-3.5" strokeWidth={2} /> : i}
      </span>
      <span className={clsx('min-w-0 flex-1 truncate text-base', state === 'current' ? 'font-bold' : 'font-medium')}>{label}</span>
      {state === 'current' && <span className="shrink-0 text-sm font-semibold text-orange-strong">Estás aquí</span>}
      {state === 'locked' && <span className="shrink-0 text-sm text-muted">Bloqueada</span>}
    </li>
  );
}

function Navigation() {
  return (
    <ol className="flex flex-col gap-2">
      {LESSONS.map((l, i) => (
        <LessonRow key={l} i={i + 1} label={l} state={i < 2 ? 'done' : i === 2 ? 'current' : 'next'} />
      ))}
    </ol>
  );
}

function Sequence() {
  return (
    <ol className="flex flex-col gap-2">
      {LESSONS.map((l, i) => (
        <LessonRow key={l} i={i + 1} label={l} state={i < 1 ? 'done' : i === 1 ? 'current' : 'locked'} />
      ))}
    </ol>
  );
}

const RUBRIC = [
  { name: 'Claridad del mensaje', score: 4 },
  { name: 'Voz y ritmo', score: 3 },
  { name: 'Lenguaje corporal', score: 4 },
  { name: 'Conexión con el público', score: 3 },
];

function Rubric() {
  return (
    <div className="rounded-xl border border-hairline p-5">
      <div className="flex items-baseline justify-between gap-4">
        <p className="font-bold">Práctica: presentación de 3 minutos</p>
        <p className="text-sm text-muted">Escala 1–5</p>
      </div>
      <ul className="mt-5 flex flex-col gap-4">
        {RUBRIC.map((r, i) => (
          <li key={r.name}>
            <div className="flex items-baseline justify-between gap-4 text-base">
              <span className="font-medium">{r.name}</span>
              <span className="font-bold tnum">{r.score}/5</span>
            </div>
            <div className="mt-2 grid grid-cols-5 gap-1.5" aria-hidden>
              {[1, 2, 3, 4, 5].map((n) => (
                <span key={n} className="h-2 overflow-hidden rounded-full bg-sand">
                  {n <= r.score && (
                    <span className="block h-full origin-left animate-grow bg-orange motion-reduce:animate-none" style={{ animationDelay: `${i * 120 + n * 60}ms` }} />
                  )}
                </span>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Bubble({ who, children }: { who: 'ai' | 'me'; children: ReactNode }) {
  const ai = who === 'ai';
  return (
    <div className={clsx('flex items-end gap-2.5', !ai && 'flex-row-reverse')}>
      <span className={clsx('grid size-8 shrink-0 place-items-center rounded-full', ai ? 'bg-ink text-paper' : 'bg-orange-tint text-orange-strong')}>
        {ai ? <Bot className="size-4" strokeWidth={1.75} /> : <UserRound className="size-4" strokeWidth={1.75} />}
      </span>
      <p className={clsx('max-w-[80%] rounded-2xl px-4 py-3 text-base leading-snug', ai ? 'rounded-bl-md bg-sand' : 'rounded-br-md bg-orange text-paper')}>{children}</p>
    </div>
  );
}

function Coach() {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-semibold text-muted">Simulación · Entrevista laboral</p>
      <Bubble who="ai">Cuéntame de un momento en que resolviste un desacuerdo en tu equipo.</Bubble>
      <Bubble who="me">Escuché a las dos partes por separado y propuse una reunión con un objetivo común.</Bubble>
      <Bubble who="ai">Buen inicio. Prueba a cerrar con el resultado concreto que lograron.</Bubble>
      <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-graphite">
        <BadgeCheck className="size-4 text-orange-strong" strokeWidth={1.75} aria-hidden /> Un facilitador revisa la práctica
      </p>
    </div>
  );
}

// Patrón fijo tipo QR (decorativo).
const QR = Array.from({ length: 81 }, (_, i) => ((i * 7 + (i % 9) * 3 + Math.floor(i / 9) * 5) % 5 < 3 ? '1' : '0'));

function Certificate() {
  return (
    <div className="rounded-xl border border-hairline p-5 text-center">
      <TempleEmblem className="mx-auto h-9 w-auto text-orange" title="" />
      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted">Certificado de aprobación</p>
      <p className="mt-2 text-2xl font-extrabold tracking-tight">Nombre del estudiante</p>
      <p className="mt-1 text-base text-graphite">Curso de Oratoria</p>
      <div className="mt-5 flex items-center justify-between gap-4 border-t border-hairline pt-4 text-left">
        <div>
          <p className="text-sm text-muted">Código de verificación</p>
          <p className="font-mono text-base font-semibold">CEH-0000-EJEMPLO</p>
        </div>
        <div className="grid size-14 shrink-0 grid-cols-9 gap-px" aria-hidden>
          {QR.map((b, i) => (
            <span key={i} className={b === '1' ? 'bg-ink' : 'bg-transparent'} />
          ))}
        </div>
      </div>
    </div>
  );
}

const STEPS = [
  { id: 1, title: 'Navegación lineal', text: 'Avanzas con Anterior y Siguiente: siempre sabes en qué lección estás y cuál sigue.', view: <Navigation /> },
  { id: 2, title: 'Secuencia guiada', text: 'Cada lección se desbloquea al completar la anterior, para que la práctica se construya sobre lo ya dominado.', view: <Sequence /> },
  { id: 3, title: 'Prácticas con rúbrica', text: 'Role-playing, oratoria y conversaciones difíciles evaluados por competencia con criterios claros.', view: <Rubric /> },
  { id: 4, title: 'Entrenador con IA', text: 'Practica con un entrenador conversacional; un facilitador revisa y tiene la última palabra.', view: <Coach /> },
  { id: 5, title: 'Certificado verificable', text: 'Al completar recibes un certificado con código y QR que cualquiera puede comprobar.', view: <Certificate /> },
];

/** Sección «Cómo aprendes»: pasos numerados a la izquierda y un aula de ejemplo que cambia con cada paso. */
export function Method() {
  const [current, setCurrent] = useState(1);
  const step = STEPS[current - 1];
  const last = current === STEPS.length;

  return (
    <section className="bg-sand py-16 lg:py-24" aria-labelledby="como-aprendes">
      <Wrap>
        <div className="grid gap-10 lg:grid-cols-12 lg:items-start lg:gap-14">
          <div className="lg:col-span-5">
            <h2 id="como-aprendes" className="text-[clamp(2rem,1.4rem+1.8vw,3rem)] font-extrabold leading-[1.05] tracking-[-0.03em]">
              Cómo aprendes
            </h2>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-graphite sm:text-xl">
              Un aula virtual pensada para que practiques, no solo para que consumas contenido.
            </p>

            <ol className="mt-8 flex flex-col">
              {STEPS.map((s, i) => {
                const active = s.id === current;
                const done = s.id < current;
                return (
                  <li key={s.id} className="relative pl-14">
                    {i < STEPS.length - 1 && (
                      <span className={clsx('absolute bottom-0 left-[1.1875rem] top-11 w-0.5 rounded-full', done ? 'bg-orange' : 'bg-hairline')} aria-hidden />
                    )}
                    <button
                      type="button"
                      onClick={() => setCurrent(s.id)}
                      aria-current={active ? 'step' : undefined}
                      className="group w-full pb-5 text-left"
                    >
                      <span
                        className={clsx(
                          'absolute left-0 top-0 grid size-10 place-items-center rounded-full text-base font-bold transition-colors duration-200 tnum',
                          active ? 'bg-orange text-paper' : done ? 'bg-orange-tint text-orange-strong' : 'border border-line-strong bg-paper text-graphite group-hover:border-ink',
                        )}
                      >
                        {done ? <Check className="size-5" strokeWidth={2.5} aria-hidden /> : s.id}
                      </span>
                      <span className={clsx('block pt-1.5 text-lg leading-snug sm:text-xl', active ? 'font-bold text-ink' : 'font-semibold text-graphite group-hover:text-ink')}>
                        {s.title}
                      </span>
                      {active && <span className="mt-1.5 block animate-rise text-base leading-relaxed text-graphite motion-reduce:animate-none sm:text-lg">{s.text}</span>}
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>

          {/* Aula de ejemplo */}
          <div className="min-w-0 overflow-hidden rounded-2xl border border-hairline bg-paper shadow-float lg:sticky lg:top-24 lg:col-span-7">
            <div className="flex items-center justify-between gap-4 border-b border-hairline px-5 py-4 sm:px-7">
              <p className="inline-flex min-w-0 items-center gap-2 truncate text-base font-semibold text-ink">
                <PlayCircle className="size-5 shrink-0 text-orange-strong" strokeWidth={1.75} aria-hidden />
                <span className="truncate">Aula de ejemplo · Curso de Oratoria</span>
              </p>
              <span className="shrink-0 rounded-md bg-orange-tint px-2.5 py-1 text-sm font-semibold text-orange-strong">Ejemplo</span>
            </div>

            <div className="h-1.5 w-full bg-sand" role="progressbar" aria-valuemin={0} aria-valuemax={STEPS.length} aria-valuenow={current} aria-label="Progreso del ejemplo">
              <div className="h-full bg-orange transition-[width] duration-500 ease-out-quint motion-reduce:transition-none" style={{ width: `${(current / STEPS.length) * 100}%` }} />
            </div>

            <div aria-live="polite" className="px-5 py-6 sm:px-7 sm:py-8">
              <div key={current} className="animate-rise motion-reduce:animate-none">
                <p className="text-sm font-semibold text-muted tnum">Paso {current} de {STEPS.length}</p>
                <h3 className="mt-1 text-[clamp(1.5rem,1.2rem+1vw,2rem)] font-extrabold leading-tight tracking-[-0.03em]">{step.title}</h3>
                <div className="mt-6 min-h-[19rem]">{step.view}</div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-hairline px-5 py-4 sm:px-7">
              <Button
                variant="outline"
                size="md"
                className="h-11! rounded-lg! border-line-strong! px-5 hover:bg-sand! hover:text-ink!"
                icon={<ArrowLeft className="size-4" aria-hidden />}
                disabled={current === 1}
                onClick={() => setCurrent((c) => Math.max(1, c - 1))}
              >
                Anterior
              </Button>
              {last ? (
                <ButtonLink to="/cursos" variant="primary" size="md" className="h-11! rounded-lg! px-5" iconRight={<ArrowRight className="size-4" aria-hidden />}>
                  Elegir un curso
                </ButtonLink>
              ) : (
                <Button variant="primary" size="md" className="h-11! rounded-lg! px-5" iconRight={<ArrowRight className="size-4" aria-hidden />} onClick={() => setCurrent((c) => Math.min(STEPS.length, c + 1))}>
                  Siguiente
                </Button>
              )}
            </div>
          </div>
        </div>
      </Wrap>
    </section>
  );
}
