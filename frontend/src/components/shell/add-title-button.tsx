import Link from 'next/link';

/**
 * The primary "Add title" action (FIL-28 · FIL-44).
 *
 * The dashboard and the Library both put this exact button in their header
 * actions, so it lives once here. There is no shared Button primitive in the
 * codebase yet, and inventing one for a single variant would be guessing at an
 * API the design has not settled; this is the narrow, honest version.
 *
 * It is a `Link`, not a button, because the destination is a real, shareable
 * route. The `@modal` intercepting route turns an in-app click into a modal over
 * whatever view is underneath, while a pasted URL or a reload still renders the
 * full page. Making it a `button` that opened only a modal would throw that away.
 */
export function AddTitleButton() {
  return (
    <Link
      href="/titles/new"
      className="bg-accent text-text-on-accent rounded-[12px] px-[20px] py-[13px] text-[14px] font-semibold outline-offset-2 focus-visible:outline-2 focus-visible:outline-accent"
    >
      Add title
    </Link>
  );
}
