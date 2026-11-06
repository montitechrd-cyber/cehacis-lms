import type { StepStatus } from '@/components/ui/StepRow';

export interface OutlineLesson {
  id: number;
  title: string;
  order: number;
  durationMin: number | null;
  completionRule: string;
  status: StepStatus;
  lockReason: string | null;
  resourceTypes: string[];
}
export interface OutlineModule {
  id: number;
  title: string;
  order: number;
  availableFrom: string | null;
  lessons: OutlineLesson[];
}
export interface Outline {
  course: { id: number; code?: string; title: string; slug: string; enforceSequence: boolean; passingScore: number };
  progressPct: number;
  currentLessonId: number | null;
  modules: OutlineModule[];
  flat: number[];
}

export interface FileOut {
  id: number;
  originalName?: string;
  name?: string;
  mimeType: string;
  size: number;
  url: string;
}
export interface LessonResource {
  id: number;
  type: string;
  title: string;
  description: string | null;
  url: string | null;
  isRequired: boolean;
  isDownloadable: boolean;
  viewed: boolean;
  file: FileOut | null;
  folder: { id: number; name: string; files: FileOut[] } | null;
  assessment: { id: number; title: string; type: string; passingScore: number; maxAttempts: number; attemptsUsed: number; bestPercentage: number | null; passed: boolean | null } | null;
  activity: { id: number; title: string; type: string; dueDate: string | null; submitted: boolean; status: string | null } | null;
  forum: { id: number; title: string; threadCount: number } | null;
  event: { id: number; title: string; startAt: string; endAt: string; meetingUrl: string | null; recordingUrl: string | null } | null;
}
export interface NavLesson {
  id: number;
  title: string;
  locked: boolean;
  lockReason?: string | null;
}
export interface LessonData {
  lesson: { id: number; title: string; summary: string | null; content: string | null; durationMin: number | null; completionRule: string; moduleId: number; moduleTitle: string };
  resources: LessonResource[];
  progress: { status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'; completedAt: string | null };
  requirement: { rule: string; ok: boolean; missing: string[] };
  navigation: { prev: NavLesson | null; next: NavLesson | null; index: number; total: number };
  course: { id: number; title: string; slug: string; enforceSequence: boolean };
}
export interface CompleteResult {
  completed: boolean;
  enrollmentProgress: number;
  next: { id: number; title: string } | null;
  courseCompleted: boolean;
}
export interface MyCourse {
  enrollment: { id: number; status: string; progressPct: number; enrolledAt: string; completedAt: string | null; finalGrade: number | null };
  course: { id: number; title: string; slug: string; code: string; imageUrl: string | null; level: string; modality: string; durationHours: number | null; category: { id: number; name: string; slug: string } | null };
  instructors: { id: number; firstName: string; lastName: string; avatarUrl: string | null }[];
  lastLesson: { id: number; title: string } | null;
  nextLesson: { id: number; title: string } | null;
}
export interface EventItem {
  id: number;
  title: string;
  type: string;
  course: { id: number; title: string } | null;
  startAt: string;
  endAt: string;
  location: string | null;
  meetingUrl: string | null;
}
export interface UserBrief {
  id: number;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  role: string;
}
export interface Announcement {
  id: number;
  title: string;
  body: string;
  isPinned: boolean;
  publishedAt: string;
  author: UserBrief;
  course: { id: number; title: string; slug: string } | null;
}

export function flatLessons(o?: Outline) {
  if (!o) return [];
  const map = new Map<number, OutlineLesson>();
  o.modules.forEach((m) => m.lessons.forEach((l) => map.set(l.id, l)));
  const ordered = o.flat.map((id) => map.get(id)).filter(Boolean) as OutlineLesson[];
  return ordered.length ? ordered : [...map.values()];
}
export const isoIn = (days: number) => new Date(Date.now() + days * 86400_000).toISOString();
