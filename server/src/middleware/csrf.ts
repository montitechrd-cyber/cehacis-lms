import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env.js';
import { AppError } from '../lib/errors.js';
import { CSRF_COOKIE } from './auth.js';

const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Protección CSRF de doble envío: el servidor emite una cookie legible `cehacis_csrf`
 * y el cliente la reenvía en la cabecera X-CSRF-Token en toda petición que modifique datos.
 * Las cookies de sesión además usan SameSite=Lax + httpOnly.
 */
export function csrf(req: Request, res: Response, next: NextFunction) {
  let token: string | undefined = req.cookies?.[CSRF_COOKIE];
  if (!token) {
    token = crypto.randomBytes(24).toString('hex');
    res.cookie(CSRF_COOKIE, token, { httpOnly: false, sameSite: 'lax', secure: env.COOKIE_SECURE, path: '/' });
  }
  if (SAFE.has(req.method)) return next();
  // Webhooks de pasarelas externas no llevan cookie: se autentican por firma en su propio handler.
  if (req.path.startsWith('/api/payments/webhook')) return next();
  const header = req.get('x-csrf-token');
  if (!header || !req.cookies?.[CSRF_COOKIE] || header !== req.cookies[CSRF_COOKIE]) {
    return next(new AppError(403, 'Token de seguridad inválido. Recarga la página e inténtalo de nuevo.', 'CSRF'));
  }
  next();
}
