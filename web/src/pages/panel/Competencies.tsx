import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Eye, Pencil, Plus, Trash2 } from 'lucide-react';
import { api, ApiError, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useAction } from '@/lib/hooks';
import { PageHeader, Section } from '@/components/ui/Page';
import { Button, IconButton } from '@/components/ui/Button';
import { DataTable, Tabs, Tag, Toolbar, type Column } from '@/components/ui/Data';
import { Input, Select, Switch, Textarea } from '@/components/ui/Form';
import { ConfirmDialog, Drawer, Modal } from '@/components/ui/Overlay';
import { Alert, EmptyState, ErrorState, SkeletonRows } from '@/components/ui/Feedback';
import { courseOptions, useCourses } from '@/features/operations/shared';

interface Scale { id: number; name: string; min: number; max: number; labels: string[] | null }
interface Competency { id: number; key: string; name: string; description: string | null; group: string | null; isActive: boolean; scale: { min: number; max: number; labels: string[] | null } }
interface RubricRow { id: number; title: string; description: string | null; courseId: number | null; scaleId: number | null; criteriaCount: number; createdAt: string }
interface Level { score: number; label: string; description: string }
interface Criterion { title: string; description: string; competencyId: string; weight: string; maxScore: string; levels: Level[] }
interface RubricFull {
  id: number; title: string; description: string | null; courseId: number | null; scaleId: number | null;
  criteria: { title: string; description: string | null; competencyId: number | null; weight: number; maxScore: number; levels: { score: number; label: string; description: string | null }[] }[];
}

type TabKey = 'catalog' | 'rubrics' | 'scales';

const useScales = () => useQuery({ queryKey: ['competencies', 'scales'], queryFn: () => api.get<Scale[]>('/competencies/scales') });
const useCompetencies = () => useQuery({ queryKey: ['competencies', 'all'], queryFn: () => api.get<Competency[]>('/competencies', { all: 1 }) });
const fieldErr = (e: unknown, set: (m: Record<string, string>) => void) => {
  if (e instanceof ApiError) set(e.fieldErrors);
  toast.error(errorMessage(e));
};

/* ---------- Catálogo ---------- */
function CompetencyModal({ item, onClose }: { item: Competency | 'new' | null; onClose: () => void }) {
  const scales = useScales();
  const [f, setF] = useState({ key: '', name: '', description: '', group: '', scaleId: '', isActive: true });
  const [err, setErr] = useState<Record<string, string>>({});
  const isNew = item === 'new';
  useEffect(() => {
    if (item === null) return;
    setErr({});
    if (item === 'new') setF({ key: '', name: '', description: '', group: '', scaleId: '', isActive: true });
    else setF({ key: item.key, name: item.name, description: item.description ?? '', group: item.group ?? '', scaleId: '', isActive: item.isActive });
  }, [item]);
  const save = useAction(
    () => {
      const body = { name: f.name.trim(), description: f.description, group: f.group, isActive: f.isActive, ...(f.scaleId ? { scaleId: Number(f.scaleId) } : {}) };
      return isNew ? api.post('/competencies', { ...body, key: f.key.trim() }) : api.patch(`/competencies/${(item as Competency).id}`, body);
    },
    { success: 'Competencia guardada', invalidate: [['competencies']], onSuccess: onClose, silentError: true },
  );
  return (
    <Modal open={item !== null} onClose={onClose} title={isNew ? 'Nueva competencia' : 'Editar competencia'}
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button variant="primary" loading={save.isPending} onClick={() => save.mutate(undefined, { onError: (e) => fieldErr(e, setErr) })}>Guardar</Button></>}>
      <div className="space-y-4">
        <Input label="Nombre" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} error={err.name} />
        {isNew && <Input label="Clave" required value={f.key} onChange={(e) => setF({ ...f, key: e.target.value.toLowerCase() })} hint="Solo a-z, 0-9, guion y guion bajo. No se puede cambiar después." error={err.key} />}
        <Input label="Grupo" value={f.group} onChange={(e) => setF({ ...f, group: e.target.value })} hint="Ej.: Comunicación, Liderazgo, Inteligencia social" error={err.group} />
        <Textarea label="Descripción" rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} error={err.description} />
        <Select label="Escala" value={f.scaleId} onChange={(e) => setF({ ...f, scaleId: e.target.value })} placeholder={isNew ? '1 a 5 (predeterminada)' : 'Mantener la actual'} options={(scales.data ?? []).map((s) => ({ value: s.id, label: `${s.name} (${s.min}–${s.max})` }))} />
        <Switch checked={f.isActive} onChange={(v) => setF({ ...f, isActive: v })} label="Activa" hint="Las inactivas no aparecen al evaluar." />
      </div>
    </Modal>
  );
}

