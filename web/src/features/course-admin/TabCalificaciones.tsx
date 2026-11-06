import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { api, download, errorMessage } from '@/lib/api';
import { fullName, num } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState, SkeletonRows } from '@/components/ui/Feedback';
import { ProgressRule } from '@/components/ui/Data';
import type { CourseFull } from './shared';

interface Gradebook {
  assessments: { id: number; title: string; type: string; weight: number }[];
  activities: { id: number; title: string; maxScore: number }[];
  rows: { user: { id: number; firstName: string; lastName: string; email: string }; enrollmentStatus: string; progressPct: number; finalGrade: number | null; cells: Record<string, number | null> }[];
}

export default function TabCalificaciones({ course }: { course: CourseFull }) {
  const q = useQuery({ queryKey: ['gradebook', course.id], queryFn: () => api.get<Gradebook>(`/assessments/courses/${course.id}/gradebook`) });
  const [busy, setBusy] = useState(false);
  const exportXlsx = async () => {
    setBusy(true);
    try { await download(`/reports/export/grades?format=xlsx&courseId=${course.id}`, `calificaciones-${course.code}.xlsx`); } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(false); }
  };
  if (q.isLoading) return <SkeletonRows />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const g = q.data!;
  const cols = g.assessments.length + g.activities.length;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-graphite">Evaluaciones: mejor porcentaje calificado. Actividades: nota de la última entrega calificada.</p>
        <Button variant="outline" icon={<Download className="size-4" />} loading={busy} onClick={exportXlsx}>Exportar Excel</Button>
      </div>
      {g.rows.length === 0 ? <EmptyState title="Aún no hay estudiantes inscritos" description="Las calificaciones aparecerán cuando haya inscripciones activas." /> : (
        <div className="overflow-x-auto border-t border-ink">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className="sticky left-0 z-10 min-w-[12rem] bg-paper px-3 py-3 text-left text-[0.75rem] font-semibold uppercase tracking-[0.06em] text-graphite">Estudiante</th>
                {g.assessments.map((a) => <th key={`a${a.id}`} scope="col" className="min-w-[8rem] px-3 py-3 text-right text-[0.75rem] font-semibold text-graphite"><span className="block normal-case">{a.title}</span><span className="block font-normal text-muted">Eval. · {a.weight}%</span></th>)}
                {g.activities.map((a) => <th key={`act${a.id}`} scope="col" className="min-w-[8rem] px-3 py-3 text-right text-[0.75rem] font-semibold text-graphite"><span className="block normal-case">{a.title}</span><span className="block font-normal text-muted">Act. · /{a.maxScore}</span></th>)}
                <th scope="col" className="px-3 py-3 text-right text-[0.75rem] font-semibold uppercase tracking-[0.06em] text-graphite">Progreso</th>
                <th scope="col" className="px-3 py-3 text-right text-[0.75rem] font-semibold uppercase tracking-[0.06em] text-graphite">Nota final</th>
              </tr>
            </thead>
            <tbody>
              {g.rows.map((r) => (
                <tr key={r.user.id} className="border-b border-line">
                  <th scope="row" className="sticky left-0 z-10 bg-paper px-3 py-2.5 text-left font-semibold">{fullName(r.user)}<span className="block text-xs font-normal text-muted">{r.user.email}</span></th>
                  {g.assessments.map((a) => { const v = r.cells[`a${a.id}`]; return <td key={a.id} className="px-3 py-2.5 text-right tnum">{v == null ? <span className="text-muted" aria-label="Sin calificación">—</span> : `${num(v, 1)} %`}</td>; })}
                  {g.activities.map((a) => { const v = r.cells[`act${a.id}`]; return <td key={a.id} className="px-3 py-2.5 text-right tnum">{v == null ? <span className="text-muted" aria-label="Sin calificación">—</span> : num(v, 1)}</td>; })}
                  <td className="min-w-[8rem] px-3 py-2.5"><ProgressRule value={r.progressPct} label={`Progreso de ${fullName(r.user)}`} /></td>
                  <td className="px-3 py-2.5 text-right font-bold tnum">{r.finalGrade == null ? '—' : num(r.finalGrade, 1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {cols === 0 && <p className="p-3 text-sm text-graphite">El curso no tiene evaluaciones ni actividades publicadas aún.</p>}
        </div>
      )}
    </div>
  );
}
