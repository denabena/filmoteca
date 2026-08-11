'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { fetchMonthlyStats } from '@/app/(shell)/actions';
import type { MonthlyStats } from '@/lib/dashboard';
import { MonthSelect } from './month-select';
import { StatCards } from './stat-cards';
import { WatchActivity } from './watch-activity';

/**
 * The dashboard body, and the owner of the selected month (FIL-40).
 *
 * Client state, seeded by the server render, is what makes a reload reset to the
 * current month. That rules out the URL, where `/?month=2026-08` survives a
 * refresh by definition. The trade is real: the view is not shareable and the
 * back button does not step through months. FIL-40's acceptance criterion chose
 * that, and reversing it is one line.
 *
 * It renders the header because the dropdown lives there while the cards it
 * scopes live below, and the two have to share one piece of state.
 *
 * `hero`, `rail` and `teaser` arrive as children from the Server Component. They
 * are not month-scoped, per A9 and A11, so changing the month must not re-render
 * or refetch them, and passing them through as slots guarantees it.
 */
export function DashboardView({
  firstName,
  initialStats,
  availableMonths,
  hero,
  rail,
  teaser,
}: {
  firstName: string;
  initialStats: MonthlyStats;
  availableMonths: string[];
  hero: React.ReactNode;
  rail: React.ReactNode;
  teaser: React.ReactNode;
}) {
  const [stats, setStats] = useState(initialStats);
  const [isPending, startTransition] = useTransition();

  function choose(month: string) {
    if (month === stats.month) return;

    startTransition(async () => {
      // A failed read leaves the previous month on screen rather than blanking
      // three cards. Nothing in the design covers this state.
      const next = await fetchMonthlyStats(month).catch(() => null);
      if (next) setStats(next);
    });
  }

  return (
    <main className="flex flex-1 flex-col">
      <div className="flex w-full items-center justify-between px-[40px] pt-[28px] pb-[18px]">
        <div className="flex flex-col gap-[3px]">
          <p className="text-text-secondary text-[13px] font-medium">Welcome back, {firstName}</p>
          <h1 className="font-display text-[24px] leading-[1.16] font-bold tracking-[-0.24px]">
            Dashboard
          </h1>
        </div>
        <div className="flex items-center gap-[12px]">
          <MonthSelect
            months={availableMonths}
            selected={stats.month}
            onChange={choose}
            disabled={isPending}
          />
          <Link
            href="/titles/new"
            className="bg-accent text-text-on-accent rounded-[12px] px-[20px] py-[13px] text-[14px] font-semibold"
          >
            Add title
          </Link>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-[12px] px-[40px] pb-[14px]">
        {hero}
        {rail}
        <div
          className={`flex flex-col gap-[12px] transition-opacity ${isPending ? 'opacity-60' : ''}`}
          aria-busy={isPending}
        >
          <StatCards stats={stats} />
          <div className="flex w-full items-stretch gap-[20px]">
            <WatchActivity activity={stats.activity} />
            {teaser}
          </div>
        </div>
      </div>
    </main>
  );
}
