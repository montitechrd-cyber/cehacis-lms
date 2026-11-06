import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Download, Eye, FilePlus2, Pencil, Plus, RotateCcw, Trash2, Ban } from 'lucide-react';
import { api, download, errorMessage, ApiError, type Paged } from '@/lib/api';
import { date, fullName } from '@/lib/format';
import { useAction, useTableParams } from '@/lib/hooks';
import { PageHeader } from '@/components/ui/Page';
import { Button, IconButton } from '@/components/ui/Button';
import { Avatar, DataTable, Pagination, SearchInput, Tabs, Tag, Toolbar, type Column } from '@/components/ui/Data';
import { Checkbox, Input, Select, Textarea } from '@/components/ui/Form';
import { Modal, ConfirmDialog } from '@/components/ui/Overlay';
import { EmptyState, ErrorState, SkeletonRows } from '@/components/ui/Feedback';
import { StudentPicker, courseOptions, useCourses, type PersonBrief } from '@/features/operations/shared';

interface Cert {
  id: number;
  code: string;
  recipientName: string;
  title: string;
  hours: number | null;
  finalGrade: number | null;
  status: 'VALID' | 'REVOKED';
  revokedReason: string | null;
  issuedAt: string;
  user: { id: number; firstName: string; lastName: string; email: string; avatarUrl: string | null };
  course: { id: number; code: string; title: string } | null;
}

interface Template {
  id: number;
  name: string;
  heading: string;
  body: string;
  primaryColor: string;
  signatureName: string | null;
  signatureTitle: string | null;
  signatureFileId: number | null;
  logoFileId: number | null;
  isDefault: boolean;
  _count?: { certificates: number };
}

const safe = async (fn: () => Promise<unknown>) => {
  try {
    await fn();
  } catch (e) {
    toast.error(errorMessage(e));
  }
};

function Issued() {
  const t = useTableParams();
  const courses = useCourses();
  const [revoke, setRevoke] = useState<Cert | null>(null);
  const [reason, setReason] = useState('');
  const [issueOpen, setIssueOpen] = useState(false);
  const params = { q: t.get('q'), status: t.get('status'), courseId: t.get('courseId'), page: t.page, pageSize: 20 };
  const q = useQuery({ queryKey: ['certificates', 'list', params], queryFn: () => api.get<Paged<Cert>>('/certificates', params), placeholderData: (p) => p });
  const doRevoke = useAction(() => api.post(`/certificates/${revoke!.id}/revoke`, { reason }), {
    success: 'Certificado revocado',
    invalidate: [['certificates']],
    onSuccess: () => { setRevoke(null); setReason(''); },
  });
  const restore = useAction((id: number) => api.post(`/certificates/${id}/restore`), { success: 'Certificado restaurado', invalidate: [['certificates']] });

  const cols: Column<Cert>[] = [
    { key: 'user', header: 'Estudiante', cell: (c) => (
      <div className="flex min-w-0 items-center gap-3">
        <Avatar user={c.user} size={32} />
        <div className="min-w-0"><p className="truncate font-semibold">{c.recipientName}</p><p className="truncate text-xs text-muted">{c.user.email}</p></div>
      </div>
    ) },
    { key: 'title', header: 'Certificado', cell: (c) => <div><p className="font-semibold">{c.title}</p><p className="text-xs text-muted tnum">{c.code}</p></div> },
    { key: 'hours', header: 'Horas', align: 'right', cell: (c) => c.hours ?? '—' },
    { key: 'grade', header: 'Nota', align: 'right', cell: (c) => (c.finalGrade != null ? c.finalGrade : '—') },
    { key: 'issued', header: 'Emitido', cell: (c) => date(c.issuedAt) },
    { key: 'status', header: 'Estado', cell: (c) => <Tag tone={c.status === 'VALID' ? 'success' : 'danger'} className="">{c.status === 'VALID' ? 'Vigente' : 'Revocado'}</Tag> },
    { key: 'actions', header: <span className="sr-only">Acciones</span>, align: 'right', cell: (c) => (
      <div className="flex justify-end gap-1">
        <IconButton size="sm" label={`Descargar PDF de ${c.code}`} onClick={() => safe(() => download(`/certificates/${c.id}/pdf`, `certificado-${c.code}.pdf`))}><Download className="size-4" /></IconButton>
        {c.status === 'VALID' ? (
          <IconButton size="sm" label={`Revocar ${c.code}`} onClick={() => setRevoke(c)}><Ban className="size-4" /></IconButton>
        ) : (
          <IconButton size="sm" label={`Restaurar ${c.code}`} onClick={() => restore.mutate(c.id)}><RotateCcw className="size-4" /></IconButton>
        )}
      </div>
    ) },
  ];

  return (
    <div>
      <Toolbar>
        <SearchInput className="w-full sm:w-72" value={t.get('q')} onChange={(v) => t.set({ q: v })} placeholder="Buscar por código, nombre o correo" />
        <Select label="Estado" wrapperClassName="w-full sm:w-44" value={t.get('status')} onChange={(e) => t.set({ status: e.target.value })} placeholder="Todos" options={[{ value: 'VALID', label: 'Vigentes' }, { value: 'REVOKED', label: 'Revocados' }]} />
        <Select label="Curso" wrapperClassName="w-full sm:w-60" value={t.get('courseId')} onChange={(e) => t.set({ courseId: e.target.value })} placeholder="Todos los cursos" options={courseOptions(courses.data)} />
        <Button variant="primary" className="ml-auto" icon={<FilePlus2 className="size-4" />} onClick={() => setIssueOpen(true)}>Emitir manualmente</Button>
      </Toolbar>
      {q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : (
        <>
          <DataTable columns={cols} rows={q.data?.data} rowKey={(c) => c.id} loading={q.isLoading}
            empty={<EmptyState title="Aún no hay certificados" description="Se emiten automáticamente al completar un curso o puedes emitirlos manualmente." />} />
          <Pagination page={q.data?.meta.page ?? 1} pages={q.data?.meta.pages ?? 1} total={q.data?.meta.total} onPage={(p) => t.set({ page: p }, false)} />
        </>
      )}
      <Modal open={!!revoke} onClose={() => setRevoke(null)} size="sm" title="Revocar certificado" description={revoke ? `${revoke.code} · ${revoke.recipientName}` : undefined}
        footer={<><Button variant="ghost" onClick={() => setRevoke(null)}>Cancelar</Button><Button variant="danger" loading={doRevoke.isPending} disabled={reason.trim().length < 3} onClick={() => doRevoke.mutate()}>Revocar</Button></>}>
        <Textarea label="Motivo" required value={reason} onChange={(e) => setReason(e.target.value)} hint="Quedará registrado y visible en la verificación pública." />
      </Modal>
      <IssueModal open={issueOpen} onClose={() => setIssueOpen(false)} />
    </div>
  );
}

function IssueModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const courses = useCourses(open);
  const [student, setStudent] = useState<PersonBrief[]>([]);
  const [courseId, setCourseId] = useState('');
  const [title, setTitle] = useState('');
  const [hours, setHours] = useState('');
  const [grade, setGrade] = useState('');
  const [err, setErr] = useState<Record<string, string>>({});
  useEffect(() => { if (open) { setStudent([]); setCourseId(''); setTitle(''); setHours(''); setGrade(''); setErr({}); } }, [open]);
  const issue = useAction(
    () => api.post('/certificates/issue', {
      userId: student[0]?.id,
      ...(courseId ? { courseId: Number(courseId) } : {}),
      ...(title.trim() ? { title: title.trim() } : {}),
      ...(hours ? { hours: Number(hours) } : {}),
      ...(grade ? { finalGrade: Number(grade) } : {}),
    }),
    { success: 'Certificado emitido', invalidate: [['certificates']], onSuccess: onClose, silentError: true },
  );
  const submit = () => {
    if (!student.length) return setErr({ user: 'Elige un estudiante' });
    if (!courseId && !title.trim()) return setErr({ courseId: 'Elige un curso o escribe un título' });
    setErr({});
    issue.mutate(undefined, { onError: (e) => { if (e instanceof ApiError && Object.keys(e.fieldErrors).length) setErr(e.fieldErrors); toast.error(errorMessage(e)); } });
  };
  return (
    <Modal open={open} onClose={onClose} title="Emitir certificado manualmente" description="No exige cumplir los requisitos del curso. Se notifica al estudiante."
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button variant="primary" loading={issue.isPending} onClick={submit}>Emitir</Button></>}>
      <div className="space-y-4">
        <StudentPicker single label="Estudiante" value={student} onChange={setStudent} />
        {err.user && <p className="text-xs font-semibold text-danger">{err.user}</p>}
        <Select label="Curso" value={courseId} onChange={(e) => setCourseId(e.target.value)} placeholder="Sin curso (título libre)" options={courseOptions(courses.data)} error={err.courseId} />
        <Input label="Título" value={title} onChange={(e) => setTitle(e.target.value)} hint="Opcional si eliges curso" error={err.title} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Horas" type="number" min={0} value={hours} onChange={(e) => setHours(e.target.value)} hint="Por defecto, las del curso" error={err.hours} />
          <Input label="Calificación" type="number" min={0} max={100} step="0.1" value={grade} onChange={(e) => setGrade(e.target.value)} hint="Por defecto, la de la inscripción" error={err.finalGrade} />
        </div>
      </div>
    </Modal>
  );
}

