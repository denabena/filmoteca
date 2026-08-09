import type { MonthlyStats } from '@/lib/dashboard';
import { genreColorClass, monthLabel, previousMonthKey } from '@/lib/dashboard';
import { Icon } from './icon';

/**
 * The three monthly stat cards (DSH-3, DSH-4, DSH-5; FIL-36), each with the empty
 * variant the design draws.
 *
 * Every card is the same frame with a coloured 3px rule, an overline, a value and
 * a footnote, so the shell is shared and only the contents differ.
 */
export function StatCards({ stats }: { stats: MonthlyStats }) {
  return (
    <div className="flex w-full items-start gap-[20px]">
      <WatchedCard stats={stats} />
      <AverageRatingCard rating={stats.averageRating} />
      <TopGenreCard topGenre={stats.topGenre} />
    </div>
  );
}

function StatCard({
  rule,
  overline,
  children,
}: {
  rule: string;
  overline: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-surface-card border-border-default flex min-w-0 flex-1 flex-col gap-[12px] rounded-[16px] border px-[24px] py-[18px]">
      <span className={`h-[3px] w-[30px] rounded-[2px] ${rule}`} aria-hidden="true" />
      <h3 className="text-text-tertiary text-[11px] font-medium tracking-[0.88px]">{overline}</h3>
      {children}
    </section>
  );
}

/** Big number plus its unit, the shape every filled card shares. */
function Value({ value, suffix }: { value: string; suffix?: string }) {
  return (
    <p className="flex items-baseline gap-[8px]">
      <span className="font-display text-[30px] leading-[1.1] font-bold tracking-[-0.45px]">
        {value}
      </span>
      {suffix && <span className="text-text-tertiary text-[14px] leading-[1.5]">{suffix}</span>}
    </p>
  );
}

function WatchedCard({ stats }: { stats: MonthlyStats }) {
  const { count, trend } = stats.watched;

  return (
    <StatCard
      rule={count === 0 ? 'bg-surface-elevated' : 'bg-accent'}
      overline={`WATCHED IN ${monthLabel(stats.month).toUpperCase()}`}
    >
      <Value value={String(count)} suffix="titles" />
      {trend === null ? (
        <p className="text-text-tertiary text-[12px] font-medium">No titles this month</p>
      ) : (
        <p className="flex items-center gap-[6px] text-[12px] font-medium">
          {/*
           * The design only draws the upward triangle. A downward month is
           * undesigned, so the marker is dropped and the sign carries the meaning
           * rather than flipping an asset the designer never drew.
           */}
          {trend > 0 && <Icon src="/icons/trend-up.svg" className="size-[9px]" />}
          <span className={trend > 0 ? 'text-status-success-text' : 'text-text-secondary'}>
            {trend > 0 ? '+' : ''}
            {trend} vs {monthLabel(previousMonthKey(stats.month))}
          </span>
        </p>
      )}
    </StatCard>
  );
}

function AverageRatingCard({ rating }: { rating: number | null }) {
  return (
    <StatCard
      rule={rating === null ? 'bg-surface-elevated' : 'bg-status-warning'}
      overline="AVERAGE RATING"
    >
      {/*
       * The empty variant is an em dash, not a zero. A month where nothing was
       * rated and a month averaging 0.0 are different facts, and the backend keeps
       * them apart by returning null rather than 0 for exactly this reason.
       */}
      <Value value={rating === null ? '—' : rating.toFixed(1)} suffix="/ 5" />
      <Stars rating={rating} />
    </StatCard>
  );
}

/** Five stars, filled to the nearest whole. Grey throughout when unrated. */
function Stars({ rating }: { rating: number | null }) {
  const filled = rating === null ? 0 : Math.round(rating);

  return (
    <p className="flex gap-[3px]" aria-label={rating === null ? 'Not rated' : `${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((position) => (
        <Icon
          key={position}
          src={position <= filled ? '/icons/star-filled.svg' : '/icons/star-empty.svg'}
          className="size-[15px]"
        />
      ))}
    </p>
  );
}

function TopGenreCard({ topGenre }: { topGenre: MonthlyStats['topGenre'] }) {
  return (
    <StatCard
      // One colour per genre, from the genres row, so every screen that shows
      // this genre uses the same slot (FIL-36).
      rule={topGenre ? genreColorClass(topGenre.colorSlot) : 'bg-surface-elevated'}
      overline="TOP GENRE"
    >
      <p className="font-display text-[30px] leading-[1.1] font-bold tracking-[-0.45px]">
        {topGenre ? topGenre.name : '—'}
      </p>
      {topGenre ? (
        <p className="flex items-center gap-[7px] text-[12px] font-medium">
          {/* A tinted circle rather than the exported dot, whose fill is baked in
              and so cannot follow the genre's palette slot. */}
          <span
            className={`size-[8px] rounded-full ${genreColorClass(topGenre.colorSlot)}`}
            aria-hidden="true"
          />
          <span className="text-text-secondary">
            {topGenre.count} {topGenre.count === 1 ? 'title' : 'titles'} this month
          </span>
        </p>
      ) : (
        <p className="text-text-tertiary text-[12px] font-medium">No data yet</p>
      )}
    </StatCard>
  );
}
