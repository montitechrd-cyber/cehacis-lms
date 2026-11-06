import { env } from '../../config/env.js';

/**
 * Videoconferencia. Por defecto 'manual': el facilitador pega el enlace (Zoom, Meet, Teams, Jitsi).
 * Punto de extensión: un adaptador Zoom (Server-to-Server OAuth) que cree reuniones automáticamente
 * cuando ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID y ZOOM_CLIENT_SECRET estén definidos.
 */
export function detectMeetingProvider(url?: string | null) {
  if (!url) return null;
  const u = url.toLowerCase();
  if (u.includes('zoom.us')) return 'zoom';
  if (u.includes('meet.google.com')) return 'meet';
  if (u.includes('teams.microsoft.com') || u.includes('teams.live.com')) return 'teams';
  if (u.includes('jit.si')) return 'jitsi';
  return 'otro';
}

export function videoStatus() {
  const zoomReady = Boolean(env.ZOOM_ACCOUNT_ID && env.ZOOM_CLIENT_ID && env.ZOOM_CLIENT_SECRET);
  return {
    mode: env.VIDEO_PROVIDER,
    zoom: { configured: zoomReady, note: zoomReady ? 'Credenciales presentes; creación automática de reuniones pendiente de activar.' : 'Pendiente de credenciales. Se usan enlaces manuales.' },
  };
}
