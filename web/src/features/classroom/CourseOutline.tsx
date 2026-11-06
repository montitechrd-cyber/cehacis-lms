import { Link } from 'react-router';
import clsx from 'clsx';
import { StatusMark } from '@/components/ui/StepRow';
import { Tag } from '@/components/ui/Data';
import { RESOURCE_TYPES, moduleSerial } from '@/lib/format';
import type { Outline } from './types';

/** Índice del curso: módulos numerados y lecciones con StatusMark por forma. */
export function CourseOutline({ outline, currentId, detailed, onNavigate }: { outline: Outline; currentId?: number | null; detailed?: boolean; onNavigate?: () => void }) {
  return (
    <ol className="space-y-6">
      {outline.modules.map((m, mi) => (
        <li key={m.id}>
          <div className="flex items-baseline gap-3 border-b border-ink pb-1.5">
            <span className="text-xs font-semibold whitespace-nowrap text-graphite tnum">{moduleSerial(mi)}</span>
            <h3 className="text-sm font-bold leading-snug">{m.title}</h3>
          </div>
          <ul className="divide-y divide-line">
            {m.lessons.map((l, i) => {
              const cur = l.id === currentId;
              const locked = l.status === 'locked';
              const inner = (
                <>
                  <span className="mt-0.5"><StatusMark status={l.status} current={cur} /></span>
                  <span className="min-w-0 flex-1">
                    <span className={clsx('block text-sm leading-snug', cur ? 'font-bold' : 'font-medium', locked && 'text-muted')}>
                      <span className="mr-1.5 text-muted tnum">{i + 1}.</span>
                      {l.title}
                    </span>
                    {locked && l.lockReason && <span className="mt-0.5 block text-xs text-muted">{l.lockReason}</span>}
                    {detailed && (
                      <span className="mt-1 flex flex-wrap items-center gap-1.5">
                        {l.durationMin ? <span className="text-xs text-muted tnum">{l.durationMin} min</span> : null}
                        {[...new Set(l.resourceTypes)].map((t) => (
                          <Tag key={t} tone="outline">{RESOURCE_TYPES[t] ?? t}</Tag>
                        ))}
                      </span>
                    )}
                  </span>
                </>
              );
              return (
                <li key={l.id} className={clsx(cur && 'bg-stone')}>
                  {locked ? (
                    <div className="flex gap-3 px-2 py-2.5" aria-disabled="true">{inner}</div>
                  ) : (
                    <Link to={`/campus/leccion/${l.id}`} onClick={onNavigate} aria-current={cur ? 'page' : undefined} className="flex gap-3 px-2 py-2.5 no-underline hover:bg-stone">
                      {inner}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </li>
      ))}
    </ol>
  );
}
