import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { GenreOption, TitleDetail } from '@/lib/dashboard';
import { TitleForm } from './title-form';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
  usePathname: () => '/library',
}));

const mockCreate = jest.fn();
const mockUpdate = jest.fn();
jest.mock('../../app/(shell)/titles/actions', () => ({
  createTitle: (input: unknown) => mockCreate(input),
  updateTitle: (id: string, input: unknown) => mockUpdate(id, input),
}));

const GENRES: GenreOption[] = [
  { id: 'g-scifi', slug: 'sci-fi', name: 'Sci-Fi', colorSlot: 1 },
  { id: 'g-drama', slug: 'drama', name: 'Drama', colorSlot: 2 },
];

function title(overrides: Partial<TitleDetail> = {}): TitleDetail {
  return {
    id: 'title-1',
    name: 'Dune: Part Two',
    type: 'movie',
    status: 'watched',
    genreId: 'g-scifi',
    watchDate: '2026-10-12T00:00:00.000Z',
    rating: 9,
    note: 'Villeneuve does it again.',
    favorite: true,
    year: 2024,
    runtime: 166,
    director: 'Denis Villeneuve',
    posterPath: null,
    createdAt: '2026-09-28T00:00:00.000Z',
    ...overrides,
  };
}

beforeEach(() => {
  mockCreate.mockReset().mockResolvedValue({ message: '', fields: [] });
  mockUpdate.mockReset().mockResolvedValue({ message: '', fields: [] });
});

describe('Edit title modal (FIL-61)', () => {
  describe('what it shows', () => {
    it('is titled "Edit title"', () => {
      render(<TitleForm genres={GENRES} title={title()} />);

      expect(screen.getByRole('heading', { name: 'Edit title' })).toBeInTheDocument();
    });

    it('prefills every field from the stored title', () => {
      render(<TitleForm genres={GENRES} title={title()} />);

      expect(screen.getByLabelText('Title')).toHaveValue('Dune: Part Two');
      expect(screen.getByLabelText('Type')).toHaveValue('movie');
      expect(screen.getByLabelText('Genre')).toHaveValue('g-scifi');
      expect(screen.getByLabelText('Status')).toHaveValue('watched');
      expect(screen.getByLabelText('Watch date')).toHaveValue('2026-10-12');
      expect(screen.getByLabelText('Rating out of 5')).toHaveValue('9');
    });

    /*
     * A29 and EDT-4: frame 09 draws an empty Note for the same title frame 07
     * shows carrying one. That is a mock inconsistency, not a rule, and a
     * prefilled form showing what is stored is the only sensible reading. Worth
     * flagging to the designer.
     */
    it('shows a saved note rather than the placeholder', () => {
      render(<TitleForm genres={GENRES} title={title()} />);

      expect(screen.getByLabelText('Note')).toHaveValue('Villeneuve does it again.');
    });

    it('reflects the stored favourite state', () => {
      render(<TitleForm genres={GENRES} title={title({ favorite: true })} />);

      expect(screen.getByRole('switch', { name: 'Mark as favorite' })).toHaveAttribute(
        'aria-checked',
        'true',
      );
    });

    it('leaves an unrated title unrated rather than showing zero stars', () => {
      render(<TitleForm genres={GENRES} title={title({ rating: null })} />);

      expect(screen.getByText('— / 5')).toBeInTheDocument();
    });
  });

  describe('the footer', () => {
    it('offers Cancel and a primary "Save changes"', () => {
      render(<TitleForm genres={GENRES} title={title()} />);

      expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Cancel' })).toBeInTheDocument();
    });

    /*
     * EDT-2's second entry point into the delete confirmation. A link to a real
     * route for the same reason Add title is one: intercepted into a dialog on a
     * client navigation, full page on a hard load.
     */
    it('offers a danger "Delete title" action for this title', () => {
      render(<TitleForm genres={GENRES} title={title()} />);

      expect(screen.getByRole('link', { name: /Delete title/ })).toHaveAttribute(
        'href',
        '/titles/title-1/delete',
      );
    });

    it('has no delete action when adding', () => {
      render(<TitleForm genres={GENRES} />);

      expect(screen.queryByRole('link', { name: /Delete title/ })).not.toBeInTheDocument();
    });
  });

  describe('saving', () => {
    it('sends the changed fields to the update action for this title', async () => {
      const user = userEvent.setup();
      render(<TitleForm genres={GENRES} title={title()} />);

      await user.clear(screen.getByLabelText('Title'));
      await user.type(screen.getByLabelText('Title'), 'Dune: Part One');
      await user.click(screen.getByRole('button', { name: 'Save changes' }));

      expect(mockUpdate).toHaveBeenCalledWith(
        'title-1',
        expect.objectContaining({ name: 'Dune: Part One' }),
      );
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('carries a genre change through', async () => {
      const user = userEvent.setup();
      render(<TitleForm genres={GENRES} title={title()} />);

      await user.selectOptions(screen.getByLabelText('Genre'), 'g-drama');
      await user.click(screen.getByRole('button', { name: 'Save changes' }));

      expect(mockUpdate).toHaveBeenCalledWith(
        'title-1',
        expect.objectContaining({ genreId: 'g-drama' }),
      );
    });

    it('does not persist anything when Cancel is used', async () => {
      const user = userEvent.setup();
      render(<TitleForm genres={GENRES} title={title()} />);

      await user.clear(screen.getByLabelText('Title'));
      await user.type(screen.getByLabelText('Title'), 'Something else');
      await user.click(screen.getByRole('link', { name: 'Cancel' }));

      expect(mockUpdate).not.toHaveBeenCalled();
    });

    /*
     * EDT-3: every Add title rule applies here. It is true by construction, since
     * both modes are one component calling one backend parser, and this asserts
     * the shared error path actually surfaces on the Edit side too.
     */
    it('shows the same inline errors the Add form does', async () => {
      const user = userEvent.setup();
      mockUpdate.mockResolvedValue({
        message: 'Check the highlighted fields and try again.',
        fields: ['name'],
      });
      render(<TitleForm genres={GENRES} title={title()} />);

      await user.click(screen.getByRole('button', { name: 'Save changes' }));

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Check the highlighted fields and try again.',
      );
      expect(screen.getByLabelText('Title').className).toContain('border-status-warning-text');
    });
  });

  // The other half of "one form, not two": adding must be untouched by all this.
  describe('the Add mode it shares a component with', () => {
    it('is still titled "Add title" with its own submit label', () => {
      render(<TitleForm genres={GENRES} />);

      expect(screen.getByRole('heading', { name: 'Add title' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Add title' })).toBeInTheDocument();
    });

    it('starts empty and calls the create action', async () => {
      const user = userEvent.setup();
      render(<TitleForm genres={GENRES} />);

      expect(screen.getByLabelText('Title')).toHaveValue('');

      await user.type(screen.getByLabelText('Title'), 'Arrival');
      await user.selectOptions(screen.getByLabelText('Genre'), 'g-scifi');
      await user.click(screen.getByRole('button', { name: 'Add title' }));

      expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ name: 'Arrival' }));
      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });
});
