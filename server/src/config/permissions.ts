/**
 * Catálogo RBAC. Las claves se siembran en la tabla `permissions` y se asignan a roles.
 * El frontend recibe la lista efectiva del usuario en /api/auth/me para ocultar/mostrar UI,
 * pero TODA autorización real se valida en el servidor con requirePermission().
 */
export const PERMISSIONS = {
  // Configuración y usuarios
  'settings.manage': 'Configurar la plataforma (marca, integraciones)',
  'users.manage': 'Crear, editar y suspender usuarios',
  'roles.manage': 'Gestionar roles y permisos',
  'audit.read': 'Consultar registros de auditoría',
  // Académico
  'courses.manage': 'Crear y editar cualquier curso, programa y categoría',
  'courses.teach': 'Gestionar contenido de los cursos asignados',
  'students.manage': 'Gestionar expedientes de estudiantes',
  'students.view_assigned': 'Consultar estudiantes de sus cursos',
  'instructors.manage': 'Gestionar facilitadores',
  'assessments.manage': 'Crear y calificar evaluaciones de cualquier curso',
  'assessments.grade': 'Calificar evaluaciones de sus cursos',
  'competencies.manage': 'Gestionar catálogo de competencias y rúbricas',
  'activities.manage': 'Gestionar actividades prácticas',
  'attendance.manage': 'Registrar asistencia',
  'certificates.manage': 'Emitir, revocar y diseñar certificados',
  'calendar.manage': 'Programar eventos y clases',
  'community.moderate': 'Moderar foros y comentarios',
  'announcements.manage': 'Publicar anuncios',
  'gamification.manage': 'Configurar puntos, insignias y retos',
  // Comercial
  'payments.manage': 'Gestionar pedidos, pagos, cupones y facturas',
  // Reportes
  'reports.view': 'Ver dashboard y reportes generales',
  'reports.academic': 'Ver reportes académicos',
  // IA
  'ai.review': 'Revisar evaluaciones generadas por IA',
  'ai.manage': 'Configurar escenarios de IA',
  // Estudiante
  'learn.access': 'Acceder al campus como estudiante',
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;

const all = Object.keys(PERMISSIONS) as PermissionKey[];

export type RoleKey = 'SUPERADMIN' | 'ACADEMIC_ADMIN' | 'INSTRUCTOR' | 'STUDENT';

export const ROLE_DEFS: Record<RoleKey, { name: string; description: string; permissions: PermissionKey[] }> = {
  SUPERADMIN: {
    name: 'Superadministrador',
    description: 'Acceso completo a la plataforma',
    permissions: all,
  },
  ACADEMIC_ADMIN: {
    name: 'Administrador académico',
    description: 'Gestión académica: cursos, estudiantes, facilitadores, evaluaciones y certificaciones',
    permissions: [
      'courses.manage', 'courses.teach', 'students.manage', 'students.view_assigned', 'instructors.manage',
      'assessments.manage', 'assessments.grade', 'competencies.manage', 'activities.manage', 'attendance.manage',
      'certificates.manage', 'calendar.manage', 'community.moderate', 'announcements.manage', 'gamification.manage',
      'reports.academic', 'ai.review', 'ai.manage',
    ],
  },
  INSTRUCTOR: {
    name: 'Facilitador',
    description: 'Gestión de sus cursos asignados, evaluación, asistencia y retroalimentación',
    permissions: [
      'courses.teach', 'students.view_assigned', 'assessments.grade', 'activities.manage', 'attendance.manage',
      'calendar.manage', 'community.moderate', 'announcements.manage', 'ai.review',
    ],
  },
  STUDENT: {
    name: 'Estudiante',
    description: 'Acceso a cursos inscritos, evaluaciones, comunidad y certificados',
    permissions: ['learn.access'],
  },
};
