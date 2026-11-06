import { prisma } from '../lib/prisma.js';
import { notify } from '../lib/notify.js';

/**
 * Tareas periódicas en proceso (sin dependencias externas):
 *  - Recordatorios de eventos según reminderMinutes.
 *  - Expiración de suscripciones vencidas.
 * En despliegues con varias instancias, mover a un worker único o a un cron del sistema.
 */
async function sendEventReminders() {
  const now = new Date();
  const horizon = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const events = await prisma.event.findMany({
    where: { reminderSentAt: null, reminderMinutes: { not: null }, startAt: { gt: now, lte: horizon } },
    include: { participants: true, course: { select: { id: true, slug: true } } },
  });
  for (const ev of events) {
    const due = new Date(ev.startAt.getTime() - (ev.reminderMinutes ?? 60) * 60000);
    if (due > now) continue;
    let userIds = ev.participants.map((p) => p.userId);
    if (ev.courseId) {
      const enr = await prisma.enrollment.findMany({
        where: { courseId: ev.courseId, status: 'ACTIVE', ...(ev.groupId ? { groupId: ev.groupId } : {}) },
        select: { userId: true },
      });
      userIds = userIds.concat(enr.map((e) => e.userId));
    }
    if (ev.instructorId) userIds.push(ev.instructorId);
    const when = ev.startAt.toLocaleString('es-DO', { dateStyle: 'medium', timeStyle: 'short' });
    await notify(userIds, { type: 'EVENT_REMINDER', title: `Recordatorio: ${ev.title}`, body: `Comienza ${when}.`, link: '/campus/calendario', email: true });
    await prisma.event.update({ where: { id: ev.id }, data: { reminderSentAt: now } });
  }
}

async function expireSubscriptions() {
  await prisma.subscription.updateMany({ where: { status: 'ACTIVE', currentPeriodEnd: { lt: new Date() } }, data: { status: 'EXPIRED' } });
}

export function startScheduler() {
  if (process.env.NODE_ENV === 'test') return;
  const tick = async () => {
    try {
      await sendEventReminders();
      await expireSubscriptions();
    } catch (e) {
      console.error('[scheduler]', e);
    }
  };
  setTimeout(tick, 10_000);
  setInterval(tick, 5 * 60 * 1000);
}
