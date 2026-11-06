import clsx from 'clsx';
import type { CSSProperties } from 'react';

/*
 * Emblema de CEHACIS redibujado en vector a partir del logo institucional:
 * frontón con mariposa y ondas de voz, entablamento, cuatro columnas y basamento escalonado.
 * Es el lenguaje decorativo de toda la plataforma: el templo estructura los campos de cartel,
 * las ondas de voz marcan ritmo y carga, y la mariposa señala transformación (logros, certificados).
 *
 * Todas las piezas usan currentColor salvo que se indique `detail` (color de los vaciados).
 */

/** Ondas de voz del frontón: alturas simétricas como en el logo (de fuera hacia dentro). */
const WAVE = [3, 6, 10, 6, 12, 8];

function Butterfly({ cx, cy, s, fill }: { cx: number; cy: number; s: number; fill: string }) {
  // Dos pares de alas y cuerpo, como la mariposa del frontón.
  return (
    <g transform={`translate(${cx} ${cy}) scale(${s})`} fill={fill}>
      <path d="M-.6-3.6C-2.6-6.6-7.2-7.4-8-5.2c-.8 2.2 1.6 5 6.8 5.6z" />
      <path d="M.6-3.6C2.6-6.6 7.2-7.4 8-5.2c.8 2.2-1.6 5-6.8 5.6z" />
      <path d="M-1.2 1C-4.4 1.2-6.4 3.4-5.4 5.2c1 1.6 3.6.6 4.6-2.4z" />
      <path d="M1.2 1C4.4 1.2 6.4 3.4 5.4 5.2c-1 1.6-3.6.6-4.6-2.4z" />
      <rect x="-.55" y="-4.6" width="1.1" height="10" rx=".5" />
    </g>
  );
}

function Waves({ x, cy, dir, fill, gap = 2.6, w = 1.25 }: { x: number; cy: number; dir: 1 | -1; fill: string; gap?: number; w?: number }) {
  return (
    <g fill={fill}>
      {WAVE.map((h, i) => (
        <rect key={i} x={x + dir * i * gap - (dir < 0 ? w : 0)} y={cy - h / 2} width={w} height={h} rx={w / 2} />
      ))}
    </g>
  );
}

/**
 * Emblema completo. `variant="solid"`: templo relleno con vaciados (mariposa y ondas) en `detail`.
 * `variant="line"`: dibujo de línea para marcas de agua y decoración sobre campos de color.
 */
export function TempleEmblem({
  variant = 'solid',
  detail = 'var(--color-paper)',
  strokeWidth = 1.5,
  className,
  style,
  title,
}: {
  variant?: 'solid' | 'line';
  detail?: string;
  strokeWidth?: number;
  className?: string;
  style?: CSSProperties;
  title?: string;
}) {
  const line = variant === 'line';
  const paint = line ? { fill: 'none', stroke: 'currentColor', strokeWidth, strokeLinejoin: 'miter' as const } : { fill: 'currentColor' };
  const inner = line ? 'currentColor' : detail;
  return (
    <svg viewBox="0 0 120 112" className={clsx('block', className)} style={style} role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      {/* Frontón */}
      <path d="M60 6 L110 32 H10 Z" {...paint} />
      <Butterfly cx={60} cy={21} s={line ? 0.95 : 1} fill={inner} />
      <Waves x={49} cy={22} dir={-1} fill={inner} />
      <Waves x={71} cy={22} dir={1} fill={inner} />
      {/* Entablamento */}
      <rect x="16" y="35" width="88" height="7" {...paint} />
      <rect x="22" y="44" width="76" height="3" {...paint} />
      {/* Cuatro columnas */}
      {[27, 45, 63, 81].map((x) => (
        <rect key={x} x={x} y="50" width="12" height="36" {...paint} />
      ))}
      {/* Basamento escalonado */}
      <rect x="20" y="89" width="80" height="5" {...paint} />
      <rect x="13" y="96" width="94" height="5" {...paint} />
      <rect x="6" y="103" width="108" height="6" {...paint} />
    </svg>
  );
}

/** Frontón aislado: corona de secciones y campos de cartel. Se estira al ancho del contenedor. */
export function Pediment({ className, detail, withMark = true }: { className?: string; detail?: string; withMark?: boolean }) {
  // El triángulo se estira al ancho; la mariposa y las ondas se dibujan aparte para no deformarse.
  return (
    <div className={clsx('relative w-full', className)} aria-hidden>
      <svg viewBox="0 0 400 60" preserveAspectRatio="none" className="absolute inset-0 block size-full">
        <path d="M200 0 L400 60 H0 Z" fill="currentColor" />
      </svg>
      {withMark && (
        <svg viewBox="30 8 60 26" className="absolute left-1/2 top-[34%] h-[52%] -translate-x-1/2">
          <Butterfly cx={60} cy={20} s={1.15} fill={detail ?? 'var(--color-paper)'} />
          <Waves x={48} cy={21} dir={-1} fill={detail ?? 'var(--color-paper)'} />
          <Waves x={72} cy={21} dir={1} fill={detail ?? 'var(--color-paper)'} />
        </svg>
      )}
    </div>
  );
}

