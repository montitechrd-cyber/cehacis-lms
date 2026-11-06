import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Ban, Download, FileText, Pencil, Plus, Trash2, Undo2 } from 'lucide-react';
import { api, ApiError, download, errorMessage, type Paged } from '@/lib/api';
import { useAction, useTableParams } from '@/lib/hooks';
import { useAuth } from '@/lib/auth';
import { date, dateTime, fullName, money, num, ORDER_STATUS } from '@/lib/format';
import { Button, IconButton } from '@/components/ui/Button';
import { Checkbox, Input, Select, Switch, Textarea } from '@/components/ui/Form';
import { Alert, EmptyState, ErrorState, PageLoader } from '@/components/ui/Feedback';
import { ConfirmDialog, Drawer, Modal } from '@/components/ui/Overlay';
import { PageHeader } from '@/components/ui/Page';
import { DataTable, Facts, Pagination, SearchInput, Tabs, Tag, statusTone } from '@/components/ui/Data';
import { RowActions, TestTag, dayInput, numOrNull, strOrNull, useCourseOptions, useDeleter, useTab } from '@/features/system/shared';

interface User { id: number; firstName: string; lastName: string; email: string }
interface OrderRow {
  id: number; number: string; status: string; subtotal: number; discount: number; tax: number; total: number; currency: string; provider: string; isTest: boolean;
  createdAt: string; paidAt: string | null; user: User;
  items: { id: number; itemType: string; description: string; unitPrice: number; quantity: number; total: number }[];
  payments: { id: number; provider: string; status: string; isTest: boolean; method: string | null; amount: number; providerRef?: string | null }[];
  invoice: { id: number; number: string; isTest: boolean } | null;
  coupon?: { code: string } | null; notes?: string | null;
}
interface Gateway { active: string; sandbox: { configured: boolean; note: string }; azul: { configured: boolean; env: string; note: string } }
interface Coupon {
  id: number; code: string; description: string | null; type: string; value: number; maxUses: number | null; usedCount: number; perUserLimit: number; minAmount: number | null;
  courseId: number | null; course: { id: number; title: string } | null; validFrom: string | null; validUntil: string | null; isActive: boolean;
}
interface Bundle { id: number; title: string; description: string | null; price: number; isActive: boolean; courses: { id: number; title: string; price: number }[] }
interface Plan { id: number; name: string; description: string | null; price: number; interval: string; includesAll: boolean; isActive: boolean; subscriptionsCount: number }
interface Sub { id: number; status: string; currentPeriodEnd: string; cancelledAt: string | null; user: User; plan: { id: number; name: string; price: number; interval: string } }
interface Invoice { id: number; number: string; billingName: string; total: number; currency: string; isTest: boolean; issuedAt: string; user: User; order: { id: number; number: string } }
interface Trx { id: number; date: string; orderNumber: string; customer: string; customerEmail: string; method: string | null; provider: string; amount: number; currency: string; status: string; isTest: boolean }

