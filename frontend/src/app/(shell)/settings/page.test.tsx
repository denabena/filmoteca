import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProfileProvider } from '@/components/profile-provider';
import SettingsPage from './page';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: jest.fn(), push: jest.fn() }),
}));

const profile = {
  firstName: 'Mara',
  lastName: 'Kovač',
  email: 'mara@email.com',
  monthlyWatchGoal: 15,
  defaultType: 'movie',
  newReleaseReminders: false,
  favoriteGenres: ['drama', 'horror'],
};

const fetchMock = jest.fn();

beforeEach(() => {
  fetchMock.mockReset().mockImplementation((_url: string, options?: { method?: string }) => {
    if (options?.method === 'PATCH') {
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) });
    }
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(profile) });
  });
  global.fetch = fetchMock as unknown as typeof fetch;
});

function renderPage() {
  return render(
    <ProfileProvider
      initialProfile={{ firstName: 'Mara', lastName: 'Kovač', email: 'mara@email.com' }}
    >
      <SettingsPage />
    </ProfileProvider>,
  );
}

describe('SettingsPage', () => {
  /*
   * FIL-84. The fields are prefilled from a fetch in an effect, so before it
   * resolves the form used to render with empty inputs and the values then snapped
   * in: Settings briefly read as an account with no name.
   *
   * Showing the skeleton until the profile lands is also what makes the arrival
   * animation possible, since the real cards only then mount and a CSS animation
   * fires on mount. Asserting the header survives the swap matters too: it is
   * static copy, and if it unmounted the page would look like it reloaded.
   */
  it('shows a loading state instead of an empty form, then the real fields', async () => {
    renderPage();

    expect(screen.getByLabelText('Loading your settings')).toBeInTheDocument();
    expect(screen.queryByLabelText('First name')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();

    await waitFor(() => expect(screen.getByLabelText('First name')).toHaveValue('Mara'));

    expect(screen.queryByLabelText('Loading your settings')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
  });

  it('prefills the form from the stored profile', async () => {
    renderPage();

    await waitFor(() => expect(screen.getByLabelText('First name')).toHaveValue('Mara'));
    expect(screen.getByLabelText('Email')).toHaveValue('mara@email.com');
    expect(screen.getByText('2 genres · organize how your library is grouped')).toBeInTheDocument();
  });

  it('blocks save and shows a field error when the name is cleared', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByLabelText('First name')).toHaveValue('Mara'));

    await userEvent.clear(screen.getByLabelText('First name'));
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(screen.getByText('First name is required.')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalledWith(
      '/api/profile',
      expect.objectContaining({ method: 'PATCH' }),
    );
  });

  it('saves all cards in one PATCH and confirms', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByLabelText('First name')).toHaveValue('Mara'));

    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/profile',
        expect.objectContaining({ method: 'PATCH' }),
      ),
    );
    expect(await screen.findByText('Changes saved')).toBeInTheDocument();
  });
});
