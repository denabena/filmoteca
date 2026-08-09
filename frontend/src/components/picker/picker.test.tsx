import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { PickCard as PickCardData, PickerGateState } from '@/lib/dashboard';
import { MOOD_OPTIONS } from '@/lib/dashboard';
import { MoodPrompt } from './mood-prompt';
import { PickCard } from './pick-card';
import { PickerLocked } from './picker-locked';
import { PickSkeletons } from './pick-skeleton';

const generatePicks = jest.fn();
const addPickToWatchlist = jest.fn();
const dismissPick = jest.fn();

jest.mock('../../app/(shell)/picker/actions', () => ({
  generatePicks: (...args: unknown[]) => generatePicks(...args),
  addPickToWatchlist: (...args: unknown[]) => addPickToWatchlist(...args),
  dismissPick: (...args: unknown[]) => dismissPick(...args),
}));

function pick(overrides: Partial<PickCardData> = {}): PickCardData {
  return {
    id: 'pick-1',
    name: 'Arrival',
    year: 2016,
    type: 'movie',
    genre: 'Sci-Fi',
    runtime: 116,
    posterPath: null,
    matchPercent: 96,
    reason: 'You rated Blade Runner 2049 4.5 out of 5, and this is Sci-Fi too.',
    state: 'suggested',
    ...overrides,
  };
}

beforeEach(() => {
  generatePicks.mockReset().mockResolvedValue(undefined);
  addPickToWatchlist.mockReset().mockResolvedValue(undefined);
  dismissPick.mockReset().mockResolvedValue(undefined);
});

describe('MoodPrompt', () => {
  it('offers all six designed chips', () => {
    render(<MoodPrompt />);

    for (const mood of MOOD_OPTIONS) {
      expect(screen.getByRole('checkbox', { name: mood.label })).toBeInTheDocument();
    }
  });

  it('selects more than one mood at a time', async () => {
    const user = userEvent.setup();
    render(<MoodPrompt />);

    await user.click(screen.getByRole('checkbox', { name: 'Mind-bender' }));
    await user.click(screen.getByRole('checkbox', { name: 'Critically loved' }));

    expect(screen.getByRole('checkbox', { name: 'Mind-bender' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Critically loved' })).toBeChecked();
  });

  it('deselects a mood on a second click', async () => {
    const user = userEvent.setup();
    render(<MoodPrompt />);

    const chip = screen.getByRole('checkbox', { name: 'Feel-good' });
    await user.click(chip);
    await user.click(chip);

    expect(chip).not.toBeChecked();
  });

  // FIL-70 specifies this label exactly.
  it('labels the button Generating... while it runs', async () => {
    const user = userEvent.setup();
    let release: (() => void) | undefined;
    generatePicks.mockImplementation(() => new Promise<void>((resolve) => (release = resolve)));
    render(<MoodPrompt />);

    await user.click(screen.getByRole('button', { name: 'Surprise me' }));
    expect(await screen.findByRole('button', { name: 'Generating...' })).toBeDisabled();

    release?.();
  });

  it('sends the selected moods', async () => {
    const user = userEvent.setup();
    render(<MoodPrompt />);

    await user.click(screen.getByRole('checkbox', { name: 'Edge of seat' }));
    await user.click(screen.getByRole('button', { name: 'Surprise me' }));

    expect(generatePicks).toHaveBeenCalledWith(['edge-of-seat']);
  });

  // Zero moods is a valid request: the backend treats it as no constraint and
  // still returns three picks, so the button must never be gated on a selection.
  it('generates with nothing selected', async () => {
    const user = userEvent.setup();
    render(<MoodPrompt />);

    await user.click(screen.getByRole('button', { name: 'Surprise me' }));

    expect(generatePicks).toHaveBeenCalledWith([]);
  });

  // A27: generation has no designed failure state, and the backend keeps the
  // previous batch, so the message has to say the picks are untouched.
  it('reports a failure without implying the picks were lost', async () => {
    const user = userEvent.setup();
    generatePicks.mockRejectedValue(new Error('boom'));
    render(<MoodPrompt />);

    await user.click(screen.getByRole('button', { name: 'Surprise me' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('previous picks are unchanged');
  });
});

describe('PickCard', () => {
  it('renders the match badge, meta line and reason', () => {
    render(<PickCard pick={pick()} />);

    expect(screen.getByRole('heading', { name: 'Arrival' })).toBeInTheDocument();
    expect(screen.getByText('96% match')).toBeInTheDocument();
    expect(screen.getByText('2016 · Sci-Fi · Movie')).toBeInTheDocument();
    expect(screen.getByText(/Blade Runner 2049/)).toBeInTheDocument();
  });

  it('drops the year segment when it is unknown', () => {
    render(<PickCard pick={pick({ year: null })} />);

    expect(screen.getByText('Sci-Fi · Movie')).toBeInTheDocument();
  });

  it('adds to the watchlist', async () => {
    const user = userEvent.setup();
    render(<PickCard pick={pick()} />);

    await user.click(screen.getByRole('button', { name: 'Add to watchlist' }));

    expect(addPickToWatchlist).toHaveBeenCalledWith('pick-1');
  });

  it('dismisses', async () => {
    const user = userEvent.setup();
    render(<PickCard pick={pick()} />);

    await user.click(screen.getByRole('button', { name: 'Not for me' }));

    expect(dismissPick).toHaveBeenCalledWith('pick-1');
  });

  // A deliberate deviation from A25, which leaves the card unchanged: a button
  // that looks identical after it worked cannot be told from one that failed.
  it('shows an already-added pick as done and refuses a second add', async () => {
    const user = userEvent.setup();
    render(<PickCard pick={pick({ state: 'added' })} />);

    const button = screen.getByRole('button', { name: 'In your watchlist' });
    expect(button).toBeDisabled();

    await user.click(button);
    expect(addPickToWatchlist).not.toHaveBeenCalled();
  });
});

describe('PickerLocked', () => {
  const gate = (overrides: Partial<PickerGateState> = {}): PickerGateState => ({
    unlocked: false,
    ratedCount: 1,
    threshold: 3,
    ...overrides,
  });

  it('shows the designed copy and how far off the user is', () => {
    render(<PickerLocked picker={gate()} />);

    expect(
      screen.getByRole('heading', { name: 'The Picker needs a few titles first' }),
    ).toBeInTheDocument();
    expect(screen.getByText('1 of 3 rated')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Add your first title' })).toBeInTheDocument();
  });

  it('offers no mood controls at all', () => {
    render(<PickerLocked picker={gate()} />);

    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Surprise me' })).not.toBeInTheDocument();
  });
});

describe('PickSkeletons', () => {
  // FIL-70 specifies this copy exactly.
  it('shows the designed generating heading and caption', () => {
    render(<PickSkeletons />);

    expect(screen.getByRole('heading', { name: 'Finding your next watch...' })).toBeInTheDocument();
    expect(screen.getByText(/Analyzing your ratings, favorites, and tonight/)).toBeInTheDocument();
  });

  it('announces that it is busy and draws three placeholders', () => {
    const { container } = render(<PickSkeletons />);

    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
    expect(screen.getAllByTestId('pick-skeleton')).toHaveLength(3);
  });
});
