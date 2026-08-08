/**
 * Turns a Neon Auth (Better Auth) error into a message the auth screens can show.
 *
 * The codes come from Better Auth. By default email sign-in collapses "no such
 * user" and "wrong password" into one `INVALID_EMAIL_OR_PASSWORD` to avoid
 * leaking which emails have accounts; the distinct SGN-4/SGN-5 copies only
 * appear if that protection is relaxed in the Neon Auth config. Mapping both
 * here means the screens show the right message the moment either code arrives.
 */
export interface AuthErrorLike {
  code?: string;
  message?: string;
}

export function authErrorMessage(
  error: AuthErrorLike | null | undefined,
  fallback: string,
): string {
  switch (error?.code) {
    case 'USER_NOT_FOUND':
    case 'CREDENTIAL_ACCOUNT_NOT_FOUND':
      return 'No account found for this email.';
    case 'INVALID_PASSWORD':
      return 'Wrong password. Try again or reset it.';
    case 'INVALID_EMAIL_OR_PASSWORD':
      return 'Email or password incorrect. Try again.';
    case 'USER_ALREADY_EXISTS':
      return 'An account with this email already exists.';
    default:
      return error?.message ?? fallback;
  }
}

/**
 * Maps a sign-in failure onto the field the designed error state marks
 * (SGN-4 / SGN-5): the Email field for an unknown account, the Password field
 * for a wrong password. Only ever one field, per the design.
 *
 * Better Auth's default collapses both into `INVALID_EMAIL_OR_PASSWORD` to avoid
 * account enumeration; that lands on the Password field with the combined copy.
 * The distinct Email-vs-Password split only appears if that protection is relaxed
 * in the Neon Auth config (the trade-off flagged on FIL-12).
 */
export function signInFieldError(error: AuthErrorLike | null | undefined): {
  field: 'email' | 'password';
  message: string;
} {
  switch (error?.code) {
    case 'USER_NOT_FOUND':
    case 'CREDENTIAL_ACCOUNT_NOT_FOUND':
      return { field: 'email', message: 'No account found for this email.' };
    default:
      return {
        field: 'password',
        message: authErrorMessage(error, 'Email or password incorrect. Try again.'),
      };
  }
}
