import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { env } from '../config/env.js';
import { badRequest } from './errors.js';
import { prisma } from './prisma.js';

export const UPLOAD_ROOT = path.resolve(env.UPLOAD_DIR);
fs.mkdirSync(UPLOAD_ROOT, { recursive: true });

/** Tipos permitidos por categoría. Se valida extensión Y mime. */
const ALLOWED: Record<string, string[]> = {
  '.pdf': ['application/pdf'],
  '.doc': ['application/msword'],
  '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  '.xls': ['application/vnd.ms-excel'],
  '.xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  '.ppt': ['application/vnd.ms-powerpoint'],
  '.pptx': ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
  '.txt': ['text/plain'],
  '.csv': ['text/csv', 'application/vnd.ms-excel'],
  '.zip': ['application/zip', 'application/x-zip-compressed'],
  '.png': ['image/png'],
  '.jpg': ['image/jpeg'],
  '.jpeg': ['image/jpeg'],
  '.webp': ['image/webp'],
  '.gif': ['image/gif'],
  '.mp4': ['video/mp4'],
  '.webm': ['video/webm', 'audio/webm'],
  '.mov': ['video/quicktime'],
  '.mp3': ['audio/mpeg'],
  '.m4a': ['audio/mp4', 'audio/x-m4a'],
  '.wav': ['audio/wav', 'audio/x-wav', 'audio/wave'],
  '.ogg': ['audio/ogg', 'video/ogg'],
};

export const IMAGE_EXT = ['.png', '.jpg', '.jpeg', '.webp', '.gif'];

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_ROOT),
  filename: (_req, file, cb) => cb(null, crypto.randomBytes(16).toString('hex') + path.extname(file.originalname).toLowerCase()),
});

/** Middleware multer con validación de tipo y tamaño. `only` restringe a extensiones concretas. */
export function uploader(opts: { maxMb?: number; only?: string[] } = {}) {
  return multer({
    storage,
    limits: { fileSize: (opts.maxMb ?? env.MAX_UPLOAD_MB) * 1024 * 1024, files: 10 },
    fileFilter: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const okExt = ALLOWED[ext] && (!opts.only || opts.only.includes(ext));
      if (!okExt || !ALLOWED[ext]!.includes(file.mimetype)) {
        return cb(badRequest(`Tipo de archivo no permitido: ${ext || file.mimetype}`));
      }
      cb(null, true);
    },
  });
}

/** Registra en la tabla files un archivo subido por multer. */
export function saveFile(file: Express.Multer.File, ownerId: number | null, opts: { isPublic?: boolean; folderId?: number | null } = {}) {
  return prisma.file.create({
    data: {
      ownerId,
      originalName: file.originalname.slice(0, 255),
      storedName: file.filename,
      mimeType: file.mimetype,
      size: file.size,
      isPublic: opts.isPublic ?? false,
      folderId: opts.folderId ?? null,
    },
  });
}

export const filePath = (storedName: string) => {
  const p = path.join(UPLOAD_ROOT, path.basename(storedName));
  return p;
};

/** URL pública/autenticada con la que el frontend descarga un archivo. */
export const fileUrl = (id: number) => `/api/files/${id}`;
