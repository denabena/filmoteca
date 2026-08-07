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

/** The sidebar footer form: "Mara K." (SHL-1). */
export function shortName({ firstName, lastName }: Profile): string {
  const lastInitial = lastName.trim().charAt(0);
  return lastInitial ? `${firstName} ${lastInitial}.` : firstName;
}

/**
 * Avatar initials: "MK". Derived from the name rather than stored, because
 * "Change photo" has no designed upload flow (A28), so initials are the only
 * avatar the app can ever show.
 */
export function avatarInitials({ firstName, lastName }: Profile): string {
  return `${firstName.trim().charAt(0)}${lastName.trim().charAt(0)}`.toUpperCase();
}
