import Link from 'next/link';
import { Icon } from '@/components/dashboard/icon';

/**
 * The Library before any title exists (LIB-9 · FIL-48, frame 13).
 *
 * **Its own frame, not a blank table**, which is why this is a component rather
 * than a conditional `<tbody>`: the design replaces the whole card with a
 * centred column, and the table's headers do not appear at all.
 *
 * **This is the no-titles state, not the no-results state.** Those look
 * different and mean different things: a library with ten titles and a search
 * matching none has not earned "Add your first movie or show", and offering that
 * copy to someone who has typed a query reads as though their library was
 * deleted. The no-results message belongs to FIL-49, which owns the search that
 * produces it. The Library page is what decides between them, and it decides on
 * the **unfiltered** count.
 *
 * The tabs and the three controls stay visible around this, which is a deliberate
 * choice on frame 13 rather than an oversight, so they are drawn by the page and
 * not hidden here.
 */
export function LibraryEmpty() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-[18px] py-[100px] text-center">
      <span
        className="bg-accent-soft flex size-[78px] items-center justify-center rounded-full"
        aria-hidden="true"
      >
        <Icon src="/icons/play.svg" className="h-[26px] w-[20px]" />
      </span>

      <div className="flex max-w-[420px] flex-col gap-[10px]">
        <h2 className="font-display text-[22px] leading-[1.2] font-bold tracking-[-0.3px]">
          Your watchlist is empty
        </h2>
        <p className="text-text-secondary text-[14px] leading-[1.55]">
          Add your first movie or show to start tracking what you watch, rate, and want to see next.
        </p>
      </div>

      {/*
        A `Link` for the same reason as the header's Add title button: the modal
        is an intercepting route, so a real href gives an in-app click the modal
        and a pasted URL the full page. A `button` would open something no URL
        can reach.
      */}
      <Link
        href="/titles/new"
        className="bg-accent text-text-on-accent mt-[6px] rounded-[12px] px-[22px] py-[13px] text-[14px] font-semibold outline-offset-2 focus-visible:outline-2 focus-visible:outline-accent"
      >
        Add your first title
      </Link>
    </div>
  );
}
