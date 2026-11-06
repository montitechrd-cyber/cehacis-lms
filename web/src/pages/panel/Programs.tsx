import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { api, ApiError, type Paged } from '@/lib/api';
import { useAction } from '@/lib/hooks';
import { COURSE_STATUS, money } from '@/lib/format';
import { PageHeader } from '@/components/ui/Page';
import { Button, IconButton } from '@/components/ui/Button';
import { DataTable, Tag, statusTone, type Column } from '@/components/ui/Data';
import { EmptyState, ErrorState, PageLoader } from '@/components/ui/Feedback';
import { Input, Select, Textarea } from '@/components/ui/Form';
import { ConfirmDialog, Drawer } from '@/components/ui/Overlay';
import { MoveButtons, moveItem, toOptions } from '@/features/course-admin/shared';

interface ProgramRow {
  id: number;
  title: string;
  slug: string;
  summary: string | null;
  price: number;
  status: string;
  coursesCount: number;
}
interface ProgramCourse { id: number; code: string; title: string; status: string; order: number }
interface ProgramFull extends Omit<ProgramRow, 'coursesCount'> {
  description: string | null;
  imageUrl: string | null;
  courses: ProgramCourse[];
}

export default function Programs() {
  const q = useQuery({ queryKey: ['programs'], queryFn: () => api.get<{ data: ProgramRow[] }>('/catalog/programs') });
  const [edit, setEdit] = useState<number | 'new' | null>(null);
  const [del, setDel] = useState<ProgramRow | null>(null);
  const remove = useAction((id: number) => api.del(`/catalog/programs/${id}`), { success: 'Programa eliminado', invalidate: [['programs']], onSuccess: () => setDel(null) });

  const columns: Column<ProgramRow>[] = [
    { key: 'title', header: 'Programa', className: 'min-w-[16rem]', cell: (p) => (<div><button type="button" className="text-left font-semibold hover:underline" onClick={() => setEdit(p.id)}>{p.title}</button>{p.summary && <p className="text-xs text-muted">{p.summary}</p>}</div>) },
    { key: 'status', header: 'Estado', cell: (p) => <Tag tone={statusTone(p.status)}>{COURSE_STATUS[p.status] ?? p.status}</Tag> },
    { key: 'price', header: 'Precio', align: 'right', cell: (p) => (p.price ? money(p.price) : 'Gratis') },
    { key: 'courses', header: 'Cursos', align: 'right', cell: (p) => p.coursesCount },
    { key: 'actions', header: <span className="sr-only">Acciones</span>, align: 'right', cell: (p) => (
      <div className="flex justify-end">
        <IconButton label={`Editar ${p.title}`} size="sm" onClick={() => setEdit(p.id)}><Pencil className="size-4" /></IconButton>
        <IconButton label={`Eliminar ${p.title}`} size="sm" onClick={() => setDel(p)}><Trash2 className="size-4 text-danger" /></IconButton>
      </div>
    ) },
  ];

  return (
    <div className="animate-rise">
      <PageHeader title="Programas formativos" description="Agrupan cursos en una ruta ordenada." actions={<Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setEdit('new')}>Nuevo programa</Button>} />
      {q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : (
        <DataTable columns={columns} rows={q.data?.data} rowKey={(p) => p.id} loading={q.isLoading}
          empty={<EmptyState title="Aún no hay programas" description="Crea un programa y asígnale cursos en el orden en que deben cursarse." action={<Button variant="primary" onClick={() => setEdit('new')}>Nuevo programa</Button>} />} />
      )}
      {edit !== null && <ProgramDrawer id={edit} onClose={() => setEdit(null)} />}
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} title="Eliminar programa" description={`Se eliminará «${del?.title}». Los cursos no se borran.`} confirmLabel="Eliminar" loading={remove.isPending} onConfirm={() => del && remove.mutate(del.id)} />
    </div>
  );
}

