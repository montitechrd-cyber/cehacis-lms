import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Navigate, useLocation } from 'react-router';
import { api, ApiError } from './api';
import { PageLoader } from '@/components/ui/Feedback';

export type RoleKey = 'SUPERADMIN' | 'ACADEMIC_ADMIN' | 'INSTRUCTOR' | 'STUDENT';

export interface Me {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatarUrl: string | null;
  status: string;
  role: RoleKey;
  roleName: string;
  permissions: string[];
  student: { points: number; level: { number: number; name: string } | null } | null;
  instructor: { headline: string | null } | null;
  createdAt: string;
}

interface AuthCtx {
  user: Me | null;
  loading: boolean;
  can: (...perms: string[]) => boolean;
  isStaff: boolean;
  login: (email: string, password: string) => Promise<Me>;
  register: (data: Record<string, unknown>) => Promise<Me>;
  logout: () => Promise<void>;
  refresh: () => Promise<unknown>;
}

const Ctx = createContext<AuthCtx | null>(null);

/** Permisos que dan acceso al panel de gestión. */
const STAFF_PERMS = ['courses.manage', 'courses.teach', 'students.manage', 'reports.view', 'reports.academic', 'payments.manage', 'settings.manage', 'users.manage'];

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      try {
        return (await api.get<{ user: Me }>('/auth/me')).user;
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) return null;
        throw e;
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const user = data ?? null;
  // Al cambiar de sesión se descartan los datos del usuario anterior sin desconectar el observador de ['me'].
  const resetCache = (next: Me | null) => {
    qc.removeQueries({ predicate: (q) => q.queryKey[0] !== 'me' && q.queryKey[0] !== 'brand' });
    qc.setQueryData(['me'], next);
  };
  const can = useCallback((...perms: string[]) => !!user && perms.some((p) => user.permissions.includes(p)), [user]);

  const value = useMemo<AuthCtx>(
    () => ({
      user,
      loading: isLoading,
      can,
      isStaff: !!user && STAFF_PERMS.some((p) => user.permissions.includes(p)),
      login: async (email, password) => {
        const r = await api.post<{ user: Me }>('/auth/login', { email, password });
        resetCache(r.user);
        return r.user;
      },
      register: async (body) => {
        const r = await api.post<{ user: Me }>('/auth/register', body);
        resetCache(r.user);
        return r.user;
      },
      logout: async () => {
        await api.post('/auth/logout').catch(() => null);
        resetCache(null);
      },
      refresh: () => refetch(),
    }),
    [user, isLoading, can, qc, refetch],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth fuera de AuthProvider');
  return c;
}

/** Protege rutas: exige sesión y (opcionalmente) alguno de los permisos. */
export function RequireAuth({ children, perms }: { children: ReactNode; perms?: string[] }) {
  const { user, loading, can } = useAuth();
  const loc = useLocation();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to={`/ingresar?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />;
  if (perms && perms.length && !can(...perms)) return <Navigate to="/acceso-denegado" replace />;
  return <>{children}</>;
}

/** Ruta inicial tras iniciar sesión según el rol. */
export function homeFor(user: Me) {
  return user.role === 'STUDENT' ? '/campus' : '/panel';
}
