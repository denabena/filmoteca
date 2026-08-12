import { redirect } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { getAuth } from '@/lib/auth/server';
import { profileFromUser, type Profile } from '@/lib/current-user';

/** The subset of the backend Profile the shell footer needs. */
interface ApiProfile {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  avatarUrl: string | null;
}

/**
 * The signed-in profile, read on the server for the app shell.
 *
 * Server-only: it reads the session cookie through `getAuth()`, so it must never
 * be imported into a Client Component. That is why the pure helpers the sidebar
 * needs live in `current-user.ts` and only this identity read sits here.
 *
 * The app-level Profile (backend) is the source of truth: it carries the name and
 * email the user edits in Settings and the uploaded avatar, none of which the
 * Neon Auth session knows about. So this reads that profile and falls back to the
 * session for any field it has not set yet (a fresh account has no stored email
 * or photo). A failed profile read degrades to the session identity rather than
 * breaking the shell.
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

  const fromSession = profileFromUser(session.data.user);

  try {
    const profile = await apiFetch<ApiProfile>('/api/profile');

    return {
      firstName: profile.firstName ?? fromSession.firstName,
      lastName: profile.lastName ?? fromSession.lastName,
      email: profile.email ?? fromSession.email,
      avatarUrl: profile.avatarUrl,
    };
  } catch {
    // A transient backend error must not blank the shell: show the session
    // identity with initials until the next load reads the stored profile.
    return { ...fromSession, avatarUrl: null };
  }
}
