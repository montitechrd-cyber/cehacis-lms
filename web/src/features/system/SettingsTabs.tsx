import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowDown, ArrowUp, Eye, Mail, Pencil, Plus, RotateCw, Trash2, Upload } from 'lucide-react';
import { api, ApiError, errorMessage, type Paged } from '@/lib/api';
import { useAction, useTableParams } from '@/lib/hooks';
import { date, dateTime, fullName } from '@/lib/format';
import { Button, IconButton } from '@/components/ui/Button';
import { Input, Select, Switch, Textarea } from '@/components/ui/Form';
import { Alert, EmptyState, ErrorState, PageLoader, SkeletonRows } from '@/components/ui/Feedback';
import { Drawer, Modal } from '@/components/ui/Overlay';
import { Section } from '@/components/ui/Page';
import { DataTable, Pagination, SearchInput, Tag, statusTone } from '@/components/ui/Data';
import { RowActions, useDeleter } from './shared';

const opts = (o: Record<string, string>) => Object.entries(o).map(([value, label]) => ({ value, label }));

/* ───────────── Marca ───────────── */
interface BrandData {
  name: string; legalName: string; tagline: string; logoUrl: string; primaryColor: string; inkColor: string; contactEmail: string; contactPhone: string;
  whatsapp: string; instagram: string; address: string; currency: string;
}

function ColorField({ label, value, onChange, error }: { label: string; value: string; onChange: (v: string) => void; error?: string }) {
  const valid = /^#[0-9a-fA-F]{6}$/.test(value);
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[0.8125rem] font-semibold">{label}</label>
      <div className="flex items-center gap-2">
        <input type="color" aria-label={`${label}: selector`} value={valid ? value : '#000000'} onChange={(e) => onChange(e.target.value.toUpperCase())} className="h-10 w-12 cursor-pointer rounded-sm border border-line-strong bg-paper p-1" />
        <input aria-label={`${label}: código hexadecimal`} value={value} maxLength={7} onChange={(e) => onChange(e.target.value)} aria-invalid={!valid || undefined} className="h-10 w-32 rounded-sm border border-line-strong px-3 font-mono text-sm uppercase focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink" />
      </div>
      {(error || !valid) && <p className="text-xs font-semibold text-danger">{error ?? 'Usa el formato #RRGGBB'}</p>}
    </div>
  );
}

export function BrandTab() {
  const q = useQuery({ queryKey: ['adm-brand'], queryFn: async () => (await api.get<{ data: BrandData }>('/admin/settings/brand')).data });
  if (q.isLoading) return <PageLoader />;
  if (q.isError || !q.data) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  return <BrandForm initial={q.data} />;
}

