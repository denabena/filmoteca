/**
 * The "New genre" button on the Genres tab row (GEN-4 · FIL-50, FIL-51).
 *
 * **It leads nowhere, and the design is what decides that.** A24 retires genre
 * creation and frame 12 draws no flow behind this button, so there is nothing to
 * open. It ships because it is drawn.
 *
 * **It is `disabled`, and that is FIL-51's judgement call rather than a
 * shortcut.** The ticket names the tension itself: a visibly clickable control
 * that does nothing is a usability problem, and its own last criterion asks that
 * a screen reader not announce this as an action a user can complete. Those two
 * pull against "looks exactly as designed", and the accessibility one wins,
 * because a live-looking button that silently swallows a click is worse for
 * everybody than a dimmed one that says why.
 *
 * What that costs, stated plainly: the button renders at reduced opacity, which
 * is the only way it differs from frame 12. **The honest alternative is removing
 * it until a flow exists**, and that is a designer's call, not this ticket's.
 */
export function NewGenreButton() {
  return (
    <button
      type="button"
      disabled
      // `disabled` alone takes it out of the tab order and has assistive tech
      // announce it as unavailable. The title says why, since "dimmed" on its own
      // does not explain that the feature is unbuilt rather than blocked by
      // something the user could fix.
      title="Creating genres is not available yet"
      className="bg-surface-card-raised border-border-strong text-text-primary cursor-not-allowed rounded-[10px] border px-[18px] py-[10px] text-[14px] font-medium opacity-60"
    >
      New genre
    </button>
  );
}
