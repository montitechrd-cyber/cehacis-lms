import { env } from '../config/env.js';
import { emailLayout, escapeHtml, sendMail } from './mailer.js';
import { prisma } from './prisma.js';

export interface NotifyInput {
  type: string;
  title: string;
  body?: string;
  link?: string; // ruta del frontend, p. ej. /campus/cursos/oratoria
  email?: boolean; // además envía correo
}

/** Crea una notificación interna (y opcionalmente un correo) para uno o varios usuarios. */
export async function notify(userIds: number | number[], n: NotifyInput) {
  const ids = Array.isArray(userIds) ? [...new Set(userIds)] : [userIds];
  if (!ids.length) return;
  await prisma.notification.createMany({
    data: ids.map((userId) => ({ userId, type: n.type, title: n.title.slice(0, 200), body: n.body?.slice(0, 1000), link: n.link })),
  });
  if (n.email) {
    const users = await prisma.user.findMany({ where: { id: { in: ids } }, select: { email: true } });
    const html = emailLayout(n.title, escapeHtml(n.body ?? ''), n.link ? { label: 'Abrir en CEHACIS', url: env.APP_URL + n.link } : undefined);
    await Promise.all(users.map((u) => sendMail(u.email, n.title, html)));
  }
}
