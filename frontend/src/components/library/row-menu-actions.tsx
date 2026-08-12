'use client';

import Link from 'next/link';
import { useTransition, type ReactNode } from 'react';

/** The mark-as-watched Server Action. False means the request failed. */
export type MarkWatched = (titleId: string) => Promise<boolean>;

/**
 * The three items behind a row's kebab (MNU-1, MNU-2 · FIL-62).
 *
 * **All three show on every row, whatever its status (A22).** The menu is mocked
 * only on a watching row and no variant is drawn for one already watched, so the
 * options were hiding "Mark as watched", disabling it, or letting it be a no-op.
 * A no-op is the one that cannot surprise anybody: the menu reads the same
 * everywhere and clicking twice is harmless. The backend makes it idempotent for
 * the same reason, so the two halves agree. **Hiding it is a real alternative and
 * wants a designer.**
 *
 * Two of the three are links rather than buttons, and that is not decoration.
 * Edit and Delete both open modals that are real routes, so a link gives them
 * the intercepting-route behaviour, a shareable URL, and middle-click for free.
 * Only "Mark as watched" is a button, because it is the only one that changes
 * something rather than going somewhere.
 */
export function RowMenuActions({
  titleId,
  titleName,
  onMarkWatched,
  onDone,
}: {
  titleId: string;
  titleName: string;
  onMarkWatched: MarkWatched;
  /** Closes the menu. The menu owns its open state; these items just report. */
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <>
      <MenuLink href={`/titles/${titleId}/edit`} icon="✎" onDone={onDone}>
        Edit details
      </MenuLink>

      <button
        type="button"
        role="menuitem"
        disabled={pending}
        onClick={() => {
          startTransition(async () => {
            await onMarkWatched(titleId);
            onDone();
          });
        }}
        className="text-text-primary hover:bg-surface-card-raised flex w-full items-center gap-[10px] px-[14px] py-[9px] text-left text-[13px] outline-offset-[-2px] focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-60"
      >
        <span aria-hidden="true" className="w-[14px] text-center">
          ✓
        </span>
        Mark as watched
      </button>

      {/*
        Danger-coloured, and last, which is the design's own ordering: the
        destructive item is furthest from where the pointer enters the menu.
      */}
      <MenuLink href={`/titles/${titleId}/delete`} icon="🗑" onDone={onDone} danger>
        <span>
          Delete title
          {/* Names the row, since three menus on screen would otherwise be
              indistinguishable in a screen reader's list of links. */}
          <span className="sr-only"> {titleName}</span>
        </span>
      </MenuLink>
    </>
  );
}

function MenuLink({
  href,
  icon,
  danger,
  onDone,
  children,
}: {
  href: string;
  icon: string;
  danger?: boolean;
  onDone: () => void;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      // The menu closes as the navigation starts. Without this it would still be
      // open behind the modal, and visible again the moment the modal is
      // dismissed back to this page.
      onClick={onDone}
      className={`hover:bg-surface-card-raised flex w-full items-center gap-[10px] px-[14px] py-[9px] text-[13px] outline-offset-[-2px] focus-visible:outline-2 focus-visible:outline-accent ${
        danger ? 'text-accent' : 'text-text-primary'
      }`}
    >
      <span aria-hidden="true" className="w-[14px] text-center">
        {icon}
      </span>
      {children}
    </Link>
  );
}
