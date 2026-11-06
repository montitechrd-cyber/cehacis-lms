import { useState, type ReactNode } from 'react';
import { useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { Award, Flame, GraduationCap, Medal, MessageCircle, Mic, Sparkles, Star, Trophy, Users, type LucideIcon } from 'lucide-react';
import { api, errorMessage, type Paged } from '@/lib/api';
import { ConfirmDialog } from '@/components/ui/Overlay';
import { Tag } from '@/components/ui/Data';

/** Pestaña activa en `?tab=`; al cambiar se limpian los filtros de la pestaña anterior. */
export function useTab<K extends string>(allowed: K[]): [K, (k: K) => void] {
  const [sp, setSp] = useSearchParams();
  const raw = sp.get('tab') as K | null;
  const value = raw && allowed.includes(raw) ? raw : allowed[0]!;
  return [value, (k: K) => setSp(new URLSearchParams({ tab: k }), { replace: true })];
}

export interface CourseLite {
  id: number;
  code: string;
  title: string;
}

/** Cursos para selects (el facilitador solo recibe los suyos). */
export function useCourseOptions(enabled = true) {
  const q = useQuery({
    queryKey: ['select-courses'],
    enabled,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => (await api.get<Paged<CourseLite>>('/catalog/courses', { pageSize: 100 })).data,
  });
  const courses = q.data ?? [];
  return { courses, loading: q.isLoading, options: courses.map((c) => ({ value: c.id, label: `${c.code} · ${c.title}` })) };
}

export interface CompetencyLite {
  id: number;
  key: string;
  name: string;
}

export function useCompetencies(enabled = true) {
  const q = useQuery({
    queryKey: ['select-competencies'],
    enabled,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const r = await api.get<CompetencyLite[] | { data: CompetencyLite[] }>('/competencies', { all: 1 });
      return Array.isArray(r) ? r : r.data;
    },
  });
  return { competencies: q.data ?? [], options: (q.data ?? []).map((c) => ({ value: c.id, label: c.name })) };
}

/** Confirmación + borrado; refresca la lista aunque el servidor responda 409 (p. ej. "se desactivó en su lugar"). */
export function useDeleter(opts: { path: (id: number) => string; invalidate: QueryKey[]; title: string; description?: ReactNode; success?: string; confirmLabel?: string }) {
  const qc = useQueryClient();
  const [target, setTarget] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const run = async () => {
    if (target == null) return;
    setBusy(true);
    try {
      await api.del(opts.path(target));
      toast.success(opts.success ?? 'Eliminado');
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
      setTarget(null);
      await Promise.all(opts.invalidate.map((k) => qc.invalidateQueries({ queryKey: k })));
    }
  };
  return {
    ask: (id: number) => setTarget(id),
    dialog: <ConfirmDialog open={target != null} onClose={() => setTarget(null)} onConfirm={run} loading={busy} title={opts.title} description={opts.description} confirmLabel={opts.confirmLabel ?? 'Eliminar'} />,
  };
}

export const TestTag = () => <Tag tone="warning">Prueba</Tag>;

export const numOrNull = (s: string) => (s.trim() === '' ? null : Number(s));
export const dayInput = (iso?: string | null) => (iso ? iso.slice(0, 10) : '');
export const strOrNull = (s: string) => (s.trim() === '' ? null : s.trim());

/** Iconos de insignias (clave guardada en `badge.icon`). */
export const BADGE_ICONS: Record<string, { label: string; Icon: LucideIcon }> = {
  award: { label: 'Premio', Icon: Award },
  mic: { label: 'Micrófono', Icon: Mic },
  'message-circle': { label: 'Mensaje', Icon: MessageCircle },
  'graduation-cap': { label: 'Birrete', Icon: GraduationCap },
  sparkles: { label: 'Destellos', Icon: Sparkles },
  flame: { label: 'Llama', Icon: Flame },
  users: { label: 'Personas', Icon: Users },
  medal: { label: 'Medalla', Icon: Medal },
  star: { label: 'Estrella', Icon: Star },
  trophy: { label: 'Trofeo', Icon: Trophy },
};

export function BadgeIcon({ name, className = 'size-5' }: { name: string; className?: string }) {
  const Icon = BADGE_ICONS[name]?.Icon ?? Award;
  return <Icon className={className} aria-hidden />;
}

/** Contenedor de acciones de fila. */
export function RowActions({ children }: { children: ReactNode }) {
  return <div className="flex items-center justify-end gap-0.5">{children}</div>;
}

export const AUDIENCES: Record<string, string> = { ALL: 'Toda la comunidad', STUDENTS: 'Estudiantes', INSTRUCTORS: 'Facilitadores', COURSE: 'Un curso' };
