import { Router } from 'express';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { body, query, idParam, zId, zMoney, zText } from '../../lib/validate.js';
import { getPage, paged, orderBy } from '../../lib/pagination.js';
import { audit } from '../../lib/audit.js';
import { conflict, forbidden, notFound } from '../../lib/errors.js';
import { can, requireAuth, requirePermission } from '../../middleware/auth.js';
import { integrationStatus } from '../../integrations/payments/gateway.js';
import {
  buildQuote,
  cancelOrder,
  cancelSubscription,
  checkout,
  dateRange,
  markPaid,
  plain,
  quoteResponse,
  refundOrder,
  slugify,
  sweepSubscriptions,
} from './commerce.service.js';
import { loadInvoice, streamInvoicePdf } from './invoice-pdf.js';

const router = Router();
const admin = requirePermission('payments.manage');

const userSel = { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } as const;

const itemsSchema = z
  .array(z.object({ type: z.enum(['COURSE', 'PROGRAM', 'BUNDLE', 'SUBSCRIPTION']), id: zId }))
  .min(1, 'Agrega al menos un artículo')
  .max(30);
const quoteSchema = z.object({ items: itemsSchema, couponCode: z.string().trim().max(40).optional() });
const checkoutSchema = z.object({
  items: itemsSchema,
  couponCode: z.string().trim().max(40).optional(),
  billing: z.object({ name: z.string().trim().min(2, 'Indica el nombre de facturación').max(200), taxId: z.string().trim().max(30).optional() }),
  testCard: z.enum(['approve', 'decline']).optional(),
});
const rangeQuery = z.object({ from: z.string().optional(), to: z.string().optional() });

// ───────────────────────── Catálogo (público) ─────────────────────────

router.get('/catalog/plans', async (_req, res) => {
  const plans = await prisma.subscriptionPlan.findMany({ where: { isActive: true }, orderBy: { price: 'asc' } });
  res.json({ data: plain(plans) });
});

router.get('/catalog/bundles', async (_req, res) => {
  const bundles = await prisma.bundle.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
    include: { courses: { include: { course: { select: { id: true, title: true, slug: true, imageUrl: true, price: true, durationHours: true } } } } },
  });
  const data = bundles.map((b) => {
    const courses = b.courses.map((c) => c.course);
    const regularTotal = courses.reduce((s, c) => s + Number(c.price), 0);
    return plain({ id: b.id, title: b.title, slug: b.slug, description: b.description, price: b.price, regularTotal, courses });
  });
  res.json({ data });
});

// ───────────────────────── Estudiante ─────────────────────────

router.post('/checkout/quote', requireAuth, async (req, res) => {
  const { items, couponCode } = body(req, quoteSchema);
  res.json(quoteResponse(await buildQuote(req.user!.id, items, couponCode)));
});

router.post('/checkout', requireAuth, async (req, res) => {
  const input = body(req, checkoutSchema);
  const r = await checkout(req, input);
  res.status(r.status).json(r.body);
});

const orderInclude = {
  items: true,
  payments: { select: { id: true, provider: true, providerRef: true, amount: true, currency: true, status: true, isTest: true, method: true, createdAt: true }, orderBy: { id: 'asc' as const } },
  invoice: { select: { id: true, number: true, isTest: true, ncf: true, issuedAt: true, total: true } },
};

router.get('/orders/me', requireAuth, async (req, res) => {
  const orders = await prisma.order.findMany({ where: { userId: req.user!.id }, orderBy: { createdAt: 'desc' }, include: { ...orderInclude, coupon: { select: { code: true } } } });
  res.json({ data: plain(orders.map((o) => ({ ...o, isTest: o.payments.length ? o.payments.some((p) => p.isTest) : o.provider === 'SANDBOX' }))) });
});

router.get('/orders/:id', requireAuth, async (req, res) => {
  const id = idParam(req);
  const o = await prisma.order.findUnique({ where: { id }, include: { ...orderInclude, coupon: { select: { code: true } }, user: { select: userSel } } });
  if (!o) throw notFound('Pedido no encontrado');
  if (o.userId !== req.user!.id && !can(req, 'payments.manage')) throw forbidden();
  res.json({ data: plain({ ...o, isTest: o.payments.length ? o.payments.some((p) => p.isTest) : o.provider === 'SANDBOX' }) });
});

