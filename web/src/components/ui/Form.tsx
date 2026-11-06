import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import clsx from 'clsx';
import { ChevronDown } from 'lucide-react';

const control =
  'w-full rounded-sm border border-line-strong bg-paper px-3 text-[0.9375rem] text-ink placeholder:text-muted transition-colors hover:border-graphite focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink disabled:bg-stone disabled:text-muted aria-[invalid=true]:border-danger aria-[invalid=true]:ring-danger';

interface FieldProps {
  label?: ReactNode;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  className?: string;
  children: (id: string, describedBy?: string) => ReactNode;
}

/** Envoltorio accesible: etiqueta, ayuda y error asociados por id. */
export function Field({ label, hint, error, required, className, children }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errId = error ? `${id}-err` : undefined;
  return (
    <div className={clsx('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={id} className="text-[0.8125rem] font-semibold text-ink">
          {label}
          {required && <span className="text-orange-deep" aria-hidden> *</span>}
        </label>
      )}
      {children(id, [hintId, errId].filter(Boolean).join(' ') || undefined)}
      {hint && !error && (
        <p id={hintId} className="text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errId} className="text-xs font-semibold text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & { label?: ReactNode; hint?: ReactNode; error?: string; wrapperClassName?: string };

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ label, hint, error, wrapperClassName, className, required, ...rest }, ref) {
  return (
    <Field label={label} hint={hint} error={error} required={required} className={wrapperClassName}>
      {(id, desc) => <input ref={ref} id={id} aria-describedby={desc} aria-invalid={!!error || undefined} required={required} className={clsx(control, 'h-10', className)} {...rest} />}
    </Field>
  );
});

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: ReactNode; hint?: ReactNode; error?: string; wrapperClassName?: string };

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea({ label, hint, error, wrapperClassName, className, required, rows = 4, ...rest }, ref) {
  return (
    <Field label={label} hint={hint} error={error} required={required} className={wrapperClassName}>
      {(id, desc) => (
        <textarea ref={ref} id={id} rows={rows} aria-describedby={desc} aria-invalid={!!error || undefined} required={required} className={clsx(control, 'py-2 leading-relaxed', className)} {...rest} />
      )}
    </Field>
  );
});

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: ReactNode;
  hint?: ReactNode;
  error?: string;
  wrapperClassName?: string;
  options: { value: string | number; label: string }[];
  placeholder?: string;
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, error, wrapperClassName, className, options, placeholder, required, ...rest },
  ref,
) {
  return (
    <Field label={label} hint={hint} error={error} required={required} className={wrapperClassName}>
      {(id, desc) => (
        <div className="relative">
          <select ref={ref} id={id} aria-describedby={desc} aria-invalid={!!error || undefined} required={required} className={clsx(control, 'h-10 appearance-none pr-9', className)} {...rest}>
            {placeholder !== undefined && <option value="">{placeholder}</option>}
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-graphite" aria-hidden />
        </div>
      )}
    </Field>
  );
});

export function Checkbox({ label, hint, className, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode; hint?: ReactNode }) {
  const id = useId();
  return (
    <div className={clsx('flex items-start gap-2.5', className)}>
      <input id={id} type="checkbox" className="mt-0.5 size-4 shrink-0 accent-ink" {...rest} />
      <label htmlFor={id} className="text-sm leading-snug">
        <span className="font-medium">{label}</span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </label>
    </div>
  );
}

/** Interruptor accesible (role=switch). */
export function Switch({ checked, onChange, label, hint, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; hint?: ReactNode; disabled?: boolean }) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-6">
      <label htmlFor={id} className="text-sm">
        <span className="font-semibold">{label}</span>
        {hint && <span className="mt-0.5 block text-xs text-muted">{hint}</span>}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={clsx(
          'relative h-6 w-11 shrink-0 rounded-sm border transition-colors disabled:opacity-40',
          checked ? 'border-ink bg-ink' : 'border-line-strong bg-stone',
        )}
      >
        <span className={clsx('absolute top-0.5 size-4.5 rounded-xs transition-transform duration-200 ease-out', checked ? 'translate-x-[22px] bg-orange' : 'translate-x-0.5 bg-paper border border-line-strong')} />
      </button>
    </div>
  );
}

export function FormActions({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx('flex flex-wrap items-center justify-end gap-3 border-t border-line pt-5', className)}>{children}</div>;
}