const PAY_STATUS: Record<string, string> = { PENDING: 'Pendiente', APPROVED: 'Aprobado', DECLINED: 'Rechazado', REFUNDED: 'Reembolsado' };
const SUB_STATUS: Record<string, string> = { ACTIVE: 'Activa', CANCELLED: 'Cancelada', EXPIRED: 'Vencida', PENDING: 'Pendiente' };
const INTERVAL: Record<string, string> = { MONTH: 'Mensual', YEAR: 'Anual' };
const opts = (o: Record<string, string>) => Object.entries(o).map(([value, label]) => ({ value, label }));
const OrderTag = ({ s }: { s: string }) => <Tag tone={statusTone(s)}>{ORDER_STATUS[s] ?? s}</Tag>;
const Actions = ({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) => (
  <RowActions><IconButton label="Editar" size="sm" onClick={onEdit}><Pencil className="size-4" /></IconButton><IconButton label="Eliminar" size="sm" onClick={onDelete}><Trash2 className="size-4" /></IconButton></RowActions>
);

export default function Commerce() {
  const tabs = [
    { key: 'orders' as const, label: 'Pedidos' }, { key: 'pending' as const, label: 'Pagos pendientes' }, { key: 'transactions' as const, label: 'Transacciones' },
    { key: 'invoices' as const, label: 'Facturas' }, { key: 'coupons' as const, label: 'Cupones' }, { key: 'bundles' as const, label: 'Paquetes' },
    { key: 'plans' as const, label: 'Planes' }, { key: 'subscriptions' as const, label: 'Suscripciones' },
  ];
  const [tab, setTab] = useTab(tabs.map((t) => t.key));
  const [orderId, setOrderId] = useState<number | null>(null);
  return (
    <div>
      <PageHeader title="Comercial y pagos" description="Pedidos, cobros, facturas, cupones y planes de la academia." />
      <GatewayStatus />
      <Tabs tabs={tabs} value={tab} onChange={setTab} className="mb-6" />
      {tab === 'orders' && <Orders onOpen={setOrderId} />}
      {tab === 'pending' && <Pending onOpen={setOrderId} />}
      {tab === 'transactions' && <Transactions />}
      {tab === 'invoices' && <Invoices />}
      {tab === 'coupons' && <Coupons />}
      {tab === 'bundles' && <Bundles />}
      {tab === 'plans' && <Plans />}
      {tab === 'subscriptions' && <Subscriptions />}
      {orderId != null && <OrderDrawer id={orderId} onClose={() => setOrderId(null)} />}
    </div>
  );
}

function GatewayStatus() {
  const q = useQuery({ queryKey: ['cm-status'], queryFn: () => api.get<Gateway>('/commerce/status') });
  if (!q.data) return null;
  const g = q.data;
  return (
    <div className="mb-8 space-y-3">
      <Alert tone={g.active === 'SANDBOX' ? 'warning' : 'success'} title={g.active === 'SANDBOX' ? 'Modo de pruebas (SANDBOX): sin cobros reales' : `Pasarela activa: ${g.active}`}>
        {g.active === 'SANDBOX' ? 'Los pagos con tarjeta de prueba no mueven dinero. Todo pedido, pago y factura generado queda marcado como PRUEBA y no tiene validez fiscal.' : g.azul.note}
      </Alert>
      {!g.azul.configured && (
        <Alert tone="info" title="AZUL pendiente de credenciales">
          <ul className="list-disc pl-4">
            <li>Definir las credenciales del comercio AZUL en el servidor y cambiar <code>PAYMENT_PROVIDER</code> a <code>azul</code>.</li>
            <li>Implementar el retorno de AZUL (validar AuthHash, idempotencia por número de orden y verificación del monto).</li>
            <li>Reembolsos reales por API de AZUL: hoy solo se registran en el sistema.</li>
            <li>Configurar la secuencia fiscal (NCF): las facturas salen con NCF pendiente.</li>
          </ul>
        </Alert>
      )}
    </div>
  );
}

function OrdersTable({ endpoint, keyName, onOpen, filters }: { endpoint: string; keyName: string; onOpen: (id: number) => void; filters: boolean }) {
  const t = useTableParams();
  const params = { q: t.get('q'), status: t.get('status'), from: t.get('from'), to: t.get('to'), page: t.page, pageSize: 20 };
  const q = useQuery({ queryKey: [keyName, params], queryFn: () => api.get<Paged<OrderRow>>(endpoint, params) });
  return (
    <div>
      {filters && (
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <SearchInput className="w-full sm:w-72" placeholder="Número, correo o nombre" value={t.get('q')} onChange={(v) => t.set({ q: v })} />
          <div className="w-full sm:w-44"><Select label="Estado" placeholder="Todos" value={t.get('status')} onChange={(e) => t.set({ status: e.target.value })} options={opts(ORDER_STATUS)} /></div>
          <Input label="Desde" type="date" value={t.get('from')} onChange={(e) => t.set({ from: e.target.value })} />
          <Input label="Hasta" type="date" value={t.get('to')} onChange={(e) => t.set({ to: e.target.value })} />
        </div>
      )}
      {q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : (
        <DataTable loading={q.isLoading} rows={q.data?.data} rowKey={(r) => r.id} onRowClick={(r) => onOpen(r.id)}
          empty={<EmptyState title="No hay pedidos" description="Los pedidos aparecen aquí cuando un estudiante inicia una compra." />}
          columns={[
            { key: 'n', header: 'Pedido', cell: (r) => (<span className="flex items-center gap-2 font-semibold">{r.number}{r.isTest && <TestTag />}</span>) },
            { key: 'c', header: 'Cliente', cell: (r) => (<div><p>{fullName(r.user)}</p><p className="text-xs text-muted">{r.user.email}</p></div>) },
            { key: 'i', header: 'Ítems', cell: (r) => <span className="line-clamp-1 max-w-56">{r.items.map((i) => i.description).join(', ')}</span> },
            { key: 'd', header: 'Fecha', cell: (r) => dateTime(r.createdAt) },
            { key: 's', header: 'Estado', cell: (r) => <OrderTag s={r.status} /> },
            { key: 't', header: 'Total', align: 'right', cell: (r) => money(r.total, r.currency) },
          ]} />
      )}
      {q.data && <Pagination page={q.data.meta.page} pages={q.data.meta.pages} total={q.data.meta.total} onPage={(p) => t.set({ page: p }, false)} />}
    </div>
  );
}
const Orders = ({ onOpen }: { onOpen: (id: number) => void }) => <OrdersTable endpoint="/commerce/orders" keyName="cm-orders" onOpen={onOpen} filters />;
const Pending = ({ onOpen }: { onOpen: (id: number) => void }) => (
  <div><p className="mb-4 max-w-2xl text-sm text-graphite">Pedidos a la espera de pago, los más antiguos primero. Ábrelos para registrar una transferencia o pago en efectivo.</p>
    <OrdersTable endpoint="/commerce/payments/pending" keyName="cm-pending" onOpen={onOpen} filters={false} /></div>
);

function OrderDrawer({ id, onClose }: { id: number; onClose: () => void }) {
  const q = useQuery({ queryKey: ['cm-order', id], queryFn: () => api.get<{ data: OrderRow }>(`/commerce/orders/${id}`) });
  const [mode, setMode] = useState<'paid' | 'cancel' | 'refund' | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const o = q.data?.data;
  const inv = [['cm-order', id], ['cm-orders'], ['cm-pending'], ['cm-trx'], ['cm-invoices']];
  return (
    <Drawer open onClose={onClose} width="max-w-2xl" title={o ? <span className="flex items-center gap-2">{o.number}{o.isTest && <TestTag />}</span> : 'Pedido'}>
      {q.isLoading ? <PageLoader /> : q.isError || !o ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3"><OrderTag s={o.status} /><span className="text-sm text-graphite">{fullName(o.user)} · {o.user.email}</span></div>
          <Facts items={[
            { label: 'Creado', value: dateTime(o.createdAt) }, { label: 'Pagado', value: dateTime(o.paidAt) }, { label: 'Pasarela', value: o.provider },
            { label: 'Subtotal', value: money(o.subtotal, o.currency) }, { label: o.coupon ? `Descuento (${o.coupon.code})` : 'Descuento', value: money(o.discount, o.currency) },
            { label: 'Impuestos', value: money(o.tax, o.currency) }, { label: 'Total', value: money(o.total, o.currency) },
          ]} />
          <section><h3 className="mb-2 font-bold">Ítems</h3>
            <ul className="divide-y divide-line border-y border-line text-sm">{o.items.map((i) => <li key={i.id} className="flex justify-between gap-4 py-2"><span>{i.description} <span className="text-muted">× {i.quantity}</span></span><span className="tnum">{money(i.total, o.currency)}</span></li>)}</ul></section>
          <section><h3 className="mb-2 font-bold">Pagos</h3>
            {o.payments.length === 0 ? <p className="text-sm text-muted">Sin pagos registrados.</p> : (
              <ul className="divide-y divide-line border-y border-line text-sm">{o.payments.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span>{p.provider}{p.method ? ` · ${p.method}` : ''}{p.providerRef ? ` · ${p.providerRef}` : ''}</span>
                  <span className="flex items-center gap-2">{p.isTest && <TestTag />}<Tag tone={statusTone(p.status)}>{PAY_STATUS[p.status] ?? p.status}</Tag><span className="tnum">{money(p.amount, o.currency)}</span></span>
                </li>))}</ul>)}</section>
          {o.notes && <p className="text-sm text-graphite">Notas: {o.notes}</p>}
          <div className="flex flex-wrap gap-2 border-t border-line pt-4">
            {o.invoice && <Button variant="outline" icon={<FileText className="size-4" />} loading={pdfBusy} onClick={async () => { setPdfBusy(true); try { await download(`/commerce/invoices/${o.invoice!.id}/pdf`, `${o.invoice!.number}.pdf`); } catch (e) { toast.error(errorMessage(e)); } finally { setPdfBusy(false); } }}>Factura {o.invoice.number}</Button>}
            {(o.status === 'PENDING' || o.status === 'FAILED') && <Button variant="primary" onClick={() => setMode('paid')}>Marcar como pagado</Button>}
            {o.status === 'PENDING' && <Button variant="outline" icon={<Ban className="size-4" />} onClick={() => setMode('cancel')}>Cancelar pedido</Button>}
            {o.status === 'PAID' && <Button variant="danger" icon={<Undo2 className="size-4" />} onClick={() => setMode('refund')}>Reembolsar</Button>}
          </div>
          {mode === 'paid' && <MarkPaid order={o} invalidate={inv} onClose={() => setMode(null)} />}
          {mode === 'cancel' && <OrderConfirm kind="cancel" order={o} invalidate={inv} onClose={() => setMode(null)} />}
          {mode === 'refund' && <OrderConfirm kind="refund" order={o} invalidate={inv} onClose={() => setMode(null)} />}
        </div>
      )}
    </Drawer>
  );
}

