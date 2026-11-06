import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { badRequest, forbidden } from '../../lib/errors.js';
import { query } from '../../lib/validate.js';
import { audit } from '../../lib/audit.js';
import { assertCourseStaff, can, requireAuth, requirePermission, taughtCourseIds } from '../../middleware/auth.js';
import { buildDashboard, buildInstructorPanel, dateFilter, getOptionalRange, getRange } from './reports.service.js';
import { buildPdf, buildXlsx, type Col, type Table } from './reports.export.js';

const r = Router();
r.use(requireAuth);

const ATT_ES: Record<string, string> = { PRESENT: 'Presente', ABSENT: 'Ausente', LATE: 'Tardanza', EXCUSED: 'Justificado' };
const ENR_ES: Record<string, string> = { PENDING_PAYMENT: 'Pago pendiente', ACTIVE: 'Activa', COMPLETED: 'Completada', CANCELLED: 'Cancelada' };
const USER_ES: Record<string, string> = { ACTIVE: 'Activo', PENDING: 'Pendiente', SUSPENDED: 'Suspendido' };
const ORDER_ES: Record<string, string> = { PENDING: 'Pendiente', PAID: 'Pagado', FAILED: 'Fallido', CANCELLED: 'Cancelado', REFUNDED: 'Reembolsado' };
const SRC_ES: Record<string, string> = { RUBRIC: 'Rúbrica', ASSESSMENT: 'Evaluación', SELF: 'Autoevaluación', INSTRUCTOR: 'Facilitador', PEER: 'Compañeros', AI: 'IA' };

// ───────── GET /dashboard ─────────
r.get('/dashboard', requirePermission('reports.view', 'reports.academic'), async (req, res) => {
  const range = getRange(req);
  const includeRevenue = can(req, 'reports.view') || can(req, 'payments.manage');
  res.json(await buildDashboard(range, includeRevenue));
});

// ───────── GET /instructor ─────────
r.get('/instructor', requirePermission('courses.teach'), async (req, res) => {
  res.json(await buildInstructorPanel(req.user!.id));
});

// ───────── exportaciones ─────────
const exportQuery = z.object({
  format: z.enum(['xlsx', 'pdf'], { errorMap: () => ({ message: 'Formato inválido: usa xlsx o pdf' }) }).default('xlsx'),
  courseId: z.coerce.number().int().positive().optional(),
});
const REPORTS = ['students', 'enrollments', 'payments', 'grades', 'attendance', 'competencies', 'dashboard'] as const;
type ReportKey = (typeof REPORTS)[number];

const TITLES: Record<ReportKey, string> = {
  students: 'Estudiantes',
  enrollments: 'Inscripciones',
  payments: 'Pagos y pedidos',
  grades: 'Calificaciones',
  attendance: 'Asistencia',
  competencies: 'Competencias',
  dashboard: 'Resumen del dashboard',
};

const fullName = (u: { firstName: string; lastName: string }) => `${u.firstName} ${u.lastName}`.trim();
const num = (v: unknown) => (v == null ? null : Number(v));

