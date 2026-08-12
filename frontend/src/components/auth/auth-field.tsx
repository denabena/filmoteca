import type { InputHTMLAttributes } from 'react';

/*
 * A labelled input, matching the "Input / Field" component on the auth frames:
 * a 13px medium label above a rounded-12 field on Surface/Card Raised with a
 * Border/Strong outline. Everything else is a native <input>, so `id`, `type`,
 * `name`, `autoComplete`, `required` and friends pass straight through.
 *
 * `error` turns on the designed field-error state (FIL-16): the box takes a
 * Status/Danger border and the message sits directly below in Status/Danger Text,
 * associated with the input via `aria-describedby` + `aria-invalid` and announced
 * with `role="alert"`. This is the reusable treatment the other forms reuse. When
 * `error` is set it replaces `hint`, so only one line ever shows below the field.
 */
interface AuthFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  /** Muted helper text below the field, e.g. "At least 8 characters." */
  hint?: string;
  /** Danger message below the field; presence also switches the field to the error state. */
  error?: string;
}

export function AuthField({ id, label, hint, error, className, ...inputProps }: AuthFieldProps) {
  const invalid = Boolean(error);
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  const borderClass = invalid
    ? 'border-danger'
    : 'border-border-strong focus-visible:border-accent';

  return (
    <div className="flex w-full flex-col gap-[7px]">
      <label htmlFor={id} className="text-[13px] leading-none font-medium text-text-secondary">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className={`w-full rounded-xl border ${borderClass} bg-surface-card-raised px-4 py-[13px] text-[14px] leading-[1.5] text-text-primary outline-none placeholder:text-text-tertiary ${className ?? ''}`}
        {...inputProps}
      />
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-[13px] leading-[1.5] text-danger-text">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-[13px] leading-[1.5] text-text-tertiary">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