function MarkPaid({ order, invalidate, onClose }: { order: OrderRow; invalidate: (string | number)[][]; onClose: () => void }) {
  const [f, setF] = useState({ method: 'TRANSFERENCIA', reference: '', notes: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const save = useAction(() => api.post(`/commerce/orders/${order.id}/mark-paid`, { method: f.method, reference: f.reference, notes: strOrNull(f.notes) ?? undefined }), { success: 'Pedido marcado como pagado', invalidate, onSuccess: onClose });
  return (
    <Modal open onClose={onClose} size="sm" title="Marcar como pagado" description={`${order.number} · ${money(order.total, order.currency)}. Se registrará un pago real (no de prueba), se emitirá la factura y se activarán las inscripciones.`}
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button type="submit" form="paid-form" variant="primary" loading={save.isPending}>Confirmar pago</Button></>}>
      <form id="paid-form" className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(undefined, { onError: (x) => x instanceof ApiError && setErrors(x.fieldErrors) }); }}>
        <Select label="Método" options={[{ value: 'TRANSFERENCIA', label: 'Transferencia' }, { value: 'EFECTIVO', label: 'Efectivo' }, { value: 'OTRO', label: 'Otro' }]} value={f.method} onChange={(e) => setF({ ...f, method: e.target.value })} />
        <Input label="Referencia" required value={f.reference} error={errors.reference} hint="Número de transferencia, recibo, etc." onChange={(e) => setF({ ...f, reference: e.target.value })} />
        <Textarea label="Notas" rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
      </form>
    </Modal>
  );
}

