import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { Title, TitleStatus, TitleType } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator';
import { NeonAuthGuard, type NeonAuthUser } from '../auth/neon-auth.guard';
import { TitlesRepository, type TitleWithGenre } from './titles.repository';

const TYPES: TitleType[] = ['movie', 'series'];
const STATUSES: TitleStatus[] = ['watched', 'watching', 'want_to_watch'];

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

/** What the Add title form (08) sends. */
export interface CreateTitleBody {
  name?: unknown;
  type?: unknown;
  status?: unknown;
  genreId?: unknown;
  watchDate?: unknown;
  rating?: unknown;
  note?: unknown;
  favorite?: unknown;
}

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
  constructor(private readonly titles: TitlesRepository) {}

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
      if (!isOneOf(query.status, STATUSES)) {
        throw new BadRequestException({
          message: `status must be one of ${STATUSES.join(', ')}`,
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
   * Validated by hand, since the project has no class-validator. Required fields
   * are name, type, genre and status per ADD-6; watch date, rating and note stay
   * optional whatever the status is, because A20 ties none of them together.
   */
  @Post()
  @UseGuards(NeonAuthGuard)
  async createTitle(
    @CurrentUser() user: NeonAuthUser,
    @Body() body: CreateTitleBody,
  ): Promise<Title> {
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const missing: string[] = [];

    if (!name) missing.push('name');
    if (!isOneOf(body?.type, TYPES)) missing.push('type');
    if (!isOneOf(body?.status, STATUSES)) missing.push('status');
    if (typeof body?.genreId !== 'string' || !body.genreId)
      missing.push('genreId');

    if (missing.length > 0) {
      // Named per field rather than a single "invalid payload", so the form can
      // mark the offending inputs (FIL-59) instead of showing one banner.
      throw new BadRequestException({
        message: 'Some required fields are missing or invalid',
        fields: missing,
      });
    }

    // Half-star units, 0 to 10 (A21). Anything else is a bug in the caller
    // rather than something to silently clamp.
    if (body.rating !== undefined && body.rating !== null) {
      const rating = Number(body.rating);
      if (!Number.isInteger(rating) || rating < 0 || rating > 10) {
        throw new BadRequestException({
          message: 'rating must be a whole number of half-stars, 0 to 10',
          fields: ['rating'],
        });
      }
    }

    return this.titles.create(user.id, {
      name,
      type: body.type as TitleType,
      status: body.status as TitleStatus,
      genreId: body.genreId as string,
      watchDate:
        typeof body.watchDate === 'string' && body.watchDate
          ? new Date(`${body.watchDate}T00:00:00.000Z`)
          : null,
      rating:
        body.rating === undefined || body.rating === null
          ? null
          : Number(body.rating),
      note:
        typeof body.note === 'string' && body.note.trim()
          ? body.note.trim()
          : null,
      favorite: body.favorite === true,
    });
  }
}

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