function BrandForm({ initial }: { initial: BrandData }) {
  const qc = useQueryClient();
  const [f, setF] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const set = (k: keyof BrandData) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const save = useAction((b: BrandData) => api.put('/admin/settings/brand', b), { success: 'Marca guardada', invalidate: [['brand'], ['adm-brand']] });
  const upload = async (fl: File | undefined) => {
    if (!fl) return;
    const form = new FormData();
    form.append('logo', fl);
    setBusy(true);
    try {
      const r = await api.upload<{ data: BrandData }>('/admin/settings/logo', form);
      setF((p) => ({ ...p, logoUrl: r.data.logoUrl }));
      toast.success('Logo actualizado');
      await Promise.all([qc.invalidateQueries({ queryKey: ['brand'] }), qc.invalidateQueries({ queryKey: ['adm-brand'] })]);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
      if (file.current) file.current.value = '';
    }
  };
  return (
    <form className="max-w-4xl space-y-10" onSubmit={(e) => { e.preventDefault(); save.mutate(f, { onError: (x) => x instanceof ApiError && setErrors(x.fieldErrors) }); }}>
      <Section title="Identidad">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Nombre comercial" required value={f.name} error={errors.name} onChange={set('name')} />
          <Input label="Razón social" value={f.legalName} error={errors.legalName} onChange={set('legalName')} />
          <Input wrapperClassName="sm:col-span-2" label="Lema" value={f.tagline} onChange={set('tagline')} />
          <ColorField label="Color principal" value={f.primaryColor} error={errors.primaryColor} onChange={(v) => setF({ ...f, primaryColor: v })} />
          <ColorField label="Color de tinta" value={f.inkColor} error={errors.inkColor} onChange={(v) => setF({ ...f, inkColor: v })} />
          <Input label="Moneda (3 letras)" maxLength={3} value={f.currency} error={errors.currency} onChange={(e) => setF({ ...f, currency: e.target.value.toUpperCase() })} />
        </div>
      </Section>
      <Section title="Logo" description="PNG, JPG, WEBP o GIF de hasta 5 MB. Se aplica de inmediato.">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex h-24 w-48 items-center justify-center border border-line bg-stone p-3">
            {f.logoUrl ? <img src={f.logoUrl} alt={`Logo de ${f.name}`} className="max-h-full max-w-full object-contain" /> : <span className="text-xs text-muted">Sin logo</span>}
          </div>
          <input ref={file} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only" aria-label="Seleccionar logo" onChange={(e) => upload(e.target.files?.[0])} />
          <Button variant="outline" icon={<Upload className="size-4" />} loading={busy} onClick={() => file.current?.click()}>Subir logo</Button>
        </div>
      </Section>
      <Section title="Contacto">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Correo de contacto" type="email" value={f.contactEmail} error={errors.contactEmail} onChange={set('contactEmail')} />
          <Input label="Teléfono" type="tel" value={f.contactPhone} onChange={set('contactPhone')} />
          <Input label="WhatsApp" value={f.whatsapp} hint="Solo dígitos con código de país, p. ej. 18495350203." onChange={set('whatsapp')} />
          <Input label="Instagram" value={f.instagram} hint="Usuario sin @." onChange={set('instagram')} />
          <Input wrapperClassName="sm:col-span-2" label="Dirección" value={f.address} onChange={set('address')} />
        </div>
      </Section>
      <div className="flex justify-end border-t border-line pt-5"><Button type="submit" variant="primary" loading={save.isPending}>Guardar marca</Button></div>
    </form>
  );
}

/* ───────────── Integraciones ───────────── */
interface Integrations {
  ai: { configured: boolean; provider: string; model: string };
  email: { configured: boolean; from: string };
  payments: { active: string; sandbox: { configured: boolean; note: string }; azul: { configured: boolean; env: string; note: string } };
  video: { mode: string; zoom: { configured: boolean; note: string } };
  storage: { driver: string; path: string };
}

