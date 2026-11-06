import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Alert, ErrorState, PageLoader, SkeletonRows } from '@/components/ui/Feedback';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Form';
import { Facts, Tag, statusTone } from '@/components/ui/Data';
import { FileDrop } from '@/components/ui/Upload';
import { PageHeader, Section } from '@/components/ui/Page';
import { api, ApiError, errorMessage } from '@/lib/api';
import { ACTIVITY_TYPES, dateTime, fileSize, fullName, relative } from '@/lib/format';
import { Recorder } from '@/features/classroom/Recorder';
import type { FileOut } from '@/features/classroom/types';

interface Level { id: number; score: number; label: string; description: string | null }
interface Criterion { id: number; title: string; description: string | null; weight: number; maxScore: number; levels: Level[] }
interface Rubric { id: number; title: string; description: string | null; criteria: Criterion[] }
interface Sub { id: number; text: string | null; linkUrl: string | null; status: string; score: number | null; submittedAt: string; gradedAt: string | null; files: FileOut[] }
interface StudentView {
  activity: {
    id: number; title: string; description: string | null; instructions: string | null; scenario: string | null; roles: { name: string; brief: string }[];
    type: string; submissionTypes: string[]; dueDate: string | null; maxScore: number; peerReview: boolean; peerReviewsRequired: number;
    course: { id: number; title: string }; competencies: { id: number; name: string }[]; rubric: Rubric | null;
  };
  myGroup: { id: number; name: string; members: { userId: number; role: string | null; user: { firstName: string; lastName: string } }[] } | null;
  mySubmission: Sub | null;
  canSubmit: boolean;
  feedback: { id: number; comment: string | null; observations: string | null; recommendations: string | null; totalScore: number | null; createdAt: string; author: { firstName: string; lastName: string }; rubricScores: { id: number; criterion: { title: string; maxScore: number }; score: number; comment: string | null }[] }[];
  peerReviewsReceived: { id: number; score: number | null; comment: string | null; createdAt: string; scores: { criterionId: number; score: number }[] }[];
  peerReviewsGiven: number;
}
interface PeerQueue { required: number; given: number; maxScore: number; rubric: Rubric | null; items: { id: number; text: string | null; linkUrl: string | null; submittedAt: string; files: FileOut[] }[] }

const SUB_STATUS: Record<string, string> = { SUBMITTED: 'Entregada', GRADED: 'Calificada', RETURNED: 'Devuelta para corregir' };
const ACCEPT: Record<string, string> = {
  VIDEO: 'video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov',
  AUDIO: 'audio/mpeg,audio/mp4,audio/wav,audio/ogg,audio/webm,.mp3,.m4a,.wav,.ogg,.webm',
  FILE: '.pdf,.doc,.docx,.ppt,.pptx,.zip,.png,.jpg,.jpeg,.webp,.gif',
};

