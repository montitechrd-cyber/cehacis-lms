import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Camera, Check, Circle } from 'lucide-react';
import { api, ApiError, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useAction } from '@/lib/hooks';
import { PageHeader, Section } from '@/components/ui/Page';
import { Alert } from '@/components/ui/Feedback';
import { Button } from '@/components/ui/Button';
import { FormActions, Input, Textarea } from '@/components/ui/Form';
import { Avatar } from '@/components/ui/Data';

interface StudentProfile {
  documentId: string | null;
  birthDate: string | null;
  occupation: string | null;
  city: string | null;
  country: string | null;
  bio: string | null;
}

function Personal() {
  const { user, refresh } = useAuth();
  const [first, setFirst] = useState(user?.firstName ?? '');
  const [last, setLast] = useState(user?.lastName ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const file = useRef<HTMLInputElement>(null);

  const save = async (avatarUrl: string | null | undefined, ok: string) => {
    setErrors({});
    try {
      await api.patch('/auth/me', { firstName: first.trim(), lastName: last.trim(), phone: phone.trim() || null, avatarUrl: avatarUrl === undefined ? user?.avatarUrl ?? null : avatarUrl });
      await refresh();
      toast.success(ok);
    } catch (e) {
      if (e instanceof ApiError && Object.keys(e.fieldErrors).length) setErrors(e.fieldErrors);
      else toast.error(errorMessage(e));
    }
  };
  const [saving, setSaving] = useState(false);

  const upload = async (f: File | undefined) => {
    if (!f) return;
    if (!/^image\/(png|jpe?g|webp|gif)$/.test(f.type)) return void toast.error('Elige una imagen PNG, JPG, WEBP o GIF');
    if (f.size > 5 * 1024 * 1024) return void toast.error('La imagen no debe superar 5 MB');
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('avatar', f);
      await api.upload('/auth/me/avatar', fd);
      await refresh();
      toast.success('Foto actualizada');
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setUploading(false);
      if (file.current) file.current.value = '';
    }
  };

  return (
    <Section title="Datos personales">
      <div className="mb-6 flex items-center gap-5">
        <Avatar user={user} size={80} />
        <div className="flex flex-wrap gap-2">
          <input ref={file} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only" id="avatar-file" onChange={(e) => upload(e.target.files?.[0])} />
          <Button variant="outline" size="sm" icon={<Camera className="size-4" />} loading={uploading} onClick={() => file.current?.click()}>Cambiar foto</Button>
          {user?.avatarUrl && <Button variant="ghost" size="sm" disabled={uploading} onClick={() => save(null, 'Foto eliminada')}>Quitar foto</Button>}
        </div>
      </div>
      <form
        className="grid max-w-2xl gap-4 sm:grid-cols-2"
        onSubmit={async (e) => {
          e.preventDefault();
          setSaving(true);
          await save(undefined, 'Datos guardados');
          setSaving(false);
        }}
      >
        <Input label="Nombre" required value={first} onChange={(e) => setFirst(e.target.value)} error={errors.firstName} autoComplete="given-name" />
        <Input label="Apellido" required value={last} onChange={(e) => setLast(e.target.value)} error={errors.lastName} autoComplete="family-name" />
        <Input label="Correo electrónico" value={user?.email ?? ''} disabled hint="Para cambiarlo, contacta a la administración." wrapperClassName="sm:col-span-2" />
        <Input label="Teléfono" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} error={errors.phone} autoComplete="tel" wrapperClassName="sm:col-span-2" />
        <FormActions className="sm:col-span-2"><Button type="submit" variant="primary" loading={saving}>Guardar datos</Button></FormActions>
      </form>
    </Section>
  );
}