router.get('/invoices/:id/pdf', requireAuth, async (req, res) => {
  const inv = await loadInvoice(idParam(req));
  if (inv.userId !== req.user!.id && !can(req, 'payments.manage')) throw forbidden();
  await streamInvoicePdf(res, inv);
});

router.get('/subscriptions/me', requireAuth, async (req, res) => {
  await sweepSubscriptions();
  const subs = await prisma.subscription.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: 'desc' },
    include: { plan: { select: { id: true, name: true, description: true, price: true, interval: true, includesAll: true } } },
  });
  res.json({ data: plain(subs) });
});

router.post('/subscriptions/:id/cancel', requireAuth, async (req, res) => {
  const s = await cancelSubscription(req, idParam(req), { admin: false });
  res.json({ data: plain(s) });
});

// ───────────────────────── Administración: estado, pedidos, pagos ─────────────────────────

router.get('/status', admin, (_req, res) => {
  res.json(integrationStatus());
});

router.get('/orders', admin, async (req, res) => {
  const p = getPage(req);
  const q = query(req, z.object({ status: z.enum(['PENDING', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED']).optional(), from: z.string().optional(), to: z.string().optional() }).passthrough());
  const where: Prisma.OrderWhereInput = {};
  if (q.status) where.status = q.status;
  const range = dateRange(q);
  if (range) where.createdAt = range;
  if (p.search) where.OR = [{ number: { contains: p.search } }, { user: { email: { contains: p.search } } }, { user: { firstName: { contains: p.search } } }, { user: { lastName: { contains: p.search } } }];
  const [total, rows] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: orderBy(p, ['createdAt', 'total', 'number', 'status']),
      skip: p.skip,
      take: p.take,
      include: {
        user: { select: userSel },
        items: { select: { id: true, itemType: true, description: true, unitPrice: true, quantity: true, total: true } },
        payments: { select: { id: true, provider: true, status: true, isTest: true, method: true, amount: true } },
        invoice: { select: { id: true, number: true, isTest: true } },
      },
    }),
  ]);
  const data = rows.map((o) => ({ ...o, isTest: o.payments.length ? o.payments.some((x) => x.isTest) : o.provider === 'SANDBOX' }));
  res.json(paged(plain(data), total, p));
});

const markPaidSchema = z.object({
  method: z.enum(['TRANSFERENCIA', 'EFECTIVO', 'OTRO']),
  reference: z.string().trim().min(1, 'Indica la referencia del pago').max(120),
  notes: zText(300).optional(),
});

router.post('/orders/:id/mark-paid', admin, async (req, res) => {
  res.json(await markPaid(req, idParam(req), body(req, markPaidSchema)));
});

router.post('/orders/:id/cancel', admin, async (req, res) => {
  res.json(plain(await cancelOrder(req, idParam(req))));
});

router.post('/orders/:id/refund', admin, async (req, res) => {
  const { reason } = body(req, z.object({ reason: zText(300).optional() }));
  res.json(plain(await refundOrder(req, idParam(req), reason)));
});

router.get('/payments/pending', admin, async (req, res) => {
  const p = getPage(req);
  const where: Prisma.OrderWhereInput = { status: 'PENDING' };
  const [total, rows] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      skip: p.skip,
      take: p.take,
      include: { user: { select: userSel }, items: { select: { id: true, itemType: true, description: true, total: true } }, payments: { select: { id: true, provider: true, status: true, isTest: true } } },
    }),
  ]);
  res.json(paged(plain(rows), total, p));
});

