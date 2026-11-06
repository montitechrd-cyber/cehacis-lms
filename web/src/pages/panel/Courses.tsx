import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Archive, Copy, ExternalLink, Plus, Trash2 } from 'lucide-react';
import { api, ApiError, type Paged } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useAction, useTableParams } from '@/lib/hooks';
import { COURSE_STATUS, LEVELS, MODALITIES, money, num } from '@/lib/format';
import { PageHeader } from '@/components/ui/Page';
import { Button, IconButton } from '@/components/ui/Button';
import { Avatar, DataTable, Pagination, SearchInput, Tag, Toolbar, statusTone, type Column } from '@/components/ui/Data';
import { ErrorState, EmptyState } from '@/components/ui/Feedback';
import { Input, Select } from '@/components/ui/Form';
import { ConfirmDialog, Modal } from '@/components/ui/Overlay';
import { toOptions, type Category, type UserBrief } from '@/features/course-admin/shared';

interface CourseRow {
  id: number;
  code: string;
  title: string;
  subtitle?: string | null;
  status: string;
  level: string;
  modality: string;
  price: number;
  isFree: boolean;
  category: { id: number; name: string } | null;
  instructors: UserBrief[];
  counts: { modules: number; lessons: number; enrollments: number };
}

export default function Courses() {
  const nav = useNavigate();
  const { can } = useAuth();
  const isAdmin = can('courses.manage');
  const t = useTableParams();
  const [creating, setCreating] = useState(false);
  const [confirm, setConfirm] = useState<{ kind: 'archive' | 'delete'; row: CourseRow } | null>(null);

  const query = {
    q: t.get('q'), status: t.get('status'), categoryId: t.get('categoryId'), level: t.get('level'), modality: t.get('modality'),
    page: t.page, pageSize: 20, sort: t.get('sort'), order: t.get('order'),
  };
  const list = useQuery({ queryKey: ['panel-courses', query], queryFn: () => api.get<Paged<CourseRow>>('/catalog/courses', query), placeholderData: (p) => p });
  const cats = useQuery({ queryKey: ['categories'], queryFn: () => api.get<{ data: Category[] }>('/catalog/categories') });

  const duplicate = useAction((id: number) => api.post<{ data: { id: number } }>(`/catalog/courses/${id}/duplicate`), {
    success: 'Curso duplicado como borrador',
    invalidate: [['panel-courses']],
    onSuccess: (r) => nav(`/panel/cursos/${r.data.id}`),
  });
  const archive = useAction((id: number) => api.post(`/catalog/courses/${id}/status`, { status: 'ARCHIVED' }), {
    success: 'Curso archivado', invalidate: [['panel-courses']], onSuccess: () => setConfirm(null),
  });
  const remove = useAction((id: number) => api.del<{ mode?: string }>(`/catalog/courses/${id}`), {
    success: (r) => (r?.mode === 'soft' ? 'Curso archivado (tiene inscripciones)' : 'Curso eliminado'),
    invalidate: [['panel-courses']], onSuccess: () => setConfirm(null),
  });

  const columns: Column<CourseRow>[] = [
    { key: 'code', header: 'Código', cell: (r) => <span className="font-semibold">{r.code}</span> },
    {
      key: 'title', header: 'Título', sortable: true, className: 'min-w-[16rem]',
      cell: (r) => (
        <div>
          <button type="button" onClick={() => nav(`/panel/cursos/${r.id}`)} className="text-left font-semibold hover:underline">{r.title}</button>
          {r.subtitle && <p className="text-xs text-muted">{r.subtitle}</p>}
          {r.category && <p className="text-xs text-graphite">{r.category.name}</p>}
        </div>
      ),
    },
    { key: 'status', header: 'Estado', cell: (r) => <Tag tone={statusTone(r.status)}>{COURSE_STATUS[r.status] ?? r.status}</Tag> },
    { key: 'level', header: 'Nivel', cell: (r) => LEVELS[r.level] ?? r.level },
    { key: 'modality', header: 'Modalidad', cell: (r) => MODALITIES[r.modality] ?? r.modality },
    { key: 'price', header: 'Precio', sortable: true, align: 'right', cell: (r) => (r.isFree || !r.price ? 'Gratis' : money(r.price)) },
    {
      key: 'instructors', header: 'Facilitadores',
      cell: (r) =>
        r.instructors.length ? (
          <div className="flex -space-x-1.5">
            {r.instructors.slice(0, 4).map((u) => (
              <span key={u.id} title={`${u.firstName} ${u.lastName}`}><Avatar user={u} size={26} className="ring-2 ring-paper" /></span>
            ))}
            {r.instructors.length > 4 && <span className="pl-3 text-xs text-muted">+{r.instructors.length - 4}</span>}
          </div>
        ) : <span className="text-muted">—</span>,
    },
    { key: 'content', header: 'Módulos / lecciones', align: 'right', cell: (r) => `${r.counts.modules} / ${r.counts.lessons}` },
    { key: 'enrollments', header: 'Inscritos', align: 'right', cell: (r) => num(r.counts.enrollments) },
    {
      key: 'actions', header: <span className="sr-only">Acciones</span>, align: 'right',
      cell: (r) => (
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          <IconButton label={`Abrir ${r.title}`} size="sm" onClick={() => nav(`/panel/cursos/${r.id}`)}><ExternalLink className="size-4" /></IconButton>
          {isAdmin && (
            <>
              <IconButton label={`Duplicar ${r.title}`} size="sm" onClick={() => duplicate.mutate(r.id)} disabled={duplicate.isPending}><Copy className="size-4" /></IconButton>
              {r.status !== 'ARCHIVED' && <IconButton label={`Archivar ${r.title}`} size="sm" onClick={() => setConfirm({ kind: 'archive', row: r })}><Archive className="size-4" /></IconButton>}
              <IconButton label={`Eliminar ${r.title}`} size="sm" onClick={() => setConfirm({ kind: 'delete', row: r })}><Trash2 className="size-4 text-danger" /></IconButton>
            </>
          )}
        </div>
      ),
    },
  ];

  const filtered = !!(t.get('q') || t.get('status') || t.get('categoryId') || t.get('level') || t.get('modality'));

  return (
    <div className="animate-rise">
      <PageHeader
        title="Cursos"
        description={isAdmin ? 'Todos los cursos del catálogo.' : 'Los cursos que facilitas.'}
        actions={isAdmin && <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setCreating(true)}>Nuevo curso</Button>}
      />
      <Toolbar>
        <SearchInput className="w-full sm:w-72" value={t.get('q')} onChange={(v) => t.set({ q: v })} placeholder="Buscar por título o código" />
        <Select aria-label="Estado" wrapperClassName="w-40" value={t.get('status')} onChange={(e) => t.set({ status: e.target.value })} placeholder="Todos los estados" options={toOptions(COURSE_STATUS)} />
        <Select aria-label="Categoría" wrapperClassName="w-44" value={t.get('categoryId')} onChange={(e) => t.set({ categoryId: e.target.value })} placeholder="Todas las categorías" options={(cats.data?.data ?? []).map((c) => ({ value: c.id, label: c.name }))} />
        <Select aria-label="Nivel" wrapperClassName="w-36" value={t.get('level')} onChange={(e) => t.set({ level: e.target.value })} placeholder="Todos los niveles" options={toOptions(LEVELS)} />
        <Select aria-label="Modalidad" wrapperClassName="w-40" value={t.get('modality')} onChange={(e) => t.set({ modality: e.target.value })} placeholder="Toda modalidad" options={toOptions(MODALITIES)} />
      </Toolbar>

      {list.isError ? (
        <ErrorState error={list.error} onRetry={() => list.refetch()} />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={list.data?.data}
            rowKey={(r) => r.id}
            loading={list.isLoading || list.isFetching}
            sort={t.sort}
            onSort={t.toggleSort}
            empty={
              <EmptyState
                title={filtered ? 'Ningún curso coincide con los filtros' : 'Aún no hay cursos'}
                description={filtered ? 'Prueba con otra búsqueda o limpia los filtros.' : isAdmin ? 'Crea el primer curso para empezar a construir el catálogo.' : 'Cuando te asignen cursos aparecerán aquí.'}
                action={isAdmin && !filtered && <Button variant="primary" onClick={() => setCreating(true)}>Nuevo curso</Button>}
              />
            }
          />
          {list.data && <Pagination page={list.data.meta.page} pages={list.data.meta.pages} total={list.data.meta.total} onPage={(p) => t.set({ page: p }, false)} />}
        </>
      )}

      <NewCourseModal open={creating} onClose={() => setCreating(false)} categories={cats.data?.data ?? []} />
      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={confirm?.kind === 'archive' ? 'Archivar curso' : 'Eliminar curso'}
        description={
          confirm?.kind === 'archive'
            ? `«${confirm.row.title}» dejará de estar visible en el catálogo; las inscripciones se conservan.`
            : `«${confirm?.row.title}» se eliminará. Si tiene inscripciones se archivará en su lugar; si no, se borrará definitivamente.`
        }
        confirmLabel={confirm?.kind === 'archive' ? 'Archivar' : 'Eliminar'}
        loading={archive.isPending || remove.isPending}
        onConfirm={() => confirm && (confirm.kind === 'archive' ? archive.mutate(confirm.row.id) : remove.mutate(confirm.row.id))}
      />
    </div>
  );
}

