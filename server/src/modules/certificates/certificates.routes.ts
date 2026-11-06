import { Router, type Response } from 'express';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { body, query, idParam, zId, zOptId, zText } from '../../lib/validate.js';
import { getPage, paged } from '../../lib/pagination.js';
import { badRequest, conflict, forbidden, notFound } from '../../lib/errors.js';
import { audit } from '../../lib/audit.js';
import { notify } from '../../lib/notify.js';
import { evaluateBadges } from '../../lib/gamification.js';
import { getBrand } from '../../lib/settings.js';
import { requireAuth, requirePermission } from '../../middleware/auth.js';
import {
  DEFAULT_BODY,
  createCertificate,
  defaultTemplateId,
  notifyCertificate,
  renderCertificatePdf,
  type CertificateForPdf,
} from './certificates.service.js';

export { issueCertificateIfEligible, renderCertificatePdf } from './certificates.service.js';

const r = Router();
const manage = requirePermission('certificates.manage');
const userSel = { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } as const;
const courseSel = { id: true, code: true, title: true, slug: true } as const;

type CertRow = Prisma.CertificateGetPayload<{ include: { course: { select: typeof courseSel } } }>;
const out = <T extends { finalGrade: unknown }>(c: T) => ({ ...c, finalGrade: c.finalGrade != null ? Number(c.finalGrade) : null });
const outCert = (c: CertRow) => ({ ...out(c), pdfUrl: `/api/certificates/${c.id}/pdf` });

function sendPdf(res: Response, buf: Buffer, filename: string) {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Length', String(buf.length));
  res.send(buf);
}

// ───────── Verificación pública ─────────
r.get('/verify/:code', async (req, res) => {
  const code = String(req.params.code ?? '').trim().toUpperCase().slice(0, 40);
  const cert = code ? await prisma.certificate.findUnique({ where: { code } }) : null;
  if (!cert) {
    res.status(404).json({ valid: false });
    return;
  }
  const brand = await getBrand();
  res.json({
    valid: cert.status === 'VALID',
    status: cert.status,
    code: cert.code,
    recipientName: cert.recipientName,
    title: cert.title,
    hours: cert.hours,
    issuedAt: cert.issuedAt,
    institution: brand.legalName,
  });
});

// ───────── Estudiante ─────────
r.get('/me', requireAuth, async (req, res) => {
  const rows = await prisma.certificate.findMany({
    where: { userId: req.user!.id },
    orderBy: { issuedAt: 'desc' },
    include: { course: { select: courseSel } },
  });
  res.json({ data: rows.map(outCert) });
});

// ───────── Requisitos de certificación de un curso ─────────
r.get('/requirements/:courseId', requireAuth, async (req, res) => {
  const courseId = idParam(req, 'courseId');
  const course = await prisma.course.findFirst({ where: { id: courseId, deletedAt: null } });
  if (!course) throw notFound('Curso no encontrado');
  const finals = await prisma.assessment.findMany({
    where: { courseId, type: 'FINAL', isPublished: true },
    select: { id: true, title: true },
    orderBy: { id: 'asc' },
  });
  const base = {
    certificateEnabled: course.certificateEnabled,
    passingScore: course.passingScore,
    requireAllLessons: course.requireAllLessons,
    minAttendancePct: course.minAttendancePct,
    finalAssessments: finals,
  };

  const userId = req.user!.id;
  const enr = await prisma.enrollment.findUnique({ where: { userId_courseId: { userId, courseId } } });
  if (!enr || enr.status === 'CANCELLED' || enr.status === 'PENDING_PAYMENT') {
    res.json({ ...base, enrollment: null });
    return;
  }

  const lessonWhere = { isPublished: true, module: { courseId, isPublished: true } };
  const [total, completed] = await Promise.all([
    prisma.lesson.count({ where: lessonWhere }),
    prisma.lessonProgress.count({ where: { userId, status: 'COMPLETED', lesson: lessonWhere } }),
  ]);

  const assessments = await Promise.all(
    finals.map(async (a) => {
      const agg = await prisma.assessmentAttempt.aggregate({
        where: { userId, assessmentId: a.id, status: { in: ['SUBMITTED', 'GRADED'] } },
        _max: { percentage: true },
        _count: { _all: true },
      });
      const best = agg._max.percentage != null ? Number(agg._max.percentage) : null;
      return { id: a.id, title: a.title, attempts: agg._count._all, bestPercentage: best, met: best != null && best >= course.passingScore };
    }),
  );

  const now = new Date();
  const [sessions, attended] = await Promise.all([
    prisma.event.count({ where: { courseId, startAt: { lte: now } } }),
    prisma.attendance.count({ where: { userId, status: { in: ['PRESENT', 'LATE'] }, event: { courseId } } }),
  ]);
  const attPct = sessions ? Math.min(100, Math.round((attended / sessions) * 100)) : null;

  const lessonsMet = !course.requireAllLessons || (total > 0 ? completed >= total : true);
  const attendanceMet = course.minAttendancePct <= 0 || (attPct != null && attPct >= course.minAttendancePct);
  const assessmentsMet = assessments.every((a) => a.met);
  const cert = await prisma.certificate.findFirst({ where: { userId, courseId, status: 'VALID' }, select: { id: true, code: true } });

  res.json({
    ...base,
    enrollment: {
      status: enr.status,
      progressPct: enr.progressPct,
      finalGrade: enr.finalGrade != null ? Number(enr.finalGrade) : null,
      lessons: { completed, total, met: lessonsMet },
      assessments,
      attendance: { attended, sessions, pct: attPct, met: attendanceMet },
      eligible: course.certificateEnabled && lessonsMet && attendanceMet && assessmentsMet,
      certificate: cert,
    },
  });
});

