/**
 * Seed del LMS de CEHACIS.  Ejecutar:  cd server && npx tsx prisma/seed.ts
 *
 * Idempotente:
 *  - Datos de referencia (roles, permisos, competencias, escala, categorías, reglas de puntos, niveles,
 *    insignias, escenarios de IA, FAQ, plantilla de certificado, cupón de prueba, cursos) con upsert/get-or-create.
 *  - Contenido de los cursos publicados: solo si el curso aún no tiene módulos (transacción atómica).
 *  - Datos demo (estudiantes, inscripciones, pedidos sandbox, progreso, etc.): solo si NO existe el usuario
 *    estudiante@cehacis.test (transacción atómica).
 *
 * Decisiones documentadas:
 *  - NO se siembran planes de suscripción ni paquetes (bundles): no existe oferta comercial real definida.
 *  - Los precios de cursos no publicados quedan en 0 hasta que la dirección los confirme.
 *  - Se crean 5 eventos (2 pasados con asistencia, 3 futuros): cada curso publicado tiene una lección con
 *    recurso de sesión en vivo y necesita un evento futuro al que enlazarse.
 *  - Los eventos, el foro y los pedidos son de PRUEBA (sandbox). Los facilitadores demo tienen isPublic=false.
 */
import { PrismaClient, Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { PERMISSIONS, ROLE_DEFS } from '../src/config/permissions.js';
import type { CourseContent, QuestionDef } from './seed-data/types.js';
import { COMPETENCIES, SCALE_LABELS, SCENARIOS, FAQS, BADGES } from './seed-data/reference.js';
import { content as oratoria } from './seed-data/oratoria.js';
import { content as asertiva } from './seed-data/asertiva.js';
import { content as conflictos } from './seed-data/conflictos.js';
import { content as inteligenciaSocial } from './seed-data/inteligencia-social.js';

const prisma = new PrismaClient();
// Cliente activo: el cliente global o el de la transacción en curso.
let db: Prisma.TransactionClient = prisma as unknown as Prisma.TransactionClient;
const TX = { timeout: 600_000, maxWait: 30_000 };

const PASSWORD = process.env.SEED_PASSWORD || 'Cehacis2026!';
const DAY = 86_400_000;
const ago = (days: number) => new Date(Date.now() - days * DAY);
const ahead = (days: number, hour = 15) => {
  const d = new Date(Date.now() + days * DAY);
  d.setHours(hour, 0, 0, 0);
  return d;
};
const slugify = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const POINT_RULES: { event: string; name: string; points: number; dailyCap?: number }[] = [
  { event: 'LESSON_COMPLETED', name: 'Lección completada', points: 10 },
  { event: 'MODULE_COMPLETED', name: 'Módulo completado', points: 25 },
  { event: 'COURSE_COMPLETED', name: 'Curso completado', points: 100 },
  { event: 'ASSESSMENT_PASSED', name: 'Evaluación aprobada', points: 20 },
  { event: 'PERFECT_SCORE', name: 'Puntuación perfecta', points: 15 },
  { event: 'ACTIVITY_SUBMITTED', name: 'Actividad práctica entregada', points: 20 },
  { event: 'PEER_REVIEW_GIVEN', name: 'Evaluación entre compañeros realizada', points: 10 },
  { event: 'FORUM_POST', name: 'Participación en foro', points: 5, dailyCap: 25 },
  { event: 'SIMULATION_COMPLETED', name: 'Simulación con IA completada', points: 15 },
  { event: 'ATTENDANCE_PRESENT', name: 'Asistencia a sesión', points: 10 },
  { event: 'CHALLENGE_COMPLETED', name: 'Reto semanal completado', points: 50 },
  { event: 'RECOGNITION_RECEIVED', name: 'Reconocimiento recibido', points: 5 },
];
const LEVELS = [
  { number: 1, name: 'Oyente', minPoints: 0 },
  { number: 2, name: 'Interlocutor', minPoints: 100 },
  { number: 3, name: 'Comunicador', minPoints: 300 },
  { number: 4, name: 'Orador', minPoints: 700 },
  { number: 5, name: 'Mentor', minPoints: 1500 },
  { number: 6, name: 'Maestro de la palabra', minPoints: 3000 },
];

// ───────────────────────────── 1-2. Roles, permisos, usuarios ─────────────────────────────
async function seedRoles() {
  for (const [key, desc] of Object.entries(PERMISSIONS)) {
    await prisma.permission.upsert({ where: { key }, update: { description: desc, module: key.split('.')[0]! }, create: { key, description: desc, module: key.split('.')[0]! } });
  }
  const perms = await prisma.permission.findMany();
  const permId = new Map(perms.map((p) => [p.key, p.id]));
  const roleId: Record<string, number> = {};
  for (const [key, def] of Object.entries(ROLE_DEFS)) {
    const role = await prisma.role.upsert({ where: { key }, update: { name: def.name, description: def.description }, create: { key, name: def.name, description: def.description, isSystem: true } });
    roleId[key] = role.id;
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({ data: def.permissions.map((p) => ({ roleId: role.id, permissionId: permId.get(p)! })) });
  }
  return roleId;
}

async function seedStaff(roleId: Record<string, number>, hash: string) {
  const mk = async (email: string, first: string, last: string, role: string, extra: Prisma.UserCreateInput['instructor'] | undefined, phone?: string) =>
    prisma.user.upsert({
      where: { email },
      update: {},
      create: { email, passwordHash: hash, firstName: first, lastName: last, phone, roleId: roleId[role]!, status: 'ACTIVE', emailVerifiedAt: new Date(), instructor: extra },
    });
  const superadmin = await mk('superadmin@cehacis.test', 'Superadmin', 'Demo', 'SUPERADMIN', undefined);
  const academico = await mk('academico@cehacis.test', 'Académico', 'Demo', 'ACADEMIC_ADMIN', undefined);
  const facilitador = await mk('facilitador@cehacis.test', 'Facilitador', 'Demo', 'INSTRUCTOR', {
    create: { headline: 'Facilitador de comunicación y oratoria (perfil de demostración)', bio: 'Perfil de demostración para probar el rol de facilitador. No corresponde a una persona real.', specialties: ['Oratoria', 'Comunicación asertiva', 'Presencia escénica'], yearsExperience: 8, isPublic: false },
  });
  const facilitadora2 = await mk('facilitadora2@cehacis.test', 'Facilitadora', 'Demo', 'INSTRUCTOR', {
    create: { headline: 'Facilitadora en negociación y manejo de conflictos (perfil de demostración)', bio: 'Perfil de demostración para probar el rol de facilitador. No corresponde a una persona real.', specialties: ['Resolución de conflictos', 'Negociación', 'Inteligencia emocional'], yearsExperience: 10, isPublic: false },
  });
  return { superadmin, academico, facilitador, facilitadora2 };
}

// ───────────────────────────── Referencia académica / gamificación / IA ─────────────────────────────
async function seedReference() {
  const cats: Record<string, number> = {};
  for (const name of ['Comunicación', 'Habilidades blandas', 'Negociación', 'Lenguaje', 'Profesional', 'Valores']) {
    const c = await prisma.category.upsert({ where: { slug: slugify(name) }, update: {}, create: { name, slug: slugify(name) } });
    cats[name] = c.id;
  }
  let scale = await prisma.ratingScale.findFirst({ where: { name: 'Escala de dominio' } });
  if (!scale) scale = await prisma.ratingScale.create({ data: { name: 'Escala de dominio', min: 1, max: 5, labels: SCALE_LABELS } });
  const comp: Record<string, number> = {};
  for (const c of COMPETENCIES) {
    const r = await prisma.competency.upsert({
      where: { key: c.key }, update: {},
      create: { key: c.key, name: c.name, description: c.description, group: c.group, scaleId: scale.id },
    });
    comp[c.key] = r.id;
  }
  for (const r of POINT_RULES) {
    await prisma.pointRule.upsert({ where: { event: r.event }, update: {}, create: { event: r.event, name: r.name, points: r.points, dailyCap: r.dailyCap ?? null } });
  }
  for (const l of LEVELS) await prisma.level.upsert({ where: { number: l.number }, update: {}, create: l });
  for (const b of BADGES) {
    await prisma.badge.upsert({
      where: { key: b.key }, update: {},
      create: { key: b.key, name: b.name, description: b.description, icon: b.icon, criteria: b.criteria, points: b.points, competencyId: b.competency ? comp[b.competency] : null },
    });
  }
  // Retos de la semana actual (lunes 00:00 → domingo 23:59:59)
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7), 0, 0, 0, 0);
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6, 23, 59, 59, 999);
  const challenges = [
    { title: 'Reto semanal: 5 lecciones', description: 'Completa 5 lecciones esta semana y suma puntos extra.', points: 60, criteria: { type: 'LESSONS_COMPLETED', target: 5 } },
    { title: 'Reto semanal: participa en la comunidad', description: 'Publica 3 mensajes en los foros esta semana.', points: 40, criteria: { type: 'FORUM_POSTS', target: 3 } },
  ];
  for (const ch of challenges) {
    const exists = await prisma.challenge.findFirst({ where: { title: ch.title, startsAt: { gte: start } } });
    if (!exists) await prisma.challenge.create({ data: { ...ch, startsAt: start, endsAt: end, isActive: true } });
  }
  // Escenarios de IA
  for (const s of SCENARIOS) {
    const sc = await prisma.aiScenario.upsert({
      where: { key: s.key }, update: {},
      create: { key: s.key, title: s.title, description: s.description, persona: s.persona, context: s.context, objectives: s.objectives, difficulty: s.difficulty, openingLine: s.openingLine },
    });
    await prisma.aiScenarioCompetency.createMany({ data: s.competencies.map((k) => ({ scenarioId: sc.id, competencyId: comp[k]! })), skipDuplicates: true });
  }
  // Plantilla de certificado
  let tpl = await prisma.certificateTemplate.findFirst({ where: { name: 'Institucional' } });
  if (!tpl) {
    tpl = await prisma.certificateTemplate.create({
      data: {
        name: 'Institucional', heading: 'Certificado de Aprobación',
        body: 'Se certifica que {nombre} completó satisfactoriamente el {curso}, con una duración de {horas} horas, cumpliendo los requisitos académicos establecidos por CEHACIS.',
        primaryColor: '#EE7A2F', signatureName: 'Dirección Académica', signatureTitle: 'CEHACIS', isDefault: true,
      },
    });
  }
  // Marca y FAQ
  const brand = {
    name: 'CEHACIS', legalName: 'Centro de Entrenamiento en Habilidades Comunicativas e Inteligencia Social',
    tagline: 'Transformamos tu voz, tu presencia y tu capacidad de conectar.', logoUrl: '/brand/logo-cehacis.png',
    primaryColor: '#EE7A2F', inkColor: '#141414', contactEmail: 'contacto@cehacis.com', contactPhone: '+1 849-535-0203',
    whatsapp: '18495350203', instagram: 'cehacis', address: '', currency: 'USD',
  };
  await prisma.setting.upsert({ where: { key: 'brand' }, update: {}, create: { key: 'brand', value: brand } });
  if ((await prisma.faq.count()) === 0) {
    await prisma.faq.createMany({ data: FAQS.map((f, i) => ({ ...f, order: i + 1 })) });
  }
  // Cupón de PRUEBA
  await prisma.coupon.upsert({
    where: { code: 'PRUEBA10' }, update: {},
    create: { code: 'PRUEBA10', description: 'Cupón de prueba para el entorno sandbox', type: 'PERCENT', value: 10, maxUses: 50, perUserLimit: 1 },
  });
  // Planes de suscripción y paquetes: intencionalmente NO se siembran (no hay oferta comercial real).
  return { cats, comp, scaleId: scale.id, templateId: tpl.id };
}

