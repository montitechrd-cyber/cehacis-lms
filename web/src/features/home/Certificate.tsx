import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Form';
import { useBrand } from '@/lib/brand';
import { TempleEmblem } from '@/components/brand/Emblem';
import { Wrap } from '@/features/public/parts';
import { QR_SAMPLE } from './qr-sample';

/** Verificación rápida por código (sobre fondo claro). */
function VerifyMini() {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const nav = useNavigate();
  return (
    <form
      className="mt-8 flex max-w-md flex-col gap-3 sm:flex-row sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        const c = code.trim().toUpperCase();
        if (!c) {
          setError('Escribe el código que aparece en el certificado.');
          return;
        }
        nav(`/verificar/${encodeURIComponent(c)}`);
      }}
    >
      <div className="flex-1">
        <Input
          label="Código del certificado"
          placeholder="Ej.: CEH-2026-ABC234"
          className="placeholder:text-muted!"
          value={code}
          error={error ?? undefined}
          onChange={(e) => {
            setCode(e.target.value);
            setError(null);
          }}
        />
      </div>
      <Button type="submit" variant="ink" className="rounded-lg! sm:mb-px">
        Verificar
      </Button>
    </form>
  );
}

/** QR de muestra real: codifica la URL de verificación del certificado de ejemplo. */
function SampleQr() {
  return (
    <svg viewBox={QR_SAMPLE.viewBox} className="size-14 shrink-0 text-ink sm:size-16" shapeRendering="crispEdges" aria-hidden>
      <path d={QR_SAMPLE.d} stroke="currentColor" fill="none" />
    </svg>
  );
}

/** Muestra del certificado dibujada en código. */
function Specimen() {
  const brand = useBrand();
  return (
    <div className="lg:col-span-6">
      <span className="sr-only">Ejemplo de certificado CEHACIS</span>
      <div
        aria-hidden
        className="relative flex w-full flex-col items-center justify-between overflow-hidden rounded-lg border border-hairline bg-paper p-6 text-center text-ink shadow-float sm:aspect-[1.414/1] sm:p-10"
      >
        <div className="pointer-events-none absolute inset-3 rounded-sm border border-line sm:inset-4" />

        <span className="absolute right-6 top-6 z-10 rounded-md bg-orange-tint px-2 py-0.5 text-xs font-semibold text-orange-strong sm:right-8 sm:top-8">
          Ejemplo
        </span>

        <div className="flex flex-col items-center">
          <TempleEmblem variant="solid" detail="var(--color-paper)" className="w-9 text-orange sm:w-10" />
          <p className="mt-2 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-graphite">{brand.legalName}</p>
        </div>

        <div className="my-4 flex w-full flex-col items-center sm:my-0">
          <p className="text-[clamp(1.25rem,1rem+1vw,2rem)] font-extrabold leading-tight tracking-tight">Certificado de aprobación</p>
          <p className="mt-2 text-xs text-graphite sm:mt-3">otorgado a</p>
          <p className="mt-2 w-4/5 border-b border-line pb-1 text-lg font-bold sm:text-xl">Nombre del estudiante</p>
          <p className="mt-2 text-xs text-graphite sm:mt-3 sm:text-sm">por completar el Curso de Oratoria</p>
          <p className="mt-1 text-xs text-muted tnum">15 de marzo de 2026</p>
        </div>

        <div className="flex w-full items-end justify-between px-1 text-left sm:px-2">
          <div>
            <SampleQr />
            <p className="mt-1 text-[0.6875rem] tnum">CEH-2026-ABC234</p>
          </div>
          <div className="w-28 text-center sm:w-36">
            <div className="border-t border-line-strong pt-1 text-[0.6875rem] text-graphite">Dirección académica</div>
          </div>
        </div>
      </div>
    </div>
  );
}

const POINTS = ['Código único y QR', 'Verificación pública en línea', 'Registro de competencias evaluadas'];

export function Certificate() {
  return (
    <section className="bg-sand text-ink" aria-labelledby="certificado">
      <Wrap className="grid gap-12 py-16 lg:grid-cols-12 lg:items-center lg:gap-16 lg:py-24">
        <div className="lg:col-span-6">
          <h2 id="certificado" className="text-[clamp(1.75rem,1.3rem+1.4vw,2.5rem)] font-extrabold leading-[1.05] tracking-[-0.03em]">
            Cada certificado se puede verificar.
          </h2>
          <p className="mt-3 max-w-2xl text-lg text-graphite">
            Al completar un curso recibes un certificado con código único y QR. Cualquier persona puede comprobar su validez.
          </p>
          <ul className="mt-6 space-y-3">
            {POINTS.map((t) => (
              <li key={t} className="flex items-center gap-3 text-ink">
                <span className="grid size-6 shrink-0 place-items-center rounded-md bg-orange-tint text-orange-strong">
                  <Check className="size-4" strokeWidth={1.75} aria-hidden />
                </span>
                {t}
              </li>
            ))}
          </ul>
          <VerifyMini />
          <Link to="/verificar" className="mt-6 inline-block text-sm font-semibold text-orange-strong underline underline-offset-4">
            Ir a la página de verificación
          </Link>
        </div>
        <Specimen />
      </Wrap>
    </section>
  );
}