export function IntegrationsTab() {
  const q = useQuery({ queryKey: ['adm-integrations'], queryFn: async () => (await api.get<{ data: Integrations }>('/admin/integrations')).data });
  if (q.isLoading) return <SkeletonRows />;
  if (q.isError || !q.data) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const d = q.data;
  const rows: { name: string; ok: boolean; detail: string; missing?: string }[] = [
    { name: 'Inteligencia artificial', ok: d.ai.configured, detail: `Proveedor ${d.ai.provider} · modelo ${d.ai.model}`, missing: 'ANTHROPIC_API_KEY' },
    { name: 'Correo electrónico (SMTP)', ok: d.email.configured, detail: `Remitente ${d.email.from}`, missing: 'SMTP_HOST, SMTP_PORT, SMTP_USER y SMTP_PASS' },
    { name: 'Pagos: sandbox', ok: d.payments.sandbox.configured, detail: `Pasarela activa: ${d.payments.active}. ${d.payments.sandbox.note}`, missing: 'PAYMENT_PROVIDER=sandbox' },
    { name: 'Pagos: AZUL', ok: d.payments.azul.configured, detail: `Entorno ${d.payments.azul.env}. ${d.payments.azul.note}`, missing: 'Credenciales de AZUL y PAYMENT_PROVIDER=azul' },
    { name: 'Videoclases (Zoom)', ok: d.video.zoom.configured, detail: `Modo ${d.video.mode === 'manual' ? 'manual (se pega el enlace de la reunión)' : d.video.mode}. ${d.video.zoom.note}`, missing: 'Credenciales de Zoom (ZOOM_*)' },
    { name: 'Almacenamiento de archivos', ok: true, detail: `Controlador ${d.storage.driver} · ruta ${d.storage.path}` },
  ];
  return (
    <div>
      <p className="mb-4 max-w-2xl text-sm text-graphite">Estado de los servicios externos. Por seguridad nunca se muestran claves: se configuran como variables de entorno en el servidor.</p>
      <ul className="divide-y divide-line border-y border-ink">
        {rows.map((r) => (
          <li key={r.name} className="grid gap-2 py-4 sm:grid-cols-[14rem_1fr] sm:gap-6">
            <div className="flex items-center gap-2"><span className="font-bold">{r.name}</span></div>
            <div>
              <Tag tone={r.ok ? 'success' : 'warning'}>{r.ok ? 'Configurado' : 'Pendiente'}</Tag>
              <p className="mt-1.5 text-sm text-graphite">{r.detail}</p>
              {!r.ok && r.missing && <p className="mt-1 text-sm">Falta definir: <code className="font-semibold">{r.missing}</code></p>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ───────────── FAQ ───────────── */
interface Faq { id: number; question: string; answer: string; order: number; isPublished: boolean }

export function FaqTab() {
  const q = useQuery({ queryKey: ['adm-faqs'], queryFn: () => api.get<{ data: Faq[] }>('/admin/faqs') });
  const [edit, setEdit] = useState<Faq | 'new' | null>(null);
  const del = useDeleter({ path: (id) => `/admin/faqs/${id}`, invalidate: [['adm-faqs']], title: 'Eliminar pregunta', description: 'Dejará de mostrarse en la página pública.', success: 'Pregunta eliminada' });
  const order = useAction((ids: number[]) => api.put('/admin/faqs/order', { ids }), { success: 'Orden actualizado', invalidate: [['adm-faqs']] });
  const move = (i: number, dir: -1 | 1) => {
    const ids = (q.data?.data ?? []).map((x) => x.id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j]!, ids[i]!];
    order.mutate(ids);
  };
  return (
    <div>
      <div className="mb-4 flex justify-end"><Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setEdit('new')}>Nueva pregunta</Button></div>
      {q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : q.isLoading ? <SkeletonRows /> : !q.data?.data.length ? (
        <EmptyState title="Sin preguntas frecuentes" description="Responde las dudas habituales de los visitantes." action={<Button variant="primary" onClick={() => setEdit('new')}>Crear pregunta</Button>} />
      ) : (
        <ol className="divide-y divide-line border-y border-ink">
          {q.data.data.map((f, i, arr) => (
            <li key={f.id} className="flex items-start gap-3 py-4">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{f.question}</p>
                <p className="mt-1 line-clamp-2 text-sm text-graphite">{f.answer}</p>
                {!f.isPublished && <Tag tone="neutral" className="mt-2">Oculta</Tag>}
              </div>
              <RowActions>
                <IconButton label="Subir" size="sm" disabled={i === 0 || order.isPending} onClick={() => move(i, -1)}><ArrowUp className="size-4" /></IconButton>
                <IconButton label="Bajar" size="sm" disabled={i === arr.length - 1 || order.isPending} onClick={() => move(i, 1)}><ArrowDown className="size-4" /></IconButton>
                <IconButton label="Editar" size="sm" onClick={() => setEdit(f)}><Pencil className="size-4" /></IconButton>
                <IconButton label="Eliminar" size="sm" onClick={() => del.ask(f.id)}><Trash2 className="size-4" /></IconButton>
              </RowActions>
            </li>
          ))}
        </ol>
      )}
      {edit && <FaqDrawer item={edit === 'new' ? null : edit} onClose={() => setEdit(null)} />}
      {del.dialog}
    </div>
  );
}

function FaqDrawer({ item, onClose }: { item: Faq | null; onClose: () => void }) {
  const [f, setF] = useState({ question: item?.question ?? '', answer: item?.answer ?? '', isPublished: item?.isPublished ?? true });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const save = useAction((b: typeof f) => (item ? api.patch(`/admin/faqs/${item.id}`, b) : api.post('/admin/faqs', b)), { success: 'Pregunta guardada', invalidate: [['adm-faqs']], onSuccess: onClose });
  return (
    <Drawer open onClose={onClose} title={item ? 'Editar pregunta' : 'Nueva pregunta'}
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button type="submit" form="faq-form" variant="primary" loading={save.isPending}>Guardar</Button></>}>
      <form id="faq-form" className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(f, { onError: (x) => x instanceof ApiError && setErrors(x.fieldErrors) }); }}>
        <Input label="Pregunta" required value={f.question} error={errors.question} onChange={(e) => setF({ ...f, question: e.target.value })} />
        <Textarea label="Respuesta" required rows={7} value={f.answer} error={errors.answer} onChange={(e) => setF({ ...f, answer: e.target.value })} />
        <Switch label="Publicada" hint="Las ocultas no aparecen en el sitio público." checked={f.isPublished} onChange={(v) => setF({ ...f, isPublished: v })} />
      </form>
    </Drawer>
  );
}

/* ───────────── Mensajes de contacto ───────────── */
interface Msg { id: number; name: string; email: string; phone: string | null; subject: string; message: string; status: string; createdAt: string }
const MSG_STATUS: Record<string, string> = { NEW: 'Nuevo', READ: 'Leído', ANSWERED: 'Respondido' };

export function ContactTab() {
  const t = useTableParams();
  const q = useQuery({ queryKey: ['adm-contact', t.get('q'), t.get('status'), t.page], queryFn: () => api.get<Paged<Msg>>('/admin/contact-messages', { q: t.get('q'), status: t.get('status'), page: t.page }) });
  const [open, setOpen] = useState<Msg | null>(null);
  const setStatus = useAction((v: { id: number; status: string }) => api.patch(`/admin/contact-messages/${v.id}`, { status: v.status }), { success: 'Estado actualizado', invalidate: [['adm-contact']] });
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <SearchInput className="w-full sm:w-72" placeholder="Buscar mensaje" value={t.get('q')} onChange={(v) => t.set({ q: v })} />
        <div className="w-full sm:w-44"><Select label="Estado" placeholder="Todos" value={t.get('status')} onChange={(e) => t.set({ status: e.target.value })} options={opts(MSG_STATUS)} /></div>
      </div>
      {q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : (
        <DataTable loading={q.isLoading} rows={q.data?.data} rowKey={(r) => r.id} onRowClick={(r) => { setOpen(r); if (r.status === 'NEW') setStatus.mutate({ id: r.id, status: 'READ' }); }}
          empty={<EmptyState title="Sin mensajes" description="Los mensajes del formulario de contacto del sitio llegan aquí." />}
          columns={[
            { key: 'n', header: 'De', cell: (r) => (<div><p className="font-semibold">{r.name}</p><p className="text-xs text-muted">{r.email}</p></div>) },
            { key: 's', header: 'Asunto', cell: (r) => <span className="line-clamp-1 max-w-xs">{r.subject}</span> },
            { key: 'd', header: 'Recibido', cell: (r) => dateTime(r.createdAt) },
            { key: 'st', header: 'Estado', cell: (r) => <Tag tone={r.status === 'NEW' ? 'orange' : r.status === 'ANSWERED' ? 'success' : 'neutral'}>{MSG_STATUS[r.status]}</Tag> },
          ]} />
      )}
      {q.data && <Pagination page={q.data.meta.page} pages={q.data.meta.pages} total={q.data.meta.total} onPage={(p) => t.set({ page: p }, false)} />}
      {open && (
        <Modal open onClose={() => setOpen(null)} title={open.subject} description={`${open.name} · ${open.email}${open.phone ? ` · ${open.phone}` : ''} · ${dateTime(open.createdAt)}`} size="lg"
          footer={<>
            <Select aria-label="Estado del mensaje" wrapperClassName="w-40" value={open.status} options={opts(MSG_STATUS)} onChange={(e) => { setStatus.mutate({ id: open.id, status: e.target.value }); setOpen({ ...open, status: e.target.value }); }} />
            <a className="inline-flex h-10 items-center gap-2 rounded-sm border border-orange bg-orange px-4 text-sm font-semibold text-ink no-underline hover:bg-[#f28c48]" href={`mailto:${open.email}?subject=${encodeURIComponent(`Re: ${open.subject}`)}`} onClick={() => open.status !== 'ANSWERED' && setStatus.mutate({ id: open.id, status: 'ANSWERED' })}>
              <Mail className="size-4" aria-hidden />Responder por correo
            </a></>}>
          <p className="whitespace-pre-wrap break-words text-sm">{open.message}</p>
        </Modal>
      )}
    </div>
  );
}

