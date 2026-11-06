import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ATTENDANCE, EVENT_TYPES, dateTime, fullName } from '@/lib/format';
import { EmptyState, ErrorState, SkeletonRows } from '@/components/ui/Feedback';
import { ButtonLink } from '@/components/ui/Button';
import type { CourseFull } from './shared';

interface Att {
  events: { id: number; title: string; type: string; startAt: string; groupId: number | null }[];
  students: { user: { id: number; firstName: string; lastName: string; email: string }; enrollmentId: number; cells: (string | null)[]; summary: { present: number; late: number; absent: number; excused: number; pct: number | null } }[];
}

const MARK: Record<string, string> = { PRESENT: 'P', LATE: 'T', ABSENT: 'A', EXCUSED: 'J' };
/** Marca por FORMA (no por color): presente = relleno, tarde = mitad, ausente = tachado, justificado = trazo cortado. */
const TONE: Record<string, string> = {
  PRESENT: 'bg-ink text-paper',
  LATE: 'border border-ink text-ink',
  ABSENT: 'border border-danger text-danger line-through',
  EXCUSED: 'border border-dashed border-graphite text-graphite',
};

export default function TabAsistencia({ course }: { course: CourseFull }) {
  const q = useQuery({ queryKey: ['attendance', course.id], queryFn: () => api.get<Att>(`/calendar/attendance/course/${course.id}`) });
  if (q.isLoading) return <SkeletonRows />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const a = q.data!;
  if (a.events.length === 0)
    return <EmptyState title="Aún no hay sesiones pasadas" description="La asistencia se registra por evento del calendario. Crea eventos de clase para este curso y regístrala cuando ocurran." action={<ButtonLink to="/panel/calendario" variant="primary">Ir al calendario</ButtonLink>} />;

  return (
    <div>
      <p className="mb-3 text-sm text-graphite">P presente · T tarde · A ausente · J justificado · — sin registro · · no aplica al grupo. Pulsa el nombre de una sesión para registrar asistencia.</p>
      {a.students.length === 0 ? <EmptyState title="No hay estudiantes inscritos" /> : (
        <div className="overflow-x-auto border-t border-ink">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className="sticky left-0 z-10 min-w-[12rem] bg-paper px-3 py-3 text-left text-[0.75rem] font-semibold uppercase tracking-[0.06em] text-graphite">Estudiante</th>
                {a.events.map((e) => (
                  <th key={e.id} scope="col" className="min-w-[7rem] px-2 py-3 text-center text-[0.75rem] font-semibold text-graphite">
                    <Link to={`/panel/asistencia/${e.id}`} className="block normal-case hover:text-ink hover:underline" title={`${EVENT_TYPES[e.type] ?? e.type} · ${dateTime(e.startAt)}`}>{e.title}</Link>
                    <span className="block font-normal text-muted">{dateTime(e.startAt)}</span>
                  </th>
                ))}
                <th scope="col" className="px-3 py-3 text-right text-[0.75rem] font-semibold uppercase tracking-[0.06em] text-graphite">Asistencia</th>
              </tr>
            </thead>
            <tbody>
              {a.students.map((s) => (
                <tr key={s.enrollmentId} className="border-b border-line">
                  <th scope="row" className="sticky left-0 z-10 bg-paper px-3 py-2.5 text-left font-semibold">{fullName(s.user)}</th>
                  {s.cells.map((c, i) => (
                    <td key={i} className="px-2 py-2.5 text-center">
                      {c === 'NA' ? <span className="text-muted" aria-label="No aplica">·</span> : c ? <span className={`inline-flex size-6 items-center justify-center rounded-xs text-xs font-bold ${TONE[c] ?? ''}`} title={ATTENDANCE[c]}><span className="sr-only">{ATTENDANCE[c]}</span><span aria-hidden>{MARK[c]}</span></span> : <span className="text-muted" aria-label="Sin registro">—</span>}
                    </td>
                  ))}
                  <td className="px-3 py-2.5 text-right font-bold tnum">{s.summary.pct == null ? '—' : `${s.summary.pct} %`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
