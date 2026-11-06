import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Lock } from 'lucide-react';
import { api } from '@/lib/api';
import { useAction } from '@/lib/hooks';
import { num, ROLES } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { Alert, ErrorState, PageLoader } from '@/components/ui/Feedback';
import { PageHeader } from '@/components/ui/Page';

interface Role { id: number; key: string; name: string; description: string | null; isSystem: boolean; editable: boolean; usersCount: number; permissions: string[] }
interface Module { module: string; permissions: { key: string; description: string }[] }

const MODULES: Record<string, string> = {
  users: 'Usuarios', roles: 'Roles', audit: 'Auditoría', settings: 'Configuración', courses: 'Cursos', students: 'Estudiantes', instructors: 'Facilitadores', competencies: 'Competencias',
  certificates: 'Certificados', calendar: 'Calendario', community: 'Comunidad', announcements: 'Anuncios', gamification: 'Gamificación', payments: 'Pagos', reports: 'Reportes', ai: 'Inteligencia artificial', learn: 'Aprendizaje',
};

export default function Roles() {
  const roles = useQuery({ queryKey: ['adm-roles'], queryFn: () => api.get<{ data: Role[] }>('/admin/roles') });
  const perms = useQuery({ queryKey: ['adm-perms'], queryFn: () => api.get<{ data: Module[] }>('/admin/permissions') });
  const [draft, setDraft] = useState<Record<number, Set<string>>>({});
  useEffect(() => {
    if (roles.data) setDraft(Object.fromEntries(roles.data.data.map((r) => [r.id, new Set(r.permissions)])));
  }, [roles.data]);
  const save = useAction((v: { id: number; keys: string[] }) => api.put(`/admin/roles/${v.id}/permissions`, { permissionKeys: v.keys }), { success: 'Permisos guardados', invalidate: [['adm-roles']] });

  if (roles.isLoading || perms.isLoading) return <PageLoader />;
  if (roles.isError || perms.isError || !roles.data || !perms.data) return <ErrorState error={roles.error ?? perms.error} onRetry={() => { roles.refetch(); perms.refetch(); }} />;

  const list = roles.data.data;
  const toggle = (id: number, key: string, on: boolean) => {
    const s = new Set(draft[id]);
    on ? s.add(key) : s.delete(key);
    setDraft({ ...draft, [id]: s });
  };
  const dirty = (r: Role) => {
    const d = draft[r.id];
    return !!d && (d.size !== r.permissions.length || r.permissions.some((p) => !d.has(p)));
  };

  return (
    <div>
      <PageHeader title="Roles y permisos" description="Marca qué puede hacer cada rol. Los cambios de un rol se aplican al guardar su columna." />
      <div className="mb-6"><Alert tone="info" title="El Superadministrador no se puede editar">Siempre tiene todos los permisos para evitar que la plataforma quede sin administración.</Alert></div>
      <div className="overflow-x-auto border-t border-ink">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-line align-bottom">
              <th scope="col" className="sticky left-0 z-10 bg-paper px-3 py-3 text-left text-[0.75rem] font-semibold uppercase tracking-[0.06em] text-graphite">Permiso</th>
              {list.map((r) => (
                <th key={r.id} scope="col" className="min-w-36 px-3 py-3 text-center align-bottom">
                  <p className="text-sm font-bold">{ROLES[r.key] ?? r.name}</p>
                  <p className="text-xs font-normal text-muted tnum">{num(r.usersCount)} {r.usersCount === 1 ? 'usuario' : 'usuarios'}</p>
                  {r.editable ? <Button size="sm" className="mt-2" variant={dirty(r) ? 'primary' : 'outline'} disabled={!dirty(r)} loading={save.isPending && save.variables?.id === r.id} onClick={() => save.mutate({ id: r.id, keys: [...(draft[r.id] ?? [])] })}>Guardar</Button>
                    : <p className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-graphite"><Lock className="size-3" aria-hidden />Fijo</p>}
                </th>
              ))}
            </tr>
          </thead>
          {perms.data.data.map((m) => (
            <tbody key={m.module}>
              <tr className="bg-stone"><th scope="rowgroup" colSpan={list.length + 1} className="sticky left-0 px-3 py-2 text-left text-xs font-bold uppercase tracking-[0.06em]">{MODULES[m.module] ?? m.module}</th></tr>
              {m.permissions.map((p) => (
                <tr key={p.key} className="border-b border-line">
                  <th scope="row" className="sticky left-0 z-10 bg-paper px-3 py-2.5 text-left font-normal"><span className="block">{p.description}</span><span className="font-mono text-[0.6875rem] text-muted">{p.key}</span></th>
                  {list.map((r) => {
                    const checked = r.editable ? !!draft[r.id]?.has(p.key) : true;
                    return (
                      <td key={r.id} className="px-3 py-2.5 text-center">
                        <input type="checkbox" className="size-4 accent-ink" checked={checked} disabled={!r.editable} onChange={(e) => toggle(r.id, p.key, e.target.checked)} aria-label={`${p.description} para ${ROLES[r.key] ?? r.name}`} />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>
    </div>
  );
}
