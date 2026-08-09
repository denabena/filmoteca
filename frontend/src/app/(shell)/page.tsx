import Link from 'next/link';
import { ContinueWatchingHero } from '@/components/dashboard/continue-watching';
import { MonthSelect } from '@/components/dashboard/month-select';
import { PickerTeaser } from '@/components/dashboard/picker-teaser';
import { StatCards } from '@/components/dashboard/stat-cards';
import { UpNextRail } from '@/components/dashboard/up-next-rail';
import { WatchActivity } from '@/components/dashboard/watch-activity';
import { apiFetch } from '@/lib/api';
import { getCurrentUser } from '@/lib/current-user.server';
import type { DashboardSummary } from '@/lib/dashboard';
import { previousMonthKey } from '@/lib/dashboard';

/**
 * The dashboard (04 / 05). FIL-34 to FIL-40.
 *
 * An async Server Component with **one** backend call. The tech spec models this
 * as a single `getDashboardSummary(month)` and frame 04 renders every section at
 * once, so splitting it into a request per card would buy four round trips nobody
 * needs. Every section below is a pure function of that one response.
 *
 * Both empty and filled states come from the same components: the design draws 05
 * as the same layout with different contents, not as a different screen.
 */

// Reads the session cookie through apiFetch, so it can never be prerendered.
export const dynamic = 'force-dynamic';

/**
 * The months the dropdown offers.
 *
 * Undesigned: the header only ever shows "October" (A8). Twelve back from today is
 * a working decision, enough to look over a year without an unbounded list. See
 * MonthSelect for the alternative.
 */
function recentMonths(count = 12): string[] {
  const now = new Date();
  const months: string[] = [];
  let key = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;

  for (let i = 0; i < count; i += 1) {
    months.push(key);
    key = previousMonthKey(key);
  }

  return months;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;
  const months = recentMonths();
  // An unrecognised ?month= falls back to the current month rather than 400ing:
  // the backend would reject it, and a hand-edited URL should not break the page.
  const selected = month && months.includes(month) ? month : months[0];

  const summary = await apiFetch<DashboardSummary>(`/api/dashboard?month=${selected}`);

  return (
    <main className="flex flex-1 flex-col">
      <Header selected={selected} months={months} />

      <div className="flex flex-1 flex-col gap-[12px] px-[40px] pb-[14px]">
        <ContinueWatchingHero title={summary.continueWatching} />
        <StatCards stats={summary.stats} />
        <UpNextRail titles={summary.upNext} />

        <div className="flex w-full items-stretch gap-[20px]">
          <WatchActivity activity={summary.stats.activity} />
          <PickerTeaser picker={summary.picker} />
        </div>
      </div>
    </main>
  );
}

/**
 * The page header (SHL-2).
 *
 * Async, so the greeting is rendered on the server and correct on first paint.
 * It reads the session rather than the client ProfileProvider, because a Server
 * Component cannot use a hook and the provider exists for the sidebar's live
 * updates, not for this.
 */
async function Header({ selected, months }: { selected: string; months: string[] }) {
  const profile = await getCurrentUser();

  return (
    <div className="flex w-full items-center justify-between px-[40px] pt-[28px] pb-[18px]">
      <div className="flex flex-col gap-[3px]">
        <p className="text-text-secondary text-[13px] font-medium">
          Welcome back, {profile.firstName}
        </p>
        <h1 className="font-display text-[24px] leading-[1.16] font-bold tracking-[-0.24px]">
          Dashboard
        </h1>
      </div>
      <div className="flex items-center gap-[12px]">
        <MonthSelect months={months} selected={selected} />
        <Link
          href="/library"
          className="bg-accent text-text-on-accent rounded-[12px] px-[20px] py-[13px] text-[14px] font-semibold"
        >
          Add title
        </Link>
      </div>
    </div>
  );
}
