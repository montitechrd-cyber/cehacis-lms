import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Plus, Trash2 } from 'lucide-react';
import { api, ApiError, errorMessage } from '@/lib/api';
import { useAction } from '@/lib/hooks';
import { COMPLETION_RULES, RESOURCE_TYPES, fileSize } from '@/lib/format';
import { Button, IconButton } from '@/components/ui/Button';
import { Tag } from '@/components/ui/Data';
import { ErrorState, PageLoader } from '@/components/ui/Feedback';
import { Checkbox, Input, Select, Switch, Textarea } from '@/components/ui/Form';
import { Drawer } from '@/components/ui/Overlay';
import { RichTextEditor } from '@/components/ui/RichText';
import { toast } from 'sonner';
import { MoveButtons, fromLocalInput, moveItem, toLocalInput, toOptions, type ActivityListItem, type AssessmentListItem, type CourseFull, type FileOut, type Resource, type Folder } from './shared';

interface LessonDetail {
  id: number;
  moduleId: number;
  title: string;
  summary: string | null;
  content: string | null;
  durationMin: number;
  isPublished: boolean;
  isPreview: boolean;
  availableFrom: string | null;
  completionRule: string;
  requiredAssessmentId: number | null;
  requiredActivityId: number | null;
  resources: Resource[];
}

export function useCourseRefs(courseId: number) {
  const assessments = useQuery({ queryKey: ['course-assessments', courseId], queryFn: () => api.get<{ data: AssessmentListItem[] }>('/assessments', { courseId }) });
  const activities = useQuery({ queryKey: ['course-activities', courseId], queryFn: () => api.get<ActivityListItemList>(`/activities`, { courseId }) });
  return { assessments, activities };
}
type ActivityListItemList = ActivityListItem[];

