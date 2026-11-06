import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import { ApiError, errorMessage } from '@/lib/api';
import { homeFor, useAuth } from '@/lib/auth';
import { useBrand } from '@/lib/brand';
import { Alert } from '@/components/ui/Feedback';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Form';
import { usePageTitle } from '@/features/public/data';
import { AuthSplit, safeNext } from '@/features/public/parts';

export default function Login() {
  usePageTitle('Iniciar sesión');
  const brand = useBrand();
  const { user, login } = useAuth();
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const next = safeNext(sp.get('next'));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={next ?? homeFor(user)} replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) er.email = 'Escribe un correo válido';
    if (!password) er.password = 'Escribe tu contraseña';
    setErrors(er);
    setError(null);
    if (Object.keys(er).length) return;
    setBusy(true);
    try {
      const u = await login(email.trim(), password);
      nav(next ?? homeFor(u), { replace: true });
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length) setErrors(err.fieldErrors);
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthSplit title="Iniciar sesión" lead="Accede a tu campus virtual." tagline={brand.tagline}>
      <form onSubmit={submit} noValidate className="space-y-5">
        {error && <Alert tone="danger" title="No pudimos iniciar tu sesión">{error}</Alert>}
        <Input label="Correo" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} />
        <Input label="Contraseña" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} />
        <Button type="submit" variant="primary" size="lg" className="w-full" loading={busy}>
          Ingresar
        </Button>
        <p className="text-sm">
          <Link to="/recuperar" className="font-semibold text-ink underline underline-offset-4">¿Olvidaste tu contraseña?</Link>
        </p>
        <p className="border-t border-line pt-5 text-sm text-graphite">
          ¿Aún no tienes cuenta?{' '}
          <Link to={next ? `/registro?next=${encodeURIComponent(next)}` : '/registro'} className="font-semibold text-ink underline underline-offset-4">Crear cuenta</Link>
        </p>
      </form>
    </AuthSplit>
  );
}
