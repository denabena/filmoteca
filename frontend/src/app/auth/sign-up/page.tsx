import { redirectIfSignedIn } from '@/lib/auth/redirect-signed-in';
import { SignUpForm } from './sign-up-form';

/**
 * The designed Create account screen (Figma frame 21 · REG-1, REG-2, REG-3,
 * REG-10, REG-11), replacing Neon Auth's generic view for /auth/sign-up.
 *
 * Same shape as the sign-in route: a Server Component that redirects a visitor
 * who already has a session to the Dashboard (FIL-29), wrapping the unchanged
 * client form.
 *
 * Outside the `(shell)` route group deliberately, so no sidebar and no page
 * header (REG-1 draws a centred card on the bare canvas).
 */
// Reads the session cookie, so it can never be prerendered.
export const dynamic = 'force-dynamic';

export default async function SignUpPage() {
  await redirectIfSignedIn();

  return <SignUpForm />;
}