// ───────────────────────────── Cursos ─────────────────────────────
interface CourseDef {
  code: string; title: string; price: number; level: 'BASIC' | 'INTERMEDIATE' | 'ADVANCED'; status: 'PUBLISHED' | 'DRAFT' | 'IN_DEVELOPMENT';
  category: string; subtitle?: string; description: string; objectives?: string[]; audience?: string; requirements?: string;
  competencies?: string[]; enforceSequence?: boolean; instructor?: 'facilitador' | 'facilitadora2'; content?: CourseContent;
  imageUrl?: string;
}
const PENDING_REQ = 'Programa en desarrollo: completar temario, facilitador y precio.';
const COURSES: CourseDef[] = [
  {
    code: 'CEH-001', title: 'Curso de Oratoria', price: 89, level: 'BASIC', status: 'PUBLISHED', category: 'Comunicación', enforceSequence: true, instructor: 'facilitador',
    imageUrl: '/home/cursos/oratoria-portada.webp',
    subtitle: 'Domina el miedo escénico y comunica con seguridad, presencia y autenticidad',
    description: '¿Sientes que tienes buenas ideas, pero no siempre logras expresarlas como deseas? Este curso está diseñado para que manejes el miedo escénico, estructures tus mensajes con claridad y comuniques con seguridad, presencia y autenticidad.',
    objectives: ['Dominar los nervios y la ansiedad al hablar', 'Proyectar tu voz y lenguaje corporal con confianza', 'Organizar ideas y discursos de forma clara y persuasiva', 'Comunicarte con naturalidad en presentaciones, reuniones o eventos'],
    competencies: ['oratoria', 'comunicacion_verbal', 'comunicacion_no_verbal', 'expresion_corporal', 'persuasion'], content: oratoria,
  },
  {
    code: 'CEH-002', title: 'Curso de Comunicación Asertiva', price: 89, level: 'BASIC', status: 'PUBLISHED', category: 'Habilidades blandas', enforceSequence: true, instructor: 'facilitador',
    imageUrl: '/home/cursos/comunicacion-asertiva.webp',
    subtitle: 'Di lo que piensas desde el respeto y la empatía',
    description: 'Comunicar no es solo hablar, es saber decir lo que piensas desde el respeto y la empatía. Este curso te ayudará a desarrollar una comunicación clara, empática y firme, tanto en el ámbito personal como profesional. Incluye ejercicios prácticos y ejemplos reales.',
    objectives: ['Expresar opiniones y emociones sin culpa ni agresividad', 'Decir "no" de manera respetuosa y segura', 'Mejorar tus relaciones interpersonales'],
    competencies: ['asertividad', 'empatia', 'comunicacion_verbal', 'relaciones_interpersonales', 'inteligencia_emocional'], content: asertiva,
  },
  {
    code: 'CEH-003', title: 'Curso de Resolución de Conflictos', price: 89, level: 'INTERMEDIATE', status: 'PUBLISHED', category: 'Negociación', enforceSequence: false, instructor: 'facilitadora2',
    imageUrl: '/home/cursos/resolucion-conflictos.webp',
    subtitle: 'Gestiona desacuerdos con inteligencia social',
    description: 'Los conflictos son inevitables, pero saber manejarlos marca la diferencia. Este curso te brinda herramientas prácticas para afrontar desacuerdos con madurez, diálogo y estrategias efectivas. Incluye casos prácticos.',
    objectives: ['Identificar el origen real de un conflicto', 'Manejar emociones en situaciones tensas', 'Aplicar técnicas de negociación y mediación'],
    audience: 'Ideal para líderes, equipos de trabajo, profesionales y personas que desean gestionar conflictos con inteligencia social.',
    competencies: ['resolucion_conflictos', 'negociacion', 'escucha_activa', 'inteligencia_emocional', 'conversaciones_dificiles'], content: conflictos,
  },
  {
    code: 'CEH-008', title: 'Curso de Inteligencia Social', price: 89, level: 'INTERMEDIATE', status: 'PUBLISHED', category: 'Habilidades blandas', enforceSequence: false, instructor: 'facilitador',
    imageUrl: '/home/cursos/inteligencia-social-curso.webp',
    description: 'Las relaciones se construyen leyendo bien a las personas y al contexto. Este curso te ayuda a interpretar señales sociales, conectar con empatía, generar confianza y colaborar mejor en tu trabajo y en tu vida personal. Incluye ejercicios prácticos y casos.',
    competencies: ['empatia', 'relaciones_interpersonales', 'escucha_activa', 'comunicacion_no_verbal', 'inteligencia_emocional'], content: inteligenciaSocial,
  },
  {
    code: 'CEH-004', title: 'Etiqueta y Urbanidad', price: 0, level: 'BASIC', status: 'DRAFT', category: 'Valores',
    subtitle: 'Etiqueta social y profesional',
    description: 'Normas de cortesía, protocolo y etiqueta profesional para desenvolverte con seguridad en cualquier entorno.',
    requirements: 'Pendiente: confirmar precio y temario con la dirección académica.',
  },
  { code: 'CEH-005', title: 'Inteligencia Emocional Aplicada', price: 0, level: 'INTERMEDIATE', status: 'IN_DEVELOPMENT', category: 'Habilidades blandas', description: 'Herramientas prácticas para reconocer y regular tus emociones y aprovecharlas en tus relaciones personales y profesionales.', requirements: PENDING_REQ },
  { code: 'CEH-006', title: 'Liderazgo Comunicativo', price: 0, level: 'ADVANCED', status: 'IN_DEVELOPMENT', category: 'Profesional', description: 'Comunicación para inspirar, orientar y movilizar equipos con claridad y coherencia.', requirements: PENDING_REQ },
  { code: 'CEH-007', title: 'Negociación Estratégica', price: 0, level: 'ADVANCED', status: 'IN_DEVELOPMENT', category: 'Negociación', description: 'Preparación y conducción de negociaciones complejas orientadas a acuerdos de valor para ambas partes.', requirements: PENDING_REQ },
];