function OrderConfirm({ kind, order, invalidate, onClose }: { kind: 'cancel' | 'refund'; order: OrderRow; invalidate: (string | number)[][]; onClose: () => void }) {
  const [reason, setReason] = useState('');
  const act = useAction(() => api.post(`/commerce/orders/${order.id}/${kind}`, kind === 'refund' ? { reason: reason || undefined } : {}), {
    success: kind === 'refund' ? 'Pedido reembolsado' : 'Pedido cancelado', invalidate, onSuccess: onClose,
  });
  return (
    <ConfirmDialog open onClose={onClose} loading={act.isPending} onConfirm={() => act.mutate()} confirmLabel={kind === 'refund' ? 'Reembolsar' : 'Cancelar pedido'}
      title={kind === 'refund' ? `Reembolsar ${order.number}` : `Cancelar ${order.number}`}
      description={kind === 'refund' ? (
        <div className="space-y-3"><p>El pedido pasará a Reembolsado, se cancelarán las inscripciones activas que originó y las suscripciones se revertirán. {order.provider === 'AZUL' && 'El dinero de AZUL aún no se devuelve por API.'}</p>
          <Textarea label="Motivo (opcional)" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} /></div>
      ) : 'El pedido pendiente se cancelará y el cliente será notificado.'} />
  );
}

function Transactions() {
  const t = useTableParams();
  const from = t.get('from'), to = t.get('to');
  const q = useQuery({ queryKey: ['cm-trx', from, to], queryFn: () => api.get<{ data: Trx[] }>('/commerce/transactions', { from, to }) });
  const [busy, setBusy] = useState(false);
  const page = t.page, size = 25;
  const rows = q.data?.data.slice((page - 1) * size, page * size);
  const exp = async () => {
    setBusy(true);
    try { await download(`/reports/export/payments${qsOf({ format: 'xlsx', from, to })}`, 'reporte-pagos.xlsx'); } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(false); }
  };
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Input label="Desde" type="date" value={from} onChange={(e) => t.set({ from: e.target.value })} />
        <Input label="Hasta" type="date" value={to} onChange={(e) => t.set({ to: e.target.value })} />
        <Button variant="outline" icon={<Download className="size-4" />} loading={busy} onClick={exp}>Exportar a Excel</Button>
      </div>
      {q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : (
        <DataTable loading={q.isLoading} rows={rows} rowKey={(r) => r.id}
          empty={<EmptyState title="Sin transacciones" description="No hay pagos en el periodo elegido." />}
          columns={[
            { key: 'd', header: 'Fecha', cell: (r) => dateTime(r.date) },
            { key: 'o', header: 'Pedido', cell: (r) => (<span className="flex items-center gap-2">{r.orderNumber}{r.isTest && <TestTag />}</span>) },
            { key: 'c', header: 'Cliente', cell: (r) => (<div><p>{r.customer}</p><p className="text-xs text-muted">{r.customerEmail}</p></div>) },
            { key: 'm', header: 'Método', cell: (r) => `${r.provider}${r.method ? ` · ${r.method}` : ''}` },
            { key: 's', header: 'Estado', cell: (r) => <Tag tone={statusTone(r.status)}>{PAY_STATUS[r.status] ?? r.status}</Tag> },
            { key: 'a', header: 'Monto', align: 'right', cell: (r) => money(r.amount, r.currency) },
          ]} />
      )}
      {q.data && <Pagination page={page} pages={Math.max(1, Math.ceil(q.data.data.length / size))} total={q.data.data.length} onPage={(p) => t.set({ page: p }, false)} />}
    </div>
  );
}
const qsOf = (p: Record<string, string>) => { const s = new URLSearchParams(Object.entries(p).filter(([, v]) => v)).toString(); return s ? `?${s}` : ''; };