function StudentSection() {
  const q = useQuery({ queryKey: ['people', 'me', 'profile'], queryFn: async () => (await api.get<{ data: StudentProfile }>('/people/me/profile')).data });
  const [f, setF] = useState<StudentProfile | null>(null);
  useEffect(() => {
    if (q.data) setF({ ...q.data, birthDate: q.data.birthDate ? q.data.birthDate.slice(0, 10) : null });
  }, [q.data]);
  const save = useAction(
    () => api.patch('/people/me/profile', { documentId: f!.documentId || null, birthDate: f!.birthDate || null, occupation: f!.occupation || null, city: f!.city || null, country: f!.country || null, bio: f!.bio || null }),
    { success: 'Perfil guardado', invalidate: [['people', 'me', 'profile']] },
  );
  const set = (k: keyof StudentProfile) => (v: string) => setF((p) => (p ? { ...p, [k]: v } : p));
  if (q.isError) return <Section title="Perfil de estudiante"><Alert tone="danger">No se pudo cargar tu perfil de estudiante.</Alert></Section>;
  if (!f) return <Section title="Perfil de estudiante"><p className="text-sm text-graphite">Cargando…</p></Section>;
  return (
    <Section title="Perfil de estudiante" description="Esta información ayuda a tus facilitadores a conocerte.">
      <form className="grid max-w-2xl gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        <Input label="Documento de identidad" value={f.documentId ?? ''} onChange={(e) => set('documentId')(e.target.value)} />
        <Input label="Fecha de nacimiento" type="date" value={f.birthDate ?? ''} onChange={(e) => set('birthDate')(e.target.value)} />
        <Input label="Ocupación" value={f.occupation ?? ''} onChange={(e) => set('occupation')(e.target.value)} />
        <Input label="Ciudad" value={f.city ?? ''} onChange={(e) => set('city')(e.target.value)} />
        <Input label="País" value={f.country ?? ''} onChange={(e) => set('country')(e.target.value)} />
        <Textarea label="Sobre mí" rows={4} value={f.bio ?? ''} onChange={(e) => set('bio')(e.target.value)} wrapperClassName="sm:col-span-2" />
        <FormActions className="sm:col-span-2"><Button type="submit" variant="primary" loading={save.isPending}>Guardar perfil</Button></FormActions>
      </form>
    </Section>
  );
}

function Password() {
  const { refresh } = useAuth();
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [error, setError] = useState<string | null>(null);
  const rules = [
    { ok: next.length >= 8, label: 'Mínimo 8 caracteres' },
    { ok: /[A-Za-z]/.test(next), label: 'Al menos una letra' },
    { ok: /\d/.test(next), label: 'Al menos un número' },
    { ok: next.length > 0 && next === again, label: 'Las dos contraseñas coinciden' },
  ];
  const valid = !!cur && rules.every((r) => r.ok);
  const change = useAction(() => api.post('/auth/change-password', { currentPassword: cur, newPassword: next }), {
    success: 'Contraseña actualizada',
    silentError: true,
    onSuccess: () => { setCur(''); setNext(''); setAgain(''); setError(null); void refresh(); },
  });
  return (
    <Section title="Cambiar contraseña">
      <form
        className="max-w-md space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          try { await change.mutateAsync(); } catch (err) { setError(errorMessage(err)); }
        }}
      >
        {error && <Alert tone="danger">{error}</Alert>}
        <Input label="Contraseña actual" type="password" required value={cur} onChange={(e) => setCur(e.target.value)} autoComplete="current-password" />
        <Input label="Nueva contraseña" type="password" required value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
        <Input label="Repite la nueva contraseña" type="password" required value={again} onChange={(e) => setAgain(e.target.value)} autoComplete="new-password" />
        <ul className="space-y-1 text-sm" aria-label="Requisitos de la contraseña">
          {rules.map((r) => (
            <li key={r.label} className={r.ok ? 'flex items-center gap-2 font-medium text-ink' : 'flex items-center gap-2 text-graphite'}>
              {r.ok ? <Check className="size-4" aria-hidden /> : <Circle className="size-4" aria-hidden />}
              {r.label}
              <span className="sr-only">{r.ok ? ' (cumplido)' : ' (pendiente)'}</span>
            </li>
          ))}
        </ul>
        <FormActions><Button type="submit" variant="primary" loading={change.isPending} disabled={!valid}>Cambiar contraseña</Button></FormActions>
      </form>
    </Section>
  );
}

export default function Profile() {
  const { user } = useAuth();
  return (
    <div className="animate-rise">
      <PageHeader title="Mi perfil" description="Tus datos, tu foto y la seguridad de tu cuenta." />
      <Personal />
      {user?.role === 'STUDENT' && <StudentSection />}
      <Password />
    </div>
  );
}
