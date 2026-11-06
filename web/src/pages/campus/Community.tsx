import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { Lock, Mail, Pin } from 'lucide-react';
import { api, type Paged } from '@/lib/api';
import { dateTime, fullName, num, relative } from '@/lib/format';
import { PageHeader, Section } from '@/components/ui/Page';
import { EmptyState } from '@/components/ui/Feedback';
import { ButtonLink } from '@/components/ui/Button';
import { Tag } from '@/components/ui/Data';
import { PlainText, Q, type CommunityUser } from '@/features/campus/shared';

export interface ForumRow {
  id: number;
  title: string;
  description: string | null;
  type: 'GENERAL' | 'COURSE' | 'GROUP' | 'EXPERIENCES' | 'QA';
  course: { id: number; title: string } | null;
  group: { id: number; name: string } | null;
  isLocked: boolean;
  threadCount: number;
  postCount: number;
  lastActivity: string | null;
}
interface Announcement {
  id: number;
  title: string;
  body: string;
  isPinned: boolean;
  publishedAt: string;
  author: CommunityUser;
  course: { id: number; title: string } | null;
}

function ForumList({ forums }: { forums: ForumRow[] }) {
  return (
    <ul className="divide-y divide-line border-y border-line">
      {forums.map((f) => (
        <li key={f.id}>
          <Link to={`/campus/comunidad/foro/${f.id}`} className="grid gap-x-6 gap-y-1 py-4 no-underline hover:bg-stone md:grid-cols-[1fr_auto]">
            <span className="min-w-0">
              <span className="flex items-center gap-2 text-lg font-bold tracking-tight">
                {f.title}
                {f.isLocked && <Lock className="size-4 text-muted" aria-label="Foro bloqueado" />}
              </span>
              {f.description && <span className="block text-sm text-graphite">{f.description}</span>}
              {(f.course || f.group) && <span className="block text-xs text-muted">{[f.course?.title, f.group?.name].filter(Boolean).join(' · ')}</span>}
            </span>
            <span className="text-sm text-graphite tnum md:text-right">
              {num(f.threadCount)} hilos · {num(f.postCount)} mensajes
              <span className="block text-xs text-muted">{f.lastActivity ? `Última actividad ${relative(f.lastActivity)}` : 'Sin actividad'}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function Community() {
  const forums = useQuery({ queryKey: ['community', 'forums'], queryFn: async () => (await api.get<{ data: ForumRow[] }>('/community/forums')).data });
  const ann = useQuery({ queryKey: ['community', 'announcements'], queryFn: () => api.get<Paged<Announcement>>('/community/announcements', { pageSize: 5 }) });

  return (
    <div className="animate-rise">
      <PageHeader
        title="Comunidad"
        description="Foros de discusión, experiencias compartidas y anuncios de tu institución."
        actions={<ButtonLink to="/campus/mensajes" variant="outline" icon={<Mail className="size-4" />}>Mensajes</ButtonLink>}
      />
      <Section title="Anuncios">
        <Q query={ann}>
          {(r) =>
            r.data.length === 0 ? (
              <p className="border-y border-line py-6 text-sm text-graphite">No hay anuncios por ahora.</p>
            ) : (
              <ul className="divide-y divide-line border-y border-line">
                {r.data.map((a) => (
                  <li key={a.id} className="py-4">
                    <p className="flex flex-wrap items-center gap-2 font-bold">
                      {a.isPinned && <Pin className="size-4" aria-label="Fijado" />}
                      {a.title}
                      {a.course && <Tag tone="outline">{a.course.title}</Tag>}
                    </p>
                    <PlainText className="mt-1 max-w-3xl text-sm text-graphite">{a.body}</PlainText>
                    <p className="mt-1 text-xs text-muted">{fullName(a.author)} · {dateTime(a.publishedAt)}</p>
                  </li>
                ))}
              </ul>
            )
          }
        </Q>
      </Section>
      <Q query={forums}>
        {(list) => {
          if (list.length === 0) return <EmptyState title="No hay foros disponibles" description="Cuando te inscribas en cursos o la institución abra foros, aparecerán aquí." action={<ButtonLink to="/campus/cursos" variant="ink">Mis cursos</ButtonLink>} />;
          const groups = [
            { title: 'Generales', items: list.filter((f) => f.type === 'GENERAL' || f.type === 'QA') },
            { title: 'Experiencias', items: list.filter((f) => f.type === 'EXPERIENCES') },
            { title: 'De mis cursos', items: list.filter((f) => f.type === 'COURSE' || f.type === 'GROUP') },
          ];
          return (
            <>
              {groups.filter((g) => g.items.length).map((g) => (
                <Section key={g.title} title={g.title}>
                  <ForumList forums={g.items} />
                </Section>
              ))}
            </>
          );
        }}
      </Q>
    </div>
  );
}