async function seedCourses(ref: Awaited<ReturnType<typeof seedReference>>, staff: Awaited<ReturnType<typeof seedStaff>>) {
  const out: Record<string, number> = {};
  for (const c of COURSES) {
    const base = {
      subtitle: c.subtitle ?? c.content?.subtitle ?? null, description: c.description, imageUrl: c.imageUrl ?? null,
      objectives: c.objectives ?? (c.content?.objectives ?? undefined),
      audience: c.audience ?? c.content?.audience ?? null,
      requirements: c.requirements ?? c.content?.requirements ?? null,
    };
    const course = await prisma.course.upsert({
      where: { code: c.code }, update: {},
      create: {
        code: c.code, title: c.title, slug: slugify(c.title), ...base, objectives: base.objectives as Prisma.InputJsonValue | undefined,
        categoryId: ref.cats[c.category], level: c.level, modality: 'VIRTUAL', durationHours: c.content?.durationHours ?? 0,
        price: c.price, currency: 'USD', isFree: false, status: c.status, enforceSequence: c.enforceSequence ?? false,
        passingScore: 70, certificateEnabled: true, certificateTemplateId: ref.templateId, createdById: staff.academico.id,
      },
    });
    out[c.code] = course.id;
    if (c.competencies) {
      await prisma.courseCompetency.createMany({ data: c.competencies.map((k) => ({ courseId: course.id, competencyId: ref.comp[k]! })), skipDuplicates: true });
    }
    if (c.instructor) {
      await prisma.courseInstructor.createMany({ data: [{ courseId: course.id, instructorId: staff[c.instructor].id, isLead: true }], skipDuplicates: true });
    }
    if (c.status === 'IN_DEVELOPMENT' && (await prisma.courseModule.count({ where: { courseId: course.id } })) === 0) {
      await prisma.courseModule.create({ data: { courseId: course.id, title: 'Módulo 1 (esqueleto)', description: 'Estructura pendiente de definir por la dirección académica.', order: 1, isPublished: false } });
    }
  }
  return out;
}

async function seedEventsAndForums(courseIds: Record<string, number>, staff: Awaited<ReturnType<typeof seedStaff>>) {
  const PENDING = 'Enlace de la sesión pendiente de publicar por el facilitador';
  const defs = [
    { title: 'Clase inaugural: Oratoria', code: 'CEH-001', days: -21, inst: staff.facilitador, desc: 'Sesión introductoria del curso de Oratoria.' },
    { title: 'Taller práctico de comunicación asertiva', code: 'CEH-002', days: -35, inst: staff.facilitador, desc: 'Taller de práctica de técnicas asertivas.' },
    { title: 'Taller en vivo: voz y presencia', code: 'CEH-001', days: 4, inst: staff.facilitador, desc: PENDING },
    { title: 'Sesión en vivo: práctica de asertividad', code: 'CEH-002', days: 8, inst: staff.facilitador, desc: PENDING },
    { title: 'Sesión en vivo: simulación de negociación', code: 'CEH-003', days: 12, inst: staff.facilitadora2, desc: PENDING },
    { title: 'Sesión en vivo: lectura de señales sociales', code: 'CEH-008', days: 15, inst: staff.facilitador, desc: PENDING },
  ];
  const events: Record<string, number> = {};
  for (const e of defs) {
    let ev = await prisma.event.findFirst({ where: { title: e.title } });
    if (!ev) {
      const startAt = e.days < 0 ? ago(-e.days) : ahead(e.days);
      startAt.setMinutes(0, 0, 0);
      ev = await prisma.event.create({
        data: {
          title: e.title, description: e.desc, type: 'VIRTUAL_CLASS', courseId: courseIds[e.code], instructorId: e.inst.id, createdById: e.inst.id,
          startAt, endAt: new Date(startAt.getTime() + 90 * 60_000), meetingUrl: null, meetingProvider: null, isPublic: false,
        },
      });
    }
    events[e.title] = ev.id;
  }
  const forums: Record<string, number> = {};
  for (const code of ['CEH-001', 'CEH-002', 'CEH-003', 'CEH-008']) {
    let f = await prisma.forum.findFirst({ where: { courseId: courseIds[code], type: 'COURSE' } });
    if (!f) f = await prisma.forum.create({ data: { title: 'Foro general del curso', type: 'COURSE', courseId: courseIds[code], description: undefined } });
    forums[code] = f.id;
  }
  let exp = await prisma.forum.findFirst({ where: { type: 'EXPERIENCES', courseId: null } });
  if (!exp) exp = await prisma.forum.create({ data: { title: 'Comparte tu experiencia', type: 'EXPERIENCES', description: 'Cuéntanos cómo estás aplicando lo aprendido en tu día a día.' } });
  return { events, forums, experiencesForumId: exp.id, futureEventByCode: { 'CEH-001': events['Taller en vivo: voz y presencia']!, 'CEH-002': events['Sesión en vivo: práctica de asertividad']!, 'CEH-003': events['Sesión en vivo: simulación de negociación']!, 'CEH-008': events['Sesión en vivo: lectura de señales sociales']! } as Record<string, number> };
}

