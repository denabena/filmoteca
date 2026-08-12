/**
 * The signed-in profile and the pure helpers the sidebar derives from it.
 *
 * This module is client-safe on purpose: the sidebar is a Client Component and
 * imports `shortName`/`avatarInitials` from here, so nothing in it may touch the
 * session cookie or any server-only API. Reading the actual session lives in
 * `current-user.server.ts`, which the shell layout (a Server Component) calls.
 */

export interface Profile {
  firstName: string;
  lastName: string;
  email: string;
}

/**
 * The signed-in user as Neon Auth reports it. `name` is a single field there,
 * so it is split into first/last for the Profile the app renders.
 */
export interface SessionUser {
  name?: string | null;
  email?: string | null;
}

/**
 * Maps a Neon Auth user onto the Profile the shell renders.
 *
 * `name` is split on the first space: everything before it is the first name,
 * the rest is the last name. Missing pieces become empty strings, which the
 * helpers below already tolerate, so the footer never renders "undefined".
 */
export function profileFromUser(user: SessionUser): Profile {
  const trimmed = (user.name ?? '').trim();
  const firstSpace = trimmed.indexOf(' ');

  const firstName = firstSpace === -1 ? trimmed : trimmed.slice(0, firstSpace);
  const lastName = firstSpace === -1 ? '' : trimmed.slice(firstSpace + 1).trim();

  return { firstName, lastName, email: user.email ?? '' };
}

/**
 * The sidebar footer form: "Mara K." (SHL-1).
 *
 * **A35 in one function.** The design writes the footer as a first name and a
 * last initial, but Create account captures a single **Name** field, so what
 * arrives is whatever the user typed. `profileFromUser` splits on the first
 * space, which means the shape the design draws only happens for people who
 * typed two words:
 *
 * - "Mara Kovač" reads "Mara K.", exactly as mocked.
 * - "Mara" reads "Mara", because there is no initial to abbreviate to. That is
 *   not a designed state, and it is the common one for anybody who types a first
 *   name only.
 * - No name at all falls back to the email's local part, because the footer
 *   rendering blank is worse than rendering something true. Neon Auth allows a
 *   nameless account, so this is reachable rather than defensive.
 *
 * The fallback is a working decision. Splitting the field in two on Create
 * account is the alternative and is A35's actual question.
 */
export function shortName({ firstName, lastName, email }: Profile): string {
  const lastInitial = lastName.trim().charAt(0);

  if (firstName.trim()) {
    return lastInitial ? `${firstName} ${lastInitial}.` : firstName;
  }

  return emailLocalPart(email);
}

/**
 * Avatar initials: "MK". Derived from the name rather than stored, because
 * "Change photo" has no designed upload flow (A28), so initials are the only
 * avatar the app can ever show.
 *
 * Same A35 fallout as `shortName`: a one-word name yields one letter, and a
 * nameless account falls back to the email's first letter rather than leaving an
 * empty circle. An avatar with nothing in it reads as a failed image load.
 */
export function avatarInitials({ firstName, lastName, email }: Profile): string {
  const initials = `${firstName.trim().charAt(0)}${lastName.trim().charAt(0)}`;

  return (initials || emailLocalPart(email).charAt(0)).toUpperCase();
}

/** Everything before the "@". Empty for an empty address, which cannot render. */
function emailLocalPart(email: string): string {
  return email.trim().split('@')[0] ?? '';
}
