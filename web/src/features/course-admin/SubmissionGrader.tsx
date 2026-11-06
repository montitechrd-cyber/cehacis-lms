import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
import { useAction } from '@/lib/hooks';
import { dateTime, fileSize, fullName, num } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { Tag, statusTone } from '@/components/ui/Data';
import { Input, Textarea } from '@/components/ui/Form';
import { Drawer } from '@/components/ui/Overlay';
import { SUBMISSION_STATUS, type FileOut, type Rubric, type UserBrief } from './shared';

export interface SubmissionRow {
  id: number; activityId: number; userId: number; groupId: number | null; text: string | null; linkUrl: string | null; status: string; score: number | null; submittedAt: string; gradedAt: string | null;
  files: (Omit<FileOut, 'originalName'> & { name: string })[];
  user: UserBrief & { email: string }; group: { id: number; name: string } | null; feedbackCount: number; peerReviewCount: number;
}

export default function SubmissionGrader({ submission, rubric, maxScore, activityId, onClose }: { submission: SubmissionRow; rubric: Rubric | null; maxScore: number; activityId: number; onClose: () => void }) {
  const [scores, setScores] = useState<Record<number, { score: number | null; comment: string }>>({});
  const [score, setScore] = useState('');
  const [comment, setComment] = useState('');
  const [observations, setObservations] = useState('');
  const [recommendations, setRecommendations] = useState('');
  useEffect(() => { setScores({}); setScore(submission.score != null ? String(submission.score) : ''); setComment(''); setObservations(''); setRecommendations(''); }, [submission.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const live = useMemo(() => {
    if (!rubric) return score === '' ? null : Number(score);
    const tw = rubric.criteria.reduce((s, c) => s + c.weight, 0);
    if (!tw || rubric.criteria.some((c) => scores[c.id]?.score == null)) return null;
    const sum = rubric.criteria.reduce((s, c) => s + (scores[c.id]!.score! / c.maxScore) * c.weight, 0);
    return Math.round((sum / tw) * maxScore * 100) / 100;
  }, [rubric, scores, score, maxScore]);

  const grade = useAction(
    (status: 'GRADED' | 'RETURNED') => {
      const body: Record<string, unknown> = { status, comment: comment.trim() || undefined, observations: observations.trim() || undefined, recommendations: recommendations.trim() || undefined };
      if (rubric) {
        const filled = rubric.criteria.filter((c) => scores[c.id]?.score != null);
        if (filled.length) body.rubricScores = filled.map((c) => ({ criterionId: c.id, score: scores[c.id]!.score, comment: scores[c.id]!.comment.trim() || undefined }));
      } else if (score !== '') body.score = Number(score);
      return api.post(`/activities/submissions/${submission.id}/grade`, body);
    },
    { success: (_r) => 'Calificación registrada', invalidate: [['activity-submissions', activityId], ['activity', activityId], ['course-activities'], ['gradebook']], silentError: true, onSuccess: onClose },
  );
  const run = async (status: 'GRADED' | 'RETURNED') => {
    if (status === 'GRADED') {
      if (rubric && rubric.criteria.some((c) => scores[c.id]?.score == null)) return toast.error('Puntúa todos los criterios de la rúbrica');
      if (!rubric && (score === '' || Number(score) < 0 || Number(score) > maxScore)) return toast.error(`Indica una nota entre 0 y ${maxScore}`);
    }
    if (status === 'RETURNED' && !comment.trim() && !observations.trim() && !recommendations.trim()) return toast.error('Explica qué debe corregir el estudiante');
    try { await grade.mutateAsync(status); } catch (e) { toast.error(e instanceof ApiError ? e.message : 'No se pudo calificar'); }
  };

  return (
    <Drawer open onClose={onClose} width="max-w-4xl" title={`Entrega de ${submission.group ? submission.group.name + ' · ' : ''}${fullName(submission.user)}`}
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cerrar</Button>
        <Button variant="outline" loading={grade.isPending && grade.variables === 'RETURNED'} onClick={() => run('RETURNED')}>Devolver para corrección</Button>
        <Button variant="primary" loading={grade.isPending && grade.variables === 'GRADED'} onClick={() => run('GRADED')}>Calificar{live != null ? ` (${num(live, 2)}/${maxScore})` : ''}</Button>
      </>}>
      <div className="grid gap-6">
        <section aria-label="Contenido de la entrega" className="grid gap-3">
          <div className="flex flex-wrap items-center gap-2 text-sm text-graphite">
            <Tag tone={statusTone(submission.status)}>{SUBMISSION_STATUS[submission.status] ?? submission.status}</Tag>
            <span>Entregada {dateTime(submission.submittedAt)}</span>
            {submission.score != null && <span className="tnum">· nota actual {num(submission.score, 2)}/{maxScore}</span>}
            {submission.peerReviewCount > 0 && <span>· {submission.peerReviewCount} revisiones de pares</span>}
          </div>
          {submission.text && <div className="whitespace-pre-wrap rounded-sm bg-stone p-4 text-sm leading-relaxed">{submission.text}</div>}
          {submission.linkUrl && <a href={submission.linkUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold underline">{submission.linkUrl}<ExternalLink className="size-3.5" /></a>}
          {submission.files.map((f) => <FilePreview key={f.id} f={f} />)}
          {!submission.text && !submission.linkUrl && submission.files.length === 0 && <p className="text-sm text-graphite">La entrega no tiene contenido.</p>}
        </section>

        <section aria-label="Calificación" className="border-t border-ink pt-4">
          <h3 className="text-base font-bold">Calificación</h3>
          {rubric ? (
            <div className="mt-3 grid gap-5">
              {rubric.criteria.map((c) => {
                const cur = scores[c.id];
                const lvl = c.levels.find((l) => l.score === cur?.score);
                return (
                  <fieldset key={c.id} className="grid gap-2">
                    <legend className="text-sm font-bold">{c.title} <span className="font-normal text-muted tnum">(peso {c.weight}, máx. {c.maxScore})</span></legend>
                    {c.description && <p className="text-xs text-graphite">{c.description}</p>}
                    <div className="grid gap-2 sm:grid-cols-[repeat(auto-fit,minmax(9rem,1fr))]">
                      {c.levels.map((l) => (
                        <button key={l.id} type="button" aria-pressed={cur?.score === l.score} onClick={() => setScores({ ...scores, [c.id]: { score: l.score, comment: cur?.comment ?? '' } })}
                          className={clsx('rounded-sm border p-2 text-left text-xs', cur?.score === l.score ? 'border-ink bg-ink text-paper' : 'border-line-strong hover:border-ink')}>
                          <span className="block text-sm font-bold tnum">{l.score} · {l.label}</span>
                          {l.description && <span className="block opacity-80">{l.description}</span>}
                        </button>
                      ))}
                    </div>
                    {c.levels.length === 0 && <Input label={`Puntaje (0–${c.maxScore})`} type="number" min={0} max={c.maxScore} value={cur?.score ?? ''} onChange={(e) => setScores({ ...scores, [c.id]: { score: e.target.value === '' ? null : Number(e.target.value), comment: cur?.comment ?? '' } })} />}
                    {lvl && <span className="sr-only">Nivel elegido: {lvl.label}</span>}
                    <Input aria-label={`Comentario sobre ${c.title}`} placeholder="Comentario del criterio (opcional)" value={cur?.comment ?? ''} onChange={(e) => setScores({ ...scores, [c.id]: { score: cur?.score ?? null, comment: e.target.value } })} />
                  </fieldset>
                );
              })}
            </div>
          ) : (
            <div className="mt-3 max-w-xs"><Input label={`Nota (0–${maxScore})`} type="number" min={0} max={maxScore} step="0.1" value={score} onChange={(e) => setScore(e.target.value)} /></div>
          )}
          <p className="mt-4 text-lg font-bold tnum" aria-live="polite">Puntuación: {live == null ? '—' : num(live, 2)} / {maxScore}</p>
          <div className="mt-3 grid gap-3">
            <Textarea label="Comentario general" value={comment} onChange={(e) => setComment(e.target.value)} rows={3} />
            <Textarea label="Observaciones" value={observations} onChange={(e) => setObservations(e.target.value)} rows={2} />
            <Textarea label="Recomendaciones" value={recommendations} onChange={(e) => setRecommendations(e.target.value)} rows={2} />
          </div>
        </section>
      </div>
    </Drawer>
  );
}

function FilePreview({ f }: { f: SubmissionRow['files'][number] }) {
  const isVideo = f.mimeType.startsWith('video/');
  const isAudio = f.mimeType.startsWith('audio/');
  return (
    <div className="grid gap-1.5">
      {isVideo && <video controls preload="metadata" src={f.url} className="max-h-96 w-full bg-ink" aria-label={f.name} />}
      {isAudio && <audio controls preload="metadata" src={f.url} className="w-full" aria-label={f.name} />}
      {f.mimeType.startsWith('image/') && <img src={f.url} alt={f.name} className="max-h-96 object-contain" />}
      <a href={`${f.url}?download=1`} className="text-sm font-semibold underline">{f.name}</a>
      <span className="text-xs text-muted tnum">{f.mimeType} · {fileSize(f.size)}</span>
    </div>
  );
}
