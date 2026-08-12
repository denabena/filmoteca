import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { NeonAuthGuard, type NeonAuthUser } from '../auth/neon-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { GenresService, type GenreWithCount } from './genres.service';

/** A genre as the Add title select and the genre chips need it. */
export interface GenreOption {
  id: string;
  slug: string;
  name: string;
  colorSlot: number;
}

/**
 * The genres (FIL-43).
 *
 * Two routes, because the two callers need different things and neither wants
 * the other's answer:
 *
 * - `GET /api/genres` lists all twelve, because the Add title select has to offer
 *   a genre the user has never used before.
 * - `GET /api/genres/counts` lists only the ones with titles, because the Genres
 *   tab draws a card per genre the user actually has.
 *
 * The first is reference data with nothing to scope. Guarded anyway: nothing in
 * this app is reachable signed out, and leaving one route open would be a
 * surprise rather than a feature.
 */
@Controller('genres')
export class GenresController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly genres: GenresService,
  ) {}

  @Get()
  @UseGuards(NeonAuthGuard)
  async list(): Promise<GenreOption[]> {
    return this.prisma.genre.findMany({
      select: { id: true, slug: true, name: true, colorSlot: true },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * The Genres tab and the Settings genres card (GEN-3).
   *
   * Declared above no `:param` route, so the literal segment cannot be swallowed
   * by one later.
   */
  @Get('counts')
  @UseGuards(NeonAuthGuard)
  async listWithCounts(
    @CurrentUser() user: NeonAuthUser,
  ): Promise<GenreWithCount[]> {
    return this.genres.listWithCounts(user.id);
  }
}
