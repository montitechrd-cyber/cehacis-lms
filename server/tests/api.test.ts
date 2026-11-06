/**
 * Pruebas de integración de funcionalidades críticas (autenticación, RBAC, CSRF,
 * secuencia forzada del aula, flujo comercial sandbox y verificación de certificados).
 * Requieren la base de datos migrada y sembrada: `npm run db:seed`.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';

const PASS = process.env.SEED_PASSWORD ?? 'Cehacis2026!';
let app: Express;

/** Agente con cookies + token CSRF de doble envío. */
async function agentFor(email?: string) {
  const agent = request.agent(app);
  const h = await agent.get('/api/health');
  const csrf = /cehacis_csrf=([^;]+)/.exec(String(h.headers['set-cookie']))?.[1] ?? '';
  if (email) {
    const r = await agent.post('/api/auth/login').set('x-csrf-token', csrf).send({ email, password: PASS });
    expect(r.status).toBe(200);
  }
  return { agent, csrf };
}

beforeAll(() => {
  app = createApp();
});

describe('Autenticación y seguridad', () => {
  it('rechaza mutaciones sin token CSRF', async () => {
    const r = await request(app).post('/api/auth/login').send({ email: 'x@y.z', password: 'x' });
    expect(r.status).toBe(403);
    expect(r.body.error.code).toBe('CSRF');
  });

  it('rechaza credenciales inválidas sin revelar si el correo existe', async () => {
    const { agent, csrf } = await agentFor();
    const a = await agent.post('/api/auth/login').set('x-csrf-token', csrf).send({ email: 'estudiante@cehacis.test', password: 'incorrecta1' });
    const b = await agent.post('/api/auth/login').set('x-csrf-token', csrf).send({ email: 'noexiste@cehacis.test', password: 'incorrecta1' });
    expect(a.status).toBe(401);
    expect(b.status).toBe(401);
    expect(a.body.error.message).toBe(b.body.error.message);
    await prisma.user.update({ where: { email: 'estudiante@cehacis.test' }, data: { failedLogins: 0, lockedUntil: null } });
  });

  it('valida la contraseña en el registro', async () => {
    const { agent, csrf } = await agentFor();
    const r = await agent.post('/api/auth/register').set('x-csrf-token', csrf).send({ firstName: 'Ana', lastName: 'Prueba', email: `t${Date.now()}@test.test`, password: 'corta', acceptTerms: true });
    expect(r.status).toBe(400);
    expect(r.body.error.details.password).toBeDefined();
  });

  it('exige sesión en rutas privadas', async () => {
    const r = await request(app).get('/api/classroom/my-courses');
    expect(r.status).toBe(401);
  });

  it('no expone el hash de contraseña', async () => {
    const { agent } = await agentFor('estudiante@cehacis.test');
    const r = await agent.get('/api/auth/me');
    expect(JSON.stringify(r.body)).not.toContain('passwordHash');
  });
});

describe('Control de acceso por roles (RBAC)', () => {
  const cases: [string, string, number][] = [
    ['estudiante@cehacis.test', '/api/admin/users', 403],
    ['estudiante@cehacis.test', '/api/reports/dashboard', 403],
    ['facilitador@cehacis.test', '/api/admin/users', 403],
    ['facilitador@cehacis.test', '/api/commerce/orders', 403],
    ['academico@cehacis.test', '/api/commerce/orders', 403],
    ['academico@cehacis.test', '/api/people/students', 200],
    ['superadmin@cehacis.test', '/api/admin/users', 200],
    ['superadmin@cehacis.test', '/api/reports/dashboard', 200],
  ];
  it.each(cases)('%s → %s = %i', async (email, path, status) => {
    const { agent } = await agentFor(email);
    const r = await agent.get(path);
    expect(r.status).toBe(status);
  });

  it('un facilitador solo ve sus propios cursos', async () => {
    const { agent } = await agentFor('facilitadora2@cehacis.test');
    const r = await agent.get('/api/catalog/courses');
    expect(r.status).toBe(200);
    const me = await prisma.user.findUniqueOrThrow({ where: { email: 'facilitadora2@cehacis.test' } });
    for (const c of r.body.data) {
      const link = await prisma.courseInstructor.findFirst({ where: { courseId: c.id, instructorId: me.id } });
      expect(link).not.toBeNull();
    }
  });
});

