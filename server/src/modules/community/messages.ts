import { Router, type Request } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { badRequest, forbidden, notFound } from '../../lib/errors.js';
import { body, query, idParam, zText } from '../../lib/validate.js';
import { notify } from '../../lib/notify.js';
import { isAdmin, taughtCourseIds } from '../../middleware/auth.js';
import { zContent, userSel, shapeUser, ACTIVE_ENROLLMENT, ADMIN_ROLES, fullName, snippet } from './common.js';

const router = Router();

/** Filtro Prisma con los usuarios a los que el solicitante puede escribir. */
async function contactWhere(req: Request): Promise<Prisma.UserWhereInput> {
  const me = req.user!;
  const base: Prisma.UserWhereInput = { id: { not: me.id }, status: 'ACTIVE', deletedAt: null };
  if (isAdmin(req)) return base;
  const [taught, enr] = await Promise.all([
    taughtCourseIds(me.id),
    prisma.enrollment.findMany({ where: { userId: me.id, status: { in: [...ACTIVE_ENROLLMENT] } }, select: { courseId: true } }),
  ]);
  const courseIds = [...new Set([...taught, ...enr.map((e) => e.courseId)])];
  const or: Prisma.UserWhereInput[] = [{ role: { key: { in: ADMIN_ROLES } } }];
  if (courseIds.length) {
    or.push(
      { courseInstructors: { some: { courseId: { in: courseIds } } } },
      { enrollments: { some: { courseId: { in: courseIds }, status: { in: [...ACTIVE_ENROLLMENT] } } } },
    );
  }
  return { ...base, OR: or };
}

// ───────────────────────── Contactos ─────────────────────────

router.get('/contacts', async (req, res) => {
  const q = query(req, z.object({ q: zText(100).optional() }));
  const and: Prisma.UserWhereInput[] = [await contactWhere(req)];
  for (const w of (q.q ?? '').split(/\s+/).filter(Boolean).slice(0, 4)) {
    and.push({ OR: [{ firstName: { contains: w } }, { lastName: { contains: w } }] });
  }
  const users = await prisma.user.findMany({ where: { AND: and }, select: userSel, orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }], take: 100 });
  res.json({ data: users.map(shapeUser) });
});

// ───────────────────────── Conversaciones ─────────────────────────

async function assertParticipant(conversationId: number, userId: number) {
  const part = await prisma.conversationParticipant.findUnique({ where: { conversationId_userId: { conversationId, userId } } });
  if (!part) throw notFound('Conversación no encontrada');
  return part;
}

router.get('/conversations', async (req, res) => {
  const me = req.user!.id;
  const mine = await prisma.conversationParticipant.findMany({
    where: { userId: me },
    include: {
      conversation: {
        include: {
          participants: { include: { user: { select: userSel } } },
          messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      },
    },
    orderBy: { conversation: { updatedAt: 'desc' } },
    take: 200,
  });
  const unread = await Promise.all(
    mine.map((m) =>
      prisma.message.count({
        where: { conversationId: m.conversationId, senderId: { not: me }, ...(m.lastReadAt ? { createdAt: { gt: m.lastReadAt } } : {}) },
      }),
    ),
  );
  res.json({
    data: mine.map((m, i) => {
      const c = m.conversation;
      const last = c.messages[0];
      return {
        id: c.id,
        subject: c.subject,
        updatedAt: c.updatedAt,
        participants: c.participants.map((p) => shapeUser(p.user)),
        lastMessage: last ? { id: last.id, body: last.body, senderId: last.senderId, createdAt: last.createdAt } : null,
        unreadCount: unread[i] ?? 0,
      };
    }),
  });
});

router.post('/conversations', async (req, res) => {
  const me = req.user!;
  const d = body(
    req,
    z.object({
      recipientIds: z.array(z.coerce.number().int().positive()).min(1, 'Elige al menos un destinatario').max(20, 'Máximo 20 destinatarios'),
      subject: zText(200).optional(),
      body: zContent,
    }),
  );
  const recipients = [...new Set(d.recipientIds)].filter((id) => id !== me.id);
  if (!recipients.length) throw badRequest('Elige al menos un destinatario distinto de ti');
  const allowed = await prisma.user.count({ where: { AND: [await contactWhere(req), { id: { in: recipients } }] } });
  if (allowed !== recipients.length) throw forbidden('No puedes escribirle a uno o más de los destinatarios elegidos');

  let conversationId: number | null = null;
  let reused = false;
  if (recipients.length === 1) {
    const candidates = await prisma.conversation.findMany({
      where: { AND: [{ participants: { some: { userId: me.id } } }, { participants: { some: { userId: recipients[0] } } }] },
      select: { id: true, _count: { select: { participants: true } } },
    });
    const existing = candidates.find((c) => c._count.participants === 2);
    if (existing) {
      conversationId = existing.id;
      reused = true;
    }
  }

  const now = new Date();
  const message = await prisma.$transaction(async (tx) => {
    if (conversationId == null) {
      const conv = await tx.conversation.create({
        data: {
          subject: d.subject || null,
          participants: { create: [{ userId: me.id, lastReadAt: now }, ...recipients.map((userId) => ({ userId }))] },
        },
      });
      conversationId = conv.id;
    }
    const msg = await tx.message.create({ data: { conversationId, senderId: me.id, body: d.body } });
    await tx.conversation.update({ where: { id: conversationId }, data: { updatedAt: msg.createdAt } });
    await tx.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId: me.id } },
      data: { lastReadAt: msg.createdAt },
    });
    return msg;
  });
  await notify(recipients, {
    type: 'MESSAGE',
    title: `Nuevo mensaje de ${fullName(me)}`,
    body: snippet(d.body, 200),
    link: `/campus/mensajes/${conversationId}`,
  });
  res.status(201).json({
    data: {
      id: conversationId,
      reused,
      message: { id: message.id, body: message.body, senderId: message.senderId, createdAt: message.createdAt },
    },
  });
});