function Invoices() {
  const t = useTableParams();
  const q = useQuery({ queryKey: ['cm-invoices', t.get('q'), t.page], queryFn: () => api.get<Paged<Invoice>>('/commerce/invoices', { q: t.get('q'), page: t.page }) });
  const [busy, setBusy] = useState<number | null>(null);
  return (
    <div>
      <SearchInput className="mb-4 w-full sm:w-80" placeholder="Número, nombre o correo" value={t.get('q')} onChange={(v) => t.set({ q: v })} />
      {q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : (
        <DataTable loading={q.isLoading} rows={q.data?.data} rowKey={(r) => r.id}
          empty={<EmptyState title="Sin facturas" description="Se emite una factura por cada pedido pagado." />}
          columns={[
            { key: 'n', header: 'Factura', cell: (r) => (<span className="flex items-center gap-2 font-semibold">{r.number}{r.isTest && <TestTag />}</span>) },
            { key: 'b', header: 'Cliente', cell: (r) => (<div><p>{r.billingName}</p><p className="text-xs text-muted">{r.user.email}</p></div>) },
            { key: 'o', header: 'Pedido', cell: (r) => r.order.number },
            { key: 'd', header: 'Emitida', cell: (r) => date(r.issuedAt) },
            { key: 't', header: 'Total', align: 'right', cell: (r) => money(r.total, r.currency) },
            { key: 'x', header: <span className="sr-only">PDF</span>, align: 'right', cell: (r) => (
              <Button size="sm" variant="outline" icon={<FileText className="size-4" />} loading={busy === r.id} onClick={async () => { setBusy(r.id); try { await download(`/commerce/invoices/${r.id}/pdf`, `${r.number}.pdf`); } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(null); } }}>PDF</Button>) },
          ]} />
      )}
      {q.data && <Pagination page={q.data.meta.page} pages={q.data.meta.pages} total={q.data.meta.total} onPage={(p) => t.set({ page: p }, false)} />}
    </div>
  );
}

function useCrudList<T>(key: string, path: string, extra?: Record<string, string | number>) {
  const t = useTableParams();
  const q = useQuery({ queryKey: [key, t.get('q'), t.page, extra], queryFn: () => api.get<Paged<T>>(path, { q: t.get('q'), page: t.page, pageSize: 20, ...extra }) });
  return { t, q };
}

function Coupons() {
  const { t, q } = useCrudList<Coupon>('cm-coupons', '/commerce/coupons');
  const [edit, setEdit] = useState<Coupon | 'new' | null>(null);
  const del = useDeleter({ path: (id) => `/commerce/coupons/${id}`, invalidate: [['cm-coupons']], title: 'Eliminar cupón', description: 'Si ya fue canjeado, el cupón se desactivará en lugar de eliminarse.', success: 'Cupón procesado' });
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <SearchInput className="w-full sm:w-72" placeholder="Buscar cupón" value={t.get('q')} onChange={(v) => t.set({ q: v })} />
        <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setEdit('new')}>Nuevo cupón</Button>
      </div>
      {q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : (
        <DataTable loading={q.isLoading} rows={q.data?.data} rowKey={(r) => r.id}
          empty={<EmptyState title="Sin cupones" description="Crea códigos de descuento por porcentaje o monto fijo." action={<Button variant="primary" onClick={() => setEdit('new')}>Crear cupón</Button>} />}
          columns={[
            { key: 'c', header: 'Código', cell: (r) => (<div><p className="font-mono font-bold">{r.code}</p>{r.description && <p className="text-xs text-muted">{r.description}</p>}</div>) },
            { key: 'v', header: 'Descuento', cell: (r) => (r.type === 'PERCENT' ? `${r.value} %` : money(r.value)) },
            { key: 'u', header: 'Usos', cell: (r) => `${num(r.usedCount)}${r.maxUses ? ` / ${num(r.maxUses)}` : ''}` },
            { key: 'cu', header: 'Aplica a', cell: (r) => r.course?.title ?? 'Todo el catálogo' },
            { key: 'vi', header: 'Vigencia', cell: (r) => (r.validFrom || r.validUntil ? `${date(r.validFrom)} – ${date(r.validUntil)}` : 'Sin límite') },
            { key: 's', header: 'Estado', cell: (r) => <Tag tone={r.isActive ? 'success' : 'neutral'}>{r.isActive ? 'Activo' : 'Inactivo'}</Tag> },
            { key: 'x', header: <span className="sr-only">Acciones</span>, align: 'right', cell: (r) => <Actions onEdit={() => setEdit(r)} onDelete={() => del.ask(r.id)} /> },
          ]} />
      )}
      {q.data && <Pagination page={q.data.meta.page} pages={q.data.meta.pages} total={q.data.meta.total} onPage={(p) => t.set({ page: p }, false)} />}
      {edit && <CouponDrawer item={edit === 'new' ? null : edit} onClose={() => setEdit(null)} />}
      {del.dialog}
    </div>
  );
}

