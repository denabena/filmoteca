import { Controller, Get, UseGuards } from '@nestjs/common';
import { NeonAuthGuard } from '../auth/neon-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

/** A genre as the Add title select and the genre chips need it. */
export interface GenreOption {
  id: string;
  slug: string;
  name: string;
  colorSlot: number;
}

/**
 * The twelve genres (part of FIL-43).
 *
 * Reference data, not user data, so there is nothing to scope. Guarded anyway:
 * nothing in this app is reachable signed out, and leaving one route open would
 * be a surprise rather than a feature.
 *
 * The derived per-user title counts FIL-43 also asks for are not here yet; this
 * is the list the Add title form needs to offer a genre at all.
 */
@Controller('genres')
export class GenresController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @UseGuards(NeonAuthGuard)
  async list(): Promise<GenreOption[]> {
    return this.prisma.genre.findMany({
      select: { id: true, slug: true, name: true, colorSlot: true },
      orderBy: { name: 'asc' },
    });
  }
}
