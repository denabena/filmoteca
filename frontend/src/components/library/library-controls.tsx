'use client';

import { Icon } from '@/components/dashboard/icon';
import { STATUS_TONE, type LibraryFilters, type TitleStatus } from '@/lib/library';

/**
 * The three controls to the right of the tabs (LIB-3 · FIL-49).
 *
 * **A14 makes almost everything here a working decision.** The frames only ever
 * draw these three closed, so the status list's contents, what sort offers beyond
 * "Recent", and filtering as you type are all proposals rather than readings.
 * This is the most design-dependent component in the epic and wants a designer's
 * eye before it is treated as settled.
 *
 * Native `<select>` rather than a custom listbox, matching the month dropdown the
 * dashboard already ships. A custom one would need its own keyboard handling,
 * focus trap and mobile behaviour to equal what the platform gives free, and the
 * design draws no open state to justify the cost.
 */
export function LibraryControls({
  filters,
  onChange,
}: {
  filters: LibraryFilters;
  onChange: (next: LibraryFilters) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-[10px]">
      <label className="relative">
        <span className="sr-only">Search titles</span>
        <Icon
          src="/icons/play.svg"
          className="pointer-events-none absolute top-1/2 left-[14px] h-[10px] w-[8px] -translate-y-1/2 opacity-40"
        />
        <input
          type="search"
          value={filters.search}
          // Filter-as-you-type, no Enter. A14: not designed, and the alternative
          // is a list that only updates on submit, which no other control here
          // does.
          onChange={(event) => onChange({ ...filters, search: event.target.value })}
          placeholder="Search titles"
          className="bg-surface-card border-border-strong text-text-primary placeholder:text-text-tertiary w-[200px] rounded-[10px] border py-[10px] pr-[14px] pl-[32px] text-[14px] outline-offset-2 focus-visible:outline-2 focus-visible:outline-accent"
        />
      </label>

      <Select
        label="Status"
        value={filters.status}
        onChange={(value) => onChange({ ...filters, status: value as TitleStatus | '' })}
        options={[
          // The way back to everything. Without it a status filter is a one-way
          // door and the only escape is a reload.
          { value: '', label: 'Status' },
          { value: 'watched', label: STATUS_TONE.watched.label },
          { value: 'watching', label: STATUS_TONE.watching.label },
          { value: 'want_to_watch', label: STATUS_TONE.want_to_watch.label },
        ]}
      />

      <Select
        label="Sort"
        value={filters.sort}
        onChange={(value) => onChange({ ...filters, sort: value as LibraryFilters['sort'] })}
        options={[
          { value: 'recent', label: 'Sort: Recent' },
          { value: 'oldest', label: 'Sort: Oldest' },
        ]}
      />
    </div>
  );
}

/**
 * A dropdown styled like the design's closed control.
 *
 * The selected option *is* the label, which is how the criterion "the dropdown
 * label reflects the choice" is met structurally rather than by keeping a second
 * copy of the text in sync.
 */
function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="relative">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="bg-surface-card border-border-strong text-text-primary appearance-none rounded-[10px] border py-[10px] pr-[34px] pl-[14px] text-[14px] font-medium outline-offset-2 focus-visible:outline-2 focus-visible:outline-accent"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} className="bg-surface-card">
            {option.label}
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
