import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { filterTitles, NO_FILTERS, type TitleListItem } from '@/lib/library';
import { LibraryView } from './library-view';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => '/library',
}));

const noopToggle = jest.fn().mockResolvedValue({ favorite: false });

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

/** Three rows, already in the server's newest-added-first order. */
const LIBRARY = [
  title({ id: 'a', name: 'Dune: Part Two', status: 'watched' }),
  title({ id: 'b', name: 'Severance', status: 'watching' }),
  title({ id: 'c', name: 'Poor Things', status: 'want_to_watch' }),
];

function renderView(titles: TitleListItem[] = LIBRARY) {
  return render(
    <LibraryView titles={titles} onToggleFavorite={noopToggle} genres={<p>Genre cards</p>} />,
  );
}

/** The visible row names, in order. */
function rowNames() {
  return screen.getAllByRole('link').map((link) => link.textContent);
}

describe('Library controls (FIL-49)', () => {
  describe('what the tab row shows', () => {
    it('puts the three controls beside the tabs', () => {
      renderView();

      expect(screen.getByPlaceholderText('Search titles')).toBeInTheDocument();
      expect(screen.getByRole('combobox', { name: 'Status' })).toBeInTheDocument();
      expect(screen.getByRole('combobox', { name: 'Sort' })).toBeInTheDocument();
    });

    /*
     * A hidden tab's search box left in the DOM is still a tab stop, and the user
     * would reach a control that filters nothing they can see.
     */
    it('swaps them out when the Genres tab is active', async () => {
      const user = userEvent.setup();
      renderView();

      await user.click(screen.getByRole('tab', { name: 'Genres' }));

      expect(screen.queryByPlaceholderText('Search titles')).not.toBeInTheDocument();
    });
  });

  describe('searching', () => {
    it('filters as I type, without Enter', async () => {
      const user = userEvent.setup();
      renderView();

      await user.type(screen.getByPlaceholderText('Search titles'), 'sever');

      expect(rowNames()).toEqual(['Severance']);
    });

    it('matches case-insensitively, as the backend does', async () => {
      const user = userEvent.setup();
      renderView();

      await user.type(screen.getByPlaceholderText('Search titles'), 'DUNE');

      expect(rowNames()).toEqual(['Dune: Part Two']);
    });

    it('brings the full list back when the term is cleared', async () => {
      const user = userEvent.setup();
      renderView();

      const search = screen.getByPlaceholderText('Search titles');
      await user.type(search, 'sever');
      await user.clear(search);

      expect(rowNames()).toHaveLength(3);
    });
  });

  describe('the status filter', () => {
    it('offers the three designed statuses plus a way back to all titles', () => {
      renderView();

      const options = Array.from(
        screen.getByRole('combobox', { name: 'Status' }).querySelectorAll('option'),
      ).map((option) => option.textContent);

      expect(options).toEqual(['Status', 'Watched', 'Watching', 'Want to watch']);
    });

    it('narrows to one status, and the control reflects the choice', async () => {
      const user = userEvent.setup();
      renderView();

      await user.selectOptions(screen.getByRole('combobox', { name: 'Status' }), 'watching');

      expect(rowNames()).toEqual(['Severance']);
      expect(screen.getByRole('combobox', { name: 'Status' })).toHaveValue('watching');
    });

    // Without the "Status" option a filter is a one-way door and the only escape
    // is a reload.
    it('returns the full list when set back to all', async () => {
      const user = userEvent.setup();
      renderView();

      const status = screen.getByRole('combobox', { name: 'Status' });
      await user.selectOptions(status, 'watching');
      await user.selectOptions(status, '');

      expect(rowNames()).toHaveLength(3);
    });
  });

  describe('sorting', () => {
    it('reverses the order and updates the label', async () => {
      const user = userEvent.setup();
      renderView();

      expect(rowNames()).toEqual(['Dune: Part Two', 'Severance', 'Poor Things']);

      await user.selectOptions(screen.getByRole('combobox', { name: 'Sort' }), 'oldest');

      expect(rowNames()).toEqual(['Poor Things', 'Severance', 'Dune: Part Two']);
      expect(screen.getByRole('combobox', { name: 'Sort' })).toHaveValue('oldest');
    });
  });

  it('narrows by search and status together', async () => {
    const user = userEvent.setup();
    renderView([
      title({ id: 'a', name: 'The Bear', status: 'watching' }),
      title({ id: 'b', name: 'The Zone of Interest', status: 'watched' }),
    ]);

    await user.type(screen.getByPlaceholderText('Search titles'), 'the');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Status' }), 'watched');

    expect(rowNames()).toEqual(['The Zone of Interest']);
  });

  describe('when nothing matches', () => {
    async function search(term: string) {
      const user = userEvent.setup();
      renderView();
      await user.type(screen.getByPlaceholderText('Search titles'), term);
      return user;
    }

    it('replaces the rows with a plain message', async () => {
      await search('nothing at all');

      expect(screen.getByRole('status')).toHaveTextContent('No titles match');
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });

    it('leaves the controls usable', async () => {
      await search('nothing at all');

      expect(screen.getByPlaceholderText('Search titles')).toBeEnabled();
      expect(screen.getByRole('combobox', { name: 'Status' })).toBeEnabled();
    });

    /*
     * The boundary this ticket and FIL-48 exist to draw. A library with three
     * titles and a query matching none has not earned "Add your first movie or
     * show": that copy reads as though the library had been deleted.
     */
    it('is not the no-titles state', async () => {
      await search('nothing at all');

      expect(
        screen.queryByRole('heading', { name: 'Your watchlist is empty' }),
      ).not.toBeInTheDocument();
    });

    it('offers a way back to the full list', async () => {
      const user = await search('nothing at all');

      await user.click(screen.getByRole('button', { name: 'Clear filters' }));

      expect(rowNames()).toHaveLength(3);
      expect(screen.getByPlaceholderText('Search titles')).toHaveValue('');
    });
  });

  // FIL-48's state, decided on the unfiltered count so a filter can never reach
  // it. Asserted here because this component is what makes that call.
  it('shows the no-titles state for a genuinely empty library', () => {
    renderView([]);

    expect(screen.getByRole('heading', { name: 'Your watchlist is empty' })).toBeInTheDocument();
  });
});

describe('filterTitles', () => {
  it('returns everything with no filters applied', () => {
    expect(filterTitles(LIBRARY, NO_FILTERS)).toHaveLength(3);
  });

  it('trims a whitespace-only term rather than matching nothing', () => {
    expect(filterTitles(LIBRARY, { ...NO_FILTERS, search: '   ' })).toHaveLength(3);
  });

  it('matches a substring anywhere in the name, not just the start', () => {
    expect(filterTitles(LIBRARY, { ...NO_FILTERS, search: 'part' })).toEqual([LIBRARY[0]]);
  });

  /*
   * `createdAt` is not on a list row, so reversing what the server returned is
   * not a shortcut around sorting: the server already ordered it newest-first,
   * which makes the reverse exactly oldest-first.
   */
  it('reverses rather than re-sorting, because the server ordered them', () => {
    expect(filterTitles(LIBRARY, { ...NO_FILTERS, sort: 'oldest' })).toEqual(
      [...LIBRARY].reverse(),
    );
  });

  it('does not mutate the list it was given', () => {
    const original = [...LIBRARY];
    filterTitles(LIBRARY, { ...NO_FILTERS, sort: 'oldest' });

    expect(LIBRARY).toEqual(original);
  });
});
