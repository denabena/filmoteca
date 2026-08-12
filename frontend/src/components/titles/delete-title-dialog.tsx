'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

/** The delete Server Action. A message means it failed and nothing was removed. */
export type DeleteTitle = (titleId: string) => Promise<{ message: string } | void>;

/**
 * The dialog between a click and permanent data loss (DEL-1, DEL-2 · FIL-63).
 *
 * **The body quotes the actual title name, and that is the whole point of the
 * copy.** "Delete this title?" over a generic sentence asks the user to trust
 * that the app has the right row; naming it lets them check. It is also the one
 * thing that makes the dialog useful when it opens from a row menu, where three
 * rows may look alike at a glance.
 *
 * **Escape cancels and can never confirm.** No dismissal is drawn, so this is a
 * working decision, but only one direction is defensible for a destructive
 * dialog: a stray keypress must not delete anything. `RouteModal` owns Escape
 * and closes by navigating back, so that holds without this component doing
 * anything, and the default focus is Cancel rather than the danger button for
 * the same reason.
 */
export function DeleteTitleDialog({
  titleId,
  titleName,
  onDelete,
  dismissable = false,
}: {
  titleId: string;
  titleName: string;
  onDelete: DeleteTitle;
  /** True inside the intercepting route, where cancelling is a history step. */
  dismissable?: boolean;
}) {
  const router = useRouter();
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  /*
   * Plain state rather than `useTransition`, and the difference is a bug rather
   * than a preference.
   *
   * An async transition stays pending until React considers it settled, and a
   * state update made after the `await` does not always end it. With the danger
   * button disabled on `pending`, that left it disabled **forever** after a
   * failed delete: the dialog said "please try again" above a button that could
   * not be pressed. A `finally` cannot get stuck.
   */
  async function confirm() {
    setFailure(null);
    setPending(true);

    try {
      const result = await onDelete(titleId);

      // A successful delete redirects, so anything returned here is a failure.
      if (result) setFailure(result.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="bg-surface-card border-border-default flex w-[420px] flex-col items-center gap-[16px] rounded-[18px] border p-[28px] text-center">
      <span
        className="bg-accent-soft text-accent flex size-[54px] items-center justify-center rounded-full text-[22px]"
        aria-hidden="true"
      >
        🗑
      </span>

      <h1 className="font-display text-[20px] leading-[1.22] font-bold tracking-[-0.1px]">
        Delete this title?
      </h1>

      <p className="text-text-secondary text-[14px] leading-[1.55]">
        <strong className="text-text-primary font-semibold">{titleName}</strong> and its rating,
        note, and watch history will be permanently removed. This can&apos;t be undone.
      </p>

      {failure && (
        <p role="alert" className="text-status-warning-text text-[13px]">
          {failure}
        </p>
      )}

      <div className="mt-[4px] flex w-full items-center justify-center gap-[10px]">
        {/*
          Cancel comes first in the DOM as well as on screen, so it is what a
          keyboard lands on when the dialog opens. For a destructive dialog the
          safe control is the one that should be one keypress away.
        */}
        {dismissable ? (
          <button
            type="button"
            onClick={() => router.back()}
            className="bg-surface-card-raised border-border-strong text-text-primary flex-1 rounded-[12px] border px-[20px] py-[13px] text-[14px] font-semibold"
          >
            Cancel
          </button>
        ) : (
          <Link
            href={`/titles/${titleId}`}
            className="bg-surface-card-raised border-border-strong text-text-primary flex-1 rounded-[12px] border px-[20px] py-[13px] text-center text-[14px] font-semibold"
          >
            Cancel
          </Link>
        )}

        <button
          type="button"
          onClick={() => void confirm()}
          disabled={pending}
          /*
            Names the title, so a screen reader user confirming by voice or by a
            list of buttons knows which row is about to go. It tracks the pending
            state too: an `aria-label` overrides the visible text, so a fixed one
            would leave the button still announcing "Delete" while it reads
            "Deleting…" on screen, which is the state that matters most to hear.
          */
          aria-label={pending ? `Deleting ${titleName}` : `Delete ${titleName}`}
          className="bg-accent text-text-on-accent flex-1 rounded-[12px] px-[20px] py-[13px] text-[14px] font-semibold disabled:opacity-60"
        >
          {pending ? 'Deleting…' : 'Delete title'}
        </button>
      </div>
    </div>
  );
}