export default function LessonDrawer({ course, moduleId, lessonId, onClose, onChanged }: { course: CourseFull; moduleId: number; lessonId: number | 'new'; onClose: () => void; onChanged: () => void }) {
  const isNew = lessonId === 'new';
  const qc = useQueryClient();
  const detail = useQuery({ queryKey: ['lesson', lessonId], enabled: !isNew, queryFn: () => api.get<{ data: LessonDetail }>(`/catalog/lessons/${lessonId}`) });
  const { assessments, activities } = useCourseRefs(course.id);
  const [curId, setCurId] = useState<number | null>(isNew ? null : (lessonId as number));
  const [f, setF] = useState({ title: '', summary: '', content: '', durationMin: '10', isPublished: true, isPreview: false, availableFrom: '', completionRule: 'MANUAL', requiredAssessmentId: '', requiredActivityId: '', moduleId: String(moduleId) });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [resources, setResources] = useState<Resource[]>([]);

  useEffect(() => {
    const l = detail.data?.data;
    if (!l) return;
    setF({ title: l.title, summary: l.summary ?? '', content: l.content ?? '', durationMin: String(l.durationMin), isPublished: l.isPublished, isPreview: l.isPreview, availableFrom: toLocalInput(l.availableFrom), completionRule: l.completionRule, requiredAssessmentId: l.requiredAssessmentId ? String(l.requiredAssessmentId) : '', requiredActivityId: l.requiredActivityId ? String(l.requiredActivityId) : '', moduleId: String(l.moduleId) });
    setResources(l.resources);
  }, [detail.data]);

  const save = useAction(
    async () => {
      const body = {
        title: f.title.trim(), summary: f.summary.trim() || null, content: f.content, durationMin: Number(f.durationMin) || 0,
        isPublished: f.isPublished, isPreview: f.isPreview, availableFrom: fromLocalInput(f.availableFrom), completionRule: f.completionRule,
        requiredAssessmentId: f.completionRule === 'ASSESSMENT' && f.requiredAssessmentId ? Number(f.requiredAssessmentId) : null,
        requiredActivityId: f.completionRule === 'ACTIVITY' && f.requiredActivityId ? Number(f.requiredActivityId) : null,
      };
      if (curId) {
        const r = await api.patch<{ data: LessonDetail }>(`/catalog/lessons/${curId}`, body);
        if (Number(f.moduleId) !== (detail.data?.data.moduleId ?? moduleId)) await api.post(`/catalog/lessons/${curId}/move`, { moduleId: Number(f.moduleId), order: 0 });
        return r;
      }
      return api.post<{ data: LessonDetail }>(`/catalog/modules/${f.moduleId}/lessons`, body);
    },
    {
      success: 'Lección guardada', silentError: true,
      onSuccess: (r) => {
        const first = !curId;
        setCurId(r.data.id);
        onChanged();
        qc.invalidateQueries({ queryKey: ['lesson', r.data.id] });
        if (first) toast.info('Ahora puedes añadir recursos a la lección');
      },
    },
  );
  const submit = async () => {
    setErrors({});
    if (f.title.trim().length < 2) return setErrors({ title: 'El título debe tener al menos 2 caracteres' });
    if (f.completionRule === 'ASSESSMENT' && !f.requiredAssessmentId) return setErrors({ requiredAssessmentId: 'Elige la evaluación requerida' });
    if (f.completionRule === 'ACTIVITY' && !f.requiredActivityId) return setErrors({ requiredActivityId: 'Elige la actividad requerida' });
    try { await save.mutateAsync(); } catch (e) {
      if (e instanceof ApiError) { setErrors(e.fieldErrors); toast.error(e.message); }
    }
  };

  const ruleOptions = toOptions(COMPLETION_RULES);

  return (
    <Drawer open onClose={onClose} width="max-w-4xl" title={isNew && !curId ? 'Nueva lección' : 'Editar lección'}
      footer={<><Button variant="ghost" onClick={onClose}>Cerrar</Button><Button variant="primary" loading={save.isPending} onClick={submit}>Guardar lección</Button></>}>
      {!isNew && detail.isLoading ? <PageLoader /> : detail.isError ? <ErrorState error={detail.error} onRetry={() => detail.refetch()} /> : (
        <div className="grid gap-5">
          <Input label="Título" required value={f.title} error={errors.title} onChange={(e) => setF({ ...f, title: e.target.value })} maxLength={200} />
          <Textarea label="Resumen" value={f.summary} onChange={(e) => setF({ ...f, summary: e.target.value })} rows={2} />
          <div>
            <p className="mb-1.5 text-[0.8125rem] font-semibold">Contenido</p>
            <RichTextEditor value={f.content} onChange={(v) => setF((p) => ({ ...p, content: v }))} />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Input label="Duración (min)" type="number" min={0} value={f.durationMin} onChange={(e) => setF({ ...f, durationMin: e.target.value })} />
            <Input label="Disponible desde" type="datetime-local" value={f.availableFrom} onChange={(e) => setF({ ...f, availableFrom: e.target.value })} />
            <Select label="Módulo" value={f.moduleId} onChange={(e) => setF({ ...f, moduleId: e.target.value })} options={course.modules.map((m, i) => ({ value: m.id, label: `${String(i + 1).padStart(2, '0')} · ${m.title}` }))} hint={curId ? 'Cambiarlo mueve la lección al guardar.' : undefined} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Switch checked={f.isPublished} onChange={(v) => setF({ ...f, isPublished: v })} label="Publicada" />
            <Switch checked={f.isPreview} onChange={(v) => setF({ ...f, isPreview: v })} label="Vista previa gratuita" hint="Visible en la ficha pública sin inscripción." />
          </div>
          <Select label="Regla de finalización" value={f.completionRule} onChange={(e) => setF({ ...f, completionRule: e.target.value })} options={ruleOptions} />
          {f.completionRule === 'ASSESSMENT' && (
            <Select label="Evaluación requerida" required value={f.requiredAssessmentId} error={errors.requiredAssessmentId} onChange={(e) => setF({ ...f, requiredAssessmentId: e.target.value })} placeholder="Elige una evaluación" options={(assessments.data?.data ?? []).map((a) => ({ value: a.id, label: a.title }))} hint={assessments.data?.data.length === 0 ? 'Crea primero una evaluación en la pestaña Evaluaciones.' : undefined} />
          )}
          {f.completionRule === 'ACTIVITY' && (
            <Select label="Actividad requerida" required value={f.requiredActivityId} error={errors.requiredActivityId} onChange={(e) => setF({ ...f, requiredActivityId: e.target.value })} placeholder="Elige una actividad" options={(activities.data ?? []).map((a) => ({ value: a.id, label: a.title }))} hint={activities.data?.length === 0 ? 'Crea primero una actividad en la pestaña Prácticas.' : undefined} />
          )}

          <section className="border-t border-ink pt-4">
            <h3 className="text-base font-bold">Recursos de la lección</h3>
            {!curId ? (
              <p className="mt-2 text-sm text-graphite">Guarda la lección para poder añadir recursos.</p>
            ) : (
              <ResourceManager course={course} lessonId={curId} resources={resources} setResources={setResources} onChanged={() => { onChanged(); qc.invalidateQueries({ queryKey: ['lesson', curId] }); }} />
            )}
          </section>
        </div>
      )}
    </Drawer>
  );
}

