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
 * There is no signed-out branch by design. The shell is for authenticated views
 * only, so no session means redirect to sign-in rather than return a null
 * profile the sidebar would have to defend against. Full route protection is
 * FIL-29; this is the minimum the layout needs to hand the provider a real user.
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
