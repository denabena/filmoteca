import type { ButtonHTMLAttributes } from 'react';

/*
 * The two button styles the auth frames use: an accent primary and a
 * Surface/Card Raised secondary with a Border/Strong outline. Both are 43px tall
 * (py-[13px] on a 14px line) and full width inside the card.
 */
interface AuthButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
}

const VARIANTS = {
  primary: 'bg-accent text-text-on-accent',
  secondary: 'border border-border-strong bg-surface-card-raised text-text-primary',
} as const;

export function AuthButton({
  variant = 'primary',
  className,
  type = 'button',
  ...buttonProps
}: AuthButtonProps) {
  return (
    <button
      type={type}
      className={`flex w-full items-center justify-center rounded-xl px-5 py-[13px] text-[14px] font-semibold outline-offset-2 focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-60 ${VARIANTS[variant]} ${className ?? ''}`}
      {...buttonProps}
    />
  );
}