router.get('/conversations/:id/messages', async (req, res) => {
  const id = idParam(req);
  const me = req.user!.id;
  await assertParticipant(id, me);
  const q = query(req, z.object({ before: z.coerce.number().int().positive().optional() }));
  const rows = await prisma.message.findMany({
    where: { conversationId: id, ...(q.before ? { id: { lt: q.before } } : {}) },
    orderBy: { id: 'desc' },
    take: 51,
    include: { sender: { select: userSel } },
  });
  const hasMore = rows.length > 50;
  const page = rows.slice(0, 50).reverse();
  const [conv] = await Promise.all([
    prisma.conversation.findUniqueOrThrow({
      where: { id },
      include: { participants: { include: { user: { select: userSel } } } },
    }),
    prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId: id, userId: me } },
      data: { lastReadAt: new Date() },
    }),
  ]);
  res.json({
    data: page.map((m) => ({ id: m.id, body: m.body, senderId: m.senderId, sender: shapeUser(m.sender), createdAt: m.createdAt })),
    meta: { hasMore, nextBefore: hasMore ? page[0]?.id ?? null : null },
    conversation: { id: conv.id, subject: conv.subject, participants: conv.participants.map((p) => shapeUser(p.user)) },
  });
});

router.post('/conversations/:id/messages', async (req, res) => {
  const id = idParam(req);
  const me = req.user!;
  await assertParticipant(id, me.id);
  const d = body(req, z.object({ body: zContent }));
  const msg = await prisma.$transaction(async (tx) => {
    const m = await tx.message.create({ data: { conversationId: id, senderId: me.id, body: d.body }, include: { sender: { select: userSel } } });
    await tx.conversation.update({ where: { id }, data: { updatedAt: m.createdAt } });
    await tx.conversationParticipant.update({ where: { conversationId_userId: { conversationId: id, userId: me.id } }, data: { lastReadAt: m.createdAt } });
    return m;
  });
  const others = await prisma.conversationParticipant.findMany({ where: { conversationId: id, userId: { not: me.id } }, select: { userId: true } });
  await notify(
    others.map((o) => o.userId),
    { type: 'MESSAGE', title: `Nuevo mensaje de ${fullName(me)}`, body: snippet(d.body, 200), link: `/campus/mensajes/${id}` },
  );
  res.status(201).json({ data: { id: msg.id, body: msg.body, senderId: msg.senderId, sender: shapeUser(msg.sender), createdAt: msg.createdAt } });
});

router.get('/messages/unread-count', async (req, res) => {
  const me = req.user!.id;
  const rows = await prisma.$queryRaw<{ c: bigint }[]>`
    SELECT COUNT(*) AS c
    FROM messages m
    JOIN conversation_participants cp ON cp.conversationId = m.conversationId AND cp.userId = ${me}
    WHERE m.senderId <> ${me} AND (cp.lastReadAt IS NULL OR m.createdAt > cp.lastReadAt)`;
  res.json({ count: Number(rows[0]?.c ?? 0) });
});

export default router;