// ───────── Administración: plantillas ─────────
const hexColor = z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, 'Color inválido, usa el formato #RRGGBB');
const templateSchema = z.object({
  name: zText(120).min(1),
  heading: zText(200).min(1).default('Certificado de Aprobación'),
  body: zText(2000).min(1).default(DEFAULT_BODY),
  primaryColor: hexColor.default('#EE7A2F'),
  signatureName: zText(120).nullable().optional(),
  signatureTitle: zText(120).nullable().optional(),
  signatureFileId: zOptId,
  logoFileId: zOptId,
  isDefault: z.boolean().default(false),
});

async function assertFiles(ids: (number | null | undefined)[]) {
  for (const id of ids) {
    if (id && !(await prisma.file.findUnique({ where: { id }, select: { id: true } }))) throw badRequest('El archivo indicado no existe');
  }
}

r.get('/templates', requireAuth, manage, async (_req, res) => {
  const rows = await prisma.certificateTemplate.findMany({ orderBy: { id: 'asc' }, include: { _count: { select: { certificates: true } } } });
  res.json({ data: rows });
});
r.get('/templates/:id', requireAuth, manage, async (req, res) => {
  const t = await prisma.certificateTemplate.findUnique({ where: { id: idParam(req) }, include: { _count: { select: { certificates: true } } } });
  if (!t) throw notFound('Plantilla no encontrada');
  res.json({ data: t });
});
r.post('/templates', requireAuth, manage, async (req, res) => {
  const d = body(req, templateSchema);
  await assertFiles([d.signatureFileId, d.logoFileId]);
  const data = await prisma.$transaction(async (tx) => {
    if (d.isDefault) await tx.certificateTemplate.updateMany({ data: { isDefault: false } });
    return tx.certificateTemplate.create({ data: { ...d, signatureFileId: d.signatureFileId ?? null, logoFileId: d.logoFileId ?? null } });
  });
  await audit(req, 'certificate.template.create', 'certificate_template', data.id, { name: d.name });
  res.status(201).json({ data });
});
r.patch('/templates/:id', requireAuth, manage, async (req, res) => {
  const id = idParam(req);
  const d = body(req, templateSchema.partial());
  if (!(await prisma.certificateTemplate.findUnique({ where: { id } }))) throw notFound('Plantilla no encontrada');
  await assertFiles([d.signatureFileId, d.logoFileId]);
  const data = await prisma.$transaction(async (tx) => {
    if (d.isDefault) await tx.certificateTemplate.updateMany({ where: { id: { not: id } }, data: { isDefault: false } });
    return tx.certificateTemplate.update({ where: { id }, data: d });
  });
  await audit(req, 'certificate.template.update', 'certificate_template', id, d);
  res.json({ data });
});
r.delete('/templates/:id', requireAuth, manage, async (req, res) => {
  const id = idParam(req);
  if (!(await prisma.certificateTemplate.findUnique({ where: { id } }))) throw notFound('Plantilla no encontrada');
  const used = await prisma.certificate.count({ where: { templateId: id } });
  if (used) throw conflict(`No se puede eliminar: la plantilla tiene ${used} certificado(s) emitido(s)`);
  await prisma.certificateTemplate.delete({ where: { id } });
  await audit(req, 'certificate.template.delete', 'certificate_template', id);
  res.json({ ok: true });
});
r.get('/templates/:id/preview', requireAuth, manage, async (req, res) => {
  const t = await prisma.certificateTemplate.findUnique({ where: { id: idParam(req) } });
  if (!t) throw notFound('Plantilla no encontrada');
  const fake = {
    id: 0,
    code: 'CEH-VISTA-PREVIA',
    userId: 0,
    courseId: null,
    programId: null,
    templateId: t.id,
    template: t,
    recipientName: 'NOMBRE DEL PARTICIPANTE (VISTA PREVIA)',
    title: 'Curso de ejemplo (VISTA PREVIA)',
    hours: 40,
    finalGrade: 95 as unknown as CertificateForPdf['finalGrade'],
    status: 'VALID',
    revokedReason: null,
    issuedAt: new Date(),
  } as CertificateForPdf;
  sendPdf(res, await renderCertificatePdf(fake, { preview: true }), `vista-previa-plantilla-${t.id}.pdf`);
});

