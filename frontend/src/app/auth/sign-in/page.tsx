import { redirectIfSignedIn } from '@/lib/auth/redirect-signed-in';
import { SignInForm } from './sign-in-form';

/**
 * The designed Sign in screen (Figma frame 18 · SGN-1, SGN-3, SGN-7), replacing
 * Neon Auth's generic AuthView for this one path. A static segment, so it wins
 * over the `[path]` catch-all that still serves forgot-password and the rest.
 *
 * A Server Component wrapping the form, so a visitor who already has a session
 * is sent to the Dashboard before the form renders (FIL-29). The form itself is
 * unchanged and still owns every piece of interactive state; splitting it out is
 * what lets the session be read at all, since a Client Component cannot.
 *
 * Outside the `(shell)` route group deliberately, so no sidebar and no page
 * header (SGN-1 draws a centred card on the bare canvas).
 */
// Reads the session cookie, so it can never be prerendered.
export const dynamic = 'force-dynamic';

export default async function SignInPage() {
  await redirectIfSignedIn();

  return <SignInForm />;
}
