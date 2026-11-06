import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, FolderPlus, Pencil, Trash2, Upload } from 'lucide-react';
import { api } from '@/lib/api';
import { useAction } from '@/lib/hooks';
import { dateTime, fileSize } from '@/lib/format';
import { Button, IconButton } from '@/components/ui/Button';
import { EmptyState, ErrorState, SkeletonRows } from '@/components/ui/Feedback';
import { Input } from '@/components/ui/Form';
import { ConfirmDialog, Modal } from '@/components/ui/Overlay';
import { FileDrop } from '@/components/ui/Upload';
import type { CourseFull, Folder } from './shared';

export default function TabArchivos({ course }: { course: CourseFull }) {
  const key = ['folders', course.id];
  const q = useQuery({ queryKey: key, queryFn: () => api.get<{ data: Folder[] }>(`/catalog/courses/${course.id}/folders`) });
  const [nameModal, setNameModal] = useState<Folder | 'new' | null>(null);
  const [name, setName] = useState('');
  const [delFolder, setDelFolder] = useState<Folder | null>(null);
  const [delFile, setDelFile] = useState<{ folder: Folder; fileId: number; name: string } | null>(null);
  const [uploadFor, setUploadFor] = useState<Folder | null>(null);
  const [files, setFiles] = useState<File[]>([]);

  const saveName = useAction(
    () => (nameModal === 'new' ? api.post(`/catalog/courses/${course.id}/folders`, { name: name.trim() }) : api.patch(`/catalog/folders/${(nameModal as Folder).id}`, { name: name.trim() })),
    { success: 'Carpeta guardada', invalidate: [key], onSuccess: () => setNameModal(null) },
  );
  const rmFolder = useAction((id: number) => api.del(`/catalog/folders/${id}`), { success: 'Carpeta eliminada', invalidate: [key], onSuccess: () => setDelFolder(null) });
  const rmFile = useAction((v: { folderId: number; fileId: number }) => api.del(`/catalog/folders/${v.folderId}/files/${v.fileId}`), { success: 'Archivo eliminado', invalidate: [key], onSuccess: () => setDelFile(null) });
  const upload = useAction(
    () => { const fd = new FormData(); files.forEach((f) => fd.append('files', f)); return api.upload(`/catalog/folders/${uploadFor!.id}/files`, fd); },
    { success: 'Archivos subidos', invalidate: [key], onSuccess: () => { setUploadFor(null); setFiles([]); } },
  );

  const openName = (f: Folder | 'new') => { setNameModal(f); setName(f === 'new' ? '' : f.name); };

  return (
    <div>
      <div className="mb-4 flex justify-end"><Button variant="primary" icon={<FolderPlus className="size-4" />} onClick={() => openName('new')}>Nueva carpeta</Button></div>
      {q.isLoading ? <SkeletonRows /> : q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : !q.data?.data.length ? (
        <EmptyState title="Este curso no tiene carpetas" description="Las carpetas agrupan material descargable que luego puedes añadir a una lección como recurso." action={<Button variant="primary" onClick={() => openName('new')}>Crear carpeta</Button>} />
      ) : (
        <div className="border-t border-ink">
          {q.data.data.map((fo) => (
            <section key={fo.id} className="border-b border-line py-4" aria-label={`Carpeta ${fo.name}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-base font-bold">{fo.name} <span className="text-sm font-normal text-muted tnum">({fo.files.length})</span></h3>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="outline" icon={<Upload className="size-4" />} onClick={() => { setUploadFor(fo); setFiles([]); }}>Subir archivos</Button>
                  <IconButton label={`Renombrar ${fo.name}`} size="sm" onClick={() => openName(fo)}><Pencil className="size-4" /></IconButton>
                  <IconButton label={`Eliminar carpeta ${fo.name}`} size="sm" onClick={() => setDelFolder(fo)}><Trash2 className="size-4 text-danger" /></IconButton>
                </div>
              </div>
              {fo.files.length === 0 ? <p className="mt-2 text-sm text-graphite">Carpeta vacía.</p> : (
                <ul className="mt-2 divide-y divide-line border-y border-line">
                  {fo.files.map((fi) => (
                    <li key={fi.id} className="flex flex-wrap items-center gap-3 py-2 text-sm">
                      <a href={fi.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate font-medium hover:underline">{fi.originalName}</a>
                      <span className="text-xs text-muted tnum">{fileSize(fi.size)} · {dateTime(fi.createdAt)}</span>
                      <a href={`${fi.url}?download=1`} aria-label={`Descargar ${fi.originalName}`} className="inline-flex size-8 items-center justify-center hover:bg-stone"><Download className="size-4" /></a>
                      <IconButton label={`Eliminar ${fi.originalName}`} size="sm" onClick={() => setDelFile({ folder: fo, fileId: fi.id, name: fi.originalName })}><Trash2 className="size-4 text-danger" /></IconButton>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}

      <Modal open={!!nameModal} onClose={() => setNameModal(null)} title={nameModal === 'new' ? 'Nueva carpeta' : 'Renombrar carpeta'} size="sm"
        footer={<><Button variant="ghost" onClick={() => setNameModal(null)}>Cancelar</Button><Button variant="primary" loading={saveName.isPending} disabled={!name.trim()} onClick={() => saveName.mutate()}>Guardar</Button></>}>
        <form onSubmit={(e) => { e.preventDefault(); if (name.trim()) saveName.mutate(); }}><Input label="Nombre" required value={name} onChange={(e) => setName(e.target.value)} /></form>
      </Modal>
      <Modal open={!!uploadFor} onClose={() => setUploadFor(null)} title={`Subir a «${uploadFor?.name ?? ''}»`} description="Hasta 10 archivos por subida."
        footer={<><Button variant="ghost" onClick={() => setUploadFor(null)}>Cancelar</Button><Button variant="primary" loading={upload.isPending} disabled={!files.length} onClick={() => upload.mutate()}>Subir {files.length || ''}</Button></>}>
        <FileDrop files={files} onChange={setFiles} maxFiles={10} hint="PDF, Office, imágenes, audio, video, ZIP" />
      </Modal>
      <ConfirmDialog open={!!delFolder} onClose={() => setDelFolder(null)} title="Eliminar carpeta" description={`Se eliminará «${delFolder?.name}» y los ${delFolder?.files.length ?? 0} archivos que contiene.`} confirmLabel="Eliminar" loading={rmFolder.isPending} onConfirm={() => delFolder && rmFolder.mutate(delFolder.id)} />
      <ConfirmDialog open={!!delFile} onClose={() => setDelFile(null)} title="Eliminar archivo" description={`Se eliminará «${delFile?.name}».`} confirmLabel="Eliminar" loading={rmFile.isPending} onConfirm={() => delFile && rmFile.mutate({ folderId: delFile.folder.id, fileId: delFile.fileId })} />
    </div>
  );
}