function CouponDrawer({ item, onClose }: { item: Coupon | null; onClose: () => void }) {
  const { options } = useCourseOptions();
  const [f, setF] = useState({
    code: item?.code ?? '', description: item?.description ?? '', type: item?.type ?? 'PERCENT', value: item ? String(item.value) : '', maxUses: item?.maxUses ? String(item.maxUses) : '',
    perUserLimit: String(item?.perUserLimit ?? 1), minAmount: item?.minAmount ? String(item.minAmount) : '', courseId: item?.courseId ? String(item.courseId) : '',
    validFrom: dayInput(item?.validFrom), validUntil: dayInput(item?.validUntil), isActive: item?.isActive ?? true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const save = useAction((b: Record<string, unknown>) => (item ? api.patch(`/commerce/coupons/${item.id}`, b) : api.post('/commerce/coupons', b)), { success: 'Cupón guardado', invalidate: [['cm-coupons']], onSuccess: onClose });
  return (
    <Drawer open onClose={onClose} title={item ? `Editar ${item.code}` : 'Nuevo cupón'}
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button type="submit" form="cp-form" variant="primary" loading={save.isPending}>Guardar</Button></>}>
      <form id="cp-form" className="space-y-4" onSubmit={(e) => {
        e.preventDefault();
        save.mutate({ code: f.code, description: strOrNull(f.description), type: f.type, value: Number(f.value), maxUses: numOrNull(f.maxUses), perUserLimit: Number(f.perUserLimit) || 1, minAmount: numOrNull(f.minAmount), courseId: numOrNull(f.courseId), validFrom: strOrNull(f.validFrom), validUntil: strOrNull(f.validUntil), isActive: f.isActive },
          { onError: (x) => x instanceof ApiError && setErrors(x.fieldErrors) });
      }}>
        {item && <p className="text-sm text-graphite">Canjes realizados: <strong className="tnum">{item.usedCount}</strong></p>}
        <Input label="Código" required value={f.code} error={errors.code} hint="Se guarda en mayúsculas." onChange={set('code')} />
        <Input label="Descripción" value={f.description} onChange={set('description')} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Tipo" options={[{ value: 'PERCENT', label: 'Porcentaje (%)' }, { value: 'FIXED', label: 'Monto fijo' }]} value={f.type} onChange={set('type')} />
          <Input label="Valor" type="number" min={0} step="0.01" required value={f.value} error={errors.value} onChange={set('value')} />
          <Input label="Usos máximos" type="number" min={1} value={f.maxUses} hint="Vacío = ilimitado" onChange={set('maxUses')} />
          <Input label="Usos por usuario" type="number" min={1} value={f.perUserLimit} onChange={set('perUserLimit')} />
          <Input label="Compra mínima" type="number" min={0} step="0.01" value={f.minAmount} onChange={set('minAmount')} />
          <Select label="Solo para el curso" placeholder="Cualquiera" options={options} value={f.courseId} onChange={set('courseId')} />
          <Input label="Válido desde" type="date" value={f.validFrom} onChange={set('validFrom')} />
          <Input label="Válido hasta" type="date" value={f.validUntil} error={errors.validUntil} onChange={set('validUntil')} />
        </div>
        <Switch label="Cupón activo" checked={f.isActive} onChange={(v) => setF({ ...f, isActive: v })} />
      </form>
    </Drawer>
  );
}

function Bundles() {
  const { t, q } = useCrudList<Bundle>('cm-bundles', '/commerce/bundles');
  const [edit, setEdit] = useState<Bundle | 'new' | null>(null);
  const del = useDeleter({ path: (id) => `/commerce/bundles/${id}`, invalidate: [['cm-bundles']], title: 'Eliminar paquete', description: 'Si tiene pedidos asociados se desactivará en lugar de eliminarse.', success: 'Paquete procesado' });
  return (
    <div>
      <div className="mb-4 flex justify-end"><Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setEdit('new')}>Nuevo paquete</Button></div>
      {q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : (
        <DataTable loading={q.isLoading} rows={q.data?.data} rowKey={(r) => r.id}
          empty={<EmptyState title="Sin paquetes" description="Agrupa varios cursos en un solo precio." action={<Button variant="primary" onClick={() => setEdit('new')}>Crear paquete</Button>} />}
          columns={[
            { key: 't', header: 'Paquete', cell: (r) => <span className="font-semibold">{r.title}</span> },
            { key: 'c', header: 'Cursos', cell: (r) => <span className="line-clamp-2 max-w-sm">{r.courses.map((c) => c.title).join(', ') || '—'}</span> },
            { key: 'p', header: 'Precio', align: 'right', cell: (r) => <span>{money(r.price)}<span className="block text-xs text-muted">suelto: {money(r.courses.reduce((a, c) => a + c.price, 0))}</span></span> },
            { key: 's', header: 'Estado', cell: (r) => <Tag tone={r.isActive ? 'success' : 'neutral'}>{r.isActive ? 'Activo' : 'Inactivo'}</Tag> },
            { key: 'x', header: <span className="sr-only">Acciones</span>, align: 'right', cell: (r) => <Actions onEdit={() => setEdit(r)} onDelete={() => del.ask(r.id)} /> },
          ]} />
      )}
      {q.data && <Pagination page={q.data.meta.page} pages={q.data.meta.pages} total={q.data.meta.total} onPage={(p) => t.set({ page: p }, false)} />}
      {edit && <BundleDrawer item={edit === 'new' ? null : edit} onClose={() => setEdit(null)} />}
      {del.dialog}
    </div>
  );
}

