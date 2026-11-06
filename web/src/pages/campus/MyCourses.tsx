import { useState } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { ButtonLink } from '@/components/ui/Button';
import { EmptyState, ErrorState, SkeletonRows } from '@/components/ui/Feedback';
import { ProgressRule, Tabs } from '@/components/ui/Data';
import { PageHeader } from '@/components/ui/Page';
import { api } from '@/lib/api';
import { LEVELS, MODALITIES, fullName } from '@/lib/format';
import type { MyCourse } from '@/features/classroom/types';

export default function MyCourses() {
  const [tab, setTab] = useState<'active' | 'completed'>('active');
  const q = useQuery({ queryKey: ['my-courses', tab], queryFn: () => api.get<MyCourse[]>('/classroom/my-courses', { status: tab }) });

  return (
    <div>
      <PageHeader title="Mis cursos" description="Retoma tus cursos donde los dejaste." />
      <Tabs
        tabs={[
          { key: 'active', label: 'Activos' },
          { key: 'completed', label: 'Completados' },
        ]}
        value={tab}
        onChange={setTab}
        className="mb-6"
      />
      {q.isLoading ? (
        <SkeletonRows rows={3} />
      ) : q.error ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : !q.data?.length ? (
        <EmptyState
          title={tab === 'active' ? 'No tienes cursos activos' : 'Aún no has completado ningún curso'}
          description={tab === 'active' ? 'Explora el catálogo para inscribirte en tu próximo curso.' : 'Cuando termines un curso aparecerá aquí junto con su certificado.'}
          action={
            <ButtonLink to="/cursos" variant="primary">
              Explorar el catálogo
            </ButtonLink>
          }
        />
      ) : (
        <ul className="divide-y divide-line border-y border-ink">
          {q.data.map((m, i) => {
            const go = m.nextLesson ?? m.lastLesson;
            return (
              <li key={m.enrollment.id} className="grid animate-rise gap-5 py-6 md:grid-cols-[200px_1fr_auto] md:items-center" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="aspect-[16/10] bg-stone-2 md:aspect-[4/3]">
                  {m.course.imageUrl ? <img src={m.course.imageUrl} alt="" className="size-full object-cover" /> : <div className="flex size-full items-end bg-ink p-3 text-sm font-semibold text-paper tnum">{m.course.code}</div>}
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-graphite">
                    {m.course.code} · {LEVELS[m.course.level] ?? m.course.level} · {MODALITIES[m.course.modality] ?? m.course.modality}
                    {m.course.category ? ` · ${m.course.category.name}` : ''}
                  </p>
                  <h2 className="mt-1 text-2xl font-bold leading-tight tracking-tight">
                    <Link to={`/campus/cursos/${m.course.id}`} className="no-underline hover:underline">
                      {m.course.title}
                    </Link>
                  </h2>
                  {m.instructors.length > 0 && <p className="mt-1 text-sm text-graphite">{m.instructors.map(fullName).join(', ')}</p>}
                  <ProgressRule value={m.enrollment.progressPct} label={`Progreso en ${m.course.title}`} className="mt-4 max-w-md" />
                  {tab === 'active' && go && (
                    <p className="mt-3 text-sm text-graphite">
                      {m.nextLesson ? 'Siguiente' : 'Última'}: <span className="font-semibold text-ink">{go.title}</span>
                    </p>
                  )}
                  {tab === 'completed' && m.enrollment.finalGrade != null && <p className="mt-3 text-sm text-graphite tnum">Nota final: {m.enrollment.finalGrade}</p>}
                </div>
                <div className="flex gap-2 md:flex-col md:items-stretch">
                  {go && (
                    <ButtonLink to={`/campus/leccion/${go.id}`} variant="primary" iconRight={<ArrowRight className="size-4" />}>
                      {tab === 'completed' ? 'Repasar' : 'Continuar'}
                    </ButtonLink>
                  )}
                  <ButtonLink to={`/campus/cursos/${m.course.id}`} variant="outline">
                    Ver curso
                  </ButtonLink>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
