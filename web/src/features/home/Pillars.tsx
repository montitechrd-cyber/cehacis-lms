import { useRef, useState, type KeyboardEvent } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import {
  ArrowLeftRight, ArrowRight, Brain, Compass, Ear, Hand, Handshake, HeartHandshake, HeartPulse, Lightbulb,
  Megaphone, MessageCircleWarning, MessageSquareText, MessagesSquare, Mic, PersonStanding, Scale, Sparkles, Users,
  type LucideIcon,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Wrap } from '@/features/public/parts';

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

const PILLAR_ICON: Record<string, LucideIcon> = {
  'Comunicación': MessagesSquare,
  'Inteligencia social': Users,
  'Influencia': Megaphone,
  'Liderazgo': Compass,
  'Pensamiento': Brain,
};
const SKILL_ICON: Record<string, LucideIcon> = {
  comunicacion_verbal: MessageSquareText,
  comunicacion_no_verbal: Hand,
  escucha_activa: Ear,
  oratoria: Mic,
  expresion_corporal: PersonStanding,
  conversaciones_dificiles: MessageCircleWarning,
  empatia: HeartHandshake,
  inteligencia_emocional: HeartPulse,
  relaciones_interpersonales: Users,
  asertividad: Scale,
  negociacion: ArrowLeftRight,
  persuasion: Megaphone,
  resolucion_conflictos: Handshake,
  liderazgo: Compass,
  pensamiento_critico: Lightbulb,
};

