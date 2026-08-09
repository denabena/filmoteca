import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { TitlesRepository } from '../titles/titles.repository';
import { CandidatesRepository } from './candidates.repository';
import { PickerGateService } from './picker-gate.service';
import { PicksService } from './picks.service';

const USER = 'neon-user-123';

describe('PicksService', () => {
  const findEligible = jest.fn();
  const getState = jest.fn();
  const createTitle = jest.fn();
  const findManyTitles = jest.fn();
  const findFirstPick = jest.fn();
  const updatePick = jest.fn();

  let picks: PicksService;

  beforeEach(async () => {
    findEligible.mockReset().mockResolvedValue([]);
    getState
      .mockReset()
      .mockResolvedValue({ unlocked: true, ratedCount: 5, threshold: 3 });
    createTitle.mockReset().mockResolvedValue({});
    findManyTitles.mockReset().mockResolvedValue([]);
    findFirstPick.mockReset().mockResolvedValue(null);
    updatePick.mockReset().mockResolvedValue({});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PicksService,
        {
          provide: PrismaService,
          useValue: {
            title: { findMany: findManyTitles },
            pick: {
              findFirst: findFirstPick,
              update: updatePick,
              findMany: jest.fn(),
            },
            $transaction: jest.fn(),
          },
        },
        { provide: CandidatesRepository, useValue: { findEligible } },
        { provide: TitlesRepository, useValue: { create: createTitle } },
        { provide: PickerGateService, useValue: { getState } },
      ],
    }).compile();

    picks = module.get(PicksService);
  });

  describe('generation', () => {
    // A bad first suggestion is worse than a locked card, so this refuses rather
    // than returning something weak.
    it('refuses below the unlock threshold', async () => {
      getState.mockResolvedValue({
        unlocked: false,
        ratedCount: 2,
        threshold: 3,
      });

      await expect(picks.generate(USER, [])).rejects.toThrow(ConflictException);
      expect(findEligible).not.toHaveBeenCalled();
    });

    it('says how far off the user is when it refuses', async () => {
      getState.mockResolvedValue({
        unlocked: false,
        ratedCount: 1,
        threshold: 3,
      });

      await expect(picks.generate(USER, [])).rejects.toThrow(
        'The Picker needs 3 rated titles. You have 1.',
      );
    });

    // The exhausted case is undesigned. Degrading beats throwing, or the Picker
    // breaks for the most engaged users first.
    it('degrades to an empty batch when the pool is exhausted', async () => {
      findEligible.mockResolvedValue([]);

      await expect(picks.generate(USER, [])).resolves.toEqual([]);
    });

    it('passes the selected moods through to candidate selection', async () => {
      await picks.generate(USER, ['edge-of-seat']);

      expect(findEligible).toHaveBeenCalledWith(USER, ['edge-of-seat'], 60);
    });

    it('still selects candidates when no moods were chosen', async () => {
      await picks.generate(USER, []);

      expect(findEligible).toHaveBeenCalledWith(USER, [], 60);
    });
  });

  describe('another user’s pick', () => {
    it('404s on add', async () => {
      findFirstPick.mockResolvedValue(null);

      await expect(picks.addToWatchlist(USER, 'pick-uuid')).rejects.toThrow(
        NotFoundException,
      );
      expect(createTitle).not.toHaveBeenCalled();
    });

    it('404s on dismiss', async () => {
      findFirstPick.mockResolvedValue(null);

      await expect(picks.dismiss(USER, 'pick-uuid')).rejects.toThrow(
        NotFoundException,
      );
      expect(updatePick).not.toHaveBeenCalled();
    });

    it('scopes the lookup by owner as well as id', async () => {
      findFirstPick.mockResolvedValue(null);

      await expect(picks.dismiss(USER, 'pick-uuid')).rejects.toThrow();
      expect(findFirstPick).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'pick-uuid', userId: USER } }),
      );
    });
  });

  describe('add to watchlist', () => {
    const suggested = {
      id: 'pick-uuid',
      userId: USER,
      name: 'Arrival',
      year: 2016,
      type: 'movie',
      runtime: 116,
      genreId: 'genre-sci-fi',
      posterPath: '/arrival.jpg',
      matchPercent: 92,
      reason: 'because',
      state: 'suggested',
      genre: { name: 'Sci-Fi' },
    };

    it('creates a want-to-watch title carrying the pick’s fields', async () => {
      findFirstPick.mockResolvedValue(suggested);
      updatePick.mockResolvedValue({ ...suggested, state: 'added' });

      await picks.addToWatchlist(USER, 'pick-uuid');

      expect(createTitle).toHaveBeenCalledWith(USER, {
        name: 'Arrival',
        type: 'movie',
        status: 'want_to_watch',
        genreId: 'genre-sci-fi',
        year: 2016,
        runtime: 116,
        posterPath: '/arrival.jpg',
      });
    });

    // A double click must not produce two library rows.
    it('creates nothing the second time', async () => {
      findFirstPick.mockResolvedValue({ ...suggested, state: 'added' });

      const card = await picks.addToWatchlist(USER, 'pick-uuid');

      expect(createTitle).not.toHaveBeenCalled();
      expect(card.state).toBe('added');
    });
  });

  describe('dismiss', () => {
    it('marks the pick dismissed so it is never offered again', async () => {
      findFirstPick.mockResolvedValue({
        id: 'pick-uuid',
        userId: USER,
        genre: { name: 'Sci-Fi' },
        state: 'suggested',
      });

      await picks.dismiss(USER, 'pick-uuid');

      expect(updatePick).toHaveBeenCalledWith({
        where: { id: 'pick-uuid' },
        data: { state: 'dismissed' },
      });
    });
  });
});
