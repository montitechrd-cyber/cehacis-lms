import { useState } from 'react';
import { toast } from 'sonner';
import { Download } from 'lucide-react';
import { download, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Form';
import { PageHeader, Panel } from '@/components/ui/Page';
import { Tag } from '@/components/ui/Data';
import { useCourseOptions } from '@/features/system/shared';

interface Def {
  key: string; title: string; description: string; perms: string[]; formats: ('xlsx' | 'pdf')[]; course?: 'required' | 'optional'; dates?: boolean;
}

const REPORTS: Def[] = [
  { key: 'students', title: 'Estudiantes', description: 'Estudiantes registrados con estado, inscripciones, puntos y último acceso. Las fechas filtran por registro.', perms: ['students.manage', 'reports.view'], formats: ['xlsx', 'pdf'], course: 'optional', dates: true },
  { key: 'enrollments', title: 'Inscripciones', description: 'Inscripciones con estado, progreso y nota final. Los facilitadores solo ven sus cursos.', perms: ['reports.view', 'reports.academic', 'students.manage', 'courses.manage', 'courses.teach'], formats: ['xlsx', 'pdf'], course: 'optional', dates: true },
  { key: 'payments', title: 'Pagos y pedidos', description: 'Pedidos con totales, estado, proveedor y si son de prueba. Las fechas filtran por creación.', perms: ['payments.manage', 'reports.view'], formats: ['xlsx', 'pdf'], dates: true },
  { key: 'grades', title: 'Calificaciones', description: 'Una fila por estudiante y una columna por evaluación publicada, más la nota final. Requiere elegir un curso.', perms: ['courses.manage', 'courses.teach'], formats: ['xlsx', 'pdf'], course: 'required' },
  { key: 'attendance', title: 'Asistencia', description: 'Matriz de estudiantes por sesión con porcentaje de asistencia (hasta 60 sesiones). Requiere elegir un curso.', perms: ['courses.manage', 'courses.teach'], formats: ['xlsx', 'pdf'], course: 'required', dates: true },
  { key: 'competencies', title: 'Competencias', description: 'Registros de competencias ya revisados por un facilitador.', perms: ['reports.academic'], formats: ['xlsx', 'pdf'], course: 'optional', dates: true },
  { key: 'dashboard', title: 'Resumen del dashboard', description: 'Indicadores generales y cursos con más inscripciones. Solo se genera en PDF; sin fechas usa los últimos 30 días.', perms: ['reports.view', 'reports.academic'], formats: ['pdf'], dates: true },
];

export default function Reports() {
  const { can } = useAuth();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [courseId, setCourseId] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const { options } = useCourseOptions();
  const visible = REPORTS.filter((r) => can(...r.perms));

  const run = async (r: Def, format: 'xlsx' | 'pdf') => {
    const p = new URLSearchParams({ format });
    if (r.dates && from) p.set('from', from);
    if (r.dates && to) p.set('to', to);
    if (r.course && courseId) p.set('courseId', courseId);
    const id = `${r.key}-${format}`;
    setBusy(id);
    try {
      await download(`/reports/export/${r.key}?${p.toString()}`, `reporte-${r.key}.${format}`);
      toast.success('Reporte descargado');
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <PageHeader title="Centro de reportes" description="Descarga la información de la academia en Excel o PDF. El rango de fechas y el curso se aplican a los reportes que los admiten." />
      <Panel className="mb-8">
        <div className="grid gap-4 sm:grid-cols-3">
          <Input label="Desde" type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
          <Input label="Hasta" type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
          <Select label="Curso" placeholder="Todos los cursos" options={options} value={courseId} onChange={(e) => setCourseId(e.target.value)} />
        </div>
        <p className="mt-3 text-xs text-muted">Calificaciones y asistencia exigen un curso. Los PDF se limitan a 3000 filas; el Excel es completo.</p>
      </Panel>
      <ul className="divide-y divide-line border-y border-ink" aria-label="Reportes disponibles">
        {visible.map((r) => {
          const needCourse = r.course === 'required' && !courseId;
          return (
            <li key={r.key} className="grid gap-4 py-5 md:grid-cols-[1fr_auto] md:items-center">
              <div className="max-w-2xl">
                <h2 className="flex flex-wrap items-center gap-2 text-lg font-bold tracking-tight">{r.title}{r.formats.length === 1 && <Tag tone="outline">Solo PDF</Tag>}{r.course === 'required' && <Tag tone="info">Requiere curso</Tag>}</h2>
                <p className="mt-1 text-sm text-graphite">{r.description}</p>
                {needCourse && <p className="mt-1 text-xs font-semibold text-ink">Elige un curso para habilitar la descarga.</p>}
              </div>
              <div className="flex gap-2">
                {r.formats.includes('xlsx') && <Button variant="outline" icon={<Download className="size-4" />} disabled={needCourse} loading={busy === `${r.key}-xlsx`} onClick={() => run(r, 'xlsx')} aria-label={`Descargar ${r.title} en Excel`}>Excel</Button>}
                {r.formats.includes('pdf') && <Button variant="ink" icon={<Download className="size-4" />} disabled={needCourse} loading={busy === `${r.key}-pdf`} onClick={() => run(r, 'pdf')} aria-label={`Descargar ${r.title} en PDF`}>PDF</Button>}
              </div>
            </li>
          );
        })}
      </ul>
      {visible.length === 0 && <p className="py-10 text-center text-sm text-graphite">Tu rol no tiene reportes disponibles.</p>}
    </div>
  );
}
