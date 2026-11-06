import { useEffect, useRef, useState } from 'react';
import { Circle, Square } from 'lucide-react';
import { Button } from '@/components/ui/Button';

/** Graba audio o video desde el navegador (MediaRecorder) y entrega un File .webm. */
export function Recorder({ mode, onRecorded }: { mode: 'audio' | 'video'; onRecorded: (f: File) => void }) {
  const [state, setState] = useState<'idle' | 'rec' | 'done'>('idle');
  const [secs, setSecs] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const live = useRef<HTMLVideoElement>(null);

  const stopTracks = () => stream.current?.getTracks().forEach((t) => t.stop());
  useEffect(
    () => () => {
      stopTracks();
      if (preview) URL.revokeObjectURL(preview);
    },
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );
  useEffect(() => {
    if (state !== 'rec') return;
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [state]);

  const supported = typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined';

  async function start() {
    setError(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia(mode === 'video' ? { audio: true, video: true } : { audio: true });
      stream.current = s;
      if (live.current) live.current.srcObject = s;
      chunks.current = [];
      const mr = new MediaRecorder(s);
      mr.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(chunks.current, { type: mode === 'video' ? 'video/webm' : 'audio/webm' });
        const file = new File([blob], `grabacion-${mode}-${Date.now()}.webm`, { type: blob.type });
        if (preview) URL.revokeObjectURL(preview);
        setPreview(URL.createObjectURL(blob));
        stopTracks();
        setState('done');
        onRecorded(file);
      };
      rec.current = mr;
      mr.start();
      setSecs(0);
      setState('rec');
    } catch {
      setError('No se pudo acceder al micrófono o la cámara. Revisa los permisos del navegador.');
      stopTracks();
    }
  }

  if (!supported) return <p className="text-sm text-muted">Tu navegador no permite grabar desde aquí; sube un archivo.</p>;
  return (
    <div className="border border-line-strong p-4">
      <p className="mb-3 text-sm font-semibold">Grabar {mode === 'video' ? 'video' : 'audio'} ahora</p>
      {mode === 'video' && state === 'rec' && <video ref={live} autoPlay muted playsInline className="mb-3 aspect-video w-full max-w-md bg-ink" />}
      {state === 'done' && preview && (mode === 'video' ? <video src={preview} controls className="mb-3 aspect-video w-full max-w-md bg-ink" /> : <audio src={preview} controls className="mb-3 w-full max-w-md" />)}
      <div className="flex flex-wrap items-center gap-3">
        {state !== 'rec' ? (
          <Button variant="outline" size="sm" icon={<Circle className="size-3.5 fill-danger text-danger" />} onClick={start}>
            {state === 'done' ? 'Grabar de nuevo' : 'Iniciar grabación'}
          </Button>
        ) : (
          <Button variant="danger" size="sm" icon={<Square className="size-3.5" />} onClick={() => rec.current?.stop()}>
            Detener
          </Button>
        )}
        {state === 'rec' && <span className="text-sm font-bold text-danger tnum" role="timer">{Math.floor(secs / 60)}:{String(secs % 60).padStart(2, '0')}</span>}
        {state === 'done' && <span className="text-sm font-medium">Grabación adjuntada a la entrega.</span>}
      </div>
      {error && <p className="mt-2 text-xs font-semibold text-danger">{error}</p>}
    </div>
  );
}
