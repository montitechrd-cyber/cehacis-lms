import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { api, ApiError, type Paged } from '@/lib/api';
import { useAction, useTableParams } from '@/lib/hooks';
import { useAuth } from '@/lib/auth';
import { dateTime, fullName, LEVELS } from '@/lib/format';
import { Button, IconButton } from '@/components/ui/Button';
import { Checkbox, Input, Select, Switch, Textarea } from '@/components/ui/Form';
import { Alert, EmptyState, ErrorState, SkeletonRows } from '@/components/ui/Feedback';
import { Drawer } from '@/components/ui/Overlay';
import { PageHeader } from '@/components/ui/Page';
import { Avatar, DataTable, Facts, Pagination, SearchInput, Tabs, Tag, statusTone } from '@/components/ui/Data';
import { RowActions, useCompetencies, useDeleter, useTab } from '@/features/system/shared';

interface Status { configured: boolean; provider: string; model: string }
interface Review {
  id: number; evaluationStatus: string; startedAt: string; endedAt: string | null; reviewedAt: string | null;
  student: { id: number; firstName: string; lastName: string; email: string; avatarUrl: string | null };
  scenario: { id: number; key: string; title: string };
}
interface Scenario {
  id: number; key: string; title: string; description: string; persona: string; context: string; objectives: string[];
  difficulty: string; openingLine: string; isActive: boolean; competencies: { id: number; key: string; name: string }[];
}

export const EVAL_STATUS: Record<string, string> = { PENDING: 'Sin evaluación', AI_GENERATED: 'Pendiente de revisión', REVIEWED: 'Revisada' };

export default function Ai() {
  const { can } = useAuth();
  const status = useQuery({ queryKey: ['ai-status'], queryFn: () => api.get<Status>('/ai/status') });
  const tabs = [
    ...(can('ai.review') ? [{ key: 'reviews' as const, label: 'Revisiones' }] : []),
    ...(can('ai.manage') ? [{ key: 'scenarios' as const, label: 'Escenarios' }] : []),
  ];
  const [tab, setTab] = useTab(tabs.map((t) => t.key));
  return (
    <div>
      <PageHeader title="Inteligencia artificial" description="Revisa las evaluaciones de las simulaciones y administra los escenarios del entrenador. La IA ofrece retroalimentación formativa: no diagnostica y el facilitador tiene la última palabra." />
      <div className="mb-6">
        {status.isLoading ? null : status.isError ? (
          <Alert tone="warning" title="No se pudo consultar el estado de la IA">Puedes seguir revisando simulaciones ya evaluadas.</Alert>
        ) : status.data?.configured ? (
          <Alert tone="success" title="IA configurada">Proveedor {status.data.provider} · modelo {status.data.model}</Alert>
        ) : (
          <Alert tone="warning" title="La IA no está configurada">
            Las simulaciones nuevas no pueden generar evaluación. Define la variable de entorno <code className="font-semibold">ANTHROPIC_API_KEY</code> en el servidor y reinícialo. Las revisiones ya generadas siguen disponibles.
          </Alert>
        )}
      </div>
      <Tabs tabs={tabs} value={tab} onChange={setTab} className="mb-6" />
      {tab === 'reviews' && <Reviews />}
      {tab === 'scenarios' && <Scenarios />}
    </div>
  );
}

