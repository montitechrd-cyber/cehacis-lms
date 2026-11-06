import type { ReactNode } from 'react';
import { Link } from 'react-router';
import clsx from 'clsx';
import { ChevronRight } from 'lucide-react';

/** Encabezado de página de campus/panel: título grotesco grande, sin eyebrow; migas opcionales. */
export function PageHeader({
  title,
  description,
  actions,
  crumbs,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  crumbs?: { label: string; to?: string }[];
  className?: string;
}) {
  return (
    <header className={clsx('mb-8', className)}>
      {crumbs && crumbs.length > 0 && (
        <nav aria-label="Ruta" className="mb-4">
          <ol className="flex flex-wrap items-center gap-1 text-xs text-graphite">
            {crumbs.map((c, i) => (
              <li key={i} className="flex items-center gap-1">
                {c.to ? (
                  <Link to={c.to} className="hover:text-ink hover:underline">
                    {c.label}
                  </Link>
                ) : (
                  <span aria-current="page" className="text-ink">
                    {c.label}
                  </span>
                )}
                {i < crumbs.length - 1 && <ChevronRight className="size-3" aria-hidden />}
              </li>
            ))}
          </ol>
        </nav>
      )}
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div className="min-w-0 max-w-3xl">
          <h1 className="text-[clamp(1.375rem,1.1rem+0.9vw,2rem)] font-bold leading-[1.02] tracking-[-0.03em]">{title}</h1>
          {description && <p className="mt-3 text-[0.9375rem] leading-relaxed text-graphite">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

/** Sección con regla superior y título; el contenedor por defecto (no tarjetas). */
export function Section({ title, actions, children, className, description }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; description?: ReactNode }) {
  return (
    <section className={clsx('mb-12', className)}>
      {(title || actions) && (
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-ink pb-2.5">
          <div>
            {title && (
              <h2 className="flex items-center gap-2.5 text-lg font-bold tracking-tight">
                <svg viewBox="0 0 14 8" className="w-3.5 shrink-0 text-orange" aria-hidden><path d="M7 0L14 8H0Z" fill="currentColor" /></svg>
                {title}
              </h2>
            )}
            {description && <p className="mt-0.5 text-sm text-graphite">{description}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

/** Panel neutro con fondo piedra para agrupar formularios o resúmenes. */
export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx('rounded-sm bg-stone p-5 sm:p-6', className)}>{children}</div>;
}
