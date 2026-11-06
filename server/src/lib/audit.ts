import type { Request } from 'express';
import { prisma } from './prisma.js';

/** Registra una acción sensible en audit_logs. Nunca lanza: la auditoría no debe romper la operación. */
export async function audit(req: Request | null, action: string, entity: string, entityId?: string | number | null, meta?: Record<string, unknown>) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: req?.user?.id ?? null,
        action,
        entity,
        entityId: entityId != null ? String(entityId) : null,
        meta: meta as object | undefined,
        ip: req?.ip?.slice(0, 64) ?? null,
        userAgent: req?.get('user-agent')?.slice(0, 255) ?? null,
      },
    });
  } catch (e) {
    console.error('[audit] fallo al registrar', e);
  }
}