function BundleDrawer({ item, onClose }: { item: Bundle | null; onClose: () => void }) {
  const { courses } = useCourseOptions();
  const [f, setF] = useState({ title: item?.title ?? '', description: item?.description ?? '', price: item ? String(item.price) : '', isActive: item?.isActive ?? true });
  const [ids, setIds] = useState<number[]>(item?.courses.map((c) => c.id) ?? []);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const save = useAction((b: Record<string, unknown>) => (item ? api.patch(`/commerce/bundles/${item.id}`, b) : api.post('/commerce/bundles', b)), { success: 'Paquete guardado', invalidate: [['cm-bundles']], onSuccess: onClose });
  return (
    <Drawer open onClose={onClose} title={item ? 'Editar paquete' : 'Nuevo paquete'}
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button type="submit" form="bd-form" variant="primary" loading={save.isPending}>Guardar</Button></>}>
      <form id="bd-form" className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate({ title: f.title, description: f.description, price: Number(f.price), isActive: f.isActive, courseIds: ids }, { onError: (x) => x instanceof ApiError && setErrors(x.fieldErrors) }); }}>
        <Input label="Título" required value={f.title} error={errors.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
        <Textarea label="Descripción" rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
        <Input label="Precio (USD)" type="number" min={0} step="0.01" required value={f.price} error={errors.price} onChange={(e) => setF({ ...f, price: e.target.value })} />
        <fieldset><legend className="mb-2 text-[0.8125rem] font-semibold">Cursos incluidos</legend>
          {courses.length === 0 ? <p className="text-sm text-muted">No hay cursos disponibles.</p> : (
            <div className="max-h-64 space-y-2 overflow-y-auto border border-line p-3">
              {courses.map((c) => <Checkbox key={c.id} label={c.title} hint={c.code} checked={ids.includes(c.id)} onChange={(e) => setIds(e.target.checked ? [...ids, c.id] : ids.filter((x) => x !== c.id))} />)}
            </div>)}
          {errors.courseIds && <p className="mt-1 text-xs font-semibold text-danger">{errors.courseIds}</p>}
        </fieldset>
        <Switch label="Paquete activo" checked={f.isActive} onChange={(v) => setF({ ...f, isActive: v })} />
      </form>
    </Drawer>
  );
}

function Plans() {
  const { t, q } = useCrudList<Plan>('cm-plans', '/commerce/plans');
  const [edit, setEdit] = useState<Plan | 'new' | null>(null);
  const del = useDeleter({ path: (id) => `/commerce/plans/${id}`, invalidate: [['cm-plans']], title: 'Eliminar plan', description: 'Si tiene suscripciones no se podrá eliminar: desactívalo en su lugar.', success: 'Plan eliminado' });
  return (
    <div>
      <div className="mb-4 flex justify-end"><Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setEdit('new')}>Nuevo plan</Button></div>
      {q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : (
        <DataTable loading={q.isLoading} rows={q.data?.data} rowKey={(r) => r.id}
          empty={<EmptyState title="Sin planes" description="Los planes de suscripción dan acceso recurrente al catálogo." action={<Button variant="primary" onClick={() => setEdit('new')}>Crear plan</Button>} />}
          columns={[
            { key: 'n', header: 'Plan', cell: (r) => (<div><p className="font-semibold">{r.name}</p>{r.description && <p className="line-clamp-1 text-xs text-muted">{r.description}</p>}</div>) },
            { key: 'p', header: 'Precio', align: 'right', cell: (r) => money(r.price) },
            { key: 'i', header: 'Periodo', cell: (r) => INTERVAL[r.interval] },
            { key: 'a', header: 'Alcance', cell: (r) => (r.includesAll ? 'Todo el catálogo' : 'Limitado') },
            { key: 'su', header: 'Suscriptores', align: 'right', cell: (r) => r.subscriptionsCount },
            { key: 's', header: 'Estado', cell: (r) => <Tag tone={r.isActive ? 'success' : 'neutral'}>{r.isActive ? 'Activo' : 'Inactivo'}</Tag> },
            { key: 'x', header: <span className="sr-only">Acciones</span>, align: 'right', cell: (r) => <Actions onEdit={() => setEdit(r)} onDelete={() => del.ask(r.id)} /> },
          ]} />
      )}
      {q.data && <Pagination page={q.data.meta.page} pages={q.data.meta.pages} total={q.data.meta.total} onPage={(p) => t.set({ page: p }, false)} />}
      {edit && <PlanDrawer item={edit === 'new' ? null : edit} onClose={() => setEdit(null)} />}
      {del.dialog}
    </div>
  );
}

