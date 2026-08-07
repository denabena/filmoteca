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

  return profileFromUser(session.data.user);
}
