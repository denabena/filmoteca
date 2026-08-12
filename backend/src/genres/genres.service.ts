import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TitlesRepository } from '../titles/titles.repository';

/**
 * A genre card on the Genres tab (12), and a line in the Settings genres card.
 *
 * FIL-43's criterion names name, count and colour slot. `id`, `slug` and
 * `descriptor` come along because the card the frontend draws (FIL-50) needs a
 * key, a palette lookup and its one-line tagline, and a second round trip for
 * three columns already in hand would be silly.
 */
export interface GenreWithCount {
  id: string;
  slug: string;
  name: string;
  colorSlot: number;
  /**
   * The card tagline. Null until that copy is read out of the design: A24 makes
   * it static per genre, so it belongs beside the palette slot rather than in
   * frontend code, but inventing the strings here would look settled.
   */
  descriptor: string | null;
  titleCount: number;
}

/**
 * The genres a user actually has titles in, with a count each (GEN-3 · FIL-43).
 *
 * **Entirely derived, nothing is stored.** That is what makes the trickier
 * criteria fall out for free: delete the last title in a genre and the card is
 * gone on the next read, move a title between genres and both counts settle, all
 * without an invalidation hook on any mutation path.
 *
 * **Genres with no titles are absent, not zero.** A7 records the tension:
 * onboarding offers twelve genres, the Genres tab draws eight cards and Settings
 * says "8 genres". The working decision this implements is that the twelve are the
 * app's fixed set and a card appears once a genre has at least one title, so the
 * eight in the mock are a consequence of that mock's data rather than a list.
 * Note this contradicts the aside in `schema.prisma` about returning all twelve
 * including the zeros; the ticket's acceptance criteria win, and the schema
 * comment is corrected in this change.
 *
 * A29: the mock's card counts total 36 while frame 06 lists 10 rows. Illustrative
 * only, which is why every number here is computed.
 */
@Injectable()
export class GenresService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly titles: TitlesRepository,
  ) {}

  /**
   * Two queries, joined in memory.
   *
   * The counts have to come through TitlesRepository, because it is the only code
   * permitted to touch `titles` and it is what merges the owner into the query. A
   * single SQL join would be one round trip fewer and would put an unscoped title
   * query in this file, which is the trade the repository rule exists to refuse.
   * There are twelve genres, so the join is over twelve rows.
   */
  async listWithCounts(userId: string): Promise<GenreWithCount[]> {
    const [genres, counts] = await Promise.all([
      this.prisma.genre.findMany({
        select: {
          id: true,
          slug: true,
          name: true,
          colorSlot: true,
          descriptor: true,
        },
        // Alphabetical, matching `GET /api/genres`. The design draws no order on
        // the cards, and a stable one keeps a card from moving between reads.
        orderBy: { name: 'asc' },
      }),
      this.titles.countByGenre(userId),
    ]);

    const byGenreId = new Map(
      counts.map(({ genreId, count }) => [genreId, count]),
    );

    return genres
      .map((genre) => ({ ...genre, titleCount: byGenreId.get(genre.id) ?? 0 }))
      .filter((genre) => genre.titleCount > 0);
  }
}
