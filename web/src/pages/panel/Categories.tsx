import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
import { useAction } from '@/lib/hooks';
import { PageHeader } from '@/components/ui/Page';
import { Button, IconButton } from '@/components/ui/Button';
import { DataTable, type Column } from '@/components/ui/Data';
import { EmptyState, ErrorState } from '@/components/ui/Feedback';
import { Input, Textarea } from '@/components/ui/Form';
import { ConfirmDialog, Modal } from '@/components/ui/Overlay';
import type { Category } from '@/features/course-admin/shared';

export default function Categories() {
  const q = useQuery({ queryKey: ['categories'], queryFn: () => api.get<{ data: Category[] }>('/catalog/categories') });
  const [edit, setEdit] = useState<Category | 'new' | null>(null);
  const [del, setDel] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const open = (c: Category | 'new') => {
    setEdit(c);
    setErrors({});
    setName(c === 'new' ? '' : c.name);
    setDescription(c === 'new' ? '' : c.description ?? '');
  };

  const save = useAction(
    () => {
      const body = { name: name.trim(), description: description.trim() || null };
      return edit === 'new' ? api.post('/catalog/categories', body) : api.patch(`/catalog/categories/${(edit as Category).id}`, body);
    },
    { success: 'Categoría guardada', invalidate: [['categories']], silentError: true, onSuccess: () => setEdit(null) },
  );
  const submit = async () => {
    setErrors({});
    if (name.trim().length < 2) return setErrors({ name: 'El nombre debe tener al menos 2 caracteres' });
    try { await save.mutateAsync(); } catch (e) {
      if (e instanceof ApiError) {
        if (Object.keys(e.fieldErrors).length) setErrors(e.fieldErrors);
        else toast.error(e.message);
      }
    }
  };
  const remove = useAction((id: number) => api.del(`/catalog/categories/${id}`), {
    success: 'Categoría eliminada', invalidate: [['categories']], onSuccess: () => setDel(null),
    silentError: true,
  });
  const doDelete = async () => {
    if (!del) return;
    try { await remove.mutateAsync(del.id); } catch (e) {
      toast.error(e instanceof ApiError && e.status === 409 ? 'No se puede eliminar: la categoría tiene cursos asociados. Reasígnalos primero.' : e instanceof Error ? e.message : 'Error');
      setDel(null);
    }
  };

  const columns: Column<Category>[] = [
    { key: 'name', header: 'Nombre', cell: (c) => <span className="font-semibold">{c.name}</span> },
    { key: 'slug', header: 'Identificador', cell: (c) => <span className="text-graphite">{c.slug}</span> },
    { key: 'description', header: 'Descripción', className: 'min-w-[14rem]', cell: (c) => c.description || <span className="text-muted">—</span> },
    { key: 'courses', header: 'Cursos', align: 'right', cell: (c) => c.coursesCount },
    {
      key: 'actions', header: <span className="sr-only">Acciones</span>, align: 'right',
      cell: (c) => (
        <div className="flex justify-end">
          <IconButton label={`Editar ${c.name}`} size="sm" onClick={() => open(c)}><Pencil className="size-4" /></IconButton>
          <IconButton label={c.coursesCount ? `${c.name} tiene cursos y no se puede eliminar` : `Eliminar ${c.name}`} size="sm" disabled={c.coursesCount > 0} onClick={() => setDel(c)}><Trash2 className="size-4 text-danger" /></IconButton>
        </div>
      ),
    },
  ];

  return (
    <div className="animate-rise">
      <PageHeader title="Categorías" description="Clasifican los cursos del catálogo. Una categoría con cursos no puede eliminarse." actions={<Button variant="primary" icon={<Plus className="size-4" />} onClick={() => open('new')}>Nueva categoría</Button>} />
      {q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : (
        <DataTable columns={columns} rows={q.data?.data} rowKey={(c) => c.id} loading={q.isLoading}
          empty={<EmptyState title="Aún no hay categorías" description="Crea la primera para organizar los cursos." action={<Button variant="primary" onClick={() => open('new')}>Nueva categoría</Button>} />} />
      )}
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit === 'new' ? 'Nueva categoría' : 'Editar categoría'} size="sm"
        footer={<><Button variant="ghost" onClick={() => setEdit(null)}>Cancelar</Button><Button variant="primary" loading={save.isPending} onClick={submit}>Guardar</Button></>}>
        <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <Input label="Nombre" required value={name} onChange={(e) => setName(e.target.value)} error={errors.name} maxLength={100} />
          <Textarea label="Descripción" value={description} onChange={(e) => setDescription(e.target.value)} error={errors.description} maxLength={500} rows={3} />
        </form>
      </Modal>
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} title="Eliminar categoría" description={`Se eliminará «${del?.name}». Esta acción no se puede deshacer.`} confirmLabel="Eliminar" loading={remove.isPending} onConfirm={doDelete} />
    </div>
  );
}
