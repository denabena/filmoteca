import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LibraryPage from '@/app/(shell)/library/page';
import type { TitleListItem } from '@/lib/library';
import { LibraryTabs } from './library-tabs';

// The page renders AddTitleButton, which is a next/link; usePathname is stubbed
// for anything else in the graph that reads the route.
jest.mock('next/navigation', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
  usePathname: () => '/library',
}));

// The page is an async Server Component that fetches its rows. `apiFetch` imports
// `server-only` and mints a session token, so it is stubbed rather than run; what
// these tests are about is what the page does with the rows, not how it gets them.
const mockApiFetch = jest.fn();
jest.mock('../../lib/api', () => ({ apiFetch: (path: string) => mockApiFetch(path) }));

// The page imports the favourite Server Action to hand down to the table. That
// module pulls `next/cache` and the Next server runtime, which jsdom cannot load,
// so it is stubbed here. What the action does is covered in
// `favorite-heart.test.tsx`; the page only has to pass it along.
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
    favorite: true,
    ...overrides,
  };
}

/** The page is async, so it is awaited into an element rather than rendered. */
async function renderPage(titles: TitleListItem[] = [title()]) {
  mockApiFetch.mockResolvedValue(titles);
  return render(await LibraryPage());
}

function renderTabs() {
  return render(<LibraryTabs table={<p>Titles table</p>} genres={<p>Genre cards</p>} />);
}

beforeEach(() => mockApiFetch.mockReset());

describe('Library page header (FIL-44)', () => {
  it('shows the designed overline and title through the shared header', async () => {
    await renderPage();

    expect(screen.getByText('Your watchlist')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Library' })).toBeInTheDocument();
  });

  // AC3: the modal is the intercepting route, so the button must be a link to the
  // real URL. A plain button would open a modal that no URL can reach.
  it('puts an Add title action in the header that the modal route can intercept', async () => {
    await renderPage();

    expect(screen.getByRole('link', { name: 'Add title' })).toHaveAttribute('href', '/titles/new');
  });

  it('reads the rows from the titles list endpoint', async () => {
    await renderPage();

    expect(mockApiFetch).toHaveBeenCalledWith('/api/titles');
  });
});

describe('Library tab switcher (FIL-44)', () => {
  it('opens on "All titles" with the table showing', () => {
    renderTabs();

    expect(screen.getByRole('tab', { name: 'All titles' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tab', { name: 'Genres' })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByText('Titles table')).toBeInTheDocument();
  });

  it('replaces the table with the genre cards, and back again', async () => {
    const user = userEvent.setup();
    renderTabs();

    await user.click(screen.getByRole('tab', { name: 'Genres' }));

    expect(screen.getByText('Genre cards')).toBeInTheDocument();
    // "Replace", not "hide": the table must leave the tree entirely, or its rows
    // and controls stay in the tab order behind the visible panel.
    expect(screen.queryByText('Titles table')).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Genres' })).toHaveAttribute('aria-selected', 'true');

    await user.click(screen.getByRole('tab', { name: 'All titles' }));

    expect(screen.getByText('Titles table')).toBeInTheDocument();
    expect(screen.queryByText('Genre cards')).not.toBeInTheDocument();
  });

  /*
   * AC8. Roving tabindex means the tablist is a single Tab stop and arrows move
   * within it; that is the WAI-ARIA pattern and it is what "I can switch between
   * them with the keyboard" needs. aria-selected is the announcement.
   */
  it('is one tab stop, and arrow keys switch tabs', async () => {
    const user = userEvent.setup();
    renderTabs();

    await user.tab();
    expect(screen.getByRole('tab', { name: 'All titles' })).toHaveFocus();

    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Genres' })).toHaveFocus();
    expect(screen.getByRole('tab', { name: 'Genres' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Genre cards')).toBeInTheDocument();

    await user.keyboard('{ArrowLeft}');
    expect(screen.getByRole('tab', { name: 'All titles' })).toHaveFocus();
    expect(screen.getByText('Titles table')).toBeInTheDocument();
  });

  it('wraps with arrows and jumps with Home and End', async () => {
    const user = userEvent.setup();
    renderTabs();

    await user.tab();
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByRole('tab', { name: 'Genres' })).toHaveFocus();

    await user.keyboard('{Home}');
    expect(screen.getByRole('tab', { name: 'All titles' })).toHaveFocus();

    await user.keyboard('{End}');
    expect(screen.getByRole('tab', { name: 'Genres' })).toHaveFocus();
  });

  it('points each tab at the panel it controls', async () => {
    const user = userEvent.setup();
    renderTabs();

    const panel = screen.getByRole('tabpanel');
    expect(screen.getByRole('tab', { name: 'All titles' })).toHaveAttribute(
      'aria-controls',
      panel.id,
    );

    await user.click(screen.getByRole('tab', { name: 'Genres' }));
    expect(screen.getByRole('tab', { name: 'Genres' })).toHaveAttribute(
      'aria-controls',
      screen.getByRole('tabpanel').id,
    );
  });

  // AC7: the header lives outside this component, so a tab switch structurally
  // cannot touch it. Rendering the whole page proves the wiring, not just intent.
  it('leaves the page header untouched when the tab changes', async () => {
    const user = userEvent.setup();
    await renderPage();

    await user.click(screen.getByRole('tab', { name: 'Genres' }));

    expect(screen.getByText('Your watchlist')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Library' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Add title' })).toBeInTheDocument();
  });
});
