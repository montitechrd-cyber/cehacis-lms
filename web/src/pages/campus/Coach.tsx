import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { ArrowRight, BookOpenCheck } from 'lucide-react';
import { api, type Paged } from '@/lib/api';
import { useAction } from '@/lib/hooks';
import { LEVELS, date, serial } from '@/lib/format';
import { PageHeader, Section } from '@/components/ui/Page';
import { Alert, EmptyState } from '@/components/ui/Feedback';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Tag, statusTone } from '@/components/ui/Data';
import { Q } from '@/features/campus/shared';

export interface Scenario {
  id: number;
  key: string;
  title: string;
  description: string;
  objectives: string[];
  difficulty: string;
  competencies: { id: number; key: string; name: string }[];
}
interface SimRow {
  id: number;
  status: 'ACTIVE' | 'COMPLETED' | 'ABANDONED';
  evaluationStatus: 'PENDING' | 'AI_GENERATED' | 'REVIEWED';
  startedAt: string;
  endedAt: string | null;
  turns: number;
  scenario: { id: number; title: string; difficulty: string };
}

const SIM_STATUS: Record<string, string> = { ACTIVE: 'En curso', COMPLETED: 'Finalizada', ABANDONED: 'Abandonada' };
const EVAL_STATUS: Record<string, string> = { PENDING: 'Sin evaluación', AI_GENERATED: 'Evaluada por IA', REVIEWED: 'Revisada por facilitador' };

export default function Coach() {
  const nav = useNavigate();
  const status = useQuery({ queryKey: ['ai', 'status'], queryFn: () => api.get<{ configured: boolean }>('/ai/status') });
  const scenarios = useQuery({ queryKey: ['ai', 'scenarios'], queryFn: async () => (await api.get<{ data: Scenario[] }>('/ai/scenarios')).data });
  const sims = useQuery({ queryKey: ['ai', 'simulations', 'me'], queryFn: () => api.get<Paged<SimRow>>('/ai/simulations/me', { pageSize: 20 }) });
  const start = useAction((scenarioId: number) => api.post<{ simulation: { id: number } }>('/ai/simulations', { scenarioId }), {
    onSuccess: (r) => nav(`/campus/ia/simulaciones/${r.simulation.id}`),
  });

  return (
    <div className="animate-rise">
      <PageHeader
        title="Entrenador con IA"
        description="Practica conversaciones reales en un entorno seguro y recibe retroalimentación formativa."
        actions={<ButtonLink to="/campus/ia/tutor" variant="outline" icon={<BookOpenCheck className="size-4" />}>Tutor académico</ButtonLink>}
      />
      {status.data && !status.data.configured && (
        <div className="mb-8">
          <Alert tone="warning" title="IA no activada">
            El entrenador con IA aún no está activado en esta institución; los escenarios estarán disponibles cuando la administración lo configure.
          </Alert>
        </div>
      )}

      <Section title="Escenarios de práctica">
        <Q query={scenarios}>
          {(list) =>
            list.length === 0 ? (
              <EmptyState title="No hay escenarios publicados" description="La administración aún no ha activado escenarios de práctica." />
            ) : (
              <ol className="border-t border-ink">
                {list.map((s, i) => (
                  <li key={s.id} className="grid gap-x-6 gap-y-3 border-b border-line py-6 md:grid-cols-[110px_1fr_auto]">
                    <span className="text-sm font-semibold text-graphite tnum">{serial(i + 1)}</span>
                    <div className="min-w-0 max-w-2xl">
                      <h3 className="text-xl font-bold tracking-tight">{s.title}</h3>
                      <p className="mt-1 text-graphite">{s.description}</p>
                      {s.objectives.length > 0 && (
                        <ul className="mt-3 list-disc space-y-0.5 pl-5 text-sm">
                          {s.objectives.map((o, k) => (
                            <li key={k}>{o}</li>
                          ))}
                        </ul>
                      )}
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        <Tag tone="ink">{LEVELS[s.difficulty] ?? s.difficulty}</Tag>
                        {s.competencies.map((c) => (
                          <Tag key={c.id} tone="outline">{c.name}</Tag>
                        ))}
                      </div>
                    </div>
                    <div className="md:self-center">
                      <Button variant="primary" iconRight={<ArrowRight className="size-4" />} loading={start.isPending && start.variables === s.id} disabled={start.isPending} onClick={() => start.mutate(s.id)}>
                        Iniciar simulación
                      </Button>
                    </div>
                  </li>
                ))}
              </ol>
            )
          }
        </Q>
      </Section>

      <Section title="Mis simulaciones">
        <Q query={sims}>
          {(r) =>
            r.data.length === 0 ? (
              <p className="border-y border-line py-8 text-sm text-graphite">Aún no has realizado simulaciones.</p>
            ) : (
              <ul className="divide-y divide-line border-y border-line">
                {r.data.map((s) => (
                  <li key={s.id}>
                    <a href={`/campus/ia/simulaciones/${s.id}`} onClick={(e) => { e.preventDefault(); nav(`/campus/ia/simulaciones/${s.id}`); }} className="flex flex-wrap items-center justify-between gap-3 py-3 no-underline hover:bg-stone">
                      <span className="min-w-0">
                        <span className="block font-semibold">{s.scenario.title}</span>
                        <span className="text-xs text-graphite tnum">{date(s.startedAt)} · {s.turns} intervenciones</span>
                      </span>
                      <span className="flex gap-1.5">
                        <Tag tone={statusTone(s.status === 'ACTIVE' ? 'IN_PROGRESS' : s.status)}>{SIM_STATUS[s.status]}</Tag>
                        {s.evaluationStatus !== 'PENDING' && <Tag tone={statusTone(s.evaluationStatus)}>{EVAL_STATUS[s.evaluationStatus]}</Tag>}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            )
          }
        </Q>
      </Section>
    </div>
  );
}