function PlanDrawer({ item, onClose }: { item: Plan | null; onClose: () => void }) {
  const [f, setF] = useState({ name: item?.name ?? '', description: item?.description ?? '', price: item ? String(item.price) : '', interval: item?.interval ?? 'MONTH', includesAll: item?.includesAll ?? true, isActive: item?.isActive ?? true });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const save = useAction((b: Record<string, unknown>) => (item ? api.patch(`/commerce/plans/${item.id}`, b) : api.post('/commerce/plans', b)), { success: 'Plan guardado', invalidate: [['cm-plans']], onSuccess: onClose });
  return (
    <Drawer open onClose={onClose} title={item ? 'Editar plan' : 'Nuevo plan'}
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button type="submit" form="pl-form" variant="primary" loading={save.isPending}>Guardar</Button></>}>
      <form id="pl-form" className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate({ ...f, price: Number(f.price) }, { onError: (x) => x instanceof ApiError && setErrors(x.fieldErrors) }); }}>
        <Input label="Nombre" required value={f.name} error={errors.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <Textarea label="Descripción" rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Precio (USD)" type="number" min={0} step="0.01" required value={f.price} error={errors.price} onChange={(e) => setF({ ...f, price: e.target.value })} />
          <Select label="Periodo" options={opts(INTERVAL)} value={f.interval} onChange={(e) => setF({ ...f, interval: e.target.value })} />
        </div>
        <Switch label="Incluye todo el catálogo" checked={f.includesAll} onChange={(v) => setF({ ...f, includesAll: v })} />
        <Switch label="Plan activo" checked={f.isActive} onChange={(v) => setF({ ...f, isActive: v })} />
      </form>
    </Drawer>
  );
}

function Subscriptions() {
  const t = useTableParams();
  const q = useQuery({ queryKey: ['cm-subs', t.get('q'), t.get('status'), t.page], queryFn: () => api.get<Paged<Sub>>('/commerce/subscriptions', { q: t.get('q'), status: t.get('status'), page: t.page }) });
  const [target, setTarget] = useState<Sub | null>(null);
  const [immediate, setImmediate] = useState(false);
  const cancel = useAction(() => api.post(`/commerce/subscriptions/${target!.id}/cancel`, { immediate }), { success: 'Suscripción cancelada', invalidate: [['cm-subs']], onSuccess: () => { setTarget(null); setImmediate(false); } });
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <SearchInput className="w-full sm:w-72" placeholder="Buscar suscriptor" value={t.get('q')} onChange={(v) => t.set({ q: v })} />
        <div className="w-full sm:w-44"><Select label="Estado" placeholder="Todos" value={t.get('status')} onChange={(e) => t.set({ status: e.target.value })} options={opts(SUB_STATUS)} /></div>
      </div>
      {q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : (
        <DataTable loading={q.isLoading} rows={q.data?.data} rowKey={(r) => r.id}
          empty={<EmptyState title="Sin suscripciones" description="Aparecerán cuando un estudiante compre un plan." />}
          columns={[
            { key: 'u', header: 'Suscriptor', cell: (r) => (<div><p>{fullName(r.user)}</p><p className="text-xs text-muted">{r.user.email}</p></div>) },
            { key: 'p', header: 'Plan', cell: (r) => `${r.plan.name} · ${money(r.plan.price)} ${INTERVAL[r.plan.interval]?.toLowerCase()}` },
            { key: 'v', header: 'Vence', cell: (r) => date(r.currentPeriodEnd) },
            { key: 's', header: 'Estado', cell: (r) => (<span className="flex flex-wrap gap-1"><Tag tone={statusTone(r.status)}>{SUB_STATUS[r.status] ?? r.status}</Tag>{r.cancelledAt && r.status === 'ACTIVE' && <Tag tone="warning">Cancelación programada</Tag>}</span>) },
            { key: 'x', header: <span className="sr-only">Acciones</span>, align: 'right', cell: (r) => (r.status === 'ACTIVE' ? <Button size="sm" variant="outline" onClick={() => setTarget(r)}>Cancelar</Button> : null) },
          ]} />
      )}
      {q.data && <Pagination page={q.data.meta.page} pages={q.data.meta.pages} total={q.data.meta.total} onPage={(p) => t.set({ page: p }, false)} />}
      <ConfirmDialog open={!!target} onClose={() => setTarget(null)} loading={cancel.isPending} onConfirm={() => cancel.mutate()} confirmLabel="Cancelar suscripción" title="Cancelar suscripción"
        description={<div className="space-y-3"><p>La suscripción de {target ? fullName(target.user) : ''} quedará activa hasta el fin del periodo, salvo que cancelas de inmediato.</p>
          <Switch label="Cancelar de inmediato" hint="El acceso termina ahora." checked={immediate} onChange={setImmediate} /></div>} />
    </div>
  );
}