const URL_TYPES = ['LINK', 'EMBED', 'LIVE_SESSION', 'RECORDING'];
const URL_OR_FILE = ['VIDEO', 'AUDIO', 'PRESENTATION', 'DOCUMENT'];

function ResourceManager({ course, lessonId, resources, setResources, onChanged }: { course: CourseFull; lessonId: number; resources: Resource[]; setResources: (r: Resource[]) => void; onChanged: () => void }) {
  const [adding, setAdding] = useState(false);
  const remove = useAction((id: number) => api.del(`/catalog/resources/${id}`), { success: 'Recurso eliminado', onSuccess: (_r, id) => { setResources(resources.filter((r) => r.id !== id)); onChanged(); } });
  const reorder = useAction((ids: number[]) => api.put(`/catalog/lessons/${lessonId}/resources/order`, { ids }), { onSuccess: onChanged });
  const move = (from: number, to: number) => { const next = moveItem(resources, from, to); setResources(next); reorder.mutate(next.map((r) => r.id)); };

  const detail = (r: Resource) => r.file ? `${r.file.originalName} · ${fileSize(r.file.size)}` : r.url ?? r.folder?.name ?? r.assessment?.title ?? r.forum?.title ?? r.activity?.title ?? r.event?.title ?? '';

  return (
    <div className="mt-3">
      {resources.length === 0 ? <p className="text-sm text-graphite">Aún no hay recursos.</p> : (
        <ul className="divide-y divide-line border-y border-line">
          {resources.map((r, i) => (
            <li key={r.id} className="flex flex-wrap items-center gap-2 py-2">
              <Tag tone="ink">{RESOURCE_TYPES[r.type] ?? r.type}</Tag>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{r.title}</p>
                <p className="truncate text-xs text-muted">{detail(r)}</p>
              </div>
              {r.isRequired && <Tag tone="warning">Obligatorio</Tag>}
              {!r.isDownloadable && <Tag tone="outline">Sin descarga</Tag>}
              <MoveButtons index={i} total={resources.length} label={`recurso ${r.title}`} onMove={(to) => move(i, to)} />
              <IconButton label={`Eliminar recurso ${r.title}`} size="sm" onClick={() => { if (window.confirm(`¿Eliminar el recurso «${r.title}»?`)) remove.mutate(r.id); }}><Trash2 className="size-4 text-danger" /></IconButton>
            </li>
          ))}
        </ul>
      )}
      {adding ? (
        <ResourceForm course={course} lessonId={lessonId} onCancel={() => setAdding(false)} onCreated={(r) => { setResources([...resources, r]); setAdding(false); onChanged(); }} />
      ) : (
        <Button className="mt-3" variant="outline" size="sm" icon={<Plus className="size-4" />} onClick={() => setAdding(true)}>Añadir recurso</Button>
      )}
    </div>
  );
}

