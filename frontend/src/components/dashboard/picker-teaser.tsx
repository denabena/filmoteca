import Link from 'next/link';
import type { PickerGateState } from '@/lib/dashboard';
import { Icon } from './icon';

/**
 * "Tonight's pick" (FIL-39), locked and unlocked.
 *
 * The unlock state comes from the same `PickerGateService` the Picker page reads,
 * carried in the dashboard's own response. That is the whole point of FIL-67: two
 * screens promise the Picker unlocks after "a few" titles, and they must never
 * disagree about whether it has.
 */
export function PickerTeaser({ picker }: { picker: PickerGateState }) {
  return (
    <section
      aria-labelledby="picker-teaser-heading"
      className="bg-surface-elevated border-border-strong relative flex w-[380px] shrink-0 flex-col gap-[14px] overflow-hidden rounded-[16px] border px-[24px] py-[18px]"
    >
      <p className="text-accent flex items-center gap-[8px] text-[11px] font-medium tracking-[0.88px]">
        <Icon src="/icons/sparkle.svg" className="size-[15px]" />
        {picker.unlocked ? "TONIGHT'S PICK" : 'PICKER LOCKED'}
      </p>

      <div className="flex w-full items-center gap-[14px]">
        <div
          className="bg-surface-muted h-[80px] w-[56px] shrink-0 rounded-[6px]"
          aria-hidden="true"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-[4px]">
          <h2
            id="picker-teaser-heading"
            className="text-[16px] leading-[1.3] font-semibold tracking-[-0.08px]"
          >
            {picker.unlocked ? 'Ready when you are' : 'No pick yet'}
          </h2>
          <p className="text-text-secondary text-[13px] leading-[1.5]">
            {picker.unlocked
              ? 'Open the Picker to generate tonight&rsquo;s three'
              : `${picker.ratedCount} of ${picker.threshold} rated`}
          </p>
        </div>
      </div>

      {/*
       * The design shows a real pick here with its title, meta and reason. That
       * needs the dashboard response to carry the current top pick, which it does
       * not: FIL-65 stores picks and the teaser reads `picker` only.
       *
       * Rather than invent a pick or fetch a second endpoint from a Server
       * Component that already has one round trip, the unlocked state invites the
       * user through to the Picker. Adding `topPick` to DashboardSummary is a
       * small backend change and the honest fix; raised on the ticket.
       */}
      <p className="text-text-secondary text-[13px] leading-[1.5]">
        {picker.unlocked
          ? 'Scene Picker suggests what to watch based on what you have rated.'
          : 'Scene Picker suggests what to watch once you have added and rated a few titles.'}
      </p>

      <Link
        href={picker.unlocked ? '/picker' : '/library'}
        className="text-accent flex items-center gap-[7px] text-[14px] font-semibold"
      >
        {picker.unlocked ? 'Open Picker' : 'Add a title'}
        <Icon src="/icons/arrow-right.svg" className="size-[10px]" />
      </Link>
    </section>
  );
}