router.get('/payments', admin, async (req, res) => {
  const p = getPage(req);
  const q = query(req, z.object({ status: z.enum(['PENDING', 'APPROVED', 'DECLINED', 'REFUNDED']).optional(), from: z.string().optional(), to: z.string().optional() }).passthrough());
  const where: Prisma.PaymentWhereInput = {};
  if (q.status) where.status = q.status;
  const range = dateRange(q);
  if (range) where.createdAt = range;
  const [total, rows] = await Promise.all([
    prisma.payment.count({ where }),
    prisma.payment.findMany({
      where,
      orderBy: orderBy(p, ['createdAt', 'amount', 'status']),
      skip: p.skip,
      take: p.take,
      select: {
        id: true,
        provider: true,
        providerRef: true,
        amount: true,
        currency: true,
        status: true,
        isTest: true,
        method: true,
        createdAt: true,
        order: { select: { id: true, number: true, status: true, user: { select: userSel } } },
      },
    }),
  ]);
  res.json(paged(plain(rows), total, p));
});

router.get('/invoices', admin, async (req, res) => {
  const p = getPage(req);
  const where: Prisma.InvoiceWhereInput = p.search ? { OR: [{ number: { contains: p.search } }, { billingName: { contains: p.search } }, { user: { email: { contains: p.search } } }] } : {};
  const [total, rows] = await Promise.all([
    prisma.invoice.count({ where }),
    prisma.invoice.findMany({
      where,
      orderBy: orderBy(p, ['issuedAt', 'total', 'number'], 'issuedAt'),
      skip: p.skip,
      take: p.take,
      include: { user: { select: userSel }, order: { select: { id: true, number: true } } },
    }),
  ]);
  res.json(paged(plain(rows), total, p));
});

router.get('/transactions', admin, async (req, res) => {
  const q = query(req, rangeQuery.passthrough());
  const range = dateRange(q);
  const rows = await prisma.payment.findMany({
    where: range ? { createdAt: range } : {},
    orderBy: { createdAt: 'desc' },
    take: 10000,
    select: {
      id: true,
      createdAt: true,
      method: true,
      provider: true,
      amount: true,
      currency: true,
      status: true,
      isTest: true,
      order: { select: { number: true, user: { select: { firstName: true, lastName: true, email: true } } } },
    },
  });
  const data = rows.map((r) => ({
    id: r.id,
    date: r.createdAt,
    orderNumber: r.order.number,
    customer: `${r.order.user.firstName} ${r.order.user.lastName}`.trim(),
    customerEmail: r.order.user.email,
    method: r.method,
    provider: r.provider,
    amount: Number(r.amount),
    currency: r.currency,
    status: r.status,
    isTest: r.isTest,
  }));
  res.json({ data });
});

// ───────────────────────── Administración: cupones ─────────────────────────

const couponBase = z.object({
  code: z.string().trim().min(3).max(40).regex(/^[A-Za-z0-9_-]+$/, 'El código solo admite letras, números, guion y guion bajo').transform((s) => s.toUpperCase()),
  description: zText(255).nullable().optional(),
  type: z.enum(['PERCENT', 'FIXED']),
  value: zMoney,
  maxUses: z.coerce.number().int().positive().nullable().optional(),
  perUserLimit: z.coerce.number().int().positive().default(1),
  minAmount: zMoney.nullable().optional(),
  courseId: z.coerce.number().int().positive().nullable().optional(),
  validFrom: z.coerce.date().nullable().optional(),
  validUntil: z.coerce.date().nullable().optional(),
  isActive: z.boolean().default(true),
});
const couponCheck = (d: { type?: string; value?: number; validFrom?: Date | null; validUntil?: Date | null }, ctx: z.RefinementCtx) => {
  if (d.type === 'PERCENT' && d.value != null && d.value > 100) ctx.addIssue({ code: 'custom', path: ['value'], message: 'El porcentaje debe estar entre 0 y 100' });
  if (d.validFrom && d.validUntil && d.validFrom > d.validUntil) ctx.addIssue({ code: 'custom', path: ['validUntil'], message: 'La vigencia final debe ser posterior a la inicial' });
};
const couponCreate = couponBase.superRefine(couponCheck);
const couponPatch = couponBase.partial().superRefine(couponCheck);

const couponSelect = { course: { select: { id: true, title: true } } } as const;

