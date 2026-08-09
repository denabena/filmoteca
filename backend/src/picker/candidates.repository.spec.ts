import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { CandidatesRepository } from './candidates.repository';

const USER = 'neon-user-123';

/** Just enough of the findMany argument to assert on, without Prisma's generics. */
interface FindArgs {
  where: { AND: unknown[] };
  orderBy: unknown;
  take: number;
}

describe('CandidatesRepository', () => {
  const findManyTitles = jest.fn();
  const findManyPicks = jest.fn();
  const findManyCandidates = jest.fn<Promise<unknown[]>, [FindArgs]>();

  let candidates: CandidatesRepository;

  beforeEach(async () => {
    findManyTitles.mockReset().mockResolvedValue([]);
    findManyPicks.mockReset().mockResolvedValue([]);
    findManyCandidates.mockReset().mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CandidatesRepository,
        {
          provide: PrismaService,
          useValue: {
            title: { findMany: findManyTitles },
            pick: { findMany: findManyPicks },
            catalogueTitle: { findMany: findManyCandidates, count: jest.fn() },
          },
        },
      ],
    }).compile();

    candidates = module.get(CandidatesRepository);
  });

  const argsOf = (): FindArgs => {
    const [call] = findManyCandidates.mock.calls;
    if (!call) throw new Error('catalogueTitle.findMany was never called');
    return call[0];
  };
  const whereOf = () => argsOf().where;

  it('excludes titles already in the library, case-insensitively', async () => {
    findManyTitles.mockResolvedValue([{ name: 'Arrival', type: 'movie' }]);

    await candidates.findEligible(USER, [], 10);

    expect(whereOf().AND).toContainEqual({
      NOT: [
        { name: { equals: 'Arrival', mode: 'insensitive' }, type: 'movie' },
      ],
    });
  });

  // The bug this guards: FIL-81 stores one catalogue row per title per genre, so
  // excluding the single dismissed row left the same film eligible under its
  // other genres. Dismissing a film as Drama and being offered it again as
  // Sci-Fi is precisely what "Not for me" exists to prevent.
  it('excludes a dismissed title by TMDB identity, not by catalogue row', async () => {
    findManyPicks.mockResolvedValue([
      { catalogueTitle: { type: 'movie', tmdbId: 27205 } },
    ]);

    await candidates.findEligible(USER, [], 10);

    expect(whereOf().AND).toContainEqual({
      NOT: [{ type: 'movie', tmdbId: 27205 }],
    });
  });

  it('reads dismissals only, never suggested or added picks', async () => {
    await candidates.findEligible(USER, [], 10);

    expect(findManyPicks).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: USER, state: 'dismissed' } }),
    );
  });

  // moodFilter returns its own AND, so it nests rather than flattening. That is
  // fine for Prisma and worth pinning, since flattening it would silently change
  // how two moods combine.
  it('applies the mood filter alongside the exclusions', async () => {
    await candidates.findEligible(USER, ['edge-of-seat'], 10);

    expect(whereOf().AND).toContainEqual({
      AND: [{ genre: { slug: { in: ['thriller', 'horror'] } } }],
    });
  });

  it('passes no mood clause at all when none are selected', async () => {
    await candidates.findEligible(USER, [], 10);

    expect(whereOf().AND).toContainEqual({});
  });

  it('orders by popularity so a shrunken pool still surfaces something good', async () => {
    await candidates.findEligible(USER, [], 10);

    const args = argsOf();
    expect(args.orderBy).toEqual([
      { voteCount: 'desc' },
      { voteAverage: 'desc' },
      { id: 'asc' },
    ]);
    expect(args.take).toBe(10);
  });
});
