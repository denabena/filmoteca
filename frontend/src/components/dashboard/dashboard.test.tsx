import { render, screen } from '@testing-library/react';
import type { ActivityStat, MonthlyStats, PickerGateState } from '@/lib/dashboard';
import { monthLabel, posterUrl, previousMonthKey } from '@/lib/dashboard';
import { ContinueWatchingHero } from './continue-watching';
import { PickerTeaser } from './picker-teaser';
import { StatCards } from './stat-cards';
import { UpNextRail } from './up-next-rail';
import { WatchActivity } from './watch-activity';

function stats(overrides: Partial<MonthlyStats> = {}): MonthlyStats {
  return {
    month: '2026-10',
    watched: { count: 12, trend: 3 },
    averageRating: 4.2,
    topGenre: { name: 'Sci-Fi', count: 8 },
    activity: { buckets: [3, 5, 2, 4], total: 14, currentBucket: 3 },
    ...overrides,
  };
}

describe('dashboard helpers', () => {
  it('names a month in UTC, not local time', () => {
    expect(monthLabel('2026-10')).toBe('October');
    expect(monthLabel('2026-01', { withYear: true })).toBe('January 2026');
  });

  it('steps back across a year boundary', () => {
    expect(previousMonthKey('2026-01')).toBe('2025-12');
  });

  it('builds a TMDB url only when there is a poster', () => {
    expect(posterUrl('/abc.jpg')).toBe('https://image.tmdb.org/t/p/w342/abc.jpg');
    expect(posterUrl(null)).toBeNull();
  });
});