function Reviews() {
  const nav = useNavigate();
  const t = useTableParams();
  const status = t.get('status');
  const q = useQuery({ queryKey: ['ai-reviews', status, t.get('q'), t.page], queryFn: () => api.get<Paged<Review>>('/ai/reviews', { status, q: t.get('q'), page: t.page }) });
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <SearchInput className="w-full sm:w-72" placeholder="Buscar estudiante" value={t.get('q')} onChange={(v) => t.set({ q: v })} />
        <div className="w-full sm:w-56">
          <Select label="Estado" value={status} onChange={(e) => t.set({ status: e.target.value })} placeholder="Todas" options={[{ value: 'AI_GENERATED', label: 'Pendientes de revisión' }, { value: 'REVIEWED', label: 'Revisadas' }]} />
        </div>
      </div>
      {q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : (
        <DataTable
          loading={q.isLoading}
          rows={q.data?.data}
          rowKey={(r) => r.id}
          onRowClick={(r) => nav(`/panel/ia/revisiones/${r.id}`)}
          empty={<EmptyState title="No hay revisiones" description="Cuando un estudiante termine una simulación con evaluación de IA aparecerá aquí para tu revisión." />}
          columns={[
            { key: 's', header: 'Estudiante', cell: (r) => (<div className="flex items-center gap-3"><Avatar user={r.student} size={32} /><div><p className="font-semibold">{fullName(r.student)}</p><p className="text-xs text-muted">{r.student.email}</p></div></div>) },
            { key: 'e', header: 'Escenario', cell: (r) => r.scenario.title },
            { key: 'd', header: 'Finalizada', cell: (r) => dateTime(r.endedAt) },
            { key: 'st', header: 'Estado', cell: (r) => <Tag tone={statusTone(r.evaluationStatus)}>{EVAL_STATUS[r.evaluationStatus] ?? r.evaluationStatus}</Tag> },
            { key: 'a', header: <span className="sr-only">Abrir</span>, align: 'right', cell: (r) => <Button size="sm" variant="outline" onClick={() => nav(`/panel/ia/revisiones/${r.id}`)}>Revisar</Button> },
          ]}
        />
      )}
      {q.data && <Pagination page={q.data.meta.page} pages={q.data.meta.pages} total={q.data.meta.total} onPage={(p) => t.set({ page: p }, false)} />}
    </div>
  );
}

function Scenarios() {
  const q = useQuery({ queryKey: ['ai-scenarios'], queryFn: () => api.get<{ data: Scenario[] }>('/ai/scenarios', { all: 1 }) });
  const [edit, setEdit] = useState<Scenario | 'new' | null>(null);
  const del = useDeleter({ path: (id) => `/ai/scenarios/${id}`, invalidate: [['ai-scenarios']], title: 'Eliminar escenario', description: 'Si ya tiene simulaciones, el servidor no lo permitirá: desactívalo en su lugar.', success: 'Escenario eliminado' });
  return (
    <div>
      <div className="mb-4 flex justify-end"><Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setEdit('new')}>Nuevo escenario</Button></div>
      {q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : q.isLoading ? <SkeletonRows /> : !q.data?.data.length ? (
        <EmptyState title="Sin escenarios" description="Define un personaje, un contexto y objetivos para que los estudiantes practiquen conversaciones." action={<Button variant="primary" onClick={() => setEdit('new')}>Crear escenario</Button>} />
      ) : (
        <DataTable rows={q.data.data} rowKey={(r) => r.id} columns={[
          { key: 't', header: 'Escenario', cell: (r) => (<div className="max-w-md"><p className="font-semibold">{r.title}</p><p className="line-clamp-1 text-xs text-muted">{r.description}</p></div>) },
          { key: 'k', header: 'Clave', cell: (r) => <code className="text-xs">{r.key}</code> },
          { key: 'd', header: 'Dificultad', cell: (r) => LEVELS[r.difficulty] },
          { key: 'c', header: 'Competencias', cell: (r) => r.competencies.map((c) => c.name).join(', ') || '—' },
          { key: 's', header: 'Estado', cell: (r) => <Tag tone={r.isActive ? 'success' : 'neutral'}>{r.isActive ? 'Activo' : 'Inactivo'}</Tag> },
          { key: 'x', header: <span className="sr-only">Acciones</span>, align: 'right', cell: (r) => (<RowActions><IconButton label="Editar" size="sm" onClick={() => setEdit(r)}><Pencil className="size-4" /></IconButton><IconButton label="Eliminar" size="sm" onClick={() => del.ask(r.id)}><Trash2 className="size-4" /></IconButton></RowActions>) },
        ]} />
      )}
      {edit && <ScenarioDrawer item={edit === 'new' ? null : edit} onClose={() => setEdit(null)} />}
      {del.dialog}
    </div>
  );
}

