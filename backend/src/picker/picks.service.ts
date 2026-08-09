import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { Pick, TitleType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TitlesRepository } from '../titles/titles.repository';
import { CandidatesRepository } from './candidates.repository';
import type { Mood } from './moods';
import { PickerGateService } from './picker-gate.service';
import { buildReason, buildTasteProfile, scoreCandidate } from './pick-scoring';

/** One card on PIC-6. */
export interface PickCard {
  id: string;
  name: string;
  year: number | null;
  type: TitleType;
  genre: string;
  runtime: number | null;
  posterPath: string | null;
  matchPercent: number;
  reason: string;
  state: Pick['state'];
}

/** How many cards a generation produces. PIC-6 draws three. */
export const PICKS_PER_BATCH = 3;

/**
 * Generation and the two things a user can do with a pick (FIL-65, FIL-66).
 */
@Injectable()
export class PicksService {
  private readonly logger = new Logger(PicksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly candidates: CandidatesRepository,
    private readonly titles: TitlesRepository,
    private readonly gate: PickerGateService,
  ) {}

  /** The current batch, which is what PIC-6 renders. */
  async getCurrent(userId: string): Promise<PickCard[]> {
    const latest = await this.prisma.pick.findFirst({
      where: { userId },
      orderBy: { generatedAt: 'desc' },
      select: { batchId: true },
    });

    if (!latest) return [];

    const picks = await this.prisma.pick.findMany({
      where: { userId, batchId: latest.batchId, state: { not: 'dismissed' } },
      include: { genre: true },
      orderBy: { rank: 'asc' },
    });

    return picks.map(toCard);
  }

  /**
   * Generates a fresh batch (FIL-65).
   *
   * **Refuses below the unlock threshold** rather than returning weak picks: with
   * fewer than three rated titles there is no taste to read, and a bad first
   * suggestion is worse than a locked card.
   *
   * **The new batch is written in one transaction at the end**, so a failure
   * anywhere leaves the previous batch as the newest and the dashboard teaser
   * never empties out because of a transient error. That is A27's working
   * decision; generation has no designed failure state at all.
   *
   * Regenerating does not delete the old batch. `getCurrent` reads the newest
   * one, and keeping the history is what makes a dismissal permanent.
   */
  async generate(userId: string, moods: Mood[]): Promise<PickCard[]> {
    const gate = await this.gate.getState(userId);

    if (!gate.unlocked) {
      throw new ConflictException(
        `The Picker needs ${gate.threshold} rated titles. You have ${gate.ratedCount}.`,
      );
    }

    const library = await this.prisma.title.findMany({
      where: { userId },
      select: { name: true, rating: true, genre: { select: { slug: true } } },
    });
    const taste = buildTasteProfile(library);

    // Over-fetch so scoring has something to choose between. A pool smaller than
    // this simply yields fewer picks rather than an error.
    const pool = await this.candidates.findEligible(userId, moods, 60);

    if (pool.length === 0) {
      // Exhausted, which the design never covers. Degrading to an empty batch and
      // saying so beats throwing, because the alternative is a Picker that breaks
      // for the most engaged users first.
      this.logger.warn(`No eligible candidates left for ${userId}`);
      return [];
    }

    // One row per title per genre means the same film can appear in the pool
    // several times. Showing it twice in a batch of three would look broken, so
    // the first occurrence wins and the rest are dropped before scoring.
    const seen = new Set<string>();
    const distinct = pool.filter((candidate) => {
      const key = `${candidate.type}:${candidate.tmdbId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const scored = distinct
      .map((candidate) => ({
        candidate,
        matchPercent: scoreCandidate(candidate, taste, moods),
        reason: buildReason(candidate, taste, moods),
      }))
      // Ties break on the pool's own order, which is vote count then id, so the
      // result is deterministic rather than whatever sort() happened to do.
      .sort((a, b) => b.matchPercent - a.matchPercent)
      .slice(0, PICKS_PER_BATCH);

    const batchId = randomUuid();

    const created = await this.prisma.$transaction(
      scored.map((entry, rank) =>
        this.prisma.pick.upsert({
          // A candidate is offered to a user at most once, so a re-suggestion
          // moves the existing row into the new batch rather than colliding.
          where: {
            userId_catalogueTitleId: {
              userId,
              catalogueTitleId: entry.candidate.id,
            },
          },
          create: {
            userId,
            batchId,
            rank,
            catalogueTitleId: entry.candidate.id,
            name: entry.candidate.name,
            year: entry.candidate.year,
            type: entry.candidate.type,
            runtime: entry.candidate.runtime,
            genreId: entry.candidate.genreId,
            posterPath: entry.candidate.posterPath,
            matchPercent: entry.matchPercent,
            reason: entry.reason,
            moods,
            state: 'suggested',
          },
          update: {
            batchId,
            rank,
            matchPercent: entry.matchPercent,
            reason: entry.reason,
            moods,
            state: 'suggested',
            generatedAt: new Date(),
          },
          include: { genre: true },
        }),
      ),
    );

    return created.map(toCard);
  }

  /**
   * Adds a pick to the library (FIL-66, PIC-7).
   *
   * The created title is "Want to watch", and `year`, `runtime` and `posterPath`
   * are copied across, which per A17 is the only way a hand-managed library ever
   * gets those fields at all.
   *
   * Calling it twice creates one title: the pick's own state is the guard, so a
   * double click cannot duplicate a row.
   */
  async addToWatchlist(userId: string, pickId: string): Promise<PickCard> {
    const pick = await this.owned(userId, pickId);

    if (pick.state === 'added') {
      // Already done, and A25 designs no after-state, so this is not an error.
      return toCard(pick);
    }

    await this.titles.create(userId, {
      name: pick.name,
      type: pick.type,
      status: 'want_to_watch',
      genreId: pick.genreId,
      year: pick.year,
      runtime: pick.runtime,
      posterPath: pick.posterPath,
    });

    const updated = await this.prisma.pick.update({
      where: { id: pick.id },
      data: { state: 'added' },
      include: { genre: true },
    });

    return toCard(updated);
  }

  /**
   * Dismisses a pick (FIL-66, "Not for me").
   *
   * Permanent: the row stays `dismissed` forever and `CandidatesRepository`
   * excludes it from every future run. **Whether that is right is a real
   * question** the design does not answer, since "not tonight" and "never" are
   * different products.
   */
  async dismiss(userId: string, pickId: string): Promise<void> {
    const pick = await this.owned(userId, pickId);

    await this.prisma.pick.update({
      where: { id: pick.id },
      data: { state: 'dismissed' },
    });
  }

  /**
   * Loads a pick, or 404s.
   *
   * 404 rather than 403 for somebody else's pick, matching TitlesRepository: a
   * 403 would confirm the row exists.
   */
  private async owned(userId: string, pickId: string) {
    const pick = await this.prisma.pick.findFirst({
      where: { id: pickId, userId },
      include: { genre: true },
    });

    if (!pick) {
      throw new NotFoundException('Pick not found');
    }

    return pick;
  }
}

function toCard(pick: Pick & { genre: { name: string } }): PickCard {
  return {
    id: pick.id,
    name: pick.name,
    year: pick.year,
    type: pick.type,
    genre: pick.genre.name,
    runtime: pick.runtime,
    posterPath: pick.posterPath,
    matchPercent: pick.matchPercent,
    reason: pick.reason,
    state: pick.state,
  };
}

/** Node's crypto, kept behind a function so the import stays at the top. */
function randomUuid(): string {
  return globalThis.crypto.randomUUID();
}
