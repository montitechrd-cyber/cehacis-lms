import { useState } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';
import { Pediment, Steps } from '@/components/brand/Emblem';
import { Wrap, rise } from './parts';

interface Competency {
  id: number;
  key: string;
  name: string;
  description: string | null;
  courses: number;
}
interface Group {
  name: string;
  competencies: Competency[];
}

/** Marca por forma: cuadro lleno = hay un curso publicado que la entrena; cuadro vacío = próximamente. */
function Mark({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 10 10" className="mt-[0.3em] size-2.5 shrink-0" aria-hidden>
      {filled ? <rect width="10" height="10" fill="currentColor" /> : <rect x=".75" y=".75" width="8.5" height="8.5" fill="none" stroke="currentColor" strokeWidth="1.5" />}
    </svg>
  );
}

/**
 * «Qué entrenamos»: el templo del logo como mapa de competencias.
 * Frontón (con la mariposa y las ondas) → friso que explica la competencia enfocada →
 * una columna por grupo de competencias → basamento escalonado.
 */
export function TrainingTemple() {
  const q = useQuery({
    queryKey: ['public', 'competencies'],
    queryFn: async () => (await api.get<{ data: Group[] }>('/public/competencies')).data,
    staleTime: 10 * 60 * 1000,
  });
  const groups = q.data ?? [];
  const all = groups.flatMap((g) => g.competencies.map((c) => ({ ...c, group: g.name })));
  const [activeId, setActiveId] = useState<number | null>(null);
  const active = all.find((c) => c.id === activeId) ?? null;
  const trained = all.filter((c) => c.courses > 0).length;

  if (q.isError || (!q.isLoading && groups.length === 0)) return null;

  return (
    <Wrap>
      <section className="border-t border-ink py-12 lg:py-20" aria-labelledby="que-entrenamos">
        <div className="grid gap-6 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-5">
            <h2 id="que-entrenamos" className="text-title font-bold">
              Qué entrenamos
            </h2>
          </div>
          <div className="lg:col-span-7">
            <p className="max-w-2xl text-lg leading-relaxed text-graphite">
              {all.length ? `${all.length} competencias interpersonales` : 'Las competencias interpersonales'} organizadas en {groups.length || 'cinco'} pilares. Cada una se
              practica con ejercicios guiados, se evalúa con rúbricas y queda en tu historial de progreso.
            </p>
            <p className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-graphite">
              <span className="inline-flex items-center gap-2">
                <Mark filled /> Con curso disponible{all.length ? ` (${trained})` : ''}
              </span>
              <span className="inline-flex items-center gap-2">
                <Mark filled={false} /> Próximamente
              </span>
            </p>
          </div>
        </div>

        {/* El templo */}
        <div className="mt-12">
          <Pediment className="h-[clamp(2.5rem,1.5rem+2.4vw,4.5rem)] text-ink" detail="var(--color-orange)" />
          {/* Friso: describe la competencia enfocada */}
          <div id="friso-competencia" className="flex min-h-[4.75rem] items-center gap-4 bg-ink px-5 py-3 text-paper sm:px-8" aria-live="polite">
            {active ? (
              <p className="text-sm leading-snug sm:text-[0.9375rem]">
                <span className="font-bold text-orange">{active.name}.</span> <span className="text-paper/85">{active.description}</span>
              </p>
            ) : (
              <p className="text-sm text-paper/75 sm:text-[0.9375rem]">Toca o pasa el cursor sobre una competencia para leer en qué consiste.</p>
            )}
          </div>
          <div className="h-1.5 bg-orange" aria-hidden />

          {/* Columnas: un pilar por grupo */}
          <div className="grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-5">
            {q.isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="min-h-72 animate-pulse bg-stone" aria-hidden />
                ))
              : groups.map((g, gi) => (
                  <div key={g.name} className="animate-rise flex flex-col bg-stone px-5 pb-8 pt-6" style={rise(gi)}>
                    {/* Capitel */}
                    <div className="mb-5 border-b-[3px] border-ink pb-3">
                      <h3 className="text-[1.0625rem] font-bold leading-tight tracking-tight">{g.name}</h3>
                      <p className="mt-0.5 text-xs text-muted tnum">
                        {g.competencies.length} {g.competencies.length === 1 ? 'competencia' : 'competencias'}
                      </p>
                    </div>
                    {/* Fuste */}
                    <ul className="flex-1 space-y-1">
                      {g.competencies.map((c) => {
                        const on = c.id === activeId;
                        return (
                          <li key={c.id}>
                            <button
                              type="button"
                              onMouseEnter={() => setActiveId(c.id)}
                              onFocus={() => setActiveId(c.id)}
                              onClick={() => setActiveId(c.id)}
                              aria-describedby={on ? 'friso-competencia' : undefined}
                              className={clsx(
                                'flex w-full items-start gap-2.5 rounded-sm px-2 py-1.5 text-left transition-colors',
                                on ? 'bg-ink text-paper' : c.courses > 0 ? 'text-ink hover:bg-paper' : 'text-graphite hover:bg-paper',
                              )}
                            >
                              <Mark filled={c.courses > 0} />
                              <span className="min-w-0 flex-1">
                                <span className="block text-[0.9375rem] font-semibold leading-snug">{c.name}</span>
                                <span className={clsx('block text-xs tnum', on ? 'text-paper/70' : 'text-muted')}>
                                  {c.courses > 0 ? `${c.courses} ${c.courses === 1 ? 'curso' : 'cursos'}` : 'Próximamente'}
                                </span>
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
          </div>
          <Steps className="h-5 text-ink sm:h-6" />
        </div>

        <div className="mt-8 flex justify-end">
          <Link to="/cursos" className="inline-flex items-center gap-2 font-semibold text-ink underline underline-offset-4">
            Ver los cursos que las entrenan <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>
    </Wrap>
  );
}
