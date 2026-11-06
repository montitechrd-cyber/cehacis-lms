import { ButtonLink } from '@/components/ui/Button';
import { EmptyState, ErrorState, SkeletonRows } from '@/components/ui/Feedback';
import { useFaqs, usePageTitle } from '@/features/public/data';
import { Accordion, Masthead, Wrap } from '@/features/public/parts';

export default function Faq() {
  usePageTitle('Preguntas frecuentes');
  const q = useFaqs();
  return (
    <>
      <Masthead title="Preguntas frecuentes" lead="Lo que más nos preguntan antes de inscribirse." />
      <Wrap className="py-10">
        <div className="max-w-4xl">
          {q.isLoading ? (
            <SkeletonRows rows={5} />
          ) : q.isError ? (
            <ErrorState error={q.error} onRetry={() => q.refetch()} />
          ) : !q.data?.length ? (
            <EmptyState title="Aún no hay preguntas publicadas." description="Si tienes una duda, escríbenos." action={<ButtonLink to="/contacto" variant="primary">Contacto</ButtonLink>} />
          ) : (
            <>
              <Accordion items={q.data} />
              <p className="mt-8 text-graphite">
                ¿No encuentras tu respuesta? <ButtonLink to="/contacto" variant="link">Escríbenos</ButtonLink>
              </p>
            </>
          )}
        </div>
      </Wrap>
    </>
  );
}
