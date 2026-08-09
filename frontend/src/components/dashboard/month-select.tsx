'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import { monthLabel } from '@/lib/dashboard';
import { Icon } from './icon';

/**
 * The month dropdown in the page header (FIL-40, A8).
 *
 * A Client Component because it is the only interactive thing on the dashboard.
 * Changing it writes `?month=` and lets the Server Component refetch, so the month
 * lives in the URL: the view is shareable, survives a reload, and the back button
 * works. Holding it in React state would lose all three.
 *
 * **The design only ever draws "October", so the list of months is undesigned.**
 * Twelve months back from today is a working decision: enough to look back over a
 * year without an unbounded list that grows forever on an old account. The
 * alternative, deriving the range from the user's earliest watch date, needs a
 * query nothing else wants yet.
 */
export function MonthSelect({ months, selected }: { months: string[]; selected: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function choose(month: string) {
    const next = new URLSearchParams(params);
    next.set('month', month);

    startTransition(() => {
      router.push(`/?${next.toString()}`, { scroll: false });
    });
  }

  return (
    <label className="relative">
      <span className="sr-only">Month</span>
      <select
        value={selected}
        onChange={(event) => choose(event.target.value)}
        disabled={isPending}
        className="bg-surface-card border-border-strong text-text-primary appearance-none rounded-[10px] border py-[10px] pr-[34px] pl-[14px] text-[14px] font-medium disabled:opacity-60"
      >
        {months.map((month) => (
          <option key={month} value={month} className="bg-surface-card">
            {monthLabel(month, { withYear: month.slice(0, 4) !== selected.slice(0, 4) })}
          </option>
        ))}
      </select>
      <Icon
        src="/icons/chevron-down.svg"
        className="pointer-events-none absolute top-1/2 right-[12px] h-[4.5px] w-[9px] -translate-y-1/2"
      />
    </label>
  );
}
