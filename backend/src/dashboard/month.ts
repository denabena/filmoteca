import { BadRequestException } from '@nestjs/common';

/**
 * A calendar month, resolved to a half-open UTC range.
 *
 * Everything here works in UTC on purpose. `Title.watchDate` is a Postgres `DATE`
 * with no time and no zone, which Prisma hands back as UTC midnight, so reading it
 * back in local time would push the 1st of a month into the previous one for
 * anybody west of Greenwich. The dashboard's month boundaries have to agree with
 * the column's own notion of a day, and that notion is UTC.
 */
export interface MonthRange {
  /** `YYYY-MM`, the same shape the header dropdown sends. */
  key: string;
  /** UTC midnight on the 1st, inclusive. */
  start: Date;
  /** UTC midnight on the 1st of the next month, exclusive. */
  end: Date;
}

const MONTH_KEY = /^(\d{4})-(0[1-9]|1[0-2])$/;

/**
 * Builds the range for a 1-indexed month.
 *
 * `month` may sit outside 1 to 12, because `previousMonth` passes 0 for January's
 * predecessor and relies on `Date.UTC` rolling it back into the previous December.
 * That is why `key` is read back off the constructed date rather than formatted
 * from the arguments: formatting 0 directly produced "2026-00".
 */
function rangeFor(year: number, month: number): MonthRange {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  const label = String(start.getUTCMonth() + 1).padStart(2, '0');

  return {
    key: `${start.getUTCFullYear()}-${label}`,
    start,
    end,
  };
}

/**
 * Resolves the `month` query parameter.
 *
 * A8: the header dropdown is only ever drawn showing "October", so the month is a
 * parameter rather than a constant. Omitting it means the current month, which is
 * what the dashboard opens on.
 *
 * `now` is injectable so tests can pin it. Nothing in production passes it.
 */
export function parseMonth(value?: string, now: Date = new Date()): MonthRange {
  if (value === undefined || value === '') {
    return rangeFor(now.getUTCFullYear(), now.getUTCMonth() + 1);
  }

  const match = MONTH_KEY.exec(value);

  if (!match) {
    throw new BadRequestException(
      `month must look like YYYY-MM (for example 2026-10), got "${value}"`,
    );
  }

  return rangeFor(Number(match[1]), Number(match[2]));
}

/** The month before this one. Feeds FIL-30's "+3 vs September" trend. */
export function previousMonth(range: MonthRange): MonthRange {
  const start = range.start;

  return rangeFor(start.getUTCFullYear(), start.getUTCMonth());
}

/**
 * How many bars the watch-activity chart draws (DSH-7).
 *
 * Four, always, which is the whole difficulty: real months span four to six
 * calendar weeks. See `weekBucketForDay`.
 */
export const ACTIVITY_BUCKET_COUNT = 4;

/**
 * Which of the four bars a day of the month falls into.
 *
 * **The rule: days 1 to 7, 8 to 14, 15 to 21, and 22 to the end of the month.**
 * The fourth bucket is therefore longer than the others, by one to three days
 * depending on the month, and in February of a non-leap year it is exactly the
 * same length.
 *
 * This is a decision, not a reading of the design: DSH-7 always draws four bars
 * and nothing anywhere says how a 30 or 31 day month divides into four. Fixed
 * seven-day slices were chosen over four equal quarters because a bar then always
 * means "a week", which is what the card is called, rather than "7.75 days". The
 * cost is that the last bar covers more days and so trends high. **Raise this with
 * the designer**; if they want calendar weeks instead, the chart needs five or six
 * bars and this function is where that changes.
 */
export function weekBucketForDay(dayOfMonth: number): number {
  return Math.min(Math.floor((dayOfMonth - 1) / 7), ACTIVITY_BUCKET_COUNT - 1);
}

/**
 * The bucket containing today, or null when `range` is not the current month.
 *
 * The frontend highlights this bar and labels it "This week", so a past month must
 * flag nothing rather than defaulting to the last bar.
 */
export function currentWeekBucket(
  range: MonthRange,
  now: Date = new Date(),
): number | null {
  if (now < range.start || now >= range.end) {
    return null;
  }

  return weekBucketForDay(now.getUTCDate());
}
