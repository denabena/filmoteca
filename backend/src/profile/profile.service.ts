import { BadRequestException, Injectable } from '@nestjs/common';
import type { Profile } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { NeonAuthUser } from '../auth/neon-auth.guard';

/** Onboarding / Settings preferences that can be updated on a profile (FIL-23). */
export interface ProfilePreferencesInput {
  monthlyWatchGoal?: number;
  favoriteGenres?: string[];
  avatarUrl?: string | null;
}

/** Monthly watch goal bounds: 1-99, step 1, default 15 (A4, a working decision). */
export const MONTHLY_GOAL_MIN = 1;
export const MONTHLY_GOAL_MAX = 99;

/**
 * Cap on the stored avatar data URL (~256 KB). The frontend downsizes to a small
 * square first, so a larger payload means it was not resized and should be
 * refused rather than bloating the row.
 */
export const AVATAR_MAX_LENGTH = 256_000;

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

  /**
   * Updates the onboarding / Settings preferences on the signed-in profile
   * (FIL-23, GOL-5 and GNR-4). Partial by design: only the fields present are
   * touched, so the goal step and the genre step can each write on their own,
   * and Settings can reuse the same endpoint later.
   *
   * The caller must have ensured the profile exists (the controller does). Scope
   * is the `userId`, so one account can never write another's row.
   */
  async updatePreferences(
    userId: string,
    input: ProfilePreferencesInput,
  ): Promise<Profile> {
    const data: {
      monthlyWatchGoal?: number;
      favoriteGenres?: string[];
      avatarUrl?: string | null;
    } = {};

    if (input.monthlyWatchGoal !== undefined) {
      const goal = input.monthlyWatchGoal;
      if (
        !Number.isInteger(goal) ||
        goal < MONTHLY_GOAL_MIN ||
        goal > MONTHLY_GOAL_MAX
      ) {
        throw new BadRequestException(
          `monthlyWatchGoal must be a whole number from ${MONTHLY_GOAL_MIN} to ${MONTHLY_GOAL_MAX}.`,
        );
      }
      data.monthlyWatchGoal = goal;
    }

    if (input.favoriteGenres !== undefined) {
      if (!Array.isArray(input.favoriteGenres)) {
        throw new BadRequestException('favoriteGenres must be an array.');
      }
      // Any number is allowed, including none (A6); de-duplicate so the same chip
      // cannot be stored twice.
      data.favoriteGenres = [
        ...new Set(input.favoriteGenres.map((genre) => String(genre))),
      ];
    }

    // Profile photo (Settings "Change photo"). `null` clears it; a string must be
    // a small image data URL. Not in the design (A28); added on request.
    if (input.avatarUrl !== undefined) {
      if (input.avatarUrl === null) {
        data.avatarUrl = null;
      } else if (
        typeof input.avatarUrl !== 'string' ||
        !input.avatarUrl.startsWith('data:image/')
      ) {
        throw new BadRequestException('avatarUrl must be an image data URL.');
      } else if (input.avatarUrl.length > AVATAR_MAX_LENGTH) {
        throw new BadRequestException(
          'The image is too large. Please choose a smaller one.',
        );
      } else {
        data.avatarUrl = input.avatarUrl;
      }
    }

    return this.prisma.profile.update({ where: { userId }, data });
  }
}
