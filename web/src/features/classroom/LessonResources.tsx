import { useState, type ReactNode } from 'react';
import { CalendarClock, CheckCircle2, Download, ExternalLink, FileText, Folder, MessagesSquare, Play, Video } from 'lucide-react';
import { ButtonLink } from '@/components/ui/Button';
import { Tag } from '@/components/ui/Data';
import { RESOURCE_TYPES, dateTime, fileSize } from '@/lib/format';
import type { FileOut, LessonResource } from './types';

export function embedUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const h = u.hostname.replace(/^www\./, '');
    if (h === 'youtu.be') return `https://www.youtube-nocookie.com/embed/${u.pathname.slice(1)}`;
    if (h === 'youtube.com' || h === 'youtube-nocookie.com' || h === 'm.youtube.com') {
      if (u.pathname.startsWith('/embed/')) return `https://www.youtube-nocookie.com${u.pathname}`;
      if (u.pathname.startsWith('/shorts/')) return `https://www.youtube-nocookie.com/embed/${u.pathname.split('/')[2]}`;
      const v = u.searchParams.get('v');
      if (v) return `https://www.youtube-nocookie.com/embed/${v}`;
    }
    if (h === 'vimeo.com') {
      const id = u.pathname.split('/').filter(Boolean).pop();
      if (id && /^\d+$/.test(id)) return `https://player.vimeo.com/video/${id}?dnt=1`;
    }
    if (h === 'player.vimeo.com') return `https://player.vimeo.com${u.pathname}?dnt=1`;
  } catch {
    /* url inválida */
  }
  return null;
}
const domain = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};
const fname = (f: FileOut) => f.originalName ?? f.name ?? 'archivo';
const isPdf = (f: FileOut) => f.mimeType === 'application/pdf';
const actionCls = 'inline-flex h-8 items-center gap-2 rounded-sm border border-ink px-3 text-[0.8125rem] font-semibold no-underline hover:bg-ink hover:text-paper';

function Row({ r, icon, children, actions }: { r: LessonResource; icon: ReactNode; children?: ReactNode; actions?: ReactNode }) {
  return (
    <li className="py-5">
      <div className="flex flex-wrap items-start gap-3 sm:flex-nowrap">
        <span className="mt-1 text-graphite" aria-hidden>{icon}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-semibold leading-snug">{r.title}</h4>
            {r.isRequired && <Tag tone="orange">Obligatorio</Tag>}
            {r.viewed && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold">
                <CheckCircle2 className="size-3.5" aria-hidden /> Visto
              </span>
            )}
          </div>
          {r.description && <p className="mt-1 text-sm text-graphite">{r.description}</p>}
          {children && <div className="mt-3">{children}</div>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap justify-end gap-2">{actions}</div>}
      </div>
    </li>
  );
}

function Player({ src, kind, onPlay, title }: { src: string; kind: 'video' | 'audio'; onPlay: () => void; title: string }) {
  if (kind === 'audio') return <audio controls preload="none" src={src} onPlay={onPlay} className="w-full" aria-label={title} />;
  return <video controls preload="metadata" src={src} onPlay={onPlay} className="aspect-video w-full bg-ink" aria-label={title} />;
}

/** Iframe bajo demanda: se carga al pulsar (y marca el recurso como visto). */
function LazyFrame({ src, title, onOpen, label = 'Reproducir', ratio = 'aspect-video' }: { src: string; title: string; onOpen: () => void; label?: string; ratio?: string }) {
  const [on, setOn] = useState(false);
  if (!on)
    return (
      <button
        type="button"
        onClick={() => {
          setOn(true);
          onOpen();
        }}
        className={`${ratio} flex w-full items-center justify-center gap-2 bg-ink text-paper hover:bg-graphite`}
      >
        <Play className="size-5 text-orange" aria-hidden /> <span className="font-semibold">{label}</span>
        <span className="sr-only">: {title}</span>
      </button>
    );
  return <iframe src={src} title={title} className={`${ratio} w-full border-0 bg-stone`} allow="fullscreen; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />;
}