/* ───────────── Bandeja de correo ───────────── */
interface Outbox { id: number; to: string; subject: string; status: string; error: string | null; sentAt: string | null; createdAt: string; html?: string }
const OUT_STATUS: Record<string, string> = { QUEUED: 'En cola', SENT: 'Enviado', FAILED: 'Fallido', LOGGED: 'Solo registrado' };

export function OutboxTab() {
  const t = useTableParams();
  const q = useQuery({ queryKey: ['adm-outbox', t.get('q'), t.get('status'), t.page], queryFn: () => api.get<Paged<Outbox>>('/admin/outbox', { q: t.get('q'), status: t.get('status'), page: t.page }) });
  const [view, setView] = useState<Outbox | null>(null);
  const retry = useAction((id: number) => api.post(`/admin/outbox/${id}/retry`), { success: 'Reintento realizado', invalidate: [['adm-outbox']] });
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <SearchInput className="w-full sm:w-72" placeholder="Destinatario o asunto" value={t.get('q')} onChange={(v) => t.set({ q: v })} />
        <div className="w-full sm:w-48"><Select label="Estado" placeholder="Todos" value={t.get('status')} onChange={(e) => t.set({ status: e.target.value })} options={opts(OUT_STATUS)} /></div>
      </div>
      <div className="mb-4"><Alert tone="info" title="Estado LOGGED">SMTP no configurado: el correo quedó registrado pero no se envió. Al configurar el correo en el servidor puedes reintentar el envío desde aquí.</Alert></div>
      {q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : (
        <DataTable loading={q.isLoading} rows={q.data?.data} rowKey={(r) => r.id}
          empty={<EmptyState title="La bandeja está vacía" description="Aquí se registran todos los correos que genera la plataforma." />}
          columns={[
            { key: 't', header: 'Destinatario', cell: (r) => r.to },
            { key: 's', header: 'Asunto', cell: (r) => <span className="line-clamp-1 max-w-xs">{r.subject}</span> },
            { key: 'd', header: 'Creado', cell: (r) => dateTime(r.createdAt) },
            { key: 'st', header: 'Estado', cell: (r) => (<div><Tag tone={statusTone(r.status)}>{OUT_STATUS[r.status] ?? r.status}</Tag>{r.error && <p className="mt-1 max-w-48 text-xs text-danger">{r.error}</p>}</div>) },
            { key: 'x', header: <span className="sr-only">Acciones</span>, align: 'right', cell: (r) => (
              <RowActions>
                <IconButton label="Ver correo" size="sm" onClick={() => setView(r)}><Eye className="size-4" /></IconButton>
                {r.status !== 'SENT' && <IconButton label="Reintentar envío" size="sm" disabled={retry.isPending} onClick={() => retry.mutate(r.id)}><RotateCw className="size-4" /></IconButton>}
              </RowActions>) },
          ]} />
      )}
      {q.data && <Pagination page={q.data.meta.page} pages={q.data.meta.pages} total={q.data.meta.total} onPage={(p) => t.set({ page: p }, false)} />}
      {view && <OutboxView item={view} onClose={() => setView(null)} />}
    </div>
  );
}

