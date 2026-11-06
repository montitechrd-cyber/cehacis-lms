import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { notFound } from '../../lib/errors.js';
import { body, idParam, query } from '../../lib/validate.js';
import { getPage, paged } from '../../lib/pagination.js';
import { getBrand } from '../../lib/settings.js';
import { notify } from '../../lib/notify.js';
import { emailLayout, escapeHtml, sendMail } from '../../lib/mailer.js';

const r = Router();

// ───────────────────────── Helpers ─────────────────────────

const publicCourseWhere: Prisma.CourseWhereInput = { status: 'PUBLISHED', deletedAt: null };

const cardInclude = {
  category: { select: { id: true, name: true, slug: true } },
  instructors: {
    orderBy: { isLead: 'desc' },
    select: { instructor: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, status: true, deletedAt: true, instructor: { select: { headline: true, isPublic: true } } } } },
  },
  competencies: { select: { competency: { select: { id: true, name: true, isActive: true } } } },
  modules: {
    where: { isPublished: true },
    select: { id: true, _count: { select: { lessons: { where: { isPublished: true } } } } },
  },
} satisfies Prisma.CourseInclude;

type CardCourse = Prisma.CourseGetPayload<{ include: typeof cardInclude }>;

async function ratingsFor(courseIds: number[]) {
  const map = new Map<number, { avg: number; count: number }>();
  if (!courseIds.length) return map;
  const rows = await prisma.courseReview.groupBy({
    by: ['courseId'],
    where: { courseId: { in: courseIds }, isApproved: true },
    _avg: { rating: true },
    _count: { _all: true },
  });
  for (const x of rows) map.set(x.courseId, { avg: Math.round((x._avg.rating ?? 0) * 10) / 10, count: x._count._all });
  return map;
}

function card(c: CardCourse, rating?: { avg: number; count: number }) {
  return {
    id: c.id,
    code: c.code,
    title: c.title,
    slug: c.slug,
    subtitle: c.subtitle,
    imageUrl: c.imageUrl,
    level: c.level,
    modality: c.modality,
    durationHours: c.durationHours,
    price: Number(c.price),
    isFree: c.isFree,
    currency: c.currency,
    startDate: c.startDate,
    category: c.category,
    instructors: c.instructors
      .map((i) => i.instructor)
      .filter((u) => u.status === 'ACTIVE' && !u.deletedAt && u.instructor?.isPublic !== false)
      .map((u) => ({ id: u.id, firstName: u.firstName, lastName: u.lastName, avatarUrl: u.avatarUrl, headline: u.instructor?.headline ?? null })),
    competencies: c.competencies.filter((x) => x.competency.isActive).map((x) => ({ id: x.competency.id, name: x.competency.name })),
    lessonsCount: c.modules.reduce((n, m) => n + m._count.lessons, 0),
    modulesCount: c.modules.length,
    rating: rating ?? { avg: 0, count: 0 },
  };
}

async function cards(courses: CardCourse[]) {
  const ratings = await ratingsFor(courses.map((c) => c.id));
  return courses.map((c) => card(c, ratings.get(c.id)));
}

const publicInstructorWhere: Prisma.UserWhereInput = { status: 'ACTIVE', deletedAt: null, instructor: { is: { isPublic: true } } };

const instructorSelect = {
  id: true,
  firstName: true,
  lastName: true,
  avatarUrl: true,
  instructor: { select: { headline: true, bio: true, specialties: true, yearsExperience: true, linkedinUrl: true } },
  courseInstructors: {
    where: { course: publicCourseWhere },
    select: { course: { select: { title: true, slug: true } } },
  },
} satisfies Prisma.UserSelect;

type InstructorRow = Prisma.UserGetPayload<{ select: typeof instructorSelect }>;