const blank = { name: '', heading: 'Certificado de finalización', body: 'Se otorga el presente certificado a {nombre} por haber completado el curso {curso} con una duración de {horas} horas, el {fecha}, con una calificación de {calificacion}.', primaryColor: '#EE7A2F', signatureName: '', signatureTitle: '', isDefault: false };

function Templates() {
  const q = useQuery({ queryKey: ['certificates', 'templates'], queryFn: () => api.get<{ data: Template[] }>('/certificates/templates') });
  const [editing, setEditing] = useState<Template | 'new' | null>(null);
  const [del, setDel] = useState<Template | null>(null);
  const remove = useAction(() => api.del(`/certificates/templates/${del!.id}`), { success: 'Plantilla eliminada', invalidate: [['certificates', 'templates']], onSuccess: () => setDel(null) });
  return (
    <div>
      <Toolbar><Button variant="primary" className="ml-auto" icon={<Plus className="size-4" />} onClick={() => setEditing('new')}>Nueva plantilla</Button></Toolbar>
      {q.isLoading ? <SkeletonRows /> : q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : !q.data?.data.length ? (
        <EmptyState title="Sin plantillas" description="Crea una plantilla para definir el diseño de los certificados." action={<Button variant="primary" onClick={() => setEditing('new')}>Crear plantilla</Button>} />
      ) : (
        <ul className="divide-y divide-line border-y border-ink">
          {q.data.data.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center gap-4 py-4">
              <span className="size-8 shrink-0 border border-line-strong" style={{ background: t.primaryColor }} role="img" aria-label={`Color ${t.primaryColor}`} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{t.name} {t.isDefault && <Tag tone="ink" className="ml-2">Predeterminada</Tag>}</p>
                <p className="truncate text-sm text-graphite">{t.heading} · {t._count?.certificates ?? 0} emitidos</p>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" icon={<Eye className="size-4" />} onClick={() => safe(() => download(`/certificates/templates/${t.id}/preview`, 'vista-previa.pdf'))}>Vista previa PDF</Button>
                <IconButton size="sm" label={`Editar ${t.name}`} onClick={() => setEditing(t)}><Pencil className="size-4" /></IconButton>
                <IconButton size="sm" label={`Eliminar ${t.name}`} onClick={() => setDel(t)}><Trash2 className="size-4" /></IconButton>
              </div>
            </li>
          ))}
        </ul>
      )}
      <TemplateModal template={editing} onClose={() => setEditing(null)} />
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} onConfirm={() => remove.mutate()} loading={remove.isPending} title="Eliminar plantilla" confirmLabel="Eliminar" description={`Se eliminará «${del?.name}». No es posible si ya tiene certificados emitidos.`} />
    </div>
  );
}

function FileField({ label, fileId, onChange }: { label: string; fileId: number | null; onChange: (id: number | null) => void }) {
  const [busy, setBusy] = useState(false);
  const upload = async (f?: File) => {
    if (!f) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', f);
      const r = await api.upload<{ file: { id: number } }>('/files', fd);
      onChange(r.file.id);
      toast.success(`${label} cargado`);
    } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(false); }
  };
  return (
    <div>
      <p className="mb-1.5 text-[0.8125rem] font-semibold">{label}</p>
      {fileId && <img src={`/api/files/${fileId}`} alt={label} className="mb-2 h-14 w-auto max-w-full border border-line bg-stone object-contain p-1" />}
      <div className="flex items-center gap-2">
        <label className="inline-flex h-9 cursor-pointer items-center rounded-sm border border-ink px-3 text-sm font-semibold hover:bg-ink hover:text-paper focus-within:outline-2">
          {busy ? 'Subiendo…' : fileId ? 'Reemplazar' : 'Subir imagen'}
          <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => upload(e.target.files?.[0])} />
        </label>
        {fileId && <button type="button" className="text-sm underline" onClick={() => onChange(null)}>Quitar</button>}
      </div>
    </div>
  );
}

