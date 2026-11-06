import { useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Facts } from '@/components/ui/Data';
import { ErrorState, PageLoader } from '@/components/ui/Feedback';
import { Input } from '@/components/ui/Form';
import { date } from '@/lib/format';
import { usePageTitle } from '@/features/public/data';
import { Masthead, Wrap } from '@/features/public/parts';
import { TempleEmblem } from '@/components/brand/Emblem';

interface Res {
  valid: boolean;
  status?: 'VALID' | 'REVOKED';
  code?: string;
  recipientName?: string;
  title?: string;
  hours?: number | null;
  issuedAt?: string;
  institution?: string;
}

export default function Verify() {
  usePageTitle('Verificar certificado');
  const { code } = useParams();
  const nav = useNavigate();
  const [val, setVal] = useState(code ?? '');

  const q = useQuery({
    queryKey: ['verify', code],
    enabled: !!code,
    retry: false,
    queryFn: async (): Promise<Res | null> => {
      try {
        return await api.get<Res>(`/certificates/verify/${encodeURIComponent(code!)}`);
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) return null;
        throw e;
      }
    },
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    if (val.trim()) nav(`/verificar/${encodeURIComponent(val.trim().toUpperCase())}`);
  }

  const r = q.data;
  return (
    <>
      <Masthead title="Verificar certificado" lead="Escribe el código impreso en el certificado o escanea su QR." />
      <Wrap className="py-10">
        <form onSubmit={submit} className="flex max-w-xl flex-col gap-3 sm:flex-row sm:items-end">
          <Input wrapperClassName="flex-1" label="Código del certificado" placeholder="CEH-2026-ABC234" value={val} onChange={(e) => setVal(e.target.value)} />
          <Button type="submit" variant="ink" disabled={!val.trim()}>Verificar</Button>
        </form>

        {code && (
          <div className="mt-10" aria-live="polite">
            {q.isLoading ? (
              <PageLoader label="Verificando…" />
            ) : q.isError ? (
              <ErrorState error={q.error} onRetry={() => q.refetch()} />
            ) : r === null || !r ? (
              <div className="border-t-4 border-danger py-6">
                <h2 className="text-title font-bold">Código no encontrado</h2>
                <p className="mt-2 max-w-lg text-graphite">No existe un certificado con el código «{code}». Revisa que esté bien escrito.</p>
              </div>
            ) : r.status === 'REVOKED' || !r.valid ? (
              <div className="border-t-4 border-danger py-6">
                <h2 className="text-title font-bold">Certificado revocado</h2>
                <p className="mt-2 max-w-lg text-graphite">Este certificado fue emitido pero ya no es válido.</p>
                <Details r={r} />
              </div>
            ) : (
              <div className="bg-orange p-6 sm:p-10">
                <TempleEmblem className="mb-6 w-20 text-ink sm:w-24" detail="var(--color-orange)" title="Sello CEHACIS" />
                <h2 className="text-display font-extrabold">Certificado válido</h2>
                <p className="mt-4 text-2xl font-bold tracking-tight">{r.recipientName}</p>
                <Details r={r} />
              </div>
            )}
          </div>
        )}
      </Wrap>
    </>
  );
}

function Details({ r }: { r: Res }) {
  return (
    <div className="mt-6 max-w-xl bg-paper p-4">
      <Facts
        items={[
          { label: 'Titular', value: r.recipientName ?? '—' },
          { label: 'Curso', value: r.title ?? '—' },
          { label: 'Horas', value: r.hours ? `${r.hours} h` : '—' },
          { label: 'Emitido', value: date(r.issuedAt) },
          { label: 'Institución', value: r.institution ?? '—' },
          { label: 'Código', value: r.code ?? '—' },
        ]}
      />
    </div>
  );
}
