import { useEffect, useState, type KeyboardEvent, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { X } from 'lucide-react';
import { api, type Paged } from '@/lib/api';
import { fullName } from '@/lib/format';
import { Avatar } from '@/components/ui/Data';
import { Field } from '@/components/ui/Form';

export interface CourseOption {
  id: number;
  code: string;
  title: string;
  status: string;
}

/** Lista de cursos para selects (los que el usuario puede ver en el catálogo de gestión). */
export function useCourses(enabled = true) {
  return useQuery({
    queryKey: ['catalog', 'courses', 'options'],
    queryFn: async () => (await api.get<Paged<CourseOption>>('/catalog/courses', { pageSize: 100, sort: 'title', order: 'asc' })).data,
    staleTime: 5 * 60 * 1000,
    enabled,
  });
}

export const courseOptions = (courses?: CourseOption[]) => (courses ?? []).map((c) => ({ value: c.id, label: c.title }));

export function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export interface PersonBrief {
  id: number;
  firstName: string;
  lastName: string;
  email?: string;
  avatarUrl?: string | null;
}

const p2 = (n: number) => String(n).padStart(2, '0');

/** Datos de entrada `datetime-local` <-> ISO. */
export function toLocalInput(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}T${p2(d.getHours())}:${p2(d.getMinutes())}`;
}
export const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : undefined);

/** Fecha YYYY-MM-DD en hora local. */
export function ymd(d: Date) {
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
}

/** Día corto de una fecha YYYY-MM-DD (UTC) para ejes de gráficos. */
export function shortDay(s: string) {
  return new Intl.DateTimeFormat('es-DO', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(s));
}

/** Buscador de estudiantes con selección múltiple o simple. */
export function StudentPicker({
  value,
  onChange,
  single,
  label = 'Estudiantes',
  hint,
}: {
  value: PersonBrief[];
  onChange: (v: PersonBrief[]) => void;
  single?: boolean;
  label?: string;
  hint?: ReactNode;
}) {
  const [q, setQ] = useState('');
  const dq = useDebounced(q.trim());
  const { data, isFetching } = useQuery({
    queryKey: ['people', 'students', 'picker', dq],
    queryFn: () => api.get<Paged<PersonBrief>>('/people/students', { q: dq, pageSize: 8 }),
    enabled: dq.length >= 2,
  });
  const results = (data?.data ?? []).filter((s) => !value.some((v) => v.id === s.id));
  const add = (s: PersonBrief) => {
    onChange(single ? [s] : [...value, s]);
    setQ('');
  };
  return (
    <Field label={label} hint={hint}>
      {(id, desc) => (
        <div>
          {value.length > 0 && (
            <ul className="mb-2 flex flex-wrap gap-2" aria-label="Seleccionados">
              {value.map((s) => (
                <li key={s.id} className="inline-flex items-center gap-2 rounded-sm bg-stone py-1 pl-1 pr-2 text-sm">
                  <Avatar user={s} size={22} />
                  <span>{fullName(s)}</span>
                  <button type="button" aria-label={`Quitar a ${fullName(s)}`} onClick={() => onChange(value.filter((v) => v.id !== s.id))} className="text-graphite hover:text-danger">
                    <X className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {(!single || value.length === 0) && (
            <>
              <input
                id={id}
                aria-describedby={desc}
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Busca por nombre o correo (mín. 2 letras)"
                className="h-10 w-full rounded-sm border border-line-strong bg-paper px-3 text-[0.9375rem] placeholder:text-muted hover:border-graphite focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
              />
              {dq.length >= 2 && (
                <ul className="mt-1 max-h-48 divide-y divide-line overflow-y-auto border border-line bg-paper">
                  {results.map((s) => (
                    <li key={s.id}>
                      <button type="button" onClick={() => add(s)} className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-stone">
                        <Avatar user={s} size={26} />
                        <span className="min-w-0">
                          <span className="block truncate font-semibold">{fullName(s)}</span>
                          <span className="block truncate text-xs text-muted">{s.email}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                  {!results.length && <li className="px-3 py-2 text-sm text-muted">{isFetching ? 'Buscando…' : 'Sin resultados'}</li>}
                </ul>
              )}
            </>
          )}
        </div>
      )}
    </Field>
  );
}

/** Entrada de etiquetas (chips): Enter o coma para agregar. */
export function ChipsInput({ value, onChange, label, hint, placeholder }: { value: string[]; onChange: (v: string[]) => void; label: string; hint?: ReactNode; placeholder?: string }) {
  const [text, setText] = useState('');
  const commit = () => {
    const t = text.trim().replace(/,$/, '');
    if (t && !value.includes(t)) onChange([...value, t]);
    setText('');
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commit();
    } else if (e.key === 'Backspace' && !text && value.length) onChange(value.slice(0, -1));
  };
  return (
    <Field label={label} hint={hint ?? 'Escribe y pulsa Enter para agregar'}>
      {(id, desc) => (
        <div className="flex flex-wrap items-center gap-2 rounded-sm border border-line-strong bg-paper p-2 focus-within:border-ink focus-within:ring-1 focus-within:ring-ink">
          {value.map((v) => (
            <span key={v} className="inline-flex items-center gap-1 rounded-xs bg-stone px-2 py-1 text-sm">
              {v}
              <button type="button" aria-label={`Quitar ${v}`} onClick={() => onChange(value.filter((x) => x !== v))} className="text-graphite hover:text-danger">
                <X className="size-3.5" />
              </button>
            </span>
          ))}
          <input id={id} aria-describedby={desc} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={onKey} onBlur={commit} placeholder={placeholder} className="min-w-[8rem] flex-1 bg-transparent px-1 py-1 text-[0.9375rem] outline-none placeholder:text-muted" />
        </div>
      )}
    </Field>
  );
}

/** Control segmentado (radio group visual). */
export function Segmented<K extends string>({ value, onChange, options, label, size = 'md' }: { value: K; onChange: (k: K) => void; options: { key: K; label: string }[]; label: string; size?: 'sm' | 'md' }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex flex-wrap border border-line-strong">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          role="radio"
          aria-checked={value === o.key}
          onClick={() => onChange(o.key)}
          className={clsx(
            'border-r border-line-strong px-3 font-semibold transition-colors last:border-r-0',
            size === 'sm' ? 'h-8 text-xs' : 'h-10 text-sm',
            value === o.key ? 'bg-ink text-paper' : 'bg-paper text-ink hover:bg-stone',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

/** Tooltip de recharts con estilo del sistema. */
export const chartTooltip = {
  contentStyle: { background: 'var(--color-paper)', border: '1px solid var(--color-ink)', borderRadius: 2, fontSize: 12, padding: '6px 10px', boxShadow: 'none' },
  labelStyle: { fontWeight: 700, color: 'var(--color-ink)' },
  itemStyle: { color: 'var(--color-graphite)', padding: 0 },
  cursor: { stroke: 'var(--color-line)' },
};
