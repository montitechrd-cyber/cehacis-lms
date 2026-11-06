import { useState, type FormEvent } from 'react';
import { Instagram, Mail, MessageCircle, Phone } from 'lucide-react';
import { api, ApiError, errorMessage } from '@/lib/api';
import { Alert } from '@/components/ui/Feedback';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Form';
import { useBrand } from '@/lib/brand';
import { usePageTitle } from '@/features/public/data';
import { Masthead, Wrap } from '@/features/public/parts';

type F = { name: string; email: string; phone: string; subject: string; message: string; website: string };
const EMPTY: F = { name: '', email: '', phone: '', subject: '', message: '', website: '' };

export default function Contact() {
  usePageTitle('Contacto');
  const brand = useBrand();
  const [f, setF] = useState<F>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [fail, setFail] = useState<string | null>(null);
  const set = (k: keyof F) => (e: { target: { value: string } }) => setF((s) => ({ ...s, [k]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (f.name.trim().length < 2) er.name = 'Escribe tu nombre';
    if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) er.email = 'Escribe un correo válido';
    if (f.subject.trim().length < 3) er.subject = 'Indica el asunto';
    if (f.message.trim().length < 10) er.message = 'Cuéntanos un poco más (mínimo 10 caracteres)';
    setErrors(er);
    setFail(null);
    if (Object.keys(er).length) return;
    setSending(true);
    try {
      const r = await api.post<{ ok: boolean; message: string }>('/public/contact', { ...f, phone: f.phone || undefined });
      setDone(r.message || 'Gracias por escribirnos. Te responderemos pronto.');
      setF(EMPTY);
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length) setErrors(err.fieldErrors);
      setFail(errorMessage(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <Masthead title="Contacto" lead="Escríbenos y te respondemos por correo." />
      <Wrap className="grid gap-12 py-12 lg:grid-cols-12">
        <div className="lg:col-span-7">
          {done ? (
            <div className="border-t-4 border-ink pt-6" role="status">
              <h2 className="text-title font-bold">Mensaje enviado</h2>
              <p className="mt-3 max-w-lg text-graphite">{done}</p>
              <Button variant="outline" className="mt-6" onClick={() => setDone(null)}>Enviar otro mensaje</Button>
            </div>
          ) : (
            <form onSubmit={submit} noValidate className="space-y-5">
              {fail && <Alert tone="danger" title="No se pudo enviar">{fail}</Alert>}
              <div className="grid gap-5 sm:grid-cols-2">
                <Input label="Nombre" required value={f.name} onChange={set('name')} error={errors.name} autoComplete="name" />
                <Input label="Correo" required type="email" value={f.email} onChange={set('email')} error={errors.email} autoComplete="email" />
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <Input label="Teléfono (opcional)" type="tel" value={f.phone} onChange={set('phone')} error={errors.phone} autoComplete="tel" />
                <Input label="Asunto" required value={f.subject} onChange={set('subject')} error={errors.subject} />
              </div>
              <Textarea label="Mensaje" required rows={6} value={f.message} onChange={set('message')} error={errors.message} />
              <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
                <label>
                  No rellenar
                  <input tabIndex={-1} autoComplete="off" name="website" value={f.website} onChange={set('website')} />
                </label>
              </div>
              <Button type="submit" variant="primary" size="lg" loading={sending}>Enviar mensaje</Button>
            </form>
          )}
        </div>
        <aside className="lg:col-span-5">
          <h2 className="border-b border-ink pb-3 text-xl font-bold">Otras vías</h2>
          <ul className="divide-y divide-line">
            {brand.contactEmail && <li><a href={`mailto:${brand.contactEmail}`} className="flex items-center gap-3 py-4 font-semibold text-ink no-underline hover:underline"><Mail className="size-5" aria-hidden />{brand.contactEmail}</a></li>}
            <li><a href={`tel:${brand.contactPhone.replace(/[^+\d]/g, '')}`} className="flex items-center gap-3 py-4 font-semibold text-ink no-underline hover:underline"><Phone className="size-5" aria-hidden />{brand.contactPhone}</a></li>
            {brand.whatsapp && <li><a href={`https://wa.me/${brand.whatsapp}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 py-4 font-semibold text-ink no-underline hover:underline"><MessageCircle className="size-5" aria-hidden />WhatsApp</a></li>}
            {brand.instagram && <li><a href={`https://instagram.com/${brand.instagram}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 py-4 font-semibold text-ink no-underline hover:underline"><Instagram className="size-5" aria-hidden />@{brand.instagram}</a></li>}
          </ul>
          {brand.address && <p className="mt-4 text-graphite">{brand.address}</p>}
        </aside>
      </Wrap>
    </>
  );
}
