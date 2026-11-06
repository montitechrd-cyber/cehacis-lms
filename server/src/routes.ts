import type { Express } from 'express';
import auth from './modules/auth/auth.routes.js';
import admin from './modules/admin/admin.routes.js';
import files from './modules/files/files.routes.js';
import publicRoutes from './modules/public/public.routes.js';
import catalog from './modules/catalog/catalog.routes.js';
import classroom from './modules/classroom/classroom.routes.js';
import assessments from './modules/assessments/assessments.routes.js';
import competencies from './modules/competencies/competencies.routes.js';
import activities from './modules/activities/activities.routes.js';
import people from './modules/people/people.routes.js';
import calendar from './modules/calendar/calendar.routes.js';
import community from './modules/community/community.routes.js';
import gamification from './modules/gamification/gamification.routes.js';
import certificates from './modules/certificates/certificates.routes.js';
import commerce from './modules/commerce/commerce.routes.js';
import reports from './modules/reports/reports.routes.js';
import ai from './modules/ai/ai.routes.js';

/** Registro central de módulos de la API. Cada módulo es un Router independiente. */
export function registerRoutes(app: Express) {
  app.use('/api/auth', auth);
  app.use('/api/admin', admin); // usuarios, roles, configuración, auditoría, bandeja de correo, integraciones
  app.use('/api/files', files);
  app.use('/api/public', publicRoutes); // portal: catálogo público, facilitadores, FAQ, contacto, marca
  app.use('/api/catalog', catalog); // cursos, categorías, programas, módulos, lecciones, recursos, grupos
  app.use('/api/classroom', classroom); // aula virtual: inscripciones, progreso, secuencia, navegación
  app.use('/api/assessments', assessments);
  app.use('/api/competencies', competencies); // competencias, escalas, rúbricas, historial
  app.use('/api/activities', activities); // talleres, prácticas, simulaciones, entregas, revisión entre pares
  app.use('/api/people', people); // expedientes de estudiantes y facilitadores, notas académicas, evaluación docente
  app.use('/api/calendar', calendar); // eventos, sesiones, asistencia, disponibilidad
  app.use('/api/community', community); // foros, comentarios, mensajería, anuncios, notificaciones, moderación
  app.use('/api/gamification', gamification);
  app.use('/api/certificates', certificates);
  app.use('/api/commerce', commerce); // carrito, pedidos, pagos, cupones, paquetes, suscripciones, facturas
  app.use('/api/reports', reports);
  app.use('/api/ai', ai);
}
