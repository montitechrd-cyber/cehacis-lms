import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Copy, Download, ShieldCheck } from 'lucide-react';
import { api, download, errorMessage } from '@/lib/api';
import { date, num } from '@/lib/format';
import { PageHeader } from '@/components/ui/Page';
import { EmptyState } from '@/components/ui/Feedback';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Tag } from '@/components/ui/Data';
import { Q } from '@/features/campus/shared';
import { TempleEmblem } from '@/components/brand/Emblem';

interface Cert {
  id: number;
  code: string;
  title: string;
  hours: number | null;
  finalGrade: number | null;
  status: 'VALID' | 'REVOKED';
  revokedReason: string | null;
  issuedAt: string;
  course: { id: number; title: string } | null;
}

export default function Certificates() {
  const q = useQuery({ queryKey: ['certificates', 'me'], queryFn: async () => (await api.get<{ data: Cert[] }>('/certificates/me')).data });
  const copy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(`${location.origin}/verificar/${code}`);
      toast.success('Enlace de verificación copiado');
    } catch {
      toast.error('No se pudo copiar el enlace');
    }
  };
  const pdf = async (c: Cert) => {
    try {
      await download(`/certificates/${c.id}/pdf`, `certificado-${c.code}.pdf`);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <div className="animate-rise">
      <PageHeader title="Certificados" description="Documentos emitidos al completar tus cursos. Cualquier persona puede verificar su autenticidad con el código." />
      <Q query={q}>
        {(list) =>
          list.length === 0 ? (
            <EmptyState title="Todavía no tienes certificados" description="Se emiten automáticamente al cumplir los requisitos de un curso: lecciones, evaluaciones y asistencia." action={<ButtonLink to="/campus/cursos" variant="ink">Ver mis cursos</ButtonLink>} />
          ) : (
            <ul className="border-t border-ink">
              {list.map((c) => (
                <li key={c.id} className="grid gap-x-8 gap-y-3 border-b border-line py-6 md:grid-cols-[auto_1fr_auto]">
                  <TempleEmblem className={c.status === 'VALID' ? 'w-12 text-orange' : 'w-12 text-line-strong'} title="Sello CEHACIS" />
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm text-graphite tnum">
                      <span className="font-semibold text-ink">{c.code}</span>
                      <Tag tone={c.status === 'VALID' ? 'success' : 'danger'}>{c.status === 'VALID' ? 'Vigente' : 'Revocado'}</Tag>
                    </p>
                    <h2 className="mt-1 text-2xl font-bold tracking-tight">{c.title}</h2>
                    {c.course && c.course.title !== c.title && <p className="text-graphite">{c.course.title}</p>}
                    <p className="mt-1 text-sm text-graphite tnum">
                      Emitido el {date(c.issuedAt)}
                      {c.hours != null && ` · ${num(c.hours)} horas`}
                      {c.finalGrade != null && ` · Nota final ${num(c.finalGrade, 1)}`}
                    </p>
                    {c.status === 'REVOKED' && c.revokedReason && <p className="mt-1 text-sm text-danger">Motivo: {c.revokedReason}</p>}
                  </div>
                  <div className="flex flex-wrap items-start gap-2 md:justify-end">
                    <Button variant="primary" size="sm" icon={<Download className="size-4" />} onClick={() => pdf(c)}>Descargar PDF</Button>
                    <Button variant="outline" size="sm" icon={<Copy className="size-4" />} onClick={() => copy(c.code)}>Copiar enlace de verificación</Button>
                    <ButtonLink to={`/verificar/${c.code}`} variant="ghost" size="sm" icon={<ShieldCheck className="size-4" />}>Verificar</ButtonLink>
                  </div>
                </li>
              ))}
            </ul>
          )
        }
      </Q>
    </div>
  );
}
