import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import type { Certificate, CertificateTemplate } from '@prisma/client';
import { env } from '../../config/env.js';
import { prisma } from '../../lib/prisma.js';
import { notify } from '../../lib/notify.js';
import { evaluateBadges } from '../../lib/gamification.js';
import { filePath } from '../../lib/upload.js';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin 0/O/1/I

function randomCode(): string {
  let s = '';
  for (let i = 0; i < 6; i++) s += CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)];
  return `CEH-${new Date().getFullYear()}-${s}`;
}

/** Genera un código único (verifica contra la BD). */
export async function generateCertificateCode(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = randomCode();
    if (!(await prisma.certificate.findUnique({ where: { code }, select: { id: true } }))) return code;
  }
  throw new Error('No se pudo generar un código de certificado único');
}

export async function defaultTemplateId(courseTemplateId?: number | null): Promise<number | null> {
  if (courseTemplateId) return courseTemplateId;
  const def = await prisma.certificateTemplate.findFirst({ where: { isDefault: true }, select: { id: true } });
  return def?.id ?? null;
}

/** Crea un certificado reintentando si el código colisiona. */
export async function createCertificate(data: Omit<Parameters<typeof prisma.certificate.create>[0]['data'], 'code'>): Promise<Certificate> {
  let lastErr: unknown;
  for (let i = 0; i < 5; i++) {
    try {
      return await prisma.certificate.create({ data: { ...(data as object), code: await generateCertificateCode() } as Parameters<typeof prisma.certificate.create>[0]['data'] });
    } catch (e) {
      lastErr = e;
      if ((e as { code?: string }).code !== 'P2002') throw e;
    }
  }
  throw lastErr;
}

export async function notifyCertificate(userId: number, title: string) {
  await notify(userId, { type: 'CERTIFICATE', title: `Tu certificado está listo: ${title}`, body: 'Ya puedes descargarlo desde tu campus.', link: '/campus/certificados', email: true });
}

/**
 * Emite el certificado de un curso si corresponde (curso con certificado habilitado, inscripción COMPLETED
 * y sin certificado VALID previo). Devuelve el certificado o null.
 */
export async function issueCertificateIfEligible(userId: number, courseId: number) {
  const [course, enrollment, user] = await Promise.all([
    prisma.course.findUnique({ where: { id: courseId } }),
    prisma.enrollment.findUnique({ where: { userId_courseId: { userId, courseId } } }),
    prisma.user.findUnique({ where: { id: userId }, select: { firstName: true, lastName: true } }),
  ]);
  if (!course || !course.certificateEnabled || !user) return null;
  if (!enrollment || enrollment.status !== 'COMPLETED') return null;
  const existing = await prisma.certificate.findFirst({ where: { userId, courseId, status: 'VALID' } });
  if (existing) return null;

  const cert = await createCertificate({
    userId,
    courseId,
    recipientName: `${user.firstName} ${user.lastName}`.trim(),
    title: course.title,
    hours: course.durationHours,
    finalGrade: enrollment.finalGrade,
    templateId: await defaultTemplateId(course.certificateTemplateId),
  } as never);
  await notifyCertificate(userId, course.title).catch((e) => console.error('[certificates] notify', e));
  await evaluateBadges(userId).catch((e) => console.error('[certificates] badges', e));
  return cert;
}

// ───────────────────────── PDF ─────────────────────────

export const DEFAULT_BODY = 'Se certifica que {nombre} ha completado satisfactoriamente el curso {curso}, con una duración de {horas} horas y una calificación final de {calificacion}, emitido el {fecha}.';

const dateEs = (d: Date) => d.toLocaleDateString('es-DO', { day: 'numeric', month: 'long', year: 'numeric' });

function fillBody(tpl: string, vars: Record<string, string>) {
  return tpl.replace(/\{(nombre|curso|horas|fecha|calificacion)\}/g, (_m, k: string) => vars[k] ?? '');
}

const HEX = /^#[0-9a-fA-F]{6}$/;

async function readImage(fileId?: number | null): Promise<Buffer | null> {
  if (!fileId) return null;
  try {
    const f = await prisma.file.findUnique({ where: { id: fileId } });
    if (!f || !/\.(png|jpe?g)$/i.test(f.storedName)) return null;
    return fs.readFileSync(filePath(f.storedName));
  } catch {
    return null;
  }
}

