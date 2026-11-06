import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Mail, MessagesSquare } from 'lucide-react';
import { ButtonLink } from '@/components/ui/Button';
import { EmptyState, ErrorState, PageLoader } from '@/components/ui/Feedback';
import { Avatar, SearchInput, Tag } from '@/components/ui/Data';
import { PageHeader, Section } from '@/components/ui/Page';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { fullName, relative } from '@/lib/format';
import type { Announcement, UserBrief } from '@/features/classroom/types';

interface Forum {
  id: number;
  title: string;
  description: string | null;
  type: string;
  isLocked: boolean;
  threadCount: number;
  postCount: number;
  lastActivity: string | null;
  group: { id: number; name: string } | null;
}
interface Space {
  course: { id: number; title: string; slug: string };
  forums: Forum[];
  announcements: Announcement[];
  members: UserBrief[];
  canModerate: boolean;
}

export default function CourseSpace() {
  const courseId = Number(useParams().courseId);
  const { user } = useAuth();
  const [q, setQ] = useState('');
  const query = useQuery({ queryKey: ['course-space', courseId], queryFn: () => api.get<{ data: Space }>(`/community/courses/${courseId}/space`) });
  const space = query.data?.data;
  const members = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (space?.members ?? []).filter((m) => !s || fullName(m).toLowerCase().includes(s));
  }, [space, q]);

  if (query.isLoading) return <PageLoader />;
  if (query.error || !space) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  const staff = members.filter((m) => m.role !== 'STUDENT');
  const peers = members.filter((m) => m.role === 'STUDENT');

  const person = (m: UserBrief) => (
    <li key={m.id} className="flex items-center gap-3 py-2.5">
      <Avatar user={m} size={36} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{fullName(m)}</p>
        {m.role !== 'STUDENT' && <Tag tone="ink">Facilitador</Tag>}
      </div>
      {m.id !== user?.id && (
        <ButtonLink to={`/campus/mensajes?to=${m.id}`} size="sm" variant="outline" icon={<Mail className="size-4" />}>
          <span className="max-sm:sr-only">Enviar mensaje</span>
        </ButtonLink>
      )}
    </li>
  );

  return (
    <div>
      <PageHeader
        title="Espacio del curso"
        description={space.course.title}
        crumbs={[{ label: 'Mis cursos', to: '/campus/cursos' }, { label: space.course.title, to: `/campus/cursos/${courseId}` }, { label: 'Espacio' }]}
      />
      <div className="grid gap-x-14 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div>
          <Section title="Foros">
            {!space.forums.length ? (
              <EmptyState title="Este curso aún no tiene foros" />
            ) : (
              <ul className="divide-y divide-line border-y border-line">
                {space.forums.map((f) => (
                  <li key={f.id}>
                    <Link to={`/campus/comunidad/foro/${f.id}`} className="flex items-start gap-3 py-4 no-underline hover:bg-stone sm:px-2">
                      <MessagesSquare className="mt-1 size-5 shrink-0 text-graphite" aria-hidden />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">
                          {f.title} {f.group && <Tag tone="outline">{f.group.name}</Tag>} {f.isLocked && <Tag tone="warning">Cerrado</Tag>}
                        </p>
                        {f.description && <p className="mt-0.5 text-sm text-graphite">{f.description}</p>}
                        <p className="mt-1 text-xs text-muted tnum">
                          {f.threadCount} hilos · {f.postCount} mensajes{f.lastActivity ? ` · ${relative(f.lastActivity)}` : ''}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Section>
          <Section title="Anuncios recientes">
            {!space.announcements.length ? (
              <p className="border-y border-line py-6 text-sm text-graphite">No hay anuncios para este curso.</p>
            ) : (
              <ul className="divide-y divide-line border-y border-line">
                {space.announcements.map((a) => (
                  <li key={a.id} className="py-4">
                    <p className="font-semibold">
                      {a.title} {a.isPinned && <Tag tone="orange">Fijado</Tag>}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-graphite">{a.body}</p>
                    <p className="mt-1.5 text-xs text-muted">
                      {fullName(a.author)} · {relative(a.publishedAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
        <div>
          <Section title={`Integrantes (${space.members.length})`} actions={<SearchInput value={q} onChange={setQ} placeholder="Buscar persona" className="w-44" />}>
            {!members.length ? (
              <p className="border-y border-line py-6 text-sm text-graphite">Nadie coincide con la búsqueda.</p>
            ) : (
              <>
                {staff.length > 0 && (
                  <>
                    <h3 className="mb-1 text-sm font-bold">Facilitadores</h3>
                    <ul className="mb-6 divide-y divide-line border-y border-line">{staff.map(person)}</ul>
                  </>
                )}
                {peers.length > 0 && (
                  <>
                    <h3 className="mb-1 text-sm font-bold">Compañeros</h3>
                    <ul className="divide-y divide-line border-y border-line">{peers.map(person)}</ul>
                  </>
                )}
              </>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}