function Resource({ r, onView, lessonId }: { r: LessonResource; onView: (id: number) => void; lessonId: number }) {
  const view = () => onView(r.id);
  const dl = (f: FileOut) => (
    <a href={f.url} download onClick={view} className={actionCls}>
      <Download className="size-4" aria-hidden /> Descargar <span className="font-normal text-muted tnum">{fileSize(f.size)}</span>
    </a>
  );
  const ext = (url: string, label = 'Abrir enlace') => (
    <a href={url} target="_blank" rel="noopener noreferrer" onClick={view} className={actionCls}>
      <ExternalLink className="size-4" aria-hidden /> {label}
    </a>
  );

  switch (r.type) {
    case 'VIDEO':
    case 'RECORDING': {
      const src = r.file?.url ?? r.url ?? r.event?.recordingUrl ?? null;
      const emb = embedUrl(src);
      return (
        <Row r={r} icon={<Video className="size-5" />} actions={src && !emb && !r.file ? ext(src, 'Abrir grabación') : undefined}>
          {r.file ? (
            <Player src={r.file.url} kind="video" onPlay={view} title={r.title} />
          ) : emb ? (
            <LazyFrame src={emb} title={r.title} onOpen={view} />
          ) : src && /\.(mp4|webm|mov|ogg)(\?|$)/i.test(src) ? (
            <Player src={src} kind="video" onPlay={view} title={r.title} />
          ) : !src ? (
            <p className="text-sm text-muted">Aún no hay grabación disponible.</p>
          ) : (
            <p className="text-sm text-graphite">Alojado en {domain(src)}.</p>
          )}
        </Row>
      );
    }
    case 'AUDIO': {
      const src = r.file?.url ?? r.url;
      return (
        <Row r={r} icon={<Play className="size-5" />}>
          {src ? <Player src={src} kind="audio" onPlay={view} title={r.title} /> : <p className="text-sm text-muted">Sin archivo de audio.</p>}
        </Row>
      );
    }
    case 'PRESENTATION':
    case 'DOCUMENT':
    case 'FILE': {
      const f = r.file;
      return (
        <Row r={r} icon={<FileText className="size-5" />} actions={f ? dl(f) : r.url ? ext(r.url) : undefined}>
          {f && <p className="mb-2 text-sm text-graphite">{fname(f)}</p>}
          {f && isPdf(f) && r.type !== 'FILE' && <LazyFrame src={f.url} title={r.title} onOpen={view} label="Abrir visor" ratio="aspect-[4/3]" />}
          {!f && !r.url && <p className="text-sm text-muted">Sin archivo adjunto.</p>}
        </Row>
      );
    }
    case 'FOLDER':
      return (
        <Row r={r} icon={<Folder className="size-5" />}>
          {r.folder?.files.length ? (
            <ul className="divide-y divide-line border-y border-line">
              {r.folder.files.map((f) => (
                <li key={f.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="min-w-0 truncate">{fname(f)}</span>
                  <span className="flex shrink-0 items-center gap-3">
                    <span className="text-xs text-muted tnum">{fileSize(f.size)}</span>
                    <a href={f.url} download onClick={view} className="font-semibold underline underline-offset-4" aria-label={`Descargar ${fname(f)}`}>
                      Descargar
                    </a>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">La carpeta está vacía.</p>
          )}
        </Row>
      );
    case 'LINK':
      return (
        <Row r={r} icon={<ExternalLink className="size-5" />} actions={r.url ? ext(r.url) : undefined}>
          {r.url && <p className="text-sm text-graphite">{domain(r.url)}</p>}
        </Row>
      );
    case 'EMBED': {
      const emb = embedUrl(r.url);
      return (
        <Row r={r} icon={<Play className="size-5" />} actions={r.url && !emb ? ext(r.url) : undefined}>
          {emb ? <LazyFrame src={emb} title={r.title} onOpen={view} /> : r.url ? <p className="text-sm text-graphite">Este contenido se abre en {domain(r.url)}.</p> : null}
        </Row>
      );
    }
    case 'LIVE_SESSION': {
      const e = r.event;
      return (
        <Row
          r={r}
          icon={<CalendarClock className="size-5" />}
          actions={
            e?.meetingUrl ? (
              <a href={e.meetingUrl} target="_blank" rel="noopener noreferrer" onClick={view} className="inline-flex h-8 items-center gap-2 rounded-sm border border-orange bg-orange px-3 text-[0.8125rem] font-semibold no-underline hover:bg-[#f28c48]">
                <Video className="size-4" aria-hidden /> Unirse a la clase
              </a>
            ) : (
              <Tag tone="warning">Enlace pendiente</Tag>
            )
          }
        >
          {e ? (
            <p className="text-sm text-graphite tnum">
              {dateTime(e.startAt)} — {dateTime(e.endAt)}
              {e.recordingUrl && (
                <>
                  {' · '}
                  <a href={e.recordingUrl} target="_blank" rel="noopener noreferrer" onClick={view} className="font-semibold underline underline-offset-4">
                    Ver grabación
                  </a>
                </>
              )}
            </p>
          ) : (
            <p className="text-sm text-muted">Fecha por confirmar.</p>
          )}
        </Row>
      );
    }
    case 'ASSESSMENT': {
      const a = r.assessment;
      return (
        <Row
          r={r}
          icon={<FileText className="size-5" />}
          actions={
            a && (
              <ButtonLink to={`/campus/evaluaciones/${a.id}`} state={{ lessonId }} size="sm" variant="outline" onClick={view}>
                {a.attemptsUsed ? 'Ver evaluación' : 'Ir al examen'}
              </ButtonLink>
            )
          }
        >
          {a && (
            <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-graphite tnum">
              <span>
                Intentos: {a.attemptsUsed}/{a.maxAttempts === 0 ? '∞' : a.maxAttempts}
              </span>
              <span>Mejor nota: {a.bestPercentage != null ? `${a.bestPercentage} %` : '—'}</span>
              <span>Mínima: {a.passingScore} %</span>
              {a.passed != null && <Tag tone={a.passed ? 'success' : 'danger'}>{a.passed ? 'Aprobado' : 'No aprobado'}</Tag>}
            </p>
          )}
        </Row>
      );
    }
    case 'FORUM': {
      const f = r.forum;
      return (
        <Row
          r={r}
          icon={<MessagesSquare className="size-5" />}
          actions={
            f && (
              <ButtonLink to={`/campus/comunidad/foro/${f.id}`} size="sm" variant="outline" onClick={view}>
                Ir al foro
              </ButtonLink>
            )
          }
        >
          {f && (
            <p className="text-sm text-graphite tnum">
              {f.title} · {f.threadCount} {f.threadCount === 1 ? 'hilo' : 'hilos'}
            </p>
          )}
        </Row>
      );
    }
    case 'ACTIVITY': {
      const a = r.activity;
      return (
        <Row
          r={r}
          icon={<FileText className="size-5" />}
          actions={
            a && (
              <ButtonLink to={`/campus/practicas/${a.id}`} state={{ lessonId }} size="sm" variant="outline" onClick={view}>
                {a.submitted ? 'Ver entrega' : 'Ir a la práctica'}
              </ButtonLink>
            )
          }
        >
          {a && (
            <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-graphite">
              <Tag tone={a.submitted ? 'success' : 'warning'}>{a.submitted ? (a.status === 'GRADED' ? 'Calificada' : a.status === 'RETURNED' ? 'Devuelta' : 'Entregada') : 'Sin entregar'}</Tag>
              {a.dueDate && <span className="tnum">Fecha límite: {dateTime(a.dueDate)}</span>}
            </p>
          )}
        </Row>
      );
    }
    default:
      return <Row r={r} icon={<FileText className="size-5" />} actions={r.url ? ext(r.url) : r.file ? dl(r.file) : undefined} />;
  }
}

const ORDER = ['VIDEO', 'RECORDING', 'LIVE_SESSION', 'AUDIO', 'PRESENTATION', 'DOCUMENT', 'FILE', 'FOLDER', 'LINK', 'EMBED', 'ASSESSMENT', 'FORUM', 'ACTIVITY'];

export function LessonResources({ resources, lessonId, onView }: { resources: LessonResource[]; lessonId: number; onView: (id: number) => void }) {
  const groups = ORDER.map((t) => ({ t, items: resources.filter((r) => r.type === t) })).filter((g) => g.items.length);
  const other = resources.filter((r) => !ORDER.includes(r.type));
  if (other.length) groups.push({ t: 'OTHER', items: other });
  if (!groups.length) return null;
  return (
    <div className="mt-12">
      <h2 className="mb-1 text-xl font-bold tracking-tight">Recursos de la lección</h2>
      {groups.map((g) => (
        <section key={g.t} className="mt-6" aria-label={RESOURCE_TYPES[g.t] ?? 'Otros recursos'}>
          <h3 className="border-b border-ink pb-1.5 text-sm font-bold">
            {RESOURCE_TYPES[g.t] ?? 'Otros'} <span className="font-normal text-muted tnum">({g.items.length})</span>
          </h3>
          <ul className="divide-y divide-line">
            {g.items.map((r) => (
              <Resource key={r.id} r={r} onView={onView} lessonId={lessonId} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
