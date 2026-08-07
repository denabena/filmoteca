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

describe('ProfileService.ensure', () => {
  let service: ProfileService;
  const upsert = jest.fn();

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
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  };

  beforeEach(async () => {
    upsert.mockReset().mockResolvedValue(stored);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileService,
        { provide: PrismaService, useValue: { profile: { upsert } } },
      ],
    }).compile();

    service = module.get(ProfileService);
  });

  it('upserts on the JWT user id, seeding the name split from the token', async () => {
    await service.ensure(user);

    expect(upsert).toHaveBeenCalledWith({
      where: { userId: 'neon-user-123' },
      create: { userId: 'neon-user-123', firstName: 'Ana', lastName: 'Skukan' },
      update: {},
    });
  });

  it('returns the stored profile', async () => {
    await expect(service.ensure(user)).resolves.toBe(stored);
  });
});
