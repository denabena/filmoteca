import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddTitleButton } from './add-title-button';
import { PageHeader } from './page-header';
import { RouteModal } from './route-modal';

// RouteModal dismisses through history, so the router is stubbed and each test
// asserts on back(). usePathname is included because other shell components
// pulled into the same module graph read it.
const mockBack = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ back: mockBack }),
  usePathname: () => '/',
}));

beforeEach(() => {
  mockBack.mockClear();
});

describe('PageHeader (FIL-28)', () => {
  it('renders the overline above the title', () => {
    render(<PageHeader overline="Your watchlist" title="Library" />);

    expect(screen.getByText('Your watchlist')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Library' })).toBeInTheDocument();
  });

  it('renders whatever actions it is given', () => {
    render(
      <PageHeader
        overline="Welcome back, Mara"
        title="Dashboard"
        actions={<button type="button">Add title</button>}
      />,
    );

    expect(screen.getByRole('button', { name: 'Add title' })).toBeInTheDocument();
  });

  /*
   * AC2 is the whole point of the ticket: four epics supply their own copy, so
   * none of it may be baked in. If someone hardcodes "Dashboard" as a fallback,
   * this fails.
   */
  it('hardcodes no view-specific copy', () => {
    render(<PageHeader overline="Account" title="Settings" />);

    expect(screen.queryByText(/dashboard/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/welcome back/i)).not.toBeInTheDocument();
  });

  // AC7: the Picker header has no actions, and the title block must not move.
  it('renders no actions container when there are none', () => {
    const { container } = render(<PageHeader overline="AI assistant" title="Scene Picker" />);

    expect(container.querySelector('header')?.children).toHaveLength(1);
  });
});

describe('AddTitleButton (FIL-28 AC5)', () => {
  // A link, not a button: the modal is an intercepted route, so the URL has to
  // be real and shareable. Asserting the href guards the interception contract.
  it('links to the add-title route so the modal can intercept it', () => {
    render(<AddTitleButton />);

    expect(screen.getByRole('link', { name: 'Add title' })).toHaveAttribute('href', '/titles/new');
  });
});

describe('RouteModal (FIL-28 AC5, FIL-44 AC3)', () => {
  it('exposes itself as a labelled modal dialog', () => {
    render(
      <RouteModal label="Add title">
        <button type="button">Save</button>
      </RouteModal>,
    );

    const dialog = screen.getByRole('dialog', { name: 'Add title' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('moves focus into the dialog on open', () => {
    render(
      <RouteModal label="Add title">
        <input aria-label="Title" />
      </RouteModal>,
    );

    expect(screen.getByLabelText('Title')).toHaveFocus();
  });

  it('closes on Escape', async () => {
    const user = userEvent.setup();
    render(
      <RouteModal label="Add title">
        <button type="button">Save</button>
      </RouteModal>,
    );

    await user.keyboard('{Escape}');

    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('closes on a backdrop click but not on a click inside the card', async () => {
    const user = userEvent.setup();
    render(
      <RouteModal label="Add title">
        <button type="button">Save</button>
      </RouteModal>,
    );

    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(mockBack).not.toHaveBeenCalled();

    // The backdrop is the dialog's parent: the fixed overlay behind the card.
    await user.click(screen.getByRole('dialog').parentElement as HTMLElement);
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  // Without containment, Tab past the last control lands on the sidebar behind
  // the overlay, which is a real accessibility failure for a modal.
  it('wraps Tab from the last control back to the first', async () => {
    const user = userEvent.setup();
    render(
      <RouteModal label="Add title">
        <input aria-label="Title" />
        <button type="button">Save</button>
      </RouteModal>,
    );

    await user.tab();
    expect(screen.getByRole('button', { name: 'Save' })).toHaveFocus();

    await user.tab();
    expect(screen.getByLabelText('Title')).toHaveFocus();
  });
});
