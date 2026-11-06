import { Link } from 'react-router';
import clsx from 'clsx';
import { DEFAULT_BRAND, useBrand } from '@/lib/brand';
import { TempleEmblem } from '@/components/brand/Emblem';

/**
 * Marca: templo del logo + nombre en grotesca. Con el logo institucional por defecto se dibuja el
 * emblema vectorial (nítido a cualquier tamaño, sin el texto diminuto del PNG); si la administración
 * sube otro logo desde Configuración, se respeta esa imagen. `tone` invierte para fondos oscuros.
 */
export function BrandMark({ to = '/', compact, tone = 'ink', className }: { to?: string; compact?: boolean; tone?: 'ink' | 'paper'; className?: string }) {
  const brand = useBrand();
  const customLogo = brand.logoUrl && brand.logoUrl !== DEFAULT_BRAND.logoUrl;
  return (
    <Link to={to} className={clsx('group inline-flex items-center gap-2.5 no-underline', className)} aria-label={`${brand.name} — inicio`}>
      {customLogo ? (
        <img src={brand.logoUrl} alt="" className="h-9 w-auto shrink-0 object-contain" />
      ) : (
        <TempleEmblem className="h-9 w-auto shrink-0 text-orange" detail={tone === 'paper' ? 'var(--color-ink)' : 'var(--color-paper)'} />
      )}
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className={clsx('text-[1.0625rem] font-extrabold tracking-[0.02em]', tone === 'paper' ? 'text-paper' : 'text-ink')}>{brand.name}</span>
          <span className={clsx('mt-1 hidden text-[0.625rem] font-medium tracking-[0.02em] sm:block', tone === 'paper' ? 'text-paper/70' : 'text-graphite')}>Habilidades Comunicativas e Inteligencia Social</span>
        </span>
      )}
    </Link>
  );
}
