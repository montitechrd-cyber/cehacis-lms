import { useState } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { Bot, ChevronDown, Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '@/lib/api';
import { useAction } from '@/lib/hooks';
import { COMPETENCY_SOURCE, date, fullName, num } from '@/lib/format';
import { PageHeader, Section } from '@/components/ui/Page';
import { Alert, EmptyState } from '@/components/ui/Feedback';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Tag } from '@/components/ui/Data';
import { Q } from '@/features/campus/shared';

interface HistoryItem {
  id: number;
  score: number;
  scaleMax: number;
  source: string;
  course: { id: number; title: string } | null;
  evaluator: { id: number; firstName: string; lastName: string } | null;
  notes: string | null;
  isReviewed: boolean;
  recordedAt: string;
}
interface CompRow {
  competency: { id: number; key: string; name: string; group: string | null };
  latest: { score: number; scaleMax: number; source: string; recordedAt: string };
  average: number;
  count: number;
  trend: number;
  history: HistoryItem[];
}
interface Recommendation {
  type: 'course' | 'activity' | 'exercise';
  refId: number | null;
  courseId: number | null;
  title: string;
  reason: string;
}

const norm = (score: number, max: number) => (max > 0 ? (score / max) * 5 : 0);

function Trend({ value }: { value: number }) {
  if (Math.abs(value) < 0.05)
    return (
      <span className="inline-flex items-center gap-1 text-graphite">
        <Minus className="size-3.5" aria-hidden /> Sin cambio
      </span>
    );
  const up = value > 0;
  return (
    <span className="inline-flex items-center gap-1 font-semibold">
      {up ? <TrendingUp className="size-3.5" aria-hidden /> : <TrendingDown className="size-3.5" aria-hidden />}
      {up ? '+' : '−'}
      {num(Math.abs(value), 1)}
      <span className="sr-only">{up ? ' en aumento' : ' en descenso'}</span>
    </span>
  );
}

/** Barra segmentada de 5 cuadros: llenos en tinta según la nota; el último, parcial. */
function SegBar({ value, focus }: { value: number; focus?: boolean }) {
  return (
    <span className="flex items-center gap-2" role="img" aria-label={`${num(value, 1)} de 5${focus ? ', foco de mejora' : ''}`}>
      <span className="flex gap-[3px]">
        {[0, 1, 2, 3, 4].map((k) => {
          const pct = Math.max(0, Math.min(1, value - k)) * 100;
          return (
            <span key={k} className="relative h-3 w-8 bg-stone-2 sm:w-10">
              <span className="absolute inset-y-0 left-0 bg-ink" style={{ width: `${pct}%` }} />
            </span>
          );
        })}
      </span>
      {/* El hueco del marcador existe siempre para que todas las barras arranquen alineadas. */}
      <span className={focus ? 'size-2.5 shrink-0 bg-orange' : 'size-2.5 shrink-0'} title={focus ? 'Foco de mejora' : undefined} aria-hidden />

    </span>
  );
}

