/*
 * Sidebar icons, inlined from the Figma exports rather than linked, because the
 * MCP asset URLs expire after seven days. Geometry is copied verbatim from the
 * exports; only the hardcoded fills became `currentColor` so one icon can render
 * in both the active (accent) and inactive (tertiary) nav colours.
 */

interface IconProps {
  className?: string;
}

/**
 * The Scene mark: a rounded accent tile with a play triangle. Brand colours are
 * fixed here rather than inherited, because the mark is the same on every
 * surface.
 *
 * The triangle carries a 1px black stroke in the Figma export. It looks like an
 * unintended Figma default rather than a design choice, but it is reproduced
 * faithfully until the designer confirms (see the note on FIL-27).
 */
export function SceneLogo({ className }: IconProps) {
  return (
    <svg
      className={className}
      width="34"
      height="34"
      viewBox="0 0 34 34"
      fill="none"
      aria-hidden="true"
    >
      <rect width="34" height="34" rx="9" fill="#F0455F" />
      <path d="M13 10L24 17L13 24V10Z" fill="white" stroke="black" />
    </svg>
  );
}

/** Four squares, 9x9 on an 11px pitch. */
export function DashboardIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <rect width="9" height="9" rx="2.5" />
      <rect x="11" width="9" height="9" rx="2.5" />
      <rect y="11" width="9" height="9" rx="2.5" />
      <rect x="11" y="11" width="9" height="9" rx="2.5" />
    </svg>
  );
}

/** Three bars, the middle one taller. */
export function LibraryIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <rect x="1.5" y="2.5" width="4.6" height="15" rx="1.5" />
      <rect x="7.8" y="1" width="4.6" height="18" rx="1.5" />
      <rect x="14.1" y="2.5" width="4.6" height="15" rx="1.5" />
    </svg>
  );
}

/** Four-point sparkle, matching the "SCENE PICKER" overline icon. */
export function PickerIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M10 0.5L12.5527 7.44734L19.5 10L12.5527 12.5527L10 19.5L7.44734 12.5527L0.5 10L7.44734 7.44734L10 0.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

/**
 * Three slider tracks with knobs. The design paints the knob centres in the
 * surface colour to punch the track out behind each ring, so the fill has to
 * follow whichever surface the icon sits on. `--icon-mask` is set by the nav
 * item: sidebar colour when inactive, raised card colour when active.
 *
 * The artwork is 20.9 tall inside a 20px box, so it overflows the bottom edge by
 * design; the height is set explicitly rather than stretched to fit.
 */
export function SettingsIcon({ className }: IconProps) {
  return (
    <span className={`relative block ${className ?? ''}`}>
      <svg
        className="absolute top-0 left-0 h-[20.9px] w-5"
        width="20"
        height="20.9"
        viewBox="0 0 20 20.9"
        fill="none"
        aria-hidden="true"
      >
        <rect x="1" y="3.5" width="18" height="2.4" rx="1.2" fill="currentColor" />
        <circle cx="6.8" cy="4.7" r="3.2" fill="var(--icon-mask)" />
        <circle cx="6.8" cy="4.7" r="2.2" stroke="currentColor" strokeWidth="2" />
        <rect x="1" y="10" width="18" height="2.4" rx="1.2" fill="currentColor" />
        <circle cx="14.8" cy="11.2" r="3.2" fill="var(--icon-mask)" />
        <circle cx="14.8" cy="11.2" r="2.2" stroke="currentColor" strokeWidth="2" />
        <rect x="1" y="16.5" width="18" height="2.4" rx="1.2" fill="currentColor" />
        <circle cx="6.8" cy="17.7" r="3.2" fill="var(--icon-mask)" />
        <circle cx="6.8" cy="17.7" r="2.2" stroke="currentColor" strokeWidth="2" />
      </svg>
    </span>
  );
}
