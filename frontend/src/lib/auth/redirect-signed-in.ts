import 'server-only';
import { redirect } from 'next/navigation';
import { getAuth } from '@/lib/auth/server';
import { SIGNED_IN_HOME } from '@/lib/auth/routes';

/**
 * Sends a visitor who already has a session to the Dashboard (FIL-29).
 *
 * The mirror image of the shell's `getCurrentUser()`: that one refuses to render
 * a signed-in screen for nobody, this one refuses to render a signed-out screen
 * for somebody. Showing a live user the sign-in form invites them to
 * authenticate as a second account by accident, and the app has no designed way
 * to explain what just happened to their library.
 *
 * Done here on the server rather than in the proxy on purpose. The proxy would
 * have to recognise a session from the cookie alone to make this call, and
 * reading Neon's cookie names is reading undocumented internals: they are not
 * exported, and the `__Secure-` prefix means the name differs between localhost
 * and production. `getSession()` is the supported question and this is a
 * cheap page to ask it on.
 */
export async function redirectIfSignedIn(): Promise<void> {
  const auth = getAuth();
  const session = await auth.getSession();

  if (session?.data) {
    redirect(SIGNED_IN_HOME);
  }
}