r.get('/export/:report', async (req: Request, res: Response) => {
  const report = req.params.report as ReportKey;
  if (!REPORTS.includes(report)) throw badRequest('Reporte desconocido');
  const q = query(req, exportQuery);
  if (report === 'dashboard' && q.format !== 'pdf') throw badRequest('El resumen del dashboard solo se exporta en PDF');

  const range = getOptionalRange(req);
  const stamp = new Date().toISOString().slice(0, 10);
  const subtitleParts = [TITLES[report]];
  if (range.from || range.to) subtitleParts.push(`Periodo: ${range.from?.toISOString().slice(0, 10) ?? '…'} a ${range.to?.toISOString().slice(0, 10) ?? '…'}`);
  const subtitle = subtitleParts.join(' · ');

  let tables: Table[];
  switch (report) {
    case 'students':
      if (!can(req, 'students.manage') && !can(req, 'reports.view')) throw forbidden();
      tables = [await studentsTable(range, q.courseId)];
      break;
    case 'enrollments':
      tables = [await enrollmentsTable(req, range, q.courseId)];
      break;
    case 'payments':
      if (!can(req, 'payments.manage') && !can(req, 'reports.view')) throw forbidden();
      tables = [await paymentsTable(range)];
      break;
    case 'grades':
      if (!q.courseId) throw badRequest('Indica courseId para este reporte');
      await assertCourseStaff(req, q.courseId);
      tables = [await gradesTable(q.courseId)];
      break;
    case 'attendance':
      if (!q.courseId) throw badRequest('Indica courseId para este reporte');
      await assertCourseStaff(req, q.courseId);
      tables = [await attendanceTable(q.courseId, range)];
      break;
    case 'competencies':
      if (!can(req, 'reports.academic')) throw forbidden();
      tables = [await competenciesTable(range, q.courseId)];
      break;
    case 'dashboard': {
      if (!can(req, 'reports.view') && !can(req, 'reports.academic')) throw forbidden();
      tables = await dashboardTables(req, range);
      break;
    }
  }

  const name = `reporte-${report}-${stamp}.${q.format}`;
  const file = q.format === 'xlsx' ? await buildXlsx(tables) : await buildPdf(`Reporte de ${TITLES[report].toLowerCase()}`, subtitle, tables);
  await audit(req, 'report.export', 'report', report, { format: q.format, courseId: q.courseId ?? null, from: range.from ?? null, to: range.to ?? null, rows: tables.reduce((s, t) => s + t.rows.length, 0) });
  res.setHeader('Content-Type', q.format === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
  res.setHeader('Cache-Control', 'no-store');
  res.send(file);
});

// ───────── constructores de tablas ─────────
const ROW_CAP = 50_000;

async function studentsTable(range: { from?: Date; to?: Date }, courseId?: number): Promise<Table> {
  const users = await prisma.user.findMany({
    where: {
      role: { key: 'STUDENT' },
      deletedAt: null,
      createdAt: dateFilter(range),
      ...(courseId ? { enrollments: { some: { courseId } } } : {}),
    },
    orderBy: { lastName: 'asc' },
    take: ROW_CAP,
    select: {
      id: true, firstName: true, lastName: true, email: true, phone: true, status: true, createdAt: true, lastLoginAt: true,
      student: { select: { city: true, country: true, points: true } },
      _count: { select: { enrollments: true } },
    },
  });
  return {
    title: 'Estudiantes',
    columns: [
      { header: 'ID', key: 'id', width: 8, type: 'number' },
      { header: 'Nombre', key: 'firstName', width: 18 },
      { header: 'Apellido', key: 'lastName', width: 18 },
      { header: 'Correo', key: 'email', width: 30 },
      { header: 'Teléfono', key: 'phone', width: 15 },
      { header: 'Ciudad', key: 'city', width: 16 },
      { header: 'Estado', key: 'status', width: 12 },
      { header: 'Inscripciones', key: 'enrollments', width: 13, type: 'number' },
      { header: 'Puntos', key: 'points', width: 9, type: 'number' },
      { header: 'Registro', key: 'createdAt', width: 13, type: 'date' },
      { header: 'Último acceso', key: 'lastLoginAt', width: 17, type: 'datetime' },
    ],
    rows: users.map((u) => ({
      ...u, city: u.student?.city ?? '', status: USER_ES[u.status] ?? u.status, enrollments: u._count.enrollments, points: u.student?.points ?? 0,
    })),
  };
}

async function enrollmentsTable(req: Request, range: { from?: Date; to?: Date }, courseId?: number): Promise<Table> {
  const wide = can(req, 'reports.view') || can(req, 'reports.academic') || can(req, 'students.manage') || can(req, 'courses.manage');
  let scope: number[] | undefined;
  if (!wide) {
    if (!can(req, 'courses.teach')) throw forbidden();
    scope = await taughtCourseIds(req.user!.id);
    if (courseId && !scope.includes(courseId)) throw forbidden('Solo los facilitadores asignados pueden consultar este curso');
  }
  const rows = await prisma.enrollment.findMany({
    where: { courseId: courseId ?? (scope ? { in: scope } : undefined), enrolledAt: dateFilter(range) },
    orderBy: { enrolledAt: 'desc' },
    take: ROW_CAP,
    select: {
      status: true, progressPct: true, finalGrade: true, enrolledAt: true, completedAt: true,
      user: { select: { firstName: true, lastName: true, email: true } },
      course: { select: { code: true, title: true } },
      group: { select: { name: true } },
    },
  });
  return {
    title: 'Inscripciones',
    columns: [
      { header: 'Estudiante', key: 'student', width: 28 },
      { header: 'Correo', key: 'email', width: 30 },
      { header: 'Código curso', key: 'code', width: 13 },
      { header: 'Curso', key: 'course', width: 34 },
      { header: 'Grupo', key: 'group', width: 16 },
      { header: 'Estado', key: 'status', width: 14 },
      { header: 'Progreso', key: 'progressPct', width: 10, type: 'pct' },
      { header: 'Nota final', key: 'finalGrade', width: 11, type: 'number' },
      { header: 'Inscrito', key: 'enrolledAt', width: 13, type: 'date' },
      { header: 'Completado', key: 'completedAt', width: 13, type: 'date' },
    ],
    rows: rows.map((e) => ({
      student: fullName(e.user), email: e.user.email, code: e.course.code, course: e.course.title, group: e.group?.name ?? '',
      status: ENR_ES[e.status] ?? e.status, progressPct: e.progressPct, finalGrade: num(e.finalGrade), enrolledAt: e.enrolledAt, completedAt: e.completedAt,
    })),
  };
}

async function paymentsTable(range: { from?: Date; to?: Date }): Promise<Table> {
  const orders = await prisma.order.findMany({
    where: { createdAt: dateFilter(range) },
    orderBy: { createdAt: 'desc' },
    take: ROW_CAP,
    select: {
      number: true, status: true, subtotal: true, discount: true, tax: true, total: true, currency: true, provider: true, createdAt: true, paidAt: true,
      user: { select: { firstName: true, lastName: true, email: true } },
      items: { select: { description: true } },
      payments: { select: { isTest: true, status: true } },
    },
  });
  return {
    title: 'Pagos',
    columns: [
      { header: 'Pedido', key: 'number', width: 18 },
      { header: 'Estudiante', key: 'student', width: 26 },
      { header: 'Correo', key: 'email', width: 28 },
      { header: 'Concepto', key: 'concept', width: 36 },
      { header: 'Estado', key: 'status', width: 12 },
      { header: 'Subtotal', key: 'subtotal', width: 12, type: 'money' },
      { header: 'Descuento', key: 'discount', width: 12, type: 'money' },
      { header: 'Impuesto', key: 'tax', width: 12, type: 'money' },
      { header: 'Total', key: 'total', width: 12, type: 'money' },
      { header: 'Moneda', key: 'currency', width: 9 },
      { header: 'Proveedor', key: 'provider', width: 13 },
      { header: 'Prueba', key: 'test', width: 9 },
      { header: 'Creado', key: 'createdAt', width: 17, type: 'datetime' },
      { header: 'Pagado', key: 'paidAt', width: 17, type: 'datetime' },
    ],
    rows: orders.map((o) => {
      const approved = o.payments.filter((p) => p.status === 'APPROVED');
      const test = approved.length ? approved.some((p) => p.isTest) : o.payments.some((p) => p.isTest);
      return {
        number: o.number, student: fullName(o.user), email: o.user.email, concept: o.items.map((i) => i.description).join('; '),
        status: ORDER_ES[o.status] ?? o.status, subtotal: num(o.subtotal), discount: num(o.discount), tax: num(o.tax), total: num(o.total),
        currency: o.currency, provider: o.provider, test: o.payments.length ? (test ? 'Sí' : 'No') : '', createdAt: o.createdAt, paidAt: o.paidAt,
      };
    }),
  };
}

async function gradesTable(courseId: number): Promise<Table> {
  const [assessments, enrollments] = await Promise.all([
    prisma.assessment.findMany({ where: { courseId, isPublished: true }, orderBy: { id: 'asc' }, select: { id: true, title: true } }),
    prisma.enrollment.findMany({
      where: { courseId, status: { not: 'CANCELLED' } },
      orderBy: { user: { lastName: 'asc' } },
      select: { userId: true, status: true, progressPct: true, finalGrade: true, user: { select: { firstName: true, lastName: true, email: true } } },
    }),
  ]);
  const attempts = assessments.length
    ? await prisma.assessmentAttempt.findMany({
        where: { assessmentId: { in: assessments.map((a) => a.id) }, status: 'GRADED', userId: { in: enrollments.map((e) => e.userId) } },
        select: { assessmentId: true, userId: true, percentage: true },
      })
    : [];
  const best = new Map<string, number>();
  for (const a of attempts) {
    const k = `${a.userId}:${a.assessmentId}`;
    const v = Number(a.percentage ?? 0);
    if (v > (best.get(k) ?? -1)) best.set(k, v);
  }
  const columns: Col[] = [
    { header: 'Estudiante', key: 'student', width: 28 },
    { header: 'Correo', key: 'email', width: 28 },
    { header: 'Estado', key: 'status', width: 13 },
    { header: 'Progreso', key: 'progressPct', width: 10, type: 'pct' },
    ...assessments.map((a) => ({ header: `${a.title} (%)`, key: `a${a.id}`, width: 16, type: 'pct' as const })),
    { header: 'Nota final', key: 'finalGrade', width: 11, type: 'number' },
  ];
  return {
    title: 'Calificaciones',
    columns,
    rows: enrollments.map((e) => {
      const row: Record<string, unknown> = {
        student: fullName(e.user), email: e.user.email, status: ENR_ES[e.status] ?? e.status, progressPct: e.progressPct, finalGrade: num(e.finalGrade),
      };
      for (const a of assessments) row[`a${a.id}`] = best.get(`${e.userId}:${a.id}`) ?? null;
      return row;
    }),
  };
}

async function attendanceTable(courseId: number, range: { from?: Date; to?: Date }): Promise<Table> {
  const [events, enrollments] = await Promise.all([
    prisma.event.findMany({ where: { courseId, startAt: dateFilter(range) }, orderBy: { startAt: 'asc' }, take: 60, select: { id: true, title: true, startAt: true } }),
    prisma.enrollment.findMany({
      where: { courseId, status: { not: 'CANCELLED' } },
      orderBy: { user: { lastName: 'asc' } },
      select: { userId: true, user: { select: { firstName: true, lastName: true, email: true } } },
    }),
  ]);
  const records = events.length
    ? await prisma.attendance.findMany({ where: { eventId: { in: events.map((e) => e.id) } }, select: { eventId: true, userId: true, status: true } })
    : [];
  const map = new Map(records.map((a) => [`${a.userId}:${a.eventId}`, a.status]));
  const pad = (n: number) => String(n).padStart(2, '0');
  const columns: Col[] = [
    { header: 'Estudiante', key: 'student', width: 28 },
    { header: 'Correo', key: 'email', width: 28 },
    ...events.map((e) => ({ header: `${pad(e.startAt.getDate())}/${pad(e.startAt.getMonth() + 1)} ${e.title.slice(0, 20)}`, key: `e${e.id}`, width: 14 })),
    { header: 'Asistencia', key: 'rate', width: 11, type: 'pct' },
  ];
  return {
    title: 'Asistencia',
    columns,
    rows: enrollments.map((en) => {
      const row: Record<string, unknown> = { student: fullName(en.user), email: en.user.email };
      let ok = 0;
      for (const e of events) {
        const s = map.get(`${en.userId}:${e.id}`);
        row[`e${e.id}`] = s ? ATT_ES[s] : '';
        if (s === 'PRESENT' || s === 'LATE') ok += 1;
      }
      row.rate = events.length ? Math.round((ok / events.length) * 1000) / 10 : null;
      return row;
    }),
  };
}

async function competenciesTable(range: { from?: Date; to?: Date }, courseId?: number): Promise<Table> {
  const rows = await prisma.studentCompetency.findMany({
    where: { isReviewed: true, courseId, recordedAt: dateFilter(range) },
    orderBy: { recordedAt: 'desc' },
    take: ROW_CAP,
    select: {
      score: true, scaleMax: true, source: true, recordedAt: true,
      user: { select: { firstName: true, lastName: true, email: true } },
      competency: { select: { name: true } },
      course: { select: { title: true } },
    },
  });
  return {
    title: 'Competencias',
    columns: [
      { header: 'Estudiante', key: 'student', width: 28 },
      { header: 'Correo', key: 'email', width: 28 },
      { header: 'Competencia', key: 'competency', width: 28 },
      { header: 'Puntaje', key: 'score', width: 10, type: 'number' },
      { header: 'Escala máx.', key: 'scaleMax', width: 11, type: 'number' },
      { header: 'Fuente', key: 'source', width: 14 },
      { header: 'Curso', key: 'course', width: 30 },
      { header: 'Fecha', key: 'recordedAt', width: 13, type: 'date' },
    ],
    rows: rows.map((c) => ({
      student: fullName(c.user), email: c.user.email, competency: c.competency.name, score: num(c.score), scaleMax: c.scaleMax,
      source: SRC_ES[c.source] ?? c.source, course: c.course?.title ?? '', recordedAt: c.recordedAt,
    })),
  };
}

async function dashboardTables(req: Request, optional: { from?: Date; to?: Date }): Promise<Table[]> {
  const to = optional.to ?? new Date();
  const from = optional.from ?? new Date(to.getTime() - 30 * 86_400_000);
  const includeRevenue = can(req, 'reports.view') || can(req, 'payments.manage');
  const d = await buildDashboard({ from, to }, includeRevenue);
  const k = d.kpis;
  const money = (v: number | null) => (v == null ? 'No disponible' : v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  const pc = (v: number | null) => (v == null ? 'Sin datos' : `${v}%`);
  const kpiRows: [string, string][] = [
    ['Periodo', `${from.toISOString().slice(0, 10)} a ${to.toISOString().slice(0, 10)}`],
    ['Estudiantes totales', String(k.totalStudents)],
    ['Estudiantes activos', String(k.activeStudents)],
    ['Cursos totales', String(k.totalCourses)],
    ['Cursos publicados', String(k.publishedCourses)],
    ['Cursos en desarrollo', String(k.inDevelopmentCourses)],
    ['Inscripciones en el periodo', String(k.enrollments)],
    ['Finalizaciones en el periodo', String(k.completions)],
    ['Tasa de finalización', pc(k.completionRate)],
    ['Tasa de aprobación', pc(k.approvalRate)],
    ['Tasa de asistencia', pc(k.attendanceRate)],
    ['Ingresos totales', money(k.revenue)],
    ['Ingresos reales', money(k.revenueReal)],
    ['Ingresos de prueba', money(k.revenueTest)],
    ['Pagos pendientes', k.pendingPayments == null ? 'No disponible' : String(k.pendingPayments)],
    ['Satisfacción con cursos', k.satisfaction.courseAvg == null ? 'Sin datos' : `${k.satisfaction.courseAvg} / 5`],
    ['Satisfacción con facilitadores', k.satisfaction.instructorAvg == null ? 'Sin datos' : `${k.satisfaction.instructorAvg} / 5`],
  ];
  return [
    { title: 'Indicadores', columns: [{ header: 'Indicador', key: 'k', width: 30 }, { header: 'Valor', key: 'v', width: 30 }], rows: kpiRows.map(([kk, v]) => ({ k: kk, v })) },
    {
      title: 'Cursos con más inscripciones',
      columns: [
        { header: 'Código', key: 'code', width: 12 },
        { header: 'Curso', key: 'title', width: 40 },
        { header: 'Inscripciones', key: 'enrollments', width: 14, type: 'number' },
        { header: 'Finalizaciones', key: 'completions', width: 14, type: 'number' },
        ...(includeRevenue ? [{ header: 'Ingresos', key: 'revenue', width: 14, type: 'money' as const }] : []),
      ],
      rows: d.topCourses.map((t) => ({ code: t.course.code, title: t.course.title, enrollments: t.enrollments, completions: t.completions, revenue: t.revenue })),
    },
  ];
}

export default r;
