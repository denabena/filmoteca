import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { GenreWithCount } from '@/lib/genres';
import { GenreCards } from './genre-cards';
import { NewGenreButton } from './new-genre-button';

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

/**
 * FIL-51. A24 retires genre management: "New genre" has no designed flow, the
 * card kebab has no designed menu, and the card has no designed destination. All
 * three are drawn, so all three ship, and none of them may pretend to work.
 *
 * The ticket's last criterion, that none is announced as an action a user can
 * complete, is the one these tests are really about. It pulls against "looks
 * exactly as designed", and this is where that trade is recorded.
 */
describe('the inert genre actions (FIL-51)', () => {
  describe('the "New genre" button', () => {
    it('renders as the designed secondary button', () => {
      render(<NewGenreButton />);

      const button = screen.getByRole('button', { name: 'New genre' });
      expect(button.className).toContain('bg-surface-card-raised');
      expect(button.className).toContain('border-border-strong');
    });

    /*
     * A live-looking button that silently swallows a click is worse for everybody
     * than a dimmed one that says why, so `disabled` wins over pixel fidelity.
     * The only visual difference from frame 12 is the opacity.
     */
    it('is not offered as something the user can do', () => {
      render(<NewGenreButton />);

      const button = screen.getByRole('button', { name: 'New genre' });
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('title', 'Creating genres is not available yet');
    });

    it('is not reachable by keyboard', async () => {
      const user = userEvent.setup();
      render(
        <>
          <button type="button">Before</button>
          <NewGenreButton />
          <button type="button">After</button>
        </>,
      );

      await user.tab();
      await user.tab();

      // Straight past the disabled one: two tabs from the start lands on "After".
      expect(screen.getByRole('button', { name: 'After' })).toHaveFocus();
    });

    it('does nothing and throws nothing when clicked', async () => {
      const user = userEvent.setup();
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
      render(<NewGenreButton />);

      await user.click(screen.getByRole('button', { name: 'New genre' }));

      expect(consoleError).not.toHaveBeenCalled();
      consoleError.mockRestore();
    });
  });

  describe('the genre card', () => {
    it('offers no interactive control at all', () => {
      render(<GenreCards genres={[genre()]} />);

      // No kebab button, no card link, nothing focusable inside the card.
      expect(screen.queryAllByRole('button')).toHaveLength(0);
      expect(screen.queryAllByRole('link')).toHaveLength(0);
      expect(screen.queryAllByRole('menu')).toHaveLength(0);
    });

    /*
     * The kebab is a `<span>` rather than a disabled `<button>`: a disabled
     * button is still an announced control that happens to be unavailable, while
     * this is not a control at all, which is the truthful description of a mark
     * with no designed behaviour.
     */
    it('draws the kebab without announcing it', () => {
      const { container } = render(<GenreCards genres={[genre()]} />);

      const card = within(container).getByRole('listitem');
      expect(card.querySelector('[aria-hidden="true"]')).toBeInTheDocument();
      expect(within(card).queryByRole('button')).not.toBeInTheDocument();
    });

    it('does not break when the kebab is clicked', async () => {
      const user = userEvent.setup();
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
      const { container } = render(<GenreCards genres={[genre()]} />);

      const card = within(container).getByRole('listitem');
      await user.click(card);

      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      expect(consoleError).not.toHaveBeenCalled();
      consoleError.mockRestore();
    });

    /*
     * A card that lights up under the pointer and then does nothing is the exact
     * failure this ticket guards against, so the absent hover treatment is the
     * feature rather than an omission.
     */
    it('gives no affordance suggesting the card body navigates', () => {
      const { container } = render(<GenreCards genres={[genre()]} />);

      const card = within(container).getByRole('listitem');
      expect(card.className).not.toContain('cursor-pointer');
      expect(card.className).not.toContain('hover:');
    });
  });
});
