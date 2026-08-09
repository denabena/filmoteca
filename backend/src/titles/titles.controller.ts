import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { Title, TitleStatus, TitleType } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator';
import { NeonAuthGuard, type NeonAuthUser } from '../auth/neon-auth.guard';
import { TitlesRepository } from './titles.repository';

const TYPES: TitleType[] = ['movie', 'series'];
const STATUSES: TitleStatus[] = ['watched', 'watching', 'want_to_watch'];

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

/**
 * A user's own titles (FIL-42, FIL-54).
 *
 * Everything goes through TitlesRepository, so a caller can only ever reach their
 * own rows and somebody else's id is a 404 rather than a 403.
 */
@Controller('titles')
export class TitlesController {
  constructor(private readonly titles: TitlesRepository) {}

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

function isOneOf<T extends string>(value: unknown, allowed: T[]): value is T {
  return typeof value === 'string' && (allowed as string[]).includes(value);
}