/** Basamento escalonado: cierre inferior de campos de cartel y del pie. */
export function Steps({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 24" preserveAspectRatio="none" className={clsx('block w-full', className)} aria-hidden>
      <rect x="40" y="0" width="320" height="6" fill="currentColor" />
      <rect x="20" y="9" width="360" height="6" fill="currentColor" />
      <rect x="0" y="18" width="400" height="6" fill="currentColor" />
    </svg>
  );
}

/**
 * Columnata: cuatro fustes como reglas verticales de fondo. Úsala dentro de un contenedor `relative`;
 * ocupa todo su alto y marca el ritmo del templo sin competir con el contenido.
 */
export function Colonnade({ className, opacity = 0.14 }: { className?: string; opacity?: number }) {
  return (
    <div aria-hidden className={clsx('pointer-events-none absolute inset-0 grid grid-cols-4 gap-[13%] px-[13%]', className)} style={{ opacity }}>
      {[0, 1, 2, 3].map((i) => (
        <span key={i} className="h-full bg-current" />
      ))}
    </div>
  );
}

/**
 * Ondas de voz: el gesto sonoro del logo como ornamento lineal o indicador de actividad.
 * `animated` las hace pulsar (cargas, IA "escribiendo"); respeta prefers-reduced-motion.
 */
export function VoiceWave({ bars = 11, className, animated = false, height = 16 }: { bars?: number; className?: string; animated?: boolean; height?: number }) {
  const heights = Array.from({ length: bars }, (_, i) => {
    const t = Math.abs(i - (bars - 1) / 2) / ((bars - 1) / 2 || 1);
    const base = [0.35, 0.7, 1, 0.55, 0.85][i % 5]!;
    return Math.max(0.2, base * (1 - t * 0.55));
  });
  return (
    <span aria-hidden className={clsx('inline-flex items-center gap-[3px]', className)} style={{ height }}>
      {heights.map((h, i) => (
        <span
          key={i}
          className={clsx('w-[3px] rounded-full bg-current', animated && 'animate-[voice_1.1s_ease-in-out_infinite]')}
          style={{ height: `${h * 100}%`, animationDelay: animated ? `${(i % 5) * 0.11}s` : undefined }}
        />
      ))}
    </span>
  );
}

/*
 * Acentos de la comunicación de marca de CEHACIS (piezas de redes): subrayado en trazo naranja
 * bajo la palabra clave y tres "chispas" de énfasis junto al titular.
 */

/** Palabra resaltada con el subrayado en trazo de la marca. */
export function Swash({ children, className, tone = 'orange' }: { children: React.ReactNode; className?: string; tone?: 'orange' | 'ink' }) {
  return (
    <span className={clsx('relative inline-block whitespace-nowrap', className)}>
      {children}
      <svg viewBox="0 0 200 14" preserveAspectRatio="none" aria-hidden className={clsx('pointer-events-none absolute -bottom-[0.18em] left-[-2%] h-[0.22em] w-[104%]', tone === 'ink' ? 'text-ink' : 'text-orange')}>
        <path d="M2 9.5C40 4.5 110 1.8 198 4.2c-62 1.6-118 4.6-150 9.3" fill="currentColor" />
      </svg>
    </span>
  );
}

/** Texto con la última palabra subrayada en trazo (el lema configurable se resalta igual que en redes). */
export function SwashLast({ text, tone }: { text: string; tone?: 'orange' | 'ink' }) {
  const m = text.trim().match(/^(.*\s)?(\S+?)([.!?…]*)$/);
  if (!m) return <>{text}</>;
  return (
    <>
      {m[1]}
      <Swash tone={tone}>{m[2]}</Swash>
      {m[3]}
    </>
  );
}

/** Tres trazos de énfasis ("chispas") como los que acompañan los titulares en redes. */
export function Sparks({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden className={clsx('block text-orange', className)} fill="none" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round">
      <path d="M8 26 L2 34" />
      <path d="M18 18 L18 6" />
      <path d="M27 24 L37 17" />
    </svg>
  );
}

/** Mariposa aislada: marca de transformación (logros, certificados, curso completado). */
export function ButterflyMark({ className, title }: { className?: string; title?: string }) {
  return (
    <svg viewBox="-9 -8 18 14" className={clsx('block', className)} role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <Butterfly cx={0} cy={0} s={1} fill="currentColor" />
    </svg>
  );
}
