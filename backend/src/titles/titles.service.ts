import { Injectable } from '@nestjs/common';
import type { Title } from '@prisma/client';
import { TitlesRepository } from './titles.repository';

/**
 * The two quick actions that change one field without opening a form (MNU-2,
 * LIB-6 · FIL-57).
 *
 * Separate from the update endpoint because both are single-purpose and fired
 * from a list row: the row does not hold a whole valid payload, so routing them
 * through `PUT /titles/:id` would make the client re-send a form it never opened
 * and turn a heart click into a full-title write.
 */
@Injectable()
export class TitlesService {
  constructor(private readonly titles: TitlesRepository) {}

  /**
   * Marks a title watched (MNU-2).
   *
   * **Idempotent, and that is a working decision (A22).** The row menu is mocked
   * only on a watching row and no variant is drawn for a title that is already
   * watched, so the honest options were hiding the item, disabling it, or making
   * it a no-op. A no-op is the one that cannot surprise anybody: the menu reads
   * the same on every row and clicking twice is harmless. Worth confirming with
   * the designer, because hiding it is a real alternative.
   *
   * **The watch date question, which the design never answers.** Monthly stats
   * key off `watchDate`, and FIL-30 makes a watched title with no date count
   * nowhere. So marking something watched from the row menu and then watching the
   * dashboard's count not move would read as a broken dashboard rather than as
   * missing data. The decision recorded here:
   *
   * - A title that was **not** watched and has no date gets today's, so the
   *   action a user just took shows up where they will look for it.
   * - An existing date is never overwritten, because the user typed it and this
   *   action is not about the date.
   * - A title that was **already** watched is left entirely alone, which is what
   *   keeps the idempotence above literal rather than approximate.
   *
   * The consequence to flag: a title marked watched today but actually seen last
   * month lands in this month's stats. The alternative, leaving the date null,
   * loses it from every month instead. Neither is designed; this one is at least
   * visible to the user.
   *
   * `now` is injectable so tests can pin the date. Nothing in production passes
   * it.
   */
  async markWatched(
    userId: string,
    id: string,
    now: Date = new Date(),
  ): Promise<Title> {
    const title = await this.titles.findByIdOrThrow(userId, id);

    if (title.status === 'watched') {
      return title;
    }

    return this.titles.update(userId, id, {
      status: 'watched',
      // Midnight UTC: `watchDate` is a Date column and the month and week buckets
      // key off it, so a timezone-bearing value makes the 1st and the 31st
      // ambiguous.
      watchDate: title.watchDate ?? startOfUtcDay(now),
    });
  }

  /**
   * Flips the favourite flag (LIB-6).
   *
   * A toggle rather than a set, because the heart has no third state and the row
   * already knows which one it is showing. It reads before it writes rather than
   * flipping in SQL so the caller gets the resulting row back: FIL-46 updates the
   * heart optimistically and reverts on failure, which needs the server's answer
   * to confirm against rather than the value it assumed.
   */
  async toggleFavorite(userId: string, id: string): Promise<Title> {
    const title = await this.titles.findByIdOrThrow(userId, id);

    return this.titles.update(userId, id, { favorite: !title.favorite });
  }
}

/** Strips the time so a Date column stores the day the user is actually in. */
function startOfUtcDay(now: Date): Date {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}
