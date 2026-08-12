/*
 * The decorative right panel of the Welcome screen (frame 01 · WEL-4): three
 * tilted poster cards, a "4.5 rated" chip and a "NOW WATCHING" card. Display only
 * and carries no information a user needs, so the whole panel is aria-hidden and
 * nothing inside is interactive.
 *
 * The posters are ambient gradient cards reproduced in CSS rather than exported
 * assets (the Figma asset URLs expire), matching how the app inlines its other
 * decorative art.
 */
function PlayGlyph() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
      <path d="M10 8L18 13L10 18V8Z" fill="white" fillOpacity="0.85" />
    </svg>
  );
}

function Poster({ className, gradient }: { className: string; gradient: string }) {
  return (
    <div
      className={`absolute flex items-center justify-center rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.45)] ${className}`}
      style={{ background: gradient }}
    >
      <PlayGlyph />
    </div>
  );
}

export function WelcomePanel() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none relative hidden flex-1 overflow-hidden lg:block"
      style={{ background: 'linear-gradient(to bottom, #13161c, #1f1a30)' }}
    >
      <div className="absolute left-1/2 top-1/2 h-[300px] w-[420px] -translate-x-1/2 -translate-y-1/2">
        {/* Three tilted posters, centre largest. */}
        <Poster
          className="left-0 top-8 h-[232px] w-[158px] -rotate-[8deg]"
          gradient="linear-gradient(160deg, #E8A33D, #C97F2A)"
        />
        <Poster
          className="right-0 top-12 h-[232px] w-[158px] rotate-[8deg]"
          gradient="linear-gradient(160deg, #33B1C4, #2A8C9C)"
        />
        <Poster
          className="left-1/2 top-0 h-[300px] w-[206px] -translate-x-1/2"
          gradient="linear-gradient(160deg, #8E7BF2, #6E5CD6)"
        />

        {/* "4.5 rated" chip, top-right. */}
        <div className="absolute -right-8 -top-6 flex items-center gap-2 rounded-full border border-border-strong bg-surface-elevated py-2.5 pl-[14px] pr-4 shadow-[0_10px_24px_rgba(0,0,0,0.4)]">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="#E0A63D" aria-hidden="true">
            <path d="M8 1l2.09 4.24 4.68.68-3.38 3.3.8 4.66L8 11.77 3.81 13.9l.8-4.66L1.23 5.92l4.68-.68L8 1z" />
          </svg>
          <span className="text-[13px] font-semibold text-text-primary">4.5 rated</span>
        </div>

        {/* "NOW WATCHING" card, bottom-centre. */}
        <div className="absolute -bottom-16 left-1/2 flex w-[330px] -translate-x-1/2 items-center gap-3.5 rounded-[14px] border border-border-strong bg-surface-elevated py-3.5 pl-4 pr-5 shadow-[0_16px_34px_rgba(0,0,0,0.45)]">
          <div
            className="h-16 w-11 shrink-0 rounded-md"
            style={{ background: 'linear-gradient(160deg, #6E5CD6, #4E86E8)' }}
          />
          <div className="flex flex-1 flex-col gap-[5px]">
            <span className="text-[11px] font-medium tracking-[0.88px] text-accent">
              NOW WATCHING
            </span>
            <span className="text-[14px] font-semibold text-text-primary">Severance · S2 E4</span>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#232a32]">
              <div className="h-1.5 rounded-full bg-accent" style={{ width: '55%' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
