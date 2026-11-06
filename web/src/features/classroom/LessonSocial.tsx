import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Flag, MessageCircleQuestion, Reply, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Form';
import { Alert, ErrorState, SkeletonRows } from '@/components/ui/Feedback';
import { Avatar, Tag } from '@/components/ui/Data';
import { ConfirmDialog, Modal } from '@/components/ui/Overlay';
import { api, ApiError } from '@/lib/api';
import { useAction } from '@/lib/hooks';
import { useAuth } from '@/lib/auth';
import { fullName, relative } from '@/lib/format';
import type { UserBrief } from './types';

interface Comment {
  id: number;
  lessonId: number;
  parentId: number | null;
  content: string;
  status: string;
  isHidden: boolean;
  createdAt: string;
  author: UserBrief;
  replies: Comment[];
}

function CommentItem({ c, depth, onReply, onReport, onDelete, canModerate, meId }: { c: Comment; depth: number; onReply: (c: Comment) => void; onReport: (c: Comment) => void; onDelete: (c: Comment) => void; canModerate: boolean; meId?: number }) {
  return (
    <li className={depth ? 'ml-5 border-l border-line pl-4 sm:ml-8' : ''}>
      <div className="flex gap-3 py-4">
        <Avatar user={c.author} size={32} />
        <div className="min-w-0 flex-1">
          <p className="text-sm">
            <span className="font-semibold">{fullName(c.author)}</span>
            {c.author.role !== 'STUDENT' && <Tag tone="ink" className="ml-2">Facilitador</Tag>}
            <span className="ml-2 text-xs text-muted">{relative(c.createdAt)}</span>
            {c.isHidden && <Tag tone="danger" className="ml-2">Oculto</Tag>}
          </p>
          <p className="mt-1 whitespace-pre-wrap break-words text-[0.9375rem] leading-relaxed">{c.content}</p>
          <div className="mt-1.5 flex flex-wrap gap-4 text-xs font-semibold text-graphite">
            {depth < 2 && (
              <button type="button" onClick={() => onReply(c)} className="inline-flex items-center gap-1 hover:text-ink">
                <Reply className="size-3.5" aria-hidden /> Responder
              </button>
            )}
            {c.author.id !== meId && (
              <button type="button" onClick={() => onReport(c)} className="inline-flex items-center gap-1 hover:text-ink">
                <Flag className="size-3.5" aria-hidden /> Reportar
              </button>
            )}
            {(c.author.id === meId || canModerate) && (
              <button type="button" onClick={() => onDelete(c)} className="inline-flex items-center gap-1 hover:text-danger">
                <Trash2 className="size-3.5" aria-hidden /> Eliminar
              </button>
            )}
          </div>
        </div>
      </div>
      {c.replies?.length > 0 && (
        <ul>
          {c.replies.map((r) => (
            <CommentItem key={r.id} c={r} depth={depth + 1} onReply={onReply} onReport={onReport} onDelete={onDelete} canModerate={canModerate} meId={meId} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function LessonComments({ lessonId }: { lessonId: number }) {
  const { user } = useAuth();
  const key = ['lesson-comments', lessonId];
  const q = useQuery({ queryKey: key, queryFn: () => api.get<{ data: Comment[]; meta: { total: number; canModerate: boolean } }>(`/community/lessons/${lessonId}/comments`) });
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [reporting, setReporting] = useState<Comment | null>(null);
  const [reason, setReason] = useState('');
  const [deleting, setDeleting] = useState<Comment | null>(null);

  const post = useAction((b: { content: string; parentId?: number }) => api.post(`/community/lessons/${lessonId}/comments`, b), {
    success: 'Comentario publicado',
    invalidate: [key],
    onSuccess: () => {
      setText('');
      setReplyTo(null);
    },
  });
  const report = useAction((b: { targetId: number; reason: string }) => api.post('/community/reports', { targetType: 'LESSON_COMMENT', ...b }), {
    success: 'Reporte enviado. Gracias por avisar.',
    onSuccess: () => {
      setReporting(null);
      setReason('');
    },
  });
  const del = useAction((id: number) => api.del(`/community/comments/${id}`), { success: 'Comentario eliminado', invalidate: [key], onSuccess: () => setDeleting(null) });

  return (
    <section className="mt-14 border-t border-ink pt-4" aria-labelledby="comentarios">
      <h2 id="comentarios" className="text-xl font-bold tracking-tight">
        Comentarios {q.data && <span className="font-normal text-muted tnum">({q.data.meta.total})</span>}
      </h2>
      <form
        className="mt-4 max-w-2xl"
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim()) post.mutate({ content: text.trim(), parentId: replyTo?.id });
        }}
      >
        {replyTo && (
          <p className="mb-2 flex items-center justify-between bg-stone px-3 py-2 text-sm">
            <span>
              Respondiendo a <strong>{fullName(replyTo.author)}</strong>
            </span>
            <button type="button" className="font-semibold underline" onClick={() => setReplyTo(null)}>
              Cancelar
            </button>
          </p>
        )}
        <Textarea label={replyTo ? 'Tu respuesta' : 'Escribe un comentario o pregunta'} value={text} onChange={(e) => setText(e.target.value)} maxLength={10000} rows={3} />
        <div className="mt-3 flex justify-end">
          <Button type="submit" variant="ink" loading={post.isPending} disabled={!text.trim()}>
            Publicar
          </Button>
        </div>
      </form>
      <div className="mt-4 max-w-2xl">
        {q.isLoading ? (
          <SkeletonRows rows={3} />
        ) : q.error ? (
          <ErrorState error={q.error} onRetry={() => q.refetch()} />
        ) : !q.data?.data.length ? (
          <p className="text-sm text-graphite">Aún no hay comentarios. Sé la primera persona en comentar esta lección.</p>
        ) : (
          <ul className="divide-y divide-line border-t border-line">
            {q.data.data.map((c) => (
              <CommentItem
                key={c.id}
                c={c}
                depth={0}
                meId={user?.id}
                canModerate={q.data!.meta.canModerate}
                onReply={(x) => {
                  setReplyTo(x);
                  document.getElementById('comentarios')?.scrollIntoView({ behavior: 'smooth' });
                }}
                onReport={setReporting}
                onDelete={setDeleting}
              />
            ))}
          </ul>
        )}
      </div>
      <Modal
        open={!!reporting}
        onClose={() => setReporting(null)}
        title="Reportar comentario"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setReporting(null)}>
              Cancelar
            </Button>
            <Button variant="danger" loading={report.isPending} disabled={reason.trim().length < 3} onClick={() => reporting && report.mutate({ targetId: reporting.id, reason: reason.trim() })}>
              Enviar reporte
            </Button>
          </>
        }
      >
        <Textarea label="Motivo" hint="Entre 3 y 500 caracteres." value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} />
      </Modal>
      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={() => deleting && del.mutate(deleting.id)} loading={del.isPending} title="Eliminar comentario" description="También se eliminarán las respuestas a este comentario." confirmLabel="Eliminar" />
    </section>
  );
}

interface Turn {
  q: string;
  a: string;
}
export function TutorPanel({ lessonId }: { lessonId: number }) {
  const [question, setQuestion] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const [notConfigured, setNotConfigured] = useState(false);
  const status = useQuery({ queryKey: ['ai', 'status'], queryFn: () => api.get<{ configured: boolean }>('/ai/status'), staleTime: 300_000 });
  const off = notConfigured || status.data?.configured === false;

  async function ask() {
    const q = question.trim();
    if (!q || busy) return;
    setBusy(true);
    try {
      const r = await api.post<{ answer: string }>('/ai/tutor', { question: q, lessonId });
      setTurns((t) => [...t, { q, a: r.answer }]);
      setQuestion('');
    } catch (e) {
      if (e instanceof ApiError && (e.code === 'NOT_CONFIGURED' || e.status === 503)) setNotConfigured(true);
      else toast.error(e instanceof ApiError ? e.message : 'No se pudo consultar al tutor');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-14 border-t border-ink pt-4" aria-labelledby="tutor">
      <h2 id="tutor" className="flex items-center gap-2 text-xl font-bold tracking-tight">
        <MessageCircleQuestion className="size-5" aria-hidden /> Pregunta al tutor
      </h2>
      <div className="mt-4 max-w-2xl">
        {off ? (
          <Alert tone="info" title="El tutor con IA aún no está configurado">
            Mientras tanto, deja tu duda en los comentarios de la lección para que la responda tu facilitador.
          </Alert>
        ) : (
          <>
            {turns.length > 0 && (
              <ul className="mb-5 space-y-4">
                {turns.map((t, i) => (
                  <li key={i} className="text-sm">
                    <p className="font-semibold">{t.q}</p>
                    <p className="mt-1 whitespace-pre-wrap bg-stone p-3 leading-relaxed">{t.a}</p>
                  </li>
                ))}
              </ul>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                ask();
              }}
            >
              <Textarea label="Tu pregunta sobre esta lección" value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={2000} rows={3} hint="El tutor usa el contenido de la lección para responder." />
              <div className="mt-3 flex justify-end">
                <Button type="submit" variant="ink" loading={busy} disabled={!question.trim()}>
                  Preguntar
                </Button>
              </div>
            </form>
          </>
        )}
      </div>
    </section>
  );
}
