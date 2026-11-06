import { Link } from 'react-router';

/*
 * Hero del home según el handoff «Hero Banner LMS» (design_handoff_hero_banner_lms).
 * Paleta, medidas y animaciones del handoff; las animaciones se apagan con prefers-reduced-motion
 * (regla global en styles/index.css).
 */

// Franja inferior: 60 barras con envolvente senoidal (fórmula del handoff).
const BARS = Array.from({ length: 60 }, (_, i) => ({
  h: Math.round(14 + 66 * Math.sin((i / 59) * Math.PI) * (0.5 + 0.5 * Math.abs(Math.sin(1.7 * i)))),
  strong: i % 4 === 0,
  dur: 0.9 + (i % 7) * 0.12,
  delay: -(i % 9) * 0.17,
}));

// Ondas del frontón del logo, en coordenadas del PNG original (1478 × 1064).
const LOGO_WAVES = [
  { x: 590.5, y: 131, h: 30 }, { x: 610.5, y: 118, h: 56 }, { x: 630.5, y: 102, h: 88 }, { x: 648.5, y: 116, h: 60 }, { x: 665.5, y: 130, h: 32 },
  { x: 803.5, y: 130, h: 32 }, { x: 819.5, y: 116, h: 60 }, { x: 838.5, y: 102, h: 88 }, { x: 858.5, y: 118, h: 56 }, { x: 878.5, y: 131, h: 30 },
];

const EQ = [10, 16, 20, 12];

const BTN = 'inline-flex items-center justify-center whitespace-nowrap rounded-full px-8 py-[18px] text-lg font-bold no-underline transition-colors duration-150';

export function HeroBanner() {
  return (
    <section
      aria-labelledby="hero-title"
      className="hero-banner relative grid grid-cols-[repeat(auto-fit,minmax(min(440px,100%),1fr))] items-center gap-8 overflow-hidden bg-[#fff4ea] px-[7vw] pb-[120px] pt-12 font-['DM_Sans_Variable',sans-serif] text-[#2b1a10]"
    >
      <style>{`
        @keyframes hero-w { 0%,100% { transform: scaleY(.35) } 50% { transform: scaleY(1) } }
        @keyframes hero-lw { 0%,100% { transform: scaleY(.3) } 50% { transform: scaleY(1.25) } }
      `}</style>

      {/* Franja decorativa de audio */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex h-[90px] items-end gap-0.5 px-1.5 sm:gap-1.5" aria-hidden>
        {BARS.map((b, i) => (
          <i
            key={i}
            className="flex-1 origin-bottom rounded-t-[5px]"
            style={{
              height: b.h,
              background: b.strong ? '#f58a4b' : '#ffc9a0',
              animation: `hero-w ${b.dur.toFixed(2)}s ease-in-out ${b.delay.toFixed(2)}s infinite`,
            }}
          />
        ))}
      </div>

      {/* Texto */}
      <div className="relative flex min-w-0 flex-col items-start gap-[22px]">
        <p className="m-0 flex items-center gap-2.5 whitespace-nowrap rounded-full bg-white py-2 pl-2.5 pr-[18px] text-[13px] font-bold tracking-[.04em] text-[#c84e0c]">
          <span className="flex h-5 items-center gap-[3px]" aria-hidden>
            {EQ.map((h, i) => (
              <span
                key={i}
                className="block w-[3px] rounded-full bg-[#f58a4b]"
                style={{ height: h, animation: `hero-w ${(0.8 + i * 0.15).toFixed(2)}s ease-in-out ${(-i * 0.2).toFixed(2)}s infinite` }}
              />
            ))}
          </span>
          INSCRIPCIONES ABIERTAS
        </p>

        <h1
          id="hero-title"
          className="m-0 whitespace-nowrap font-['Bricolage_Grotesque_Variable',sans-serif] text-[clamp(30px,4.3vw,64px)] font-extrabold leading-[1.02] tracking-[-.03em]"
        >
          Tu voz abre <span className="text-[#e8601c]">puertas</span>
          <br />
          Aprende a usarla
        </h1>

        <p className="m-0 max-w-[520px] text-pretty text-xl leading-normal text-[#5a4334]">
          Cursos online de oratoria, comunicación persuasiva y presentación en público. Practica con mentores, a tu ritmo y desde cualquier lugar.
        </p>

        <div className="flex flex-wrap gap-3.5">
          <Link to="/registro" className={`${BTN} bg-[#e8601c] text-white shadow-[0_10px_24px_-8px_#e8601c] hover:bg-[#b8460f] hover:text-white`}>
            Regístrate gratis
          </Link>
          <Link to="/cursos" className={`${BTN} border-2 border-[#2b1a10] bg-white text-[#2b1a10] hover:bg-[#2b1a10] hover:text-white`}>
            Ver cursos
          </Link>
        </div>
      </div>

      {/* Logo */}
      <div className="relative flex min-w-0 items-center justify-center">
        <div className="relative rounded-[44px] bg-white p-7 shadow-[0_50px_90px_-30px_#8a3a0a]">
          <div className="relative w-[min(420px,70vw)]">
            <img src="/brand/logo-cehacis-hero.webp" alt="CEHACIS" width={887} height={639} className="block w-full" />
            <svg viewBox="0 0 1478 1064" className="absolute inset-0 size-full" aria-hidden>
              <rect x="590" y="100" width="90" height="92" fill="#fd6a05" />
              <rect x="583" y="116" width="8" height="76" fill="#fd6a05" />
              <rect x="798" y="100" width="90" height="92" fill="#fd6a05" />
              <rect x="887" y="116" width="9" height="76" fill="#fd6a05" />
              {LOGO_WAVES.map((w, i) => (
                <rect
                  key={i}
                  x={w.x}
                  y={w.y}
                  width="9"
                  height={w.h}
                  rx="4.5"
                  fill="#fff"
                  style={{
                    transformBox: 'fill-box',
                    transformOrigin: 'center',
                    animation: `hero-lw ${(0.8 + (i % 5) * 0.13).toFixed(2)}s ease-in-out ${(-i * 0.21).toFixed(2)}s infinite`,
                  }}
                />
              ))}
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}
