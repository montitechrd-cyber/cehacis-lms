/**
 * Cliente HTTP del frontend. Sesión por cookies httpOnly; CSRF de doble envío
 * (lee la cookie cehacis_csrf y la reenvía en X-CSRF-Token). Renueva el token de
 * acceso automáticamente una vez ante un 401.
 */

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code = 'ERROR',
    public details?: Record<string, string[] | undefined> | unknown,
  ) {
    super(message);
  }
  /** Errores por campo de validación Zod (flatten().fieldErrors). */
  get fieldErrors(): Record<string, string> {
    const out: Record<string, string> = {};
    if (this.details && typeof this.details === 'object') {
      for (const [k, v] of Object.entries(this.details as Record<string, unknown>)) {
        if (Array.isArray(v) && v[0]) out[k] = String(v[0]);
      }
    }
    return out;
  }
}

function csrfToken() {
  const m = document.cookie.match(/(?:^|;\s*)cehacis_csrf=([^;]+)/);
  return m ? decodeURIComponent(m[1]!) : '';
}

let refreshing: Promise<boolean> | null = null;
async function tryRefresh(): Promise<boolean> {
  refreshing ??= fetch('/api/auth/refresh', { method: 'POST', credentials: 'include', headers: { 'X-CSRF-Token': csrfToken() } })
    .then((r) => r.ok)
    .catch(() => false)
    .finally(() => setTimeout(() => (refreshing = null), 0));
  return refreshing;
}

/** Garantiza que exista la cookie CSRF antes de la primera mutación. */
let csrfReady: Promise<void> | null = null;
function ensureCsrf() {
  if (csrfToken()) return Promise.resolve();
  csrfReady ??= fetch('/api/health', { credentials: 'include' }).then(() => undefined);
  return csrfReady;
}

type Query = Record<string, string | number | boolean | null | undefined>;

export function qs(params?: Query) {
  if (!params) return '';
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') s.set(k, String(v));
  const str = s.toString();
  return str ? `?${str}` : '';
}

async function request<T>(method: string, url: string, body?: unknown, retry = true): Promise<T> {
  const isForm = body instanceof FormData;
  if (method !== 'GET') await ensureCsrf();
  const res = await fetch('/api' + url, {
    method,
    credentials: 'include',
    headers: {
      ...(isForm || body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(method !== 'GET' ? { 'X-CSRF-Token': csrfToken() } : {}),
    },
    body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
  });
  if (res.status === 401 && retry && !url.startsWith('/auth/')) {
    if (await tryRefresh()) return request<T>(method, url, body, false);
  }
  if (!res.ok) {
    let payload: { error?: { code?: string; message?: string; details?: unknown } } = {};
    try {
      payload = await res.json();
    } catch {
      /* respuesta no JSON */
    }
    throw new ApiError(res.status, payload.error?.message ?? 'No se pudo completar la solicitud', payload.error?.code, payload.error?.details);
  }
  if (res.status === 204) return undefined as T;
  const type = res.headers.get('content-type') ?? '';
  return (type.includes('application/json') ? res.json() : res.text()) as Promise<T>;
}

export const api = {
  get: <T>(url: string, params?: Query) => request<T>('GET', url + qs(params)),
  post: <T>(url: string, body?: unknown) => request<T>('POST', url, body ?? {}),
  put: <T>(url: string, body?: unknown) => request<T>('PUT', url, body ?? {}),
  patch: <T>(url: string, body?: unknown) => request<T>('PATCH', url, body ?? {}),
  del: <T>(url: string) => request<T>('DELETE', url),
  upload: <T>(url: string, form: FormData) => request<T>('POST', url, form),
};

/** Descarga un archivo binario autenticado (PDF, XLSX) disparando el guardado del navegador. */
export async function download(url: string, fallbackName = 'archivo') {
  let res = await fetch('/api' + url, { credentials: 'include' });
  if (res.status === 401 && (await tryRefresh())) res = await fetch('/api' + url, { credentials: 'include' });
  if (!res.ok) {
    let msg = 'No se pudo descargar el archivo';
    try {
      msg = (await res.json()).error?.message ?? msg;
    } catch {
      /* no JSON */
    }
    throw new ApiError(res.status, msg);
  }
  const blob = await res.blob();
  const cd = res.headers.get('content-disposition') ?? '';
  const name = decodeURIComponent(cd.match(/filename\*=UTF-8''([^;]+)/)?.[1] ?? cd.match(/filename="?([^";]+)"?/)?.[1] ?? fallbackName);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/** Respuesta paginada estándar del backend. */
export interface Paged<T> {
  data: T[];
  meta: { total: number; page: number; pageSize: number; pages: number };
}

export function errorMessage(e: unknown) {
  return e instanceof ApiError ? e.message : 'Ocurrió un error inesperado';
}
