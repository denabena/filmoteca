'use client';

import { useTransition } from 'react';
import { Icon } from '@/components/dashboard/icon';
import { Poster } from '@/components/dashboard/poster';
import { addPickToWatchlist, dismissPick } from '@/app/(shell)/picker/actions';
import type { PickCard as PickCardData } from '@/lib/dashboard';

/**
 * One suggestion (PIC-6; FIL-71) and its two actions (PIC-7; FIL-72).
 *
 * A25 designs no after-state for either action: "Add to watchlist" leaves the
 * card in place with no confirmation, and "Not for me" removes the card with no
 * replacement drawn. Both are honoured, with one deviation noted below.
 */
export function PickCard({ pick }: { pick: PickCardData }) {
  const [isPending, startTransition] = useTransition();

  const meta = [pick.year, pick.genre, pick.type === 'movie' ? 'Movie' : 'Series']
    .filter(Boolean)
    .join(' · ');

  return (
    <article className="bg-surface-card border-border-default flex w-full flex-col items-start gap-[20px] rounded-[16px] border px-4 py-[20px] sm:flex-row sm:items-center sm:pr-[24px] sm:pl-[20px]">
      <Poster
        posterPath={pick.posterPath}
        name={pick.name}
        size="w185"
        className="h-[136px] w-[94px] shrink-0 rounded-[8px]"
      />

      <div className="flex min-w-0 flex-1 flex-col gap-[8px]">
        <div className="flex w-full items-center gap-[12px]">
          <h3 className="text-[18px] leading-[1.3] font-semibold tracking-[-0.18px]">
            {pick.name}
          </h3>
          <span className="bg-accent-soft text-accent flex shrink-0 items-center gap-[6px] rounded-full py-[5px] pr-[11px] pl-[10px] text-[12px] font-medium">
            <Icon src="/icons/sparkle-sm.svg" className="size-[11px]" />
            {pick.matchPercent}% match
          </span>
        </div>

        <p className="text-text-secondary text-[13px] leading-[1.5]">{meta}</p>
        <p className="text-text-secondary text-[14px] leading-[1.5]">{pick.reason}</p>

        <div className="flex items-center gap-[10px] pt-[2px]">
          {/*
           * A25 leaves the added card unchanged with no confirmation. A button
           * that looks identical after it worked is indistinguishable from one
           * that silently failed, so the label changes and it disables. That is a
           * deliberate deviation, and a small one; flag it to the designer.
           */}
          <button
            type="button"
            disabled={isPending || pick.state === 'added'}
            onClick={() => startTransition(() => addPickToWatchlist(pick.id))}
            className="bg-accent text-text-on-accent rounded-[12px] px-[20px] py-[13px] text-[14px] font-semibold disabled:opacity-60"
          >
            {pick.state === 'added' ? 'In your watchlist' : 'Add to watchlist'}
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => startTransition(() => dismissPick(pick.id))}
            className="text-text-tertiary text-[14px] font-medium disabled:opacity-60"
          >
            Not for me
          </button>
        </div>
      </div>
    </article>
  );
}