// ───────────────────────────── Contenido de cursos ─────────────────────────────
async function addQuestions(assessmentId: number, qs: QuestionDef[], comp: Record<string, number>) {
  const typeMap = { MC: 'MULTIPLE_CHOICE', MS: 'MULTIPLE_SELECT', TF: 'TRUE_FALSE', OPEN: 'OPEN' } as const;
  for (let i = 0; i < qs.length; i++) {
    const q = qs[i]!;
    await db.question.create({
      data: {
        assessmentId, type: typeMap[q.type], text: q.text, explanation: q.explanation, points: q.points ?? (q.type === 'OPEN' ? 5 : 1), order: i + 1,
        competencyId: q.competency ? comp[q.competency] : null,
        options: q.options ? { create: q.options.map((o, j) => ({ text: o.text, isCorrect: o.correct, order: j + 1 })) } : undefined,
      },
    });
  }
}

async function addScale(assessmentId: number, items: { text: string; competency: string }[], comp: Record<string, number>) {
  for (let i = 0; i < items.length; i++) {
    await db.question.create({ data: { assessmentId, type: 'SCALE', text: items[i]!.text, points: 0, order: i + 1, scaleMax: 5, competencyId: comp[items[i]!.competency] } });
  }
}

async function buildCourseContent(courseId: number, title: string, c: CourseContent, o: { comp: Record<string, number>; scaleId: number; creatorId: number; forumId: number; eventId: number }) {
  // Rúbrica
  const rubric = await db.rubric.create({ data: { title: `Rúbrica — ${title}`, description: c.rubric.description, courseId, scaleId: o.scaleId, createdById: o.creatorId } });
  for (let i = 0; i < c.rubric.criteria.length; i++) {
    const cr = c.rubric.criteria[i]!;
    await db.rubricCriterion.create({
      data: {
        rubricId: rubric.id, title: cr.title, description: cr.description, competencyId: o.comp[cr.competency], weight: 1, maxScore: 5, order: i + 1,
        levels: { create: cr.levels.map((d, j) => ({ score: j + 1, label: SCALE_LABELS[j]!, description: d })) },
      },
    });
  }
  // Actividades
  const activityIds: number[] = [];
  for (const a of c.activities) {
    const act = await db.practicalActivity.create({
      data: {
        courseId, title: a.title, description: a.description, instructions: a.instructions, scenario: a.scenario,
        roles: a.roles ? a.roles.map((r) => ({ name: r.name, brief: r.description })) : undefined,
        type: a.type, submissionTypes: a.submissionTypes, dueDate: ahead(30), maxScore: a.maxScore, rubricId: rubric.id,
        peerReview: a.peerReview, peerReviewsRequired: a.peerReviewsRequired,
        competencies: { create: a.competencies.map((k) => ({ competencyId: o.comp[k]! })) },
      },
    });
    activityIds.push(act.id);
  }
  // Evaluaciones
  const diag = await db.assessment.create({ data: { courseId, title: 'Diagnóstico inicial', description: 'Autoevaluación para conocer tu punto de partida. No tiene calificación.', type: 'DIAGNOSTIC', maxAttempts: 1, passingScore: 0, weight: 0 } });
  await addScale(diag.id, c.diagnostic, o.comp);
  const quizIds: number[] = [];
  for (const m of c.modules) {
    const q = await db.assessment.create({ data: { courseId, title: m.quiz.title, description: m.quiz.description, type: 'QUIZ', maxAttempts: 3, passingScore: 70, weight: 10, shuffle: true } });
    await addQuestions(q.id, m.quiz.questions, o.comp);
    quizIds.push(q.id);
  }
  const fin = await db.assessment.create({ data: { courseId, title: 'Evaluación final', description: 'Evaluación final del curso. Incluye una pregunta abierta calificada por el facilitador.', type: 'FINAL', maxAttempts: 2, passingScore: 70, weight: 60, timeLimitMin: 45 } });
  await addQuestions(fin.id, c.finalExam, o.comp);
  const self = await db.assessment.create({ data: { courseId, title: 'Autoevaluación final', description: 'Reflexiona sobre tu avance y compáralo con tu diagnóstico inicial.', type: 'SELF_ASSESSMENT', maxAttempts: 1, passingScore: 0, weight: 0 } });
  await addScale(self.id, c.selfAssessment, o.comp);
  // Foro/estructura
  await db.forum.update({ where: { id: o.forumId }, data: { description: c.forumDescription } });
  // Módulos y lecciones
  let first = true;
  for (let mi = 0; mi < c.modules.length; mi++) {
    const m = c.modules[mi]!;
    const mod = await db.courseModule.create({ data: { courseId, title: m.title, description: m.description, order: mi + 1 } });
    for (let li = 0; li < m.lessons.length; li++) {
      const l = m.lessons[li]!;
      const gateA = l.completionRule === 'ASSESSMENT' ? quizIds[mi] : null;
      const gateAct = l.completionRule === 'ACTIVITY' ? activityIds[l.activityIndex ?? 0] : null;
      const lesson = await db.lesson.create({
        data: {
          moduleId: mod.id, title: l.title, summary: l.summary, content: l.content, order: li + 1, durationMin: l.durationMin,
          isPreview: first, completionRule: l.completionRule, requiredAssessmentId: gateA, requiredActivityId: gateAct,
        },
      });
      first = false;
      let ro = 0;
      const res = (d: Prisma.LessonResourceUncheckedCreateInput) => db.lessonResource.create({ data: { ...d, lessonId: lesson.id, order: ++ro } });
      for (const k of l.links ?? []) await res({ lessonId: lesson.id, type: 'LINK', title: k.title, description: k.description, url: k.url, isRequired: !!k.required, isDownloadable: false });
      if (gateA) {
        await res({ lessonId: lesson.id, type: 'ASSESSMENT', title: m.quiz.title, assessmentId: gateA, isRequired: true });
        await db.assessment.update({ where: { id: gateA }, data: { lessonId: lesson.id } });
      }
      if (gateAct) {
        await res({ lessonId: lesson.id, type: 'ACTIVITY', title: c.activities[l.activityIndex ?? 0]!.title, activityId: gateAct, isRequired: true });
        await db.practicalActivity.update({ where: { id: gateAct }, data: { lessonId: lesson.id } });
      }
      if (l.forum) await res({ lessonId: lesson.id, type: 'FORUM', title: 'Foro general del curso', forumId: o.forumId });
      if (l.liveSession) await res({ lessonId: lesson.id, type: 'LIVE_SESSION', title: 'Sesión en vivo (enlace pendiente)', description: 'El facilitador publicará el enlace de la sesión antes de la fecha indicada en el calendario.', eventId: o.eventId, isDownloadable: false });
    }
  }
}

