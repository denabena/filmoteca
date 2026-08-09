/**
 * The signed-in profile, and the only module that knows it is still mocked.
 *
 * FIL-27 (the sidebar) ships before FIL-11/FIL-12 add a User model and a sign in
 * endpoint, so `getCurrentUser` returns a fixed profile for now. When FIL-12
 * lands it replaces the body of that one function with a session read; the
 * provider, the sidebar and its tests are all written against `Profile` and do
 * not change.
 */

export interface Profile {
  firstName: string;
  lastName: string;
  email: string;
}

/**
 * Sample values from the Figma sidebar (04 · Dashboard), kept so the shell can
 * be reviewed against the design. These are a mock, not application defaults.
 *
 * TODO(FIL-12): read the signed-in user from the session instead.
 */
const MOCKED_PROFILE: Profile = {
  firstName: 'Mara',
  lastName: 'Kovač',
  email: 'mara@email.com',
};

export function getCurrentUser(): Profile {
  return MOCKED_PROFILE;
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