router.get('/coupons', admin, async (req, res) => {
  const p = getPage(req);
  const where: Prisma.CouponWhereInput = p.search ? { OR: [{ code: { contains: p.search } }, { description: { contains: p.search } }] } : {};
  const [total, rows] = await Promise.all([
    prisma.coupon.count({ where }),
    prisma.coupon.findMany({ where, orderBy: orderBy(p, ['createdAt', 'code', 'usedCount']), skip: p.skip, take: p.take, include: couponSelect }),
  ]);
  res.json(paged(plain(rows), total, p));
});

router.post('/coupons', admin, async (req, res) => {
  const d = body(req, couponCreate);
  if (await prisma.coupon.findUnique({ where: { code: d.code } })) throw conflict('Ya existe un cupón con ese código');
  if (d.courseId && !(await prisma.course.findUnique({ where: { id: d.courseId } }))) throw notFound('El curso indicado no existe');
  const c = await prisma.coupon.create({ data: d, include: couponSelect });
  await audit(req, 'coupon.create', 'Coupon', c.id, { code: c.code, type: c.type, value: Number(c.value) });
  res.status(201).json({ data: plain(c) });
});

router.patch('/coupons/:id', admin, async (req, res) => {
  const id = idParam(req);
  const d = body(req, couponPatch);
  const cur = await prisma.coupon.findUnique({ where: { id } });
  if (!cur) throw notFound('Cupón no encontrado');
  if (d.code && d.code !== cur.code && (await prisma.coupon.findUnique({ where: { code: d.code } }))) throw conflict('Ya existe un cupón con ese código');
  const type = d.type ?? cur.type;
  const value = d.value ?? Number(cur.value);
  if (type === 'PERCENT' && value > 100) throw conflict('El porcentaje debe estar entre 0 y 100');
  const c = await prisma.coupon.update({ where: { id }, data: d, include: couponSelect });
  await audit(req, 'coupon.update', 'Coupon', id, { changes: d });
  res.json({ data: plain(c) });
});

router.delete('/coupons/:id', admin, async (req, res) => {
  const id = idParam(req);
  const cur = await prisma.coupon.findUnique({ where: { id }, include: { _count: { select: { redemptions: true, orders: true } } } });
  if (!cur) throw notFound('Cupón no encontrado');
  if (cur._count.redemptions > 0 || cur._count.orders > 0) {
    await prisma.coupon.update({ where: { id }, data: { isActive: false } });
    await audit(req, 'coupon.deactivate', 'Coupon', id, { code: cur.code, reason: 'tiene canjes/pedidos' });
    throw conflict('El cupón tiene canjes o pedidos asociados: no se puede eliminar, se desactivó en su lugar.');
  }
  await prisma.coupon.delete({ where: { id } });
  await audit(req, 'coupon.delete', 'Coupon', id, { code: cur.code });
  res.json({ ok: true });
});

// ───────────────────────── Administración: paquetes ─────────────────────────

const bundleBase = z.object({
  title: z.string().trim().min(3, 'El título es muy corto').max(200),
  description: zText(5000).nullable().optional(),
  price: zMoney,
  isActive: z.boolean().default(true),
  courseIds: z.array(zId).max(100),
});
const bundleInclude = { courses: { include: { course: { select: { id: true, title: true, slug: true, price: true } } } } } as const;
const shapeBundle = (b: Prisma.BundleGetPayload<{ include: typeof bundleInclude }>) => plain({ ...b, courses: b.courses.map((c) => c.course) });

async function uniqueBundleSlug(title: string, exceptId?: number) {
  const base = slugify(title);
  for (let i = 1; ; i++) {
    const slug = i === 1 ? base : `${base}-${i}`;
    const hit = await prisma.bundle.findUnique({ where: { slug } });
    if (!hit || hit.id === exceptId) return slug;
  }
}

async function assertCoursesExist(ids: number[]) {
  const unique = [...new Set(ids)];
  if (!unique.length) return unique;
  const n = await prisma.course.count({ where: { id: { in: unique }, deletedAt: null } });
  if (n !== unique.length) throw notFound('Alguno de los cursos indicados no existe');
  return unique;
}

