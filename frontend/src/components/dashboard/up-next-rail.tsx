import Link from 'next/link';
import type { UpNextTitle } from '@/lib/dashboard';
import { Poster } from './poster';

/**
 * "Up next in your watchlist" (DSH-6, FIL-37) and its empty state.
 *
 * A11: this rail is the want-to-watch queue, newest added first. The backend
 * decides what belongs here from the status field, not from the mock, which shows
 * titles whose status on frame 06 disagrees (A29).
 */
export function UpNextRail({ titles }: { titles: UpNextTitle[] }) {
  return (
    <section aria-labelledby="up-next-heading" className="flex w-full flex-col gap-[14px]">
      <div className="flex w-full items-center justify-between">
        <h2
          id="up-next-heading"
          className="text-[16px] leading-[1.3] font-semibold tracking-[-0.08px]"
        >
          Up next in your watchlist
        </h2>
        {titles.length > 0 && (
          <Link href="/library" className="text-accent text-[14px] font-medium">
            View all
          </Link>
        )}
      </div>

      {titles.length === 0 ? <EmptyRail /> : <Cards titles={titles} />}
    </section>
  );
}

function Cards({ titles }: { titles: UpNextTitle[] }) {
  return (
    // Scrolls rather than wraps: the design lays out a single row, and the
    // backend caps this at the seven cards DSH-6 draws, so overflow is rare.
    <ul className="flex w-full items-start gap-[16px] overflow-x-auto">
      {titles.map((title) => (
        <li key={title.id} className="w-[120px] shrink-0">
          {/* LIB-7 / A15: a card opens that title's detail screen. */}
          <Link href={`/titles/${title.id}`} className="flex flex-col gap-[10px]">
            <Poster
              posterPath={title.posterPath}
              name={title.name}
              size="w185"
              className="h-[170px] w-[120px] rounded-[10px]"
            />
            <div className="flex flex-col gap-[2px]">
              <p className="truncate text-[13px] font-semibold" title={title.name}>
                {title.name}
              </p>
              <p className="text-text-tertiary text-[11.5px] leading-[1.4]">
                {/* "{year} · {type}", or just the type when the year is unknown (A17). */}
                {[title.year, title.type === 'movie' ? 'Movie' : 'Series']
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function EmptyRail() {
  return (
    <div className="border-border-strong flex w-full flex-col items-center gap-[6px] rounded-[16px] border border-dashed px-[24px] py-[46px]">
      <p className="text-[14px] font-semibold">Nothing queued yet</p>
      <p className="text-text-secondary text-[13px] leading-[1.5]">
        Titles you add to your watchlist will line up here.
      </p>
      {/*
       * Points at the Add title form (08), which is FIL-53's route and does not
       * exist yet. Library is the nearest real destination, and a button that
       * navigates somewhere sensible beats one that 404s.
       */}
      <Link
        href="/titles/new"
        className="bg-accent text-text-on-accent mt-[12px] rounded-[12px] px-[20px] py-[13px] text-[14px] font-semibold"
      >
        Add your first title
      </Link>
    </div>
  );
}