const PILLAR_INTRO: Record<string, string> = {
  'Comunicación': 'Expresar ideas con claridad, escuchar de verdad y sostener la presencia ante otros.',
  'Inteligencia social': 'Leer a las personas y al contexto, conectar con empatía y construir relaciones de confianza.',
  'Influencia': 'Defender tu postura, negociar y convencer con respeto y argumentos.',
  'Liderazgo': 'Orientar a otros, resolver desacuerdos y llevar al equipo hacia objetivos comunes.',
  'Pensamiento': 'Analizar con criterio y fundamentar lo que dices y decides.',
};

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** «Qué entrenamos»: pestañas por pilar y un panel con la presentación del pilar y la lista de sus competencias. */
export function Pillars() {
  const q = useQuery({
    queryKey: ['public', 'competencies'],
    queryFn: async () => (await api.get<{ data: Group[] }>('/public/competencies')).data,
    staleTime: 10 * 60 * 1000,
  });
  const groups = q.data ?? [];
  const total = groups.reduce((n, g) => n + g.competencies.length, 0);
  const [picked, setPicked] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  if (q.isError || (!q.isLoading && groups.length === 0)) return null;

  const index = Math.min(picked, Math.max(groups.length - 1, 0));
  const group = groups[index];

  // Teclado de pestañas (WAI-ARIA): flechas, Inicio y Fin mueven el foco y la selección.
  const onKey = (e: KeyboardEvent) => {
    const last = groups.length - 1;
    const next = { ArrowRight: index + 1, ArrowDown: index + 1, ArrowLeft: index - 1, ArrowUp: index - 1, Home: 0, End: last }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    const i = next < 0 ? last : next > last ? 0 : next;
    setPicked(i);
    tabs.current[i]?.focus();
  };

  const PillarIcon = group ? (PILLAR_ICON[group.name] ?? Sparkles) : Sparkles;

  return (
    <section className="bg-paper py-16 lg:py-24" aria-labelledby="que-entrenamos">
      <Wrap>
        <div className="sm:flex sm:items-end sm:justify-between sm:gap-8">
          <div>
            <h2 id="que-entrenamos" className="text-[clamp(2rem,1.4rem+1.8vw,3rem)] font-extrabold leading-[1.05] tracking-[-0.03em]">
              Qué entrenamos
            </h2>
            <p className="mt-3 max-w-2xl text-lg text-graphite sm:text-xl">
              {q.isLoading ? 'Competencias interpersonales' : `${total} competencias interpersonales`} en {q.isLoading ? 'varios' : groups.length} pilares. Cada curso las mide con rúbrica.
            </p>
          </div>
          <Link to="/cursos" className="mt-4 inline-flex shrink-0 items-center gap-2 text-lg font-semibold text-orange-strong sm:mt-0">
            Ver los cursos <ArrowRight className="size-5" strokeWidth={1.75} />
          </Link>
        </div>

        {/* Pilares: pestañas horizontales (desplazables en móvil) */}
        <div className="-mx-4 mt-10 overflow-x-auto px-4 pb-1 sm:-mx-8 sm:px-8 lg:mx-0 lg:mt-12 lg:px-0" aria-busy={q.isLoading}>
          {q.isLoading ? (
            <div className="flex gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 w-44 shrink-0 animate-pulse rounded-full bg-sand" />
              ))}
            </div>
          ) : (
            <div role="tablist" aria-label="Pilares" className="flex gap-2 lg:flex-wrap" onKeyDown={onKey}>
              {groups.map((g, i) => {
                const on = i === index;
                const Icon = PILLAR_ICON[g.name] ?? Sparkles;
                return (
                  <button
                    key={g.name}
                    ref={(el) => { tabs.current[i] = el; }}
                    type="button"
                    role="tab"
                    id={`pilar-tab-${i}`}
                    aria-selected={on}
                    aria-controls="pilar-panel"
                    tabIndex={on ? 0 : -1}
                    onClick={() => setPicked(i)}
                    className={clsx(
                      'flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-full border py-3 pl-4 pr-5 text-base font-semibold transition-colors duration-150 ease-out sm:text-lg',
                      on ? 'border-ink bg-ink text-paper' : 'border-hairline bg-paper text-ink hover:border-line-strong hover:bg-sand',
                    )}
                  >
                    <Icon className={clsx('size-5 shrink-0', on ? 'text-orange' : 'text-graphite')} strokeWidth={1.75} aria-hidden />
                    {g.name}
                    <span className={clsx('rounded-full px-2 py-0.5 text-sm tnum', on ? 'bg-paper/15 text-paper' : 'bg-sand text-graphite')}>{g.competencies.length}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Panel del pilar elegido */}
        {q.isLoading || !group ? (
          <div className="mt-6 h-96 animate-pulse rounded-2xl bg-sand" />
        ) : (
          <div
            id="pilar-panel"
            role="tabpanel"
            aria-labelledby={`pilar-tab-${index}`}
            tabIndex={0}
            className="mt-6 grid gap-8 rounded-2xl bg-sand p-5 sm:p-10 lg:grid-cols-12 lg:gap-12 lg:p-14"
          >
            <div key={`h-${group.name}`} className="animate-rise motion-reduce:animate-none lg:col-span-4">
              <span className="grid size-16 place-items-center rounded-2xl bg-orange text-paper">
                <PillarIcon className="size-8" strokeWidth={1.75} aria-hidden />
              </span>
              <h3 className="mt-6 text-[clamp(1.75rem,1.4rem+1.2vw,2.5rem)] font-extrabold leading-[1.05] tracking-[-0.03em]">{group.name}</h3>
              <p className="mt-4 text-lg leading-relaxed text-graphite">{PILLAR_INTRO[group.name] ?? 'Competencias que se practican en los cursos y se evalúan con rúbrica.'}</p>
              <p className="mt-6 text-base font-semibold tnum">{plural(group.competencies.length, 'competencia', 'competencias')}</p>
            </div>

            <ul key={group.name} className="divide-y divide-hairline lg:col-span-8">
              {group.competencies.map((c, i) => {
                const Icon = SKILL_ICON[c.key] ?? Sparkles;
                return (
                  <li
                    key={c.id}
                    className="flex animate-rise gap-4 py-6 sm:gap-5 first:pt-0 last:pb-0 motion-reduce:animate-none"
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-paper text-orange-strong sm:size-12">
                      <Icon className="size-6" strokeWidth={1.75} aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                        <h4 className="text-xl font-bold leading-snug tracking-[-0.01em] sm:text-[1.375rem]">{c.name}</h4>
                        <span className={clsx('text-base font-semibold tnum', c.courses > 0 ? 'text-orange-strong' : 'text-muted')}>
                          {c.courses > 0 ? `En ${plural(c.courses, 'curso', 'cursos')}` : 'Próximamente'}
                        </span>
                      </div>
                      <p className="mt-2 text-lg leading-relaxed text-graphite">
                        {c.description ?? 'Se trabaja con prácticas guiadas y se evalúa con rúbrica.'}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </Wrap>
    </section>
  );
}