// ───────────────────────────── Demo: helpers ─────────────────────────────
const pts: Record<number, number> = {};
async function award(userId: number, event: string, ref: { type: string; id: number } | null, when: Date, reason?: string) {
  const rule = POINT_RULES.find((r) => r.event === event)!;
  await db.pointTransaction.create({ data: { userId, points: rule.points, event, reason: reason ?? rule.name, refType: ref?.type, refId: ref?.id, createdAt: when } });
  pts[userId] = (pts[userId] ?? 0) + rule.points;
}

type LoadedCourse = Awaited<ReturnType<typeof loadCourse>>;
async function loadCourse(code: string) {
  const course = await db.course.findUniqueOrThrow({
    where: { code },
    include: {
      modules: { orderBy: { order: 'asc' }, include: { lessons: { orderBy: { order: 'asc' } } } },
      assessments: { orderBy: { id: 'asc' }, include: { questions: { orderBy: { order: 'asc' }, include: { options: { orderBy: { order: 'asc' } } } } } },
      activities: { orderBy: { id: 'asc' }, include: { rubric: { include: { criteria: { orderBy: { order: 'asc' } } } } } },
      forums: true,
    },
  });
  return course;
}

async function makeAttempt(a: LoadedCourse['assessments'][number], userId: number, when: Date, opt: { wrong?: number[]; scale?: number[]; graderId?: number; openScore?: number } = {}) {
  const attempt = await db.assessmentAttempt.create({ data: { assessmentId: a.id, userId, status: 'IN_PROGRESS', startedAt: new Date(when.getTime() - 12 * 60_000) } });
  let score = 0, max = 0;
  const isScale = a.type === 'DIAGNOSTIC' || a.type === 'SELF_ASSESSMENT';
  for (let i = 0; i < a.questions.length; i++) {
    const q = a.questions[i]!;
    if (q.type === 'SCALE') {
      await db.attemptAnswer.create({ data: { attemptId: attempt.id, questionId: q.id, scaleValue: opt.scale?.[i] ?? 3 } });
      continue;
    }
    max += q.points;
    if (q.type === 'OPEN') {
      const got = opt.openScore ?? Math.round(q.points * 0.8);
      score += got;
      await db.attemptAnswer.create({
        data: { attemptId: attempt.id, questionId: q.id, textAnswer: 'En la situación planteada, primero aplicaría lo aprendido en el curso: prepararía mi mensaje, cuidaría el tono y los gestos, y cerraría confirmando que la otra persona comprendió y está de acuerdo con los siguientes pasos.', pointsAwarded: got, feedback: 'Buena aplicación del contenido; podrías incluir un ejemplo más concreto.' },
      });
      continue;
    }
    const wrong = opt.wrong?.includes(i);
    const correct = q.options.filter((o) => o.isCorrect);
    const incorrect = q.options.filter((o) => !o.isCorrect);
    const selected = wrong ? [incorrect[0]!] : correct;
    const awarded = wrong ? 0 : q.points;
    score += awarded;
    await db.attemptAnswer.create({ data: { attemptId: attempt.id, questionId: q.id, selectedOptionIds: selected.map((s) => s.id), isCorrect: !wrong, pointsAwarded: awarded } });
  }
  const pct = max > 0 ? Math.round((score / max) * 10000) / 100 : null;
  const passed = isScale ? null : pct != null && pct >= a.passingScore;
  await db.assessmentAttempt.update({
    where: { id: attempt.id },
    data: { status: 'GRADED', submittedAt: when, score: isScale ? null : score, maxScore: isScale ? null : max, percentage: pct, passed, gradedById: opt.graderId ?? null, feedback: opt.graderId ? 'Buen trabajo. Revisa los comentarios de la pregunta abierta.' : null },
  });
  return { id: attempt.id, passed: !!passed, pct: pct ?? 0 };
}

async function recordScaleCompetencies(userId: number, courseId: number, a: LoadedCourse['assessments'][number], attemptId: number, values: number[], when: Date) {
  for (let i = 0; i < a.questions.length; i++) {
    const q = a.questions[i]!;
    if (!q.competencyId) continue;
    await db.studentCompetency.create({ data: { userId, competencyId: q.competencyId, courseId, score: values[i] ?? 3, scaleMax: 5, source: 'SELF', sourceRefId: attemptId, notes: a.title, recordedAt: when } });
  }
}

/** Marca como completadas las primeras n lecciones del curso, con gating coherente y puntos. */
async function progressLessons(userId: number, course: LoadedCourse, n: number, startAgo: number, endAgo: number, instructorId: number) {
  const flat = course.modules.flatMap((m) => m.lessons.map((l) => ({ ...l, moduleId: m.id })));
  const done = new Set<number>();
  let lastDate = ago(startAgo);
  for (let i = 0; i < n; i++) {
    const l = flat[i]!;
    const t = n === 1 ? endAgo : startAgo - 1 - ((startAgo - 1 - endAgo) * i) / (n - 1);
    const date = ago(t);
    lastDate = date;
    if (l.completionRule === 'ASSESSMENT' && l.requiredAssessmentId) {
      const a = course.assessments.find((x) => x.id === l.requiredAssessmentId)!;
      const at = await makeAttempt(a, userId, new Date(date.getTime() - 30 * 60_000), { wrong: a.id % 2 ? [0] : [] });
      await award(userId, 'ASSESSMENT_PASSED', { type: 'ASSESSMENT', id: a.id }, new Date(date.getTime() - 30 * 60_000));
      if (at.pct === 100) await award(userId, 'PERFECT_SCORE', { type: 'ASSESSMENT', id: a.id }, new Date(date.getTime() - 30 * 60_000));
    }
    if (l.completionRule === 'ACTIVITY' && l.requiredActivityId) {
      const act = course.activities.find((x) => x.id === l.requiredActivityId)!;
      const sub = await db.activitySubmission.create({
        data: {
          activityId: act.id, userId, text: 'Entrega de práctica: apliqué la estructura trabajada en el curso, ensayé en voz alta y ajusté el mensaje según la retroalimentación recibida.',
          status: 'GRADED', score: 85, submittedAt: new Date(date.getTime() - 60 * 60_000), gradedAt: date, gradedById: instructorId,
        },
      });
      const fb = await db.feedback.create({ data: { target: 'SUBMISSION', submissionId: sub.id, authorId: instructorId, studentId: userId, comment: 'Buena entrega: se nota la práctica. Sigue trabajando la naturalidad.', observations: 'Estructura clara y buen manejo del tiempo.', recommendations: 'Graba y revisa tu entrega antes de enviarla.', totalScore: 85, createdAt: date } });
      for (const cr of act.rubric?.criteria ?? []) await db.rubricScore.create({ data: { feedbackId: fb.id, criterionId: cr.id, score: 4 } });
      await award(userId, 'ACTIVITY_SUBMITTED', { type: 'ACTIVITY', id: act.id }, new Date(date.getTime() - 60 * 60_000));
    }
    await db.lessonProgress.create({
      data: { userId, lessonId: l.id, status: 'COMPLETED', firstViewAt: new Date(date.getTime() - 3_600_000), lastViewAt: date, completedAt: date, timeSpentSec: l.durationMin * 60 },
    });
    await award(userId, 'LESSON_COMPLETED', { type: 'LESSON', id: l.id }, date);
    done.add(l.id);
  }
  for (const m of course.modules) {
    if (m.lessons.length && m.lessons.every((l) => done.has(l.id))) {
      await award(userId, 'MODULE_COMPLETED', { type: 'MODULE', id: m.id }, lastDate);
    }
  }
  if (n < flat.length) {
    await db.lessonProgress.create({ data: { userId, lessonId: flat[n]!.id, status: 'IN_PROGRESS', firstViewAt: ago(endAgo), lastViewAt: ago(endAgo), timeSpentSec: 120 } });
  }
  return { lastLessonId: flat[Math.max(0, Math.min(n, flat.length - 1))]!.id, pct: Math.round((n / flat.length) * 100), flat, lastDate };
}

