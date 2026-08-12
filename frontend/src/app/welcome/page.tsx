import Link from 'next/link';
import { SceneLogo } from '@/components/sidebar/icons';
import { WelcomePanel } from '@/components/welcome-panel';

/**
 * The Welcome screen (Figma frame 01 · WEL-1, WEL-2, WEL-5), the marketing pitch
 * that opens the app, at `/welcome`. Outside the app shell: no sidebar, no header.
 *
 * This ticket (FIL-21) builds the left column. The "Already have an account?
 * Sign in" link (WEL-3) and the decorative right panel (WEL-4) are FIL-22, so the
 * panel is an empty gradient for now.
 *
 * A31: "Get started" opens account creation (frame 21 now exists); the two setup
 * steps follow. Confirm with the designer before shipping, per the ticket note.
 */
export default function WelcomePage() {
  return (
    <main className="flex min-h-screen bg-canvas">
      <div className="flex min-h-screen w-full flex-col justify-between px-8 pt-16 pb-14 lg:w-[600px] lg:px-[72px]">
        <div className="flex items-center gap-[11px]">
          <SceneLogo className="size-9 shrink-0" />
          <span className="font-display text-[20px] leading-none font-bold tracking-[-0.2px] text-text-primary">
            Scene
          </span>
        </div>

        <div className="flex flex-col items-start gap-5">
          <p className="text-[11px] leading-none font-medium tracking-[0.88px] text-accent">
            TRACK EVERYTHING YOU WATCH
          </p>
          <h1 className="font-display text-[42px] leading-[1.04] font-bold tracking-[-0.84px] text-text-primary">
            Every movie and show, in one place.
          </h1>
          <p className="max-w-[420px] text-[15px] leading-[1.55] text-text-secondary">
            Build your watchlist, rate what you&apos;ve seen, and let Scene Picker tell you exactly
            what to watch next.
          </p>
          <Link
            href="/auth/sign-up"
            className="mt-2 inline-flex items-center justify-center rounded-xl bg-accent px-5 py-[13px] text-[14px] font-semibold text-text-on-accent outline-offset-2 focus-visible:outline-2 focus-visible:outline-accent"
          >
            Get started
          </Link>
          <div className="flex items-center gap-1.5 text-[14px]">
            <span className="leading-[1.5] text-text-tertiary">Already have an account?</span>
            <Link href="/auth/sign-in" className="font-semibold text-accent">
              Sign in
            </Link>
          </div>
        </div>

        <p className="text-[11.5px] leading-[1.4] text-text-tertiary">
          © 2025 Scene · Made for film lovers
        </p>
      </div>

      <WelcomePanel />
    </main>
  );
}