function ProgramDrawer({ id, onClose }: { id: number | 'new'; onClose: () => void }) {
  const isNew = id === 'new';
  const detail = useQuery({ queryKey: ['program', id], enabled: !isNew, queryFn: () => api.get<{ data: ProgramFull }>(`/catalog/programs/${id}`) });
  const allCourses = useQuery({ queryKey: ['panel-courses', 'all-for-programs'], queryFn: () => api.get<Paged<{ id: number; code: string; title: string; status: string }>>('/catalog/courses', { pageSize: 100, sort: 'title', order: 'asc' }) });
  const [f, setF] = useState({ title: '', summary: '', description: '', price: '0', status: 'DRAFT', imageUrl: '' });
  const [courseIds, setCourseIds] = useState<number[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pick, setPick] = useState('');

  useEffect(() => {
    const p = detail.data?.data;
    if (!p) return;
    setF({ title: p.title, summary: p.summary ?? '', description: p.description ?? '', price: String(p.price ?? 0), status: p.status, imageUrl: p.imageUrl ?? '' });
    setCourseIds(p.courses.map((c) => c.id));
  }, [detail.data]);

  const save = useAction(
    async () => {
      const body = { title: f.title.trim(), summary: f.summary.trim() || null, description: f.description.trim() || null, price: Number(f.price) || 0, status: f.status, imageUrl: f.imageUrl.trim() || null };
      const r = isNew ? await api.post<{ data: { id: number } }>('/catalog/programs', body) : await api.patch<{ data: { id: number } }>(`/catalog/programs/${id}`, body);
      await api.put(`/catalog/programs/${r.data.id}/courses`, { courseIds });
      return r;
    },
    { success: 'Programa guardado', invalidate: [['programs'], ['program']], silentError: true, onSuccess: onClose },
  );
  const submit = async () => {
    setErrors({});
    if (f.title.trim().length < 3) return setErrors({ title: 'El título debe tener al menos 3 caracteres' });
    try { await save.mutateAsync(); } catch (e) {
      if (e instanceof ApiError) setErrors(Object.keys(e.fieldErrors).length ? e.fieldErrors : { title: e.message });
    }
  };

  const courseMap = new Map((allCourses.data?.data ?? []).map((c) => [c.id, c]));
  const available = (allCourses.data?.data ?? []).filter((c) => !courseIds.includes(c.id));

  return (
    <Drawer open onClose={onClose} title={isNew ? 'Nuevo programa' : 'Editar programa'}
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button variant="primary" loading={save.isPending} onClick={submit}>Guardar</Button></>}>
      {!isNew && detail.isLoading ? <PageLoader /> : detail.isError ? <ErrorState error={detail.error} onRetry={() => detail.refetch()} /> : (
        <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <Input label="Título" required value={f.title} error={errors.title} onChange={(e) => setF({ ...f, title: e.target.value })} maxLength={200} />
          <Textarea label="Resumen" value={f.summary} error={errors.summary} onChange={(e) => setF({ ...f, summary: e.target.value })} maxLength={500} rows={2} />
          <Textarea label="Descripción" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} rows={5} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Precio (USD)" type="number" min={0} step="0.01" value={f.price} error={errors.price} onChange={(e) => setF({ ...f, price: e.target.value })} />
            <Select label="Estado" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })} options={toOptions(COURSE_STATUS)} />
          </div>
          <Input label="URL de la imagen" type="url" value={f.imageUrl} error={errors.imageUrl} onChange={(e) => setF({ ...f, imageUrl: e.target.value })} placeholder="https://…" />

          <fieldset className="border-t border-ink pt-4">
            <legend className="sr-only">Cursos del programa</legend>
            <h3 className="mb-2 text-sm font-bold">Cursos del programa (en orden)</h3>
            {courseIds.length === 0 ? <p className="text-sm text-graphite">Sin cursos todavía.</p> : (
              <ol className="divide-y divide-line border-y border-line">
                {courseIds.map((cid, i) => {
                  const c = courseMap.get(cid);
                  return (
                    <li key={cid} className="flex items-center gap-2 py-1.5 text-sm">
                      <span className="w-6 text-xs text-muted tnum">{i + 1}</span>
                      <span className="min-w-0 flex-1 truncate">{c ? `${c.code} · ${c.title}` : `Curso ${cid}`}</span>
                      <MoveButtons index={i} total={courseIds.length} label="curso" onMove={(to) => setCourseIds(moveItem(courseIds, i, to))} />
                      <IconButton label="Quitar del programa" size="sm" onClick={() => setCourseIds(courseIds.filter((x) => x !== cid))}><X className="size-4" /></IconButton>
                    </li>
                  );
                })}
              </ol>
            )}
            <div className="mt-3 flex items-end gap-2">
              <Select wrapperClassName="flex-1" aria-label="Añadir curso" value={pick} onChange={(e) => setPick(e.target.value)} placeholder="Añadir un curso…" options={available.map((c) => ({ value: c.id, label: `${c.code} · ${c.title}` }))} />
              <Button variant="outline" disabled={!pick} onClick={() => { setCourseIds([...courseIds, Number(pick)]); setPick(''); }}>Añadir</Button>
            </div>
          </fieldset>
        </form>
      )}
    </Drawer>
  );
}