router.get('/bundles', admin, async (req, res) => {
  const p = getPage(req);
  const where: Prisma.BundleWhereInput = p.search ? { title: { contains: p.search } } : {};
  const [total, rows] = await Promise.all([
    prisma.bundle.count({ where }),
    prisma.bundle.findMany({ where, orderBy: orderBy(p, ['createdAt', 'title', 'price']), skip: p.skip, take: p.take, include: bundleInclude }),
  ]);
  res.json(paged(rows.map(shapeBundle), total, p));
});

router.post('/bundles', admin, async (req, res) => {
  const d = body(req, bundleBase);
  const ids = await assertCoursesExist(d.courseIds);
  const b = await prisma.bundle.create({
    data: { title: d.title, description: d.description ?? null, price: d.price, isActive: d.isActive, slug: await uniqueBundleSlug(d.title), courses: { create: ids.map((courseId) => ({ courseId })) } },
    include: bundleInclude,
  });
  await audit(req, 'bundle.create', 'Bundle', b.id, { title: b.title, price: Number(b.price), courseIds: ids });
  res.status(201).json({ data: shapeBundle(b) });
});

router.patch('/bundles/:id', admin, async (req, res) => {
  const id = idParam(req);
  const d = body(req, bundleBase.partial());
  const cur = await prisma.bundle.findUnique({ where: { id } });
  if (!cur) throw notFound('Paquete no encontrado');
  const ids = d.courseIds ? await assertCoursesExist(d.courseIds) : undefined;
  const b = await prisma.$transaction(async (tx) => {
    if (ids) {
      await tx.bundleCourse.deleteMany({ where: { bundleId: id } });
      await tx.bundleCourse.createMany({ data: ids.map((courseId) => ({ bundleId: id, courseId })) });
    }
    return tx.bundle.update({
      where: { id },
      data: {
        title: d.title,
        description: d.description,
        price: d.price,
        isActive: d.isActive,
        slug: d.title && d.title !== cur.title ? await uniqueBundleSlug(d.title, id) : undefined,
      },
      include: bundleInclude,
    });
  });
  await audit(req, 'bundle.update', 'Bundle', id, { changes: d });
  res.json({ data: shapeBundle(b) });
});

router.delete('/bundles/:id', admin, async (req, res) => {
  const id = idParam(req);
  const cur = await prisma.bundle.findUnique({ where: { id }, include: { _count: { select: { orderItems: true } } } });
  if (!cur) throw notFound('Paquete no encontrado');
  if (cur._count.orderItems > 0) {
    await prisma.bundle.update({ where: { id }, data: { isActive: false } });
    await audit(req, 'bundle.deactivate', 'Bundle', id, { title: cur.title, reason: 'tiene pedidos' });
    throw conflict('El paquete tiene pedidos asociados: no se puede eliminar, se desactivó en su lugar.');
  }
  await prisma.bundle.delete({ where: { id } });
  await audit(req, 'bundle.delete', 'Bundle', id, { title: cur.title });
  res.json({ ok: true });
});

// ───────────────────────── Administración: planes ─────────────────────────

const planBase = z.object({
  name: z.string().trim().min(2).max(120),
  description: zText(5000).nullable().optional(),
  price: zMoney,
  interval: z.enum(['MONTH', 'YEAR']).default('MONTH'),
  includesAll: z.boolean().default(true),
  isActive: z.boolean().default(true),
});

router.get('/plans', admin, async (req, res) => {
  const p = getPage(req);
  const where: Prisma.SubscriptionPlanWhereInput = p.search ? { name: { contains: p.search } } : {};
  const [total, rows] = await Promise.all([
    prisma.subscriptionPlan.count({ where }),
    prisma.subscriptionPlan.findMany({ where, orderBy: orderBy(p, ['id', 'name', 'price'], 'id'), skip: p.skip, take: p.take, include: { _count: { select: { subscriptions: true } } } }),
  ]);
  res.json(paged(plain(rows.map(({ _count, ...r }) => ({ ...r, subscriptionsCount: _count.subscriptions }))), total, p));
});

