import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { prisma } from './prisma.js';

export const smtpConfigured = () => Boolean(env.SMTP_HOST && env.SMTP_USER);

const transport = smtpConfigured()
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    })
  : null;

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Plantilla HTML institucional mínima para correos. `body` ya debe venir escapado o ser HTML confiable. */
export function emailLayout(title: string, bodyHtml: string, cta?: { label: string; url: string }) {
  return `<!doctype html><html lang="es"><body style="margin:0;background:#F2F2F0;font-family:Arial,Helvetica,sans-serif;color:#1b2236">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-top:6px solid #EE7A2F">
<tr><td style="padding:28px 32px 8px;font-size:13px;letter-spacing:.08em;font-weight:bold">CEHACIS</td></tr>
<tr><td style="padding:8px 32px;font-size:24px;font-weight:bold;line-height:1.2">${escape(title)}</td></tr>
<tr><td style="padding:8px 32px 24px;font-size:15px;line-height:1.6">${bodyHtml}</td></tr>
${cta ? `<tr><td style="padding:0 32px 32px"><a href="${escape(cta.url)}" style="display:inline-block;background:#EE7A2F;color:#1b2236;padding:12px 20px;text-decoration:none;font-weight:bold">${escape(cta.label)}</a></td></tr>` : ''}
<tr><td style="padding:16px 32px;border-top:1px solid #e5e5e3;font-size:12px;color:#4A4A4D">Centro de Entrenamiento en Habilidades Comunicativas e Inteligencia Social</td></tr>
</table></td></tr></table></body></html>`;
}

/**
 * Envía un correo. Siempre lo registra en email_outbox; si SMTP no está configurado
 * queda con estado LOGGED (visible para el administrador) en vez de fingir un envío.
 */
export async function sendMail(to: string, subject: string, html: string) {
  const row = await prisma.emailOutbox.create({ data: { to, subject, html, status: transport ? 'QUEUED' : 'LOGGED' } });
  if (!transport) return row;
  try {
    await transport.sendMail({ from: env.SMTP_FROM, to, subject, html });
    return prisma.emailOutbox.update({ where: { id: row.id }, data: { status: 'SENT', sentAt: new Date() } });
  } catch (e) {
    return prisma.emailOutbox.update({ where: { id: row.id }, data: { status: 'FAILED', error: String(e).slice(0, 1000) } });
  }
}

export { escape as escapeHtml };
