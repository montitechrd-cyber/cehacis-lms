import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ImageUp, Plus, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError, errorMessage } from '@/lib/api';
import { useAction } from '@/lib/hooks';
import { LEVELS, MODALITIES } from '@/lib/format';
import { Button, IconButton } from '@/components/ui/Button';
import { Input, Select, Switch, Textarea } from '@/components/ui/Form';
import { Section } from '@/components/ui/Page';
import { RichTextEditor } from '@/components/ui/RichText';
import { Avatar } from '@/components/ui/Data';
import { toOptions, toDateInput, useBeforeUnload, type Category, type CompetencyOpt, type CourseFull } from './shared';

interface FormState {
  title: string; subtitle: string; description: string; objectives: string[]; audience: string; requirements: string;
  categoryId: string; level: string; modality: string; durationHours: string; price: string; isFree: boolean;
  startDate: string; endDate: string; capacity: string; competencyIds: number[]; instructorIds: number[];
  enforceSequence: boolean; passingScore: string; requireAllLessons: boolean; minAttendancePct: string;
  certificateEnabled: boolean; certificateTemplateId: string;
}

const fromCourse = (c: CourseFull): FormState => ({
  title: c.title, subtitle: c.subtitle ?? '', description: c.description ?? '', objectives: c.objectives ?? [], audience: c.audience ?? '', requirements: c.requirements ?? '',
  categoryId: c.categoryId ? String(c.categoryId) : '', level: c.level, modality: c.modality, durationHours: String(c.durationHours ?? 0), price: String(c.price ?? 0), isFree: c.isFree,
  startDate: toDateInput(c.startDate), endDate: toDateInput(c.endDate), capacity: c.capacity != null ? String(c.capacity) : '',
  competencyIds: c.competencies.map((x) => x.id), instructorIds: c.instructors.map((x) => x.id),
  enforceSequence: c.enforceSequence, passingScore: String(c.passingScore), requireAllLessons: c.requireAllLessons, minAttendancePct: String(c.minAttendancePct),
  certificateEnabled: c.certificateEnabled, certificateTemplateId: c.certificateTemplateId ? String(c.certificateTemplateId) : '',
});

