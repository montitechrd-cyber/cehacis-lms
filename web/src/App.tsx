import { lazy, Suspense, type ComponentType } from 'react';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router';
import {
  Award, BarChart3, BookOpen, Bot, CalendarDays, ClipboardCheck, CreditCard, FileBadge2, FolderTree, GraduationCap, Home, Layers,
  LayoutDashboard, Library, Mail, MessagesSquare, Settings, ShieldCheck, Sparkles, Target, Trophy, UserCog, Users, Wallet,
} from 'lucide-react';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { AppShell, type NavGroup } from '@/components/layout/AppShell';
import { RequireAuth } from '@/lib/auth';
import { PageLoader } from '@/components/ui/Feedback';
import { NotFound, AccessDenied } from '@/pages/System';

const L = (f: () => Promise<{ default: ComponentType }>) => {
  const C = lazy(f);
  return (
    <Suspense fallback={<PageLoader />}>
      <C />
    </Suspense>
  );
};

const CAMPUS_NAV: NavGroup[] = [
  {
    items: [
      { to: '/campus', label: 'Inicio', icon: Home, end: true },
      { to: '/campus/cursos', label: 'Mis cursos', icon: BookOpen },
      { to: '/campus/calendario', label: 'Calendario', icon: CalendarDays },
      { to: '/campus/calificaciones', label: 'Calificaciones', icon: ClipboardCheck },
      { to: '/campus/competencias', label: 'Competencias', icon: Target },
    ],
  },
  {
    title: 'Práctica',
    items: [
      { to: '/campus/ia', label: 'Entrenador con IA', icon: Sparkles },
      { to: '/campus/comunidad', label: 'Comunidad', icon: MessagesSquare },
      { to: '/campus/mensajes', label: 'Mensajes', icon: Mail },
    ],
  },
  {
    title: 'Mi trayectoria',
    items: [
      { to: '/campus/logros', label: 'Logros y clasificación', icon: Trophy },
      { to: '/campus/certificados', label: 'Certificados', icon: FileBadge2 },
      { to: '/campus/pagos', label: 'Pagos y facturas', icon: Wallet },
    ],
  },
];

const PANEL_NAV: NavGroup[] = [
  { items: [{ to: '/panel', label: 'Dashboard', icon: LayoutDashboard, end: true }] },
  {
    title: 'Académico',
    items: [
      { to: '/panel/cursos', label: 'Cursos', icon: BookOpen, perms: ['courses.manage', 'courses.teach'] },
      { to: '/panel/programas', label: 'Programas', icon: Layers, perms: ['courses.manage'] },
      { to: '/panel/categorias', label: 'Categorías', icon: FolderTree, perms: ['courses.manage'] },
      { to: '/panel/competencias', label: 'Competencias y rúbricas', icon: Target, perms: ['competencies.manage', 'courses.teach'] },
      { to: '/panel/calendario', label: 'Calendario y asistencia', icon: CalendarDays, perms: ['calendar.manage'] },
      { to: '/panel/certificados', label: 'Certificados', icon: FileBadge2, perms: ['certificates.manage'] },
    ],
  },
  {
    title: 'Personas',
    items: [
      { to: '/panel/estudiantes', label: 'Estudiantes', icon: GraduationCap, perms: ['students.manage', 'students.view_assigned'] },
      { to: '/panel/facilitadores', label: 'Facilitadores', icon: Users, perms: ['instructors.manage'] },
      { to: '/panel/comunidad', label: 'Comunidad y anuncios', icon: MessagesSquare, perms: ['community.moderate', 'announcements.manage'] },
    ],
  },
  {
    title: 'Crecimiento',
    items: [
      { to: '/panel/ia', label: 'Inteligencia artificial', icon: Bot, perms: ['ai.review', 'ai.manage'] },
      { to: '/panel/gamificacion', label: 'Gamificación', icon: Award, perms: ['gamification.manage'] },
      { to: '/panel/comercial', label: 'Comercial y pagos', icon: CreditCard, perms: ['payments.manage'] },
      { to: '/panel/reportes', label: 'Reportes', icon: BarChart3, perms: ['reports.view', 'reports.academic'] },
    ],
  },
  {
    title: 'Sistema',
    items: [
      { to: '/panel/usuarios', label: 'Usuarios', icon: UserCog, perms: ['users.manage'] },
      { to: '/panel/roles', label: 'Roles y permisos', icon: ShieldCheck, perms: ['roles.manage'] },
      { to: '/panel/configuracion', label: 'Configuración', icon: Settings, perms: ['settings.manage', 'audit.read'] },
    ],
  },
  { title: 'Mi docencia', items: [{ to: '/campus/cursos', label: 'Vista de estudiante', icon: Library, roles: ['INSTRUCTOR'] }] },
];

const STAFF = ['courses.manage', 'courses.teach', 'students.manage', 'reports.view', 'reports.academic', 'payments.manage', 'settings.manage', 'users.manage'];

