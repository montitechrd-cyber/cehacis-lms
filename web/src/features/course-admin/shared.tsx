import { useEffect, type ReactNode } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { IconButton } from '@/components/ui/Button';

export interface UserBrief {
  id: number;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  email?: string;
}

export interface FileOut {
  id: number;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
}

export interface Resource {
  id: number;
  lessonId: number;
  type: string;
  title: string;
  description: string | null;
  url: string | null;
  fileId: number | null;
  folderId: number | null;
  assessmentId: number | null;
  forumId: number | null;
  activityId: number | null;
  eventId: number | null;
  order: number;
  isRequired: boolean;
  isDownloadable: boolean;
  file: FileOut | null;
  folder: { id: number; name: string; filesCount: number } | null;
  assessment: { id: number; title: string; type: string } | null;
  forum: { id: number; title: string } | null;
  activity: { id: number; title: string; type: string } | null;
  event: { id: number; title: string; startAt: string } | null;
}

export interface LessonBrief {
  id: number;
  moduleId: number;
  title: string;
  summary: string | null;
  order: number;
  durationMin: number;
  isPublished: boolean;
  isPreview: boolean;
  availableFrom: string | null;
  completionRule: string;
  requiredAssessmentId: number | null;
  requiredActivityId: number | null;
  resources: Resource[];
}

export interface ModuleFull {
  id: number;
  courseId: number;
  title: string;
  description: string | null;
  order: number;
  isPublished: boolean;
  availableFrom: string | null;
  lessons: LessonBrief[];
}

export interface GroupItem {
  id: number;
  courseId: number;
  name: string;
  instructorId: number | null;
  instructor: UserBrief | null;
  startDate: string | null;
  endDate: string | null;
  capacity: number | null;
  enrollmentsCount: number;
}

export interface CourseFull {
  id: number;
  code: string;
  title: string;
  slug: string;
  subtitle: string | null;
  description: string | null;
  objectives: string[];
  audience: string | null;
  requirements: string | null;
  imageUrl: string | null;
  categoryId: number | null;
  category: { id: number; name: string; slug: string } | null;
  level: string;
  modality: string;
  durationHours: number;
  price: number;
  currency: string;
  isFree: boolean;
  status: string;
  startDate: string | null;
  endDate: string | null;
  capacity: number | null;
  enforceSequence: boolean;
  passingScore: number;
  requireAllLessons: boolean;
  minAttendancePct: number;
  certificateEnabled: boolean;
  certificateTemplateId: number | null;
  certificateTemplate?: { id: number; name: string } | null;
  competencies: { id: number; key: string; name: string }[];
  instructors: (UserBrief & { email: string; isLead: boolean })[];
  modules: ModuleFull[];
  groups: GroupItem[];
  counts: { modules: number; lessons: number; enrollments: number };
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  coursesCount: number;
}

export interface AssessmentListItem {
  id: number;
  courseId: number;
  lessonId: number | null;
  title: string;
  type: string;
  maxAttempts: number;
  isPublished: boolean;
  questionCount: number;
  attemptCount: number;
}

export interface ActivityListItem {
  id: number;
  courseId: number;
  lessonId: number | null;
  title: string;
  type: string;
  dueDate: string | null;
  maxScore: number;
  isPublished: boolean;
  groupsCount: number;
  submissionsCount: number;
  pendingCount: number;
  gradedCount: number;
  returnedCount: number;
}

export interface CompetencyOpt {
  id: number;
  key: string;
  name: string;
  group: string | null;
}

export interface RubricLevel {
  id: number;
  score: number;
  label: string;
  description: string | null;
}
export interface RubricCriterion {
  id: number;
  title: string;
  description: string | null;
  competency: { id: number; key: string; name: string } | null;
  weight: number;
  maxScore: number;
  order: number;
  levels: RubricLevel[];
}
export interface Rubric {
  id: number;
  title: string;
  description: string | null;
  criteria: RubricCriterion[];
}

export const SUBMISSION_TYPES: Record<string, string> = { VIDEO: 'Video', AUDIO: 'Audio', FILE: 'Archivo', TEXT: 'Texto', LINK: 'Enlace' };
export const SUBMISSION_STATUS: Record<string, string> = { SUBMITTED: 'Entregada', GRADED: 'Calificada', RETURNED: 'Devuelta' };
export const ATTEMPT_STATUS: Record<string, string> = { IN_PROGRESS: 'En curso', SUBMITTED: 'Por calificar', GRADED: 'Calificado' };

/** Permisos de edición del curso según el rol. */
export function toOptions(map: Record<string, string>) {
  return Object.entries(map).map(([value, label]) => ({ value, label }));
}

/** Convierte una fecha ISO a valor de <input type="date">. */
export const toDateInput = (d: string | null | undefined) => (d ? d.slice(0, 10) : '');
/** Convierte una fecha ISO a valor de <input type="datetime-local">. */
export const toLocalInput = (d: string | null | undefined) => {
  if (!d) return '';
  const x = new Date(d);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}T${p(x.getHours())}:${p(x.getMinutes())}`;
};
export const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : null);
export const fromDateInput = (v: string) => (v ? v : null);

/** Mueve un elemento en una lista (devuelve copia). */
export function moveItem<T>(list: T[], from: number, to: number) {
  if (to < 0 || to >= list.length || from === to) return list;
  const next = [...list];
  const [it] = next.splice(from, 1);
  next.splice(to, 0, it!);
  return next;
}

export function MoveButtons({ index, total, onMove, label }: { index: number; total: number; onMove: (to: number) => void; label: string }) {
  return (
    <span className="inline-flex">
      <IconButton label={`Subir ${label}`} size="sm" disabled={index === 0} onClick={() => onMove(index - 1)}>
        <ArrowUp className="size-4" />
      </IconButton>
      <IconButton label={`Bajar ${label}`} size="sm" disabled={index === total - 1} onClick={() => onMove(index + 1)}>
        <ArrowDown className="size-4" />
      </IconButton>
    </span>
  );
}

/** Aviso del navegador ante cambios sin guardar. */
export function useBeforeUnload(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);
}

export function Row({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>;
}

export interface Folder {
  id: number;
  name: string;
  courseId: number;
  createdAt: string;
  files: (FileOut & { createdAt: string })[];
}
