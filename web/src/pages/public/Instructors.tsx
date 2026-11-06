import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ButtonLink } from '@/components/ui/Button';
import { Avatar, Tag } from '@/components/ui/Data';
import { EmptyState, ErrorState, SkeletonRows } from '@/components/ui/Feedback';
import { Link } from 'react-router';
import { usePageTitle, type PublicInstructor } from '@/features/public/data';
import { Masthead, Wrap, rise } from '@/features/public/parts';

export default function Instructors() {
  usePageTitle('Facilitadores');
  const q = useQuery({ queryKey: ['public', 'instructors'], queryFn: async () => (await api.get<{ data: PublicInstructor[] }>('/public/instructors')).data });
  const rows = q.data ?? [];
  return (
    <>
      <Masthead title="Facilitadores" lead="Quienes guían las prácticas, evalúan con rúbricas y dan retroalimentación." />
      <Wrap className="py-8">
        {q.isLoading ? (
          <SkeletonRows rows={3} />
        ) : q.isError ? (
          <ErrorState error={q.error} onRetry={() => q.refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState
            title="Muy pronto presentaremos a nuestro equipo de facilitadores"
            description="Estamos preparando sus perfiles. Si tienes preguntas sobre quién imparte un curso, escríbenos."
            action={<ButtonLink to="/contacto" variant="primary">Ir a contacto</ButtonLink>}
          />
        ) : (
          <ul className="border-t border-ink">
            {rows.map((i, idx) => (
              <li key={i.id} className="animate-rise grid gap-6 border-b border-line py-8 lg:grid-cols-12" style={rise(idx)}>
                <div className="flex items-start gap-4 lg:col-span-4">
                  <Avatar user={i} size={72} />
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight">
                      {i.firstName} {i.lastName}
                    </h2>
                    {i.headline && <p className="mt-1 text-graphite">{i.headline}</p>}
                    {i.yearsExperience != null && <p className="mt-1 text-sm text-muted tnum">{i.yearsExperience} años de experiencia</p>}
                  </div>
                </div>
                <div className="lg:col-span-8">
                  {i.bio && <p className="max-w-2xl leading-relaxed">{i.bio}</p>}
                  {i.specialties.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {i.specialties.map((s) => (
                        <Tag key={s} tone="outline">{s}</Tag>
                      ))}
                    </div>
                  )}
                  {i.courses.length > 0 && (
                    <p className="mt-4 text-sm">
                      Imparte:{' '}
                      {i.courses.map((c, k) => (
                        <span key={c.slug}>
                          {k > 0 && ', '}
                          <Link to={`/cursos/${c.slug}`} className="font-semibold text-ink underline underline-offset-4">{c.title}</Link>
                        </span>
                      ))}
                    </p>
                  )}
                  {i.linkedinUrl && (
                    <a href={i.linkedinUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-semibold text-ink underline underline-offset-4">
                      LinkedIn
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Wrap>
    </>
  );
}