function Catalog({ manage }: { manage: boolean }) {
  const q = useCompetencies();
  const [item, setItem] = useState<Competency | 'new' | null>(null);
  const [del, setDel] = useState<Competency | null>(null);
  const toggle = useAction((c: Competency) => api.patch(`/competencies/${c.id}`, { isActive: !c.isActive }), { success: 'Estado actualizado', invalidate: [['competencies']] });
  const remove = useAction(() => api.del(`/competencies/${del!.id}`), { success: 'Competencia eliminada', invalidate: [['competencies']], onSuccess: () => setDel(null) });
  const cols: Column<Competency>[] = [
    { key: 'name', header: 'Competencia', cell: (c) => <div><p className="font-semibold">{c.name}</p>{c.description && <p className="line-clamp-1 text-xs text-muted">{c.description}</p>}</div> },
    { key: 'group', header: 'Grupo', cell: (c) => c.group ?? '—' },
    { key: 'scale', header: 'Escala', cell: (c) => `${c.scale.min}–${c.scale.max}` },
    { key: 'active', header: 'Estado', cell: (c) => <Tag tone={c.isActive ? 'success' : 'neutral'}>{c.isActive ? 'Activa' : 'Inactiva'}</Tag> },
    ...(manage ? [{ key: 'actions', header: <span className="sr-only">Acciones</span>, align: 'right' as const, cell: (c: Competency) => (
      <div className="flex justify-end gap-1">
        <Button size="sm" variant="ghost" onClick={() => toggle.mutate(c)}>{c.isActive ? 'Desactivar' : 'Activar'}</Button>
        <IconButton size="sm" label={`Editar ${c.name}`} onClick={() => setItem(c)}><Pencil className="size-4" /></IconButton>
        <IconButton size="sm" label={`Eliminar ${c.name}`} onClick={() => setDel(c)}><Trash2 className="size-4" /></IconButton>
      </div>
    ) }] : []),
  ];
  return (
    <div>
      {manage && <Toolbar><Button className="ml-auto" variant="primary" icon={<Plus className="size-4" />} onClick={() => setItem('new')}>Nueva competencia</Button></Toolbar>}
      {q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : (
        <DataTable columns={cols} rows={q.data} rowKey={(c) => c.id} loading={q.isLoading} empty={<EmptyState title="Catálogo vacío" description="Crea las competencias que evaluarás en tus cursos." />} />
      )}
      <CompetencyModal item={item} onClose={() => setItem(null)} />
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} onConfirm={() => remove.mutate()} loading={remove.isPending} title="Eliminar competencia" confirmLabel="Eliminar"
        description={`Se eliminará «${del?.name}». Si ya tiene resultados registrados no se podrá eliminar: desactívala en su lugar.`} />
    </div>
  );
}

/* ---------- Rúbricas ---------- */
const newLevels = (max: number, min = 1): Level[] => Array.from({ length: max - min + 1 }, (_, i) => ({ score: max - i, label: '', description: '' }));
const blankCriterion = (): Criterion => ({ title: '', description: '', competencyId: '', weight: '1', maxScore: '5', levels: newLevels(5) });

