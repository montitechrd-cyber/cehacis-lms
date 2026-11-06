import { useState, type ComponentType, type ReactNode } from 'react';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import clsx from 'clsx';
import { Award, Check, Flame, GraduationCap, Medal, MessageCircle, Mic, Sparkles, Star, Trophy, Users, X } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { ErrorState, Skeleton, SkeletonRows, Spinner } from '@/components/ui/Feedback';
import { SearchInput } from '@/components/ui/Data';
import { Avatar } from '@/components/ui/Data';
import { fullName } from '@/lib/format';

/** Usuario breve de comunidad (autores, miembros, contactos). */
export interface CommunityUser {
  id: number;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  role?: string;
}

/** Resuelve carga / error / datos de una consulta con los estados estándar. */
export function Q<T>({ query, children, skeleton }: { query: UseQueryResult<T>; children: (d: T) => ReactNode; skeleton?: ReactNode }) {
  if (query.isLoading) return <>{skeleton ?? <SkeletonRows />}</>;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  if (query.data === undefined) return null;
  return <>{children(query.data)}</>;
}

export function BlockSkeleton({ className = 'h-40' }: { className?: string }) {
  return <Skeleton className={clsx('w-full', className)} />;
}

/** Texto plano de usuario: conserva saltos de línea y nunca interpreta HTML. */
export function PlainText({ children, className }: { children: string; className?: string }) {
  return <p className={clsx('whitespace-pre-wrap break-words', className)}>{children}</p>;
}

/** Puntuación 1–5 como barra segmentada de cinco cuadros (forma, no solo color). */
export function SegmentScore({ score, max = 5, label }: { score: number; max?: number; label?: string }) {
  const filled = Math.round(score);
  return (
    <div className="flex gap-1" role="img" aria-label={label ?? `${score} de ${max}`}>
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} className={clsx('h-3 flex-1 border', i < filled ? 'border-ink bg-ink' : 'border-line-strong bg-paper')} />
      ))}
    </div>
  );
}

/** Mapa de iconos de insignias: nombre lucide en kebab-case -> componente. */
const BADGE_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  award: Award,
  mic: Mic,
  'message-circle': MessageCircle,
  'graduation-cap': GraduationCap,
  sparkles: Sparkles,
  flame: Flame,
  users: Users,
  medal: Medal,
  star: Star,
  trophy: Trophy,
};

export function BadgeIcon({ name, className }: { name?: string | null; className?: string }) {
  const Icon = (name && BADGE_ICONS[name]) || Award;
  return <Icon className={className} />;
}

/** Mensajes claros para los errores habituales de la IA. */
export function aiErrorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 503) return 'El entrenador con IA aún no está activado en esta institución. Intenta de nuevo cuando la administración lo configure.';
    if (e.status === 429) return 'Has enviado demasiadas solicitudes en poco tiempo. Espera un minuto e inténtalo de nuevo.';
    if (e.status === 422) return 'La IA no pudo responder a ese mensaje. Reformúlalo con otras palabras e inténtalo de nuevo.';
    if (e.status === 502) return 'El servicio de IA no respondió correctamente. Inténtalo de nuevo en unos instantes.';
    return e.message;
  }
  return 'Ocurrió un error inesperado';
}

/**
 * Buscador de contactos con selección simple o múltiple.
 * El estado de selección vive en el padre (arreglo de usuarios).
 */
export function ContactPicker({
  selected,
  onChange,
  multi = true,
  max = 20,
  label = 'Destinatarios',
}: {
  selected: CommunityUser[];
  onChange: (u: CommunityUser[]) => void;
  multi?: boolean;
  max?: number;
  label?: string;
}) {
  const [q, setQ] = useState('');
  const contacts = useQuery({
    queryKey: ['community', 'contacts', q],
    queryFn: async () => (await api.get<{ data: CommunityUser[] }>('/community/contacts', { q })).data,
    staleTime: 60_000,
  });
  const isSel = (u: CommunityUser) => selected.some((s) => s.id === u.id);
  const toggle = (u: CommunityUser) => {
    if (isSel(u)) onChange(selected.filter((s) => s.id !== u.id));
    else if (!multi) onChange([u]);
    else if (selected.length < max) onChange([...selected, u]);
  };

  return (
    <div>
      <p className="mb-1.5 text-[0.8125rem] font-semibold">{label}</p>
      {selected.length > 0 && (
        <ul className="mb-2 flex flex-wrap gap-1.5" aria-label="Seleccionados">
          {selected.map((u) => (
            <li key={u.id} className="inline-flex items-center gap-1.5 bg-ink py-1 pl-2 pr-1 text-xs font-semibold text-paper">
              {fullName(u)}
              <button type="button" onClick={() => toggle(u)} aria-label={`Quitar a ${fullName(u)}`} className="inline-flex size-5 items-center justify-center hover:bg-graphite">
                <X className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <SearchInput value={q} onChange={setQ} placeholder="Buscar contacto por nombre" />
      <div className="mt-2 max-h-56 overflow-y-auto border-y border-line" role="listbox" aria-label="Contactos" aria-multiselectable={multi}>
        {contacts.isLoading && (
          <div className="flex items-center gap-2 p-4 text-sm text-graphite">
            <Spinner size={14} /> Buscando…
          </div>
        )}
        {contacts.isError && <p className="p-4 text-sm text-danger">No se pudieron cargar los contactos.</p>}
        {contacts.data?.length === 0 && <p className="p-4 text-sm text-graphite">No hay contactos que coincidan.</p>}
        <ul className="divide-y divide-line">
          {contacts.data?.map((u) => (
            <li key={u.id} role="option" aria-selected={isSel(u)}>
              <button type="button" onClick={() => toggle(u)} className="flex w-full items-center gap-3 px-2 py-2 text-left hover:bg-stone">
                <Avatar user={u} size={28} />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{fullName(u)}</span>
                {isSel(u) && <Check className="size-4 shrink-0" aria-hidden />}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
