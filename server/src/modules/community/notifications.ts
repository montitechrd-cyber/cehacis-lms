import { Router } from 'express';
import { prisma } from '../../lib/prisma.js';
import { notFound } from '../../lib/errors.js';
import { idParam } from '../../lib/validate.js';
import { getPage, paged } from '../../lib/pagination.js';

const router = Router();

router.get('/notifications', async (req, res) => {
  const p = getPage(req);
  const unreadOnly = req.query.unread === '1' || req.query.unread === 'true';
  const where = { userId: req.user!.id, ...(unreadOnly ? { readAt: null } : {}) };
  const [rows, total] = await Promise.all([
    prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, skip: p.skip, take: p.take }),
    prisma.notification.count({ where }),
  ]);
  res.json(paged(rows, total, p));
});

router.get('/notifications/unread-count', async (req, res) => {
  res.json({ count: await prisma.notification.count({ where: { userId: req.user!.id, readAt: null } }) });
});

router.post('/notifications/read-all', async (req, res) => {
  const r = await prisma.notification.updateMany({ where: { userId: req.user!.id, readAt: null }, data: { readAt: new Date() } });
  res.json({ ok: true, updated: r.count });
});

router.post('/notifications/:id/read', async (req, res) => {
  const id = idParam(req);
  const n = await prisma.notification.findFirst({ where: { id, userId: req.user!.id } });
  if (!n) throw notFound('Notificación no encontrada');
  if (!n.readAt) await prisma.notification.update({ where: { id }, data: { readAt: new Date() } });
  res.json({ ok: true });
});

export default router;
