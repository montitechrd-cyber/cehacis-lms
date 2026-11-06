import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import { ApiError, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useBrand } from '@/lib/brand';
import { Alert } from '@/components/ui/Feedback';
import { Button } from '@/components/ui/Button';
import { Checkbox, Input } from '@/components/ui/Form';
import { StatusMark } from '@/components/ui/StepRow';
import { usePageTitle } from '@/features/public/data';
import { AuthSplit, safeNext } from '@/features/public/parts';

export default function Register() {
  usePageTitle('Crear cuenta');
  const brand = useBrand();
  const { user, register } = useAuth();
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const next = safeNext(sp.get('next')) ?? '/campus';
  const [f, setF] = useState({ firstName: '', lastName: '', email: '', phone: '', password: '' });
  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((s) => ({ ...s, [k]: e.target.value }));

  if (user) return <Navigate to={next} replace />;

  const rules = [
    { ok: f.password.length >= 8, label: '8 caracteres o más' },
    { ok: /[A-Za-z]/.test(f.password), label: 'Al menos una letra' },
    { ok: /\d/.test(f.password), label: 'Al menos un número' },
  ];

  async function submit(e: FormEvent) {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (f.firstName.trim().length < 2) er.firstName = 'Escribe tu nombre';
    if (f.lastName.trim().length < 2) er.lastName = 'Escribe tu apellido';
    if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) er.email = 'Escribe un correo válido';
    if (!rules.every((r) => r.ok)) er.password = 'La contraseña no cumple los requisitos';
    if (!terms) er.acceptTerms = 'Debes aceptar los términos';
    setErrors(er);
    setError(null);
    if (Object.keys(er).length) return;
    setBusy(true);
    try {
      await register({ ...f, email: f.email.trim(), phone: f.phone.trim(), acceptTerms: true });
      nav(next, { replace: true });
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length) setErrors(err.fieldErrors);
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthSplit title="Crear cuenta" lead="Empieza tu entrenamiento en habilidades comunicativas." tagline={brand.tagline}>
      <form onSubmit={submit} noValidate className="space-y-5">
        {error && <Alert tone="danger" title="No pudimos crear tu cuenta">{error}</Alert>}
        <div className="grid gap-5 sm:grid-cols-2">
          <Input label="Nombre" required autoComplete="given-name" value={f.firstName} onChange={set('firstName')} error={errors.firstName} />
          <Input label="Apellido" required autoComplete="family-name" value={f.lastName} onChange={set('lastName')} error={errors.lastName} />
        </div>
        <Input label="Correo" type="email" required autoComplete="email" value={f.email} onChange={set('email')} error={errors.email} />
        <Input label="Teléfono (opcional)" type="tel" autoComplete="tel" value={f.phone} onChange={set('phone')} error={errors.phone} />
        <div>
          <Input label="Contraseña" type="password" required autoComplete="new-password" value={f.password} onChange={set('password')} error={errors.password} />
          <ul className="mt-2 space-y-1 text-xs text-graphite" aria-label="Requisitos de la contraseña">
            {rules.map((r) => (
              <li key={r.label} className="flex items-center gap-2">
                <StatusMark status={r.ok ? 'completed' : 'available'} size={12} />
                {r.label}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <Checkbox checked={terms} onChange={(e) => setTerms(e.target.checked)} label="Acepto los términos y la política de privacidad" />
          {errors.acceptTerms && <p className="mt-1 text-xs font-semibold text-danger">{errors.acceptTerms}</p>}
        </div>
        <Button type="submit" variant="primary" size="lg" className="w-full" loading={busy}>
          Crear cuenta
        </Button>
        <p className="border-t border-line pt-5 text-sm text-graphite">
          ¿Ya tienes cuenta? <Link to="/ingresar" className="font-semibold text-ink underline underline-offset-4">Iniciar sesión</Link>
        </p>
      </form>
    </AuthSplit>
  );
}
