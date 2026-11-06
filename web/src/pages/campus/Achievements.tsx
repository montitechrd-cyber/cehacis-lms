import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { HeartHandshake } from 'lucide-react';
import { api } from '@/lib/api';
import { useAction } from '@/lib/hooks';
import { useAuth } from '@/lib/auth';
import { date, fullName, num } from '@/lib/format';
import { PageHeader, Section } from '@/components/ui/Page';
import { EmptyState, SkeletonRows } from '@/components/ui/Feedback';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Form';
import { Modal } from '@/components/ui/Overlay';
import { Avatar, Ledger, ProgressRule, Tabs, Tag } from '@/components/ui/Data';
import { BadgeIcon, ContactPicker, PlainText, Q, type CommunityUser } from '@/features/campus/shared';

interface Me {
  points: number;
  level: { number: number; name: string; minPoints: number } | null;
  nextLevel: { number: number; name: string; minPoints: number } | null;
  progressToNext: number;
  rank: number | null;
  badges: { id: number; key: string; name: string; description: string; icon: string; earned: boolean; awardedAt: string | null; progress: { current: number; target: number } }[];
  recent: { id: number; points: number; event: string; reason: string | null; createdAt: string }[];
  challenges: { id: number; title: string; description: string; endsAt: string; points: number; progress: { current: number; target: number }; completed: boolean }[];
  recognitions: { id: number; kind: string; message: string; createdAt: string; from: { firstName: string; lastName: string } }[];
}
interface Board {
  data: { rank: number; user: CommunityUser; points: number; level: { number: number; name: string } | null }[];
  me: { rank: number | null; points: number };
}

const EVENTS: Record<string, string> = {
  LESSON_COMPLETED: 'Lección completada', MODULE_COMPLETED: 'Módulo completado', COURSE_COMPLETED: 'Curso completado', ASSESSMENT_PASSED: 'Evaluación aprobada',
  PERFECT_SCORE: 'Puntuación perfecta', ACTIVITY_SUBMITTED: 'Actividad entregada', PEER_REVIEW_GIVEN: 'Revisión a compañero', FORUM_POST: 'Participación en foro',
  SIMULATION_COMPLETED: 'Simulación completada', ATTENDANCE_PRESENT: 'Asistencia', CHALLENGE_COMPLETED: 'Reto completado', RECOGNITION_RECEIVED: 'Reconocimiento recibido',
};
const KINDS = ['Escucha activa', 'Claridad al comunicar', 'Empatía', 'Liderazgo', 'Colaboración'];
const PERIODS = [{ key: 'week', label: 'Semana' }, { key: 'month', label: 'Mes' }, { key: 'all', label: 'Histórico' }] as const;

function Leaderboard() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<'week' | 'month' | 'all'>('week');
  const q = useQuery({ queryKey: ['gamification', 'leaderboard', period], queryFn: () => api.get<Board>('/gamification/leaderboard', { period }) });
  return (
    <>
      <Tabs tabs={PERIODS.map((p) => ({ key: p.key, label: p.label }))} value={period} onChange={setPeriod} className="mb-4" />
      <Q query={q}>
        {(b) => (
          <>
            <p className="mb-3 text-sm text-graphite">{b.me.rank ? `Tu posición: ${b.me.rank}.º con ${num(b.me.points)} puntos.` : 'Aún no figuras en esta clasificación.'}</p>
            {b.data.length === 0 ? (
              <p className="border-y border-line py-8 text-sm text-graphite">Nadie tiene puntos en este período todavía.</p>
            ) : (
              <ol className="divide-y divide-line border-y border-ink">
                {b.data.map((r) => {
                  const me = r.user.id === user?.id;
                  return (
                    <li key={r.rank} className={clsx('flex items-center gap-3 px-2 py-2.5', me && 'bg-stone')} aria-current={me ? 'true' : undefined}>
                      <span className="w-8 text-lg font-bold tnum">{r.rank}</span>
                      <Avatar user={r.user} size={32} />
                      <span className="min-w-0 flex-1 truncate font-semibold">{fullName(r.user)}{r.level && <span className="ml-2 text-xs font-normal text-muted">{r.level.name}</span>}</span>
                      {me && <Tag tone="orange">Tú</Tag>}
                      <span className="font-bold tnum">{num(r.points)}</span>
                    </li>
                  );
                })}
              </ol>
            )}
          </>
        )}
      </Q>
    </>
  );
}

