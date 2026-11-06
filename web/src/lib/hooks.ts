import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { errorMessage } from './api';

/**
 * Mutación con notificación de éxito/error y revalidación de consultas.
 * Ejemplo: const save = useAction((b) => api.post('/x', b), { success: 'Guardado', invalidate: [['x']] })
 */
export function useAction<TVars = void, TRes = unknown>(
  fn: (v: TVars) => Promise<TRes>,
  opts: { success?: string | ((r: TRes) => string); invalidate?: QueryKey[]; onSuccess?: (r: TRes, v: TVars) => void; silentError?: boolean } = {},
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: async (r, v) => {
      if (opts.invalidate) await Promise.all(opts.invalidate.map((k) => qc.invalidateQueries({ queryKey: k })));
      if (opts.success) toast.success(typeof opts.success === 'function' ? opts.success(r) : opts.success);
      opts.onSuccess?.(r, v);
    },
    onError: (e) => {
      if (!opts.silentError) toast.error(errorMessage(e));
    },
  });
}

/** Estado de tabla en la URL (?page&q&sort&order&…): enlaces compartibles y navegación atrás coherente. */
export function useTableParams(defaults: Record<string, string> = {}) {
  const [sp, setSp] = useSearchParams();
  const get = (k: string) => sp.get(k) ?? defaults[k] ?? '';
  const set = (patch: Record<string, string | number | null | undefined>, resetPage = true) => {
    const next = new URLSearchParams(sp);
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === undefined || v === '') next.delete(k);
      else next.set(k, String(v));
    }
    if (resetPage && !('page' in patch)) next.delete('page');
    setSp(next, { replace: true });
  };
  const page = Number(get('page') || 1);
  const toggleSort = (key: string) => {
    const cur = get('sort');
    const order = cur === key && get('order') === 'asc' ? 'desc' : 'asc';
    set({ sort: key, order });
  };
  return { get, set, page, toggleSort, sort: get('sort') ? { key: get('sort'), order: (get('order') || 'desc') as 'asc' | 'desc' } : undefined, params: Object.fromEntries(sp.entries()) };
}
