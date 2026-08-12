'use client';

import { useRef, useState, type ReactNode } from 'react';

/**
 * The joined tab pair that switches the Library between the table and the genre
 * cards (LIB-2 · FIL-44).
 *
 * This component owns **only** the switching. The table is FIL-45 and the genre
 * cards are their own task; both arrive as slots, so building them changes their
 * own files and not this one. The per-tab controls (search, status and sort on
 * "All titles", "New genre" on "Genres") likewise belong to their own tickets and
 * are deliberately absent rather than stubbed.
 *
 * The header is **not** in here, and that is the point of AC7: both tabs share
 * one page header, so it is rendered by the page above and cannot change when the
 * tab does.
 *
 * Selection is client state rather than a URL parameter. Nothing in the ticket
 * asks for a shareable or back-navigable tab, and the design draws frames 06 and
 * 12 as one screen with two states. If a shareable tab is wanted later this
 * becomes a search param, which is a small change contained to this file.
 */

const TABS = [
  { id: 'all', label: 'All titles' },
  { id: 'genres', label: 'Genres' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export function LibraryTabs({
  table,
  genres,
  tableControls,
  genresControls,
}: {
  table: ReactNode;
  genres: ReactNode;
  /**
   * The controls that sit on the tab row beside the tabs, one set per tab: the
   * search, status and sort trio on "All titles" (FIL-49), a "New genre" button
   * on "Genres" (FIL-51).
   *
   * Slots rather than content, for the same reason the panels are: this
   * component owns the switching and nothing else, so neither ticket has to
   * reach into it. It does own *swapping* them, because the design puts a
   * different set on each tab, and a control from the hidden tab left in the row
   * would still be in the tab order.
   */
  tableControls?: ReactNode;
  genresControls?: ReactNode;
}) {
  const [active, setActive] = useState<TabId>('all');
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  /*
   * Arrow keys move between tabs and select as they go, which is the WAI-ARIA
   * "automatic activation" pattern. It suits two cheap, already-rendered panels;
   * manual activation exists for tabs whose panels are expensive to load, which
   * these are not.
   *
   * Roving tabindex (below) is what makes this reachable in the first place: the
   * tablist is one Tab stop, and arrows move within it, rather than every tab
   * being its own stop.
   */
  function onKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    const index = TABS.findIndex((tab) => tab.id === active);

    let next: number | null = null;
    if (event.key === 'ArrowRight') next = (index + 1) % TABS.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + TABS.length) % TABS.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = TABS.length - 1;

    if (next === null) return;

    event.preventDefault();
    const target = TABS[next];
    setActive(target.id);
    tabRefs.current[target.id]?.focus();
  }

  return (
    <>
      {/* Tabs left, that tab's own controls right, as frame 06 lays them out. */}
      <div className="flex items-center justify-between gap-[16px]">
        {/*
        "Joined" in the design means one bordered container with a shared divider,
        not two separate pills: the border and radius live on the tablist and the
        buttons only carry their own fill.
      */}
        <div
          role="tablist"
          aria-label="Library view"
          className="border-border-strong bg-surface-card inline-flex items-center overflow-hidden rounded-[10px] border"
        >
          {TABS.map((tab, index) => {
            const selected = tab.id === active;

            return (
              <button
                key={tab.id}
                ref={(node) => {
                  tabRefs.current[tab.id] = node;
                }}
                type="button"
                role="tab"
                id={`library-tab-${tab.id}`}
                aria-selected={selected}
                aria-controls={`library-panel-${tab.id}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setActive(tab.id)}
                onKeyDown={onKeyDown}
                className={`px-[18px] py-[10px] text-[14px] font-medium outline-offset-[-2px] focus-visible:outline-2 focus-visible:outline-accent ${
                  index > 0 ? 'border-border-strong border-l' : ''
                } ${
                  selected
                    ? 'bg-surface-card-raised text-text-primary'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/*
          Only the active tab's controls render, for the same reason only the
          active panel does: a hidden tab's search box left in the DOM is still a
          tab stop, and a user would reach a control that filters nothing they can
          see.
        */}
        {active === 'all' ? tableControls : genresControls}
      </div>

      {/*
        Only the selected panel is rendered. Keeping both mounted and hiding one
        would leave the hidden panel's controls in the tab order and its rows in
        the accessibility tree, which is exactly what AC5's "replace" rules out.
      */}
      <div
        role="tabpanel"
        id={`library-panel-${active}`}
        aria-labelledby={`library-tab-${active}`}
        tabIndex={0}
        className="flex flex-1 flex-col outline-offset-2 focus-visible:outline-2 focus-visible:outline-accent"
      >
        {active === 'all' ? table : genres}
      </div>
    </>
  );
}
