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
