import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Download } from 'lucide-react';
import { api, ApiError, download, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Alert, EmptyState, ErrorState, SkeletonRows } from '@/components/ui/Feedback';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Form';
import { Panel } from '@/components/ui/Page';
import { fullName, money } from '@/lib/format';
import { usePageTitle } from '@/features/public/data';
import { Wrap } from '@/features/public/parts';

type ItemType = 'COURSE' | 'PROGRAM' | 'BUNDLE' | 'SUBSCRIPTION';
interface Item {
  type: ItemType;
  id: number;
}
interface Quote {
  items: { type: ItemType; id: number; description: string; unitPrice: number; alreadyOwned: boolean }[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  coupon: { code: string; description?: string } | null;
  couponError: string | null;
  warnings: string[];
}
interface Paid {
  order: { id: number; number: string; status: string; total: number; isTest: boolean };
  invoice: { id: number; number: string } | null;
  enrolledCourseIds: number[];
  redirectUrl?: string;
}

const TYPES: ItemType[] = ['COURSE', 'PROGRAM', 'BUNDLE', 'SUBSCRIPTION'];

function parseItems(raw: string | null): Item[] {
  if (!raw) return [];
  const out: Item[] = [];
  for (const part of raw.split(',')) {
    const [t, i] = part.split(':');
    const id = Number(i);
    if (TYPES.includes(t as ItemType) && Number.isInteger(id) && id > 0) out.push({ type: t as ItemType, id });
  }
  return out;
}

export default function Checkout() {
  usePageTitle('Checkout');
  const { user } = useAuth();
  const [sp] = useSearchParams();
  const items = useMemo(() => parseItems(sp.get('items')), [sp]);
  const key = items.map((i) => `${i.type}:${i.id}`).join(',');

  const [draft, setDraft] = useState('');
  const [coupon, setCoupon] = useState('');
  const [name, setName] = useState(fullName(user));
  const [taxId, setTaxId] = useState('');
  const [card, setCard] = useState<'approve' | 'decline'>('approve');
  const [payError, setPayError] = useState<string | null>(null);
  const [done, setDone] = useState<Paid | null>(null);

  const quote = useQuery({
    queryKey: ['checkout-quote', key, coupon],
    enabled: items.length > 0,
    retry: false,
    queryFn: () => api.post<Quote>('/commerce/checkout/quote', { items, couponCode: coupon || undefined }),
  });

  const pay = useMutation({
    mutationFn: () =>
      api.post<Paid>('/commerce/checkout', {
        items,
        couponCode: quote.data?.coupon ? coupon : undefined,
        billing: { name: name.trim(), taxId: taxId.trim() || undefined },
        testCard: card,
      }),
    onSuccess: (r) => {
      if (r.redirectUrl) {
        window.location.href = r.redirectUrl;
        return;
      }
      setDone(r);
    },
    onError: (e) => {
      setPayError(e instanceof ApiError && e.status === 402 ? 'El pago fue rechazado. Puedes intentarlo de nuevo con otra tarjeta de prueba.' : errorMessage(e));
    },
  });

  if (items.length === 0)
    return (
      <Wrap className="py-12">
        <EmptyState title="Tu carrito está vacío." description="Elige un curso o programa para continuar." action={<ButtonLink to="/cursos" variant="primary">Ver cursos</ButtonLink>} />
      </Wrap>
    );

  if (done) {
    const titleOf = (id: number) => quote.data?.items.find((i) => i.type === 'COURSE' && i.id === id)?.description;
    return (
      <>
        <header className="bg-orange">
          <Wrap className="py-12 lg:py-20">
            <h1 className="animate-rise text-display font-extrabold">{done.order.total > 0 ? 'Pago confirmado' : 'Inscripción confirmada'}</h1>
            <p className="mt-4 text-xl font-bold tnum">Pedido {done.order.number}</p>
          </Wrap>
        </header>
        <Wrap className="max-w-3xl py-10">
          {done.order.isTest && <Alert tone="warning" title="Pedido de prueba">Entorno de pruebas: no se realizó ningún cobro real.</Alert>}
          <div className="mt-8 flex flex-wrap gap-3">
            {done.invoice && (
              <Button variant="outline" icon={<Download className="size-4" />} onClick={() => download(`/commerce/invoices/${done.invoice!.id}/pdf`, `${done.invoice!.number}.pdf`).catch((e) => toast.error(errorMessage(e)))}>
                Descargar factura {done.invoice.number}
              </Button>
            )}
            {done.enrolledCourseIds.map((id) => (
              <ButtonLink key={id} to={`/campus/cursos/${id}`} variant="primary">
                {titleOf(id) ? `Ir a ${titleOf(id)}` : 'Ir al curso'}
              </ButtonLink>
            ))}
            {done.enrolledCourseIds.length === 0 && <ButtonLink to="/campus" variant="primary">Ir a mi campus</ButtonLink>}
          </div>
        </Wrap>
      </>
    );
  }

  const qd = quote.data;
  const allOwned = !!qd && qd.items.length > 0 && qd.items.every((i) => i.alreadyOwned);
  const free = !!qd && qd.total === 0;

  return (
    <Wrap className="py-10 lg:py-14">
      <h1 className="animate-rise text-title font-extrabold">Finalizar inscripción</h1>
      <div className="mt-8 grid gap-12 lg:grid-cols-12">
        <section className="lg:col-span-7" aria-label="Resumen">
          <h2 className="border-b border-ink pb-2 text-lg font-bold">Resumen</h2>
          {quote.isLoading ? (
            <SkeletonRows rows={2} />
          ) : quote.isError ? (
            <ErrorState error={quote.error} onRetry={() => quote.refetch()} />
          ) : qd ? (
            <>
              <ul className="divide-y divide-line">
                {qd.items.map((i) => (
                  <li key={`${i.type}${i.id}`} className="flex justify-between gap-6 py-4">
                    <span className="font-semibold">
                      {i.description}
                      {i.alreadyOwned && <span className="ml-2 text-sm font-normal text-muted">Ya lo tienes</span>}
                    </span>
                    <span className="tnum">{i.alreadyOwned ? '—' : money(i.unitPrice)}</span>
                  </li>
                ))}
              </ul>
              {qd.warnings.length > 0 && (
                <div className="mb-4 space-y-2">
                  {qd.warnings.map((w) => (
                    <Alert key={w} tone="info">{w}</Alert>
                  ))}
                </div>
              )}
              <form
                className="flex items-end gap-3 border-t border-line py-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  setCoupon(draft.trim().toUpperCase());
                }}
              >
                <Input wrapperClassName="flex-1" label="Cupón" placeholder="Código de cupón" value={draft} onChange={(e) => setDraft(e.target.value)} error={coupon ? qd.couponError ?? undefined : undefined} hint={qd.coupon ? `Cupón ${qd.coupon.code} aplicado` : undefined} />
                <Button type="submit" variant="outline" disabled={!draft.trim() && !coupon}>
                  {draft.trim() ? 'Aplicar' : 'Quitar'}
                </Button>
              </form>
              <dl className="space-y-1.5 border-t border-ink pt-4 text-sm">
                <div className="flex justify-between"><dt>Subtotal</dt><dd className="tnum">{money(qd.subtotal)}</dd></div>
                {qd.discount > 0 && <div className="flex justify-between"><dt>Descuento</dt><dd className="tnum">− {money(qd.discount)}</dd></div>}
                {qd.tax > 0 && <div className="flex justify-between"><dt>Impuestos</dt><dd className="tnum">{money(qd.tax)}</dd></div>}
                <div className="flex justify-between pt-2 text-2xl font-extrabold"><dt>Total</dt><dd className="tnum">{money(qd.total)}</dd></div>
              </dl>
            </>
          ) : null}
        </section>

