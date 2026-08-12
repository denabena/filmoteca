import { BadRequestException } from '@nestjs/common';
import type { TitleStatus, TitleType } from '@prisma/client';

export const TITLE_TYPES: TitleType[] = ['movie', 'series'];
export const TITLE_STATUSES: TitleStatus[] = [
  'watched',
  'watching',
  'want_to_watch',
];

/**
 * What the Add title (08) and Edit title (09) forms send.
 *
 * Every field is `unknown` because this is the untrusted edge: the project has no
 * class-validator, so the shape is proved by `parseTitlePayload` rather than
 * asserted by a type nothing checks at runtime.
 */
export interface TitlePayloadBody {
  name?: unknown;
  type?: unknown;
  status?: unknown;
  genreId?: unknown;
  watchDate?: unknown;
  rating?: unknown;
  note?: unknown;
  favorite?: unknown;
}

/** A payload that has been proved valid, ready to hand to the repository. */
export interface TitleWriteData {
  name: string;
  type: TitleType;
  status: TitleStatus;
  genreId: string;
  watchDate: Date | null;
  rating: number | null;
  note: string | null;
  favorite: boolean;
}

/**
 * Validates and normalises an Add or Edit title payload.
 *
 * **One function for both, and that is the point rather than a tidiness
 * preference.** EDT-3 says every Add title rule applies to Edit, and two copies
 * of a rule set are how the two forms end up disagreeing: someone relaxes the
 * rating bound on create, the edit modal keeps rejecting 4.5, and the bug reads
 * as "editing is broken" rather than "the rules drifted".
 *
 * Three things it deliberately does:
 *
 * - Required fields are name, type, genre and status (ADD-6). Watch date, rating
 *   and note stay optional whatever the status is, because A20 ties none of them
 *   to it: a want-to-watch title may carry both and a watched one neither.
 * - Errors name the offending fields rather than reading "invalid payload", so
 *   the form can mark the inputs (FIL-59) instead of showing one banner.
 * - A cleared optional field normalises to `null`, never `''`. An empty string is
 *   a note that exists and is blank, which is a different thing from no note and
 *   renders differently on the detail screen.
 *
 * **`createdAt` is absent by construction.** There is no branch that reads it, so
 * a payload carrying one is ignored and the original added date survives, which
 * is FIL-54's rule and FIL-55's criterion.
 */
export function parseTitlePayload(body: TitlePayloadBody): TitleWriteData {
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const missing: string[] = [];

  if (!name) missing.push('name');
  if (!isOneOf(body?.type, TITLE_TYPES)) missing.push('type');
  if (!isOneOf(body?.status, TITLE_STATUSES)) missing.push('status');
  if (typeof body?.genreId !== 'string' || !body.genreId)
    missing.push('genreId');

  if (missing.length > 0) {
    throw new BadRequestException({
      message: 'Some required fields are missing or invalid',
      fields: missing,
    });
  }

  // Half-star units, 0 to 10 (A21). Anything else is a bug in the caller rather
  // than something to silently clamp: clamping 4.5 to 4 loses half a star with no
  // way for the form to know it happened.
  let rating: number | null = null;
  if (body.rating !== undefined && body.rating !== null) {
    const parsed = Number(body.rating);
    if (!Number.isInteger(parsed) || parsed < 0 || parsed > 10) {
      throw new BadRequestException({
        message: 'rating must be a whole number of half-stars, 0 to 10',
        fields: ['rating'],
      });
    }
    rating = parsed;
  }

  return {
    name,
    type: body.type as TitleType,
    status: body.status as TitleStatus,
    genreId: body.genreId as string,
    // Midnight UTC, because `watchDate` is a Date column and the month and week
    // buckets (FIL-30, FIL-32) key off it. A timezone-bearing value is what makes
    // "watched in July" ambiguous on the 1st and the 31st.
    watchDate:
      typeof body.watchDate === 'string' && body.watchDate
        ? new Date(`${body.watchDate}T00:00:00.000Z`)
        : null,
    rating,
    note:
      typeof body.note === 'string' && body.note.trim()
        ? body.note.trim()
        : null,
    favorite: body.favorite === true,
  };
}

function isOneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
): value is T {
  return (
    typeof value === 'string' && (allowed as readonly string[]).includes(value)
  );
}