function NewCourseModal({ open, onClose, categories }: { open: boolean; onClose: () => void; categories: Category[] }) {
  const nav = useNavigate();
  const [f, setF] = useState({ title: '', categoryId: '', level: 'BASIC', modality: 'VIRTUAL' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const create = useAction(
    () => api.post<{ data: { id: number } }>('/catalog/courses', { title: f.title.trim(), categoryId: f.categoryId ? Number(f.categoryId) : null, level: f.level, modality: f.modality }),
    {
      success: 'Curso creado', invalidate: [['panel-courses']], silentError: true,
      onSuccess: (r) => { onClose(); setF({ title: '', categoryId: '', level: 'BASIC', modality: 'VIRTUAL' }); nav(`/panel/cursos/${r.data.id}`); },
    },
  );
  const submit = async () => {
    setErrors({});
    if (f.title.trim().length < 3) return setErrors({ title: 'El título debe tener al menos 3 caracteres' });
    try { await create.mutateAsync(); } catch (e) {
      if (e instanceof ApiError) setErrors(Object.keys(e.fieldErrors).length ? e.fieldErrors : { title: e.message });
    }
  };
  return (
    <Modal open={open} onClose={onClose} title="Nuevo curso" description="Se crea como borrador; completarás el resto en el editor."
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button variant="primary" loading={create.isPending} onClick={submit}>Crear y abrir editor</Button></>}>
      <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <Input label="Título" required value={f.title} error={errors.title} onChange={(e) => setF({ ...f, title: e.target.value })} maxLength={200} />
        <Select label="Categoría" value={f.categoryId} onChange={(e) => setF({ ...f, categoryId: e.target.value })} placeholder="Sin categoría" options={categories.map((c) => ({ value: c.id, label: c.name }))} error={errors.categoryId} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Nivel" value={f.level} onChange={(e) => setF({ ...f, level: e.target.value })} options={toOptions(LEVELS)} />
          <Select label="Modalidad" value={f.modality} onChange={(e) => setF({ ...f, modality: e.target.value })} options={toOptions(MODALITIES)} />
        </div>
      </form>
    </Modal>
  );
}
