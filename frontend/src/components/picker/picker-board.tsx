'use client';

import { useState } from 'react';
import { MoodPrompt } from './mood-prompt';
import { PickCard } from './pick-card';
import { PickSkeletons } from './pick-skeleton';
import type { PickCard as PickCardData } from '@/lib/dashboard';

/**
 * The unlocked Picker: the mood prompt and whatever picks exist (FIL-68 to 72).
 *
 * A thin Client Component whose only job is knowing whether generation is running,
 * so the skeletons (FIL-70) can replace the cards. The picks themselves come from
 * the server: after `generatePicks` revalidates, this re-renders with the new
 * batch as props, so nothing about a pick is duplicated into client state.
 */
export function PickerBoard({ picks }: { picks: PickCardData[] }) {
  const [isGenerating, setIsGenerating] = useState(false);

  return (
    <>
      <MoodPrompt onGenerating={setIsGenerating} />

      {isGenerating ? (
        <>
          <SectionHeading />
          <PickSkeletons />
        </>
      ) : picks.length > 0 ? (
        <>
          <SectionHeading />
          <div className="flex w-full flex-col gap-[20px]">
            {picks.map((pick) => (
              <PickCard key={pick.id} pick={pick} />
            ))}
          </div>
        </>
      ) : (
        /*
         * Unlocked but never generated, or every pick dismissed. The design does
         * not draw this: frame 14 always has three cards and frame 16 is the
         * locked state. Prompting rather than showing an empty region, since the
         * button that fixes it is directly above.
         */
        <p className="text-text-tertiary py-[24px] text-[13px] leading-[1.5]">
          Choose a mood or two and press Surprise me. You can also press it with nothing selected.
        </p>
      )}
    </>
  );
}

function SectionHeading() {
  return (
    <h2 className="text-[18px] leading-[1.3] font-semibold tracking-[-0.18px]">
      Tonight&rsquo;s picks for you
    </h2>
  );
}
