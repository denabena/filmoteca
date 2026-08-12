import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DeleteTitleDialog, type DeleteTitle } from './delete-title-dialog';

const mockBack = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ back: mockBack, push: jest.fn() }),
  usePathname: () => '/library',
}));

const onDelete = jest.fn();

function renderDialog({ dismissable = false, name = 'Dune: Part Two' } = {}) {
  return render(
    <DeleteTitleDialog
      titleId="title-1"
      titleName={name}
      onDelete={onDelete as DeleteTitle}
      dismissable={dismissable}
    />,
  );
}

beforeEach(() => {
  onDelete.mockReset().mockResolvedValue(undefined);
  mockBack.mockReset();
});

describe('Delete confirmation dialog (FIL-63)', () => {
  describe('the designed copy', () => {
    it('shows a coral trash icon above the heading', () => {
      renderDialog();

      expect(screen.getByRole('heading', { name: 'Delete this title?' })).toBeInTheDocument();
      expect(screen.getByText('🗑')).toBeInTheDocument();
    });

    /*
     * The whole reason the copy is written this way. A generic sentence asks the
     * user to trust that the app has the right row; naming it lets them check,
     * which matters most from a row menu where three rows look alike at a glance.
     */
    it('quotes the title’s own name in the body', () => {
      renderDialog({ name: 'Severance' });

      expect(screen.getByText('Severance')).toBeInTheDocument();
      expect(
        screen.getByText(
          /and its rating, note, and watch history will be permanently removed\. This can't be undone\./,
        ),
      ).toBeInTheDocument();
    });

    it('names the title on the danger button too', () => {
      renderDialog({ name: 'Severance' });

      expect(screen.getByRole('button', { name: 'Delete Severance' })).toBeInTheDocument();
    });
  });

  describe('confirming', () => {
    it('deletes that title', async () => {
      const user = userEvent.setup();
      renderDialog();

      await user.click(screen.getByRole('button', { name: 'Delete Dune: Part Two' }));

      expect(onDelete).toHaveBeenCalledWith('title-1');
    });

    /*
     * An `aria-label` overrides the visible text, so it has to track the pending
     * state: a fixed one leaves the button announcing "Delete" while it reads
     * "Deleting…" on screen, and that is the state most worth hearing.
     */
    it('shows progress while the delete runs, on screen and to a screen reader', async () => {
      const user = userEvent.setup();
      onDelete.mockReturnValue(new Promise(() => {}));
      renderDialog();

      await user.click(screen.getByRole('button', { name: 'Delete Dune: Part Two' }));

      const button = screen.getByRole('button', { name: 'Deleting Dune: Part Two' });
      expect(button).toBeDisabled();
      expect(button).toHaveTextContent('Deleting…');
    });

    /*
     * A destructive action that vanishes without confirming is worse than one
     * that says it did not work, so a failure keeps the user where they are and
     * tells them.
     */
    it('says so when the delete fails, and leaves the dialog open', async () => {
      const user = userEvent.setup();
      onDelete.mockResolvedValue({ message: 'Could not delete this title. Please try again.' });
      renderDialog();

      await user.click(screen.getByRole('button', { name: 'Delete Dune: Part Two' }));

      expect(await screen.findByRole('alert')).toHaveTextContent('Could not delete this title');
      expect(screen.getByRole('heading', { name: 'Delete this title?' })).toBeInTheDocument();
    });

    // A retry that succeeds must not leave the previous failure on screen; in
    // production the redirect takes the page away, but the message clears first.
    it('clears an earlier failure on the next attempt', async () => {
      const user = userEvent.setup();
      onDelete
        .mockResolvedValueOnce({ message: 'Could not delete this title. Please try again.' })
        .mockResolvedValueOnce(undefined);
      renderDialog();

      // Matched loosely, because the button's name is "Deleting …" while a
      // transition is still settling and "Delete …" once it has.
      const dangerButton = () => screen.getByRole('button', { name: /^Delet/ });

      await user.click(dangerButton());
      await screen.findByRole('alert');
      await waitFor(() => expect(dangerButton()).toBeEnabled());

      await user.click(dangerButton());

      await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
      expect(onDelete).toHaveBeenCalledTimes(2);
    });
  });

  describe('cancelling', () => {
    it('deletes nothing and closes the modal', async () => {
      const user = userEvent.setup();
      renderDialog({ dismissable: true });

      await user.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(onDelete).not.toHaveBeenCalled();
      expect(mockBack).toHaveBeenCalled();
    });

    // On the full page there is no history entry to step back to, so Cancel goes
    // to the title it would have deleted.
    it('returns to the title from the standalone page', () => {
      renderDialog({ dismissable: false });

      expect(screen.getByRole('link', { name: 'Cancel' })).toHaveAttribute(
        'href',
        '/titles/title-1',
      );
    });

    /*
     * Escape belongs to `RouteModal`, which closes by navigating back. Asserted
     * here as the thing that matters for a destructive dialog: it must cancel and
     * can never confirm, so no keypress this component handles can delete.
     */
    it('has no key handler that could confirm', async () => {
      const user = userEvent.setup();
      renderDialog({ dismissable: true });

      await user.keyboard('{Escape}');
      await user.keyboard('{Enter}');

      expect(onDelete).not.toHaveBeenCalled();
    });
  });
});