router.post('/plans', admin, async (req, res) => {
  const d = body(req, planBase);
  const pl = await prisma.subscriptionPlan.create({ data: { ...d, description: d.description ?? null } });
  await audit(req, 'plan.create', 'SubscriptionPlan', pl.id, { name: pl.name, price: Number(pl.price), interval: pl.interval });
  res.status(201).json({ data: plain(pl) });
});

router.patch('/plans/:id', admin, async (req, res) => {
  const id = idParam(req);
  const d = body(req, planBase.partial());
  if (!(await prisma.subscriptionPlan.findUnique({ where: { id } }))) throw notFound('Plan no encontrado');
  const pl = await prisma.subscriptionPlan.update({ where: { id }, data: d });
  await audit(req, 'plan.update', 'SubscriptionPlan', id, { changes: d });
  res.json({ data: plain(pl) });
});

router.delete('/plans/:id', admin, async (req, res) => {
  const id = idParam(req);
  const cur = await prisma.subscriptionPlan.findUnique({ where: { id }, include: { _count: { select: { subscriptions: true } } } });
  if (!cur) throw notFound('Plan no encontrado');
  if (cur._count.subscriptions > 0) throw conflict('El plan tiene suscripciones asociadas: no se puede eliminar. Desactívalo para que deje de venderse.');
  await prisma.subscriptionPlan.delete({ where: { id } });
  await audit(req, 'plan.delete', 'SubscriptionPlan', id, { name: cur.name });
  res.json({ ok: true });
});

// ───────────────────────── Administración: suscripciones ─────────────────────────

router.get('/subscriptions', admin, async (req, res) => {
  await sweepSubscriptions();
  const p = getPage(req);
  const q = query(req, z.object({ status: z.enum(['PENDING', 'ACTIVE', 'CANCELLED', 'EXPIRED']).optional() }).passthrough());
  const where: Prisma.SubscriptionWhereInput = {};
  if (q.status) where.status = q.status;
  if (p.search) where.user = { OR: [{ email: { contains: p.search } }, { firstName: { contains: p.search } }, { lastName: { contains: p.search } }] };
  const [total, rows] = await Promise.all([
    prisma.subscription.count({ where }),
    prisma.subscription.findMany({
      where,
      orderBy: orderBy(p, ['createdAt', 'currentPeriodEnd', 'status']),
      skip: p.skip,
      take: p.take,
      include: { user: { select: userSel }, plan: { select: { id: true, name: true, price: true, interval: true } } },
    }),
  ]);
  res.json(paged(plain(rows), total, p));
});

router.post('/subscriptions/:id/cancel', admin, async (req, res) => {
  const { immediate } = body(req, z.object({ immediate: z.boolean().optional() }).default({}));
  res.json({ data: plain(await cancelSubscription(req, idParam(req), { admin: true, immediate })) });
});

// ───────────────────────── Webhook AZUL (pendiente) ─────────────────────────

/*
 * PENDIENTE — Retorno de AZUL. Pasos al implementarlo:
 *  1. Leer los campos del retorno (OrderNumber, Amount, AuthorizationCode, IsoCode, ResponseMessage, AuthHash, etc.).
 *  2. Validar AuthHash: recalcular el hash HMAC-SHA512 con AZUL_AUTH2 sobre los campos documentados y compararlo
 *     con timingSafeEqual; rechazar con 400 si no coincide.
 *  3. Idempotencia por OrderNumber: buscar la Order por `number`; si ya está PAID/FAILED, responder 200 sin repetir efectos.
 *  4. Actualizar el Payment PENDING de la orden (status APPROVED/DECLINED, providerRef = AzulOrderId, raw) y, si se aprobó,
 *     completar la orden con la misma lógica de cumplimiento del checkout (factura, inscripciones, cupón, notificación).
 *  5. Verificar que el monto devuelto coincida con order.total antes de aprobar.
 *  Esta ruta es pública por diseño (la llama AZUL), por eso su seguridad depende de la validación del AuthHash.
 */
router.post('/webhook/azul', (_req, res) => {
  res.status(501).json({ error: { code: 'NOT_CONFIGURED', message: 'Retorno de AZUL pendiente de configurar' } });
});

export default router;
