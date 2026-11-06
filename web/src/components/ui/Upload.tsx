import { useRef, useState, type DragEvent } from 'react';
import clsx from 'clsx';
import { FileUp, X } from 'lucide-react';
import { fileSize } from '@/lib/format';

/** Zona de carga de archivos con arrastrar y soltar. Devuelve File[]; la subida la hace quien la usa. */
export function FileDrop({
  files,
  onChange,
  accept,
  multiple = true,
  maxFiles = 5,
  maxMb,
  hint,
  label = 'Arrastra archivos aquí o selecciónalos',
}: {
  files: File[];
  onChange: (f: File[]) => void;
  accept?: string;
  multiple?: boolean;
  maxFiles?: number;
  maxMb?: number;
  hint?: string;
  label?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const add = (list: FileList | null) => {
    if (!list) return;
    const incoming = Array.from(list);
    const tooBig = maxMb ? incoming.find((f) => f.size > maxMb * 1024 * 1024) : undefined;
    if (tooBig) return setError(`«${tooBig.name}» supera ${maxMb} MB`);
    const next = multiple ? [...files, ...incoming].slice(0, maxFiles) : incoming.slice(0, 1);
    setError(null);
    onChange(next);
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    add(e.dataTransfer.files);
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        className={clsx(
          'flex w-full flex-col items-center justify-center gap-2 rounded-sm border border-dashed px-4 py-8 text-center transition-colors',
          over ? 'border-ink bg-orange-soft' : 'border-line-strong bg-stone hover:border-ink',
        )}
      >
        <FileUp className="size-5" aria-hidden />
        <span className="text-sm font-semibold">{label}</span>
        {hint && <span className="text-xs text-muted">{hint}</span>}
      </button>
      <input ref={input} type="file" className="sr-only" accept={accept} multiple={multiple} onChange={(e) => add(e.target.files)} tabIndex={-1} />
      {error && <p className="mt-2 text-xs font-semibold text-danger">{error}</p>}
      {files.length > 0 && (
        <ul className="mt-3 divide-y divide-line border-y border-line">
          {files.map((f, i) => (
            <li key={i} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span className="truncate">{f.name}</span>
              <span className="flex items-center gap-3">
                <span className="text-xs text-muted tnum">{fileSize(f.size)}</span>
                <button type="button" aria-label={`Quitar ${f.name}`} onClick={() => onChange(files.filter((_, j) => j !== i))} className="text-graphite hover:text-danger">
                  <X className="size-4" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
