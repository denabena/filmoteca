/**
 * The "New genre" button on the Genres tab row (GEN-4 · FIL-50, FIL-51).
 *
 * **It leads nowhere, and that is the design.** A24 retires genre creation and
 * frame 12 draws no flow behind this button, so there is nothing to open. It
 * ships because it is drawn; FIL-51 settles how it behaves and how it announces
 * itself, which is a real usability question rather than a formality.
 *
 * A secondary button, matching the design's treatment: an outline on the raised
 * surface rather than the accent fill the primary "Add title" carries.
 */
export function NewGenreButton() {
  return (
    <button
      type="button"
      className="bg-surface-card-raised border-border-strong text-text-primary rounded-[10px] border px-[18px] py-[10px] text-[14px] font-medium"
    >
      New genre
    </button>
  );
}
