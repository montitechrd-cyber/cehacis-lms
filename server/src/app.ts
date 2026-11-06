import path from 'node:path';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env, isProd } from './config/env.js';
import { loadUser } from './middleware/auth.js';
import { csrf } from './middleware/csrf.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { registerRoutes } from './routes.js';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'same-site' },
      contentSecurityPolicy: isProd ? undefined : false,
    }),
  );
  app.use(cors({ origin: env.APP_URL, credentials: true }));
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: false, limit: '2mb' }));
  app.use(cookieParser());

  app.use(
    '/api',
    rateLimit({
      windowMs: 60 * 1000,
      limit: env.NODE_ENV === 'test' ? 100000 : 300,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      message: { error: { code: 'RATE_LIMIT', message: 'Demasiadas solicitudes. Espera un momento.' } },
    }),
  );
  app.use(csrf);
  app.use(loadUser);

  app.get('/api/health', (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));
  registerRoutes(app);

  // En producción el backend sirve el frontend compilado (web/dist) con fallback SPA.
  if (isProd) {
    const dist = path.resolve(process.cwd(), '../web/dist');
    app.use(express.static(dist, { index: false, maxAge: '1h' }));
    app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
  }

  app.use('/api', notFoundHandler);
  app.use(errorHandler);
  return app;
}
