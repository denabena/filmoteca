import type { InputHTMLAttributes } from 'react';

/*
 * A labelled input, matching the "Input / Field" component on the auth frames:
 * a 13px medium label above a rounded-12 field on Surface/Card Raised with a
 * Border/Strong outline. Everything else is a native <input>, so `id`, `type`,
 * `name`, `autoComplete`, `required` and friends pass straight through.
 */
interface AuthFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  /** Muted helper text below the field, e.g. "At least 8 characters." */
  hint?: string;
}

export function AuthField({ id, label, hint, className, ...inputProps }: AuthFieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;

  return (
    <div className="flex w-full flex-col gap-[7px]">
      <label htmlFor={id} className="text-[13px] leading-none font-medium text-text-secondary">
        {label}
      </label>
      <input
        id={id}
        aria-describedby={hintId}
        className={`w-full rounded-xl border border-border-strong bg-surface-card-raised px-4 py-[13px] text-[14px] leading-[1.5] text-text-primary outline-none placeholder:text-text-tertiary focus-visible:border-accent ${className ?? ''}`}
        {...inputProps}
      />
      {hint && (
        <p id={hintId} className="text-[13px] leading-[1.5] text-text-tertiary">
          {hint}
        </p>
      )}
    </div>
  );
}
