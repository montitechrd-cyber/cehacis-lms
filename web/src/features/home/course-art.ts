/**
 * Fotos de portada por tema para las tarjetas de curso del home, usadas solo cuando el curso
 * no tiene imagen propia subida desde el panel. Son fotos de Unsplash (licencia Unsplash: uso
 * comercial libre, sin atribución obligatoria) guardadas en web/public/home/cursos a 800×450.
 * Origen (unsplash.com/photos/…): oratoria NK02ShlfWDM, asertividad photo-1758873268315,
 * conflictos photo-1630487656049, general wMRIcT86SWU.
 */
const ART: { match: RegExp; file: string; alt: string }[] = [
  { match: /orator|discurso|hablar en p/i, file: 'oratoria', alt: 'Una mujer habla con micrófono ante un público' },
  { match: /inteligencia social/i, file: 'inteligencia-social', alt: 'Una mujer conversa sonriendo con dos colegas en una reunión' },
  { match: /asertiv/i, file: 'asertividad', alt: 'Dos colegas conversan frente a frente en una oficina' },
  { match: /conflict|negocia|mediaci/i, file: 'conflictos', alt: 'Un grupo dialoga alrededor de una mesa de trabajo' },
];
const FALLBACK = { file: 'general', alt: 'Una persona presenta ante un grupo en una sala de trabajo' };

/** Portada temática para un curso según su título o slug. */
export function courseArt(course: { title: string; slug: string }) {
  const key = `${course.slug} ${course.title}`;
  const hit = ART.find((a) => a.match.test(key)) ?? FALLBACK;
  return { src: `/home/cursos/${hit.file}.webp`, alt: hit.alt };
}

/**
 * Fotos 16:9 propias de CEHACIS para las TARJETAS de curso (home, catálogo, programas).
 * La ficha del curso sigue usando la portada subida al curso (imageUrl).
 * Para sumar una: guardar web/public/home/cursos/tarjetas/<file>.webp (16:9) y añadir su entrada.
 */
const CARD: { match: RegExp; file: string; alt: string }[] = [
  { match: /inteligencia social/i, file: 'inteligencia-social', alt: 'Una mujer conversa sonriendo con dos colegas en una reunión' },
  { match: /orator|discurso|hablar en p/i, file: 'oratoria', alt: 'Un hombre sonríe mientras habla desde un atril ante un público' },
  { match: /asertiv/i, file: 'comunicacion-asertiva', alt: 'Una mujer explica algo con calma a un colega en una mesa de trabajo' },
  { match: /conflict|negocia|mediaci/i, file: 'resolucion-conflictos', alt: 'Tres colegas dialogan sonrientes alrededor de una mesa' },
];

/** Foto de tarjeta para un curso, o null si aún no tiene una propia. */
export function cardArt(course: { title: string; slug: string }) {
  const key = `${course.slug} ${course.title}`;
  const hit = CARD.find((a) => a.match.test(key));
  return hit ? { src: `/home/cursos/tarjetas/${hit.file}.webp`, alt: hit.alt } : null;
}
