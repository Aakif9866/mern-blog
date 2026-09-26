import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";
import clsx from "clsx";

const field =
  "w-full rounded-lg border border-line bg-surface px-3 text-base sm:text-sm text-ink placeholder:text-ink-soft/70 transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-60";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(function Input(
  { className, invalid, ...rest },
  ref
) {
  return <input ref={ref} className={clsx(field, "h-11 sm:h-10", invalid && "border-red-500", className)} aria-invalid={invalid || undefined} {...rest} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(function Textarea(
  { className, invalid, ...rest },
  ref
) {
  return <textarea ref={ref} className={clsx(field, "py-2.5 leading-relaxed", invalid && "border-red-500", className)} {...rest} />;
});

/** Label + control + hint/error. The render prop receives the id to put on the control. */
export function Field({ label, hint, error, children }: { label: string; hint?: ReactNode; error?: string; children: (id: string) => ReactNode }) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>
      {children(id)}
      {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : hint ? <p className="text-xs text-ink-soft">{hint}</p> : null}
    </div>
  );
}
