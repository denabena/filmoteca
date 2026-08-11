import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { Profile } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { NeonAuthUser } from '../auth/neon-auth.guard';
import { ProfileService, splitName } from './profile.service';

describe('splitName', () => {
  it.each([
    ['Ana Skukan', { firstName: 'Ana', lastName: 'Skukan' }],
    ['Ana van der Berg', { firstName: 'Ana', lastName: 'van der Berg' }],
    ['Cher', { firstName: 'Cher', lastName: null }],
    ['  Ana  Skukan  ', { firstName: 'Ana', lastName: 'Skukan' }],
    ['', { firstName: null, lastName: null }],
    [undefined, { firstName: null, lastName: null }],
  ])('splits %p into first/last', (input, expected) => {
    expect(splitName(input)).toEqual(expected);
  });
});

describe('ProfileService', () => {
  let service: ProfileService;
  const upsert = jest.fn();
  const update = jest.fn();

  const user: NeonAuthUser = {
    id: 'neon-user-123',
    email: 'ana@example.com',
    name: 'Ana Skukan',
    claims: { sub: 'neon-user-123' },
  };

  const stored: Profile = {
    id: 'profile-uuid',
    userId: 'neon-user-123',
    firstName: 'Ana',
    lastName: 'Skukan',
    monthlyWatchGoal: 15,
    defaultType: 'movie',
    newReleaseReminders: false,
    favoriteGenres: [],
    avatarUrl: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  };

  beforeEach(async () => {
    upsert.mockReset().mockResolvedValue(stored);
    update.mockReset().mockResolvedValue(stored);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileService,
        { provide: PrismaService, useValue: { profile: { upsert, update } } },
      ],
    }).compile();

    service = module.get(ProfileService);
  });

  describe('ensure', () => {
    it('upserts on the JWT user id, seeding the name split from the token', async () => {
      await service.ensure(user);

      expect(upsert).toHaveBeenCalledWith({
        where: { userId: 'neon-user-123' },
        create: {
          userId: 'neon-user-123',
          firstName: 'Ana',
          lastName: 'Skukan',
        },
        update: {},
      });
    });

    it('returns the stored profile', async () => {
      await expect(service.ensure(user)).resolves.toBe(stored);
    });
  });

  describe('updatePreferences', () => {
    it.each([0, 100, -1, 3.5])(
      'rejects an out-of-range or non-integer goal (%p)',
      async (goal) => {
        await expect(
          service.updatePreferences('neon-user-123', {
            monthlyWatchGoal: goal,
          }),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(update).not.toHaveBeenCalled();
      },
    );

    it('accepts an empty genre selection', async () => {
      await service.updatePreferences('neon-user-123', { favoriteGenres: [] });

      expect(update).toHaveBeenCalledWith({
        where: { userId: 'neon-user-123' },
        data: { favoriteGenres: [] },
      });
    });

    it('stores a valid goal and de-duplicated genres in one round trip', async () => {
      await service.updatePreferences('neon-user-123', {
        monthlyWatchGoal: 20,
        favoriteGenres: ['scifi', 'drama', 'scifi'],
      });

      expect(update).toHaveBeenCalledWith({
        where: { userId: 'neon-user-123' },
        data: { monthlyWatchGoal: 20, favoriteGenres: ['scifi', 'drama'] },
      });
    });

    it('returns the stored profile', async () => {
      await expect(
        service.updatePreferences('neon-user-123', { monthlyWatchGoal: 10 }),
      ).resolves.toBe(stored);
    });

    it('rejects an avatar that is not an image data URL', async () => {
      await expect(
        service.updatePreferences('neon-user-123', {
          avatarUrl: 'https://example.com/a.png',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(update).not.toHaveBeenCalled();
    });

    it('rejects an oversized avatar', async () => {
      const huge = 'data:image/png;base64,' + 'A'.repeat(300_000);
      await expect(
        service.updatePreferences('neon-user-123', { avatarUrl: huge }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(update).not.toHaveBeenCalled();
    });

    it('stores a valid avatar data URL and clears it with null', async () => {
      await service.updatePreferences('neon-user-123', {
        avatarUrl: 'data:image/jpeg;base64,abc',
      });
      expect(update).toHaveBeenCalledWith({
        where: { userId: 'neon-user-123' },
        data: { avatarUrl: 'data:image/jpeg;base64,abc' },
      });

      await service.updatePreferences('neon-user-123', { avatarUrl: null });
      expect(update).toHaveBeenLastCalledWith({
        where: { userId: 'neon-user-123' },
        data: { avatarUrl: null },
      });
    });
  });
});
