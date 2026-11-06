import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Send } from 'lucide-react';
import { api } from '@/lib/api';
import { useAction } from '@/lib/hooks';
import { dateTime } from '@/lib/format';
import { PageHeader } from '@/components/ui/Page';
import { Alert } from '@/components/ui/Feedback';
import { Button } from '@/components/ui/Button';
import { Select, Textarea } from '@/components/ui/Form';
import { PlainText, Q, aiErrorMessage } from '@/features/campus/shared';
import { toast } from 'sonner';
import { VoiceWave } from '@/components/brand/Emblem';

interface Item { id: number; role: 'user' | 'assistant'; content: string; courseId: number | null; createdAt: string }
interface MyCourse { course: { id: number; title: string } }

export default function Tutor() {
  const [courseId, setCourseId] = useState('');
  const [question, setQuestion] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const status = useQuery({ queryKey: ['ai', 'status'], queryFn: () => api.get<{ configured: boolean }>('/ai/status') });
  const courses = useQuery({ queryKey: ['classroom', 'my-courses'], queryFn: () => api.get<MyCourse[]>('/classroom/my-courses') });
  const history = useQuery({
    queryKey: ['ai', 'tutor', courseId],
    queryFn: async () => (await api.get<{ data: Item[] }>('/ai/tutor/history', { courseId: courseId || undefined })).data,
  });
  const ask = useAction((q: string) => api.post<{ answer: string }>('/ai/tutor', { question: q, courseId: courseId ? Number(courseId) : undefined }), {
    invalidate: [['ai', 'tutor']],
    silentError: true,
    onSuccess: () => setQuestion(''),
  });
  useEffect(() => {
    if (ask.error) toast.error(aiErrorMessage(ask.error));
  }, [ask.error]);
  useEffect(() => endRef.current?.scrollIntoView({ block: 'end' }), [history.data?.length]);

  return (
    <div className="animate-rise">
      <PageHeader
        crumbs={[{ label: 'Entrenador con IA', to: '/campus/ia' }, { label: 'Tutor' }]}
        title="Tutor académico"
        description="Resuelve dudas sobre el contenido de tus cursos. Las respuestas son orientativas; consulta a tu facilitador para validarlas."
      />
      {status.data && !status.data.configured && (
        <div className="mb-6"><Alert tone="warning" title="Tutor no disponible">El tutor con IA aún no está activado en esta institución. Podrás hacer preguntas cuando la administración lo configure.</Alert></div>
      )}
      <div className="max-w-3xl">
        <Select
          label="Curso"
          value={courseId}
          onChange={(e) => setCourseId(e.target.value)}
          placeholder="Pregunta general (sin curso)"
          options={(courses.data ?? []).map((c) => ({ value: c.course.id, label: c.course.title }))}
          hint={courses.isError ? 'No se pudieron cargar tus cursos.' : 'Con un curso seleccionado, el tutor usa su temario y objetivos.'}
        />
        <div className="mt-8">
          <Q query={history}>
            {(items) =>
              items.length === 0 ? (
                <p className="border-y border-line py-8 text-sm text-graphite">Aún no hay preguntas en este historial. Escribe la primera abajo.</p>
              ) : (
                <ol className="border-t border-ink">
                  {items.map((m) => (
                    <li key={m.id} className="grid gap-1 border-b border-line py-5 sm:grid-cols-[100px_1fr] sm:gap-6">
                      <span className="flex items-center gap-2 text-sm font-bold">
                        {m.role === 'user' && <span className="size-2 bg-orange" aria-hidden />}
                        {m.role === 'user' ? 'Tú' : 'Tutor'}
                        <span className="sr-only">{dateTime(m.createdAt)}</span>
                      </span>
                      <PlainText className={m.role === 'user' ? 'font-medium' : 'text-graphite'}>{m.content}</PlainText>
                    </li>
                  ))}
                  {ask.isPending && (
                    <li className="grid gap-1 border-b border-line py-5 sm:grid-cols-[100px_1fr] sm:gap-6"><span className="text-sm font-bold">Tutor</span><span className="inline-flex items-center gap-2 text-graphite"><VoiceWave bars={7} height={14} animated className="text-orange" /> escribiendo…</span></li>
                  )}
                </ol>
              )
            }
          </Q>
          <div ref={endRef} />
        </div>
        <form className="mt-6" onSubmit={(e) => { e.preventDefault(); if (question.trim()) ask.mutate(question.trim()); }}>
          <Textarea label="Tu pregunta" value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={2000} rows={3} />
          <div className="mt-3 flex justify-end">
            <Button type="submit" variant="primary" icon={<Send className="size-4" />} loading={ask.isPending} disabled={!question.trim()}>Preguntar</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
