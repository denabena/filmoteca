'use client';

import { useMemo, useState, type ReactNode } from 'react';
import {
  filterTitles,
  hasActiveFilters,
  NO_FILTERS,
  type LibraryFilters,
  type TitleListItem,
} from '@/lib/library';
import type { ToggleFavorite } from './favorite-heart';
import type { MarkWatched } from './row-menu-actions';
import { LibraryControls } from './library-controls';
import { LibraryEmpty } from './library-empty';
import { LibraryTabs } from './library-tabs';
import { TitlesTable } from './titles-table';

/**
 * The Library's "All titles" tab and the state its three controls share
 * (LIB-3 · FIL-49).
 *
 * This exists because of where the controls sit. Frame 06 puts them on the tab
 * row, beside the tabs, while what they narrow is the panel below: the two are
 * far apart in the layout and driven by one piece of state, so something has to
 * own that state above both. `LibraryTabs` deliberately does not, because it
 * knows nothing about titles and FIL-44 kept it that way.
 *
 * **Which empty is which is decided here, and the distinction is the point.**
 * There are two, and confusing them is the failure this ticket and FIL-48 exist
 * to prevent:
 *
 * - **No titles at all** gets frame 13's "Your watchlist is empty", and it is
 *   decided on the *unfiltered* count, so a filter can never reach it.
 * - **No matches** gets a plain line, because a library with ten titles and a
 *   query matching none has not earned "Add your first movie or show": that copy
 *   reads as though the library had been deleted.
 *
 * A14: the no-results state is not drawn anywhere, so its wording is a working
 * decision.
 */
export function LibraryView({
  titles,
  onToggleFavorite,
  onMarkWatched,
  genres,
  genresControls,
}: {
  titles: TitleListItem[];
  onToggleFavorite: ToggleFavorite;
  onMarkWatched: MarkWatched;
  genres: ReactNode;
  genresControls?: ReactNode;
}) {
  const [filters, setFilters] = useState<LibraryFilters>(NO_FILTERS);

  const visible = useMemo(() => filterTitles(titles, filters), [titles, filters]);

  return (
    <LibraryTabs
      tableControls={<LibraryControls filters={filters} onChange={setFilters} />}
      genresControls={genresControls}
      table={
        titles.length === 0 ? (
          <LibraryEmpty />
        ) : visible.length === 0 ? (
          <NoResults filters={filters} onClear={() => setFilters(NO_FILTERS)} />
        ) : (
          <TitlesTable
            titles={visible}
            onToggleFavorite={onToggleFavorite}
            onMarkWatched={onMarkWatched}
          />
        )
      }
      genres={genres}
    />
  );
}

/**
 * The no-results state (FIL-49).
 *
 * Undesigned, so deliberately plain: a line of text inside the same card the
 * table would fill, rather than a second illustrated screen competing with frame
 * 13's. The controls stay above it and usable, which is the criterion, and the
 * clear button exists because a filter that can only be undone by hand is how a
 * user concludes their library is gone.
 */
function NoResults({ filters, onClear }: { filters: LibraryFilters; onClear: () => void }) {
  return (
    <div
      role="status"
      className="bg-surface-card border-border-default flex flex-1 flex-col items-center justify-center gap-[12px] rounded-[18px] border py-[70px] text-center"
    >
      <p className="text-text-secondary text-[14px]">
        {filters.search.trim()
          ? `No titles match “${filters.search.trim()}”.`
          : 'No titles match these filters.'}
      </p>
      {hasActiveFilters(filters) && (
        <button
          type="button"
          onClick={onClear}
          className="text-accent text-[13px] font-semibold outline-offset-2 focus-visible:outline-2 focus-visible:outline-accent"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