describe('ContinueWatchingHero', () => {
  const title = {
    id: 't1',
    name: 'Severance',
    year: 2022,
    type: 'series' as const,
    genre: 'Sci-Fi',
    posterPath: '/sev.jpg',
  };

  it('renders the title and its meta line', () => {
    render(<ContinueWatchingHero title={title} />);

    expect(screen.getByRole('heading', { name: 'Severance' })).toBeInTheDocument();
    expect(screen.getByText('2022 · Sci-Fi · Series')).toBeInTheDocument();
    expect(screen.getByText('Watching')).toBeInTheDocument();
  });

  // A17: a hand-typed title has no year, and the design draws no placeholder for
  // it, so the segment is dropped rather than rendered as a stray separator.
  it('drops the year segment when the year is unknown', () => {
    render(<ContinueWatchingHero title={{ ...title, year: null }} />);

    expect(screen.getByText('Sci-Fi · Series')).toBeInTheDocument();
  });

  // A9: progress is display-only and no form captures it, so showing a bar would
  // mean inventing the same fictional percentage for every user.
  it('renders no progress bar, because nothing can populate one', () => {
    render(<ContinueWatchingHero title={title} />);

    expect(screen.queryByText(/Season/)).not.toBeInTheDocument();
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });

  // A10: Resume has no designed destination and no player exists.
  it('disables Resume rather than hiding it', () => {
    render(<ContinueWatchingHero title={title} />);

    expect(screen.getByRole('button', { name: /Resume/ })).toBeDisabled();
  });

  it('shows the designed empty hero when nothing is in progress', () => {
    render(<ContinueWatchingHero title={null} />);

    expect(screen.getByRole('heading', { name: 'Nothing playing right now' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Browse watchlist' })).toBeInTheDocument();
  });
});

describe('StatCards', () => {
  it('renders the three filled cards', () => {
    render(<StatCards stats={stats()} />);

    expect(screen.getByText('WATCHED IN OCTOBER')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('+3 vs September')).toBeInTheDocument();
    expect(screen.getByText('4.2')).toBeInTheDocument();
    expect(screen.getByText('Sci-Fi')).toBeInTheDocument();
    expect(screen.getByText('8 titles this month')).toBeInTheDocument();
  });

  // The card's empty variant is "— / 5" with grey stars, and it has to stay
  // distinguishable from a genuine average of 0.
  it('shows a dash, not a zero, when nothing is rated', () => {
    render(<StatCards stats={stats({ averageRating: null })} />);

    expect(screen.getByLabelText('Not rated')).toBeInTheDocument();
    expect(screen.queryByText('0.0')).not.toBeInTheDocument();
  });

  it('shows a real average of zero as a number', () => {
    render(<StatCards stats={stats({ averageRating: 0 })} />);

    expect(screen.getByText('0.0')).toBeInTheDocument();
  });

  it('replaces the trend with a caption for an empty month', () => {
    render(<StatCards stats={stats({ watched: { count: 0, trend: null } })} />);

    expect(screen.getByText('No titles this month')).toBeInTheDocument();
  });

  it('says so when there is no top genre', () => {
    render(<StatCards stats={stats({ topGenre: null })} />);

    expect(screen.getByText('No data yet')).toBeInTheDocument();
  });

  it('singularises a one-title genre', () => {
    render(<StatCards stats={stats({ topGenre: { name: 'Crime', count: 1 } })} />);

    expect(screen.getByText('1 title this month')).toBeInTheDocument();
  });
});

describe('UpNextRail', () => {
  const titles = [
    { id: 'a', name: 'Dune: Part Two', year: 2024, type: 'movie' as const, posterPath: null },
    { id: 'b', name: 'Shōgun', year: 2024, type: 'series' as const, posterPath: null },
  ];

  it('renders a card per title with its caption', () => {
    render(<UpNextRail titles={titles} />);

    expect(screen.getByText('Dune: Part Two')).toBeInTheDocument();
    expect(screen.getByText('2024 · Movie')).toBeInTheDocument();
    expect(screen.getByText('2024 · Series')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View all' })).toBeInTheDocument();
  });

  it('shows the designed empty state and hides View all', () => {
    render(<UpNextRail titles={[]} />);

    expect(screen.getByText('Nothing queued yet')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Add your first title' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'View all' })).not.toBeInTheDocument();
  });
});

describe('WatchActivity', () => {
  const activity = (overrides: Partial<ActivityStat> = {}): ActivityStat => ({
    buckets: [3, 5, 2, 4],
    total: 14,
    currentBucket: 3,
    ...overrides,
  });

  it('labels the current bucket This week and the rest W1 to W4', () => {
    render(<WatchActivity activity={activity()} />);

    expect(screen.getByText('This week')).toBeInTheDocument();
    expect(screen.getByText('W1')).toBeInTheDocument();
    expect(screen.queryByText('W4')).not.toBeInTheDocument();
  });

  it('labels all four weeks in a past month', () => {
    render(<WatchActivity activity={activity({ currentBucket: null })} />);

    expect(screen.getByText('W4')).toBeInTheDocument();
    expect(screen.queryByText('This week')).not.toBeInTheDocument();
  });

  it('shows the total badge', () => {
    render(<WatchActivity activity={activity()} />);

    expect(screen.getByText('14 this month')).toBeInTheDocument();
  });

  it('shows the empty badge for a month with no activity', () => {
    render(<WatchActivity activity={activity({ buckets: [0, 0, 0, 0], total: 0 })} />);

    expect(screen.getByText('No activity yet')).toBeInTheDocument();
  });
});

describe('PickerTeaser', () => {
  const gate = (overrides: Partial<PickerGateState> = {}): PickerGateState => ({
    unlocked: false,
    ratedCount: 1,
    threshold: 3,
    ...overrides,
  });

  it('shows the locked state with progress towards the threshold', () => {
    render(<PickerTeaser picker={gate()} />);

    expect(screen.getByText('PICKER LOCKED')).toBeInTheDocument();
    expect(screen.getByText('1 of 3 rated')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Add a title/ })).toBeInTheDocument();
  });

  it('links through to the Picker once unlocked', () => {
    render(<PickerTeaser picker={gate({ unlocked: true, ratedCount: 5 })} />);

    expect(screen.getByText("TONIGHT'S PICK")).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Open Picker/ })).toHaveAttribute('href', '/picker');
  });
});
