import { BadRequestException, ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma, type Profile } from '@prisma/client';
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
    email: 'ana@example.com',
    monthlyWatchGoal: 15,
    defaultType: 'movie',
    newReleaseReminders: false,
    favoriteGenres: [],
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
          email: 'ana@example.com',
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

    it('rejects a blank first or last name per field', async () => {
      await expect(
        service.updatePreferences('neon-user-123', { firstName: '  ' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        service.updatePreferences('neon-user-123', { lastName: '' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(update).not.toHaveBeenCalled();
    });

    it('rejects a malformed email', async () => {
      await expect(
        service.updatePreferences('neon-user-123', { email: 'not-an-email' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(update).not.toHaveBeenCalled();
    });

    it('stores a normalised name and email', async () => {
      await service.updatePreferences('neon-user-123', {
        firstName: 'Ana',
        lastName: 'Skukan',
        email: '  Ana@Example.com ',
      });

      expect(update).toHaveBeenCalledWith({
        where: { userId: 'neon-user-123' },
        data: {
          firstName: 'Ana',
          lastName: 'Skukan',
          email: 'ana@example.com',
        },
      });
    });

    it('maps a duplicate-email unique violation to a conflict', async () => {
      update.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );

      await expect(
        service.updatePreferences('neon-user-123', {
          email: 'taken@example.com',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rejects a default type other than movie or series', async () => {
      await expect(
        service.updatePreferences('neon-user-123', {
          defaultType: 'documentary',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(update).not.toHaveBeenCalled();
    });

    it.each([true, false])(
      'persists the reminders toggle (%p)',
      async (flag) => {
        await service.updatePreferences('neon-user-123', {
          newReleaseReminders: flag,
        });

        expect(update).toHaveBeenCalledWith({
          where: { userId: 'neon-user-123' },
          data: { newReleaseReminders: flag },
        });
      },
    );

    it('stores a valid default type', async () => {
      await service.updatePreferences('neon-user-123', {
        defaultType: 'series',
      });

      expect(update).toHaveBeenCalledWith({
        where: { userId: 'neon-user-123' },
        data: { defaultType: 'series' },
      });
    });
  });
});