function OutboxView({ item, onClose }: { item: Outbox; onClose: () => void }) {
  const q = useQuery({ queryKey: ['adm-outbox-one', item.id], retry: false, queryFn: async () => (await api.get<{ data: Outbox }>(`/admin/outbox/${item.id}`)).data });
  const html = q.data?.html ?? item.html;
  return (
    <Modal open onClose={onClose} size="xl" title={item.subject} description={`Para ${item.to} · ${OUT_STATUS[item.status]} · ${dateTime(item.createdAt)}`}>
      {item.status === 'LOGGED' && <div className="mb-4"><Alert tone="warning">SMTP no configurado: el correo quedó registrado pero no se envió.</Alert></div>}
      {item.error && <div className="mb-4"><Alert tone="danger" title="Error de envío">{item.error}</Alert></div>}
      {q.isLoading ? <PageLoader /> : html ? (
        <iframe title="Contenido del correo" sandbox="" srcDoc={html} className="h-[28rem] w-full border border-line bg-paper" />
      ) : <p className="text-sm text-graphite">El servidor no devuelve el contenido HTML de este correo; solo sus datos de envío.</p>}
    </Modal>
  );
}

/* ───────────── Auditoría ───────────── */
interface AuditRow { id: number; action: string; entity: string; entityId: number | null; meta: unknown; ip: string | null; createdAt: string; user: { id: number; firstName: string; lastName: string; email: string } | null }