const instructorDto = (u: InstructorRow) => ({
  id: u.id,
  firstName: u.firstName,
  lastName: u.lastName,
  avatarUrl: u.avatarUrl,
  headline: u.instructor?.headline ?? null,
  bio: u.instructor?.bio ?? null,
  specialties: (Array.isArray(u.instructor?.specialties) ? u.instructor?.specialties : []) as unknown[],
  yearsExperience: u.instructor?.yearsExperience ?? null,
  linkedinUrl: u.instructor?.linkedinUrl ?? null,
  courses: u.courseInstructors.map((ci) => ({ title: ci.course.title, slug: ci.course.slug })),
});

// ───────────────────────── Marca, cifras, categorías ─────────────────────────

r.get('/brand', async (_req, res) => {
  res.json({ data: await getBrand() });
});

r.get('/stats', async (_req, res) => {
  const [publishedCourses, categories, instructorsPublic, competencies] = await Promise.all([
    prisma.course.count({ where: publicCourseWhere }),
    prisma.category.count(),
    prisma.user.count({ where: publicInstructorWhere }),
    prisma.competency.count({ where: { isActive: true } }),
  ]);
  res.json({ data: { publishedCourses, categories, instructorsPublic, competencies } });
});

/** Competencias activas agrupadas, con cuántos cursos publicados entrenan cada una. */
r.get('/competencies', async (_req, res) => {
  const rows = await prisma.competency.findMany({
    where: { isActive: true },
    orderBy: { id: 'asc' },
    select: {
      id: true,
      key: true,
      name: true,
      description: true,
      group: true,
      _count: { select: { courses: { where: { course: publicCourseWhere } } } },
    },
  });
  const groups = new Map<string, { name: string; competencies: { id: number; key: string; name: string; description: string | null; courses: number }[] }>();
  for (const c of rows) {
    const name = c.group?.trim() || 'Otras';
    if (!groups.has(name)) groups.set(name, { name, competencies: [] });
    groups.get(name)!.competencies.push({ id: c.id, key: c.key, name: c.name, description: c.description, courses: c._count.courses });
  }
  res.json({ data: [...groups.values()] });
});

r.get('/categories', async (_req, res) => {
  const rows = await prisma.category.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true, slug: true, description: true, _count: { select: { courses: { where: publicCourseWhere } } } },
  });
  res.json({ data: rows.map((c) => ({ id: c.id, name: c.name, slug: c.slug, description: c.description, coursesCount: c._count.courses })) });
});

// ───────────────────────── Cursos ─────────────────────────

const listSchema = z
  .object({
    categoryId: z.coerce.number().int().positive().optional(),
    level: z.enum(['BASIC', 'INTERMEDIATE', 'ADVANCED']).optional(),
    modality: z.enum(['VIRTUAL', 'PRESENCIAL', 'HIBRIDA']).optional(),
    free: z.enum(['true', 'false', '1', '0']).optional(),
    sort: z.enum(['newest', 'price_asc', 'price_desc', 'title']).optional(),
  })
  .passthrough();

r.get('/courses', async (req, res) => {
  const p = getPage(req, 12);
  const f = query(req, listSchema);
  const where: Prisma.CourseWhereInput = {
    ...publicCourseWhere,
    ...(f.categoryId ? { categoryId: f.categoryId } : {}),
    ...(f.level ? { level: f.level } : {}),
    ...(f.modality ? { modality: f.modality } : {}),
    ...(f.free === 'true' || f.free === '1' ? { isFree: true } : {}),
    ...(f.free === 'false' || f.free === '0' ? { isFree: false } : {}),
    ...(p.search ? { OR: [{ title: { contains: p.search } }, { subtitle: { contains: p.search } }, { code: { contains: p.search } }, { description: { contains: p.search } }] } : {}),
  };
  const orderByMap: Record<string, Prisma.CourseOrderByWithRelationInput> = {
    newest: { createdAt: 'desc' },
    price_asc: { price: 'asc' },
    price_desc: { price: 'desc' },
    title: { title: 'asc' },
  };
  const [rows, total] = await Promise.all([
    prisma.course.findMany({ where, include: cardInclude, orderBy: [orderByMap[f.sort ?? 'newest']!, { id: 'desc' }], skip: p.skip, take: p.take }),
    prisma.course.count({ where }),
  ]);
  res.json(paged(await cards(rows), total, p));
});

