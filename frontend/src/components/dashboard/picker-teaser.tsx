import Link from 'next/link';
import type { PickerGateState, TopPick } from '@/lib/dashboard';
import { shortenReason } from '@/lib/dashboard';
import { Icon } from './icon';
import { Poster } from './poster';

/**
 * "Tonight's pick" (DSH-8, FIL-39), locked and unlocked.
 *
 * The unlock state comes from the same `PickerGateService` the Picker page reads,
 * carried in the dashboard's own response. That is the point of FIL-67: two
 * screens promise the Picker unlocks after "a few" titles and must never
 * disagree about whether it has.
 *
 * `topPick` is rank 0 of the newest batch, so it is the same card the Picker page
 * shows first (FIL-73). It is null when the Picker is locked, and also when it is
 * unlocked but nothing has been generated yet.
 *
 * **Those last two are different states and the label has to tell them apart.**
 * Reading the eyebrow off `topPick` alone said "PICKER LOCKED" above a body
 * offering "Generate your first picks" and a link to the Picker, which is the
 * card contradicting itself. It is also the state every user passes through: rate
 * a third title and the gate opens, but no batch exists until the Picker page is
 * opened, so the dashboard called the feature locked while the Picker page let
 * them in. That is precisely the disagreement FIL-67 exists to prevent.
 *
 * The middle label is a working decision. The design draws only locked and filled,
 * so "SCENE PICKER" is borrowed from the Picker page's own eyebrow rather than
 * invented, and "TONIGHT'S PICK" is not reused because there is no pick yet.
 */
function eyebrow(picker: PickerGateState, topPick: TopPick | null): string {
  if (topPick) return "TONIGHT'S PICK";

  return picker.unlocked ? 'SCENE PICKER' : 'PICKER LOCKED';
}

export function PickerTeaser({
  picker,
  topPick,
}: {
  picker: PickerGateState;
  topPick: TopPick | null;
}) {
  return (
    <section
      aria-labelledby="picker-teaser-heading"
      className="bg-surface-elevated border-border-strong relative flex w-[380px] shrink-0 flex-col gap-[14px] overflow-hidden rounded-[16px] border px-[24px] py-[18px]"
    >
      <p className="text-accent flex items-center gap-[8px] text-[11px] font-medium tracking-[0.88px]">
        <Icon src="/icons/sparkle.svg" className="size-[15px]" />
        {eyebrow(picker, topPick)}
      </p>

      {topPick ? <FilledTeaser pick={topPick} /> : <LockedTeaser picker={picker} />}
    </section>
  );
}

function FilledTeaser({ pick }: { pick: TopPick }) {
  const meta = [pick.year, pick.genre, pick.type === 'movie' ? 'Movie' : 'Series']
    .filter(Boolean)
    .join(' · ');

  return (
    <>
      <div className="flex w-full items-center gap-[14px]">
        <Poster
          posterPath={pick.posterPath}
          name={pick.name}
          size="w185"
          className="h-[80px] w-[56px] shrink-0 rounded-[6px]"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-[4px]">
          <h2
            id="picker-teaser-heading"
            className="truncate text-[16px] leading-[1.3] font-semibold tracking-[-0.08px]"
          >
            {pick.name}
          </h2>
          <p className="text-text-secondary text-[13px] leading-[1.5]">{meta}</p>
        </div>
      </div>

      {/* Shortened here, in full on the Picker page. See shortenReason for why
          the cut is a working decision rather than a designed one. */}
      <p className="text-text-secondary text-[13px] leading-[1.5]">{shortenReason(pick.reason)}</p>

      <Link
        href="/picker"
        className="text-accent flex items-center gap-[7px] text-[14px] font-semibold"
      >
        Open Picker
        <Icon src="/icons/arrow-right.svg" className="size-[10px]" />
      </Link>
    </>
  );
}

function LockedTeaser({ picker }: { picker: PickerGateState }) {
  return (
    <>
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
            No pick yet
          </h2>
          {/*
           * The design's caption is "Add titles to unlock". The count is appended
           * because "a few" tells nobody how far off they are and the gate already
           * returns it. A27 leaves the threshold undecided anyway.
           */}
          <p className="text-text-secondary text-[13px] leading-[1.5]">
            {picker.unlocked
              ? 'Generate your first picks'
              : `Add titles to unlock · ${picker.ratedCount} of ${picker.threshold} rated`}
          </p>
        </div>
      </div>

      <p className="text-text-secondary text-[13px] leading-[1.5]">
        Scene Picker suggests what to watch once you&rsquo;ve added and rated a few titles.
      </p>

      <Link
        href={picker.unlocked ? '/picker' : '/titles/new'}
        className="text-accent flex items-center gap-[7px] text-[14px] font-semibold"
      >
        {picker.unlocked ? 'Open Picker' : 'Add a title'}
        <Icon src="/icons/arrow-right.svg" className="size-[10px]" />
      </Link>
    </>
  );
}