// ───────── Administración: certificados ─────────
r.get('/', requireAuth, manage, async (req, res) => {
  const p = getPage(req);
  const q = query(req, z.object({ status: z.enum(['VALID', 'REVOKED']).optional(), courseId: zId.optional() }));
  const where: Prisma.CertificateWhereInput = {
    ...(q.status ? { status: q.status } : {}),
    ...(q.courseId ? { courseId: q.courseId } : {}),
    ...(p.search
      ? { OR: [{ code: { contains: p.search } }, { recipientName: { contains: p.search } }, { title: { contains: p.search } }, { user: { email: { contains: p.search } } }] }
      : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.certificate.findMany({
      where,
      orderBy: { issuedAt: 'desc' },
      skip: p.skip,
      take: p.take,
      include: { user: { select: userSel }, course: { select: courseSel } },
    }),
    prisma.certificate.count({ where }),
  ]);
  res.json(paged(rows.map((c) => ({ ...out(c), pdfUrl: `/api/certificates/${c.id}/pdf` })), total, p));
});

r.post('/issue', requireAuth, manage, async (req, res) => {
  const d = body(req, z.object({
    userId: zId,
    courseId: zOptId,
    programId: zOptId,
    title: zText(250).min(1).optional(),
    hours: z.coerce.number().int().min(0).max(100000).nullable().optional(),
    finalGrade: z.coerce.number().min(0).max(100).nullable().optional(),
  }));
  const user = await prisma.user.findFirst({ where: { id: d.userId, deletedAt: null }, select: { firstName: true, lastName: true } });
  if (!user) throw notFound('Usuario no encontrado');
  const course = d.courseId ? await prisma.course.findUnique({ where: { id: d.courseId } }) : null;
  if (d.courseId && !course) throw notFound('Curso no encontrado');
  const program = d.programId ? await prisma.program.findUnique({ where: { id: d.programId } }) : null;
  if (d.programId && !program) throw notFound('Programa no encontrado');
  const title = d.title ?? course?.title ?? (program as { title?: string; name?: string } | null)?.title ?? (program as { name?: string } | null)?.name;
  if (!title) throw badRequest('Indica un título, un curso o un programa');

  let grade = d.finalGrade ?? null;
  if (grade == null && course) {
    const enr = await prisma.enrollment.findUnique({ where: { userId_courseId: { userId: d.userId, courseId: course.id } } });
    if (enr?.finalGrade != null) grade = Number(enr.finalGrade);
  }
  const cert = await createCertificate({
    userId: d.userId,
    courseId: course?.id ?? null,
    programId: program?.id ?? null,
    recipientName: `${user.firstName} ${user.lastName}`.trim(),
    title,
    hours: d.hours ?? course?.durationHours ?? null,
    finalGrade: grade,
    templateId: await defaultTemplateId(course?.certificateTemplateId),
  } as never);
  await notifyCertificate(d.userId, title).catch((e) => console.error('[certificates] notify', e));
  await evaluateBadges(d.userId).catch((e) => console.error('[certificates] badges', e));
  await audit(req, 'certificate.issue', 'certificate', cert.id, { userId: d.userId, courseId: course?.id, manual: true });
  res.status(201).json({ data: out(cert) });
});

r.post('/:id/revoke', requireAuth, manage, async (req, res) => {
  const id = idParam(req);
  const d = body(req, z.object({ reason: zText(500).min(3, 'Indica el motivo de la revocación') }));
  const cert = await prisma.certificate.findUnique({ where: { id } });
  if (!cert) throw notFound('Certificado no encontrado');
  if (cert.status === 'REVOKED') throw conflict('El certificado ya está revocado');
  const data = await prisma.certificate.update({ where: { id }, data: { status: 'REVOKED', revokedReason: d.reason } });
  await notify(cert.userId, { type: 'CERTIFICATE', title: `Tu certificado fue revocado: ${cert.title}`, body: d.reason, link: '/campus/certificados' });
  await audit(req, 'certificate.revoke', 'certificate', id, { reason: d.reason });
  res.json({ data: out(data) });
});

r.post('/:id/restore', requireAuth, manage, async (req, res) => {
  const id = idParam(req);
  const cert = await prisma.certificate.findUnique({ where: { id } });
  if (!cert) throw notFound('Certificado no encontrado');
  if (cert.status === 'VALID') throw conflict('El certificado ya está vigente');
  const data = await prisma.certificate.update({ where: { id }, data: { status: 'VALID', revokedReason: null } });
  await notify(cert.userId, { type: 'CERTIFICATE', title: `Tu certificado fue restablecido: ${cert.title}`, link: '/campus/certificados' });
  await audit(req, 'certificate.restore', 'certificate', id);
  res.json({ data: out(data) });
});

// ───────── Descarga PDF (dueño o administración) ─────────
r.get('/:id/pdf', requireAuth, async (req, res) => {
  const id = idParam(req);
  const cert = await prisma.certificate.findUnique({ where: { id }, include: { template: true } });
  if (!cert) throw notFound('Certificado no encontrado');
  if (cert.userId !== req.user!.id && !req.user!.permissions.has('certificates.manage')) throw forbidden();
  sendPdf(res, await renderCertificatePdf(cert), `certificado-${cert.code}.pdf`);
});

export default r;
