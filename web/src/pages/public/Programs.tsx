import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ButtonLink } from '@/components/ui/Button';
import { EmptyState, ErrorState, SkeletonRows } from '@/components/ui/Feedback';
import { priceLabel, usePageTitle, type Program } from '@/features/public/data';
import { Masthead, Wrap, rise } from '@/features/public/parts';

export default function Programs() {
  usePageTitle('Programas');
  const q = useQuery({ queryKey: ['public', 'programs'], queryFn: async () => (await api.get<{ data: Program[] }>('/public/programs')).data });
  const rows = q.data ?? [];
  return (
    <>
      <Masthead title="Programas formativos" lead="Rutas de varios cursos en secuencia, con un solo certificado de programa." />
      <Wrap className="py-8">
        {q.isLoading ? (
          <SkeletonRows rows={3} />
        ) : q.isError ? (
          <ErrorState error={q.error} onRetry={() => q.refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState title="Muy pronto publicaremos nuestros programas." description="Mientras tanto, explora los cursos individuales." action={<ButtonLink to="/cursos" variant="primary">Ver cursos</ButtonLink>} />
        ) : (
          <ul className="border-t border-ink">
            {rows.map((p, i) => (
              <li key={p.id} className="animate-rise grid gap-x-6 gap-y-3 border-b border-line py-8 lg:grid-cols-12" style={rise(i)}>
                <div className="lg:col-span-7">
                  <h2 className="text-title font-bold">
                    <Link to={`/programas/${p.slug}`} className="text-ink no-underline hover:underline">
                      {p.title}
                    </Link>
                  </h2>
                  {p.summary && <p className="mt-3 max-w-xl text-graphite">{p.summary}</p>}
                </div>
                <p className="text-sm text-graphite tnum lg:col-span-2 lg:pt-3">
                  {p.coursesCount} {p.coursesCount === 1 ? 'curso' : 'cursos'}
                  {p.totalHours ? ` · ${p.totalHours} h` : ''}
                </p>
                <div className="flex items-center justify-between gap-4 lg:col-span-3 lg:flex-col lg:items-end">
                  <p className="text-2xl font-bold tnum">{priceLabel(p)}</p>
                  <ButtonLink to={`/programas/${p.slug}`} variant="outline">
                    Ver programa
                  </ButtonLink>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Wrap>
    </>
  );
}