let orderSeq = 0;
async function makeOrder(userId: number, name: string, course: LoadedCourse, daysAgo: number) {
  orderSeq++;
  const when = ago(daysAgo);
  const ymd = when.toISOString().slice(0, 10).replace(/-/g, '');
  const price = Number(course.price);
  const order = await db.order.create({
    data: {
      number: `ORD-${ymd}-${String(orderSeq).padStart(4, '0')}`, userId, status: 'PAID', subtotal: price, discount: 0, tax: 0, total: price, currency: 'USD',
      provider: 'SANDBOX', notes: 'Pedido de prueba (sandbox). No representa un cobro real.', createdAt: when, paidAt: when,
      items: { create: [{ itemType: 'COURSE', courseId: course.id, description: course.title, unitPrice: price, quantity: 1, total: price }] },
      payments: { create: [{ provider: 'SANDBOX', providerRef: `SBX-${ymd}-${orderSeq}`, amount: price, currency: 'USD', status: 'APPROVED', isTest: true, method: 'SANDBOX_CARD', createdAt: when }] },
    },
    include: { items: true },
  });
  await db.invoice.create({
    data: { number: `FAC-${String(orderSeq).padStart(6, '0')}`, orderId: order.id, userId, billingName: name, subtotal: price, discount: 0, tax: 0, total: price, currency: 'USD', isTest: true, issuedAt: when },
  });
  return order.items[0]!.id;
}

async function enroll(userId: number, course: LoadedCourse, orderItemId: number, daysAgo: number, extra: Partial<Prisma.EnrollmentUncheckedCreateInput> = {}) {
  return db.enrollment.create({ data: { userId, courseId: course.id, status: 'ACTIVE', source: 'PURCHASE', orderItemId, enrolledAt: ago(daysAgo), ...extra } });
}

const certCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `CEH-${new Date().getFullYear()}-${s}`;
};

