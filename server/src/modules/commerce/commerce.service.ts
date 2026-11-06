import type { Request } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { AppError, badRequest, conflict, notConfigured, notFound } from '../../lib/errors.js';
import { audit } from '../../lib/audit.js';
import { notify } from '../../lib/notify.js';
import { getGateway } from '../../integrations/payments/gateway.js';

export type ItemType = 'COURSE' | 'PROGRAM' | 'BUNDLE' | 'SUBSCRIPTION';
export interface CartItem {
  type: ItemType;
  id: number;
}

type Tx = Prisma.TransactionClient;

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Convierte Decimal de Prisma a number de forma recursiva (para respuestas JSON). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function plain(v: unknown): any {
  if (v instanceof Prisma.Decimal) return v.toNumber();
  if (v instanceof Date) return v;
  if (Array.isArray(v)) return v.map(plain);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, plain(x)]));
  return v;
}

export function dateRange(q: { from?: string; to?: string }) {
  const r: { gte?: Date; lte?: Date } = {};
  if (q.from) {
    const d = new Date(q.from);
    if (!isNaN(+d)) r.gte = d;
  }
  if (q.to) {
    const d = new Date(q.to);
    if (!isNaN(+d)) {
      if (q.to.length <= 10) d.setUTCHours(23, 59, 59, 999);
      r.lte = d;
    }
  }
  return Object.keys(r).length ? r : undefined;
}

export async function withRetry<T>(fn: () => Promise<T>, tries = 5): Promise<T> {
  for (let i = 1; ; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i < tries && e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') continue;
      throw e;
    }
  }
}

// ───────────────────────── Cotización ─────────────────────────

interface Line {
  type: ItemType;
  id: number;
  description: string;
  unitPrice: number;
  alreadyOwned: boolean;
  courseIds: number[];
}

export interface CouponInfo {
  code: string;
  description: string | null;
  type: 'PERCENT' | 'FIXED';
  value: number;
}

