'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * The kebab button and the menu it opens (LIB-7 · FIL-47).
 *
 * **This ticket owns the opening, not the contents.** The three actions are
 * FIL-62, so `children` is what they fill in. What is settled here is the part
 * that fights with the row around it: the kebab has to be its own control rather
 * than a region of a clickable row, or clicking it navigates instead.
 *
 * `data-row-action` is the marker `TitleRow` looks for when deciding whether a
 * click was "in the row" or "on a control inside it". Marking the control is what
 * lets the row handle a click on empty space without a list of exceptions that
 * grows every time a cell gains a button.
 */
export function RowMenu({ titleName, children }: { titleName: string; children?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  /*
   * Outside-click dismissal, and the click is **swallowed** rather than allowed
   * through.
   *
   * This is not fussiness. Every row navigates on click, so a dismissal that let
   * the click continue would close this menu and open whichever title happened to
   * be underneath the pointer: the user asked to put a menu away and got a
   * different screen. "It closes and no action runs" is FIL-62's criterion for
   * exactly this.
   *
   * Listening in the capture phase on `document` is what makes that possible.
   * React attaches its own handlers at the app root, so a capture-phase listener
   * above it runs first, and `stopPropagation` there means the row's handler
   * never sees the click at all. `preventDefault` covers the same click landing
   * on the title link, which would otherwise navigate natively.
   *
   * Escape belongs to FIL-62 along with the rest of the menu's keyboard
   * behaviour; nothing focusable is inside it yet.
   */
  useEffect(() => {
    if (!open) return;

    function onDocumentClick(event: MouseEvent) {
      if (containerRef.current?.contains(event.target as Node)) return;

      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
    }

    document.addEventListener('click', onDocumentClick, true);
    return () => document.removeEventListener('click', onDocumentClick, true);
  }, [open]);

  return (
    <div ref={containerRef} data-row-action className="relative flex justify-center">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        // Icon-only, so the name has to say which row it belongs to: ten
        // identical "More actions" buttons are unusable with a screen reader.
        aria-label={`More actions for ${titleName}`}
        onClick={() => setOpen((wasOpen) => !wasOpen)}
        className="text-text-tertiary hover:bg-surface-elevated hover:text-text-primary flex size-[28px] cursor-pointer items-center justify-center rounded-[8px] outline-offset-2 focus-visible:outline-2 focus-visible:outline-accent"
      >
        <span className="flex flex-col items-center gap-[3px]" aria-hidden="true">
          <span className="block size-[3px] rounded-full bg-current" />
          <span className="block size-[3px] rounded-full bg-current" />
          <span className="block size-[3px] rounded-full bg-current" />
        </span>
      </button>

      {open && (
        /*
         * Anchored to the kebab rather than to the page, which is what "anchored
         * to that row" means once the table scrolls: a fixed-position menu would
         * stay put while its row moved away underneath it.
         */
        <div
          role="menu"
          aria-label={`Actions for ${titleName}`}
          className="bg-surface-elevated border-border-strong absolute top-[32px] right-0 z-20 min-w-[184px] rounded-[12px] border py-[6px] shadow-lg"
        >
          {children ?? (
            <p className="text-text-tertiary px-[14px] py-[8px] text-[13px]">
              Actions land in FIL-62.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
