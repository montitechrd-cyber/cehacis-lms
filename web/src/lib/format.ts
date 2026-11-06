const LOCALE = 'es-DO';

export const money = (n: number | string | null | undefined, currency = 'USD') =>
  n == null ? '—' : new Intl.NumberFormat(LOCALE, { style: 'currency', currency, minimumFractionDigits: Number(n) % 1 ? 2 : 0 }).format(Number(n));

export const num = (n: number | null | undefined, digits = 0) =>
  n == null ? '—' : new Intl.NumberFormat(LOCALE, { maximumFractionDigits: digits }).format(n);

export const pct = (n: number | null | undefined, digits = 0) => (n == null ? '—' : `${num(n, digits)} %`);

export const date = (d: string | Date | null | undefined, opts: Intl.DateTimeFormatOptions = { dateStyle: 'medium' }) =>
  d ? new Intl.DateTimeFormat(LOCALE, opts).format(new Date(d)) : '—';

export const dateTime = (d: string | Date | null | undefined) => date(d, { dateStyle: 'medium', timeStyle: 'short' });

export const time = (d: string | Date | null | undefined) => date(d, { timeStyle: 'short' });

export function relative(d: string | Date | null | undefined) {
  if (!d) return '—';
  const diff = (new Date(d).getTime() - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });
  const abs = Math.abs(diff);
  if (abs < 60) return rtf.format(Math.round(diff), 'second');
  if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour');
  if (abs < 86400 * 30) return rtf.format(Math.round(diff / 86400), 'day');
  return date(d);
}

export const fileSize = (b: number) =>
  b < 1024 ? `${b} B` : b < 1024 ** 2 ? `${(b / 1024).toFixed(0)} KB` : b < 1024 ** 3 ? `${(b / 1024 ** 2).toFixed(1)} MB` : `${(b / 1024 ** 3).toFixed(2)} GB`;

export const fullName = (u?: { firstName?: string; lastName?: string } | null) => (u ? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() : '—');

export const initials = (u?: { firstName?: string; lastName?: string } | null) =>
  u ? `${u.firstName?.[0] ?? ''}${u.lastName?.[0] ?? ''}`.toUpperCase() : '?';

/** Número de catálogo estilo cartel: N.º 01 */
export const serial = (n: number) => `N.º ${String(n).padStart(2, '0')}`;

/**
 * Número de serie ESTABLE de un curso, derivado de su código institucional (CEH-001 → N.º 01).
 * Es la única fuente válida para numerar cursos: nunca uses la posición en una lista.
 */
export const courseNumber = (code?: string | null) => {
  const n = Number(code?.match(/(\d+)\s*$/)?.[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
};
export const courseSerial = (code?: string | null) => {
  const n = courseNumber(code);
  return n ? serial(n) : (code ?? '');
};

/**
 * Número de un módulo dentro de su curso: posición en la lista COMPLETA de módulos ordenada por `order`
 * (1, 2, 3…), idéntica en el portal, el aula y el editor. Pasa la lista completa ordenada y el id.
 */
export const moduleSerial = (index: number) => serial(index + 1);

export const LEVELS: Record<string, string> = { BASIC: 'Básico', INTERMEDIATE: 'Intermedio', ADVANCED: 'Avanzado' };
export const MODALITIES: Record<string, string> = { VIRTUAL: 'Virtual', PRESENCIAL: 'Presencial', HIBRIDA: 'Híbrida' };
export const COURSE_STATUS: Record<string, string> = { DRAFT: 'Borrador', IN_DEVELOPMENT: 'En desarrollo', PUBLISHED: 'Publicado', ARCHIVED: 'Archivado' };
export const ROLES: Record<string, string> = { SUPERADMIN: 'Superadministrador', ACADEMIC_ADMIN: 'Administrador académico', INSTRUCTOR: 'Facilitador', STUDENT: 'Estudiante' };
export const RESOURCE_TYPES: Record<string, string> = {
  DOCUMENT: 'Documento', FILE: 'Archivo', VIDEO: 'Video', AUDIO: 'Audio', PRESENTATION: 'Presentación', LINK: 'Enlace web',
  FOLDER: 'Carpeta', EMBED: 'Contenido incrustado', LIVE_SESSION: 'Clase en vivo', RECORDING: 'Clase grabada',
  ASSESSMENT: 'Examen', FORUM: 'Foro', ACTIVITY: 'Actividad práctica',
};
export const ASSESSMENT_TYPES: Record<string, string> = {
  QUIZ: 'Cuestionario', DIAGNOSTIC: 'Diagnóstica', SELF_ASSESSMENT: 'Autoevaluación', FINAL: 'Evaluación final', PRACTICAL: 'Práctica', PEER: 'Entre compañeros',
};
export const QUESTION_TYPES: Record<string, string> = {
  MULTIPLE_CHOICE: 'Selección múltiple', MULTIPLE_SELECT: 'Selección de varias', TRUE_FALSE: 'Verdadero o falso', OPEN: 'Pregunta abierta', SCALE: 'Escala (autoevaluación)',
};
export const ACTIVITY_TYPES: Record<string, string> = {
  INDIVIDUAL: 'Ejercicio individual', GROUP: 'Actividad grupal', ROLE_PLAY: 'Role-playing', NEGOTIATION: 'Escenario de negociación',
  DIFFICULT_CONVERSATION: 'Conversación difícil', PUBLIC_SPEAKING: 'Ejercicio de oratoria', CASE_STUDY: 'Caso práctico',
};
export const EVENT_TYPES: Record<string, string> = {
  CLASS: 'Clase', WORKSHOP: 'Taller', INDIVIDUAL_SESSION: 'Sesión individual', VIRTUAL_CLASS: 'Clase virtual', EXAM: 'Examen', DEADLINE: 'Fecha límite', OTHER: 'Otro',
};
export const ATTENDANCE: Record<string, string> = { PRESENT: 'Presente', ABSENT: 'Ausente', LATE: 'Tarde', EXCUSED: 'Justificado' };
export const COMPLETION_RULES: Record<string, string> = {
  VIEW: 'Al abrir la lección', MANUAL: 'El estudiante la marca como completada', RESOURCES: 'Revisar todos los recursos obligatorios',
  ASSESSMENT: 'Aprobar la evaluación vinculada', ACTIVITY: 'Entregar la actividad vinculada',
};
export const ORDER_STATUS: Record<string, string> = { PENDING: 'Pendiente', PAID: 'Pagado', FAILED: 'Fallido', CANCELLED: 'Cancelado', REFUNDED: 'Reembolsado' };
export const ENROLLMENT_STATUS: Record<string, string> = { PENDING_PAYMENT: 'Pago pendiente', ACTIVE: 'Activa', COMPLETED: 'Completada', CANCELLED: 'Cancelada' };
export const COMPETENCY_SOURCE: Record<string, string> = { RUBRIC: 'Rúbrica', ASSESSMENT: 'Evaluación', SELF: 'Autoevaluación', INSTRUCTOR: 'Facilitador', PEER: 'Compañeros', AI: 'IA (formativa)' };