r.get('/courses/:slug', async (req, res) => {
  const slug = String(req.params.slug).slice(0, 220);
  const course = await prisma.course.findFirst({
    where: { ...publicCourseWhere, slug },
    include: {
      ...cardInclude,
      modules: {
        where: { isPublished: true },
        orderBy: { order: 'asc' },
        select: {
          id: true,
          title: true,
          _count: { select: { lessons: { where: { isPublished: true } } } },
          lessons: {
            where: { isPublished: true },
            orderBy: { order: 'asc' },
            select: { id: true, title: true, durationMin: true, isPreview: true, content: true },
          },
        },
      },
    },
  });
  if (!course) throw notFound('Curso no encontrado');

  const [ratings, reviews, taken, related, programs] = await Promise.all([
    ratingsFor([course.id]),
    prisma.courseReview.findMany({
      where: { courseId: course.id, isApproved: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { rating: true, comment: true, createdAt: true, user: { select: { firstName: true, lastName: true } } },
    }),
    course.capacity ? prisma.enrollment.count({ where: { courseId: course.id, status: { not: 'CANCELLED' } } }) : Promise.resolve(0),
    course.categoryId
      ? prisma.course.findMany({ where: { ...publicCourseWhere, categoryId: course.categoryId, id: { not: course.id } }, include: cardInclude, orderBy: { createdAt: 'desc' }, take: 3 })
      : Promise.resolve([] as CardCourse[]),
    prisma.program.findMany({
      where: { status: 'PUBLISHED', courses: { some: { courseId: course.id } } },
      select: { id: true, title: true, slug: true, summary: true, imageUrl: true, price: true },
    }),
  ]);

  const base = card(course as unknown as CardCourse, ratings.get(course.id));
  res.json({
    data: {
      ...base,
      lessonsCount: course.modules.reduce((n, m) => n + m._count.lessons, 0),
      modulesCount: course.modules.length,
      description: course.description,
      objectives: course.objectives,
      audience: course.audience,
      requirements: course.requirements,
      endDate: course.endDate,
      capacity: course.capacity,
      seatsLeft: course.capacity ? Math.max(0, course.capacity - taken) : null,
      passingScore: course.passingScore,
      certificateEnabled: course.certificateEnabled,
      minAttendancePct: course.minAttendancePct,
      outline: course.modules.map((m) => ({
        title: m.title,
        lessons: m.lessons.map((l) => ({ title: l.title, durationMin: l.durationMin, isPreview: l.isPreview })),
      })),
      previewLessons: course.modules.flatMap((m) => m.lessons.filter((l) => l.isPreview).map((l) => ({ id: l.id, title: l.title, content: l.content }))),
      reviews: reviews.map((v) => ({
        rating: v.rating,
        comment: v.comment,
        createdAt: v.createdAt,
        name: `${v.user.firstName} ${v.user.lastName.trim().charAt(0).toUpperCase()}.`,
      })),
      relatedCourses: await cards(related),
      programs: programs.map((pr) => ({ ...pr, price: Number(pr.price) })),
    },
  });
});

// ───────────────────────── Programas ─────────────────────────

const programCourses = {
  where: { course: publicCourseWhere },
  orderBy: { order: 'asc' },
  select: { course: { include: cardInclude } },
} satisfies Prisma.Program$coursesArgs;

async function programDto(pr: Prisma.ProgramGetPayload<{ include: { courses: typeof programCourses } }>, full: boolean) {
  const list = await cards(pr.courses.map((x) => x.course));
  return {
    id: pr.id,
    title: pr.title,
    slug: pr.slug,
    summary: pr.summary,
    ...(full ? { description: pr.description } : {}),
    imageUrl: pr.imageUrl,
    price: Number(pr.price),
    coursesCount: list.length,
    totalHours: list.reduce((n, c) => n + c.durationHours, 0),
    courses: list,
  };
}

r.get('/programs', async (_req, res) => {
  const rows = await prisma.program.findMany({
    where: { status: 'PUBLISHED', courses: { some: { course: publicCourseWhere } } },
    orderBy: { title: 'asc' },
    include: { courses: programCourses },
  });
  res.json({ data: await Promise.all(rows.map((p) => programDto(p, false))) });
});

r.get('/programs/:slug', async (req, res) => {
  const row = await prisma.program.findFirst({
    where: { status: 'PUBLISHED', slug: String(req.params.slug).slice(0, 220), courses: { some: { course: publicCourseWhere } } },
    include: { courses: programCourses },
  });
  if (!row) throw notFound('Programa no encontrado');
  res.json({ data: await programDto(row, true) });
});

// ───────────────────────── Facilitadores ─────────────────────────

r.get('/instructors', async (_req, res) => {
  const rows = await prisma.user.findMany({ where: publicInstructorWhere, select: instructorSelect, orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }] });
  res.json({ data: rows.map(instructorDto) });
});

