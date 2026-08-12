import { render, screen, within } from '@testing-library/react';
import { starFills, titleCaption, type TitleListItem } from '@/lib/library';
import { TitlesTable } from './titles-table';

// A row navigates on click (FIL-47), so it reads the router. What that
// navigation does is covered in `row-entry-points.test.tsx`; here it only has to
// exist, since jsdom provides no App Router context.
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => '/library',
}));

/** The heart's own behaviour is `favorite-heart.test.tsx`; here it just needs one. */
const noopToggle = jest.fn().mockResolvedValue({ favorite: false });

/** A row with everything populated; each test overrides the field it is about. */
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

function renderTable(titles: TitleListItem[] = [title()]) {
  return render(<TitlesTable titles={titles} onToggleFavorite={noopToggle} />);
}

describe('Library table (FIL-45)', () => {
  it('draws the five designed columns plus a kebab column', () => {
    renderTable();

    const headers = screen.getAllByRole('columnheader').map((cell) => cell.textContent);

    // The sixth is the kebab column: no visible heading in the design, but it
    // still needs a name or a screen reader announces an unlabelled column.
    expect(headers).toEqual(['TITLE', 'GENRE', 'STATUS', 'RATING', 'FAV', 'Actions']);
  });

  describe('the TITLE cell', () => {
    it('shows the name and the "{year} · {type}" caption', () => {
      renderTable();

      expect(screen.getByText('Dune: Part Two')).toBeInTheDocument();
      expect(screen.getByText('2024 · Movie')).toBeInTheDocument();
    });

    it('names a series as one', () => {
      renderTable([title({ type: 'series', year: 2022 })]);

      expect(screen.getByText('2022 · Series')).toBeInTheDocument();
    });

    /*
     * A17 leaves `year` null for anything not added from the Picker, and the mock
     * draws no placeholder, so the caption collapses rather than reading
     * "— · Movie".
     */
    it('collapses the caption to the type when there is no year', () => {
      renderTable([title({ year: null })]);

      expect(screen.getByText('Movie')).toBeInTheDocument();
      expect(screen.queryByText(/·/)).not.toBeInTheDocument();
    });
  });

  describe('the STATUS cell', () => {
    /*
     * The spec's accessibility note asks that status not be carried by colour
     * alone, so each of these has to be findable as text rather than as a class.
     */
    it.each([
      ['watched', 'Watched'],
      ['watching', 'Watching'],
      ['want_to_watch', 'Want to watch'],
    ] as const)('reads %s as text, not only as a tone', (status, label) => {
      renderTable([title({ status })]);

      expect(screen.getByText(label)).toBeInTheDocument();
    });

    it('gives the three statuses three different tones', () => {
      renderTable([
        title({ id: 'a', status: 'watched' }),
        title({ id: 'b', status: 'watching' }),
        title({ id: 'c', status: 'want_to_watch' }),
      ]);

      const tone = (label: string) => screen.getByText(label).className;

      expect(tone('Watched')).toContain('status-success');
      expect(tone('Watching')).toContain('status-warning');
      // Neutral, which is what frame 06 draws for want-to-watch.
      expect(tone('Want to watch')).toContain('surface-elevated');
    });
  });

  describe('the RATING cell', () => {
    it('names the rating in stars out of five', () => {
      renderTable([title({ rating: 10 })]);

      expect(screen.getByRole('img', { name: '5 out of 5' })).toBeInTheDocument();
    });

    // A21. This is the whole reason the cell cannot round: a 4.5 that renders as
    // a 5 is indistinguishable in the one column whose job is telling them apart.
    it('renders a half star rather than rounding', () => {
      renderTable([title({ rating: 9 })]);

      expect(screen.getByRole('img', { name: '4.5 out of 5' })).toBeInTheDocument();
    });

    /*
     * A dash, not five empty stars. Five greyed stars read as "rated zero", which
     * is something the user could actually have entered and a different fact from
     * never having rated it.
     */
    it('shows a dash for an unrated title, and says so', () => {
      renderTable([title({ rating: null })]);

      expect(screen.getByText('—')).toBeInTheDocument();
      expect(screen.getByText('Not rated')).toBeInTheDocument();
      expect(screen.queryByRole('img', { name: /out of 5/ })).not.toBeInTheDocument();
    });

    it('distinguishes a real zero rating from no rating', () => {
      renderTable([title({ rating: 0 })]);

      expect(screen.getByRole('img', { name: '0 out of 5' })).toBeInTheDocument();
      expect(screen.queryByText('Not rated')).not.toBeInTheDocument();
    });
  });

  describe('the GENRE and FAV cells', () => {
    it('shows the genre name beside its dot', () => {
      renderTable();

      expect(screen.getByText('Sci-Fi')).toBeInTheDocument();
    });

    /*
     * A29: the mock gives the same genre different colours between frames. The
     * slot comes from the `genres` row, so every screen agrees, and this asserts
     * the row reads it rather than picking a colour of its own.
     */
    it('colours the dot from the genre’s palette slot', () => {
      const { container } = renderTable([
        title({ genre: { id: 'g', slug: 'drama', name: 'Drama', colorSlot: 5 } }),
      ]);

      expect(container.querySelector('.bg-genre-5')).toBeInTheDocument();
    });

    /*
     * The heart's own behaviour is FIL-46's; what the table owes it is a cell.
     * The label names the title and the direction, because "Favorite" repeated
     * down ten rows says neither.
     */
    it.each([
      [true, 'Remove Dune: Part Two from favorites'],
      [false, 'Add Dune: Part Two to favorites'],
    ])('gives the heart a label when favorite is %s', (favorite, label) => {
      renderTable([title({ favorite })]);

      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    });
  });

  it('renders every row it is given, with no pager', () => {
    renderTable([
      title({ id: 'a', name: 'Severance' }),
      title({ id: 'b', name: 'Oppenheimer' }),
      title({ id: 'c', name: 'The Bear' }),
    ]);

    // Three body rows plus the header row.
    expect(screen.getAllByRole('row')).toHaveLength(4);
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });

  it('keeps the header usable while the body scrolls', () => {
    renderTable();

    // A16: no pager is designed, so the container scrolls and the header sticks.
    // Asserting the mechanism, since jsdom has no layout to scroll.
    const header = screen.getByRole('columnheader', { name: 'TITLE' });
    expect(header.className).toContain('sticky');
  });

  it('keeps each row’s cells together', () => {
    renderTable([title({ name: 'Severance', status: 'watching', rating: null })]);

    const row = screen.getByRole('row', { name: /Severance/ });
    expect(within(row).getByText('Watching')).toBeInTheDocument();
    expect(within(row).getByText('—')).toBeInTheDocument();
  });
});

describe('the row helpers', () => {
  describe('titleCaption', () => {
    it.each([
      [{ year: 2024, type: 'movie' as const }, '2024 · Movie'],
      [{ year: 2022, type: 'series' as const }, '2022 · Series'],
      [{ year: null, type: 'movie' as const }, 'Movie'],
      [{ year: null, type: 'series' as const }, 'Series'],
    ])('renders %o as %s', (input, expected) => {
      expect(titleCaption(input)).toBe(expected);
    });
  });

  describe('starFills', () => {
    it.each([
      [10, [1, 1, 1, 1, 1]],
      [9, [1, 1, 1, 1, 0.5]],
      [7, [1, 1, 1, 0.5, 0]],
      [1, [0.5, 0, 0, 0, 0]],
      [0, [0, 0, 0, 0, 0]],
    ])('fills %i half-stars as %o', (rating, expected) => {
      expect(starFills(rating)).toEqual(expected);
    });

    it('always describes exactly five stars', () => {
      for (let rating = 0; rating <= 10; rating += 1) {
        expect(starFills(rating)).toHaveLength(5);
      }
    });
  });
});