async function readLogo(template: CertificateTemplate | null): Promise<Buffer | null> {
  const custom = await readImage(template?.logoFileId);
  if (custom) return custom;
  try {
    const p = path.resolve(process.cwd(), '../web/public/brand/logo-cehacis.png');
    return fs.existsSync(p) ? fs.readFileSync(p) : null;
  } catch {
    return null;
  }
}

/**
 * Dibuja el emblema del logo (templo con mariposa y ondas de voz) en vector, con la misma geometría
 * que el frontend (viewBox 120×112). `detail` es el color de los vaciados del frontón.
 */
function drawTemple(doc: PDFKit.PDFDocument, x: number, y: number, width: number, color: string, opts: { detail?: string; opacity?: number } = {}) {
  const k = width / 120;
  const X = (v: number) => x + v * k;
  const Y = (v: number) => y + v * k;
  doc.save();
  doc.fillOpacity(opts.opacity ?? 1).fillColor(color);
  doc.polygon([X(60), Y(6)], [X(110), Y(32)], [X(10), Y(32)]).fill();
  const rects: [number, number, number, number][] = [
    [16, 35, 88, 7], [22, 44, 76, 3],
    [27, 50, 12, 36], [45, 50, 12, 36], [63, 50, 12, 36], [81, 50, 12, 36],
    [20, 89, 80, 5], [13, 96, 94, 5], [6, 103, 108, 6],
  ];
  for (const [rx, ry, rw, rh] of rects) doc.rect(X(rx), Y(ry), rw * k, rh * k).fill();
  if (opts.detail) {
    doc.fillColor(opts.detail);
    // Ondas de voz a ambos lados
    const wave = [3, 6, 10, 6, 12, 8];
    wave.forEach((h, i) => {
      doc.rect(X(49 - i * 2.6 - 1.25), Y(22 - h / 2), 1.25 * k, h * k).fill();
      doc.rect(X(71 + i * 2.6), Y(22 - h / 2), 1.25 * k, h * k).fill();
    });
    // Mariposa
    doc.ellipse(X(56.4), Y(17.4), 3.4 * k, 2.4 * k).fill();
    doc.ellipse(X(63.6), Y(17.4), 3.4 * k, 2.4 * k).fill();
    doc.ellipse(X(57.2), Y(23.6), 2 * k, 1.6 * k).fill();
    doc.ellipse(X(62.8), Y(23.6), 2 * k, 1.6 * k).fill();
    doc.rect(X(59.45), Y(16.4), 1.1 * k, 10 * k).fill();
  }
  doc.restore();
}

export type CertificateForPdf = Certificate & { template?: CertificateTemplate | null };