function TemplateModal({ template, onClose }: { template: Template | 'new' | null; onClose: () => void }) {
  const open = template !== null;
  const [f, setF] = useState(blank);
  const [sig, setSig] = useState<number | null>(null);
  const [logo, setLogo] = useState<number | null>(null);
  const [err, setErr] = useState<Record<string, string>>({});
  useEffect(() => {
    if (template === null) return;
    setErr({});
    if (template === 'new') { setF(blank); setSig(null); setLogo(null); }
    else { setF({ name: template.name, heading: template.heading, body: template.body, primaryColor: template.primaryColor, signatureName: template.signatureName ?? '', signatureTitle: template.signatureTitle ?? '', isDefault: template.isDefault }); setSig(template.signatureFileId); setLogo(template.logoFileId); }
  }, [template]);
  const isNew = template === 'new';
  const save = useAction(
    () => { const body = { ...f, signatureFileId: sig, logoFileId: logo }; return isNew ? api.post('/certificates/templates', body) : api.patch(`/certificates/templates/${(template as Template).id}`, body); },
    { success: 'Plantilla guardada', invalidate: [['certificates', 'templates']], onSuccess: onClose, silentError: true },
  );
  const submit = () => save.mutate(undefined, { onError: (e) => { if (e instanceof ApiError) setErr(e.fieldErrors); toast.error(errorMessage(e)); } });
  const set = (k: keyof typeof blank, v: string | boolean) => setF((s) => ({ ...s, [k]: v }));
  return (
    <Modal open={open} onClose={onClose} size="lg" title={isNew ? 'Nueva plantilla' : 'Editar plantilla'}
      footer={<>
        {!isNew && template && <Button variant="outline" className="mr-auto" icon={<Eye className="size-4" />} onClick={() => safe(() => download(`/certificates/templates/${(template as Template).id}/preview`, 'vista-previa.pdf'))}>Vista previa PDF</Button>}
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button variant="primary" loading={save.isPending} onClick={submit}>Guardar</Button></>}>
      <div className="space-y-4">
        <Input label="Nombre" required value={f.name} onChange={(e) => set('name', e.target.value)} error={err.name} />
        <Input label="Encabezado" value={f.heading} onChange={(e) => set('heading', e.target.value)} error={err.heading} />
        <Textarea label="Cuerpo" rows={5} value={f.body} onChange={(e) => set('body', e.target.value)} error={err.body}
          hint="Marcadores disponibles: {nombre} {curso} {horas} {fecha} {calificacion}" />
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="tpl-color" className="mb-1.5 block text-[0.8125rem] font-semibold">Color principal</label>
            <div className="flex items-center gap-2">
              <input id="tpl-color" type="color" value={f.primaryColor} onChange={(e) => set('primaryColor', e.target.value.toUpperCase())} className="h-10 w-12 cursor-pointer border border-line-strong bg-paper p-0.5" />
              <span className="text-sm tnum">{f.primaryColor}</span>
            </div>
          </div>
          <Input label="Firmante" value={f.signatureName} onChange={(e) => set('signatureName', e.target.value)} error={err.signatureName} />
          <Input label="Cargo del firmante" value={f.signatureTitle} onChange={(e) => set('signatureTitle', e.target.value)} error={err.signatureTitle} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FileField label="Firma" fileId={sig} onChange={setSig} />
          <FileField label="Logo" fileId={logo} onChange={setLogo} />
        </div>
        <Checkbox label="Plantilla predeterminada" hint="Se usa en los cursos sin plantilla propia. Desmarca las demás." checked={f.isDefault} onChange={(e) => set('isDefault', e.target.checked)} />
      </div>
    </Modal>
  );
}

export default function Certificates() {
  const [tab, setTab] = useState<'issued' | 'templates'>('issued');
  return (
    <div className="animate-rise">
      <PageHeader title="Certificados" description="Certificados emitidos, emisión manual y plantillas de diseño." />
      <Tabs className="mb-6" value={tab} onChange={setTab} tabs={[{ key: 'issued', label: 'Emitidos' }, { key: 'templates', label: 'Plantillas' }]} />
      {tab === 'issued' ? <Issued /> : <Templates />}
    </div>
  );
}
