'use client';

import { useState, useTransition } from 'react';

/** The favourite Server Action's shape. Null means the save failed. */
export type ToggleFavorite = (titleId: string) => Promise<{ favorite: boolean } | null>;

/**
 * The FAV column heart (LIB-6 · FIL-46).
 *
 * **Optimistic, with a revert on failure, and that is a working decision.** No
 * error state is designed for this control, and the two honest alternatives were
 * both worse: waiting for the round trip makes a one-field toggle feel broken on
 * a slow connection, and updating without reverting leaves a filled heart over a
 * title the server never saved.
 *
 * `useState` rather than `useOptimistic`. The optimistic hook is built to snap
 * back when its transition finishes, which is exactly wrong here: the revert has
 * to be conditional on what the server said, and the successful state has to
 * survive until the router refresh arrives. Plain state, set forward on click and
 * back on failure, says what actually happens.
 *
 * `data-row-action` marks this as a control rather than row space, so FIL-47's
 * row handler leaves the click alone and the title does not open underneath it.
 */
export function FavoriteHeart({
  titleId,
  titleName,
  favorite,
  onToggle,
}: {
  titleId: string;
  titleName: string;
  favorite: boolean;
  /** The Server Action. Resolves to the stored state, or null when it failed. */
  onToggle: ToggleFavorite;
}) {
  const [shown, setShown] = useState(favorite);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !shown;

    setShown(next);
    setFailed(false);

    startTransition(async () => {
      const result = await onToggle(titleId);

      if (result === null) {
        setShown(!next);
        setFailed(true);
        return;
      }

      // The server's answer, not the guess. They agree in practice; taking the
      // stored value is what makes a double click or a stale row settle on what
      // is actually saved rather than on what this component counted to.
      setShown(result.favorite);
    });
  }

  return (
    <span data-row-action className="flex items-center gap-[6px]">
      <button
        type="button"
        onClick={toggle}
        aria-pressed={shown}
        // Icon-only, so the name carries both the title and the state: the spec's
        // own accessibility note asks for exactly this, and "Favorite" alone on
        // ten rows says nothing about which row or which direction.
        aria-label={shown ? `Remove ${titleName} from favorites` : `Add ${titleName} to favorites`}
        className={`flex size-[28px] cursor-pointer items-center justify-center rounded-[8px] text-[15px] outline-offset-2 hover:bg-surface-elevated focus-visible:outline-2 focus-visible:outline-accent ${
          shown ? 'text-accent' : 'text-text-tertiary hover:text-text-secondary'
        } ${pending ? 'opacity-70' : ''}`}
      >
        <span aria-hidden="true">{shown ? '♥' : '♡'}</span>
      </button>

      {/*
        The failure has to be visible, which the criterion asks for and a silent
        revert is not: the heart flicking back on its own reads as a misclick.
        `role="status"` announces it without stealing focus, and it clears on the
        next attempt. An inline mark rather than a toast, because there is no
        toast anywhere in this design to reuse.
      */}
      {failed && (
        <span role="status" className="text-accent text-[11px] leading-none">
          Not saved
        </span>
      )}
    </span>
  );
}
