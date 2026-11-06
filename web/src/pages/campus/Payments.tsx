import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { FileText } from 'lucide-react';
import { api, download, errorMessage } from '@/lib/api';
import { useAction } from '@/lib/hooks';
import { ORDER_STATUS, date, money } from '@/lib/format';
import { PageHeader, Section } from '@/components/ui/Page';
import { EmptyState } from '@/components/ui/Feedback';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Tag, statusTone } from '@/components/ui/Data';
import { ConfirmDialog } from '@/components/ui/Overlay';
import { Q } from '@/features/campus/shared';

interface Order {
  id: number;
  number: string;
  status: string;
  total: number;
  currency: string;
  isTest: boolean;
  createdAt: string;
  items: { id: number; description: string; quantity: number; total: number }[];
  invoice: { id: number; number: string } | null;
}
interface Sub {
  id: number;
  status: string;
  currentPeriodEnd: string | null;
  cancelledAt: string | null;
  plan: { name: string; price: number; interval: 'MONTH' | 'YEAR' };
}
const SUB_STATUS: Record<string, string> = { ACTIVE: 'Activa', CANCELLED: 'Cancelada', EXPIRED: 'Vencida' };

export default function Payments() {
  const orders = useQuery({ queryKey: ['commerce', 'orders', 'me'], queryFn: async () => (await api.get<{ data: Order[] }>('/commerce/orders/me')).data });
  const subs = useQuery({ queryKey: ['commerce', 'subscriptions', 'me'], queryFn: async () => (await api.get<{ data: Sub[] }>('/commerce/subscriptions/me')).data });
  const [cancel, setCancel] = useState<Sub | null>(null);
  const cancelSub = useAction((id: number) => api.post(`/commerce/subscriptions/${id}/cancel`), {
    invalidate: [['commerce', 'subscriptions', 'me']],
    success: 'Suscripción cancelada',
    onSuccess: () => setCancel(null),
  });
  const invoice = async (o: Order) => {
    try {
      await download(`/commerce/invoices/${o.invoice!.id}/pdf`, `factura-${o.invoice!.number}.pdf`);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <div className="animate-rise">
      <PageHeader title="Pagos y facturas" description="Tus pedidos, facturas y suscripciones." />
      <Section title="Pedidos">
        <Q query={orders}>
          {(list) =>
            list.length === 0 ? (
              <EmptyState title="Aún no tienes pedidos" description="Cuando compres un curso o programa aparecerá aquí." action={<ButtonLink to="/cursos" variant="ink">Explorar cursos</ButtonLink>} />
            ) : (
              <ul className="divide-y divide-line border-y border-ink">
                {list.map((o) => (
                  <li key={o.id} className="grid gap-x-8 gap-y-2 py-5 md:grid-cols-[1fr_auto]">
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 text-sm tnum">
                        <span className="font-bold">{o.number}</span>
                        <Tag tone={statusTone(o.status)}>{ORDER_STATUS[o.status] ?? o.status}</Tag>
                        {o.isTest && <Tag tone="warning">PRUEBA</Tag>}
                        <span className="text-graphite">{date(o.createdAt)}</span>
                      </p>
                      <ul className="mt-2 space-y-0.5 text-sm">
                        {o.items.map((i) => (
                          <li key={i.id} className="text-graphite">{i.description}{i.quantity > 1 && ` × ${i.quantity}`}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="flex items-center gap-4 md:flex-col md:items-end">
                      <span className="text-xl font-bold tnum">{money(o.total, o.currency)}</span>
                      {o.invoice && <Button size="sm" variant="outline" icon={<FileText className="size-4" />} onClick={() => invoice(o)}>Factura {o.invoice.number}</Button>}
                    </div>
                  </li>
                ))}
              </ul>
            )
          }
        </Q>
      </Section>
      <Section title="Suscripciones">
        <Q query={subs}>
          {(list) =>
            list.length === 0 ? (
              <p className="border-y border-line py-6 text-sm text-graphite">No tienes suscripciones.</p>
            ) : (
              <ul className="divide-y divide-line border-y border-ink">
                {list.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
                    <div>
                      <p className="flex items-center gap-2 font-bold">{s.plan.name} <Tag tone={statusTone(s.status)}>{SUB_STATUS[s.status] ?? s.status}</Tag></p>
                      <p className="text-sm text-graphite tnum">
                        {money(s.plan.price)} / {s.plan.interval === 'YEAR' ? 'año' : 'mes'}
                        {s.currentPeriodEnd && ` · ${s.cancelledAt ? 'Activa hasta' : 'Próxima renovación:'} ${date(s.currentPeriodEnd)}`}
                      </p>
                      {s.cancelledAt && s.status === 'ACTIVE' && <p className="text-xs text-muted">Cancelaste el {date(s.cancelledAt)}; no se renovará.</p>}
                    </div>
                    {s.status === 'ACTIVE' && !s.cancelledAt && <Button variant="outline" size="sm" onClick={() => setCancel(s)}>Cancelar suscripción</Button>}
                  </li>
                ))}
              </ul>
            )
          }
        </Q>
      </Section>
      <ConfirmDialog
        open={!!cancel}
        onClose={() => setCancel(null)}
        onConfirm={() => cancel && cancelSub.mutate(cancel.id)}
        loading={cancelSub.isPending}
        title="Cancelar suscripción"
        description={cancel && `Tu plan ${cancel.plan.name} seguirá activo hasta ${date(cancel.currentPeriodEnd)} y luego no se renovará.`}
        confirmLabel="Cancelar suscripción"
      />
    </div>
  );
}
