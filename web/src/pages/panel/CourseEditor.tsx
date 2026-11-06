import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Archive, Eye, Globe, Rocket, Wrench, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useAction } from '@/lib/hooks';
import { COURSE_STATUS } from '@/lib/format';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Tabs, Tag, statusTone } from '@/components/ui/Data';
import { Alert, ErrorState, PageLoader } from '@/components/ui/Feedback';
import { PageHeader } from '@/components/ui/Page';
import { ConfirmDialog } from '@/components/ui/Overlay';
import type { CourseFull } from '@/features/course-admin/shared';
import TabFicha from '@/features/course-admin/TabFicha';
import TabContenido from '@/features/course-admin/TabContenido';
import TabEvaluaciones from '@/features/course-admin/TabEvaluaciones';
import TabPracticas from '@/features/course-admin/TabPracticas';
import TabArchivos from '@/features/course-admin/TabArchivos';
import TabGrupos from '@/features/course-admin/TabGrupos';
import TabInscripciones from '@/features/course-admin/TabInscripciones';
import TabCalificaciones from '@/features/course-admin/TabCalificaciones';
import TabAsistencia from '@/features/course-admin/TabAsistencia';

const TABS = [
  { key: 'ficha', label: 'Ficha' },
  { key: 'contenido', label: 'Contenido' },
  { key: 'evaluaciones', label: 'Evaluaciones' },
  { key: 'practicas', label: 'Prácticas' },
  { key: 'archivos', label: 'Carpetas y archivos' },
  { key: 'grupos', label: 'Grupos' },
  { key: 'inscripciones', label: 'Inscripciones' },
  { key: 'calificaciones', label: 'Calificaciones' },
  { key: 'asistencia', label: 'Asistencia' },
] as const;
type TabKey = (typeof TABS)[number]['key'];

export default function CourseEditor() {
  const { id } = useParams();
  const courseId = Number(id);
  const { can } = useAuth();
  const isAdmin = can('courses.manage');
  const [sp, setSp] = useSearchParams();
  const tab = (TABS.find((t) => t.key === sp.get('tab'))?.key ?? 'ficha') as TabKey;
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const q = useQuery({ queryKey: ['course', courseId], queryFn: () => api.get<{ data: CourseFull }>(`/catalog/courses/${courseId}`), enabled: Number.isFinite(courseId) });
  const setStatus = useAction((status: string) => api.post(`/catalog/courses/${courseId}/status`, { status }), {
    success: 'Estado actualizado', invalidate: [['course', courseId], ['panel-courses']], silentError: true,
    onSuccess: () => { setStatusError(null); setConfirmArchive(false); },
  });
  const changeStatus = async (status: string) => {
    setStatusError(null);
    try { await setStatus.mutateAsync(status); } catch (e) {
      const m = errorMessage(e);
      setStatusError(m);
      toast.error(m);
      setConfirmArchive(false);
    }
  };

  if (q.isLoading) return <PageLoader />;
  if (q.isError || !q.data) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const c = q.data.data;

  const actions = (
    <>
      <ButtonLink to={`/campus/cursos/${c.id}`} variant="outline" size="sm" icon={<Eye className="size-4" />}>Vista previa</ButtonLink>
      {c.status === 'PUBLISHED' && <ButtonLink to={`/cursos/${c.slug}`} variant="outline" size="sm" icon={<Globe className="size-4" />}>Ficha pública</ButtonLink>}
      {isAdmin && (
        <>
          {c.status !== 'PUBLISHED' && c.status !== 'ARCHIVED' && <Button size="sm" variant="primary" icon={<Rocket className="size-4" />} loading={setStatus.isPending} onClick={() => changeStatus('PUBLISHED')}>Publicar</Button>}
          {c.status === 'DRAFT' && <Button size="sm" variant="outline" icon={<Wrench className="size-4" />} onClick={() => changeStatus('IN_DEVELOPMENT')}>Pasar a en desarrollo</Button>}
          {c.status === 'PUBLISHED' && <Button size="sm" variant="outline" icon={<EyeOff className="size-4" />} onClick={() => changeStatus('DRAFT')}>Despublicar</Button>}
          {c.status === 'ARCHIVED' && <Button size="sm" variant="outline" icon={<Wrench className="size-4" />} onClick={() => changeStatus('IN_DEVELOPMENT')}>Pasar a en desarrollo</Button>}
          {c.status !== 'ARCHIVED' && <Button size="sm" variant="ghost" icon={<Archive className="size-4" />} onClick={() => setConfirmArchive(true)}>Archivar</Button>}
        </>
      )}
    </>
  );

  return (
    <div className="animate-rise">
      <PageHeader
        crumbs={[{ label: 'Cursos', to: '/panel/cursos' }, { label: c.code }]}
        title={<span className="flex flex-wrap items-center gap-3"><span>{c.title}</span><Tag tone={statusTone(c.status)}>{COURSE_STATUS[c.status] ?? c.status}</Tag></span>}
        description={<span className="tnum">{c.code} · {c.counts.modules} módulos · {c.counts.lessons} lecciones · {c.counts.enrollments} inscritos</span>}
        actions={actions}
        className="mb-6"
      />
      {statusError && <div className="mb-4"><Alert tone="danger" title="No se pudo cambiar el estado">{statusError}</Alert></div>}
      <Tabs className="mb-6" tabs={TABS.map((t) => ({ key: t.key, label: t.label }))} value={tab} onChange={(k) => { const n = new URLSearchParams(sp); n.set('tab', k); setSp(n, { replace: true }); }} />
      <div role="tabpanel">
        {tab === 'ficha' && <TabFicha course={c} isAdmin={isAdmin} canTemplates={can('certificates.manage')} />}
        {tab === 'contenido' && <TabContenido course={c} />}
        {tab === 'evaluaciones' && <TabEvaluaciones course={c} />}
        {tab === 'practicas' && <TabPracticas course={c} />}
        {tab === 'archivos' && <TabArchivos course={c} />}
        {tab === 'grupos' && <TabGrupos course={c} />}
        {tab === 'inscripciones' && <TabInscripciones course={c} />}
        {tab === 'calificaciones' && <TabCalificaciones course={c} />}
        {tab === 'asistencia' && <TabAsistencia course={c} />}
      </div>
      <ConfirmDialog open={confirmArchive} onClose={() => setConfirmArchive(false)} title="Archivar curso" description="El curso dejará de estar disponible en el catálogo. Las inscripciones se conservan." confirmLabel="Archivar" loading={setStatus.isPending} onConfirm={() => changeStatus('ARCHIVED')} />
    </div>
  );
}