const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { path: '/', element: L(() => import('@/pages/public/Home')) },
      { path: '/nosotros', element: L(() => import('@/pages/public/About')) },
      { path: '/programas', element: L(() => import('@/pages/public/Programs')) },
      { path: '/programas/:slug', element: L(() => import('@/pages/public/ProgramDetail')) },
      { path: '/cursos', element: L(() => import('@/pages/public/Catalog')) },
      { path: '/cursos/:slug', element: L(() => import('@/pages/public/CourseDetail')) },
      { path: '/facilitadores', element: L(() => import('@/pages/public/Instructors')) },
      { path: '/contacto', element: L(() => import('@/pages/public/Contact')) },
      { path: '/preguntas-frecuentes', element: L(() => import('@/pages/public/Faq')) },
      { path: '/verificar', element: L(() => import('@/pages/public/Verify')) },
      { path: '/verificar/:code', element: L(() => import('@/pages/public/Verify')) },
      { path: '/checkout', element: <RequireAuth>{L(() => import('@/pages/public/Checkout'))}</RequireAuth> },
      { path: '/ingresar', element: L(() => import('@/pages/auth/Login')) },
      { path: '/registro', element: L(() => import('@/pages/auth/Register')) },
      { path: '/recuperar', element: L(() => import('@/pages/auth/Forgot')) },
      { path: '/restablecer', element: L(() => import('@/pages/auth/Reset')) },
      { path: '/acceso-denegado', element: <AccessDenied /> },
      { path: '*', element: <NotFound /> },
    ],
  },
  {
    path: '/campus',
    element: (
      <RequireAuth>
        <AppShell groups={CAMPUS_NAV} area="campus" />
      </RequireAuth>
    ),
    children: [
      { index: true, element: L(() => import('@/pages/campus/Dashboard')) },
      { path: 'cursos', element: L(() => import('@/pages/campus/MyCourses')) },
      { path: 'cursos/:courseId', element: L(() => import('@/pages/campus/CourseHome')) },
      { path: 'cursos/:courseId/espacio', element: L(() => import('@/pages/campus/CourseSpace')) },
      { path: 'leccion/:lessonId', element: L(() => import('@/pages/campus/Lesson')) },
      { path: 'evaluaciones/:assessmentId', element: L(() => import('@/pages/campus/Assessment')) },
      { path: 'practicas/:activityId', element: L(() => import('@/pages/campus/Activity')) },
      { path: 'calificaciones', element: L(() => import('@/pages/campus/Grades')) },
      { path: 'competencias', element: L(() => import('@/pages/campus/Competencies')) },
      { path: 'calendario', element: L(() => import('@/pages/campus/Calendar')) },
      { path: 'ia', element: L(() => import('@/pages/campus/Coach')) },
      { path: 'ia/simulaciones/:id', element: L(() => import('@/pages/campus/Simulation')) },
      { path: 'ia/tutor', element: L(() => import('@/pages/campus/Tutor')) },
      { path: 'comunidad', element: L(() => import('@/pages/campus/Community')) },
      { path: 'comunidad/foro/:id', element: L(() => import('@/pages/campus/Forum')) },
      { path: 'comunidad/hilo/:id', element: L(() => import('@/pages/campus/Thread')) },
      { path: 'mensajes', element: L(() => import('@/pages/campus/Messages')) },
      { path: 'mensajes/:id', element: L(() => import('@/pages/campus/Messages')) },
      { path: 'logros', element: L(() => import('@/pages/campus/Achievements')) },
      { path: 'certificados', element: L(() => import('@/pages/campus/Certificates')) },
      { path: 'pagos', element: L(() => import('@/pages/campus/Payments')) },
      { path: 'notificaciones', element: L(() => import('@/pages/campus/Notifications')) },
      { path: 'perfil', element: L(() => import('@/pages/campus/Profile')) },
    ],
  },
  {
    path: '/panel',
    element: (
      <RequireAuth perms={STAFF}>
        <AppShell groups={PANEL_NAV} area="panel" />
      </RequireAuth>
    ),
    children: [
      { index: true, element: L(() => import('@/pages/panel/Dashboard')) },
      { path: 'cursos', element: L(() => import('@/pages/panel/Courses')) },
      { path: 'cursos/:id', element: L(() => import('@/pages/panel/CourseEditor')) },
      { path: 'evaluaciones/:id', element: L(() => import('@/pages/panel/AssessmentEditor')) },
      { path: 'actividades/:id', element: L(() => import('@/pages/panel/ActivityReview')) },
      { path: 'programas', element: L(() => import('@/pages/panel/Programs')) },
      { path: 'categorias', element: L(() => import('@/pages/panel/Categories')) },
      { path: 'competencias', element: L(() => import('@/pages/panel/Competencies')) },
      { path: 'calendario', element: L(() => import('@/pages/panel/Calendar')) },
      { path: 'asistencia/:eventId', element: L(() => import('@/pages/panel/Attendance')) },
      { path: 'certificados', element: L(() => import('@/pages/panel/Certificates')) },
      { path: 'estudiantes', element: L(() => import('@/pages/panel/Students')) },
      { path: 'estudiantes/:id', element: L(() => import('@/pages/panel/StudentRecord')) },
      { path: 'facilitadores', element: L(() => import('@/pages/panel/Instructors')) },
      { path: 'facilitadores/:id', element: L(() => import('@/pages/panel/InstructorDetail')) },
      { path: 'comunidad', element: L(() => import('@/pages/panel/Community')) },
      { path: 'ia', element: L(() => import('@/pages/panel/Ai')) },
      { path: 'ia/revisiones/:id', element: L(() => import('@/pages/panel/AiReview')) },
      { path: 'gamificacion', element: L(() => import('@/pages/panel/Gamification')) },
      { path: 'comercial', element: L(() => import('@/pages/panel/Commerce')) },
      { path: 'reportes', element: L(() => import('@/pages/panel/Reports')) },
      { path: 'usuarios', element: L(() => import('@/pages/panel/Users')) },
      { path: 'roles', element: L(() => import('@/pages/panel/Roles')) },
      { path: 'configuracion', element: L(() => import('@/pages/panel/Settings')) },
      { path: '*', element: <Navigate to="/panel" replace /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