function ScenarioDrawer({ item, onClose }: { item: Scenario | null; onClose: () => void }) {
  const { competencies } = useCompetencies();
  const [f, setF] = useState({
    key: item?.key ?? '', title: item?.title ?? '', description: item?.description ?? '', persona: item?.persona ?? '', context: item?.context ?? '',
    difficulty: item?.difficulty ?? 'BASIC', openingLine: item?.openingLine ?? '', isActive: item?.isActive ?? true,
  });
  const [objectives, setObjectives] = useState<string[]>(item?.objectives.length ? item.objectives : ['']);
  const [comps, setComps] = useState<number[]>(item?.competencies.map((c) => c.id) ?? []);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const save = useAction((b: Record<string, unknown>) => (item ? api.patch(`/ai/scenarios/${item.id}`, b) : api.post('/ai/scenarios', b)), {
    success: item ? 'Escenario actualizado' : 'Escenario creado', invalidate: [['ai-scenarios']], onSuccess: onClose,
  });
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    save.mutate({ ...f, objectives: objectives.map((o) => o.trim()).filter(Boolean), competencyIds: comps }, { onError: (err) => err instanceof ApiError && setErrors(err.fieldErrors) });
  };
  return (
    <Drawer open onClose={onClose} title={item ? 'Editar escenario' : 'Nuevo escenario'} width="max-w-2xl"
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button type="submit" form="scn-form" variant="primary" loading={save.isPending}>Guardar</Button></>}>
      <form id="scn-form" onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Clave" required value={f.key} error={errors.key} hint="Minúsculas, números, guion y guion bajo." onChange={set('key')} />
          <Select label="Dificultad" options={Object.entries(LEVELS).map(([value, label]) => ({ value, label }))} value={f.difficulty} onChange={set('difficulty')} />
        </div>
        <Input label="Título" required value={f.title} error={errors.title} onChange={set('title')} />
        <Textarea label="Descripción" required rows={2} value={f.description} error={errors.description} onChange={set('description')} />
        <Textarea label="Persona (personaje que interpreta la IA)" required rows={3} value={f.persona} error={errors.persona} onChange={set('persona')} />
        <Textarea label="Contexto de la situación" required rows={3} value={f.context} error={errors.context} onChange={set('context')} />
        <Input label="Frase inicial del personaje" required value={f.openingLine} error={errors.openingLine} onChange={set('openingLine')} />
        <fieldset>
          <legend className="mb-1.5 text-[0.8125rem] font-semibold">Objetivos del estudiante</legend>
          <div className="space-y-2">
            {objectives.map((o, i) => (
              <div key={i} className="flex items-center gap-2">
                <input aria-label={`Objetivo ${i + 1}`} value={o} onChange={(e) => setObjectives(objectives.map((x, j) => (j === i ? e.target.value : x)))} className="h-10 w-full rounded-sm border border-line-strong px-3 text-[0.9375rem] focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink" />
                <IconButton label="Quitar objetivo" size="sm" onClick={() => setObjectives(objectives.length > 1 ? objectives.filter((_, j) => j !== i) : [''])}><X className="size-4" /></IconButton>
              </div>
            ))}
          </div>
          {errors.objectives && <p className="mt-1 text-xs font-semibold text-danger">{errors.objectives}</p>}
          <Button size="sm" variant="ghost" className="mt-2" icon={<Plus className="size-4" />} onClick={() => setObjectives([...objectives, ''])}>Añadir objetivo</Button>
        </fieldset>
        <fieldset>
          <legend className="mb-1.5 text-[0.8125rem] font-semibold">Competencias que trabaja</legend>
          {competencies.length === 0 ? <p className="text-sm text-muted">No hay competencias definidas.</p> : (
            <div className="grid gap-2 sm:grid-cols-2">
              {competencies.map((c) => <Checkbox key={c.id} label={c.name} checked={comps.includes(c.id)} onChange={(e) => setComps(e.target.checked ? [...comps, c.id] : comps.filter((x) => x !== c.id))} />)}
            </div>
          )}
        </fieldset>
        <Switch label="Escenario activo" hint="Los inactivos no se ofrecen a los estudiantes." checked={f.isActive} onChange={(v) => setF({ ...f, isActive: v })} />
      </form>
    </Drawer>
  );
}

void Facts;
