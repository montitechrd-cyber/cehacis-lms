/**
 * Pruebas de integración de funcionalidades críticas (autenticación, RBAC, CSRF,
 * secuencia forzada del aula, flujo comercial sandbox y verificación de certificados).
 * Requieren la base de datos migrada y sembrada: `npm run db:seed`.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
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

describe('Regresiones de la revisión de plataforma', () => {
  const cookieVal = (res: { headers: Record<string, unknown> }, name: string) =>
    new RegExp(`${name}=([^;]+)`).exec(String(res.headers['set-cookie']))?.[1];

  it('responde 413 (no 500) a un JSON demasiado grande', async () => {
    const { agent, csrf } = await agentFor();
    const r = await agent.post('/api/auth/login').set('x-csrf-token', csrf).set('content-type', 'application/json').send(JSON.stringify({ email: 'a@b.c', password: 'x'.repeat(3 * 1024 * 1024) }));
    expect(r.status).toBe(413);
  });

  it('el webhook de la pasarela no queda bloqueado por CSRF', async () => {
    const r = await request(app).post('/api/commerce/webhook/azul').send({});
    expect(r.body?.error?.code).not.toBe('CSRF');
  });

  it('una carrera de refresh entre pestañas no cierra todas las sesiones', async () => {
    const { agent, csrf } = await agentFor();
    const login = await agent.post('/api/auth/login').set('x-csrf-token', csrf).send({ email: 'estudiante@cehacis.test', password: PASS });
    const oldRt = cookieVal(login, 'cehacis_rt')!;
    const first = await request(app).post('/api/auth/refresh').set('x-csrf-token', csrf).set('Cookie', `cehacis_csrf=${csrf}; cehacis_rt=${oldRt}`);
    expect(first.status).toBe(200);
    const newRt = cookieVal(first, 'cehacis_rt')!;
    const second = await request(app).post('/api/auth/refresh').set('x-csrf-token', csrf).set('Cookie', `cehacis_csrf=${csrf}; cehacis_rt=${oldRt}`);
    expect(second.status).toBe(200);
    const third = await request(app).post('/api/auth/refresh').set('x-csrf-token', csrf).set('Cookie', `cehacis_csrf=${csrf}; cehacis_rt=${newRt}`);
    expect(third.status).toBe(200);
  });

  it('reinicia el contador de intentos cuando el bloqueo ya expiró', async () => {
    const email = 'estudiante@cehacis.test';
    await prisma.user.update({ where: { email }, data: { failedLogins: 5, lockedUntil: new Date(Date.now() - 60_000) } });
    const { agent, csrf } = await agentFor();
    const r = await agent.post('/api/auth/login').set('x-csrf-token', csrf).send({ email, password: 'incorrecta1' });
    expect(r.status).toBe(401);
    const u = await prisma.user.findUniqueOrThrow({ where: { email } });
    expect(u.failedLogins).toBe(1);
    expect(u.lockedUntil).toBeNull();
    await prisma.user.update({ where: { email }, data: { failedLogins: 0, lockedUntil: null } });
  });

  it('la clasificación por curso exige pertenecer al curso', async () => {
    const student = await prisma.user.findUniqueOrThrow({ where: { email: 'estudiante@cehacis.test' } });
    const other = await prisma.course.findFirst({ where: { deletedAt: null, enrollments: { none: { userId: student.id } } } });
    if (!other) return;
    const { agent } = await agentFor('estudiante@cehacis.test');
    const r = await agent.get(`/api/gamification/leaderboard?courseId=${other.id}`);
    expect(r.status).toBe(403);
  });

  it('edita una escala de valoración sin etiquetas', async () => {
    const { agent, csrf } = await agentFor('superadmin@cehacis.test');
    const c = await agent.post('/api/competencies/scales').set('x-csrf-token', csrf).send({ name: `Escala prueba ${Date.now()}`, min: 1, max: 4 });
    expect(c.status).toBe(201);
    const p = await agent.patch(`/api/competencies/scales/${c.body.id}`).set('x-csrf-token', csrf).send({ name: 'Escala renombrada' });
    expect(p.status).toBe(200);
    await prisma.ratingScale.delete({ where: { id: c.body.id } });
  });
});

describe('Reglas de finalización del curso', async () => {
  const { evaluateCompletion, isLessonCompletable } = await import('../src/modules/classroom/classroom.service.js');
  let courseId = 0;
  let userId = 0;

  beforeAll(async () => {
    userId = (await prisma.user.findUniqueOrThrow({ where: { email: 'estudiante@cehacis.test' } })).id;
    const tag = Date.now().toString(36);
    const course = await prisma.course.create({
      data: { code: `T-${tag}`.slice(0, 20), title: 'Curso de prueba de finalización', slug: `prueba-fin-${tag}`, passingScore: 80, minAttendancePct: 0, requireAllLessons: true },
    });
    courseId = course.id;
    const mod = await prisma.courseModule.create({ data: { courseId, title: 'Módulo' } });
    await prisma.lesson.create({ data: { moduleId: mod.id, title: 'Lección' } });
    await prisma.enrollment.create({ data: { userId, courseId, status: 'ACTIVE', enrolledAt: new Date(Date.now() - 7 * 864e5) } });
  });

  afterAll(async () => {
    if (courseId) await prisma.course.delete({ where: { id: courseId } });
  });

  it('cuenta como 0 las evaluaciones ponderadas no presentadas y exige la nota mínima del curso', async () => {
    const quiz = await prisma.assessment.create({ data: { courseId, title: 'Quiz', type: 'QUIZ', weight: 40, isPublished: true } });
    const final = await prisma.assessment.create({ data: { courseId, title: 'Final', type: 'FINAL', weight: 60, passingScore: 50, isPublished: true } });
    await prisma.assessmentAttempt.create({ data: { assessmentId: final.id, userId, status: 'GRADED', percentage: 100, passed: true } });
    let st = (await evaluateCompletion(userId, courseId))!;
    expect(st.finals[0]!.met).toBe(true);
    expect(st.grade.value).toBe(60);
    expect(st.grade.met).toBe(false);
    await prisma.assessmentAttempt.create({ data: { assessmentId: quiz.id, userId, status: 'GRADED', percentage: 100, passed: true } });
    st = (await evaluateCompletion(userId, courseId))!;
    expect(st.grade.value).toBe(100);
    expect(st.grade.met).toBe(true);
  });

  it('deja la asistencia pendiente hasta que se registre y luego la exige', async () => {
    await prisma.course.update({ where: { id: courseId }, data: { minAttendancePct: 80 } });
    const ev = await prisma.event.create({
      data: { title: 'Clase', courseId, startAt: new Date(Date.now() - 2 * 3600e3), endAt: new Date(Date.now() - 3600e3) },
    });
    let st = (await evaluateCompletion(userId, courseId))!;
    expect(st.attendance.pendingRecord).toBe(1);
    expect(st.attendance.met).toBe(false);
    await prisma.attendance.create({ data: { eventId: ev.id, userId, status: 'ABSENT' } });
    st = (await evaluateCompletion(userId, courseId))!;
    expect(st.attendance.pct).toBe(0);
    expect(st.attendance.met).toBe(false);
    await prisma.attendance.update({ where: { eventId_userId: { eventId: ev.id, userId } }, data: { status: 'PRESENT' } });
    st = (await evaluateCompletion(userId, courseId))!;
    expect(st.attendance.met).toBe(true);
  });

  it('una entrega devuelta no cumple la regla de la lección', async () => {
    const act = await prisma.practicalActivity.create({ data: { courseId, title: 'Práctica', isPublished: true } });
    const mod = await prisma.courseModule.findFirstOrThrow({ where: { courseId } });
    const lesson = await prisma.lesson.create({ data: { moduleId: mod.id, title: 'Lección con práctica', completionRule: 'ACTIVITY', requiredActivityId: act.id } });
    const sub = await prisma.activitySubmission.create({ data: { activityId: act.id, userId, status: 'RETURNED' } });
    expect((await isLessonCompletable(userId, lesson.id)).ok).toBe(false);
    await prisma.activitySubmission.update({ where: { id: sub.id }, data: { status: 'SUBMITTED' } });
    expect((await isLessonCompletable(userId, lesson.id)).ok).toBe(true);
  });

  it('la pantalla de requisitos muestra la misma evaluación que aplica el cierre', async () => {
    const { agent } = await agentFor('estudiante@cehacis.test');
    const r = await agent.get(`/api/certificates/requirements/${courseId}`);
    expect(r.status).toBe(200);
    const st = (await evaluateCompletion(userId, courseId))!;
    expect(r.body.enrollment.grade).toEqual(st.grade);
    expect(r.body.enrollment.lessons).toEqual(st.lessons);
    expect(r.body.enrollment.attendance.met).toBe(st.attendance.met);
  });
});
