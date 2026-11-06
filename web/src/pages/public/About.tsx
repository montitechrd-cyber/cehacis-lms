import { ButtonLink } from '@/components/ui/Button';
import { useBrand } from '@/lib/brand';
import { usePageTitle } from '@/features/public/data';
import { Block, Masthead, Wrap } from '@/features/public/parts';

const DOES = [
  ['Entrenamiento en habilidades comunicativas e inteligencia social', 'Oratoria, comunicación asertiva, resolución de conflictos y etiqueta, trabajados como competencias que se practican.'],
  ['Modalidad online', 'Estudias desde donde estés, con materiales disponibles las 24 horas.'],
  ['Seguimiento del progreso', 'Ves tu avance por lección, módulo y competencia a lo largo del curso.'],
  ['Certificado al completar', 'Cada certificado lleva un código y un QR para que cualquiera pueda verificarlo.'],
] as const;

const METHOD = [
  ['Práctica deliberada', 'Ejercicios de role-playing, oratoria y conversaciones difíciles; se aprende haciendo, con repetición y ajuste.'],
  ['Rúbricas por competencia', 'Cada práctica se evalúa con criterios explícitos, de modo que sabes qué mejorar y puedes medir tu evolución.'],
  ['Facilitadores', 'Personas reales revisan tus entregas y dan retroalimentación. El entrenador con IA apoya la práctica; la última palabra es siempre del facilitador.'],
] as const;

export default function About() {
  usePageTitle('Nosotros');
  const brand = useBrand();
  return (
    <>
      <Masthead tone="orange" title={brand.tagline} lead={`${brand.name} es el ${brand.legalName}.`} />
      <Wrap>
        <Block title="Misión">
          <p className="max-w-2xl text-2xl font-semibold leading-snug tracking-tight">
            Ayudar a las personas a hablar con seguridad, comunicarse con asertividad y desenvolverse socialmente, con un entrenamiento que se practica y se mide.
          </p>
        </Block>
        <Block title="Qué hace CEHACIS">
          <dl className="divide-y divide-line border-y border-line">
            {DOES.map(([t, d]) => (
              <div key={t} className="grid gap-1 py-5 sm:grid-cols-[minmax(0,2fr)_3fr] sm:gap-8">
                <dt className="text-xl font-bold tracking-tight">{t}</dt>
                <dd className="text-graphite">{d}</dd>
              </div>
            ))}
          </dl>
        </Block>
        <Block title="Método">
          <dl className="divide-y divide-line border-y border-line">
            {METHOD.map(([t, d]) => (
              <div key={t} className="grid gap-1 py-5 sm:grid-cols-[minmax(0,2fr)_3fr] sm:gap-8">
                <dt className="text-xl font-bold tracking-tight">{t}</dt>
                <dd className="text-graphite">{d}</dd>
              </div>
            ))}
          </dl>
        </Block>
      </Wrap>
      <section className="bg-stone">
        <Wrap className="flex flex-col gap-6 py-14 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="max-w-2xl text-title font-bold">Conoce los cursos del ciclo.</h2>
          <div className="flex flex-wrap gap-3">
            <ButtonLink to="/cursos" variant="primary" size="lg">Ver cursos</ButtonLink>
            <ButtonLink to="/contacto" variant="outline" size="lg">Contacto</ButtonLink>
          </div>
        </Wrap>
      </section>
    </>
  );
}
