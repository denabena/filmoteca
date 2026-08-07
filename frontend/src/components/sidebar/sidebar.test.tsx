import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { usePathname } from 'next/navigation';
import { ProfileProvider, useProfile } from '@/components/profile-provider';
import type { Profile } from '@/lib/current-user';
import { Sidebar } from './sidebar';

// usePathname needs an App Router context that jsdom has no way to provide, so
// the hook itself is stubbed and each test sets the route it wants. useRouter is
// stubbed too, because the footer's sign-out button reads it.
const mockPush = jest.fn();
const mockRefresh = jest.fn();
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

// The sign-out button talks to the real Neon Auth client otherwise; stub it so
// the sidebar renders without a live auth instance. A relative path is used
// because next/jest resolves the `@/` alias for imports but not inside
// jest.mock(); the mock still intercepts the button's `@/lib/auth/client`
// import, since both resolve to the same file.
const mockSignOut = jest.fn().mockResolvedValue(undefined);
jest.mock('../../lib/auth/client', () => ({ authClient: { signOut: () => mockSignOut() } }));

const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>;

const PROFILE: Profile = {
  firstName: 'Mara',
  lastName: 'Kovač',
  email: 'mara@email.com',
};

function renderSidebar(pathname = '/', profile: Profile = PROFILE) {
  mockUsePathname.mockReturnValue(pathname);

  return render(
    <ProfileProvider initialProfile={profile}>
      <Sidebar />
    </ProfileProvider>,
  );
}

describe('Sidebar', () => {
  it('shows the Scene wordmark', () => {
    renderSidebar();

    expect(screen.getByText('Scene')).toBeInTheDocument();
  });

  it('groups the four links under MENU, ASSISTANT and ACCOUNT', () => {
    renderSidebar();

    const groups = screen.getAllByRole('list');
    expect(groups).toHaveLength(3);

    expect(screen.getByRole('heading', { name: 'MENU' })).toBeInTheDocument();
    expect(within(groups[0]).getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/');
    expect(within(groups[0]).getByRole('link', { name: 'Library' })).toHaveAttribute(
      'href',
      '/library',
    );

    expect(screen.getByRole('heading', { name: 'ASSISTANT' })).toBeInTheDocument();
    expect(within(groups[1]).getByRole('link', { name: 'Picker' })).toHaveAttribute(
      'href',
      '/picker',
    );

    expect(screen.getByRole('heading', { name: 'ACCOUNT' })).toBeInTheDocument();
    expect(within(groups[2]).getByRole('link', { name: 'Settings' })).toHaveAttribute(
      'href',
      '/settings',
    );
  });

  it.each([
    ['/', 'Dashboard'],
    ['/library', 'Library'],
    ['/picker', 'Picker'],
    ['/settings', 'Settings'],
  ])('marks exactly one item current on %s', (pathname, expected) => {
    renderSidebar(pathname);

    const current = screen.getAllByRole('link').filter((link) => link.ariaCurrent === 'page');

    expect(current).toHaveLength(1);
    expect(current[0]).toHaveAccessibleName(expected);
  });

  it('keeps the parent section current on a nested route', () => {
    renderSidebar('/library/dune-part-two');

    expect(screen.getByRole('link', { name: 'Library' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Dashboard' })).not.toHaveAttribute('aria-current');
  });

  it('shows the profile name, email and derived initials in the footer', () => {
    renderSidebar();

    expect(screen.getByText('Mara K.')).toBeInTheDocument();
    expect(screen.getByText('mara@email.com')).toBeInTheDocument();
    expect(screen.getByText('MK')).toBeInTheDocument();
  });

  it('updates the footer name and initials when the profile changes, with no reload', async () => {
    // Stands in for Settings "Save changes" (FIL-79), which is the real caller.
    function RenameButton() {
      const { setProfile } = useProfile();

      return (
        <button
          type="button"
          onClick={() => setProfile({ ...PROFILE, firstName: 'Ana', lastName: 'Skukan' })}
        >
          Rename
        </button>
      );
    }

    mockUsePathname.mockReturnValue('/');
    render(
      <ProfileProvider initialProfile={PROFILE}>
        <Sidebar />
        <RenameButton />
      </ProfileProvider>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Rename' }));

    expect(screen.getByText('Ana S.')).toBeInTheDocument();
    expect(screen.getByText('AS')).toBeInTheDocument();
    expect(screen.queryByText('Mara K.')).not.toBeInTheDocument();
  });

  it('signs out from the footer control', async () => {
    renderSidebar();

    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));

    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it('reaches every link by keyboard in visual order', async () => {
    renderSidebar();

    for (const name of ['Dashboard', 'Library', 'Picker', 'Settings']) {
      await userEvent.tab();
      expect(screen.getByRole('link', { name })).toHaveFocus();
    }
  });
});
