'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * The kebab button and the menu it opens (LIB-7 · FIL-47).
 *
 * **This file owns opening, closing and keyboard behaviour, not the contents.**
 * The three actions are FIL-62's `RowMenuActions`, handed in as children. What is
 * settled here is the part that fights with the row around it: the kebab has to
 * be its own control rather than a region of a clickable row, or clicking it
 * navigates instead.
 *
 * `data-row-action` is the marker `TitleRow` looks for when deciding whether a
 * click was "in the row" or "on a control inside it". Marking the control is what
 * lets the row handle a click on empty space without a list of exceptions that
 * grows every time a cell gains a button.
 */
export function RowMenu({
  titleName,
  children,
}: {
  titleName: string;
  /** The three items (FIL-62). Rendered by the caller so this file stays about
   * opening, closing and keyboard behaviour rather than about what the actions
   * do. Given a `close` callback so an item can dismiss the menu after running. */
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

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
   * Escape is handled separately below, because it also has to restore focus.
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

  /**
   * Escape closes and puts focus back on the kebab (FIL-62).
   *
   * Returning focus is the half that is easy to skip and impossible to use
   * without: dismissing a menu that had focus inside it otherwise drops the
   * caret back to the document, and the next Tab starts from the top of the page
   * rather than from the row the user was working in.
   */
  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;

      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  /**
   * Arrow keys move between the items, Home and End jump to the ends.
   *
   * Not designed anywhere, and shipped regardless: a menu that only works with a
   * mouse is not shippable. This is the WAI-ARIA menu pattern, where the menu is
   * one Tab stop and arrows move within it, which is also why Tab out of the
   * menu leaves it rather than walking through three more stops.
   */
  function onMenuKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [],
    );
    if (items.length === 0) return;

    const current = items.indexOf(document.activeElement as HTMLElement);

    let next: number | null = null;
    if (event.key === 'ArrowDown') next = (current + 1) % items.length;
    else if (event.key === 'ArrowUp') next = (current - 1 + items.length) % items.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = items.length - 1;

    if (next === null) return;

    event.preventDefault();
    items[next].focus();
  }

  /** Focus the first item on open, so the arrow keys have somewhere to start. */
  useEffect(() => {
    if (!open) return;

    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
  }, [open]);

  return (
    <div ref={containerRef} data-row-action className="relative flex justify-center">
      <button
        ref={triggerRef}
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
          ref={menuRef}
          role="menu"
          aria-label={`Actions for ${titleName}`}
          onKeyDown={onMenuKeyDown}
          className="bg-surface-elevated border-border-strong absolute top-[32px] right-0 z-20 flex min-w-[184px] flex-col rounded-[12px] border py-[6px] shadow-lg"
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}