function RubricPreview({ criteria }: { criteria: Criterion[] }) {
  const scores = Array.from(new Set(criteria.flatMap((c) => c.levels.map((l) => l.score)))).sort((a, b) => b - a);
  if (!criteria.length || !scores.length) return <p className="text-sm text-muted">Agrega criterios y niveles para previsualizar la matriz.</p>;
  return (
    <div className="overflow-x-auto border-t border-ink">
      <table className="w-full min-w-[560px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-line">
            <th scope="col" className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.06em] text-graphite">Criterio</th>
            {scores.map((s) => <th key={s} scope="col" className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.06em] text-graphite tnum">{s} pts</th>)}
          </tr>
        </thead>
        <tbody>
          {criteria.map((c, i) => (
            <tr key={i} className="border-b border-line align-top">
              <th scope="row" className="px-3 py-2 text-left font-semibold">{c.title || <span className="text-muted">Sin título</span>}<span className="block text-xs font-normal text-muted">Peso {c.weight || 1}</span></th>
              {scores.map((s) => {
                const l = c.levels.find((x) => x.score === s);
                return <td key={s} className="px-3 py-2">{l ? <><span className="font-semibold">{l.label}</span>{l.description && <span className="block text-xs text-graphite">{l.description}</span>}</> : <span className="text-muted">—</span>}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RubricEditor({ id, onClose }: { id: number | 'new' | null; onClose: () => void }) {
  const open = id !== null;
  const { can } = useAuth();
  const courses = useCourses(open);
  const scales = useScales();
  const comps = useCompetencies();
  const [f, setF] = useState({ title: '', description: '', courseId: '', scaleId: '' });
  const [criteria, setCriteria] = useState<Criterion[]>([blankCriterion()]);
  const [locked, setLocked] = useState(false);
  const [err, setErr] = useState<Record<string, string>>({});
  const full = useQuery({ queryKey: ['competencies', 'rubric', id], queryFn: () => api.get<RubricFull>(`/competencies/rubrics/${id}`), enabled: typeof id === 'number' });
  useEffect(() => {
    if (id === null) return;
    setErr({});
    setLocked(false);
    if (id === 'new') { setF({ title: '', description: '', courseId: '', scaleId: '' }); setCriteria([blankCriterion()]); }
  }, [id]);
  useEffect(() => {
    const r = full.data;
    if (!r || typeof id !== 'number') return;
    setF({ title: r.title, description: r.description ?? '', courseId: r.courseId ? String(r.courseId) : '', scaleId: r.scaleId ? String(r.scaleId) : '' });
    setCriteria(r.criteria.map((c) => ({ title: c.title, description: c.description ?? '', competencyId: c.competencyId ? String(c.competencyId) : '', weight: String(c.weight), maxScore: String(c.maxScore), levels: c.levels.map((l) => ({ score: l.score, label: l.label, description: l.description ?? '' })).sort((a, b) => b.score - a.score) })));
  }, [full.data, id]);

  const upd = (i: number, patch: Partial<Criterion>) => setCriteria((s) => s.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  const updLevel = (i: number, k: number, patch: Partial<Level>) => setCriteria((s) => s.map((c, j) => (j === i ? { ...c, levels: c.levels.map((l, m) => (m === k ? { ...l, ...patch } : l)) } : c)));

  const save = useAction(
    () => {
      const meta = { title: f.title.trim(), description: f.description };
      const body = {
        ...meta,
        courseId: f.courseId ? Number(f.courseId) : null,
        scaleId: f.scaleId ? Number(f.scaleId) : null,
        criteria: criteria.map((c) => ({ title: c.title.trim(), description: c.description, competencyId: c.competencyId ? Number(c.competencyId) : null, weight: Number(c.weight) || 1, maxScore: Number(c.maxScore) || 5, levels: c.levels.filter((l) => l.label.trim()).map((l) => ({ score: l.score, label: l.label.trim(), description: l.description })) })),
      };
      if (id === 'new') return api.post('/competencies/rubrics', body);
      return api.put(`/competencies/rubrics/${id}`, locked ? meta : body);
    },
    { success: 'Rúbrica guardada', invalidate: [['competencies']], onSuccess: onClose, silentError: true },
  );
  const submit = () => {
    if (!f.title.trim()) return setErr({ title: 'Escribe un título' });
    if (!locked && criteria.some((c) => !c.title.trim())) return toast.error('Todos los criterios necesitan un título');
    setErr({});
    save.mutate(undefined, {
      onError: (e) => {
        if (e instanceof ApiError && e.status === 409) { setLocked(true); toast.error('Esta rúbrica ya tiene puntuaciones: solo puedes cambiar título y descripción. Vuelve a guardar.'); }
        else fieldErr(e, setErr);
      },
    });
  };

  return (
    <Drawer open={open} onClose={onClose} width="max-w-4xl" title={id === 'new' ? 'Nueva rúbrica' : 'Editar rúbrica'}
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button variant="primary" loading={save.isPending} onClick={submit}>Guardar rúbrica</Button></>}>
      {full.isLoading ? <SkeletonRows /> : full.isError ? <ErrorState error={full.error} onRetry={() => full.refetch()} /> : (
        <div className="space-y-6">
          {locked && <Alert tone="warning" title="Criterios bloqueados">La rúbrica ya fue usada para puntuar. Solo se guardarán el título y la descripción.</Alert>}
          <div className="grid gap-4 sm:grid-cols-2">
            <Input wrapperClassName="sm:col-span-2" label="Título" required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} error={err.title} />
            <Textarea wrapperClassName="sm:col-span-2" label="Descripción" rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
            <Select label="Curso" value={f.courseId} onChange={(e) => setF({ ...f, courseId: e.target.value })} placeholder="General (sin curso)" options={courseOptions(courses.data)} disabled={locked} />
            <Select label="Escala" value={f.scaleId} onChange={(e) => setF({ ...f, scaleId: e.target.value })} placeholder="Sin escala" options={(scales.data ?? []).map((s) => ({ value: s.id, label: `${s.name} (${s.min}–${s.max})` }))} disabled={locked} />
          </div>

          <Section title="Criterios" actions={!locked && can('competencies.manage', 'courses.teach') ? <Button size="sm" variant="outline" icon={<Plus className="size-4" />} onClick={() => setCriteria((s) => [...s, blankCriterion()])}>Agregar criterio</Button> : null}>
            <ol className="space-y-6">
              {criteria.map((c, i) => (
                <li key={i} className="border border-line p-4">
                  <fieldset disabled={locked} className="space-y-3">
                    <legend className="sr-only">Criterio {i + 1}</legend>
                    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,14rem)_5rem_5rem]">
                      <Input label={`Criterio ${i + 1}`} value={c.title} onChange={(e) => upd(i, { title: e.target.value })} />
                      <Select label="Competencia" value={c.competencyId} onChange={(e) => upd(i, { competencyId: e.target.value })} placeholder="Ninguna" options={(comps.data ?? []).filter((x) => x.isActive).map((x) => ({ value: x.id, label: x.name }))} />
                      <Input label="Peso" type="number" min={0} step="0.1" value={c.weight} onChange={(e) => upd(i, { weight: e.target.value })} />
                      <Input label="Máx." type="number" min={1} value={c.maxScore} onChange={(e) => upd(i, { maxScore: e.target.value })} />
                    </div>
                    <Input label="Descripción" value={c.description} onChange={(e) => upd(i, { description: e.target.value })} />
                    <div>
                      <p className="mb-1 text-[0.8125rem] font-semibold">Niveles</p>
                      <ul className="space-y-2">
                        {c.levels.map((l, k) => (
                          <li key={k} className="grid grid-cols-[3.5rem_minmax(0,1fr)] items-center gap-2 sm:grid-cols-[3.5rem_minmax(0,12rem)_minmax(0,1fr)_2rem]">
                            <input type="number" aria-label={`Puntuación del nivel ${k + 1} del criterio ${i + 1}`} value={l.score} onChange={(e) => updLevel(i, k, { score: Number(e.target.value) })} className="h-9 rounded-sm border border-line-strong px-2 text-sm tnum" />
                            <input aria-label={`Etiqueta del nivel ${k + 1}`} placeholder="Etiqueta (ej. Excelente)" value={l.label} onChange={(e) => updLevel(i, k, { label: e.target.value })} className="h-9 rounded-sm border border-line-strong px-2 text-sm" />
                            <input aria-label={`Descripción del nivel ${k + 1}`} placeholder="Descripción del desempeño" value={l.description} onChange={(e) => updLevel(i, k, { description: e.target.value })} className="col-span-2 h-9 rounded-sm border border-line-strong px-2 text-sm sm:col-span-1" />
                            <IconButton size="sm" label="Quitar nivel" onClick={() => upd(i, { levels: c.levels.filter((_, m) => m !== k) })}><Trash2 className="size-4" /></IconButton>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-2 flex gap-4">
                        <button type="button" className="text-sm font-semibold underline underline-offset-4" onClick={() => upd(i, { levels: [...c.levels, { score: Math.max(0, Math.min(...c.levels.map((l) => l.score), 1) - 1), label: '', description: '' }] })}>Agregar nivel</button>
                        {criteria.length > 1 && <button type="button" className="text-sm font-semibold text-danger underline underline-offset-4" onClick={() => setCriteria((s) => s.filter((_, j) => j !== i))}>Quitar criterio</button>}
                      </div>
                    </div>
                  </fieldset>
                </li>
              ))}
            </ol>
          </Section>
          <Section title="Vista previa de la matriz"><RubricPreview criteria={criteria} /></Section>
        </div>
      )}
    </Drawer>
  );
}

function Rubrics() {
  const courses = useCourses();
  const [courseId, setCourseId] = useState('');
  const [edit, setEdit] = useState<number | 'new' | null>(null);
  const [del, setDel] = useState<RubricRow | null>(null);
  const q = useQuery({ queryKey: ['competencies', 'rubrics', courseId], queryFn: () => api.get<RubricRow[]>('/competencies/rubrics', { courseId }) });
  const remove = useAction(() => api.del(`/competencies/rubrics/${del!.id}`), { success: 'Rúbrica eliminada', invalidate: [['competencies']], onSuccess: () => setDel(null) });
  const courseName = (id: number | null) => (id ? courses.data?.find((c) => c.id === id)?.title ?? `Curso ${id}` : 'General');
  return (
    <div>
      <Toolbar>
        <Select label="Curso" wrapperClassName="w-full sm:w-72" value={courseId} onChange={(e) => setCourseId(e.target.value)} placeholder="Todas las rúbricas" options={courseOptions(courses.data)} />
        <Button className="ml-auto" variant="primary" icon={<Plus className="size-4" />} onClick={() => setEdit('new')}>Nueva rúbrica</Button>
      </Toolbar>
      {q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : (
        <DataTable
          rows={q.data} rowKey={(r) => r.id} loading={q.isLoading}
          empty={<EmptyState title="Sin rúbricas" description="Una rúbrica define criterios y niveles de desempeño para calificar actividades." action={<Button variant="primary" onClick={() => setEdit('new')}>Crear rúbrica</Button>} />}
          columns={[
            { key: 'a', header: 'Rúbrica', cell: (r) => <div><p className="font-semibold">{r.title}</p>{r.description && <p className="line-clamp-1 text-xs text-muted">{r.description}</p>}</div> },
            { key: 'b', header: 'Curso', cell: (r) => courseName(r.courseId) },
            { key: 'c', header: 'Criterios', align: 'right', cell: (r) => r.criteriaCount },
            { key: 'd', header: <span className="sr-only">Acciones</span>, align: 'right', cell: (r) => (
              <div className="flex justify-end gap-1">
                <IconButton size="sm" label={`Ver o editar ${r.title}`} onClick={() => setEdit(r.id)}><Eye className="size-4" /></IconButton>
                <IconButton size="sm" label={`Eliminar ${r.title}`} onClick={() => setDel(r)}><Trash2 className="size-4" /></IconButton>
              </div>
            ) },
          ]}
        />
      )}
      <RubricEditor id={edit} onClose={() => setEdit(null)} />
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} onConfirm={() => remove.mutate()} loading={remove.isPending} title="Eliminar rúbrica" confirmLabel="Eliminar" description={`Se eliminará «${del?.title}». No es posible si ya tiene puntuaciones o está en uso.`} />
    </div>
  );
}

/* ---------- Escalas ---------- */
function ScaleModal({ item, onClose }: { item: Scale | 'new' | null; onClose: () => void }) {
  const [name, setName] = useState('');
  const [min, setMin] = useState(1);
  const [max, setMax] = useState(5);
  const [labels, setLabels] = useState<string[]>([]);
  const [err, setErr] = useState<Record<string, string>>({});
  const isNew = item === 'new';
  useEffect(() => {
    if (item === null) return;
    setErr({});
    if (item === 'new') { setName(''); setMin(1); setMax(5); setLabels(['', '', '', '', '']); }
    else { setName(item.name); setMin(item.min); setMax(item.max); setLabels(item.labels ?? Array(item.max - item.min + 1).fill('')); }
  }, [item]);
  const count = Math.max(0, max - min + 1);
  const resize = (mn: number, mx: number) => { const n = Math.max(0, mx - mn + 1); setLabels((l) => Array.from({ length: n }, (_, i) => l[i] ?? '')); };
  const save = useAction(
    () => {
      const filled = labels.slice(0, count);
      const body = { name: name.trim(), min, max, labels: filled.every((l) => l.trim()) ? filled.map((l) => l.trim()) : undefined };
      return isNew ? api.post('/competencies/scales', body) : api.patch(`/competencies/scales/${(item as Scale).id}`, body);
    },
    { success: 'Escala guardada', invalidate: [['competencies']], onSuccess: onClose, silentError: true },
  );
  return (
    <Modal open={item !== null} onClose={onClose} title={isNew ? 'Nueva escala' : 'Editar escala'}
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button variant="primary" loading={save.isPending} onClick={() => save.mutate(undefined, { onError: (e) => fieldErr(e, setErr) })}>Guardar</Button></>}>
      <div className="space-y-4">
        <Input label="Nombre" required value={name} onChange={(e) => setName(e.target.value)} error={err.name} />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Mínimo" type="number" value={min} onChange={(e) => { setMin(Number(e.target.value)); resize(Number(e.target.value), max); }} error={err.min} />
          <Input label="Máximo" type="number" value={max} onChange={(e) => { setMax(Number(e.target.value)); resize(min, Number(e.target.value)); }} error={err.max} />
        </div>
        {count > 0 && count <= 12 && (
          <fieldset>
            <legend className="mb-1.5 text-[0.8125rem] font-semibold">Etiqueta por nivel <span className="font-normal text-muted">(opcional; si completas una, completa todas)</span></legend>
            <ul className="space-y-2">
              {Array.from({ length: count }, (_, i) => (
                <li key={i} className="grid grid-cols-[2.5rem_minmax(0,1fr)] items-center gap-2">
                  <span className="text-sm font-bold tnum">{min + i}</span>
                  <input aria-label={`Etiqueta del nivel ${min + i}`} value={labels[i] ?? ''} onChange={(e) => setLabels((l) => l.map((x, j) => (j === i ? e.target.value : x)))} className="h-9 rounded-sm border border-line-strong px-2 text-sm" />
                </li>
              ))}
            </ul>
            {err.labels && <p className="mt-1 text-xs font-semibold text-danger">{err.labels}</p>}
          </fieldset>
        )}
      </div>
    </Modal>
  );
}

function Scales({ manage }: { manage: boolean }) {
  const q = useScales();
  const [item, setItem] = useState<Scale | 'new' | null>(null);
  return (
    <div>
      {manage && <Toolbar><Button className="ml-auto" variant="primary" icon={<Plus className="size-4" />} onClick={() => setItem('new')}>Nueva escala</Button></Toolbar>}
      {q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : (
        <DataTable
          rows={q.data} rowKey={(s) => s.id} loading={q.isLoading}
          empty={<EmptyState title="Sin escalas" description="Sin escalas asignadas las competencias usan 1 a 5." />}
          columns={[
            { key: 'a', header: 'Escala', cell: (s) => <span className="font-semibold">{s.name}</span> },
            { key: 'b', header: 'Rango', cell: (s) => `${s.min} a ${s.max}` },
            { key: 'c', header: 'Etiquetas', cell: (s) => (s.labels ? s.labels.join(' · ') : <span className="text-muted">Sin etiquetas</span>) },
            ...(manage ? [{ key: 'd', header: <span className="sr-only">Editar</span>, align: 'right' as const, cell: (s: Scale) => <IconButton size="sm" label={`Editar ${s.name}`} onClick={() => setItem(s)}><Pencil className="size-4" /></IconButton> }] : []),
          ]}
        />
      )}
      <ScaleModal item={item} onClose={() => setItem(null)} />
    </div>
  );
}

export default function Competencies() {
  const { can } = useAuth();
  const manage = can('competencies.manage');
  const [tab, setTab] = useState<TabKey>('catalog');
  return (
    <div className="animate-rise">
      <PageHeader title="Competencias y rúbricas" description="Catálogo de competencias, rúbricas de evaluación y escalas de puntuación." />
      <Tabs className="mb-6" value={tab} onChange={setTab} tabs={[{ key: 'catalog', label: 'Catálogo' }, { key: 'rubrics', label: 'Rúbricas' }, { key: 'scales', label: 'Escalas' }]} />
      {tab === 'catalog' && <Catalog manage={manage} />}
      {tab === 'rubrics' && <Rubrics />}
      {tab === 'scales' && <Scales manage={manage} />}
    </div>
  );
}