        <section className="lg:col-span-5" aria-label="Pago">
          <Panel className="space-y-5">
            <h2 className="text-lg font-bold">Datos de facturación</h2>
            <Input label="Nombre" required value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
            <Input label="RNC o cédula (opcional)" value={taxId} onChange={(e) => setTaxId(e.target.value)} />
            {!free && (
              <>
                <Alert tone="warning" title="Entorno de pruebas: no se realiza ningún cobro real" />
                <Select
                  label="Tarjeta de prueba"
                  value={card}
                  onChange={(e) => setCard(e.target.value as 'approve' | 'decline')}
                  options={[
                    { value: 'approve', label: 'Aprobar pago' },
                    { value: 'decline', label: 'Rechazar pago' },
                  ]}
                />
              </>
            )}
            {payError && (
              <Alert tone="danger" title="No se completó el pago">
                {payError}
              </Alert>
            )}
            {allOwned ? (
              <ButtonLink to="/campus/cursos" variant="primary" size="lg" className="w-full">Ir a mis cursos</ButtonLink>
            ) : (
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                loading={pay.isPending}
                disabled={!qd || name.trim().length < 2}
                onClick={() => {
                  setPayError(null);
                  pay.mutate();
                }}
              >
                {free ? 'Confirmar inscripción' : payError ? `Reintentar pago · ${money(qd?.total)}` : `Pagar ${money(qd?.total)}`}
              </Button>
            )}
          </Panel>
        </section>
      </div>
    </Wrap>
  );
}