function SubmissionBody({ s }: { s: { text: string | null; linkUrl: string | null; files: FileOut[] } }) {
  return (
    <div className="space-y-3 text-sm">
      {s.text && <p className="whitespace-pre-wrap bg-stone p-3">{s.text}</p>}
      {s.linkUrl && <a href={s.linkUrl} target="_blank" rel="noopener noreferrer" className="block break-all font-semibold underline underline-offset-4">{s.linkUrl}</a>}
      {s.files?.length > 0 && (
        <ul className="divide-y divide-line border-y border-line">
          {s.files.map((f) => (
            <li key={f.id} className="flex items-center justify-between gap-3 py-2">
              <a href={f.url} target="_blank" rel="noopener noreferrer" className="min-w-0 truncate font-semibold underline underline-offset-4">{f.originalName ?? f.name}</a>
              <span className="shrink-0 text-xs text-muted tnum">{fileSize(f.size)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RubricTable({ rubric }: { rubric: Rubric }) {
  return (
    <div className="overflow-x-auto border-t border-ink">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <caption className="sr-only">{rubric.title}</caption>
        <thead>
          <tr className="border-b border-line text-left">
            <th scope="col" className="w-1/4 px-3 py-3 text-xs font-semibold uppercase tracking-[0.06em] text-graphite">Criterio</th>
            <th scope="col" className="px-3 py-3 text-xs font-semibold uppercase tracking-[0.06em] text-graphite">Niveles de desempeño</th>
          </tr>
        </thead>
        <tbody>
          {rubric.criteria.map((c) => (
            <tr key={c.id} className="border-b border-line align-top">
              <th scope="row" className="px-3 py-3 text-left font-semibold">
                {c.title}
                <span className="block text-xs font-normal text-muted tnum">Máx. {c.maxScore} · peso {c.weight}</span>
                {c.description && <span className="mt-1 block text-xs font-normal text-graphite">{c.description}</span>}
              </th>
              <td className="px-3 py-3">
                <ul className="grid gap-2 sm:grid-cols-2">
                  {[...c.levels].sort((a, b) => b.score - a.score).map((l) => (
                    <li key={l.id} className="border border-line p-2">
                      <p className="font-semibold tnum">{l.score} · {l.label}</p>
                      {l.description && <p className="mt-0.5 text-xs text-graphite">{l.description}</p>}
                    </li>
                  ))}
                </ul>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PeerReviewForm({ item, queue, activityId, onDone }: { item: PeerQueue['items'][number]; queue: PeerQueue; activityId: number; onDone: () => void }) {
  const [scores, setScores] = useState<Record<number, string>>({});
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const crit = queue.rubric?.criteria ?? [];
  const valid = crit.length ? crit.every((c) => scores[c.id] !== undefined && scores[c.id] !== '') : comment.trim().length > 0;
  async function send() {
    setBusy(true);
    try {
      await api.post(`/activities/submissions/${item.id}/peer-reviews`, { scores: crit.map((c) => ({ criterionId: c.id, score: Number(scores[c.id]) })), comment: comment.trim() || undefined });
      toast.success('Revisión enviada');
      onDone();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <li className="py-6">
      <p className="mb-3 text-sm font-semibold">Entrega anónima · {dateTime(item.submittedAt)}</p>
      <SubmissionBody s={item} />
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {crit.map((c) => (
          <Input key={c.id} type="number" min={0} max={c.maxScore} step="any" label={`${c.title} (0–${c.maxScore})`} value={scores[c.id] ?? ''} onChange={(e) => setScores({ ...scores, [c.id]: e.target.value })} />
        ))}
      </div>
      <Textarea className="mt-3" label={crit.length ? 'Comentario (opcional)' : 'Comentario'} value={comment} onChange={(e) => setComment(e.target.value)} rows={3} wrapperClassName="mt-3" />
      <div className="mt-3 flex justify-end">
        <Button variant="ink" disabled={!valid} loading={busy} onClick={send}>Enviar revisión</Button>
      </div>
      <span className="sr-only">{activityId}</span>
    </li>
  );
}

export default function Activity() {
  const id = Number(useParams().activityId);
  const lessonId = (useLocation().state as { lessonId?: number } | null)?.lessonId;
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['activity', id], queryFn: () => api.get<StudentView>(`/activities/${id}/student`) });
  const pq = useQuery({ queryKey: ['activity', id, 'peer'], queryFn: () => api.get<PeerQueue>(`/activities/${id}/peer-queue`), enabled: !!q.data?.activity.peerReview, retry: false });

  const [text, setText] = useState('');
  const [link, setLink] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [recorded, setRecorded] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  if (q.isLoading) return <PageLoader />;
  if (q.error || !q.data) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const { activity: a, myGroup, mySubmission: sub, canSubmit, feedback, peerReviewsReceived } = q.data;
  const types = a.submissionTypes.length ? a.submissionTypes : ['TEXT', 'LINK', 'FILE', 'VIDEO', 'AUDIO'];
  const fileTypes = types.filter((t) => ACCEPT[t]);
  const accept = fileTypes.length ? fileTypes.map((t) => ACCEPT[t]).join(',') : undefined;
  const needGroup = a.type === 'GROUP' && !myGroup;
  const recMode = types.includes('VIDEO') ? 'video' : types.includes('AUDIO') ? 'audio' : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const all = [...files, ...(recorded ? [recorded] : [])];
    if (!text.trim() && !link.trim() && !all.length) return setErrors({ form: 'Agrega contenido a tu entrega.' });
    const fd = new FormData();
    if (text.trim()) fd.append('text', text.trim());
    if (link.trim()) fd.append('linkUrl', link.trim());
    all.forEach((f) => fd.append('files', f));
    setBusy(true);
    setErrors({});
    try {
      await api.upload(`/activities/${id}/submissions`, fd);
      toast.success('Entrega enviada');
      setText(''); setLink(''); setFiles([]); setRecorded(null);
      await Promise.all([qc.invalidateQueries({ queryKey: ['activity', id] }), qc.invalidateQueries({ queryKey: ['activities'] }), qc.invalidateQueries({ queryKey: ['lesson'] }), qc.invalidateQueries({ queryKey: ['outline'] })]);
    } catch (err) {
      if (err instanceof ApiError) setErrors({ ...err.fieldErrors, form: err.message });
      else toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title={a.title}
        description={a.description ?? undefined}
        crumbs={[{ label: 'Mis cursos', to: '/campus/cursos' }, { label: a.course.title, to: `/campus/cursos/${a.course.id}` }, { label: 'Práctica' }]}
        actions={lessonId ? <ButtonLink to={`/campus/leccion/${lessonId}`} variant="outline">Volver a la lección</ButtonLink> : undefined}
      />
      <div className="grid gap-x-14 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div>
          {a.instructions && (
            <Section title="Instrucciones">
              <p className="max-w-2xl whitespace-pre-wrap leading-relaxed">{a.instructions}</p>
            </Section>
          )}
          {a.scenario && (
            <Section title="Escenario">
              <p className="max-w-2xl whitespace-pre-wrap bg-stone p-5 leading-relaxed">{a.scenario}</p>
            </Section>
          )}
          {a.roles.length > 0 && (
            <Section title="Roles del guion">
              <ul className="grid gap-4 sm:grid-cols-2">
                {a.roles.map((r, i) => (
                  <li key={i} className="border border-ink">
                    <p className="bg-ink px-4 py-2 text-lg font-bold text-paper">{r.name}</p>
                    <p className="whitespace-pre-wrap p-4 text-sm leading-relaxed">{r.brief}</p>
                  </li>
                ))}
              </ul>
            </Section>
          )}
          {a.rubric && (
            <Section title="Rúbrica de evaluación" description={a.rubric.title}>
              <RubricTable rubric={a.rubric} />
            </Section>
          )}

          <Section title="Mi entrega">
            {sub && (
              <div className="mb-6">
                <p className="mb-3 flex flex-wrap items-center gap-3 text-sm">
                  <Tag tone={statusTone(sub.status)}>{SUB_STATUS[sub.status] ?? sub.status}</Tag>
                  <span className="text-graphite tnum">Entregada {dateTime(sub.submittedAt)}</span>
                  {sub.score != null && <span className="font-bold tnum">Nota: {sub.score}/{a.maxScore}</span>}
                </p>
                <SubmissionBody s={sub} />
              </div>
            )}
            {sub?.status === 'RETURNED' && <div className="mb-5"><Alert tone="warning" title="Tu facilitador te devolvió la entrega">Revisa los comentarios y envía una versión corregida.</Alert></div>}
            {needGroup ? (
              <Alert tone="warning" title="Aún no tienes grupo">Esta actividad es grupal. Pide a tu facilitador que te asigne a un grupo para poder entregar.</Alert>
            ) : canSubmit ? (
              <form onSubmit={submit} className="max-w-2xl space-y-5" noValidate>
                {types.includes('TEXT') && <Textarea label="Respuesta escrita" rows={7} value={text} onChange={(e) => setText(e.target.value)} error={errors.text} />}
                {types.includes('LINK') && <Input type="url" label="Enlace" placeholder="https://" value={link} onChange={(e) => setLink(e.target.value)} error={errors.linkUrl} />}
                {fileTypes.length > 0 && (
                  <FileDrop files={files} onChange={setFiles} accept={accept} maxFiles={5} maxMb={500} label="Arrastra tus archivos o selecciónalos" hint={`Hasta 5 archivos de 500 MB (${fileTypes.map((t) => ({ FILE: 'documentos e imágenes', VIDEO: 'video', AUDIO: 'audio' })[t]).join(', ')})`} />
                )}
                {recMode && <Recorder mode={recMode} onRecorded={setRecorded} />}
                {a.dueDate && <p className="text-sm text-graphite tnum">Fecha límite: {dateTime(a.dueDate)}</p>}
                {errors.form && <p className="text-sm font-semibold text-danger" role="alert">{errors.form}</p>}
                <Button type="submit" variant="primary" size="lg" loading={busy}>{sub?.status === 'RETURNED' ? 'Reenviar entrega' : 'Enviar entrega'}</Button>
              </form>
            ) : !sub ? (
              <Alert tone="danger" title="El plazo de entrega venció">Ya no es posible enviar esta práctica.</Alert>
            ) : null}
          </Section>

          {(feedback.length > 0 || peerReviewsReceived.length > 0) && (
            <Section title="Retroalimentación">
              <ul className="divide-y divide-line border-y border-line">
                {feedback.map((f) => (
                  <li key={f.id} className="py-5">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="font-semibold">{fullName(f.author)} <span className="text-xs font-normal text-muted">{relative(f.createdAt)}</span></p>
                      {f.totalScore != null && <p className="text-xl font-bold tnum">{f.totalScore}/{a.maxScore}</p>}
                    </div>
                    {f.rubricScores.length > 0 && (
                      <ul className="mt-3 text-sm">
                        {f.rubricScores.map((s) => (
                          <li key={s.id} className="border-b border-line py-2">
                            <span className="flex justify-between gap-3"><span>{s.criterion.title}</span><span className="font-semibold tnum">{s.score}/{s.criterion.maxScore}</span></span>
                            {s.comment && <span className="mt-0.5 block text-xs text-graphite">{s.comment}</span>}
                          </li>
                        ))}
                      </ul>
                    )}
                    {f.comment && <p className="mt-3 whitespace-pre-wrap text-sm">{f.comment}</p>}
                    {f.observations && <p className="mt-2 whitespace-pre-wrap text-sm"><strong>Observaciones: </strong>{f.observations}</p>}
                    {f.recommendations && <p className="mt-2 whitespace-pre-wrap text-sm"><strong>Recomendaciones: </strong>{f.recommendations}</p>}
                  </li>
                ))}
                {peerReviewsReceived.map((p, i) => (
                  <li key={`p${p.id}`} className="py-5 text-sm">
                    <p className="font-semibold">Revisión de un compañero #{i + 1} {p.score != null && <span className="tnum">· {p.score}/{a.maxScore}</span>}</p>
                    {p.comment && <p className="mt-1 whitespace-pre-wrap">{p.comment}</p>}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {a.peerReview && (
            <Section title="Revisión entre compañeros" description={pq.data ? `Has revisado ${pq.data.given} de ${pq.data.required} requeridas.` : undefined}>
              {pq.isLoading ? (
                <SkeletonRows rows={2} />
              ) : pq.error ? (
                <p className="border-y border-line py-6 text-sm text-graphite">{errorMessage(pq.error)}</p>
              ) : !pq.data?.items.length ? (
                <p className="border-y border-line py-6 text-sm text-graphite">No hay entregas por revisar por ahora. Vuelve más tarde.</p>
              ) : (
                <ul className="divide-y divide-line border-y border-line">
                  {pq.data.items.map((it) => (
                    <PeerReviewForm key={it.id} item={it} queue={pq.data!} activityId={id} onDone={() => { pq.refetch(); q.refetch(); }} />
                  ))}
                </ul>
              )}
            </Section>
          )}
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Facts
            items={[
              { label: 'Tipo', value: ACTIVITY_TYPES[a.type] ?? a.type },
              { label: 'Puntuación máxima', value: a.maxScore },
              { label: 'Fecha límite', value: a.dueDate ? dateTime(a.dueDate) : 'Sin fecha' },
              { label: 'Entrega', value: sub ? (SUB_STATUS[sub.status] ?? sub.status) : 'Pendiente' },
            ]}
          />
          {myGroup && (
            <div className="mt-6">
              <h3 className="mb-2 text-sm font-bold">Mi grupo: {myGroup.name}</h3>
              <ul className="divide-y divide-line border-y border-line text-sm">
                {myGroup.members.map((m) => (
                  <li key={m.userId} className="flex justify-between gap-3 py-2">
                    <span>{fullName(m.user)}</span>
                    {m.role && <span className="text-muted">{m.role}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {a.competencies.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-2 text-sm font-bold">Competencias que se evalúan</h3>
              <p className="flex flex-wrap gap-1.5">{a.competencies.map((c) => <Tag key={c.id} tone="outline">{c.name}</Tag>)}</p>
            </div>
          )}
          <Link to={`/campus/cursos/${a.course.id}`} className="mt-6 block text-sm font-semibold underline underline-offset-4">Volver al curso</Link>
        </aside>
      </div>
    </div>
  );
}
