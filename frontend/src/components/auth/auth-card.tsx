import type { ReactNode } from 'react';
import { SceneLogo } from '@/components/sidebar/icons';

/*
 * The shell shared by every auth screen (Figma frames 18-25): the Scene wordmark
 * above a centred card on the canvas, with the ambient glow behind it. Sign in
 * and Create account differ only in their heading and body, so both render
 * through here for a pixel-identical frame.
 *
 * The glow is the one asset not taken from its Figma export: the export is a
 * blurred radial fill, and a CSS radial-gradient reproduces it exactly without a
 * remote URL that expires in seven days. Icons in this repo are inlined for the
 * same reason (see components/sidebar/icons.tsx).
 */
interface AuthCardProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

export function AuthCard({ title, subtitle, children }: AuthCardProps) {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center gap-7 overflow-hidden bg-canvas px-4">
      {/* Ambient glow, centred behind the card. Decorative, so aria-hidden. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 size-[520px] -translate-x-1/2 -translate-y-1/2"
        style={{
          background: 'radial-gradient(circle, rgba(240,69,95,0.18) 0%, rgba(240,69,95,0) 70%)',
        }}
      />

      <div className="relative flex items-center gap-[11px]">
        <SceneLogo className="size-9 shrink-0" />
        <span className="font-display text-[20px] leading-none font-bold tracking-[-0.2px] text-text-primary">
          Scene
        </span>
      </div>

      <div className="relative flex w-[440px] max-w-full flex-col gap-5 rounded-2xl border border-border-default bg-surface-card p-8">
        <header className="flex flex-col gap-2.5">
          <h1 className="font-display text-[24px] leading-[1.16] font-bold tracking-[-0.24px] text-text-primary">
            {title}
          </h1>
          <p className="text-[14px] leading-[1.5] text-text-secondary">{subtitle}</p>
        </header>

        {children}
      </div>
    </main>
  );
}