function ResourceForm({ course, lessonId, onCancel, onCreated }: { course: CourseFull; lessonId: number; onCancel: () => void; onCreated: (r: Resource) => void }) {
  const [f, setF] = useState({ type: 'DOCUMENT', title: '', description: '', url: '', fileId: null as number | null, fileName: '', folderId: '', assessmentId: '', forumId: '', activityId: '', eventId: '', isRequired: false, isDownloadable: true });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<Record<string, string>>({});
  const { assessments, activities } = useCourseRefs(course.id);
  const folders = useQuery({ queryKey: ['folders', course.id], queryFn: () => api.get<{ data: Folder[] }>(`/catalog/courses/${course.id}/folders`) });
  const forums = useQuery({ queryKey: ['course-forums', course.id], queryFn: () => api.get<{ data: { id: number; title: string }[] }>('/community/forums', { courseId: course.id }) });
  const events = useQuery({ queryKey: ['course-events', course.id], queryFn: () => api.get<{ data: { id: number; title: string; startAt: string }[] }>('/calendar/events', { courseId: course.id }) });
  const qc = useQueryClient();
  const [newFolder, setNewFolder] = useState('');

  const t = f.type;
  const needsUrl = URL_TYPES.includes(t) || URL_OR_FILE.includes(t);
  const needsFile = t === 'FILE' || URL_OR_FILE.includes(t);

  const upload = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const r = await api.upload<{ file: FileOut }>('/files', fd);
      setF((p) => ({ ...p, fileId: r.file.id, fileName: r.file.originalName, title: p.title || r.file.originalName }));
    } catch (e) { toast.error(errorMessage(e)); } finally { setUploading(false); }
  };

  const createFolder = async () => {
    if (!newFolder.trim()) return;
    try {
      const r = await api.post<{ data: Folder }>(`/catalog/courses/${course.id}/folders`, { name: newFolder.trim() });
      await qc.invalidateQueries({ queryKey: ['folders', course.id] });
      setF((p) => ({ ...p, folderId: String(r.data.id) }));
      setNewFolder('');
    } catch (e) { toast.error(errorMessage(e)); }
  };

  const submit = async () => {
    const e: Record<string, string> = {};
    if (!f.title.trim()) e.title = 'Escribe un título';
    if ((URL_TYPES.includes(t)) && !/^https?:\/\//i.test(f.url)) e.url = 'Indica una URL http(s) válida';
    if (URL_OR_FILE.includes(t) && !f.fileId && !/^https?:\/\//i.test(f.url)) e.url = 'Indica una URL o sube un archivo';
    if (t === 'FILE' && !f.fileId) e.file = 'Sube un archivo';
    if (t === 'FOLDER' && !f.folderId) e.folderId = 'Elige una carpeta';
    if (t === 'ASSESSMENT' && !f.assessmentId) e.assessmentId = 'Elige una evaluación';
    if (t === 'FORUM' && !f.forumId) e.forumId = 'Elige un foro';
    if (t === 'ACTIVITY' && !f.activityId) e.activityId = 'Elige una actividad';
    setErr(e);
    if (Object.keys(e).length) return;
    const body: Record<string, unknown> = { type: t, title: f.title.trim(), description: f.description.trim() || null, isRequired: f.isRequired, isDownloadable: f.isDownloadable };
    if (needsUrl && f.url) body.url = f.url.trim();
    if (needsFile && f.fileId) body.fileId = f.fileId;
    if (t === 'FOLDER') body.folderId = Number(f.folderId);
    if (t === 'ASSESSMENT') body.assessmentId = Number(f.assessmentId);
    if (t === 'FORUM') body.forumId = Number(f.forumId);
    if (t === 'ACTIVITY') body.activityId = Number(f.activityId);
    if (t === 'LIVE_SESSION' && f.eventId) body.eventId = Number(f.eventId);
    setSaving(true);
    try {
      const r = await api.post<{ data: Resource }>(`/catalog/lessons/${lessonId}/resources`, body);
      toast.success('Recurso añadido');
      onCreated(r.data);
    } catch (ex) { toast.error(errorMessage(ex)); if (ex instanceof ApiError) setErr(ex.fieldErrors); } finally { setSaving(false); }
  };

  return (
    <div className="mt-3 grid gap-4 rounded-sm bg-stone p-4">
      <Select label="Tipo de recurso" value={t} onChange={(e) => setF({ ...f, type: e.target.value, fileId: null, fileName: '' })} options={toOptions(RESOURCE_TYPES)} />
      <Input label="Título" required value={f.title} error={err.title} onChange={(e) => setF({ ...f, title: e.target.value })} maxLength={200} />
      <Textarea label="Descripción" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} rows={2} />
      {needsUrl && <Input label={URL_OR_FILE.includes(t) ? 'URL (opcional si subes un archivo)' : 'URL'} type="url" value={f.url} error={err.url} onChange={(e) => setF({ ...f, url: e.target.value })} placeholder="https://…" />}
      {needsFile && (
        <div>
          <label className="mb-1.5 block text-[0.8125rem] font-semibold" htmlFor="res-file">Archivo</label>
          <input id="res-file" type="file" onChange={(e) => upload(e.target.files?.[0])} className="block w-full text-sm file:mr-3 file:rounded-sm file:border file:border-ink file:bg-paper file:px-3 file:py-1.5 file:text-sm file:font-semibold" />
          {uploading && <p className="mt-1 text-xs text-graphite" role="status">Subiendo…</p>}
          {f.fileName && <p className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-ink"><Check className="size-3.5" aria-hidden />Subido: {f.fileName}</p>}
          {err.file && <p className="mt-1 text-xs font-semibold text-danger">{err.file}</p>}
        </div>
      )}
      {t === 'FOLDER' && (
        <div className="grid gap-2">
          <Select label="Carpeta del curso" value={f.folderId} error={err.folderId} onChange={(e) => setF({ ...f, folderId: e.target.value })} placeholder="Elige una carpeta" options={(folders.data?.data ?? []).map((x) => ({ value: x.id, label: `${x.name} (${x.files.length})` }))} />
          <div className="flex items-end gap-2">
            <Input wrapperClassName="flex-1" aria-label="Nombre de la nueva carpeta" placeholder="O crea una carpeta nueva" value={newFolder} onChange={(e) => setNewFolder(e.target.value)} />
            <Button variant="outline" onClick={createFolder} disabled={!newFolder.trim()}>Crear</Button>
          </div>
        </div>
      )}
      {t === 'ASSESSMENT' && <Select label="Evaluación" value={f.assessmentId} error={err.assessmentId} onChange={(e) => setF({ ...f, assessmentId: e.target.value })} placeholder="Elige una evaluación" options={(assessments.data?.data ?? []).map((a) => ({ value: a.id, label: a.title }))} />}
      {t === 'FORUM' && <Select label="Foro" value={f.forumId} error={err.forumId} onChange={(e) => setF({ ...f, forumId: e.target.value })} placeholder="Elige un foro" options={(forums.data?.data ?? []).map((a) => ({ value: a.id, label: a.title }))} hint={forums.data?.data.length === 0 ? 'Este curso no tiene foros todavía.' : undefined} />}
      {t === 'ACTIVITY' && <Select label="Actividad" value={f.activityId} error={err.activityId} onChange={(e) => setF({ ...f, activityId: e.target.value })} placeholder="Elige una actividad" options={(activities.data ?? []).map((a) => ({ value: a.id, label: a.title }))} />}
      {t === 'LIVE_SESSION' && <Select label="Evento del calendario (opcional)" value={f.eventId} onChange={(e) => setF({ ...f, eventId: e.target.value })} placeholder="Sin evento vinculado" options={(events.data?.data ?? []).map((a) => ({ value: a.id, label: `${a.title} · ${new Date(a.startAt).toLocaleDateString('es-DO')}` }))} />}
      <div className="flex flex-wrap gap-6">
        <Checkbox label="Obligatorio" checked={f.isRequired} onChange={(e) => setF({ ...f, isRequired: e.target.checked })} />
        <Checkbox label="Descargable" checked={f.isDownloadable} onChange={(e) => setF({ ...f, isDownloadable: e.target.checked })} />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
        <Button variant="primary" loading={saving} disabled={uploading} onClick={submit}>Añadir recurso</Button>
      </div>
    </div>
  );
}