export function AuditTab() {
  const t = useTableParams();
  const params = { userId: t.get('userId'), entity: t.get('entity'), action: t.get('action'), from: t.get('from'), to: t.get('to'), page: t.page, pageSize: 50 };
  const q = useQuery({ queryKey: ['adm-audit', params], queryFn: () => api.get<Paged<AuditRow>>('/admin/audit', params) });
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div>
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Input label="ID de usuario" type="number" min={1} value={t.get('userId')} onChange={(e) => t.set({ userId: e.target.value })} />
        <Input label="Entidad" placeholder="p. ej. course" value={t.get('entity')} onChange={(e) => t.set({ entity: e.target.value })} />
        <Input label="Acción contiene" placeholder="p. ej. order" value={t.get('action')} onChange={(e) => t.set({ action: e.target.value })} />
        <Input label="Desde" type="date" value={t.get('from')} onChange={(e) => t.set({ from: e.target.value })} />
        <Input label="Hasta" type="date" value={t.get('to')} onChange={(e) => t.set({ to: e.target.value })} />
      </div>
      {q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : (
        <DataTable loading={q.isLoading} rows={q.data?.data} rowKey={(r) => r.id} onRowClick={(r) => setOpen(open === r.id ? null : r.id)}
          empty={<EmptyState title="Sin registros" description="Ninguna acción coincide con los filtros." />}
          columns={[
            { key: 'd', header: 'Fecha', cell: (r) => dateTime(r.createdAt) },
            { key: 'u', header: 'Usuario', cell: (r) => (r.user ? fullName(r.user) : 'Sistema') },
            { key: 'a', header: 'Acción', cell: (r) => <code className="text-xs">{r.action}</code> },
            { key: 'e', header: 'Entidad', cell: (r) => `${r.entity}${r.entityId != null ? ` #${r.entityId}` : ''}` },
            { key: 'm', header: 'Detalle', cell: (r) => (
              <div className="max-w-xs">
                <button type="button" className="text-xs font-semibold underline underline-offset-4" aria-expanded={open === r.id} onClick={(e) => { e.stopPropagation(); setOpen(open === r.id ? null : r.id); }}>{open === r.id ? 'Ocultar' : 'Ver datos'}</button>
                {open === r.id && <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words bg-stone p-2 text-[0.6875rem]">{JSON.stringify({ ...(r.meta as object | null), ip: r.ip }, null, 2)}</pre>}
              </div>) },
          ]} />
      )}
      {q.data && <Pagination page={q.data.meta.page} pages={q.data.meta.pages} total={q.data.meta.total} onPage={(p) => t.set({ page: p }, false)} />}
    </div>
  );
}

/* ───────────── Respaldo ───────────── */
interface BackupInfo { lastBackup: { lastBackupAt: string | null; note: string | null; markedBy: { id: number; name: string } | null }; command: string; uploadsPath: string; instructions: string[] }

export function BackupTab() {
  const q = useQuery({ queryKey: ['adm-backup'], queryFn: async () => (await api.get<{ data: BackupInfo }>('/admin/backup/info')).data });
  const [note, setNote] = useState('');
  const mark = useAction(() => api.post('/admin/backup/mark', { note: note.trim() || undefined }), { success: 'Respaldo registrado', invalidate: [['adm-backup']], onSuccess: () => setNote('') });
  if (q.isLoading) return <PageLoader />;
  if (q.isError || !q.data) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const d = q.data;
  return (
    <div className="max-w-3xl space-y-8">
      <Alert tone={d.lastBackup.lastBackupAt ? 'info' : 'warning'} title={d.lastBackup.lastBackupAt ? `Último respaldo: ${dateTime(d.lastBackup.lastBackupAt)}` : 'Aún no se ha registrado ningún respaldo'}>
        {d.lastBackup.markedBy && `Registrado por ${d.lastBackup.markedBy.name}. `}{d.lastBackup.note}
      </Alert>
      <Section title="Cómo hacer el respaldo" description="La plataforma no ejecuta el respaldo por sí misma: se hace en el servidor y aquí se deja constancia.">
        <ol className="list-decimal space-y-1.5 pl-5 text-sm">{d.instructions.map((i, k) => <li key={k}>{i}</li>)}</ol>
        <p className="mb-1 mt-5 text-sm font-semibold">Comando de la base de datos</p>
        <pre className="overflow-x-auto bg-ink p-3 text-xs text-paper">{d.command}</pre>
        <p className="mt-3 text-sm">Archivos subidos: <code className="font-semibold">{d.uploadsPath}</code></p>
      </Section>
      <Section title="Registrar un respaldo realizado">
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); mark.mutate(); }}>
          <Textarea label="Nota (opcional)" rows={2} value={note} onChange={(e) => setNote(e.target.value)} hint="Dónde quedó guardado, quién lo hizo, etc." />
          <Button type="submit" variant="primary" loading={mark.isPending}>Marcar respaldo como realizado</Button>
        </form>
      </Section>
    </div>
  );
}

void date;
