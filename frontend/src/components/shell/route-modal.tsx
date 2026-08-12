'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';

/**
 * The dialog shell an intercepted route renders inside (FIL-28 AC5, FIL-44 AC3).
 *
 * Frames 08 to 11 draw Add title, Edit title and Delete over the Library rather
 * than as their own screens, and `titles/new/page.tsx` already recorded the plan:
 * become a modal via an intercepting route once there is a Library to overlay.
 * This is that shell, kept generic so edit and delete reuse it rather than
 * growing a second one.
 *
 * Dismissal is `router.back()`, not local state, because the modal's open-ness
 * *is* the history entry: the URL changed to /titles/new when it opened, so
 * closing has to put the URL back or the browser's own back button would be the
 * only way out. That also makes Escape, the backdrop and the form's Cancel all
 * one code path.
 *
 * A plain div with `role="dialog"` rather than `<dialog>`+`showModal()`: jsdom
 * does not implement `showModal`, so the native element would make every test of
 * anything inside a modal untestable. The trade is that focus containment is not
 * free, which is what the focus-wrap handler below is for.
 */
export function RouteModal({ label, children }: { label: string; children: ReactNode }) {
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);

  // Move focus into the dialog on open, so a keyboard user is not left tabbing
  // through the page behind it. Restoring focus on close is the browser's job:
  // router.back() returns to the previous entry and with it the previous focus.
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    const target = panel.querySelector<HTMLElement>(
      'input, select, textarea, button, a[href], [tabindex]:not([tabindex="-1"])',
    );

    (target ?? panel).focus();
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;

      event.preventDefault();
      router.back();
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [router]);

  /**
   * Keep Tab inside the dialog. Without this the next Tab past the last control
   * lands on the sidebar behind the overlay, which is both confusing and a
   * genuine accessibility failure for a modal.
   */
  function onKeyDownCapture(event: React.KeyboardEvent) {
    if (event.key !== 'Tab') return;

    const panel = panelRef.current;
    if (!panel) return;

    const focusable = Array.from(
      panel.querySelectorAll<HTMLElement>(
        'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
      ),
    );
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    }
  }

  return (
    /*
     * The overlay is the backdrop click target. It is deliberately not a button
     * and carries no role: the dialog already offers Escape and two Cancel
     * controls, so exposing a third, unlabelled "dismiss" to assistive tech would
     * be noise. Keyboard users dismiss with Escape, handled above at document
     * level, which is the pattern assistive tech expects from a dialog backdrop.
     */
    <div
      onClick={() => router.back()}
      className="bg-canvas/70 fixed inset-0 z-40 flex items-start justify-center overflow-y-auto px-3 py-4 backdrop-blur-[2px] sm:px-[40px] sm:py-[40px]"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        // Stop a click inside the card reaching the backdrop's dismiss handler.
        onClick={(event) => event.stopPropagation()}
        onKeyDownCapture={onKeyDownCapture}
        className="outline-none"
      >
        {children}
      </div>
    </div>
  );
}