r.get('/instructors/:id', async (req, res) => {
  const id = idParam(req);
  const row = await prisma.user.findFirst({ where: { ...publicInstructorWhere, id }, select: instructorSelect });
  if (!row) throw notFound('Facilitador no encontrado');
  res.json({ data: instructorDto(row) });
});

// ───────────────────────── FAQ ─────────────────────────

r.get('/faqs', async (_req, res) => {
  const rows = await prisma.faq.findMany({ where: { isPublished: true }, orderBy: [{ order: 'asc' }, { id: 'asc' }], select: { id: true, question: true, answer: true } });
  res.json({ data: rows });
});

// ───────────────────────── Contacto ─────────────────────────

const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMIT', message: 'Has enviado demasiados mensajes. Inténtalo de nuevo en una hora.' } },
});

const contactSchema = z.object({
  name: z.string().trim().min(2, 'Escribe tu nombre').max(150),
  email: z.string().trim().toLowerCase().email('Correo inválido').max(191),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
  subject: z.string().trim().min(3, 'Escribe el asunto').max(200),
  message: z.string().trim().min(10, 'El mensaje es muy corto').max(5000),
  website: z.string().max(500).optional(), // honeypot
});

const THANKS = 'Gracias por escribirnos. Hemos recibido tu mensaje y te responderemos pronto.';

r.post('/contact', contactLimiter, async (req, res) => {
  const data = body(req, contactSchema);
  if (data.website && data.website.trim() !== '') return void res.json({ ok: true, message: THANKS });

  const saved = await prisma.contactMessage.create({
    data: { name: data.name, email: data.email, phone: data.phone || null, subject: data.subject, message: data.message },
  });

  // El mensaje ya está guardado: los avisos son best-effort y no deben hacer fallar la petición.
  try {
    const staff = await prisma.user.findMany({
      where: { status: 'ACTIVE', deletedAt: null, role: { permissions: { some: { permission: { key: { in: ['users.manage', 'settings.manage'] } } } } } },
      select: { id: true },
    });
    await notify(staff.map((s) => s.id), { type: 'CONTACT', title: `Nuevo mensaje de contacto: ${data.subject}`.slice(0, 200), body: `${data.name} <${data.email}>`, link: '/panel/configuracion?tab=contacto' });
    const brand = await getBrand();
    const html = emailLayout(
      'Nuevo mensaje de contacto',
      `<p><strong>De:</strong> ${escapeHtml(data.name)} (${escapeHtml(data.email)}${data.phone ? ', ' + escapeHtml(data.phone) : ''})</p>` +
        `<p><strong>Asunto:</strong> ${escapeHtml(data.subject)}</p><p style="white-space:pre-wrap">${escapeHtml(data.message)}</p>`,
    );
    await sendMail(brand.contactEmail, `[Contacto web] ${data.subject}`.slice(0, 250), html);
  } catch (e) {
    console.error('[public/contact] aviso fallido para el mensaje', saved.id, e);
  }
  res.status(201).json({ ok: true, message: THANKS });
});

export default r;
