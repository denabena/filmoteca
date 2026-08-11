/* eslint-disable @next/next/no-img-element --
 * These are the icons exported from Figma, 230 to 380 byte SVGs served from
 * /public. `next/image` does not optimise SVG at all, so routing them through it
 * would add a loader round trip per icon and buy nothing. Centralised here so the
 * rule is suppressed once, with a reason, rather than at nine call sites.
 */

/**
 * A decorative icon from the design.
 *
 * Always `aria-hidden`: every one of these sits beside text that already says
 * what it means, so announcing it would only repeat that text.
 */
export function Icon({ src, className }: { src: string; className: string }) {
  return <img src={src} alt="" aria-hidden="true" className={className} />;
}