// ───────────────────────────── Demo de operación ─────────────────────────────
async function seedDemo(roleId: Record<string, number>, hash: string, staff: Awaited<ReturnType<typeof seedStaff>>, ref: Awaited<ReturnType<typeof seedReference>>, ev: Awaited<ReturnType<typeof seedEventsAndForums>>) {
  const mkStudent = (email: string, n: number, occupation: string) =>
    db.user.create({
      data: {
        email, passwordHash: hash, firstName: 'Estudiante', lastName: `Demo ${n}`, roleId: roleId.STUDENT!, status: 'ACTIVE', emailVerifiedAt: new Date(),
        student: { create: { occupation, city: 'Santo Domingo', country: 'República Dominicana', bio: 'Perfil de demostración.' } },
      },
    });
  const s1 = await mkStudent('estudiante@cehacis.test', 1, 'Analista administrativa');
  const s2 = await mkStudent('estudiante2@cehacis.test', 2, 'Asistente de ventas');
  const s3 = await mkStudent('estudiante3@cehacis.test', 3, 'Supervisor de operaciones');
  const fac = staff.facilitador.id, fac2 = staff.facilitadora2.id;

  const cOra = await loadCourse('CEH-001');
  const cAse = await loadCourse('CEH-002');
  const cCon = await loadCourse('CEH-003');
  const typed = (c: LoadedCourse, t: string) => c.assessments.filter((a) => a.type === t);

  // ── Estudiante 1 · Asertiva (completada) ──
  const itemAse = await makeOrder(s1.id, 'Estudiante Demo 1', cAse, 90);
  const eAse = await enroll(s1.id, cAse, itemAse, 90);
  const diagAse = typed(cAse, 'DIAGNOSTIC')[0]!;
  const dvA = [2, 3, 2, 3, 2];
  const dAtt = await makeAttempt(diagAse, s1.id, ago(89), { scale: dvA });
  await recordScaleCompetencies(s1.id, cAse.id, diagAse, dAtt.id, dvA, ago(89));
  const pAse = await progressLessons(s1.id, cAse, cAse.modules.flatMap((m) => m.lessons).length, 88, 24, fac);
  const finAse = typed(cAse, 'FINAL')[0]!;
  await makeAttempt(finAse, s1.id, ago(22), { wrong: [1], openScore: 4, graderId: fac });
  await award(s1.id, 'ASSESSMENT_PASSED', { type: 'ASSESSMENT', id: finAse.id }, ago(22));
  const selfAse = typed(cAse, 'SELF_ASSESSMENT')[0]!;
  const svA = [4, 4, 4, 5, 4];
  const sAtt = await makeAttempt(selfAse, s1.id, ago(21), { scale: svA });
  await recordScaleCompetencies(s1.id, cAse.id, selfAse, sAtt.id, svA, ago(21));
  const asertividadId = ref.comp.asertividad!, empatiaId = ref.comp.empatia!;
  await db.studentCompetency.createMany({
    data: [
      { userId: s1.id, competencyId: asertividadId, courseId: cAse.id, score: 4.2, source: 'INSTRUCTOR', evaluatorId: fac, notes: 'Dominio sólido de las técnicas asertivas en el juego de roles.', recordedAt: ago(20) },
      { userId: s1.id, competencyId: empatiaId, courseId: cAse.id, score: 4.0, source: 'INSTRUCTOR', evaluatorId: fac, notes: 'Muestra empatía y escucha en sus intervenciones.', recordedAt: ago(20) },
    ],
  });
  await db.enrollment.update({ where: { id: eAse.id }, data: { status: 'COMPLETED', progressPct: 100, finalGrade: 88, completedAt: ago(20), lastLessonId: pAse.flat.at(-1)!.id } });
  await award(s1.id, 'COURSE_COMPLETED', { type: 'COURSE', id: cAse.id }, ago(20));
  await db.certificate.create({
    data: {
      code: certCode(), userId: s1.id, courseId: cAse.id, templateId: ref.templateId, recipientName: 'Estudiante Demo 1',
      title: cAse.title, hours: cAse.durationHours, finalGrade: 88, status: 'VALID', issuedAt: ago(20),
    },
  });

  // ── Estudiante 1 · Oratoria (activa, ~40 %) ──
  const itemOra = await makeOrder(s1.id, 'Estudiante Demo 1', cOra, 58);
  const nOra = Math.round(cOra.modules.flatMap((m) => m.lessons).length * 0.4);
  const eOra = await enroll(s1.id, cOra, itemOra, 58);
  const diagOra = typed(cOra, 'DIAGNOSTIC')[0]!;
  const dvO = [2, 3, 2, 3, 2];
  const dOAtt = await makeAttempt(diagOra, s1.id, ago(57), { scale: dvO });
  await recordScaleCompetencies(s1.id, cOra.id, diagOra, dOAtt.id, dvO, ago(57));
  const oratoriaId = ref.comp.oratoria!;
  await db.studentCompetency.createMany({
    data: [
      { userId: s1.id, competencyId: oratoriaId, courseId: cOra.id, score: 2.0, source: 'INSTRUCTOR', evaluatorId: fac, notes: 'Punto de partida: mucha tensión al iniciar y ritmo acelerado.', recordedAt: ago(45) },
      { userId: s1.id, competencyId: oratoriaId, courseId: cOra.id, score: 2.8, source: 'INSTRUCTOR', evaluatorId: fac, notes: 'Mejor control de la respiración; trabajar pausas.', recordedAt: ago(25) },
      { userId: s1.id, competencyId: oratoriaId, courseId: cOra.id, score: 3.4, source: 'INSTRUCTOR', evaluatorId: fac, notes: 'Apertura más segura y mejor estructura del mensaje.', recordedAt: ago(5) },
    ],
  });
  const pOra = await progressLessons(s1.id, cOra, nOra, 56, 3, fac);
  await db.enrollment.update({ where: { id: eOra.id }, data: { progressPct: pOra.pct, lastLessonId: pOra.lastLessonId } });

  // ── Estudiante 2 · Oratoria (10 %) y Conflictos ──
  const itemOra2 = await makeOrder(s2.id, 'Estudiante Demo 2', cOra, 20);
  const eOra2 = await enroll(s2.id, cOra, itemOra2, 20);
  const pOra2 = await progressLessons(s2.id, cOra, 1, 19, 6, fac);
  await db.enrollment.update({ where: { id: eOra2.id }, data: { progressPct: Math.max(pOra2.pct, 8), lastLessonId: pOra2.lastLessonId } });
  const itemCon2 = await makeOrder(s2.id, 'Estudiante Demo 2', cCon, 15);
  await enroll(s2.id, cCon, itemCon2, 15, { progressPct: 0 });

  // ── Estudiante 3 · Conflictos con entrega pendiente ──
  const itemCon3 = await makeOrder(s3.id, 'Estudiante Demo 3', cCon, 12);
  await enroll(s3.id, cCon, itemCon3, 12, { progressPct: 0 });
  const actNeg = cCon.activities[0]!;
  await db.activitySubmission.create({
    data: {
      activityId: actNeg.id, userId: s3.id, status: 'SUBMITTED', submittedAt: ago(1),
      text: 'Mi plan de negociación: intereses de ambas partes, alternativa si no hay acuerdo (MAAN), concesiones posibles y propuesta de cierre con fechas verificables.',
    },
  });
  await award(s3.id, 'ACTIVITY_SUBMITTED', { type: 'ACTIVITY', id: actNeg.id }, ago(1));

  // ── Eventos: participantes y asistencia ──
  const e1 = ev.events['Clase inaugural: Oratoria']!, e2 = ev.events['Taller práctico de comunicación asertiva']!;
  await db.eventParticipant.createMany({ data: [{ eventId: e1, userId: s1.id }, { eventId: e1, userId: s2.id }, { eventId: e2, userId: s1.id }], skipDuplicates: true });
  await db.attendance.createMany({
    data: [
      { eventId: e1, userId: s1.id, status: 'PRESENT', recordedById: fac, recordedAt: ago(21) },
      { eventId: e1, userId: s2.id, status: 'LATE', notes: 'Se unió a los 15 minutos', recordedById: fac, recordedAt: ago(21) },
      { eventId: e2, userId: s1.id, status: 'PRESENT', recordedById: fac, recordedAt: ago(35) },
    ],
  });
  await award(s1.id, 'ATTENDANCE_PRESENT', { type: 'EVENT', id: e1 }, ago(21));
  await award(s1.id, 'ATTENDANCE_PRESENT', { type: 'EVENT', id: e2 }, ago(35));

  // ── Foro de Oratoria: hilo con 3 respuestas ──
  const forumOra = ev.forums['CEH-001']!;
  const thread = await db.forumThread.create({ data: { forumId: forumOra, authorId: s1.id, title: '¿Cómo controlo los nervios en los primeros 30 segundos?', createdAt: ago(6), lastPostAt: ago(5) } });
  const root = await db.forumPost.create({ data: { threadId: thread.id, authorId: s1.id, content: 'Al empezar a hablar siento que se me acelera el corazón y se me olvida el inicio. ¿Qué hacen ustedes para arrancar con calma?', createdAt: ago(6) } });
  const r1 = await db.forumPost.create({ data: { threadId: thread.id, authorId: fac, parentId: root.id, content: 'Buena pregunta. Memoriza solo tu primera frase, respira antes de hablar y haz una pausa de dos segundos al empezar. Esa pausa te da control y proyecta seguridad.', createdAt: new Date(ago(6).getTime() + 3 * 3_600_000) } });
  const r2 = await db.forumPost.create({ data: { threadId: thread.id, authorId: s2.id, parentId: root.id, content: 'A mí me ayudó ensayar el inicio en voz alta varias veces, de pie, como si ya estuviera frente al público.', createdAt: ago(5.5) } });
  const r3 = await db.forumPost.create({ data: { threadId: thread.id, authorId: s1.id, parentId: r1.id, content: '¡Gracias! Probaré la pausa de dos segundos y les cuento cómo me va en mi próxima práctica.', createdAt: ago(5) } });
  void r2; void r3;
  await award(s1.id, 'FORUM_POST', { type: 'FORUM_POST', id: root.id }, ago(6));
  await award(s2.id, 'FORUM_POST', { type: 'FORUM_POST', id: r2.id }, ago(5.5));
  await award(s1.id, 'FORUM_POST', { type: 'FORUM_POST', id: r3.id }, ago(5));
  await db.recognition.create({ data: { fromId: s2.id, toId: s1.id, kind: 'Gran aporte', message: 'Gracias por compartir tu duda en el foro: a varios nos ayudó la respuesta.', createdAt: ago(4) } });
  await award(s1.id, 'RECOGNITION_RECEIVED', null, ago(4));

  // ── Anuncios ──
  await db.announcement.create({
    data: {
      title: 'Bienvenidos al nuevo campus virtual de CEHACIS', audience: 'ALL', authorId: staff.superadmin.id, isPinned: true, publishedAt: ago(30),
      body: 'Estrenamos nuestro campus virtual. Aquí encontrarás tus cursos, evaluaciones, calendario y comunidad. Si tienes dudas, escríbenos a contacto@cehacis.com o por WhatsApp al +1 849-535-0203.',
    },
  });
  await db.announcement.create({
    data: {
      title: 'Oratoria: próximo taller en vivo', audience: 'COURSE', courseId: cOra.id, authorId: fac, publishedAt: ago(2),
      body: 'Este es un aviso del curso de Oratoria: revisa el calendario del campus para ver la fecha del próximo taller en vivo. El enlace de la sesión se publicará allí antes de comenzar.',
    },
  });

  // ── Conversación estudiante ↔ facilitador ──
  const conv = await db.conversation.create({
    data: { subject: 'Duda sobre el discurso de 2 minutos', participants: { create: [{ userId: s1.id, lastReadAt: ago(1) }, { userId: fac }] } },
  });
  await db.message.createMany({
    data: [
      { conversationId: conv.id, senderId: s1.id, body: 'Hola, profe. ¿El discurso de 2 minutos puede ser sobre un tema de mi trabajo?', createdAt: ago(3) },
      { conversationId: conv.id, senderId: fac, body: 'Claro que sí. Elige un tema que conozcas bien, estructura tu mensaje en inicio, desarrollo y cierre, y cuida el tiempo.', createdAt: new Date(ago(3).getTime() + 2 * 3_600_000) },
      { conversationId: conv.id, senderId: s1.id, body: '¡Perfecto, gracias! Lo grabo esta semana.', createdAt: ago(2) },
    ],
  });

  // ── Notificaciones ──
  await db.notification.createMany({
    data: [
      { userId: s1.id, type: 'ANNOUNCEMENT', title: 'Bienvenidos al nuevo campus virtual de CEHACIS', link: '/campus', readAt: ago(29), createdAt: ago(30) },
      { userId: s1.id, type: 'CERTIFICATE', title: 'Tu certificado está disponible', body: cAse.title, link: '/campus/certificados', readAt: ago(19), createdAt: ago(20) },
      { userId: s1.id, type: 'MESSAGE', title: 'Nuevo mensaje de Facilitador Demo', link: '/campus/mensajes', createdAt: new Date(ago(3).getTime() + 2 * 3_600_000) },
      { userId: s2.id, type: 'ENROLLMENT', title: 'Inscripción confirmada', body: cCon.title, link: '/campus/cursos', readAt: ago(14), createdAt: ago(15) },
      { userId: s2.id, type: 'EVENT', title: 'Próxima sesión en vivo', body: 'Revisa el calendario del campus.', link: '/campus/calendario', createdAt: ago(1) },
      { userId: s3.id, type: 'ENROLLMENT', title: 'Inscripción confirmada', body: cCon.title, link: '/campus/cursos', readAt: ago(11), createdAt: ago(12) },
      { userId: fac2, type: 'SUBMISSION', title: 'Nueva entrega pendiente de calificar', body: 'Estudiante Demo 3 · ' + actNeg.title, link: '/admin/actividades', createdAt: ago(1) },
    ],
  });

  // ── Puntos, nivel e insignias coherentes con las transacciones ──
  const levels = await db.level.findMany({ orderBy: { minPoints: 'asc' } });
  for (const u of [s1, s2, s3]) {
    const total = pts[u.id] ?? 0;
    const level = [...levels].reverse().find((l) => l.minPoints <= total);
    await db.studentProfile.update({ where: { userId: u.id }, data: { points: total, levelId: level?.id ?? null } });
    await evaluateBadgesSeed(u.id);
  }
  return { s1, s2, s3 };
}

