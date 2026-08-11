import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { TitleListItem } from '@/lib/library';
import { TitlesTable } from './titles-table';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => '/library',
}));

const noopToggle = jest.fn().mockResolvedValue({ favorite: false });
const markWatched = jest.fn();

function title(overrides: Partial<TitleListItem> = {}): TitleListItem {
  return {
    id: 'title-1',
    name: 'Dune: Part Two',
    year: 2024,
    type: 'movie',
    genre: { id: 'g-scifi', slug: 'sci-fi', name: 'Sci-Fi', colorSlot: 6 },
    status: 'watching',
    rating: null,
    favorite: false,
    ...overrides,
  };
}

/** jsdom cannot navigate; `preventDefault` keeps its warning out of the output. */
function renderTable(titles: TitleListItem[] = [title()]) {
  return render(
    <div onClick={(event) => event.preventDefault()}>
      <TitlesTable titles={titles} onToggleFavorite={noopToggle} onMarkWatched={markWatched} />
    </div>,
  );
}

async function openMenu(name = 'More actions for Dune: Part Two') {
  const user = userEvent.setup();
  renderTable();
  await user.click(screen.getByRole('button', { name }));
  return user;
}

beforeEach(() => markWatched.mockReset().mockResolvedValue(true));

describe('Row menu actions (FIL-62)', () => {
  describe('the three items', () => {
    // Accessible names rather than text content: the icons are aria-hidden, so
    // this is what a screen reader actually reads out, in the order it reads it.
    it('offers exactly Edit details, Mark as watched and Delete title, in order', async () => {
      await openMenu();

      expect(
        screen
          .getAllByRole('menuitem')
          .map(
            (item) =>
              item.getAttribute('aria-label') ?? item.textContent?.replace(/[✎✓🗑]/g, '').trim(),
          ),
      ).toEqual(['Edit details', 'Mark as watched', 'Delete title Dune: Part Two']);
    });

    /*
     * Edit and Delete are links because both open modals that are real routes: a
     * link gets the intercepting-route behaviour, a shareable URL and
     * middle-click for free. Only Mark as watched is a button, because it is the
     * only one that changes something rather than going somewhere.
     */
    it('points Edit details at the prefilled edit route', async () => {
      await openMenu();

      expect(screen.getByRole('menuitem', { name: 'Edit details' })).toHaveAttribute(
        'href',
        '/titles/title-1/edit',
      );
    });

    it('points Delete title at the confirmation route for that title', async () => {
      await openMenu();

      expect(screen.getByRole('menuitem', { name: /Delete title/ })).toHaveAttribute(
        'href',
        '/titles/title-1/delete',
      );
    });

    it('marks the delete item as the danger action', async () => {
      await openMenu();

      expect(screen.getByRole('menuitem', { name: /Delete title/ }).className).toContain(
        'text-accent',
      );
    });

    it('closes the menu when an item navigates', async () => {
      const user = await openMenu();

      await user.click(screen.getByRole('menuitem', { name: 'Edit details' }));

      // Otherwise the menu is still open behind the modal, and visible again the
      // moment the modal is dismissed back to this page.
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });

  describe('Mark as watched', () => {
    it('runs the action for that title and closes the menu', async () => {
      const user = await openMenu();

      await user.click(screen.getByRole('menuitem', { name: 'Mark as watched' }));

      expect(markWatched).toHaveBeenCalledWith('title-1');
      await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
    });

    /*
     * A22: the menu is mocked only on a watching row, and no variant is drawn for
     * one already watched, so the item shows on every row and is a no-op there.
     * The backend makes it idempotent for the same reason, so the two halves
     * agree. Hiding it is a real alternative and wants a designer.
     */
    it('is offered on an already-watched title too', async () => {
      const user = userEvent.setup();
      renderTable([title({ status: 'watched' })]);

      await user.click(screen.getByRole('button', { name: 'More actions for Dune: Part Two' }));

      expect(screen.getByRole('menuitem', { name: 'Mark as watched' })).toBeEnabled();
    });

    it('does not break when used on an already-watched title', async () => {
      const user = userEvent.setup();
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
      renderTable([title({ status: 'watched' })]);

      await user.click(screen.getByRole('button', { name: 'More actions for Dune: Part Two' }));
      await user.click(screen.getByRole('menuitem', { name: 'Mark as watched' }));

      expect(markWatched).toHaveBeenCalledWith('title-1');
      expect(consoleError).not.toHaveBeenCalled();
      consoleError.mockRestore();
    });

    // A failed action must not leave the menu stuck open with no explanation of
    // why nothing happened; closing is what the user asked for either way.
    it('still closes when the action fails', async () => {
      markWatched.mockResolvedValue(false);
      const user = await openMenu();

      await user.click(screen.getByRole('menuitem', { name: 'Mark as watched' }));

      await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
    });
  });

  describe('the keyboard', () => {
    /*
     * Not designed anywhere, and shipped regardless: a menu that only works with
     * a mouse is not shippable.
     */
    it('moves between the three items with the arrow keys', async () => {
      const user = await openMenu();

      expect(screen.getByRole('menuitem', { name: 'Edit details' })).toHaveFocus();

      await user.keyboard('{ArrowDown}');
      expect(screen.getByRole('menuitem', { name: 'Mark as watched' })).toHaveFocus();

      await user.keyboard('{ArrowDown}');
      expect(screen.getByRole('menuitem', { name: /Delete title/ })).toHaveFocus();

      await user.keyboard('{ArrowUp}');
      expect(screen.getByRole('menuitem', { name: 'Mark as watched' })).toHaveFocus();
    });

    it('wraps around and jumps with Home and End', async () => {
      const user = await openMenu();

      await user.keyboard('{ArrowUp}');
      expect(screen.getByRole('menuitem', { name: /Delete title/ })).toHaveFocus();

      await user.keyboard('{Home}');
      expect(screen.getByRole('menuitem', { name: 'Edit details' })).toHaveFocus();

      await user.keyboard('{End}');
      expect(screen.getByRole('menuitem', { name: /Delete title/ })).toHaveFocus();
    });

    /*
     * Returning focus is the half that is easy to skip and impossible to use
     * without: otherwise the caret drops back to the document and the next Tab
     * starts from the top of the page rather than from the row being worked in.
     */
    it('closes on Escape and puts focus back on the kebab', async () => {
      const user = await openMenu();

      await user.keyboard('{Escape}');

      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'More actions for Dune: Part Two' })).toHaveFocus();
    });
  });

  /*
   * FIL-47 built the dismissal; this asserts the criterion FIL-62 restates,
   * which is the part that matters now that the items do something: "it closes
   * and no action runs".
   */
  it('runs nothing when dismissed by a click outside', async () => {
    const user = await openMenu();

    await user.click(document.body);

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(markWatched).not.toHaveBeenCalled();
  });
});
