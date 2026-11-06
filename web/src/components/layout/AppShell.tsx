import { useEffect, useState, type ComponentType } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { Bell, ExternalLink, LogOut, Menu, UserRound, X } from 'lucide-react';
import { BrandMark } from './Brand';
import { TempleEmblem } from '@/components/brand/Emblem';
import { Avatar } from '@/components/ui/Data';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { fullName } from '@/lib/format';

export interface NavItem {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  perms?: string[];
  roles?: string[];
  end?: boolean;
}
export interface NavGroup {
  title?: string;
  items: NavItem[];
}

/**
 * Shell de aplicación (campus y panel): barra lateral fija en escritorio, cajón en móvil,
 * barra superior con notificaciones y menú de cuenta.
 */
export function AppShell({ groups, area }: { groups: NavGroup[]; area: 'campus' | 'panel' }) {
  const { user, can, logout, isStaff } = useAuth();
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  const nav = useNavigate();
  useEffect(() => setOpen(false), [loc.pathname]);

  const { data: unread } = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: () => api.get<{ count: number }>('/community/notifications/unread-count'),
    refetchInterval: 60_000,
    enabled: !!user,
  });

  const visible = groups
    .map((g) => ({ ...g, items: g.items.filter((i) => (!i.perms || can(...i.perms)) && (!i.roles || (user && i.roles.includes(user.role)))) }))
    .filter((g) => g.items.length);

  const sidebar = (
    <nav className="flex h-full flex-col" aria-label={area === 'campus' ? 'Campus' : 'Panel de gestión'}>
      <div className="flex h-16 items-center border-b border-line px-5">
        <BrandMark to={area === 'campus' ? '/campus' : '/panel'} />
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-4">
        {visible.map((g, gi) => (
          <div key={gi} className={clsx(gi > 0 && 'mt-6')}>
            {g.title && <p className="mb-1.5 px-2 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-muted">{g.title}</p>}
            <ul className="space-y-px">
              {g.items.map((it) => (
                <li key={it.to}>
                  <NavLink
                    to={it.to}
                    end={it.end}
                    className={({ isActive }) =>
                      clsx(
                        'relative flex items-center gap-3 rounded-sm px-2 py-2 text-sm no-underline transition-colors',
                        isActive ? 'bg-ink font-semibold text-paper' : 'text-graphite hover:bg-stone hover:text-ink',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <it.icon className={clsx('size-4 shrink-0', isActive && 'text-orange')} />
                        <span className="truncate">{it.label}</span>
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      {/* El templo en línea como remate discreto de la barra lateral */}
      <div aria-hidden className="pointer-events-none flex justify-center px-6 pb-4 pt-2 text-stone-2">
        <TempleEmblem variant="line" strokeWidth={1.4} className="w-24" />
      </div>
      <div className="border-t border-line p-3">
        {area === 'campus' && isStaff && (
          <Link to="/panel" className="mb-1 flex items-center gap-2 rounded-sm px-2 py-2 text-sm text-graphite no-underline hover:bg-stone hover:text-ink">
            <ExternalLink className="size-4" /> Ir al panel de gestión
          </Link>
        )}
        {area === 'panel' && (
          <Link to="/campus" className="mb-1 flex items-center gap-2 rounded-sm px-2 py-2 text-sm text-graphite no-underline hover:bg-stone hover:text-ink">
            <ExternalLink className="size-4" /> Ver campus
          </Link>
        )}
        <Link to="/" className="flex items-center gap-2 rounded-sm px-2 py-2 text-sm text-graphite no-underline hover:bg-stone hover:text-ink">
          <ExternalLink className="size-4" /> Sitio público
        </Link>
      </div>
    </nav>
  );

  return (
    <div className="min-h-dvh bg-paper lg:grid lg:grid-cols-[256px_1fr]">
      <aside className="sticky top-0 hidden h-dvh border-r border-line bg-paper lg:block">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menú">
          <div className="absolute inset-0 animate-fade bg-ink/45" onClick={() => setOpen(false)} />
          <aside className="relative h-full w-72 max-w-[85vw] animate-slide-in bg-paper">{sidebar}</aside>
        </div>
      )}
      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-line bg-paper/95 px-4 backdrop-blur-sm sm:px-8">
          <div className="flex items-center gap-2">
            <button type="button" className="inline-flex size-10 items-center justify-center lg:hidden" aria-label="Abrir menú" onClick={() => setOpen(true)}>
              <Menu className="size-5" />
            </button>
            <span className="hidden text-xs font-semibold uppercase tracking-[0.08em] text-muted sm:inline">{area === 'campus' ? 'Campus virtual' : 'Panel de gestión'}</span>
          </div>
          <div className="flex items-center gap-1">
            <Link to="/campus/notificaciones" className="relative inline-flex size-10 items-center justify-center rounded-sm hover:bg-stone" aria-label={`Notificaciones${unread?.count ? `, ${unread.count} sin leer` : ''}`}>
              <Bell className="size-5" />
              {!!unread?.count && <span className="absolute right-1.5 top-1.5 min-w-4 rounded-xs bg-orange px-1 text-center text-[0.625rem] font-bold leading-4 text-ink tnum">{unread.count > 99 ? '99+' : unread.count}</span>}
            </Link>
            <AccountMenu
              name={fullName(user)}
              role={user?.roleName ?? ''}
              user={user}
              onProfile={() => nav('/campus/perfil')}
              onLogout={async () => {
                await logout();
                nav('/ingresar');
              }}
            />
          </div>
        </header>
        <main id="contenido" className="mx-auto w-full max-w-[1320px] flex-1 px-4 py-8 sm:px-8 sm:py-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function AccountMenu({ name, role, user, onProfile, onLogout }: { name: string; role: string; user: Parameters<typeof Avatar>[0]['user']; onProfile: () => void; onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [open]);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        className="flex items-center gap-2.5 rounded-sm py-1 pl-1 pr-2 hover:bg-stone"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Avatar user={user} size={32} />
        <span className="hidden text-left leading-tight md:block">
          <span className="block text-sm font-semibold">{name}</span>
          <span className="block text-[0.6875rem] text-muted">{role}</span>
        </span>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-12 z-40 w-56 animate-fade border border-ink bg-paper py-1">
          <button role="menuitem" type="button" onClick={onProfile} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-stone">
            <UserRound className="size-4" /> Mi perfil
          </button>
          <button role="menuitem" type="button" onClick={onLogout} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-stone">
            <LogOut className="size-4" /> Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}

export { X };
