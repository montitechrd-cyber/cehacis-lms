import fs from 'node:fs';
import { Router, type Request } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { audit } from '../../lib/audit.js';
import { badRequest, conflict, forbidden, notFound, unauthorized } from '../../lib/errors.js';
import { idParam, query } from '../../lib/validate.js';
import { fileUrl, filePath, saveFile, uploader } from '../../lib/upload.js';
import { assertCourseAccess, can, requireAuth } from '../../middleware/auth.js';

const r = Router();

const isStaff = (req: Request) => can(req, 'courses.manage') || can(req, 'courses.teach') || can(req, 'settings.manage');
const dto = (f: { id: number; originalName: string; mimeType: string; size: number; isPublic: boolean }) => ({
  id: f.id,
  originalName: f.originalName,
  mimeType: f.mimeType,
  size: f.size,
  isPublic: f.isPublic,
  url: fileUrl(f.id),
});

const zBool = z.preprocess((v) => v === true || v === 'true' || v === '1' || v === 1, z.boolean());

r.post('/', requireAuth, uploader().single('file'), async (req, res) => {
  if (!req.file) throw badRequest('Adjunta un archivo en el campo "file"');
  const { isPublic } = query(req, z.object({ isPublic: zBool.optional() }).passthrough());
  if (isPublic && !isStaff(req)) {
    // El archivo ya se guardó en disco por multer: se elimina antes de rechazar.
    await fs.promises.unlink(req.file.path).catch(() => null);
    throw forbidden('Solo el personal puede publicar archivos');
  }
  const file = await saveFile(req.file, req.user!.id, { isPublic: !!isPublic });
  res.status(201).json({ file: dto(file) });
});

/** ¿Puede el usuario autenticado leer este archivo privado? */
async function canRead(req: Request, file: { id: number; ownerId: number | null; folderId: number | null }): Promise<boolean> {
  const user = req.user!;
  if (file.ownerId === user.id || can(req, 'courses.manage')) return true;

  // 1) Recursos de lección y carpetas de curso
  const courseIds = new Set<number>();
  const resources = await prisma.lessonResource.findMany({
    where: { OR: [{ fileId: file.id }, ...(file.folderId ? [{ folderId: file.folderId }] : [])] },
    select: { lesson: { select: { module: { select: { courseId: true } } } } },
  });
  resources.forEach((x) => courseIds.add(x.lesson.module.courseId));
  if (file.folderId) {
    const folder = await prisma.folder.findUnique({ where: { id: file.folderId }, select: { courseId: true } });
    if (folder?.courseId) courseIds.add(folder.courseId);
  }
  for (const courseId of courseIds) {
    try {
      await assertCourseAccess(req, courseId);
      return true;
    } catch {
      // probar con el siguiente curso
    }
  }

  // 2) Entregas de actividades: autor, miembro del grupo o facilitador del curso
  const subs = await prisma.submissionFile.findMany({
    where: { fileId: file.id },
    select: { submission: { select: { userId: true, groupId: true, activity: { select: { courseId: true, peerReview: true, isPublished: true } } } } },
  });
  for (const { submission: s } of subs) {
    if (s.userId === user.id) return true;
    if (s.groupId && (await prisma.activityGroupMember.findUnique({ where: { groupId_userId: { groupId: s.groupId, userId: user.id } } }))) return true;
    if (await prisma.courseInstructor.findUnique({ where: { courseId_instructorId: { courseId: s.activity.courseId, instructorId: user.id } } })) return true;
    // Revisión entre pares: los compañeros inscritos en el curso deben poder abrir la entrega que evalúan.
    if (s.activity.peerReview && s.activity.isPublished) {
      const enr = await prisma.enrollment.findUnique({ where: { userId_courseId: { userId: user.id, courseId: s.activity.courseId } } });
      if (enr && (enr.status === 'ACTIVE' || enr.status === 'COMPLETED')) return true;
    }
  }

  // 3) Logo o firma de plantillas de certificado
  if (can(req, 'certificates.manage')) {
    const tpl = await prisma.certificateTemplate.count({ where: { OR: [{ logoFileId: file.id }, { signatureFileId: file.id }] } });
    if (tpl > 0) return true;
  }
  return false;
}

r.get('/:id', async (req, res) => {
  const id = idParam(req);
  const { download } = query(req, z.object({ download: zBool.optional() }).passthrough());
  const file = await prisma.file.findUnique({ where: { id } });
  if (!file) throw notFound('Archivo no encontrado');

  if (!file.isPublic) {
    if (!req.user) throw unauthorized();
    if (!(await canRead(req, file))) throw forbidden('No tienes acceso a este archivo');
  }

  const abs = filePath(file.storedName);
  try {
    await fs.promises.access(abs, fs.constants.R_OK);
  } catch {
    throw notFound('El archivo ya no está disponible');
  }

  const ascii = file.originalName.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
  res.setHeader('Content-Type', file.mimeType);
  res.setHeader('Content-Disposition', `${download ? 'attachment' : 'inline'}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(file.originalName).replace(/['()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase())}`);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', file.isPublic ? 'public, max-age=3600' : 'private, max-age=0, must-revalidate');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
  res.sendFile(abs, { dotfiles: 'deny' }, (err) => {
    if (err && !res.headersSent) res.status(404).json({ error: { code: 'NOT_FOUND', message: 'El archivo ya no está disponible' } });
  });
});

r.delete('/:id', requireAuth, async (req, res) => {
  const id = idParam(req);
  const file = await prisma.file.findUnique({ where: { id } });
  if (!file) throw notFound('Archivo no encontrado');
  if (file.ownerId !== req.user!.id && !can(req, 'courses.manage')) throw forbidden('Solo el dueño del archivo puede eliminarlo');

  const [resources, submissions, templates] = await Promise.all([
    prisma.lessonResource.count({ where: { fileId: id } }),
    prisma.submissionFile.count({ where: { fileId: id } }),
    prisma.certificateTemplate.count({ where: { OR: [{ logoFileId: id }, { signatureFileId: id }] } }),
  ]);
  if (resources + submissions + templates > 0) throw conflict('El archivo está en uso (recursos, entregas o plantillas) y no se puede eliminar');
  const brandRow = await prisma.setting.findUnique({ where: { key: 'brand' } });
  if (brandRow && JSON.stringify(brandRow.value).includes(`"${fileUrl(id)}"`)) throw conflict('El archivo es el logo institucional y no se puede eliminar');

  await prisma.file.delete({ where: { id } });
  await fs.promises.unlink(filePath(file.storedName)).catch(() => null);
  await audit(req, 'file.delete', 'file', id, { name: file.originalName });
  res.json({ ok: true });
});

export default r;
