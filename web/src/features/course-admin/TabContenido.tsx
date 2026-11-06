import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { GripVertical, Pencil, Plus, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAction } from '@/lib/hooks';
import { date, moduleSerial } from '@/lib/format';
import { Button, IconButton } from '@/components/ui/Button';
import { Tag } from '@/components/ui/Data';
import { EmptyState } from '@/components/ui/Feedback';
import { Input, Switch, Textarea } from '@/components/ui/Form';
import { ConfirmDialog, Modal } from '@/components/ui/Overlay';
import { MoveButtons, fromLocalInput, moveItem, toLocalInput, type CourseFull, type LessonBrief, type ModuleFull } from './shared';
import LessonDrawer from './LessonDrawer';

export default function TabContenido({ course }: { course: CourseFull }) {
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: ['course', course.id] });
  const [modal, setModal] = useState<ModuleFull | 'new' | null>(null);
  const [delModule, setDelModule] = useState<ModuleFull | null>(null);
  const [delLesson, setDelLesson] = useState<LessonBrief | null>(null);
  const [lesson, setLesson] = useState<{ moduleId: number; lessonId: number | 'new' } | null>(null);
  const [drag, setDrag] = useState<{ kind: 'module' | 'lesson'; id: number; moduleId?: number } | null>(null);

  const modules = course.modules;

  const reorderModules = useAction((ids: number[]) => api.put(`/catalog/courses/${course.id}/modules/order`, { ids }), { onSuccess: refresh });
  const reorderLessons = useAction((v: { moduleId: number; ids: number[] }) => api.put(`/catalog/modules/${v.moduleId}/lessons/order`, { ids: v.ids }), { onSuccess: refresh });
  const moveLesson = useAction((v: { id: number; moduleId: number; order: number }) => api.post(`/catalog/lessons/${v.id}/move`, { moduleId: v.moduleId, order: v.order }), { success: 'Lección movida', onSuccess: refresh });
  const removeModule = useAction((id: number) => api.del(`/catalog/modules/${id}`), { success: 'Módulo eliminado', onSuccess: () => { setDelModule(null); refresh(); } });
  const removeLesson = useAction((id: number) => api.del(`/catalog/lessons/${id}`), { success: 'Lección eliminada', onSuccess: () => { setDelLesson(null); refresh(); } });

  const moveModule = (from: number, to: number) => reorderModules.mutate(moveItem(modules, from, to).map((m) => m.id));
  const moveLessonIn = (m: ModuleFull, from: number, to: number) => reorderLessons.mutate({ moduleId: m.id, ids: moveItem(m.lessons, from, to).map((l) => l.id) });

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-graphite">{course.counts.modules} módulos · {course.counts.lessons} lecciones. Reordena con los botones o arrastrando el asa.</p>
        <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setModal('new')}>Nuevo módulo</Button>
      </div>

      {modules.length === 0 ? (
        <EmptyState title="Este curso aún no tiene módulos" description="Crea el primer módulo y añade sus lecciones. Para publicar el curso se necesita al menos una lección publicada." action={<Button variant="primary" onClick={() => setModal('new')}>Crear módulo</Button>} />
      ) : (
        <ol className="border-t border-ink">
          {modules.map((m, mi) => (
            <li
              key={m.id}
              className="border-b border-line py-5"
              onDragOver={(e) => { if (drag?.kind === 'module' || (drag?.kind === 'lesson' && drag.moduleId !== m.id)) e.preventDefault(); }}
              onDrop={(e) => {
                e.preventDefault();
                if (drag?.kind === 'module' && drag.id !== m.id) {
                  const from = modules.findIndex((x) => x.id === drag.id);
                  moveModule(from, mi);
                } else if (drag?.kind === 'lesson' && drag.moduleId !== m.id) {
                  moveLesson.mutate({ id: drag.id, moduleId: m.id, order: m.lessons.length });
                }
                setDrag(null);
              }}
              onDragEnd={() => setDrag(null)}
            >
              <div className="flex flex-wrap items-start gap-3">
                <span draggable onDragStart={(e) => { setDrag({ kind: 'module', id: m.id }); e.dataTransfer.effectAllowed = 'move'; }} onDragEnd={() => setDrag(null)} aria-hidden className="mt-1 cursor-grab text-muted" title="Arrastrar módulo"><GripVertical className="pointer-events-none size-4" /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold tnum text-graphite">{moduleSerial(mi)}</p>
                  <h3 className="text-lg font-bold tracking-tight">{m.title}</h3>
                  <div className="mt-1 flex flex-wrap gap-2">
                    <Tag tone={m.isPublished ? 'success' : 'warning'}>{m.isPublished ? 'Publicado' : 'Oculto'}</Tag>
                    {m.availableFrom && <Tag tone="outline">Desde {date(m.availableFrom)}</Tag>}
                  </div>
                  {m.description && <p className="mt-1 text-sm text-graphite">{m.description}</p>}
                </div>
                <div className="flex items-center">
                  <MoveButtons index={mi} total={modules.length} label={`módulo ${m.title}`} onMove={(to) => moveModule(mi, to)} />
                  <IconButton label={`Editar módulo ${m.title}`} size="sm" onClick={() => setModal(m)}><Pencil className="size-4" /></IconButton>
                  <IconButton label={`Eliminar módulo ${m.title}`} size="sm" onClick={() => setDelModule(m)}><Trash2 className="size-4 text-danger" /></IconButton>
                </div>
              </div>

              <ol className="mt-3 divide-y divide-line border-y border-line bg-paper sm:ml-7">
                {m.lessons.map((l, li) => (
                  <li
                    key={l.id}
                    className="flex flex-wrap items-center gap-2 py-2 pl-2"
                    draggable
                    onDragStart={(e) => { e.stopPropagation(); setDrag({ kind: 'lesson', id: l.id, moduleId: m.id }); e.dataTransfer.effectAllowed = 'move'; }}
                    onDragOver={(e) => { if (drag?.kind === 'lesson') { e.preventDefault(); e.stopPropagation(); } }}
                    onDrop={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      if (drag?.kind === 'lesson' && drag.id !== l.id) {
                        if (drag.moduleId === m.id) moveLessonIn(m, m.lessons.findIndex((x) => x.id === drag.id), li);
                        else moveLesson.mutate({ id: drag.id, moduleId: m.id, order: li });
                      }
                      setDrag(null);
                    }}
                    onDragEnd={() => setDrag(null)}
                  >
                    <GripVertical aria-hidden className="size-4 cursor-grab text-muted" />
                    <span className="w-14 text-xs font-semibold tnum text-graphite">{String(mi + 1).padStart(2, '0')}.{String(li + 1).padStart(2, '0')}</span>
                    <button type="button" onClick={() => setLesson({ moduleId: m.id, lessonId: l.id })} className="min-w-0 flex-1 text-left text-sm font-semibold hover:underline">{l.title}</button>
                    <span className="flex flex-wrap items-center gap-1.5">
                      {!l.isPublished && <Tag tone="warning">Borrador</Tag>}
                      {l.isPreview && <Tag tone="info">Vista previa</Tag>}
                      {l.resources.length > 0 && <Tag tone="outline">{l.resources.length} {l.resources.length === 1 ? 'recurso' : 'recursos'}</Tag>}
                      <span className="text-xs text-muted tnum">{l.durationMin} min</span>
                    </span>
                    <MoveButtons index={li} total={m.lessons.length} label={`lección ${l.title}`} onMove={(to) => moveLessonIn(m, li, to)} />
                    <IconButton label={`Eliminar lección ${l.title}`} size="sm" onClick={() => setDelLesson(l)}><Trash2 className="size-4 text-danger" /></IconButton>
                  </li>
                ))}
                {m.lessons.length === 0 && <li className="py-3 pl-2 text-sm text-graphite">Este módulo no tiene lecciones.</li>}
              </ol>
              <div className="mt-2 sm:ml-7">
                <Button variant="ghost" size="sm" icon={<Plus className="size-4" />} onClick={() => setLesson({ moduleId: m.id, lessonId: 'new' })}>Añadir lección</Button>
              </div>
            </li>
          ))}
        </ol>
      )}

      {modal && <ModuleModal course={course} module={modal === 'new' ? null : modal} onClose={() => setModal(null)} onSaved={refresh} />}
      {lesson && <LessonDrawer course={course} moduleId={lesson.moduleId} lessonId={lesson.lessonId} onClose={() => setLesson(null)} onChanged={refresh} />}
      <ConfirmDialog open={!!delModule} onClose={() => setDelModule(null)} title="Eliminar módulo" description={`Se eliminará «${delModule?.title}» junto con sus ${delModule?.lessons.length ?? 0} lecciones y recursos. No se puede deshacer.`} confirmLabel="Eliminar" loading={removeModule.isPending} onConfirm={() => delModule && removeModule.mutate(delModule.id)} />
      <ConfirmDialog open={!!delLesson} onClose={() => setDelLesson(null)} title="Eliminar lección" description={`Se eliminará «${delLesson?.title}» con sus recursos y el progreso asociado.`} confirmLabel="Eliminar" loading={removeLesson.isPending} onConfirm={() => delLesson && removeLesson.mutate(delLesson.id)} />
    </div>
  );
}

