import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import clsx from 'clsx';
import { Instagram, Mail, Menu, MessageCircle, Phone, X } from 'lucide-react';
import { BrandMark } from './Brand';
import { ButtonLink } from '@/components/ui/Button';
import { useAuth, homeFor } from '@/lib/auth';
import { useBrand } from '@/lib/brand';
import { VoiceWave } from '@/components/brand/Emblem';

const NAV = [
  { to: '/cursos', label: 'Cursos' },
  { to: '/programas', label: 'Programas' },
  { to: '/facilitadores', label: 'Facilitadores' },
  { to: '/nosotros', label: 'Nosotros' },
  { to: '/contacto', label: 'Contacto' },
];

export function PublicLayout() {
  const { user } = useAuth();
  const brand = useBrand();
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  useEffect(() => {
    setOpen(false);
    window.scrollTo(0, 0);
  }, [loc.pathname]);

  return (
    <div className="theme-portal flex min-h-dvh flex-col text-ink">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-ink focus:px-3 focus:py-2 focus:text-paper">
        Saltar al contenido
      </a>
      <header className="sticky top-0 z-40 border-b border-ink bg-paper/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-6 px-4 sm:px-8">
          <BrandMark />
          <nav className="hidden items-center gap-7 lg:flex" aria-label="Principal">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) => clsx('text-sm font-semibold no-underline transition-colors hover:text-ink', isActive ? 'text-ink underline decoration-orange decoration-2 underline-offset-[6px]' : 'text-graphite')}
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="hidden items-center gap-2 lg:flex">
            {user ? (
              <ButtonLink to={homeFor(user)} variant="ink" size="sm">
                {user.role === 'STUDENT' ? 'Mi campus' : 'Panel'}
              </ButtonLink>
            ) : (
              <>
                <ButtonLink to="/ingresar" variant="ghost" size="sm">
                  Iniciar sesión
                </ButtonLink>
                <ButtonLink to="/registro" variant="primary" size="sm">
                  Crear cuenta
                </ButtonLink>
              </>
            )}
          </div>
          <button type="button" className="inline-flex size-10 items-center justify-center lg:hidden" aria-label={open ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={open} onClick={() => setOpen(!open)}>
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
        {open && (
          <nav className="animate-fade border-t border-line bg-paper px-4 pb-6 lg:hidden" aria-label="Menú móvil">
            <ul className="divide-y divide-line">
              {NAV.map((n) => (
                <li key={n.to}>
                  <NavLink to={n.to} className="block py-3.5 text-lg font-bold no-underline">
                    {n.label}
                  </NavLink>
                </li>
              ))}
            </ul>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {user ? (
                <ButtonLink to={homeFor(user)} className="col-span-2">
                  Ir a mi espacio
                </ButtonLink>
              ) : (
                <>
                  <ButtonLink to="/ingresar" variant="outline">
                    Iniciar sesión
                  </ButtonLink>
                  <ButtonLink to="/registro" variant="primary">
                    Crear cuenta
                  </ButtonLink>
                </>
              )}
            </div>
          </nav>
        )}
      </header>

      <main id="contenido" className="flex-1">
        <Outlet />
      </main>

      <footer className="bg-orange-strong text-paper">
        <div className="mx-auto grid max-w-[1440px] gap-12 px-4 py-16 sm:px-8 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <BrandMark tone="paper" className="[&_svg]:!text-paper" />
            <VoiceWave bars={21} height={20} className="mt-8 !flex w-fit text-paper/80" />
            <p className="mt-5 max-w-sm text-2xl font-bold leading-tight tracking-tight">{brand.tagline}</p>
          </div>
          <div className="lg:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-paper/85">Formación</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li><Link to="/cursos" className="text-paper no-underline hover:underline">Catálogo de cursos</Link></li>
              <li><Link to="/programas" className="text-paper no-underline hover:underline">Programas formativos</Link></li>
              <li><Link to="/facilitadores" className="text-paper no-underline hover:underline">Facilitadores</Link></li>
              <li><Link to="/verificar" className="text-paper no-underline hover:underline">Verificar certificado</Link></li>
            </ul>
          </div>
          <div className="lg:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-paper/85">Institución</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li><Link to="/nosotros" className="text-paper no-underline hover:underline">Nosotros</Link></li>
              <li><Link to="/preguntas-frecuentes" className="text-paper no-underline hover:underline">Preguntas frecuentes</Link></li>
              <li><Link to="/contacto" className="text-paper no-underline hover:underline">Contacto</Link></li>
              <li><Link to="/ingresar" className="text-paper no-underline hover:underline">Campus virtual</Link></li>
            </ul>
          </div>
          <div className="lg:col-span-3">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-paper/85">Contacto</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              {brand.contactEmail && <li><a href={`mailto:${brand.contactEmail}`} className="inline-flex items-center gap-2 text-paper no-underline hover:underline"><Mail className="size-4" />{brand.contactEmail}</a></li>}
              <li><a href={`tel:${brand.contactPhone.replace(/[^+\d]/g, '')}`} className="inline-flex items-center gap-2 text-paper no-underline hover:underline"><Phone className="size-4" />{brand.contactPhone}</a></li>
              {brand.whatsapp && <li><a href={`https://wa.me/${brand.whatsapp}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-paper no-underline hover:underline"><MessageCircle className="size-4" />WhatsApp</a></li>}
              {brand.instagram && <li><a href={`https://instagram.com/${brand.instagram}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-paper no-underline hover:underline"><Instagram className="size-4" />@{brand.instagram}</a></li>}
            </ul>
          </div>
        </div>
        <div className="border-t border-paper/25">
          <div className="mx-auto flex max-w-[1440px] flex-wrap justify-between gap-2 px-4 py-5 text-xs text-paper/85 sm:px-8">
            <span>© {new Date().getFullYear()} {brand.legalName}</span>
            <span>República Dominicana</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
