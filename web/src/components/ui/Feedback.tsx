import type { ReactNode } from 'react';
import clsx from 'clsx';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { TempleEmblem, VoiceWave } from '@/components/brand/Emblem';

export function Spinner({ size = 18, className }: { size?: number; className?: string }) {
  return (
    <svg className={clsx('animate-spin shrink-0', className)} width={size} height={size} viewBox="0 0 24 24" fill="none" role="status" aria-label="Cargando">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".2" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="square" />
    </svg>
  );
}

export function PageLoader({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-graphite" role="status" aria-live="polite">
      {/* Las ondas de voz del frontón del logo como indicador de carga */}
      <VoiceWave bars={9} height={28} animated className="text-orange" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('animate-pulse rounded-sm bg-stone-2', className)} aria-hidden />;
}

export function SkeletonRows({ rows = 5 }: { rows?: number }) {
  return (
    <div className="divide-y divide-line border-y border-line" aria-busy>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 py-4">
          <Skeleton className="h-4 w-8" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  );
}

/** Estado vacío: tipográfico, sin ilustraciones genéricas. */
export function EmptyState({ title, description, action, icon }: { title: string; description?: ReactNode; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="border-t border-ink py-12">
      <div className="mb-5 text-line-strong">{icon ?? <TempleEmblem variant="line" strokeWidth={2} className="w-12" />}</div>
      <p className="max-w-xl text-2xl font-bold tracking-tight">{title}</p>
      {description && <p className="mt-2 max-w-xl text-graphite">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const msg = error instanceof Error ? error.message : 'No se pudo cargar la información';
  return (
    <div className="border-t-2 border-danger py-8" role="alert">
      <p className="text-lg font-bold">No se pudo cargar esta sección</p>
      <p className="mt-1 text-graphite">{msg}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="mt-4 text-sm font-semibold underline underline-offset-4">
          Reintentar
        </button>
      )}
    </div>
  );
}

// Avisos dentro del mundo: fondo piedra y regla superior; el tono se distingue por icono y por la regla
// (tinta / naranja profundo para advertencia / rojo solo para errores).
const alertTone = {
  info: { cls: 'bg-stone text-ink border-ink', Icon: Info },
  success: { cls: 'bg-stone text-ink border-ink', Icon: CheckCircle2 },
  warning: { cls: 'bg-stone text-ink border-orange-deep', Icon: AlertTriangle },
  danger: { cls: 'bg-danger-soft text-ink border-danger', Icon: XCircle },
};

export function Alert({ tone = 'info', title, children, action }: { tone?: keyof typeof alertTone; title?: string; children?: ReactNode; action?: ReactNode }) {
  const { cls, Icon } = alertTone[tone];
  return (
    <div className={clsx('flex gap-3 border-t-2 px-4 py-3', cls)} role={tone === 'danger' ? 'alert' : 'status'}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1 text-sm">
        {title && <p className="font-bold">{title}</p>}
        {children && <div className={clsx(title && 'mt-0.5', 'text-graphite')}>{children}</div>}
      </div>
      {action}
    </div>
  );
}
