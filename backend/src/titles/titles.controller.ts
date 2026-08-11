import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { Title, TitleStatus, TitleType } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator';
import { NeonAuthGuard, type NeonAuthUser } from '../auth/neon-auth.guard';
import {
  parseTitlePayload,
  TITLE_STATUSES,
  type TitlePayloadBody,
} from './title-payload';
import { TitlesRepository, type TitleWithGenre } from './titles.repository';
import { TitlesService } from './titles.service';

/**
 * The two orders the library's "Sort: Recent" dropdown offers.
 *
 * A14: only the closed control is drawn, so this list is a working decision.
 * Added date with a reverse is the minimum that satisfies FIL-41's criteria; if
 * the designer wants sort-by-name or sort-by-rating, they are one entry each
 * here plus one `orderBy` below.
 */
const SORTS = ['recent', 'oldest'] as const;
type TitleSort = (typeof SORTS)[number];

/** The genre as a library row draws it: a coloured dot and a name. */
export interface TitleListGenre {
  id: string;
  slug: string;
  name: string;
  colorSlot: number;
}

/**
 * One row of the library table (06).
 *
 * Deliberately not the whole `Title`. FIL-41's criterion names exactly what a row
 * displays, and serialising the model wholesale would put `userId` and the note
 * body on the wire for a screen that shows neither.
 */
export interface TitleListItem {
  id: string;
  name: string;
  year: number | null;
  type: TitleType;
  genre: TitleListGenre;
  status: TitleStatus;
  rating: number | null;
  favorite: boolean;
}

/** What `GET /api/titles` accepts. All three are optional and independent. */
export interface ListTitlesQuery {
  search?: string;
  status?: string;
  sort?: string;
}

/**
 * A user's own titles (FIL-41, FIL-42, FIL-54).
 *
 * Everything goes through TitlesRepository, so a caller can only ever reach their
 * own rows and somebody else's id is a 404 rather than a 403.
 */
@Controller('titles')
export class TitlesController {
  constructor(
    private readonly titles: TitlesRepository,
    private readonly actions: TitlesService,
  ) {}

  /**
   * The library list (LIB-3 · FIL-41).
   *
   * Search, status and sort are three independent narrowings of one query rather
   * than three endpoints, because the table applies them together and a client
   * that had to intersect three responses would get a different answer than the
   * database does.
   *
   * A16: no pagination is designed, so this returns the whole list and the table
   * scrolls. Worth revisiting if a library ever grows past a few hundred rows.
   */
  @Get()
  @UseGuards(NeonAuthGuard)
  async listTitles(
    @CurrentUser() user: NeonAuthUser,
    @Query() query: ListTitlesQuery,
  ): Promise<TitleListItem[]> {
    const search = typeof query.search === 'string' ? query.search.trim() : '';

    // An unknown status is a caller bug, not "show me everything": silently
    // ignoring it would hand back the full library under a filter label. An
    // absent one really does mean all three, which is the dropdown's "All".
    let status: TitleStatus | undefined;
    if (query.status) {
      if (!isOneOf(query.status, TITLE_STATUSES)) {
        throw new BadRequestException({
          message: `status must be one of ${TITLE_STATUSES.join(', ')}`,
          fields: ['status'],
        });
      }
      status = query.status;
    }

    let sort: TitleSort = 'recent';
    if (query.sort) {
      if (!isOneOf(query.sort, SORTS)) {
        throw new BadRequestException({
          message: `sort must be one of ${SORTS.join(', ')}`,
          fields: ['sort'],
        });
      }
      sort = query.sort;
    }

    const rows = await this.titles.findManyWithGenre(user.id, {
      where: {
        // `mode: 'insensitive'` is Postgres ILIKE. Omitting it is the classic way
        // a search for "dune" misses a title stored as "Dune".
        ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
        ...(status ? { status } : {}),
      },
      // `createdAt` is the tech spec's "added" date, so newest-first is "Recent".
      orderBy: { createdAt: sort === 'oldest' ? 'asc' : 'desc' },
    });

    return rows.map(toListItem);
  }

