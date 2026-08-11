'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { MouseEvent } from 'react';
import { Icon } from '@/components/dashboard/icon';
import { genreColorClass } from '@/lib/dashboard';
import { STATUS_TONE, titleCaption, type TitleListItem } from '@/lib/library';
import { FavoriteHeart, type ToggleFavorite } from './favorite-heart';
import { RowMenu } from './row-menu';
import { StarRating } from './star-rating';

/**
 * One row of the library table (LIB-5 · FIL-45), and the two ways out of it
 * (LIB-7 · FIL-47).
 *
 * **The row is clickable and that is a working decision (A15).** The design never
 * draws a click target on a row, but frame 07 carries a "Library" breadcrumb, so
 * the row has to be how you reach the detail screen. Nothing else could be.
 *
 * **The whole row navigates, but the title name is a real `<Link>`, and both
 * matter.** The link is what a keyboard and a screen reader use: it is one tab
 * stop per row, Enter opens the title natively, and the destination is visible in
 * the status bar on hover. The row's own click handler is what makes the rest of
 * the row's empty space clickable for a pointer, which is what the criterion
 * asks for and what a link alone cannot do.
 *
 * The alternative, stretching the link across the row with an absolutely
 * positioned pseudo-element, needs `position: relative` on a `<tr>`, whose
 * containing-block behaviour is not reliable across engines. This does the same
 * job with no layout risk.
 *
 * Clicks on a control inside the row are ignored by the handler, found by
 * `data-row-action` rather than by naming the heart and the kebab. A marker means
 * a cell that gains a button later cannot silently start navigating.
 */
export function TitleRow({
  title,
  onToggleFavorite,
}: {
  title: TitleListItem;
  /**
   * The favourite Server Action, handed in from the page rather than imported
   * (FIL-46). A `'use client'` module that imports a `'use server'` one pulls
   * `next/cache` and the whole Next server runtime into its graph, which is
   * invisible in the browser bundle but fatal under jsdom, where the row cannot
   * be rendered at all. Passing the action down is Next's documented shape for
   * this and keeps the row testable with a plain stub.
   */
  onToggleFavorite: ToggleFavorite;
}) {
  const status = STATUS_TONE[title.status];
  const router = useRouter();
  const href = `/titles/${title.id}`;

  function onRowClick(event: MouseEvent<HTMLTableRowElement>) {
    const target = event.target as HTMLElement;

    // The heart, the kebab and the title link handle themselves. Without this the
    // kebab would open its menu and navigate away from it in the same click.
    if (target.closest('[data-row-action]') || target.closest('a')) {
      return;
    }

    router.push(href);
  }

  return (
    <tr
      onClick={onRowClick}
      className="border-border-default hover:bg-surface-card-raised cursor-pointer border-t transition-colors"
    >
      <td className="py-[14px] pr-[16px] pl-[24px]">
        <div className="flex items-center gap-[14px]">
          <PosterTile colorSlot={title.genre.colorSlot} />
          <div className="flex min-w-0 flex-col gap-[2px]">
            <Link
              href={href}
              className="truncate text-[14px] leading-[1.3] font-semibold text-text-primary outline-offset-2 focus-visible:outline-2 focus-visible:outline-accent"
            >
              {title.name}
            </Link>
            <span className="text-text-tertiary truncate text-[12.5px] leading-[1.3]">
              {titleCaption(title)}
            </span>
          </div>
        </div>
      </td>

      <td className="px-[16px] py-[14px]">
        <span className="flex items-center gap-[9px] text-[13.5px] text-text-secondary">
          <span
            className={`size-[8px] shrink-0 rounded-full ${genreColorClass(title.genre.colorSlot)}`}
            aria-hidden="true"
          />
          {title.genre.name}
        </span>
      </td>

      <td className="px-[16px] py-[14px]">
        {/*
          The label is real text inside the chip, not a tooltip and not implied by
          the tone. The spec's own accessibility note asks that status not be
          carried by colour alone, and a green pill reading nothing is exactly
          that.
        */}
        <span
          className={`inline-flex items-center gap-[7px] rounded-full py-[5px] pr-[12px] pl-[10px] text-[12px] font-medium ${status.chip}`}
        >
          <span className={`size-[6px] shrink-0 rounded-full ${status.dot}`} aria-hidden="true" />
          {status.label}
        </span>
      </td>

      <td className="px-[16px] py-[14px]">
        <StarRating rating={title.rating} />
      </td>

      <td className="px-[16px] py-[14px]">
        <FavoriteHeart
          titleId={title.id}
          titleName={title.name}
          favorite={title.favorite}
          onToggle={onToggleFavorite}
        />
      </td>

      <td className="py-[14px] pr-[24px] pl-[16px]">
        <RowMenu titleName={title.name} />
      </td>
    </tr>
  );
}

/**
 * The coloured tile with a play glyph that stands in for cover art.
 *
 * **Not the `Poster` component, and not an oversight.** Frame 06 draws a flat
 * genre-coloured tile in this cell even for titles that have poster art
 * elsewhere in the design, so this is the designed mark rather than a fallback
 * for a missing image.
 *
 * A29: the mock gives the same genre different tile colours between rows, Comedy
 * as both amber and pink. `colorSlot` comes from the `genres` row, so every
 * screen agrees on one colour per genre and the mock's inconsistency is not
 * reproduced.
 */
function PosterTile({ colorSlot }: { colorSlot: number }) {
  return (
    <span
      className={`flex size-[38px] shrink-0 items-center justify-center rounded-[9px] ${genreColorClass(colorSlot)}`}
      aria-hidden="true"
    >
      <Icon src="/icons/play.svg" className="h-[12px] w-[9px]" />
    </span>
  );
}
