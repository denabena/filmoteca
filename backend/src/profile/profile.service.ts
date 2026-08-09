import { Injectable } from '@nestjs/common';
import type { Profile } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { NeonAuthUser } from '../auth/neon-auth.guard';

/**
 * Splits the single `name` Neon Auth stores into the first/last pair this app's
 * Profile keeps. Neon sign-up collects one "name" field, so everything up to the
 * first space is the first name and the remainder is the last name.
 *
 * Returns nulls for an empty or missing name rather than empty strings, so the
 * column stays genuinely absent until the user fills it in on Settings.
 */
export function splitName(name?: string): {
  firstName: string | null;
  lastName: string | null;
} {
  const trimmed = name?.trim() ?? '';

  if (!trimmed) {
    return { firstName: null, lastName: null };
  }

  const firstSpace = trimmed.indexOf(' ');

  if (firstSpace === -1) {
    return { firstName: trimmed, lastName: null };
  }

  return {
    firstName: trimmed.slice(0, firstSpace),
    lastName: trimmed.slice(firstSpace + 1).trim() || null,
  };
}

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns the signed-in user's Profile, creating it on first sight.
   *
   * This is the rescoped FIL-11: identity, sessions and password hashing all
   * belong to Neon Auth, so the backend never stores a User. What it does own is
   * the app-level Profile, and it is created lazily the first time a verified
   * token arrives rather than at some separate registration step, because Neon
   * Auth owns registration and never calls us.
   *
   * The upsert is keyed on `userId` (the JWT `sub`). On an existing profile the
   * update is deliberately empty: the name seeded from the token must not clobber
   * whatever the user later sets in Settings (FIL-74).
   */
  async ensure(user: NeonAuthUser): Promise<Profile> {
    const { firstName, lastName } = splitName(user.name);

    return this.prisma.profile.upsert({
      where: { userId: user.id },
      create: { userId: user.id, firstName, lastName },
      update: {},
    });
  }
}
