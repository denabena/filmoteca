import { Icon } from '@/components/dashboard/icon';
import { genreColorClass } from '@/lib/dashboard';
import { STATUS_TONE, titleCaption, type TitleListItem } from '@/lib/library';
import { StarRating } from './star-rating';

/**
 * One row of the library table (LIB-5 · FIL-45).
 *
 * The row is presentation only. Clicking it, the kebab menu and the favourite
 * toggle are FIL-46, FIL-47 and FIL-62; the heart and the kebab render here as
 * static marks so the row has its designed anatomy, and those tickets make them
 * interactive. Shipping the cells without the columns would mean re-laying the
 * table out twice.
 */
export function TitleRow({ title }: { title: TitleListItem }) {
  const status = STATUS_TONE[title.status];

  return (
    <tr className="border-border-default border-t">
      <td className="py-[14px] pr-[16px] pl-[24px]">
        <div className="flex items-center gap-[14px]">
          <PosterTile colorSlot={title.genre.colorSlot} />
          <div className="flex min-w-0 flex-col gap-[2px]">
            <span className="truncate text-[14px] leading-[1.3] font-semibold text-text-primary">
              {title.name}
            </span>
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
        <FavoriteMark favorite={title.favorite} name={title.name} />
      </td>

      <td className="py-[14px] pr-[24px] pl-[16px]">
        <KebabMark />
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

/**
 * The FAV column heart, as a static mark.
 *
 * FIL-46 turns this into a button with an optimistic toggle. Until then it is
 * still labelled for a screen reader, because an icon-only cell that says
 * nothing is unreadable whether or not it is clickable.
 */
function FavoriteMark({ favorite, name }: { favorite: boolean; name: string }) {
  return (
    <span className={favorite ? 'text-accent' : 'text-text-tertiary'}>
      <span aria-hidden="true" className="text-[15px]">
        {favorite ? '♥' : '♡'}
      </span>
      <span className="sr-only">
        {favorite ? `${name} is a favorite` : `${name} is not a favorite`}
      </span>
    </span>
  );
}

/**
 * The row menu's trigger, as a static mark. FIL-47 makes it a button and FIL-62
 * gives it a menu; the column exists here so neither has to re-lay the table out.
 */
function KebabMark() {
  return (
    <span className="text-text-tertiary flex flex-col items-center gap-[3px]" aria-hidden="true">
      <span className="block size-[3px] rounded-full bg-current" />
      <span className="block size-[3px] rounded-full bg-current" />
      <span className="block size-[3px] rounded-full bg-current" />
    </span>
  );
}