export interface Quote {
  lines: Line[];
  payable: Line[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  coupon: CouponInfo | null;
  couponId: number | null;
  couponError: string | null;
  warnings: string[];
  problems: string[];
}

async function ownedCourseIds(userId: number) {
  const rows = await prisma.enrollment.findMany({ where: { userId, status: { in: ['ACTIVE', 'COMPLETED'] } }, select: { courseId: true } });
  return new Set(rows.map((r) => r.courseId));
}

async function resolveLine(userId: number, item: CartItem, owned: Set<number>): Promise<Line | string> {
  switch (item.type) {
    case 'COURSE': {
      const c = await prisma.course.findFirst({ where: { id: item.id, deletedAt: null } });
      if (!c || c.status !== 'PUBLISHED') return `El curso #${item.id} no está disponible para la venta.`;
      if (c.isFree) return `El curso "${c.title}" es gratuito: inscríbete directamente, no requiere pago.`;
      return { type: 'COURSE', id: c.id, description: c.title, unitPrice: Number(c.price), alreadyOwned: owned.has(c.id), courseIds: [c.id] };
    }
    case 'PROGRAM': {
      const p = await prisma.program.findUnique({ where: { id: item.id }, include: { courses: { select: { courseId: true } } } });
      if (!p || p.status !== 'PUBLISHED') return `El programa #${item.id} no está disponible para la venta.`;
      const ids = p.courses.map((x) => x.courseId);
      return { type: 'PROGRAM', id: p.id, description: p.title, unitPrice: Number(p.price), alreadyOwned: ids.length > 0 && ids.every((i) => owned.has(i)), courseIds: ids };
    }
    case 'BUNDLE': {
      const b = await prisma.bundle.findUnique({ where: { id: item.id }, include: { courses: { select: { courseId: true } } } });
      if (!b || !b.isActive) return `El paquete #${item.id} no está disponible para la venta.`;
      const ids = b.courses.map((x) => x.courseId);
      return { type: 'BUNDLE', id: b.id, description: b.title, unitPrice: Number(b.price), alreadyOwned: ids.length > 0 && ids.every((i) => owned.has(i)), courseIds: ids };
    }
    case 'SUBSCRIPTION': {
      const pl = await prisma.subscriptionPlan.findUnique({ where: { id: item.id } });
      if (!pl || !pl.isActive) return `El plan #${item.id} no está disponible.`;
      const active = await prisma.subscription.findFirst({
        where: { userId, planId: pl.id, status: 'ACTIVE', cancelledAt: null, currentPeriodEnd: { gt: new Date() } },
      });
      return {
        type: 'SUBSCRIPTION',
        id: pl.id,
        description: `${pl.name} (${pl.interval === 'YEAR' ? 'anual' : 'mensual'})`,
        unitPrice: Number(pl.price),
        alreadyOwned: !!active,
        courseIds: [],
      };
    }
  }
}

async function evalCoupon(userId: number, rawCode: string, payable: Line[], subtotal: number) {
  const code = rawCode.trim().toUpperCase();
  const fail = (couponError: string) => ({ coupon: null as CouponInfo | null, couponId: null as number | null, discount: 0, couponError });
  const c = await prisma.coupon.findUnique({ where: { code }, include: { course: { select: { title: true } } } });
  if (!c || !c.isActive) return fail('El cupón no es válido.');
  const now = new Date();
  if (c.validFrom && c.validFrom > now) return fail('El cupón aún no está vigente.');
  if (c.validUntil && c.validUntil < now) return fail('El cupón está vencido.');
  if (c.maxUses != null && c.usedCount >= c.maxUses) return fail('El cupón ya alcanzó su límite de usos.');
  const used = await prisma.couponRedemption.count({ where: { couponId: c.id, userId } });
  if (used >= c.perUserLimit) return fail('Ya utilizaste este cupón el máximo de veces permitido.');
  if (c.minAmount != null && subtotal < Number(c.minAmount)) return fail(`El cupón requiere una compra mínima de USD ${Number(c.minAmount).toFixed(2)}.`);
  let base = subtotal;
  if (c.courseId != null) {
    base = payable.filter((l) => l.type === 'COURSE' && l.id === c.courseId).reduce((s, l) => s + l.unitPrice, 0);
    if (base <= 0) return fail(`El cupón solo aplica al curso "${c.course?.title ?? ''}".`);
  }
  const value = Number(c.value);
  const raw = c.type === 'PERCENT' ? (base * Math.min(value, 100)) / 100 : Math.min(value, base);
  const discount = round2(Math.min(raw, base));
  return { coupon: { code: c.code, description: c.description, type: c.type, value }, couponId: c.id, discount, couponError: null as string | null };
}

export async function buildQuote(userId: number, items: CartItem[], couponCode?: string | null): Promise<Quote> {
  const seen = new Set<string>();
  const unique = items.filter((i) => {
    const k = `${i.type}:${i.id}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  const owned = await ownedCourseIds(userId);
  const lines: Line[] = [];
  const problems: string[] = [];
  for (const it of unique) {
    const r = await resolveLine(userId, it, owned);
    if (typeof r === 'string') problems.push(r);
    else lines.push(r);
  }
  const warnings: string[] = [...problems];
  for (const l of lines) if (l.alreadyOwned) warnings.push(`Ya tienes acceso a "${l.description}"; se excluyó del total.`);
  const payable = lines.filter((l) => !l.alreadyOwned);
  // Cursos duplicados dentro del carrito (p. ej. curso suelto + paquete que lo incluye)
  const covered = new Map<number, string>();
  for (const l of payable) {
    if (l.type === 'COURSE') continue;
    for (const cid of l.courseIds) if (!covered.has(cid)) covered.set(cid, l.description);
  }
  for (const l of payable) if (l.type === 'COURSE' && covered.has(l.id)) warnings.push(`"${l.description}" también está incluido en "${covered.get(l.id)}".`);

  const subtotal = round2(payable.reduce((s, l) => s + l.unitPrice, 0));
  let discount = 0;
  let coupon: CouponInfo | null = null;
  let couponId: number | null = null;
  let couponError: string | null = null;
  if (couponCode && couponCode.trim()) {
    if (!payable.length) couponError = 'No hay artículos pendientes de pago a los que aplicar el cupón.';
    else {
      const r = await evalCoupon(userId, couponCode, payable, subtotal);
      ({ coupon, couponId, discount, couponError } = r);
    }
  }
  const total = round2(Math.max(0, subtotal - discount));
  return { lines, payable, subtotal, discount, tax: 0, total, coupon, couponId, couponError, warnings, problems };
}

export function quoteResponse(q: Quote) {
  return {
    items: q.lines.map((l) => ({ type: l.type, id: l.id, description: l.description, unitPrice: l.unitPrice, alreadyOwned: l.alreadyOwned })),
    subtotal: q.subtotal,
    discount: q.discount,
    tax: q.tax,
    total: q.total,
    coupon: q.coupon,
    couponError: q.couponError,
    warnings: q.warnings,
  };
}

// ───────────────────────── Numeración ─────────────────────────

async function nextOrderNumber(tx: Tx) {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const prefix = `ORD-${ymd}-`;
  const last = await tx.order.findFirst({ where: { number: { startsWith: prefix } }, orderBy: { number: 'desc' }, select: { number: true } });
  const n = last ? parseInt(last.number.slice(prefix.length), 10) + 1 : 1;
  return prefix + String(n).padStart(4, '0');
}

async function nextInvoiceNumber(tx: Tx) {
  const last = await tx.invoice.findFirst({ where: { number: { startsWith: 'FAC-' } }, orderBy: { number: 'desc' }, select: { number: true } });
  const n = last ? parseInt(last.number.slice(4), 10) + 1 : 1;
  return 'FAC-' + String(n).padStart(6, '0');
}

// ───────────────────────── Cumplimiento (inscripciones / suscripción) ─────────────────────────

async function enroll(tx: Tx, userId: number, courseId: number, source: 'PURCHASE' | 'PROGRAM', orderItemId: number) {
  const ex = await tx.enrollment.findUnique({ where: { userId_courseId: { userId, courseId } } });
  if (!ex) await tx.enrollment.create({ data: { userId, courseId, status: 'ACTIVE', source, orderItemId } });
  else if (ex.status === 'CANCELLED' || ex.status === 'PENDING_PAYMENT') {
    await tx.enrollment.update({ where: { id: ex.id }, data: { status: 'ACTIVE', source, orderItemId, enrolledAt: new Date() } });
  }
}

async function fulfill(tx: Tx, userId: number, items: { id: number; itemType: ItemType; courseId: number | null; programId: number | null; bundleId: number | null; planId: number | null }[]) {
  const granted = new Set<number>();
  for (const it of items) {
    if (it.itemType === 'COURSE' && it.courseId) {
      await enroll(tx, userId, it.courseId, 'PURCHASE', it.id);
      granted.add(it.courseId);
    } else if (it.itemType === 'PROGRAM' && it.programId) {
      const rows = await tx.programCourse.findMany({ where: { programId: it.programId }, select: { courseId: true } });
      for (const r of rows) {
        await enroll(tx, userId, r.courseId, 'PROGRAM', it.id);
        granted.add(r.courseId);
      }
    } else if (it.itemType === 'BUNDLE' && it.bundleId) {
      const rows = await tx.bundleCourse.findMany({ where: { bundleId: it.bundleId }, select: { courseId: true } });
      for (const r of rows) {
        await enroll(tx, userId, r.courseId, 'PURCHASE', it.id);
        granted.add(r.courseId);
      }
    } else if (it.itemType === 'SUBSCRIPTION' && it.planId) {
      const plan = await tx.subscriptionPlan.findUniqueOrThrow({ where: { id: it.planId } });
      const start = new Date();
      const end = new Date(start);
      if (plan.interval === 'YEAR') end.setFullYear(end.getFullYear() + 1);
      else end.setMonth(end.getMonth() + 1);
      await tx.subscription.create({ data: { userId, planId: plan.id, status: 'ACTIVE', currentPeriodStart: start, currentPeriodEnd: end } });
    }
  }
  return [...granted];
}

interface PaymentData {
  paymentId?: number;
  provider: string;
  providerRef?: string | null;
  method?: string | null;
  isTest: boolean;
  raw?: Record<string, unknown>;
}

/** Marca la orden como pagada, registra pago, factura, canje de cupón y cumple los ítems. Todo en la transacción recibida. */
async function finalizePaid(tx: Tx, orderId: number, pay: PaymentData, billing: { name: string; taxId?: string | null }) {
  const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true, redemption: true, invoice: true } });
  const claimed = await tx.order.updateMany({ where: { id: orderId, status: { in: ['PENDING', 'FAILED'] } }, data: { status: 'PAID', paidAt: new Date() } });
  if (claimed.count === 0) throw conflict('La orden ya no está pendiente de pago.');

  const data = {
    provider: pay.provider,
    providerRef: pay.providerRef ?? null,
    method: pay.method ?? null,
    isTest: pay.isTest,
    status: 'APPROVED' as const,
    raw: pay.raw as Prisma.InputJsonValue | undefined,
  };
  if (pay.paymentId) await tx.payment.update({ where: { id: pay.paymentId }, data });
  else await tx.payment.create({ data: { ...data, orderId, amount: order.total, currency: order.currency } });

  const invoice =
    order.invoice ??
    (await tx.invoice.create({
      data: {
        number: await nextInvoiceNumber(tx),
        orderId,
        userId: order.userId,
        billingName: billing.name.slice(0, 200),
        billingTaxId: billing.taxId?.slice(0, 30) || null,
        ncf: null, // pendiente de configuración fiscal
        subtotal: order.subtotal,
        discount: order.discount,
        tax: order.tax,
        total: order.total,
        currency: order.currency,
        isTest: pay.isTest,
      },
    }));

  if (order.couponId && !order.redemption) {
    await tx.couponRedemption.create({ data: { couponId: order.couponId, userId: order.userId, orderId } });
    await tx.coupon.update({ where: { id: order.couponId }, data: { usedCount: { increment: 1 } } });
  }
  const enrolledCourseIds = await fulfill(tx, order.userId, order.items);
  return { invoice, enrolledCourseIds, order };
}

function notifyPaid(userId: number, orderNumber: string, total: number, isTest: boolean) {
  notify(userId, {
    type: 'PAYMENT_CONFIRMED',
    title: 'Pago confirmado',
    body: `Recibimos tu pago de USD ${total.toFixed(2)} (pedido ${orderNumber})${isTest ? ' — transacción de prueba, sin cargo real' : ''}. Ya tienes acceso a tu contenido.`,
    link: '/campus/pagos',
    email: true,
  }).catch((e) => console.error('[commerce] notify', e));
}

// ───────────────────────── Checkout ─────────────────────────

export interface CheckoutInput {
  items: CartItem[];
  couponCode?: string;
  billing: { name: string; taxId?: string };
  testCard?: 'approve' | 'decline';
}

export async function checkout(req: Request, input: CheckoutInput) {
  const user = req.user!;
  const gateway = getGateway();
  const q = await buildQuote(user.id, input.items, input.couponCode);
  if (q.problems.length) throw badRequest(q.problems[0], q.problems);
  if (!q.payable.length) throw badRequest('Ya tienes acceso a todo lo seleccionado; no hay nada por pagar.');
  if (input.couponCode?.trim() && q.couponError) throw badRequest(q.couponError);
  if (q.total > 0 && !gateway.isConfigured()) throw notConfigured(`La pasarela ${gateway.name} aún no está configurada.`);
  const isTest = gateway.name === 'SANDBOX';

  const order = await withRetry(() =>
    prisma.$transaction(async (tx) => {
      const o = await tx.order.create({
        data: {
          number: await nextOrderNumber(tx),
          userId: user.id,
          status: 'PENDING',
          subtotal: q.subtotal,
          discount: q.discount,
          tax: q.tax,
          total: q.total,
          currency: 'USD',
          couponId: q.couponId,
          provider: gateway.name,
          items: {
            create: q.payable.map((l) => ({
              itemType: l.type,
              courseId: l.type === 'COURSE' ? l.id : null,
              programId: l.type === 'PROGRAM' ? l.id : null,
              bundleId: l.type === 'BUNDLE' ? l.id : null,
              planId: l.type === 'SUBSCRIPTION' ? l.id : null,
              description: l.description.slice(0, 255),
              unitPrice: l.unitPrice,
              quantity: 1,
              total: l.unitPrice,
            })),
          },
        },
      });
      if (q.total > 0) {
        const p = await tx.payment.create({ data: { orderId: o.id, provider: gateway.name, amount: q.total, currency: 'USD', status: 'PENDING', isTest } });
        return { ...o, paymentId: p.id };
      }
      return { ...o, paymentId: undefined as number | undefined };
    }),
  );

  const billing = { name: input.billing.name, taxId: input.billing.taxId };
  const done = async (pay: PaymentData) => {
    const r = await withRetry(() => prisma.$transaction((tx) => finalizePaid(tx, order.id, pay, billing)));
    notifyPaid(user.id, order.number, q.total, pay.isTest);
    return {
      order: { id: order.id, number: order.number, status: 'PAID', total: q.total, isTest: pay.isTest },
      invoice: { id: r.invoice.id, number: r.invoice.number },
      enrolledCourseIds: r.enrolledCourseIds,
    };
  };

  // Total 0 (p. ej. cupón del 100 %): pago directo sin pasarela.
  if (q.total === 0) return { status: 200, body: await done({ provider: 'FREE', method: 'SIN_COSTO', isTest, raw: { note: 'Total cero: no requirió pasarela' } }) };

  let result;
  try {
    result = await gateway.charge({ orderNumber: order.number, amount: q.total, currency: 'USD', testCard: input.testCard });
  } catch (e) {
    await prisma.$transaction([
      prisma.order.update({ where: { id: order.id }, data: { status: 'FAILED' } }),
      prisma.payment.update({ where: { id: order.paymentId! }, data: { status: 'DECLINED' } }),
    ]);
    throw e;
  }

  if (result.status === 'APPROVED') {
    return {
      status: 200,
      body: await done({
        paymentId: order.paymentId,
        provider: gateway.name,
        providerRef: result.providerRef,
        method: result.method,
        isTest: result.isTest,
        raw: result.raw,
      }),
    };
  }
  if (result.status === 'DECLINED') {
    await prisma.$transaction([
      prisma.order.update({ where: { id: order.id }, data: { status: 'FAILED' } }),
      prisma.payment.update({
        where: { id: order.paymentId! },
        data: { status: 'DECLINED', providerRef: result.providerRef, method: result.method, isTest: result.isTest, raw: result.raw as Prisma.InputJsonValue | undefined },
      }),
    ]);
    throw new AppError(402, result.message, 'PAYMENT_DECLINED');
  }
  // PENDING: la pasarela requiere redirección / confirmación posterior (webhook).
  await prisma.payment.update({ where: { id: order.paymentId! }, data: { providerRef: result.providerRef, method: result.method, isTest: result.isTest, raw: result.raw as Prisma.InputJsonValue | undefined } });
  return {
    status: 202,
    body: {
      order: { id: order.id, number: order.number, status: 'PENDING', total: q.total, isTest: result.isTest },
      invoice: null,
      enrolledCourseIds: [] as number[],
      redirectUrl: result.redirectUrl ?? null,
    },
  };
}

// ───────────────────────── Acciones administrativas sobre órdenes ─────────────────────────

export async function markPaid(req: Request, orderId: number, input: { method: string; reference: string; notes?: string }) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { user: { select: { firstName: true, lastName: true } } } });
  if (!order) throw notFound('Pedido no encontrado');
  if (order.status !== 'PENDING' && order.status !== 'FAILED') throw conflict(`Solo se puede marcar como pagado un pedido PENDIENTE o FALLIDO (actual: ${order.status}).`);
  const billing = { name: `${order.user.firstName} ${order.user.lastName}`.trim() };
  const note = `Pago manual (${input.method}) ref. ${input.reference}${input.notes ? ' — ' + input.notes : ''}`.slice(0, 500);
  const r = await withRetry(() =>
    prisma.$transaction(async (tx) => {
      const out = await finalizePaid(
        tx,
        orderId,
        {
          provider: 'MANUAL',
          providerRef: input.reference.slice(0, 120),
          method: input.method,
          isTest: false,
          raw: { method: input.method, reference: input.reference, notes: input.notes ?? null, markedBy: req.user!.id },
        },
        billing,
      );
      await tx.order.update({ where: { id: orderId }, data: { notes: note, provider: 'MANUAL' } });
      // Cualquier intento pendiente anterior queda obsoleto
      await tx.payment.updateMany({ where: { orderId, status: 'PENDING' }, data: { status: 'DECLINED' } });
      return out;
    }),
  );
  await audit(req, 'order.mark_paid', 'Order', orderId, { number: order.number, method: input.method, reference: input.reference, total: Number(order.total) });
  notifyPaid(order.userId, order.number, Number(order.total), false);
  return { order: { id: order.id, number: order.number, status: 'PAID', total: Number(order.total), isTest: false }, invoice: { id: r.invoice.id, number: r.invoice.number }, enrolledCourseIds: r.enrolledCourseIds };
}

export async function cancelOrder(req: Request, orderId: number) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw notFound('Pedido no encontrado');
  if (order.status !== 'PENDING') throw conflict('Solo se pueden cancelar pedidos pendientes.');
  await prisma.$transaction([
    prisma.order.update({ where: { id: orderId }, data: { status: 'CANCELLED' } }),
    prisma.payment.updateMany({ where: { orderId, status: 'PENDING' }, data: { status: 'DECLINED' } }),
  ]);
  await audit(req, 'order.cancel', 'Order', orderId, { number: order.number });
  notify(order.userId, { type: 'ORDER_CANCELLED', title: 'Pedido cancelado', body: `Tu pedido ${order.number} fue cancelado.`, link: '/campus/pagos' }).catch(() => undefined);
  return { id: order.id, number: order.number, status: 'CANCELLED' as const };
}

export async function refundOrder(req: Request, orderId: number, reason?: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: { select: { id: true } }, payments: true } });
  if (!order) throw notFound('Pedido no encontrado');
  if (order.status !== 'PAID') throw conflict('Solo se pueden reembolsar pedidos pagados.');
  const real = order.payments.find((p) => p.status === 'APPROVED' && !p.isTest && p.provider !== 'MANUAL' && p.provider !== 'FREE');
  if (real) throw notConfigured(`El reembolso a través de ${real.provider} aún no está implementado. Procésalo en el portal del proveedor y regístralo manualmente.`);

  const itemIds = order.items.map((i) => i.id);
  const result = await prisma.$transaction(async (tx) => {
    await tx.order.update({ where: { id: orderId }, data: { status: 'REFUNDED' } });
    await tx.payment.updateMany({ where: { orderId, status: 'APPROVED' }, data: { status: 'REFUNDED' } });
    const enr = await tx.enrollment.updateMany({ where: { orderItemId: { in: itemIds }, status: { in: ['ACTIVE', 'PENDING_PAYMENT'] } }, data: { status: 'CANCELLED' } });
    const subs = await tx.subscription.updateMany({
      where: { userId: order.userId, status: 'ACTIVE', createdAt: { gte: order.createdAt }, plan: { orderItems: { some: { orderId } } } },
      data: { status: 'CANCELLED', cancelledAt: new Date(), currentPeriodEnd: new Date() },
    });
    return { enrollmentsCancelled: enr.count, subscriptionsReverted: subs.count };
  });
  await audit(req, 'order.refund', 'Order', orderId, { number: order.number, total: Number(order.total), reason: reason ?? null, ...result });
  notify(order.userId, {
    type: 'ORDER_REFUNDED',
    title: 'Pedido reembolsado',
    body: `Tu pedido ${order.number} fue reembolsado y el acceso asociado fue retirado.`,
    link: '/campus/pagos',
    email: true,
  }).catch(() => undefined);
  return { id: order.id, number: order.number, status: 'REFUNDED' as const, ...result };
}

// ───────────────────────── Suscripciones ─────────────────────────

/** Cierra periodos vencidos: ACTIVE con cancelledAt → CANCELLED; ACTIVE sin cancelar → EXPIRED. */
export async function sweepSubscriptions() {
  const now = new Date();
  await prisma.subscription.updateMany({ where: { status: 'ACTIVE', currentPeriodEnd: { lt: now }, cancelledAt: { not: null } }, data: { status: 'CANCELLED' } });
  await prisma.subscription.updateMany({ where: { status: 'ACTIVE', currentPeriodEnd: { lt: now }, cancelledAt: null }, data: { status: 'EXPIRED' } });
}

export async function cancelSubscription(req: Request, id: number, opts: { admin: boolean; immediate?: boolean }) {
  const sub = await prisma.subscription.findUnique({ where: { id } });
  if (!sub || (!opts.admin && sub.userId !== req.user!.id)) throw notFound('Suscripción no encontrada');
  if (sub.status !== 'ACTIVE') throw conflict('Solo se pueden cancelar suscripciones activas.');
  if (sub.cancelledAt) throw conflict('La suscripción ya está cancelada; seguirá activa hasta el fin del periodo.');
  const now = new Date();
  const immediate = opts.admin && opts.immediate;
  const updated = await prisma.subscription.update({
    where: { id },
    data: immediate ? { status: 'CANCELLED', cancelledAt: now, currentPeriodEnd: now } : { cancelledAt: now },
    include: { plan: { select: { id: true, name: true, interval: true } } },
  });
  await audit(req, opts.admin ? 'subscription.cancel_admin' : 'subscription.cancel', 'Subscription', id, { userId: sub.userId, immediate: !!immediate });
  if (opts.admin) {
    notify(sub.userId, { type: 'SUBSCRIPTION_CANCELLED', title: 'Suscripción cancelada', body: 'Un administrador canceló tu suscripción.', link: '/campus/pagos' }).catch(() => undefined);
  }
  return updated;
}

export function slugify(s: string) {
  return (
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 180) || 'paquete'
  );
}
