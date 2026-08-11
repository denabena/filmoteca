import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LibraryPage from '@/app/(shell)/library/page';
import { genreDescriptor, titleCountLabel, type GenreWithCount } from '@/lib/genres';
import type { TitleListItem } from '@/lib/library';
import { GenreCards } from './genre-cards';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
  usePathname: () => '/library',
}));

const mockApiFetch = jest.fn();
jest.mock('../../lib/api', () => ({ apiFetch: (path: string) => mockApiFetch(path) }));
jest.mock('../../app/(shell)/titles/actions', () => ({ toggleFavorite: jest.fn() }));

function genre(overrides: Partial<GenreWithCount> = {}): GenreWithCount {
  return {
    id: 'g-scifi',
    slug: 'sci-fi',
    name: 'Sci-Fi',
    colorSlot: 1,
    descriptor: null,
    titleCount: 8,
    ...overrides,
  };
}

function title(overrides: Partial<TitleListItem> = {}): TitleListItem {
  return {
    id: 'title-1',
    name: 'Dune: Part Two',
    year: 2024,
    type: 'movie',
    genre: { id: 'g-scifi', slug: 'sci-fi', name: 'Sci-Fi', colorSlot: 1 },
    status: 'watched',
    rating: 10,
    favorite: false,
    ...overrides,
  };
}

/** The page fetches titles then genre counts, in that order. */
async function renderPage(titles: TitleListItem[], genres: GenreWithCount[]) {
  mockApiFetch.mockImplementation((path: string) =>
    Promise.resolve(path === '/api/titles' ? titles : genres),
  );

  return render(await LibraryPage());
}

beforeEach(() => mockApiFetch.mockReset());

describe('Genre cards (FIL-50)', () => {
  describe('one card per genre that has titles', () => {
    it('draws a card for each genre in a two-column grid', () => {
      const { container } = render(
        <GenreCards
          genres={[genre(), genre({ id: 'g-drama', slug: 'drama', name: 'Drama', titleCount: 6 })]}
        />,
      );

      expect(screen.getAllByRole('listitem')).toHaveLength(2);
      expect(container.querySelector('.grid-cols-2')).toBeInTheDocument();
    });

    it('shows the name, the count and the coloured tile', () => {
      const { container } = render(<GenreCards genres={[genre({ colorSlot: 5 })]} />);

      expect(screen.getByRole('heading', { name: 'Sci-Fi' })).toBeInTheDocument();
      expect(screen.getByText('8 titles')).toBeInTheDocument();
      expect(container.querySelector('.bg-genre-5')).toBeInTheDocument();
    });

    /*
     * A7: the eight cards in the mock are a consequence of that mock's data, not
     * a fixed list. FIL-43's endpoint omits empty genres, so there is nothing to
     * filter here; this asserts the component does not invent any either.
     */
    it('draws nothing for a genre it was not given', () => {
      render(<GenreCards genres={[genre()]} />);

      expect(screen.getAllByRole('listitem')).toHaveLength(1);
      expect(screen.queryByText('Drama')).not.toBeInTheDocument();
    });
  });

  describe('the descriptor', () => {
    it('uses the designed tagline for a genre the design draws', () => {
      render(<GenreCards genres={[genre({ slug: 'horror', name: 'Horror' })]} />);

      expect(screen.getByText('Watch with the lights on.')).toBeInTheDocument();
    });

    // The column exists for exactly this; the constant is the stand-in until it
    // is seeded, and the stored value has to win or the two would fight.
    it('prefers a stored descriptor over the designed one', () => {
      render(<GenreCards genres={[genre({ slug: 'horror', descriptor: 'From the database.' })]} />);

      expect(screen.getByText('From the database.')).toBeInTheDocument();
      expect(screen.queryByText('Watch with the lights on.')).not.toBeInTheDocument();
    });

    /*
     * Four of the twelve genres have no designed tagline. The card renders
     * without the line rather than with invented product copy, which is the
     * honest gap: a card without a descriptor is visibly shorter than its
     * neighbours, so this wants a designer.
     */
    it('renders no line for a genre with no designed tagline', () => {
      const { container } = render(
        <GenreCards genres={[genre({ slug: 'crime', name: 'Crime', titleCount: 2 })]} />,
      );

      const card = within(container).getByRole('listitem');
      expect(within(card).getAllByText(/./)).toHaveLength(2); // name and count only
    });
  });

  describe('the count wording', () => {
    // Not drawn anywhere: the mock has no single-title genre. The kind of thing
    // only ever noticed as a bug.
    it('reads "1 title", not "1 titles"', () => {
      render(<GenreCards genres={[genre({ titleCount: 1 })]} />);

      expect(screen.getByText('1 title')).toBeInTheDocument();
    });

    it.each([
      [0, '0 titles'],
      [1, '1 title'],
      [2, '2 titles'],
      [8, '8 titles'],
    ])('renders %i as "%s"', (count, expected) => {
      expect(titleCountLabel(count)).toBe(expected);
    });
  });

  /*
   * No genres-empty variant is designed, and the tab is reachable with an empty
   * library. A plain line beats an error or a blank panel, and it deliberately
   * does not repeat frame 13's call to action: the user is one tab away from it.
   */
  it('does not error when there are no genres at all', () => {
    render(<GenreCards genres={[]} />);

    expect(screen.getByText('Genres appear here once you add titles.')).toBeInTheDocument();
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });

  describe('on the Genres tab', () => {
    it('replaces the three controls with a "New genre" button', async () => {
      const user = userEvent.setup();
      await renderPage([title()], [genre()]);

      expect(screen.getByPlaceholderText('Search titles')).toBeInTheDocument();

      await user.click(screen.getByRole('tab', { name: 'Genres' }));

      expect(screen.getByRole('button', { name: 'New genre' })).toBeInTheDocument();
      expect(screen.queryByPlaceholderText('Search titles')).not.toBeInTheDocument();
    });

    it('shows the cards the counts endpoint returned', async () => {
      const user = userEvent.setup();
      await renderPage(
        [title()],
        [
          genre({ titleCount: 8 }),
          genre({ id: 'g-horror', slug: 'horror', name: 'Horror', titleCount: 2 }),
        ],
      );

      await user.click(screen.getByRole('tab', { name: 'Genres' }));

      expect(screen.getByRole('heading', { name: 'Sci-Fi' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Horror' })).toBeInTheDocument();
    });

    it('reads the counts from the derived endpoint, not from the rows', async () => {
      await renderPage([title()], [genre()]);

      expect(mockApiFetch).toHaveBeenCalledWith('/api/genres/counts');
    });
  });
});

describe('genreDescriptor', () => {
  it('falls back to the designed copy when nothing is stored', () => {
    expect(genreDescriptor(genre({ slug: 'drama', descriptor: null }))).toBe(
      'Character-driven, awards-season bait.',
    );
  });

  it('returns null for a genre with neither', () => {
    expect(genreDescriptor(genre({ slug: 'mystery', descriptor: null }))).toBeNull();
  });
});
