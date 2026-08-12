import { render, screen } from '@testing-library/react';
import LibraryPage from '@/app/(shell)/library/page';
import type { TitleListItem } from '@/lib/library';
import { LibraryEmpty } from './library-empty';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
  usePathname: () => '/library',
}));

const mockApiFetch = jest.fn();
jest.mock('../../lib/api', () => ({ apiFetch: (path: string) => mockApiFetch(path) }));
jest.mock('../../app/(shell)/titles/actions', () => ({ toggleFavorite: jest.fn() }));

function title(overrides: Partial<TitleListItem> = {}): TitleListItem {
  return {
    id: 'title-1',
    name: 'Dune: Part Two',
    year: 2024,
    type: 'movie',
    genre: { id: 'g-scifi', slug: 'sci-fi', name: 'Sci-Fi', colorSlot: 6 },
    status: 'watched',
    rating: 10,
    favorite: false,
    ...overrides,
  };
}

async function renderPage(titles: TitleListItem[]) {
  mockApiFetch.mockResolvedValue(titles);
  return render(await LibraryPage());
}

beforeEach(() => mockApiFetch.mockReset());

describe('Library empty state (FIL-48)', () => {
  describe('the designed copy', () => {
    it('shows the heading above a play icon', () => {
      const { container } = render(<LibraryEmpty />);

      expect(screen.getByRole('heading', { name: 'Your watchlist is empty' })).toBeInTheDocument();
      expect(container.querySelector('img[src="/icons/play.svg"]')).toBeInTheDocument();
    });

    it('reads exactly as designed', () => {
      render(<LibraryEmpty />);

      expect(
        screen.getByText(
          'Add your first movie or show to start tracking what you watch, rate, and want to see next.',
        ),
      ).toBeInTheDocument();
    });

    /*
     * A link rather than a button, for the same reason as the header's Add title:
     * the modal is an intercepting route, so a real href gives an in-app click
     * the modal and a pasted URL the full page.
     */
    it('opens the Add title modal route', () => {
      render(<LibraryEmpty />);

      expect(screen.getByRole('link', { name: 'Add your first title' })).toHaveAttribute(
        'href',
        '/titles/new',
      );
    });
  });

  describe('when the page decides which state to show', () => {
    it('shows the empty state and no table when there are no titles', async () => {
      await renderPage([]);

      expect(screen.getByRole('heading', { name: 'Your watchlist is empty' })).toBeInTheDocument();
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });

    it('shows the table and not the empty state once a title exists', async () => {
      await renderPage([title()]);

      expect(screen.getByRole('table')).toBeInTheDocument();
      expect(
        screen.queryByRole('heading', { name: 'Your watchlist is empty' }),
      ).not.toBeInTheDocument();
    });

    /*
     * Frame 13 keeps the tabs and the three controls visible in an empty library.
     * That is a deliberate choice rather than an oversight, so the empty state
     * must not swallow them.
     */
    it('leaves the tabs and the page header in place', async () => {
      await renderPage([]);

      expect(screen.getByRole('tab', { name: 'All titles' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Genres' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 1, name: 'Library' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Add title' })).toBeInTheDocument();
    });
  });
});