function Row({ row, focus }: { row: CompRow; focus?: boolean }) {
  const level = norm(row.latest.score, row.latest.scaleMax);
  const [open, setOpen] = useState(false);
  const chart = row.history.map((h) => ({ fecha: date(h.recordedAt, { day: 'numeric', month: 'short' }), valor: Number(norm(h.score, h.scaleMax).toFixed(2)) }));
  return (
    <li>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="grid w-full grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 py-4 text-left hover:bg-stone sm:grid-cols-[1.6fr_auto_6rem_6rem_5rem_auto]"
      >
        <span className="min-w-0 font-semibold">
          {row.competency.name}
          {row.competency.group && <span className="block text-xs font-normal text-muted">{row.competency.group}</span>}
        </span>
        <span className="hidden sm:block"><SegBar value={level} focus={focus} /></span>
        <span className="tnum whitespace-nowrap text-xl font-bold sm:text-base">
          {num(level, 1)}
          <span className="text-xs font-normal text-muted"> / 5</span>
        </span>
        <span className="hidden text-sm sm:block">
          <Trend value={row.trend} />
        </span>
        <span className="hidden tnum text-sm text-graphite sm:block">{row.count} eval.</span>
        <ChevronDown className={clsx('size-4 transition-transform', open && 'rotate-180')} aria-hidden />
        <span className="col-span-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-graphite sm:hidden">
          <SegBar value={level} focus={focus} />
          <Trend value={row.trend} />
          <span>{row.count} eval.</span>
        </span>
      </button>
      {open && (
        <div className="animate-fade border-t border-line bg-stone px-4 py-5">
          {chart.length > 1 ? (
            <div className="h-44 w-full" aria-label={`Evolución de ${row.competency.name}`}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chart} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="var(--color-line)" vertical={false} />
                  <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="linear" dataKey="valor" name="Valor (0-5)" stroke="var(--color-ink)" strokeWidth={2} dot={{ r: 3, fill: 'var(--color-ink)' }} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-graphite">Aún hay un solo registro; la línea de tiempo aparecerá con más evaluaciones.</p>
          )}
          <ol className="mt-4 divide-y divide-line border-y border-line bg-paper text-sm">
            {[...row.history].reverse().map((h) => (
              <li key={h.id} className="grid gap-x-4 gap-y-1 px-3 py-2.5 sm:grid-cols-[110px_70px_1fr]">
                <span className="tnum text-graphite">{date(h.recordedAt)}</span>
                <span className="tnum font-bold">
                  {num(h.score, 1)}/{h.scaleMax}
                </span>
                <span className="flex flex-wrap items-center gap-2">
                  <Tag tone="outline">{COMPETENCY_SOURCE[h.source] ?? h.source}</Tag>
                  {h.evaluator && <span className="text-graphite">{fullName(h.evaluator)}</span>}
                  {h.course && <span className="text-muted">{h.course.title}</span>}
                  {!h.isReviewed && <Tag tone="warning">Pendiente de revisión</Tag>}
                  {h.notes && <span className="basis-full whitespace-pre-wrap text-graphite">{h.notes}</span>}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </li>
  );
}

const recoLink = (r: Recommendation) => {
  if (r.type === 'course' && r.refId) return `/campus/cursos/${r.refId}`;
  if (r.type === 'activity' && r.refId) return `/campus/practicas/${r.refId}`;
  if (r.courseId) return `/campus/cursos/${r.courseId}`;
  return null;
};
const recoType = { course: 'Curso', activity: 'Actividad', exercise: 'Ejercicio' };

export default function Competencies() {
  const q = useQuery({ queryKey: ['competencies', 'me'], queryFn: () => api.get<{ competencies: CompRow[] }>('/competencies/me') });
  const [reco, setReco] = useState<{ source: 'ia' | 'reglas'; recommendations: Recommendation[] } | null>(null);
  const recommend = useAction(() => api.post<{ source: 'ia' | 'reglas'; recommendations: Recommendation[] }>('/ai/recommendations'), { onSuccess: setReco });

  return (
    <div className="animate-rise">
      <PageHeader
        title="Mis competencias"
        description="Tu perfil comunicativo según evaluaciones de rúbricas, facilitadores, autoevaluaciones y práctica con IA."
        actions={
          <Button variant="primary" icon={<Bot className="size-4" />} loading={recommend.isPending} onClick={() => recommend.mutate()}>
            Recomendaciones para mí
          </Button>
        }
      />
      <Alert tone="info" title="Retroalimentación formativa">
        Las evaluaciones automatizadas son formativas y no constituyen diagnósticos psicológicos ni mediciones objetivas. Un facilitador puede revisarlas y ajustarlas.
      </Alert>

      {reco && (
        <Section title="Recomendaciones" className="mt-10" description={reco.source === 'ia' ? 'Generadas con inteligencia artificial a partir de tus competencias.' : 'Sugeridas por reglas del sistema (sin IA) a partir de tus competencias y cursos.'}>
          {reco.recommendations.length === 0 ? (
            <p className="text-sm text-graphite">No hay recomendaciones por ahora.</p>
          ) : (
            <ul className="divide-y divide-line border-y border-line">
              {reco.recommendations.map((r, i) => {
                const to = recoLink(r);
                return (
                  <li key={i} className="flex flex-wrap items-start justify-between gap-3 py-3">
                    <div className="min-w-0 max-w-2xl">
                      <Tag tone="outline">{recoType[r.type]}</Tag>
                      <p className="mt-1 font-semibold">{r.title}</p>
                      <p className="text-sm text-graphite">{r.reason}</p>
                    </div>
                    {to && (
                      <ButtonLink to={to} variant="outline" size="sm">
                        Abrir
                      </ButtonLink>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Section>
      )}

      <div className="mt-10">
        <Q query={q}>
          {({ competencies }) => {
            const sorted = [...competencies].sort((a, b) => norm(b.latest.score, b.latest.scaleMax) - norm(a.latest.score, a.latest.scaleMax));
            return competencies.length === 0 ? (
              <EmptyState
                title="Aún no tienes competencias registradas"
                description="Se registran al completar evaluaciones con rúbrica, recibir la valoración de un facilitador o practicar en el entrenador con IA."
                action={<ButtonLink to="/campus/ia" variant="ink">Ir al entrenador con IA</ButtonLink>}
              />
            ) : (
              <>
                <Section title="Perfil por competencia" description="Último valor en escala de 0 a 5, de mayor a menor. Selecciona una fila para ver su historial.">
                  <ul className="divide-y divide-line border-y border-line">
                    {sorted.map((c, i) => (
                      <Row key={c.competency.id} row={c} focus={sorted.length > 1 && i === sorted.length - 1} />
                    ))}
                  </ul>
                </Section>
              </>
            );
          }}
        </Q>
      </div>
      <p className="text-sm text-graphite">
        ¿Quieres practicar? <Link to="/campus/ia" className="font-semibold text-ink underline">Abre el entrenador con IA</Link>.
      </p>
    </div>
  );
}
