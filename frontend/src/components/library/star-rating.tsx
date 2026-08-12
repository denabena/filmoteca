import { Icon } from '@/components/dashboard/icon';
import { starFills } from '@/lib/library';

/**
 * The RATING cell (LIB-5): five stars filled to the rating, halves included.
 *
 * **A21 allows half stars and this renders them rather than rounding.** A half is
 * drawn by laying a clipped filled star over an empty one, because the exported
 * icon set has only `star-filled` and `star-empty`: a half-star SVG would be a
 * third asset for one state, and the overlay handles any fraction the stored
 * value ever takes.
 *
 * The whole row carries one accessible name ("4.5 out of 5") and the stars
 * themselves are hidden, so a screen reader reads the rating once instead of
 * announcing ten overlapping images.
 */
export function StarRating({ rating }: { rating: number | null }) {
  /*
   * An unrated title shows a dash, not five empty stars (LIB-5). Five greyed
   * stars read as "rated zero", which is a thing the user could actually have
   * entered and a different fact from never having rated it.
   */
  if (rating === null) {
    return (
      <span className="text-text-tertiary text-[14px]">
        <span aria-hidden="true">—</span>
        <span className="sr-only">Not rated</span>
      </span>
    );
  }

  const stars = rating / 2;

  return (
    <span className="flex items-center gap-[3px]" aria-label={`${stars} out of 5`} role="img">
      {starFills(rating).map((fill, index) => (
        <span key={index} className="relative block size-[14px]" aria-hidden="true">
          <Icon src="/icons/star-empty.svg" className="absolute inset-0 size-[14px]" />
          {fill > 0 && (
            // The clip is on a wrapper rather than the image, so the star keeps
            // its own width and only part of it shows: scaling the image would
            // squash a half star instead of cutting it.
            <span
              className="absolute inset-0 block overflow-hidden"
              style={{ width: `${fill * 100}%` }}
            >
              <Icon src="/icons/star-filled.svg" className="size-[14px] max-w-none" />
            </span>
          )}
        </span>
      ))}
    </span>
  );
}