/** Renderiza el certificado en PDF (A4 horizontal). `preview` añade la marca "VISTA PREVIA". */
export async function renderCertificatePdf(cert: CertificateForPdf, opts: { preview?: boolean } = {}): Promise<Buffer> {
  let template: CertificateTemplate | null = cert.template ?? null;
  if (template === null && cert.template === undefined) {
    template = cert.templateId
      ? await prisma.certificateTemplate.findUnique({ where: { id: cert.templateId } })
      : await prisma.certificateTemplate.findFirst({ where: { isDefault: true } });
  }
  const color = template && HEX.test(template.primaryColor) ? template.primaryColor : '#EE7A2F';
  const INK = '#1b2236';
  const MUTED = '#6b6b6b';
  const [logo, signature] = await Promise.all([readLogo(template), readImage(template?.signatureFileId)]);
  const verifyUrl = `${env.APP_URL.replace(/\/$/, '')}/verificar/${cert.code}`;
  const qr = await QRCode.toBuffer(verifyUrl, { margin: 1, width: 300, errorCorrectionLevel: 'M' });

  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 0, info: { Title: `Certificado ${cert.code}`, Author: 'CEHACIS' } });
  const chunks: Buffer[] = [];
  doc.on('data', (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  const W = doc.page.width;
  const H = doc.page.height;

  // Bandas y marco
  doc.rect(0, 0, W, 14).fill(color);
  doc.rect(0, H - 14, W, 14).fill(color);
  doc.lineWidth(0.8).strokeColor('#dcdcdc').rect(28, 30, W - 56, H - 60).stroke();

  // Marca de agua: el templo del logo, grande y muy tenue, detrás del texto
  drawTemple(doc, W / 2 - 170, H / 2 - 150, 340, color, { opacity: 0.05 });

  // Sello: logo personalizado de la plantilla, o el emblema vectorial institucional
  const customLogo = await readImage(template?.logoFileId);
  if (customLogo) {
    try {
      doc.image(customLogo, 60, 48, { fit: [170, 54] });
    } catch {
      /* logo ilegible: se omite */
    }
  } else {
    drawTemple(doc, W / 2 - 30, 44, 60, color, { detail: '#FFFFFF' });
  }
  void logo;

  // Encabezado
  const heading = (template?.heading || 'Certificado de Aprobación').toUpperCase();
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(24).text(heading, 60, 120, { width: W - 120, align: 'center', characterSpacing: 2, lineBreak: false });
  doc.rect(W / 2 - 40, 156, 80, 3).fill(color);

  doc.fillColor(MUTED).font('Helvetica').fontSize(12).text('Se otorga a', 60, 182, { width: W - 120, align: 'center', lineBreak: false });

  // Nombre (se reduce si es muy largo)
  let nameSize = 40;
  doc.font('Helvetica-Bold');
  while (nameSize > 20 && doc.fontSize(nameSize).widthOfString(cert.recipientName) > W - 140) nameSize -= 2;
  doc.fillColor(INK).fontSize(nameSize).text(cert.recipientName, 60, 204, { width: W - 120, align: 'center', lineBreak: false });
  doc.rect(W / 2 - 160, 204 + nameSize + 10, 320, 1).fill('#cfcfcf');

  // Cuerpo
  const bodyText = fillBody(template?.body?.trim() || DEFAULT_BODY, {
    nombre: cert.recipientName,
    curso: cert.title,
    horas: cert.hours != null ? String(cert.hours) : '—',
    fecha: dateEs(cert.issuedAt),
    calificacion: cert.finalGrade != null ? String(Number(cert.finalGrade)) : '—',
  });
  doc.fillColor('#333333').font('Helvetica').fontSize(13).text(bodyText, 120, 282, { width: W - 240, align: 'center', lineGap: 5, height: 110, ellipsis: true });

  // Firma
  const sigX = 80;
  const sigW = 210;
  if (signature) {
    try {
      doc.image(signature, sigX + 20, 408, { fit: [sigW - 40, 52], align: 'center', valign: 'bottom' });
    } catch {
      /* firma ilegible */
    }
  }
  doc.moveTo(sigX, 466).lineTo(sigX + sigW, 466).lineWidth(0.8).strokeColor(INK).stroke();
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(11).text(template?.signatureName ?? '', sigX, 472, { width: sigW, align: 'center', lineBreak: false });
  doc.fillColor(MUTED).font('Helvetica').fontSize(10).text(template?.signatureTitle ?? '', sigX, 487, { width: sigW, align: 'center', lineBreak: false });

  // Código y fecha (centro)
  const cx = 320;
  const cw = 200;
  doc.fillColor(MUTED).font('Helvetica').fontSize(9).text('Código del certificado', cx, 440, { width: cw, align: 'center', lineBreak: false });
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(13).text(cert.code, cx, 454, { width: cw, align: 'center', lineBreak: false });
  doc.fillColor(MUTED).font('Helvetica').fontSize(9).text('Fecha de emisión', cx, 482, { width: cw, align: 'center', lineBreak: false });
  doc.fillColor(INK).font('Helvetica').fontSize(11).text(dateEs(cert.issuedAt), cx, 495, { width: cw, align: 'center', lineBreak: false });

  // QR
  const qrSize = 88;
  const qrX = W - 70 - qrSize;
  doc.image(qr, qrX, 400, { width: qrSize, height: qrSize });
  doc.fillColor(MUTED).font('Helvetica').fontSize(7.5).text(`Verifique la autenticidad en ${verifyUrl}`, qrX - 40, 494, { width: qrSize + 40, align: 'center' });

  // Marcas de agua
  const watermark = (text: string, wmColor: string) => {
    doc.save();
    doc.rotate(-28, { origin: [W / 2, H / 2] });
    doc.fillColor(wmColor).fillOpacity(0.13).font('Helvetica-Bold').fontSize(110);
    const tw = doc.widthOfString(text);
    doc.text(text, W / 2 - tw / 2, H / 2 - 55, { lineBreak: false });
    doc.restore();
  };
  if (cert.status === 'REVOKED') watermark('REVOCADO', '#c0392b');
  if (opts.preview) watermark('VISTA PREVIA', '#888888');

  doc.end();
  return done;
}
