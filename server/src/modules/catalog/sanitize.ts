/**
 * Sanitizador simple de HTML de editor enriquecido (regex + lista blanca).
 * Quita <script>, <style>, <object>, <embed>, <base>, <meta>, <link>, <form>,
 * <iframe> salvo de YouTube / Vimeo, atributos on*, y URLs javascript:/vbscript:/data: peligrosas.
 */

const IFRAME_OK = /^https:\/\/(www\.)?(youtube\.com|youtube-nocookie\.com|player\.vimeo\.com)\//i;
const URL_ATTRS = ['href', 'src', 'xlink:href', 'action', 'formaction', 'poster', 'background', 'srcset'];

function decodeEntities(v: string) {
  return v
    .replace(/&#x([0-9a-f]+);?/gi, (_, h) => String.fromCodePoint(parseInt(h, 16) || 32))
    .replace(/&#(\d+);?/g, (_, d) => String.fromCodePoint(parseInt(d, 10) || 32))
    .replace(/&colon;/gi, ':')
    .replace(/&tab;|&newline;/gi, '');
}

function unsafeUrl(raw: string, allowImageData: boolean) {
  // eslint-disable-next-line no-control-regex
  const v = decodeEntities(raw).replace(/[\u0000- \u007f-\u009f]+/g, '').toLowerCase();
  if (/^(javascript|vbscript|livescript):/.test(v)) return true;
  if (v.startsWith('data:')) return !(allowImageData && /^data:image\/(png|jpe?g|gif|webp);/.test(v));
  return false;
}

export function sanitizeHtml(input: string): string {
  let html = input;

  // Bloques completos peligrosos (con contenido).
  for (const tag of ['script', 'style', 'object', 'embed', 'noscript', 'template', 'form', 'textarea']) {
    html = html.replace(new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}\\s*>`, 'gi'), '');
  }
  // Etiquetas sueltas / sin cierre.
  html = html.replace(/<\/?(script|style|object|embed|noscript|template|form|textarea|base|meta|link|applet|frame|frameset)\b[^>]*>/gi, '');

  // iframes: solo YouTube / Vimeo por https.
  html = html.replace(/<iframe\b([^>]*)>[\s\S]*?<\/iframe\s*>|<iframe\b([^>]*)\/?>/gi, (_m, a1, a2) => {
    const attrs: string = a1 ?? a2 ?? '';
    const src = /\bsrc\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(attrs);
    const url = (src?.[2] ?? src?.[3] ?? src?.[4] ?? '').trim();
    if (!url || !IFRAME_OK.test(url)) return '';
    const safeUrl = url.replace(/"/g, '&quot;');
    return `<iframe src="${safeUrl}" width="560" height="315" frameborder="0" allowfullscreen loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
  });

  // Atributos on* (repetir por si quedan anidados tras la limpieza).
  const onAttr = /[\s/]+on[a-z0-9_-]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]*)/gi;
  for (let i = 0; i < 5 && onAttr.test(html); i++) {
    onAttr.lastIndex = 0;
    html = html.replace(onAttr, '');
    onAttr.lastIndex = 0;
  }

  // Atributos con URL: javascript:, vbscript:, data: no imagen.
  const urlAttr = new RegExp(`(\\s)(${URL_ATTRS.join('|')})\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'gi');
  html = html.replace(urlAttr, (_m, sp, name, _full, dq, sq, bare) => {
    const val: string = dq ?? sq ?? bare ?? '';
    const allowImg = ['src', 'srcset', 'poster', 'background'].includes(String(name).toLowerCase());
    return unsafeUrl(val, allowImg) ? '' : `${sp}${name}="${val.replace(/"/g, '&quot;')}"`;
  });

  // style con expression() o url(javascript:)
  html = html.replace(/\sstyle\s*=\s*("([^"]*)"|'([^']*)')/gi, (m, _f, dq, sq) => {
    const v = String(dq ?? sq ?? '').toLowerCase();
    return /expression\s*\(|javascript:|vbscript:|behavior\s*:|-moz-binding/.test(v) ? '' : m;
  });

  return html;
}
