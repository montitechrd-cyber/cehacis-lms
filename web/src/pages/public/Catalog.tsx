import { Link } from 'react-router';
import { ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { SearchInput, Pagination } from '@/components/ui/Data';
import { Checkbox, Select } from '@/components/ui/Form';
import { ErrorState } from '@/components/ui/Feedback';
import { useTableParams } from '@/lib/hooks';
import { LEVELS, MODALITIES, courseNumber } from '@/lib/format';
import { useCategories, useCourses, usePageTitle } from '@/features/public/data';
import { Wrap } from '@/features/public/parts';
import { CourseCardView } from '@/features/public/CourseCardView';

// Múltiplo de 3 para que la rejilla de tarjetas cierre en filas completas.
const PAGE_SIZE = 9;
const FILTERS = ['q', 'categoryId', 'level', 'modality', 'free'] as const;
// Controles del catálogo con el radio y la altura del portal (8px, 44px).
const FIELD = '[&_input]:h-11 [&_input]:rounded-lg [&_select]:h-11 [&_select]:rounded-lg';

export default function Catalog() {
  usePageTitle('Cursos');
  const t = useTableParams();
  const cats = useCategories();
  const q = useCourses({
    q: t.get('q'),
    categoryId: t.get('categoryId'),
    level: t.get('level'),
    modality: t.get('modality'),
    free: t.get('free') === 'true' ? 'true' : undefined,
    sort: t.get('sort') || undefined,
    page: t.page,
    pageSize: PAGE_SIZE,
  });
  const filtered = FILTERS.some((k) => t.get(k));
  const clear = () => t.set({ q: null, categoryId: null, level: null, modality: null, free: null });
  // Sin orden elegido, los cursos se leen por su número de serie (CEH-001, 002…).
  const rows = t.get('sort') ? (q.data?.data ?? []) : [...(q.data?.data ?? [])].sort((a, b) => (courseNumber(a.code) ?? 999) - (courseNumber(b.code) ?? 999));
  const meta = q.data?.meta;

  return (
    <>
      {/* Encabezado: ruta, título, entradilla y buscador */}
      <header className="border-b border-hairline bg-sand">
        <Wrap className="py-8 sm:py-10 lg:py-14">
          <nav aria-label="Ruta de navegación">
            <ol className="flex items-center gap-1.5 text-sm text-muted">
              <li>
                <Link to="/" className="text-graphite no-underline hover:text-ink hover:underline">Inicio</Link>
              </li>
              <ChevronRight className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
              <li aria-current="page" className="text-ink">Cursos</li>
            </ol>
          </nav>
          <div className="mt-6 grid gap-6 lg:grid-cols-12 lg:items-end lg:gap-14">
            <div className="animate-rise lg:col-span-7">
              <h1 className="text-[clamp(2.25rem,1.55rem+2.3vw,3.75rem)] font-extrabold leading-[1.02] tracking-[-0.035em]">Cursos</h1>
              <p className="mt-4 max-w-2xl text-xl leading-snug text-graphite">
                Formación online para hablar en público, comunicarte con asertividad y manejar conflictos. Cada curso tiene práctica guiada y certificado verificable.
              </p>
            </div>
            <SearchInput
              className="lg:col-span-5 [&_input]:h-14 [&_input]:rounded-xl [&_input]:border-hairline [&_input]:pl-11 [&_input]:text-base [&_input]:shadow-lift [&_svg]:left-4 [&_svg]:size-5"
              value={t.get('q')}
              onChange={(v) => t.set({ q: v })}
              placeholder="Buscar por tema o curso"
            />
          </div>
        </Wrap>
      </header>

      <Wrap className="py-8 lg:py-12">
        {/* Filtros */}
        <div className="grid grid-cols-2 gap-3 rounded-xl border border-hairline p-4 lg:grid-cols-12 lg:items-end lg:p-5">
          <Select
            wrapperClassName={`col-span-2 lg:col-span-3 ${FIELD}`}
            label="Categoría"
            placeholder="Todas"
            value={t.get('categoryId')}
            onChange={(e) => t.set({ categoryId: e.target.value })}
            options={(cats.data ?? []).map((c) => ({ value: c.id, label: c.name }))}
          />
          <Select
            wrapperClassName={`lg:col-span-3 ${FIELD}`}
            label="Nivel"
            placeholder="Todos"
            value={t.get('level')}
            onChange={(e) => t.set({ level: e.target.value })}
            options={Object.entries(LEVELS).map(([value, label]) => ({ value, label }))}
          />
          <Select
            wrapperClassName={`lg:col-span-3 ${FIELD}`}
            label="Modalidad"
            placeholder="Todas"
            value={t.get('modality')}
            onChange={(e) => t.set({ modality: e.target.value })}
            options={Object.entries(MODALITIES).map(([value, label]) => ({ value, label }))}
          />
          <div className="col-span-2 flex h-11 items-center lg:col-span-3">
            <Checkbox label="Solo gratuitos" checked={t.get('free') === 'true'} onChange={(e) => t.set({ free: e.target.checked ? 'true' : null })} />
          </div>
        </div>

        <div className="mt-8 flex min-h-9 flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold tnum" aria-live="polite">
            {meta ? `${meta.total} ${meta.total === 1 ? 'curso' : 'cursos'}${filtered ? ' encontrados' : ''}` : ' '}
          </p>
          {filtered && (
            <button type="button" onClick={clear} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold text-orange-strong hover:bg-orange-tint">
              <X className="size-4" strokeWidth={2} aria-hidden /> Limpiar filtros
            </button>
          )}
        </div>

        {q.isLoading ? (
          <ul className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-busy>
            {Array.from({ length: 3 }).map((_, i) => (
              <li key={i} className="overflow-hidden rounded-xl border border-hairline">
                <div className="aspect-[16/9] animate-pulse bg-sand" />
                <div className="space-y-3 p-6">
                  <div className="h-5 w-3/4 animate-pulse rounded-full bg-sand" />
                  <div className="h-4 w-full animate-pulse rounded-full bg-sand" />
                  <div className="h-4 w-1/2 animate-pulse rounded-full bg-sand" />
                </div>
              </li>
            ))}
          </ul>
        ) : q.isError ? (
          <ErrorState error={q.error} onRetry={() => q.refetch()} />
        ) : rows.length === 0 ? (
          <div className="mt-4 rounded-xl bg-sand px-6 py-12 text-center">
            <p className="text-xl font-bold">{filtered ? 'Ningún curso coincide con tu búsqueda.' : 'Aún no hay cursos publicados.'}</p>
            <p className="mt-2 text-graphite">{filtered ? 'Prueba con otros filtros o con otra palabra.' : 'Muy pronto publicaremos los primeros cursos.'}</p>
            {filtered && (
              <Button variant="outline" className="mt-6 rounded-lg! border-line-strong! bg-paper! hover:bg-paper!" onClick={clear}>
                Quitar filtros
              </Button>
            )}
          </div>
        ) : (
          <ul className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((c) => (
              <CourseCardView key={c.id} course={c} />
            ))}
          </ul>
        )}
        {meta && meta.pages > 1 && (
          <div className="mt-10">
            <Pagination page={meta.page} pages={meta.pages} total={meta.total} onPage={(p) => t.set({ page: p }, false)} />
          </div>
        )}
      </Wrap>
    </>
  );
}
