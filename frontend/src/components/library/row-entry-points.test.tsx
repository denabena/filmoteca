import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { TitleListItem } from '@/lib/library';
import { TitlesTable } from './titles-table';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/library',
}));

/** The heart's own behaviour is `favorite-heart.test.tsx`; here it just needs one. */
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

/**
 * The wrapper's `onClick` is test-only plumbing, not behaviour.
 *
 * The title cell is a real `<a href>`, and jsdom logs "Not implemented:
 * navigation" whenever one is clicked. Calling `preventDefault` at the top of the
 * bubble phase stops the fake navigation while still letting React's handlers and
 * the row's own click logic run, which is what these tests are about.
 */
function renderTable(titles: TitleListItem[] = [title()]) {
  return render(
    <div onClick={(event) => event.preventDefault()}>
      <TitlesTable titles={titles} onToggleFavorite={noopToggle} />
    </div>,
  );
}

beforeEach(() => mockPush.mockReset());

describe('Library row entry points (FIL-47)', () => {
  describe('opening the title', () => {
    /*
     * A15: the design never draws a click target on a row, but frame 07 carries a
     * "Library" breadcrumb, so the row has to be how you reach the detail screen.
     * This is that working decision, asserted.
     */
    it('opens the detail page from a click on the row body', async () => {
      const user = userEvent.setup();
      renderTable();

      await user.click(screen.getByText('2024 · Movie'));

      expect(mockPush).toHaveBeenCalledWith('/titles/title-1');
    });

    it('opens the right title when several rows are listed', async () => {
      const user = userEvent.setup();
      renderTable([
        title({ id: 'a', name: 'Severance', year: 2022 }),
        title({ id: 'b', name: 'Oppenheimer', year: 2023 }),
      ]);

      await user.click(screen.getByText('2023 · Movie'));

      expect(mockPush).toHaveBeenCalledWith('/titles/b');
    });

    /*
     * The title is a real link, not a click handler dressed as one: that is what
     * makes Enter work natively, gives one tab stop per row, and shows the
     * destination in the browser's status bar.
     */
    it('makes the title a real link, so keyboard Enter opens it', async () => {
      const user = userEvent.setup();
      renderTable();

      const link = screen.getByRole('link', { name: 'Dune: Part Two' });
      expect(link).toHaveAttribute('href', '/titles/title-1');

      await user.tab();
      expect(link).toHaveFocus();
    });
  });

  describe('the kebab', () => {
    it('opens a menu anchored to its own row without navigating', async () => {
      const user = userEvent.setup();
      renderTable();

      const kebab = screen.getByRole('button', { name: 'More actions for Dune: Part Two' });
      await user.click(kebab);

      expect(screen.getByRole('menu')).toBeInTheDocument();
      // The whole point of the ticket: opening the menu must not also open the
      // title underneath it.
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('closes again on a second click', async () => {
      const user = userEvent.setup();
      renderTable();

      const kebab = screen.getByRole('button', { name: 'More actions for Dune: Part Two' });
      await user.click(kebab);
      await user.click(kebab);

      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('reports its own open state', async () => {
      const user = userEvent.setup();
      renderTable();

      const kebab = screen.getByRole('button', { name: 'More actions for Dune: Part Two' });
      expect(kebab).toHaveAttribute('aria-expanded', 'false');

      await user.click(kebab);
      expect(kebab).toHaveAttribute('aria-expanded', 'true');
    });

    /*
     * Icon-only, so the accessible name has to name the row. Ten identical "More
     * actions" buttons are unusable with a screen reader.
     */
    it('names the row it belongs to', () => {
      renderTable([title({ name: 'Severance' })]);

      expect(
        screen.getByRole('button', { name: 'More actions for Severance' }),
      ).toBeInTheDocument();
    });

    /*
     * The row's own stop is the title link. The heart (FIL-46) sits between them
     * because it is a real button too, which is the point: every control in the
     * row is reachable on its own rather than folded into one row-sized target.
     */
    it('is a separate tab stop from the row', async () => {
      const user = userEvent.setup();
      renderTable();

      await user.tab();
      expect(screen.getByRole('link', { name: 'Dune: Part Two' })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: 'Add Dune: Part Two to favorites' })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: 'More actions for Dune: Part Two' })).toHaveFocus();
    });

    it('belongs to its own row rather than to the table', async () => {
      const user = userEvent.setup();
      renderTable([title({ id: 'a', name: 'Severance' }), title({ id: 'b', name: 'Oppenheimer' })]);

      await user.click(screen.getByRole('button', { name: 'More actions for Oppenheimer' }));

      const row = screen.getByRole('row', { name: /Oppenheimer/ });
      expect(within(row).getByRole('menu')).toBeInTheDocument();
      expect(screen.getAllByRole('menu')).toHaveLength(1);
    });

    /*
     * The dismissal swallows its own click, in the capture phase above React's
     * root. Without that, closing the menu by clicking elsewhere in the table
     * would also navigate to whichever title was under the pointer: the user
     * asked to put a menu away and got a different screen.
     */
    it('closes on a click outside without opening whatever was clicked', async () => {
      const user = userEvent.setup();
      renderTable([
        title({ id: 'a', name: 'Severance', year: 2022 }),
        title({ id: 'b', name: 'Oppenheimer', year: 2023 }),
      ]);

      await user.click(screen.getByRole('button', { name: 'More actions for Severance' }));
      await user.click(screen.getByText('2023 · Movie'));

      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe('the controls inside a row', () => {
    // Found by marker rather than by naming the heart and the kebab, so a cell
    // that gains a button later cannot silently start navigating.
    it('does not navigate when the heart is clicked', async () => {
      const user = userEvent.setup();
      renderTable();

      await user.click(screen.getByRole('button', { name: 'Add Dune: Part Two to favorites' }));

      expect(mockPush).not.toHaveBeenCalled();
    });

    // The link navigates itself; letting the row handler fire too would push the
    // same route twice and put a duplicate entry in the history.
    it('leaves the title link to navigate on its own', async () => {
      const user = userEvent.setup();
      renderTable();

      await user.click(screen.getByRole('link', { name: 'Dune: Part Two' }));

      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  it('shows a pointer cursor and a hover treatment on the row', () => {
    renderTable();

    // jsdom has no hover styling to read, so this asserts the classes that carry
    // it. AC6 is otherwise unverifiable without a real browser.
    const row = screen.getByRole('row', { name: /Dune/ });
    expect(row.className).toContain('cursor-pointer');
    expect(row.className).toContain('hover:bg-surface-card-raised');
  });
});