  /** One title, for the detail screen (07). 404 if it is not yours. */
  @Get(':id')
  @UseGuards(NeonAuthGuard)
  async getTitle(
    @CurrentUser() user: NeonAuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Title> {
    return this.titles.findByIdOrThrow(user.id, id);
  }

  /**
   * Creates a title (ADD-3).
   *
   * Validated by hand through `parseTitlePayload`, since the project has no
   * class-validator. The rules live there rather than here because Edit (FIL-55)
   * has to apply exactly the same ones.
   */
  @Post()
  @UseGuards(NeonAuthGuard)
  async createTitle(
    @CurrentUser() user: NeonAuthUser,
    @Body() body: TitlePayloadBody,
  ): Promise<Title> {
    return this.titles.create(user.id, parseTitlePayload(body));
  }

  /**
   * Saves the Edit title modal (EDT-2 · FIL-55).
   *
   * A PUT rather than a PATCH, because the modal submits the whole form: every
   * field it draws is present on every save, so an omitted optional field means
   * "cleared" rather than "leave it alone". A PATCH would make those two cases
   * indistinguishable and leave a note the user just emptied still in the row.
   *
   * **Nothing is recomputed here, and that is the design working.** A23 lists
   * what a change has to settle: genre counts, dashboard stats, watch activity
   * and Picker gating. Every one of those is derived on read, so a genre change
   * moves both counts and a watch-date change re-buckets two months' stats on the
   * next request with no invalidation hook on this path. The place that would
   * break is a stored aggregate, and there is deliberately none.
   *
   * Ownership is the repository's: another user's id is a 404 with nothing
   * written, because `update` checks before it writes.
   */
  @Put(':id')
  @UseGuards(NeonAuthGuard)
  async updateTitle(
    @CurrentUser() user: NeonAuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: TitlePayloadBody,
  ): Promise<Title> {
    return this.titles.update(user.id, id, parseTitlePayload(body));
  }

  /**
   * Deletes a title (DEL-2, DEL-3 · FIL-56).
   *
   * **A hard delete, and the design is what decides that.** DEL-3's copy reads
   * "permanently removed" and "can't be undone", so a `deletedAt` flag would make
   * the dialog lie: the row would still be there, and every derived query would
   * need a filter that someone eventually forgets. The rating, note and watch
   * date go with it because they are columns on the same row.
   *
   * 204 with no body: there is nothing meaningful to return, and the dialog's
   * next step is navigating back to the list rather than rendering a response.
   *
   * Deleting an id that is already gone is a 404 rather than a 500, which falls
   * out of the repository's ownership check running before the write: "not yours"
   * and "not there" are the same answer, which is also what stops a 404 sweep
   * confirming which ids exist in someone else's library.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(NeonAuthGuard)
  async deleteTitle(
    @CurrentUser() user: NeonAuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.titles.delete(user.id, id);
  }

  /**
   * Marks a title watched from the row menu (MNU-2 · FIL-57).
   *
   * The full row comes back rather than a 204, because the row that fired this
   * has to redraw its status chip and the dashboard cards behind it change too:
   * returning the stored state is what lets the client render the server's answer
   * instead of the one it assumed.
   *
   * The watch-date and idempotence decisions are in `TitlesService.markWatched`,
   * which is where the reasoning belongs rather than duplicated here.
   */
  @Post(':id/watched')
  @UseGuards(NeonAuthGuard)
  async markWatched(
    @CurrentUser() user: NeonAuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Title> {
    return this.actions.markWatched(user.id, id);
  }

  /**
   * Flips the FAV column heart (LIB-6 · FIL-57).
   *
   * Returns the stored row, whose `favorite` is the resulting state. FIL-46
   * updates the heart optimistically and reverts on failure, so it needs
   * something to confirm against; a 204 would leave it asserting its own guess.
   */
  @Post(':id/favorite')
  @UseGuards(NeonAuthGuard)
  async toggleFavorite(
    @CurrentUser() user: NeonAuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Title> {
    return this.actions.toggleFavorite(user.id, id);
  }
}

/** Membership test for the query-string enums above. */
function isOneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
): value is T {
  return (
    typeof value === 'string' && (allowed as readonly string[]).includes(value)
  );
}

/** Narrows a stored row to the eight fields a library row draws. */
function toListItem(title: TitleWithGenre): TitleListItem {
  return {
    id: title.id,
    name: title.name,
    year: title.year,
    type: title.type,
    genre: {
      id: title.genre.id,
      slug: title.genre.slug,
      name: title.genre.name,
      colorSlot: title.genre.colorSlot,
    },
    status: title.status,
    rating: title.rating,
    favorite: title.favorite,
  };
}
