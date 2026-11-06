import clsx from 'clsx';
import { Lock } from 'lucide-react';

export type StepStatus = 'completed' | 'in_progress' | 'available' | 'locked';

/**
 * Marca de estado por FORMA (no solo color): completado = cuadro relleno, en curso = anillo
 * con núcleo naranja, disponible = cuadro vacío, bloqueado = candado.
 */
export function StatusMark({ status, current, size = 14 }: { status: StepStatus; current?: boolean; size?: number }) {
  const s = size;
  const label = { completed: 'Completada', in_progress: 'En curso', available: 'Disponible', locked: 'Bloqueada' }[status];
  if (status === 'locked')
    return (
      <span className="inline-flex shrink-0 items-center justify-center text-muted" style={{ width: s, height: s }} title={label} aria-label={label} role="img">
        <Lock style={{ width: s - 2, height: s - 2 }} strokeWidth={2.25} />
      </span>
    );
  return (
    <svg width={s} height={s} viewBox="0 0 14 14" className="shrink-0" role="img" aria-label={current ? `${label} · actual` : label}>
      {status === 'completed' && <rect x="1" y="1" width="12" height="12" fill="var(--color-ink)" />}
      {status === 'completed' && <path d="M3.8 7.2l2.1 2.1 4.3-4.6" stroke="var(--color-paper)" strokeWidth="1.8" fill="none" />}
      {status === 'in_progress' && (
        <>
          <rect x="1.5" y="1.5" width="11" height="11" fill="none" stroke="var(--color-ink)" strokeWidth="1.6" />
          <rect x="4.5" y="4.5" width="5" height="5" fill="var(--color-orange)" />
        </>
      )}
      {status === 'available' && <rect x="1.5" y="1.5" width="11" height="11" fill="none" stroke={current ? 'var(--color-ink)' : 'var(--color-graphite)'} strokeWidth="1.6" />}
    </svg>
  );
}

/**
 * Fila de pasos del aula: una única fila numerada de lecciones con un indicador naranja "ahora"
 * que se desplaza al avanzar. Estado por forma del segmento:
 *   completado = barra de tinta llena · actual = anillo (contorno de tinta) · iniciada = grafito · disponible = piedra ·
 *   bloqueado = trazo cortado, con un candado en el primer tramo bloqueado.
 */
export function StepRow({
  steps,
  currentId,
  onSelect,
  className,
  tone = 'paper',
}: {
  steps: { id: number; title: string; status: StepStatus }[];
  currentId?: number | null;
  onSelect?: (id: number) => void;
  className?: string;
  /** Fondo sobre el que se dibuja: en campos naranjas el indicador "ahora" pasa a tinta y sobresale más. */
  tone?: 'paper' | 'orange';
}) {
  const idx = steps.findIndex((s) => s.id === currentId);
  const firstLocked = steps.findIndex((s) => s.status === 'locked');
  const n = steps.length || 1;
  return (
    <div className={clsx('relative pt-1.5', className)}>
      <ol className="flex h-3.5 w-full gap-[3px]" aria-label="Secuencia de lecciones">
        {steps.map((s, i) => {
          const current = s.id === currentId;
          return (
            <li key={s.id} className="relative flex-1">
              <button
                type="button"
                disabled={s.status === 'locked' || !onSelect}
                onClick={() => onSelect?.(s.id)}
                title={`${i + 1}. ${s.title}${s.status === 'locked' ? ' (bloqueada)' : ''}`}
                aria-label={`Lección ${i + 1}: ${s.title}${s.status === 'locked' ? ', bloqueada' : s.status === 'completed' ? ', completada' : ''}`}
                aria-current={current ? 'step' : undefined}
                className={clsx(
                  'flex h-full w-full items-center justify-center transition-colors disabled:cursor-default',
                  current
                    ? 'bg-paper ring-[1.5px] ring-inset ring-ink'
                    : s.status === 'completed'
                      ? 'bg-ink'
                      : s.status === 'in_progress'
                        ? 'bg-graphite'
                        : s.status === 'available'
                          ? 'bg-stone-2 hover:bg-line-strong'
                          : 'cursor-not-allowed bg-[repeating-linear-gradient(90deg,var(--color-line-strong)_0_4px,transparent_4px_7px)]',
                )}
              >
                {i === firstLocked && <Lock className="size-2.5 bg-paper text-graphite" strokeWidth={2.5} aria-hidden />}
              </button>
            </li>
          );
        })}
      </ol>
      {/* Indicador "ahora": sobresale por encima y por debajo de la fila */}
      {idx >= 0 && (
        <span
          aria-hidden
          className={clsx(
            'pointer-events-none absolute w-[3px] transition-[left] duration-700 ease-[var(--ease-out-expo)]',
            tone === 'orange' ? '-top-1 h-[30px] bg-ink' : 'top-0 h-[22px] bg-orange',
          )}
          style={{ left: `calc(${((idx + 0.5) / n) * 100}% - 1.5px)` }}
        />
      )}
    </div>
  );
}