export default function Achievements() {
  const q = useQuery({ queryKey: ['gamification', 'me'], queryFn: () => api.get<Me>('/gamification/me') });
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState<CommunityUser[]>([]);
  const [kind, setKind] = useState('');
  const [message, setMessage] = useState('');
  const claim = useAction((id: number) => api.post<{ pointsAwarded: number }>(`/gamification/challenges/${id}/claim`), {
    invalidate: [['gamification'], ['me']],
    success: (r) => `Reto reclamado: +${r.pointsAwarded} puntos`,
  });
  const recognize = useAction(() => api.post('/gamification/recognitions', { toId: to[0]!.id, kind: kind.trim(), message: message.trim() }), {
    invalidate: [['gamification', 'me']],
    success: 'Reconocimiento enviado',
    onSuccess: () => { setOpen(false); setTo([]); setKind(''); setMessage(''); },
  });

  return (
    <div className="animate-rise">
      <PageHeader title="Logros y clasificación" description="Tu progreso, insignias, retos y reconocimientos." />
      <Q query={q} skeleton={<SkeletonRows rows={4} />}>
        {(m) => (
          <>
            <Ledger items={[
              { label: 'Puntos', value: num(m.points) },
              { label: 'Nivel', value: m.level ? m.level.name : 'Sin nivel', note: m.level ? `Nivel ${m.level.number}` : undefined },
              { label: 'Posición', value: m.rank ? `${m.rank}.º` : '—' },
            ]} />
            <div className="mt-6 max-w-2xl">
              {m.nextLevel ? (
                <>
                  <div className="h-3 w-full bg-stone-2" role="progressbar" aria-valuenow={Math.round(m.progressToNext * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={`Progreso hacia el nivel ${m.nextLevel.name}`}>
                    <div className="h-full bg-ink" style={{ width: `${Math.round(m.progressToNext * 100)}%` }} />
                  </div>
                  <p className="mt-2 text-sm text-graphite tnum">Faltan {num(Math.max(0, m.nextLevel.minPoints - m.points))} puntos para el nivel {m.nextLevel.number}: {m.nextLevel.name}.</p>
                </>
              ) : (
                <p className="text-sm text-graphite">{m.level ? 'Has alcanzado el nivel más alto disponible.' : 'Gana puntos completando lecciones, evaluaciones y práctica para subir de nivel.'}</p>
              )}
            </div>

            <Section title="Insignias" className="mt-12">
              {m.badges.length === 0 ? (
                <p className="text-sm text-graphite">Aún no hay insignias configuradas.</p>
              ) : (
                <ul className="grid gap-x-8 gap-y-0 sm:grid-cols-2 lg:grid-cols-3">
                  {m.badges.map((b) => (
                    <li key={b.id} className="flex gap-4 border-b border-line py-4">
                      <span className={clsx('flex size-12 shrink-0 items-center justify-center', b.earned ? 'bg-ink text-paper' : 'border border-dashed border-line-strong text-muted')}>
                        <BadgeIcon name={b.icon} className="size-6" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold">{b.name}</p>
                        <p className="text-xs text-graphite">{b.description}</p>
                        {b.earned ? (
                          <p className="mt-1 text-xs font-semibold tnum">Obtenida el {date(b.awardedAt)}</p>
                        ) : (
                          <div className="mt-1.5">
                            <ProgressRule value={b.progress.target ? (b.progress.current / b.progress.target) * 100 : 0} showValue={false} label={`Progreso de ${b.name}`} />
                            <p className="mt-0.5 text-xs text-muted tnum">{num(b.progress.current)} / {num(b.progress.target)}</p>
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title="Retos activos">
              {m.challenges.length === 0 ? (
                <p className="text-sm text-graphite">No hay retos activos por ahora.</p>
              ) : (
                <ul className="divide-y divide-line border-y border-line">
                  {m.challenges.map((c) => {
                    const ready = c.progress.current >= c.progress.target;
                    return (
                      <li key={c.id} className="grid gap-x-8 gap-y-2 py-4 md:grid-cols-[1fr_260px_auto] md:items-center">
                        <div>
                          <p className="font-bold">{c.title} <span className="text-sm font-normal text-graphite tnum">· {num(c.points)} pts</span></p>
                          <p className="text-sm text-graphite">{c.description}</p>
                          <p className="text-xs text-muted">Termina el {date(c.endsAt)}</p>
                        </div>
                        <div>
                          <ProgressRule value={c.progress.target ? (c.progress.current / c.progress.target) * 100 : 0} showValue={false} label={`Progreso de ${c.title}`} />
                          <p className="mt-0.5 text-xs text-muted tnum">{num(c.progress.current)} / {num(c.progress.target)}</p>
                        </div>
                        {c.completed ? <Tag tone="success">Reclamado</Tag> : <Button variant="primary" size="sm" disabled={!ready} loading={claim.isPending && claim.variables === c.id} onClick={() => claim.mutate(c.id)}>Reclamar</Button>}
                      </li>
                    );
                  })}
                </ul>
              )}
            </Section>

            <Section title="Reconocimientos recibidos" actions={<Button variant="outline" size="sm" icon={<HeartHandshake className="size-4" />} onClick={() => setOpen(true)}>Reconocer a un compañero</Button>}>
              {m.recognitions.length === 0 ? (
                <p className="text-sm text-graphite">Aún no has recibido reconocimientos.</p>
              ) : (
                <ul className="divide-y divide-line border-y border-line">
                  {m.recognitions.map((r) => (
                    <li key={r.id} className="py-3">
                      <p className="text-sm"><span className="font-bold">{r.kind}</span> · de {fullName(r.from)} · <span className="text-muted">{date(r.createdAt)}</span></p>
                      <PlainText className="text-sm text-graphite">{r.message}</PlainText>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title="Historial de puntos">
              {m.recent.length === 0 ? (
                <EmptyState title="Aún no tienes puntos" description="Completa lecciones, evaluaciones o simulaciones para ganarlos." />
              ) : (
                <ul className="divide-y divide-line border-y border-line">
                  {m.recent.map((t) => (
                    <li key={t.id} className="flex items-center justify-between gap-4 py-2.5 text-sm">
                      <span className="min-w-0"><span className="font-semibold">{EVENTS[t.event] ?? t.event}</span>{t.reason && <span className="block truncate text-xs text-muted">{t.reason}</span>}</span>
                      <span className="shrink-0 text-right tnum"><span className="font-bold">{t.points > 0 ? '+' : ''}{t.points}</span><span className="block text-xs text-muted">{date(t.createdAt)}</span></span>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </>
        )}
      </Q>

      <Section title="Clasificación">
        <Leaderboard />
      </Section>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Reconocer a un compañero"
        description="Destaca algo concreto que esa persona hizo bien."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button variant="primary" loading={recognize.isPending} disabled={!to.length || !kind.trim() || !message.trim()} onClick={() => recognize.mutate()}>Enviar</Button>
          </>
        }
      >
        <div className="space-y-4">
          <ContactPicker selected={to} onChange={setTo} multi={false} label="Compañero" />
          <div>
            <Input label="Tipo de reconocimiento" required value={kind} onChange={(e) => setKind(e.target.value)} maxLength={60} list="kinds" />
            <datalist id="kinds">{KINDS.map((k) => <option key={k} value={k} />)}</datalist>
          </div>
          <Textarea label="Mensaje" required rows={3} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={500} />
        </div>
      </Modal>
    </div>
  );
}
