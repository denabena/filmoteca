import { posterUrl } from '@/lib/dashboard';
import { Icon } from './icon';

/**
 * Poster art, or the placeholder the design draws when there is none.
 *
 * Most titles have no poster: `posterPath` is only ever populated by the Picker
 * copying it off a TMDB candidate, so a hand-typed title has none (A17). The
 * design's empty hero shows a plain muted rectangle for exactly this case, so the
 * placeholder is the designed state rather than a fallback.
 *
 * A plain `<img>` rather than `next/image`: dimensions are fixed at every call
 * site so there is no layout shift to prevent, and it avoids adding TMDB to
 * `images.remotePatterns`, which would make the build depend on a third-party
 * host being reachable.
 */
/* eslint-disable @next/next/no-img-element -- see the note above. */
export function Poster({
  posterPath,
  name,
  className,
  size = 'w342',
}: {
  posterPath: string | null;
  name: string;
  className: string;
  size?: 'w185' | 'w342';
}) {
  const url = posterUrl(posterPath, size);

  if (!url) {
    return (
      <div
        className={`${className} bg-surface-muted flex items-center justify-center`}
        // Decorative: the title is already rendered beside it as text, so
        // announcing "no poster for X" would only repeat it to a screen reader.
        aria-hidden="true"
      >
        <Icon src="/icons/play.svg" className="h-[14px] w-[11px] opacity-30" />
      </div>
    );
  }

  return (
    <img src={url} alt={`${name} poster`} loading="lazy" className={`${className} object-cover`} />
  );
}
