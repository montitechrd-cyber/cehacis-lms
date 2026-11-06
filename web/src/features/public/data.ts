import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, type Paged } from '@/lib/api';

export interface CourseCard {
  id: number;
  code: string;
  title: string;
  slug: string;
  subtitle: string | null;
  imageUrl: string | null;
  level: string;
  modality: string;
  durationHours: number | null;
  price: number;
  isFree: boolean;
  currency: string;
  startDate: string | null;
  category: { id: number; name: string; slug: string } | null;
  instructors: { id: number; firstName: string; lastName: string; avatarUrl: string | null; headline: string | null }[];
  competencies: { id: number; name: string }[];
  lessonsCount: number;
  modulesCount: number;
  rating: { avg: number; count: number } | null;
}

export interface ProgramSummary {
  id: number;
  title: string;
  slug: string;
  summary: string | null;
  imageUrl: string | null;
  price: number;
}

export interface CourseDetailData extends CourseCard {
  description: string | null;
  objectives: unknown;
  audience: string | null;
  requirements: string | null;
  endDate: string | null;
  capacity: number | null;
  seatsLeft: number | null;
  passingScore: number | null;
  certificateEnabled: boolean;
  minAttendancePct: number | null;
  outline: { title: string; lessons: { title: string; durationMin: number | null; isPreview: boolean }[] }[];
  previewLessons: { id: number; title: string; content: string | null }[];
  reviews: { rating: number; comment: string | null; createdAt: string; name: string }[];
  relatedCourses: CourseCard[];
  programs: ProgramSummary[];
}

export interface Program extends ProgramSummary {
  coursesCount: number;
  totalHours: number | null;
  courses: CourseCard[];
  description?: string | null;
}

export interface PublicInstructor {
  id: number;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  headline: string | null;
  bio: string | null;
  specialties: string[];
  yearsExperience: number | null;
  linkedinUrl: string | null;
  courses: { title: string; slug: string }[];
}

export interface Stats {
  publishedCourses: number;
  categories: number;
  instructorsPublic: number;
  competencies: number;
}

export interface Faq {
  id: number;
  question: string;
  answer: string;
}

type Q = Record<string, string | number | boolean | null | undefined>;

export const useCourses = (params: Q) =>
  useQuery({ queryKey: ['public', 'courses', params], queryFn: () => api.get<Paged<CourseCard>>('/public/courses', params), placeholderData: (p) => p });

export const useStats = () => useQuery({ queryKey: ['public', 'stats'], queryFn: async () => (await api.get<{ data: Stats }>('/public/stats')).data, staleTime: 5 * 60_000 });

export const useFaqs = () => useQuery({ queryKey: ['public', 'faqs'], queryFn: async () => (await api.get<{ data: Faq[] }>('/public/faqs')).data, staleTime: 5 * 60_000 });

export const useCategories = () =>
  useQuery({
    queryKey: ['public', 'categories'],
    queryFn: async () => (await api.get<{ data: { id: number; name: string; slug: string; coursesCount: number }[] }>('/public/categories')).data,
    staleTime: 5 * 60_000,
  });

export function usePageTitle(title: string) {
  useEffect(() => {
    const prev = document.title;
    document.title = `${title} · CEHACIS`;
    return () => {
      document.title = prev;
    };
  }, [title]);
}

export const isFreeCourse = (c: { isFree: boolean; price: number }) => c.isFree || Number(c.price) === 0;

export function priceLabel(c: { isFree?: boolean; price: number; currency?: string }) {
  if (c.isFree || Number(c.price) === 0) return 'Gratis';
  const p = Number(c.price);
  const n = new Intl.NumberFormat('es-DO', { minimumFractionDigits: p % 1 ? 2 : 0, maximumFractionDigits: 2 }).format(p);
  return `${c.currency ?? 'USD'} ${n}`;
}

/** Normaliza el JSON de objetivos a una lista de textos. */
export function toList(v: unknown): string[] {
  if (!v) return [];
  if (typeof v === 'string') return v.split(/\r?\n/).map((s) => s.replace(/^[-*•]\s*/, '').trim()).filter(Boolean);
  if (Array.isArray(v)) {
    return v
      .map((x) => (typeof x === 'string' ? x : x && typeof x === 'object' ? String((x as Record<string, unknown>).text ?? (x as Record<string, unknown>).title ?? '') : ''))
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}
