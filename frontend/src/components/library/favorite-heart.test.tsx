import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FavoriteHeart, type ToggleFavorite } from './favorite-heart';

function renderHeart({
  favorite = false,
  onToggle = jest.fn().mockResolvedValue({ favorite: !favorite }) as ToggleFavorite,
}: { favorite?: boolean; onToggle?: ToggleFavorite } = {}) {
  render(
    <FavoriteHeart
      titleId="title-1"
      titleName="Dune: Part Two"
      favorite={favorite}
      onToggle={onToggle}
    />,
  );

  return { onToggle };
}

/** The heart's two labels, which are also how the tests read its state. */
const ADD = 'Add Dune: Part Two to favorites';
const REMOVE = 'Remove Dune: Part Two from favorites';

describe('Favorite heart (FIL-46)', () => {
  describe('what it shows', () => {
    it('is filled for a favourited title', () => {
      renderHeart({ favorite: true });

      expect(screen.getByRole('button', { name: REMOVE })).toHaveAttribute('aria-pressed', 'true');
    });

    it('is an outline for a title that is not', () => {
      renderHeart({ favorite: false });

      expect(screen.getByRole('button', { name: ADD })).toHaveAttribute('aria-pressed', 'false');
    });

    /*
     * The spec's own accessibility note: the FAV column is icon-only, so the
     * name has to carry the title and the direction. "Favorite" on ten rows says
     * nothing about which row or which way the click goes.
     */
    it('names the title and what the click will do', () => {
      renderHeart({ favorite: false });

      expect(screen.getByRole('button', { name: ADD })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^Favorite$/ })).not.toBeInTheDocument();
    });
  });

  describe('toggling', () => {
    it('fills immediately, before the save resolves', async () => {
      const user = userEvent.setup();
      // A promise that never settles, so what is asserted is the state *during*
      // the request rather than after it.
      renderHeart({ favorite: false, onToggle: () => new Promise(() => {}) });

      await user.click(screen.getByRole('button', { name: ADD }));

      expect(screen.getByRole('button', { name: REMOVE })).toBeInTheDocument();
    });

    it('persists the change', async () => {
      const user = userEvent.setup();
      const { onToggle } = renderHeart({ favorite: false });

      await user.click(screen.getByRole('button', { name: ADD }));

      expect(onToggle).toHaveBeenCalledWith('title-1');
    });

    it('empties a filled heart and persists that too', async () => {
      const user = userEvent.setup();
      const { onToggle } = renderHeart({ favorite: true });

      await user.click(screen.getByRole('button', { name: REMOVE }));

      expect(screen.getByRole('button', { name: ADD })).toBeInTheDocument();
      expect(onToggle).toHaveBeenCalledWith('title-1');
    });

    /*
     * The server's answer wins over the optimistic guess. They agree in practice;
     * taking the stored value is what makes a double click or a stale row settle
     * on what is actually saved rather than on what the component counted to.
     */
    it('settles on the stored state, not the guess', async () => {
      const user = userEvent.setup();
      renderHeart({ favorite: false, onToggle: jest.fn().mockResolvedValue({ favorite: false }) });

      await user.click(screen.getByRole('button', { name: ADD }));

      await waitFor(() => expect(screen.getByRole('button', { name: ADD })).toBeInTheDocument());
    });
  });

  describe('when the save fails', () => {
    const failing = () => jest.fn().mockResolvedValue(null);

    it('reverts to the previous state', async () => {
      const user = userEvent.setup();
      renderHeart({ favorite: false, onToggle: failing() });

      await user.click(screen.getByRole('button', { name: ADD }));

      await waitFor(() =>
        expect(screen.getByRole('button', { name: ADD })).toHaveAttribute('aria-pressed', 'false'),
      );
    });

    it('reverts a filled heart back to filled', async () => {
      const user = userEvent.setup();
      renderHeart({ favorite: true, onToggle: failing() });

      await user.click(screen.getByRole('button', { name: REMOVE }));

      await waitFor(() => expect(screen.getByRole('button', { name: REMOVE })).toBeInTheDocument());
    });

    /*
     * "The failure is visible" is a criterion, and a silent revert is not: a
     * heart flicking back on its own reads as a misclick rather than as an error.
     */
    it('says so, rather than only reverting', async () => {
      const user = userEvent.setup();
      renderHeart({ favorite: false, onToggle: failing() });

      await user.click(screen.getByRole('button', { name: ADD }));

      await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Not saved'));
    });

    it('clears the failure on the next attempt', async () => {
      const user = userEvent.setup();
      const onToggle = jest
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ favorite: true });
      renderHeart({ favorite: false, onToggle });

      await user.click(screen.getByRole('button', { name: ADD }));
      await waitFor(() => expect(screen.getByRole('status')).toBeInTheDocument());

      await user.click(screen.getByRole('button', { name: ADD }));

      await waitFor(() => {
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: REMOVE })).toBeInTheDocument();
      });
    });
  });

  // FIL-47's row handler skips anything marked as a control, so the title cannot
  // open underneath a heart click. Asserted here so removing the marker fails a
  // test in the file that depends on it.
  it('marks itself as a row control', () => {
    const { container } = render(
      <FavoriteHeart
        titleId="title-1"
        titleName="Dune: Part Two"
        favorite={false}
        onToggle={jest.fn()}
      />,
    );

    expect(container.querySelector('[data-row-action]')).toBeInTheDocument();
  });
});
