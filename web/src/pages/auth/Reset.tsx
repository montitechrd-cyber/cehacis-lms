import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { api, ApiError, errorMessage } from '@/lib/api';
import { useBrand } from '@/lib/brand';
import { Alert } from '@/components/ui/Feedback';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Input } from '@/components/ui/Form';
import { StatusMark } from '@/components/ui/StepRow';
import { usePageTitle } from '@/features/public/data';
import { AuthSplit } from '@/features/public/parts';

export default function Reset() {
  usePageTitle('Nueva contraseña');
  const brand = useBrand();
  const [sp] = useSearchParams();
  const token = sp.get('token') ?? '';
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const rules = [
    { ok: pw.length >= 8, label: '8 caracteres o más' },
    { ok: /[A-Za-z]/.test(pw), label: 'Al menos una letra' },
    { ok: /\d/.test(pw), label: 'Al menos un número' },
  ];

  async function submit(e: FormEvent) {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!rules.every((r) => r.ok)) er.password = 'La contraseña no cumple los requisitos';
    if (pw !== pw2) er.confirm = 'Las contraseñas no coinciden';
    setErrors(er);
    setErr(null);
    if (Object.keys(er).length) return;
    setBusy(true);
    try {
      await api.post('/auth/reset-password', { token, password: pw });
      setDone(true);
    } catch (e2) {
      if (e2 instanceof ApiError && e2.fieldErrors.password) setErrors({ password: e2.fieldErrors.password });
      setErr(errorMessage(e2));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthSplit title="Nueva contraseña" lead="Elige una contraseña segura para tu cuenta." tagline={brand.tagline}>
      {!token ? (
        <div className="space-y-5">
          <Alert tone="danger" title="Enlace incompleto">Falta el código de restablecimiento. Solicita un enlace nuevo.</Alert>
          <ButtonLink to="/recuperar" variant="primary">Solicitar enlace</ButtonLink>
        </div>
      ) : done ? (
        <div className="space-y-5">
          <Alert tone="success" title="Contraseña actualizada">Ya puedes iniciar sesión con tu nueva contraseña.</Alert>
          <ButtonLink to="/ingresar" variant="primary" size="lg">Ir a iniciar sesión</ButtonLink>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="space-y-5">
          {err && <Alert tone="danger" title="No se pudo cambiar la contraseña">{err} <Link to="/recuperar" className="font-semibold underline">Solicitar otro enlace</Link></Alert>}
          <div>
            <Input label="Nueva contraseña" type="password" required autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} error={errors.password} />
            <ul className="mt-2 space-y-1 text-xs text-graphite" aria-label="Requisitos de la contraseña">
              {rules.map((r) => (
                <li key={r.label} className="flex items-center gap-2">
                  <StatusMark status={r.ok ? 'completed' : 'available'} size={12} />
                  {r.label}
                </li>
              ))}
            </ul>
          </div>
          <Input label="Repite la contraseña" type="password" required autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} error={errors.confirm} />
          <Button type="submit" variant="primary" size="lg" className="w-full" loading={busy}>Guardar contraseña</Button>
        </form>
      )}
    </AuthSplit>
  );
}