async function evaluateBadgesSeed(userId: number) {
  const badges = await db.badge.findMany({ where: { isActive: true } });
  const profile = await db.studentProfile.findUnique({ where: { userId } });
  const m: Record<string, number> = {
    POINTS: profile?.points ?? 0,
    COURSES_COMPLETED: await db.enrollment.count({ where: { userId, status: 'COMPLETED' } }),
    LESSONS_COMPLETED: await db.lessonProgress.count({ where: { userId, status: 'COMPLETED' } }),
    SIMULATIONS_COMPLETED: await db.aiSimulation.count({ where: { userId, status: 'COMPLETED' } }),
    FORUM_POSTS: await db.forumPost.count({ where: { authorId: userId } }),
    CERTIFICATES: await db.certificate.count({ where: { userId, status: 'VALID' } }),
  };
  for (const b of badges) {
    const c = b.criteria as { type: string; min: number };
    let v = m[c.type] ?? 0;
    if (c.type === 'COMPETENCY_SCORE' && b.competencyId) {
      const last = await db.studentCompetency.findFirst({ where: { userId, competencyId: b.competencyId, isReviewed: true }, orderBy: { recordedAt: 'desc' } });
      v = last ? Number(last.score) : 0;
    }
    if (v >= c.min) await db.achievement.create({ data: { userId, badgeId: b.id, awardedAt: ago(1) } }).catch(() => null);
  }
}

// ───────────────────────────── main ─────────────────────────────
async function main() {
  console.log('Sembrando base de datos de CEHACIS…');
  const hash = await bcrypt.hash(PASSWORD, 12);
  const roleId = await seedRoles();
  const staff = await seedStaff(roleId, hash);
  const ref = await seedReference();
  const courseIds = await seedCourses(ref, staff);
  const ev = await seedEventsAndForums(courseIds, staff);

  // Contenido de los cursos publicados (solo si aún no tienen módulos)
  for (const c of COURSES.filter((x) => x.content)) {
    const id = courseIds[c.code]!;
    if ((await prisma.courseModule.count({ where: { courseId: id } })) > 0) { console.log(`  · ${c.code} ya tiene contenido, se omite.`); continue; }
    await prisma.$transaction(async (tx) => {
      db = tx;
      await buildCourseContent(id, c.title, c.content!, { comp: ref.comp, scaleId: ref.scaleId, creatorId: staff.academico.id, forumId: ev.forums[c.code]!, eventId: ev.futureEventByCode[c.code]! });
    }, TX).finally(() => { db = prisma as unknown as Prisma.TransactionClient; });
    console.log(`  · ${c.code} contenido creado.`);
  }

  // Datos demo
  if (await prisma.user.findUnique({ where: { email: 'estudiante@cehacis.test' } })) {
    console.log('  · Datos demo ya existentes, se omiten.');
  } else {
    await prisma.$transaction(async (tx) => {
      db = tx;
      await seedDemo(roleId, hash, staff, ref, ev);
    }, TX).finally(() => { db = prisma as unknown as Prisma.TransactionClient; });
    console.log('  · Datos demo creados.');
  }

  const counts = {
    roles: await prisma.role.count(), permisos: await prisma.permission.count(), usuarios: await prisma.user.count(), competencias: await prisma.competency.count(),
    cursos: await prisma.course.count(), modulos: await prisma.courseModule.count(), lecciones: await prisma.lesson.count(), evaluaciones: await prisma.assessment.count(),
    preguntas: await prisma.question.count(), actividades: await prisma.practicalActivity.count(), insignias: await prisma.badge.count(), escenarios_ia: await prisma.aiScenario.count(),
    faqs: await prisma.faq.count(), eventos: await prisma.event.count(), pedidos: await prisma.order.count(),
  };
  console.log('\nResumen:');
  console.table(counts);
  // Con SEED_PASSWORD (producción) la contraseña no se imprime en los logs.
  const shownPassword = process.env.SEED_PASSWORD ? '(definida en SEED_PASSWORD)' : PASSWORD;
  console.log('\nCredenciales de prueba (contraseña común):');
  console.table([
    { rol: 'Superadministrador', email: 'superadmin@cehacis.test', password: shownPassword },
    { rol: 'Administrador académico', email: 'academico@cehacis.test', password: shownPassword },
    { rol: 'Facilitador', email: 'facilitador@cehacis.test', password: shownPassword },
    { rol: 'Facilitador', email: 'facilitadora2@cehacis.test', password: shownPassword },
    { rol: 'Estudiante', email: 'estudiante@cehacis.test', password: shownPassword },
    { rol: 'Estudiante', email: 'estudiante2@cehacis.test', password: shownPassword },
    { rol: 'Estudiante', email: 'estudiante3@cehacis.test', password: shownPassword },
  ]);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error('Error en el seed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
