import { useEffect, useState, type ReactNode } from 'react';
import clsx from 'clsx';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { initials } from '@/lib/format';
import { SkeletonRows } from './Feedback';

export interface Column<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  sortable?: boolean;
  className?: string;
  align?: 'left' | 'right' | 'center';
}

/** Tabla de datos con orden por columna, estados de carga y vacío. Filtros y paginación van fuera. */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading,
  empty,
  sort,
  onSort,
  onRowClick,
}: {
  columns: Column<T>[];
  rows: T[] | undefined;
  rowKey: (r: T) => string | number;
  loading?: boolean;
  empty?: ReactNode;
  sort?: { key: string; order: 'asc' | 'desc' };
  onSort?: (key: string) => void;
  onRowClick?: (r: T) => void;
}) {
  if (loading && !rows) return <SkeletonRows />;
  if (!rows?.length) return <>{empty ?? <p className="border-y border-line py-10 text-center text-sm text-graphite">No hay registros que coincidan.</p>}</>;
  return (
    <div className="overflow-x-auto border-t border-ink">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-line">
            {columns.map((c) => {
              const active = sort?.key === c.key;
              return (
                <th
                  key={c.key}
                  scope="col"
                  aria-sort={active ? (sort!.order === 'asc' ? 'ascending' : 'descending') : undefined}
                  className={clsx('whitespace-nowrap px-3 py-3 text-[0.75rem] font-semibold uppercase tracking-[0.06em] text-graphite', c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : 'text-left', c.className)}
                >
                  {c.sortable && onSort ? (
                    <button type="button" onClick={() => onSort(c.key)} className="inline-flex items-center gap-1 uppercase hover:text-ink">
                      {c.header}
                      {active && (sort!.order === 'asc' ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
                    </button>
                  ) : (
                    c.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className={clsx(loading && 'opacity-60')}>
          {rows.map((r) => (
            <tr
              key={rowKey(r)}
              onClick={onRowClick ? () => onRowClick(r) : undefined}
              onKeyDown={onRowClick ? (e) => (e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget && (e.preventDefault(), onRowClick(r)) : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              className={clsx('border-b border-line transition-colors', onRowClick && 'cursor-pointer hover:bg-stone')}
            >
              {columns.map((c) => (
                <td key={c.key} className={clsx('px-3 py-3 align-middle tnum', c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : 'text-left', c.className)}>
                  {c.cell(r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Pagination({ page, pages, total, onPage }: { page: number; pages: number; total?: number; onPage: (p: number) => void }) {
  if (pages <= 1) return total != null ? <p className="mt-3 text-xs text-muted tnum">{total} registros</p> : null;
  return (
    <nav className="mt-4 flex items-center justify-between gap-4 text-sm" aria-label="Paginación">
      <span className="text-muted tnum">
        Página {page} de {pages}
        {total != null && ` · ${total} registros`}
      </span>
      <div className="flex gap-1">
        <button type="button" className="inline-flex size-9 items-center justify-center rounded-sm border border-line hover:border-ink disabled:opacity-40" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Página anterior">
          <ChevronLeft className="size-4" />
        </button>
        <button type="button" className="inline-flex size-9 items-center justify-center rounded-sm border border-line hover:border-ink disabled:opacity-40" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Página siguiente">
          <ChevronRight className="size-4" />
        </button>
      </div>
    </nav>
  );
}

/** Búsqueda con retardo (300 ms) para filtros de tablas. */
export function SearchInput({ value, onChange, placeholder = 'Buscar…', className }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  useEffect(() => {
    const t = setTimeout(() => v !== value && onChange(v), 300);
    return () => clearTimeout(t);
  }, [v]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <label className={clsx('relative block', className)}>
      <span className="sr-only">{placeholder}</span>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
      <input
        type="search"
        value={v}
        onChange={(e) => setV(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-sm border border-line-strong bg-paper pl-9 pr-3 text-sm placeholder:text-muted hover:border-graphite focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
      />
    </label>
  );
}

export function Toolbar({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx('mb-4 flex flex-wrap items-end gap-3', className)}>{children}</div>;
}

/*
 * Etiquetas de estado: el estado se lee por la MARCA (forma), no por el matiz.
 *   success = cuadro relleno (hecho / publicado / pagado) · warning = cuadro vacío (pendiente / por hacer)
 *   info = cuadro con trazo cortado (en desarrollo / vista previa / devuelto) · danger = cuadro tachado (fallido / revocado)
 * Texto siempre en tinta o grafito; el rojo queda solo para lo destructivo.
 */
const tagTones = {
  neutral: 'border border-line-strong text-graphite',
  ink: 'bg-ink text-paper',
  orange: 'bg-orange text-ink',
  success: 'border border-ink text-ink',
  danger: 'border border-danger text-danger',
  warning: 'border border-ink text-ink',
  info: 'border border-dashed border-graphite text-graphite',
  outline: 'border border-line-strong text-graphite',
};

export type TagTone = keyof typeof tagTones;

function TagMark({ tone }: { tone: TagTone }) {
  if (tone === 'success') return <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden><rect width="8" height="8" fill="currentColor" /></svg>;
  if (tone === 'warning') return <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden><rect x=".75" y=".75" width="6.5" height="6.5" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>;
  if (tone === 'info') return <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden><rect x=".75" y=".75" width="6.5" height="6.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 1.5" /></svg>;
  if (tone === 'danger') return <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden><rect x=".75" y=".75" width="6.5" height="6.5" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M1 7L7 1" stroke="currentColor" strokeWidth="1.5" /></svg>;
  return null;
}

export function Tag({ tone = 'neutral', children, className }: { tone?: TagTone; children: ReactNode; className?: string }) {
  return (
    <span className={clsx('inline-flex items-center gap-1.5 rounded-xs px-1.5 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-[0.05em] whitespace-nowrap', tagTones[tone], className)}>
      <TagMark tone={tone} />
      {children}
    </span>
  );
}

/** Tono de etiqueta para estados comunes del sistema. */
export function statusTone(s: string): TagTone {
  if (['PUBLISHED', 'ACTIVE', 'PAID', 'APPROVED', 'COMPLETED', 'GRADED', 'VALID', 'PRESENT', 'REVIEWED', 'SENT', 'RESOLVED'].includes(s)) return 'success';
  if (['DRAFT', 'PENDING', 'SUBMITTED', 'IN_PROGRESS', 'AI_GENERATED', 'QUEUED', 'LOGGED', 'LATE', 'NEW', 'OPEN', 'PENDING_PAYMENT'].includes(s)) return 'warning';
  if (['FAILED', 'DECLINED', 'SUSPENDED', 'REVOKED', 'ABSENT', 'CANCELLED', 'REFUNDED', 'HIDDEN'].includes(s)) return 'danger';
  if (['IN_DEVELOPMENT', 'RETURNED', 'EXCUSED'].includes(s)) return 'info';
  return 'neutral';
}

export function Avatar({ user, size = 36, className }: { user?: { firstName?: string; lastName?: string; avatarUrl?: string | null } | null; size?: number; className?: string }) {
  const style = { width: size, height: size, fontSize: Math.max(10, size * 0.36) };
  if (user?.avatarUrl) return <img src={user.avatarUrl} alt="" style={style} className={clsx('shrink-0 rounded-sm object-cover', className)} />;
  return (
    <span style={style} className={clsx('inline-flex shrink-0 items-center justify-center rounded-sm bg-ink font-bold text-paper', className)} aria-hidden>
      {initials(user)}
    </span>
  );
}

/** Barra de progreso fina (regla) con valor tabular. */
export function ProgressRule({ value, label, showValue = true, className }: { value: number; label?: string; showValue?: boolean; className?: string }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className={clsx('flex items-center gap-3', className)}>
      <div className="relative h-1.5 flex-1 bg-stone-2" role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} aria-label={label ?? 'Progreso'}>
        <div className="absolute inset-y-0 left-0 bg-ink transition-[width] duration-700 ease-out" style={{ width: `${v}%` }} />
      </div>
      {showValue && <span className="w-10 text-right text-xs font-semibold tnum">{v}%</span>}
    </div>
  );
}

/** Pestañas accesibles (role=tablist). */
export function Tabs<K extends string>({ tabs, value, onChange, className }: { tabs: { key: K; label: ReactNode; count?: number }[]; value: K; onChange: (k: K) => void; className?: string }) {
  return (
    <div role="tablist" className={clsx('flex gap-6 overflow-x-auto border-b border-line [scrollbar-width:none] [&::-webkit-scrollbar]:hidden', className)}>
      {tabs.map((t) => (
        <button
          key={t.key}
          role="tab"
          type="button"
          aria-selected={value === t.key}
          onClick={() => onChange(t.key)}
          className={clsx(
            '-mb-px inline-flex shrink-0 items-center gap-2 border-b-2 pb-3 pt-1 text-sm font-semibold transition-colors',
            value === t.key ? 'border-orange text-ink' : 'border-transparent text-graphite hover:text-ink',
          )}
        >
          {t.label}
          {t.count != null && <span className="text-xs text-muted tnum">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

/**
 * Fila de datos clave tipo libro de registro (en vez de tarjetas de métricas):
 * etiquetas pequeñas sobre cifras grandes, separadas por reglas verticales.
 */
export function Ledger({ items, className }: { items: { label: string; value: ReactNode; note?: ReactNode }[]; className?: string }) {
  return (
    <dl className={clsx('grid grid-cols-2 border-t border-ink sm:grid-cols-3 lg:grid-cols-[repeat(auto-fit,minmax(150px,1fr))]', className)}>
      {items.map((it) => (
        <div key={it.label} className="min-w-0 border-b border-line py-4 pr-4 sm:border-r sm:pl-4 sm:first:pl-0 sm:last:border-r-0">
          <dt className="text-xs font-semibold text-graphite">{it.label}</dt>
          <dd className="mt-1 text-[clamp(1.125rem,1rem+0.4vw,1.375rem)] font-bold leading-none tracking-tight tnum [overflow-wrap:anywhere]">{it.value}</dd>
          {it.note && <dd className="mt-1.5 text-xs text-muted">{it.note}</dd>}
        </div>
      ))}
    </dl>
  );
}

/** Lista de definiciones compacta para fichas. */
export function Facts({ items, className }: { items: { label: string; value: ReactNode }[]; className?: string }) {
  return (
    <dl className={clsx('divide-y divide-line border-y border-line text-sm', className)}>
      {items.map((it) => (
        <div key={it.label} className="flex justify-between gap-6 py-2.5">
          <dt className="text-graphite">{it.label}</dt>
          <dd className="text-right font-semibold tnum">{it.value}</dd>
        </div>
      ))}
    </dl>
  );
}
