import { redirect } from 'next/navigation';
import { getAuth } from '@/lib/auth/server';
import { profileFromUser, type Profile } from '@/lib/current-user';

/**
 * The signed-in profile, read on the server from the Neon Auth session.
 *
 * Server-only: it reads the session cookie through `getAuth()`, so it must never
 * be imported into a Client Component. That is why the pure helpers the sidebar
 * needs live in `current-user.ts` and only this identity read sits here.
 *
 * **There is no signed-out branch, and that is how FIL-83's third criterion is
 * met.** It asks that a signed-out visitor not see a profile footer. Two ways to
 * get there: hide the footer, or never render the shell. Redirecting is the one
 * chosen, because a shell rendered for nobody would need every screen inside it
 * to have a signed-out variant that the design does not draw, and a sidebar whose
 * footer is sometimes absent is a second layout to maintain for a state no user
 * should reach. FIL-29 makes the same call in middleware, so this is now the
 * second line rather than the only one; keeping both means a new shell route
 * cannot leak by being missed in a matcher.
 */
export async function getCurrentUser(): Promise<Profile> {
  const auth = getAuth();
  const session = await auth.getSession();

  if (!session?.data) {
    redirect('/auth/sign-in');
  }

  return profileFromUser(session.data.user);
}
