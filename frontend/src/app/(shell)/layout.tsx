import { ProfileProvider } from '@/components/profile-provider';
import { Sidebar } from '@/components/sidebar/sidebar';
import { getCurrentUser } from '@/lib/current-user.server';

/*
 * The app shell: a fixed sidebar and the routed view beside it (SHL-1).
 *
 * The profile is read on the server from the Neon Auth session so the footer is
 * correct on first paint, then handed to a client provider that keeps it live.
 * `getCurrentUser` redirects to sign-in when there is no session; full route
 * protection is still FIL-29.
 */
// The shell reads the session cookie to identify the user, so its routes are
// dynamic by nature. Declaring it here stops Next from attempting a static
// prerender and logging a dynamic-server-usage error at build time.
export const dynamic = 'force-dynamic';

export default async function AppLayout({
  children,
  modal,
}: Readonly<{ children: React.ReactNode; modal: React.ReactNode }>) {
  const profile = await getCurrentUser();

  return (
    <ProfileProvider initialProfile={profile}>
      <Sidebar />
      {/* Matches the sidebar's fixed 260px so content is never underneath it. */}
      <div className="flex min-h-screen flex-1 flex-col pl-[260px]">{children}</div>
      {/*
        The `@modal` parallel route (FIL-28, FIL-44). Empty on every normal
        navigation via its default.tsx; an intercepted route such as
        (.)titles/new fills it and overlays the view above. It sits outside the
        padded column deliberately, because the overlay is fixed to the whole
        viewport and must cover the sidebar too.
      */}
      {modal}
    </ProfileProvider>
  );
}
