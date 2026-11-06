/**
 * Cloudflare Pages Function: reenvía /api/* al servidor de CEHACIS en Railway.
 * Así la web y la API comparten origen (cookies de sesión y CSRF sin CORS).
 * El origen del servidor se configura con la variable API_ORIGIN del proyecto de Pages.
 */
interface Env {
  API_ORIGIN?: string;
}

const DEFAULT_ORIGIN = 'https://api-production-84e7.up.railway.app';

export const onRequest = async ({ request, env }: { request: Request; env: Env }) => {
  const url = new URL(request.url);
  const target = new URL(url.pathname + url.search, env.API_ORIGIN || DEFAULT_ORIGIN);
  const headers = new Headers(request.headers);
  headers.set('X-Forwarded-Host', url.host);
  headers.set('X-Forwarded-Proto', 'https');
  const init: RequestInit = { method: request.method, headers, redirect: 'manual' };
  if (request.method !== 'GET' && request.method !== 'HEAD') init.body = request.body;
  return fetch(target.toString(), init);
};
