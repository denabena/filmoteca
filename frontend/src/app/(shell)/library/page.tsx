import { markWatched, toggleFavorite } from '@/app/(shell)/titles/actions';
import { GenreCards } from '@/components/library/genre-cards';
import { LibraryView } from '@/components/library/library-view';
import { NewGenreButton } from '@/components/library/new-genre-button';
import { AddTitleButton } from '@/components/shell/add-title-button';
import { PageHeader } from '@/components/shell/page-header';
import { apiFetch } from '@/lib/api';
import type { GenreWithCount } from '@/lib/genres';
import type { TitleListItem } from '@/lib/library';

/**
 * The Library (06 / 12 / 13). LIB-1 and LIB-2 (FIL-44), the table (FIL-45), the
 * empty state (FIL-48) and the three controls (FIL-49).
 *
 * An async Server Component: the rows are fetched once here and handed down, so
 * no loading state ships to the browser. Everything below the header is one
 * client island, `LibraryView`, because the controls sit on the tab row while
 * what they narrow is the panel underneath, and one piece of state drives both.
 *
 * The header sits **outside** that island, which is what makes FIL-44's AC7
 * structural rather than a promise: switching tabs cannot change a header that is
 * not inside the component doing the switching.
 *
 * Both tabs' data is fetched together rather than on tab switch: the tabs are
 * client state with no route behind them, so a fetch on switch would need a
 * loading state the design does not draw, for two small lists.
 */
export default async function LibraryPage() {
  const [titles, genres] = await Promise.all([
    apiFetch<TitleListItem[]>('/api/titles'),
    apiFetch<GenreWithCount[]>('/api/genres/counts'),
  ]);

  return (
    <main className="flex flex-1 flex-col">
      <PageHeader overline="Your watchlist" title="Library" actions={<AddTitleButton />} />

      <div className="flex flex-1 flex-col gap-[18px] px-[40px] pb-[40px]">
        <LibraryView
          titles={titles}
          onToggleFavorite={toggleFavorite}
          onMarkWatched={markWatched}
          genres={<GenreCards genres={genres} />}
          genresControls={<NewGenreButton />}
        />
      </div>
    </main>
  );
}
