'use client';

import { Icon } from './icon';
import { monthLabel } from '@/lib/dashboard';

/**
 * The month dropdown in the page header (FIL-40, A8).
 *
 * Controlled by `MonthScopedStats`, which owns the selection. The design only
 * ever draws "October" and never opens it, so the option list is undesigned; the
 * months come from the backend and are the ones the user has actually watched
 * something in, plus the current month. That beats offering twelve months of
 * guaranteed-empty cards.
 */
export function MonthSelect({
  months,
  selected,
  onChange,
  disabled,
}: {
  months: string[];
  selected: string;
  onChange: (month: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="relative">
      <span className="sr-only">Month</span>
      <select
        value={selected}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
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