describe('Aula virtual: secuencia forzada y navegación lineal', () => {
  it('bloquea lecciones posteriores a la actual con 423 y su requisito', async () => {
    const { agent } = await agentFor('estudiante@cehacis.test');
    const courses = await agent.get('/api/classroom/my-courses');
    const active = courses.body.find((x: { enrollment: { status: string } }) => x.enrollment.status === 'ACTIVE');
    const outline = await agent.get(`/api/classroom/courses/${active.course.id}/outline`);
    expect(outline.status).toBe(200);
    expect(outline.body.course.enforceSequence).toBe(true);
    const lessons = outline.body.modules.flatMap((m: { lessons: { id: number; status: string }[] }) => m.lessons);
    const locked = lessons.find((l: { status: string }) => l.status === 'locked');
    expect(locked).toBeDefined();
    const r = await agent.get(`/api/classroom/lessons/${locked.id}`);
    expect(r.status).toBe(423);
    expect(r.body.error.code).toBe('LOCKED');
  });

  it('devuelve navegación anterior/siguiente en una lección disponible', async () => {
    const { agent } = await agentFor('estudiante@cehacis.test');
    const courses = await agent.get('/api/classroom/my-courses');
    const active = courses.body.find((x: { enrollment: { status: string } }) => x.enrollment.status === 'ACTIVE');
    const outline = await agent.get(`/api/classroom/courses/${active.course.id}/outline`);
    const first = outline.body.modules[0].lessons[0];
    const r = await agent.get(`/api/classroom/lessons/${first.id}`);
    expect(r.status).toBe(200);
    expect(r.body.navigation.index).toBe(1);
    expect(r.body.navigation.prev).toBeNull();
    expect(r.body.navigation.total).toBeGreaterThan(1);
  });

  it('impide acceder a cursos en los que no está inscrito', async () => {
    const { agent } = await agentFor('estudiante3@cehacis.test');
    const oratoria = await prisma.course.findFirstOrThrow({ where: { code: 'CEH-001' } });
    const enrolled = await prisma.enrollment.findFirst({ where: { courseId: oratoria.id, user: { email: 'estudiante3@cehacis.test' } } });
    if (enrolled) return;
    const r = await agent.get(`/api/classroom/courses/${oratoria.id}/outline`);
    expect(r.status).toBe(403);
  });
});

describe('Comercial (entorno sandbox) y certificados', () => {
  it('cotiza aplicando el cupón de prueba', async () => {
    const { agent, csrf } = await agentFor('estudiante3@cehacis.test');
    const course = await prisma.course.findFirstOrThrow({ where: { code: 'CEH-001' } });
    const r = await agent.post('/api/commerce/checkout/quote').set('x-csrf-token', csrf).send({ items: [{ type: 'COURSE', id: course.id }], couponCode: 'PRUEBA10' });
    expect(r.status).toBe(200);
    expect(r.body.discount).toBeCloseTo(Number(course.price) * 0.1, 2);
  });

  it('verifica públicamente un certificado emitido', async () => {
    const cert = await prisma.certificate.findFirstOrThrow({ where: { status: 'VALID' } });
    const r = await request(app).get(`/api/certificates/verify/${cert.code}`);
    expect(r.status).toBe(200);
    expect(r.body.valid).toBe(true);
    const none = await request(app).get('/api/certificates/verify/CEH-0000-ZZZZZZ');
    expect(none.status).toBe(404);
  });

  it('el módulo de IA informa su estado sin exponer claves', async () => {
    const { agent } = await agentFor('estudiante@cehacis.test');
    const r = await agent.get('/api/ai/status');
    expect(r.status).toBe(200);
    expect(JSON.stringify(r.body)).not.toMatch(/sk-ant/);
  });
});
