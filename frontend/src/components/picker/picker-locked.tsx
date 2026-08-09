import Link from 'next/link';
import { Icon } from '@/components/dashboard/icon';
import type { PickerGateState } from '@/lib/dashboard';

/**
 * The locked Picker (PIC-9; FIL-68).
 *
 * A centred card and nothing else: the design hides the mood prompt entirely
 * rather than disabling it, so a locked user is never shown a control that will
 * refuse them.
 *
 * A27 leaves the threshold undecided, and the backend proposes three rated titles.
 * The count is surfaced here because "a few" tells a user nothing about how far
 * off they are, and the gate already returns the number.
 */
export function PickerLocked({ picker }: { picker: PickerGateState }) {
  return (
    <div className="flex flex-1 items-center justify-center">
      <section className="bg-surface-card border-border-default flex w-[440px] flex-col items-center gap-[10px] rounded-[18px] border px-[40px] py-[44px] text-center">
        <Icon src="/icons/sparkle-lg.svg" className="mb-[6px] size-[28px]" />
        <h2 className="text-[18px] leading-[1.3] font-semibold tracking-[-0.18px]">
          The Picker needs a few titles first
        </h2>
        <p className="text-text-secondary text-[13px] leading-[1.5]">
          Add and rate some movies or shows, and Scene Picker will learn your taste and suggest
          exactly what to watch next.
        </p>
        <p className="text-text-tertiary text-[12px] font-medium">
          {picker.ratedCount} of {picker.threshold} rated
        </p>
        {/*
         * Points at the Add title form (08), which is FIL-53's route and does not
         * exist yet. Library is the nearest real destination.
         */}
        <Link
          href="/titles/new"
          className="bg-accent text-text-on-accent mt-[10px] rounded-[12px] px-[20px] py-[13px] text-[14px] font-semibold"
        >
          Add your first title
        </Link>
      </section>
    </div>
  );
}