export default function TabFicha({ course, isAdmin, canTemplates }: { course: CourseFull; isAdmin: boolean; canTemplates: boolean }) {
  const [f, setF] = useState<FormState>(() => fromCourse(course));
  const [base, setBase] = useState(() => JSON.stringify(fromCourse(course)));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInput = useRef<HTMLInputElement>(null);
  const [imageUrl, setImageUrl] = useState(course.imageUrl);
  const [uploading, setUploading] = useState(false);

  const dirty = JSON.stringify(f) !== base;
  useBeforeUnload(dirty);
  useEffect(() => setImageUrl(course.imageUrl), [course.imageUrl]);

  const cats = useQuery({ queryKey: ['categories'], queryFn: () => api.get<{ data: Category[] }>('/catalog/categories') });
  const comps = useQuery({ queryKey: ['competencies'], queryFn: () => api.get<CompetencyOpt[]>('/competencies') });
  const instr = useQuery({ queryKey: ['instructors-options'], enabled: isAdmin, queryFn: () => api.get<{ data: { id: number; firstName: string; lastName: string; email: string }[] }>('/catalog/instructors-options') });
  const tpls = useQuery({ queryKey: ['cert-templates'], enabled: canTemplates, queryFn: () => api.get<{ data: { id: number; name: string; isDefault: boolean }[] }>('/certificates/templates') });

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((p) => ({ ...p, [k]: v }));
  const toggleId = (k: 'competencyIds' | 'instructorIds', id: number) => set(k, f[k].includes(id) ? f[k].filter((x) => x !== id) : [...f[k], id]);

  const save = useAction(
    () => {
      const body: Record<string, unknown> = {
        title: f.title.trim(), subtitle: f.subtitle.trim() || null, description: f.description || null,
        objectives: f.objectives.map((o) => o.trim()).filter(Boolean), audience: f.audience.trim() || null, requirements: f.requirements.trim() || null,
        categoryId: f.categoryId ? Number(f.categoryId) : null, level: f.level, modality: f.modality, durationHours: Number(f.durationHours) || 0,
        startDate: f.startDate || null, endDate: f.endDate || null, capacity: f.capacity ? Number(f.capacity) : null,
        competencyIds: f.competencyIds, enforceSequence: f.enforceSequence, passingScore: Number(f.passingScore) || 0,
        requireAllLessons: f.requireAllLessons, minAttendancePct: Number(f.minAttendancePct) || 0, certificateEnabled: f.certificateEnabled,
      };
      if (canTemplates || isAdmin) body.certificateTemplateId = f.certificateTemplateId ? Number(f.certificateTemplateId) : null;
      if (isAdmin) {
        body.price = f.isFree ? 0 : Number(f.price) || 0;
        body.isFree = f.isFree;
        body.instructorIds = f.instructorIds;
      }
      return api.patch(`/catalog/courses/${course.id}`, body);
    },
    { success: 'Cambios guardados', invalidate: [['course', course.id], ['panel-courses']], silentError: true, onSuccess: () => setBase(JSON.stringify(f)) },
  );

  const submit = async () => {
    setErrors({});
    if (f.title.trim().length < 3) return setErrors({ title: 'El título debe tener al menos 3 caracteres' });
    try { await save.mutateAsync(); } catch (e) {
      if (e instanceof ApiError) {
        setErrors(e.fieldErrors);
        toast.error(e.message);
      }
    }
  };

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const r = await api.upload<{ data: { imageUrl: string } }>(`/catalog/courses/${course.id}/image`, fd);
      setImageUrl(r.data.imageUrl);
      toast.success('Imagen actualizada');
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  return (
    <form className="pb-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
      <Section title="Información general">
        <div className="grid gap-4">
          <Input label="Título" required value={f.title} error={errors.title} onChange={(e) => set('title', e.target.value)} maxLength={200} />
          <Input label="Subtítulo" value={f.subtitle} error={errors.subtitle} onChange={(e) => set('subtitle', e.target.value)} />
          <div>
            <p className="mb-1.5 text-[0.8125rem] font-semibold">Descripción</p>
            <RichTextEditor value={f.description} onChange={(v) => set('description', v)} placeholder="Describe el curso…" minHeight={200} />
          </div>
          <ObjectivesEditor value={f.objectives} onChange={(v) => set('objectives', v)} />
          <Textarea label="Público objetivo" value={f.audience} onChange={(e) => set('audience', e.target.value)} rows={2} />
          <Textarea label="Requisitos" value={f.requirements} onChange={(e) => set('requirements', e.target.value)} rows={2} />
        </div>
      </Section>

      <Section title="Imagen">
        <div className="flex flex-wrap items-center gap-4">
          {imageUrl ? <img src={imageUrl} alt={`Imagen del curso ${course.title}`} className="h-28 w-48 rounded-sm border border-line object-cover" /> : <div className="flex h-28 w-48 items-center justify-center rounded-sm border border-dashed border-line-strong bg-stone text-xs text-muted">Sin imagen</div>}
          <div>
            <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only" aria-label="Subir imagen del curso" onChange={(e) => upload(e.target.files?.[0])} />
            <Button variant="outline" icon={<ImageUp className="size-4" />} loading={uploading} onClick={() => fileInput.current?.click()}>{imageUrl ? 'Reemplazar imagen' : 'Subir imagen'}</Button>
            <p className="mt-1.5 text-xs text-muted">PNG, JPG, WEBP o GIF, máximo 8 MB. Se aplica al instante.</p>
          </div>
        </div>
      </Section>

      <Section title="Clasificación y programación">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Select label="Categoría" value={f.categoryId} onChange={(e) => set('categoryId', e.target.value)} placeholder="Sin categoría" options={(cats.data?.data ?? []).map((c) => ({ value: c.id, label: c.name }))} />
          <Select label="Nivel" value={f.level} onChange={(e) => set('level', e.target.value)} options={toOptions(LEVELS)} />
          <Select label="Modalidad" value={f.modality} onChange={(e) => set('modality', e.target.value)} options={toOptions(MODALITIES)} />
          <Input label="Duración (horas)" type="number" min={0} value={f.durationHours} onChange={(e) => set('durationHours', e.target.value)} error={errors.durationHours} />
          <Input label="Fecha de inicio" type="date" value={f.startDate} onChange={(e) => set('startDate', e.target.value)} error={errors.startDate} />
          <Input label="Fecha de fin" type="date" value={f.endDate} min={f.startDate || undefined} onChange={(e) => set('endDate', e.target.value)} error={errors.endDate} />
          <Input label="Cupo" type="number" min={1} value={f.capacity} onChange={(e) => set('capacity', e.target.value)} hint="Vacío = sin límite" error={errors.capacity} />
        </div>
      </Section>

      {isAdmin && (
        <Section title="Precio">
          <div className="grid max-w-xl gap-4">
            <Switch checked={f.isFree} onChange={(v) => set('isFree', v)} label="Curso gratuito" hint="Si está activo, el precio se fija en 0." />
            <Input label="Precio (USD)" type="number" min={0} step="0.01" value={f.isFree ? '0' : f.price} disabled={f.isFree} onChange={(e) => set('price', e.target.value)} error={errors.price} />
          </div>
        </Section>
      )}

      <Section title="Competencias" description="Las competencias que desarrolla el curso.">
        {comps.isLoading ? <p className="text-sm text-graphite">Cargando competencias…</p> : (comps.data ?? []).length === 0 ? <p className="text-sm text-graphite">No hay competencias activas.</p> : (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Competencias del curso">
            {(comps.data ?? []).map((c) => (
              <button key={c.id} type="button" aria-pressed={f.competencyIds.includes(c.id)} onClick={() => toggleId('competencyIds', c.id)}
                className={`rounded-sm border px-3 py-1.5 text-sm font-medium transition-colors ${f.competencyIds.includes(c.id) ? 'border-ink bg-ink text-paper' : 'border-line-strong hover:border-ink'}`}>{c.name}</button>
            ))}
          </div>
        )}
      </Section>

      {isAdmin && (
        <Section title="Facilitadores" description="El primero seleccionado queda como líder.">
          {instr.isLoading ? <p className="text-sm text-graphite">Cargando…</p> : (
            <div className="flex flex-wrap gap-2" role="group" aria-label="Facilitadores del curso">
              {(instr.data?.data ?? []).map((u) => (
                <button key={u.id} type="button" aria-pressed={f.instructorIds.includes(u.id)} onClick={() => toggleId('instructorIds', u.id)}
                  className={`inline-flex items-center gap-2 rounded-sm border py-1 pl-1 pr-3 text-sm font-medium ${f.instructorIds.includes(u.id) ? 'border-ink bg-ink text-paper' : 'border-line-strong hover:border-ink'}`}>
                  <Avatar user={u} size={24} className={f.instructorIds.includes(u.id) ? 'bg-orange text-ink' : ''} />
                  {u.firstName} {u.lastName}
                </button>
              ))}
            </div>
          )}
        </Section>
      )}

      <Section title="Reglas de aprobación">
        <div className="grid max-w-2xl gap-5">
          <Switch checked={f.enforceSequence} onChange={(v) => set('enforceSequence', v)} label="Secuencia forzada" hint="El estudiante debe completar cada lección para desbloquear la siguiente." />
          <Switch checked={f.requireAllLessons} onChange={(v) => set('requireAllLessons', v)} label="Exigir todas las lecciones" hint="Para completar el curso hay que terminar el 100 % de las lecciones." />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Nota mínima de aprobación (%)" type="number" min={0} max={100} value={f.passingScore} onChange={(e) => set('passingScore', e.target.value)} error={errors.passingScore} />
            <Input label="Asistencia mínima (%)" type="number" min={0} max={100} value={f.minAttendancePct} onChange={(e) => set('minAttendancePct', e.target.value)} error={errors.minAttendancePct} hint="0 = no se exige" />
          </div>
          <Switch checked={f.certificateEnabled} onChange={(v) => set('certificateEnabled', v)} label="Emitir certificado" hint="Se emite automáticamente al completar el curso." />
          {f.certificateEnabled && (canTemplates ? (
            <Select label="Plantilla de certificado" value={f.certificateTemplateId} onChange={(e) => set('certificateTemplateId', e.target.value)} placeholder="Plantilla predeterminada" options={(tpls.data?.data ?? []).map((t) => ({ value: t.id, label: t.name + (t.isDefault ? ' (predeterminada)' : '') }))} />
          ) : (
            <p className="text-sm text-graphite">Plantilla: {course.certificateTemplate?.name ?? 'predeterminada'}.</p>
          ))}
        </div>
      </Section>

      <div className="sticky bottom-0 z-30 -mx-1 border-t border-ink bg-paper px-1 py-3">
        <div className="flex items-center justify-end gap-3">
          {dirty ? <span className="text-sm font-semibold text-ink" role="status">Hay cambios sin guardar</span> : <span className="text-sm text-muted" role="status">Todo guardado</span>}
          <Button type="submit" variant="primary" icon={<Save className="size-4" />} loading={save.isPending} disabled={!dirty}>Guardar cambios</Button>
        </div>
      </div>
    </form>
  );
}

function ObjectivesEditor({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-[0.8125rem] font-semibold">Objetivos de aprendizaje</legend>
      <ul className="grid gap-2">
        {value.map((o, i) => (
          <li key={i} className="flex items-center gap-2">
            <input aria-label={`Objetivo ${i + 1}`} value={o} onChange={(e) => onChange(value.map((x, j) => (j === i ? e.target.value : x)))}
              className="h-10 min-w-0 flex-1 rounded-sm border border-line-strong bg-paper px-3 text-[0.9375rem] focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink" />
            <IconButton label={`Quitar objetivo ${i + 1}`} size="sm" onClick={() => onChange(value.filter((_, j) => j !== i))}><X className="size-4" /></IconButton>
          </li>
        ))}
      </ul>
      <Button variant="ghost" size="sm" className="mt-2" icon={<Plus className="size-4" />} onClick={() => onChange([...value, ''])}>Añadir objetivo</Button>
    </fieldset>
  );
}