function ModuleModal({ course, module, onClose, onSaved }: { course: CourseFull; module: ModuleFull | null; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ title: module?.title ?? '', description: module?.description ?? '', isPublished: module?.isPublished ?? true, availableFrom: toLocalInput(module?.availableFrom) });
  const [err, setErr] = useState<string>();
  const save = useAction(
    () => {
      const body = { title: f.title.trim(), description: f.description.trim() || null, isPublished: f.isPublished, availableFrom: fromLocalInput(f.availableFrom) };
      return module ? api.patch(`/catalog/modules/${module.id}`, body) : api.post(`/catalog/courses/${course.id}/modules`, body);
    },
    { success: 'Módulo guardado', onSuccess: () => { onSaved(); onClose(); } },
  );
  return (
    <Modal open onClose={onClose} title={module ? 'Editar módulo' : 'Nuevo módulo'}
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button variant="primary" loading={save.isPending} onClick={() => (f.title.trim().length < 2 ? setErr('Mínimo 2 caracteres') : save.mutate())}>Guardar</Button></>}>
      <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); if (f.title.trim().length < 2) setErr('Mínimo 2 caracteres'); else save.mutate(); }}>
        <Input label="Título" required value={f.title} error={err} onChange={(e) => { setErr(undefined); setF({ ...f, title: e.target.value }); }} maxLength={200} />
        <Textarea label="Descripción" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} rows={3} />
        <Input label="Disponible desde" type="datetime-local" value={f.availableFrom} onChange={(e) => setF({ ...f, availableFrom: e.target.value })} hint="Vacío = disponible de inmediato" />
        <Switch checked={f.isPublished} onChange={(v) => setF({ ...f, isPublished: v })} label="Publicado" hint="Los módulos ocultos no los ven los estudiantes." />
      </form>
    </Modal>
  );
}
