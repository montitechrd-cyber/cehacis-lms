import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { api, errorMessage } from '@/lib/api';
import { useBrand } from '@/lib/brand';
import { Alert } from '@/components/ui/Feedback';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Form';
import { usePageTitle } from '@/features/public/data';
import { AuthSplit } from '@/features/public/parts';

export default function Forgot() {
  usePageTitle('Recuperar contraseña');
  const brand = useBrand();
  const [email, setEmail] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [fieldErr, setFieldErr] = useState<string | undefined>();
  const [done, setDone] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setFieldErr('Escribe un correo válido');
    setFieldErr(undefined);
    setBusy(true);
    try {
      const r = await api.post<{ message: string }>('/auth/forgot-password', { email: email.trim() });
      setDone(r.message);
    } catch (e2) {
      setErr(errorMessage(e2));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthSplit title="Recuperar contraseña" lead="Escribe tu correo y te enviaremos un enlace para crear una nueva." tagline={brand.tagline}>
      {done ? (
        <div className="space-y-5">
          <Alert tone="success" title="Revisa tu correo">{done}</Alert>
          <Link to="/ingresar" className="inline-block font-semibold text-ink underline underline-offset-4">Volver a iniciar sesión</Link>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="space-y-5">
          {err && <Alert tone="danger" title="No se pudo enviar">{err}</Alert>}
          <Input label="Correo" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={fieldErr} />
          <Button type="submit" variant="primary" size="lg" className="w-full" loading={busy}>Enviar enlace</Button>
          <p className="text-sm"><Link to="/ingresar" className="font-semibold text-ink underline underline-offset-4">Volver a iniciar sesión</Link></p>
        </form>
      )}
    </AuthSplit>
  );
}
