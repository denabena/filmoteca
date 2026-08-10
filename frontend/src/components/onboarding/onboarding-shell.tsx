import type { ReactNode } from 'react';
import { SceneLogo } from '@/components/sidebar/icons';

/*
 * The shell shared by the two onboarding setup steps (Figma frames 02 and 03):
 * the Scene wordmark and a two-dot progress indicator above a centred card on the
 * canvas, with the same ambient glow as the auth screens. `step` marks which of
 * the two dots is active.
 */
interface OnboardingShellProps {
  step: 1 | 2;
  children: ReactNode;
}

export function OnboardingShell({ step, children }: OnboardingShellProps) {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center gap-7 overflow-hidden bg-canvas px-4">
      {/* Ambient glow, decorative. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 size-[520px] -translate-x-1/2 -translate-y-1/2"
        style={{
          background: 'radial-gradient(circle, rgba(240,69,95,0.18) 0%, rgba(240,69,95,0) 70%)',
        }}
      />

      <div className="relative flex items-center gap-[11px]">
        <SceneLogo className="size-[34px] shrink-0" />
        <span className="font-display text-[20px] leading-none font-bold tracking-[-0.2px] text-text-primary">
          Scene
        </span>
      </div>

      {/* Progress dots. The "STEP N OF 2" overline in the card carries this for
          assistive tech, so the dots are decorative. */}
      <div className="relative flex items-center gap-1.5" aria-hidden="true">
        <span
          className={`h-1.5 rounded-full ${step === 1 ? 'w-4 bg-accent' : 'w-1.5 bg-border-strong'}`}
        />
        <span
          className={`h-1.5 rounded-full ${step === 2 ? 'w-4 bg-accent' : 'w-1.5 bg-border-strong'}`}
        />
      </div>

      {children}
    </main>
  );
}
