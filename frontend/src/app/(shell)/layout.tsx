import { ProfileProvider } from '@/components/profile-provider';
import { Sidebar } from '@/components/sidebar/sidebar';
import { getCurrentUser } from '@/lib/current-user';

/*
 * The app shell: a fixed sidebar and the routed view beside it (SHL-1).
 *
 * The profile is read on the server so the footer is correct on first paint,
 * then handed to a client provider that keeps it live. Route protection is not
 * here: it needs a session and belongs to FIL-29.
 */
export default function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const profile = getCurrentUser();

  return (
    <ProfileProvider initialProfile={profile}>
      <Sidebar />
      {/* Matches the sidebar's fixed 260px so content is never underneath it. */}
      <div className="flex min-h-screen flex-1 flex-col pl-[260px]">{children}</div>
    </ProfileProvider>
  );
}
