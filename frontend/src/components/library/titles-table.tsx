import type { TitleListItem } from '@/lib/library';
import type { ToggleFavorite } from './favorite-heart';
import { TitleRow } from './title-row';

/**
 * The library table (LIB-4 · FIL-45).
 *
 * **A real `<table>`, not a grid of divs.** The design draws a header row over
 * aligned columns, which is what a table is: rendering it as divs would mean
 * re-implementing the row/column relationships in ARIA to get back what the
 * element already gives a screen reader for free, and getting that subtly wrong
 * is the usual outcome.
 *
 * A16: no pagination is designed, so every row renders and the body scrolls. The
 * header is `sticky` inside the scroll container so it stays usable at row fifty,
 * which the mock cannot show at ten rows but the criterion asks for. Worth
 * raising if libraries are expected to grow past a few hundred rows, because at
 * that point this wants virtualising rather than a taller scroll area.
 */
export function TitlesTable({
  titles,
  onToggleFavorite,
}: {
  titles: TitleListItem[];
  /** Forwarded to each row's heart. See `TitleRow` for why it is injected. */
  onToggleFavorite: ToggleFavorite;
}) {
  return (
    <div className="bg-surface-card border-border-default max-h-[calc(100vh-260px)] overflow-y-auto rounded-[18px] border">
      <table className="w-full border-separate border-spacing-0 text-left">
        {/*
          Deliberately not "Your watchlist": that is the page header's overline,
          and repeating it would make a screen reader announce the same phrase
          twice on one screen with two different meanings.
        */}
        <caption className="sr-only">Titles in your library</caption>
        <thead>
          {/*
            `sticky` needs the background on the cells rather than the row: a
            `<tr>` does not paint one in every engine, so the rows would show
            through the header as they scroll under it.
          */}
          <tr className="text-text-tertiary text-[11px] leading-[13px] font-medium tracking-[0.88px]">
            <Th className="pl-[24px]">TITLE</Th>
            <Th>GENRE</Th>
            <Th>STATUS</Th>
            <Th>RATING</Th>
            <Th>FAV</Th>
            {/*
              The kebab column has no visible heading in the design. It still
              needs a name, or a screen reader announces an unlabelled sixth
              column on every row.
            */}
            <Th className="pr-[24px]">
              <span className="sr-only">Actions</span>
            </Th>
          </tr>
        </thead>
        <tbody>
          {titles.map((title) => (
            <TitleRow key={title.id} title={title} onToggleFavorite={onToggleFavorite} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      scope="col"
      className={`bg-surface-card sticky top-0 z-10 px-[16px] pt-[18px] pb-[14px] font-medium ${className}`}
    >
      {children}
    </th>
  );
}
