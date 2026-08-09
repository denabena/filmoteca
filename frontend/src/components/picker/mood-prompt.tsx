'use client';

import { useState, useTransition } from 'react';
import { Icon } from '@/components/dashboard/icon';
import { generatePicks } from '@/app/(shell)/picker/actions';
import { MOOD_OPTIONS, type Mood } from '@/lib/dashboard';

/**
 * The mood card and "Surprise me" (PIC-3, PIC-5; FIL-69, FIL-70).
 *
 * A Client Component because chip selection is local state that must survive
 * until the user presses the button. It calls a Server Action rather than the API
 * directly: the bearer token can only be minted server-side.
 *
 * **Multi-select, and zero selected is valid.** The backend treats no moods as no
 * constraint and still returns three picks from the library and ratings alone, so
 * the button is never disabled for having nothing chosen.
 */
export function MoodPrompt({ onGenerating }: { onGenerating?: (busy: boolean) => void }) {
  const [selected, setSelected] = useState<Mood[]>([]);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle(mood: Mood) {
    setSelected((current) =>
      current.includes(mood) ? current.filter((m) => m !== mood) : [...current, mood],
    );
  }

  function surpriseMe() {
    setError(null);
    onGenerating?.(true);

    startTransition(async () => {
      try {
        await generatePicks(selected);
      } catch {
        // A27: generation has no designed failure state. The backend keeps the
        // previous batch on failure, so saying so and leaving the cards alone is
        // the least surprising thing available.
        setError('Could not generate picks just now. Your previous picks are unchanged.');
      } finally {
        onGenerating?.(false);
      }
    });
  }

  return (
    <section
      aria-labelledby="mood-prompt-heading"
      className="bg-surface-elevated border-border-strong flex w-full flex-col gap-[16px] rounded-[18px] border px-[32px] py-[28px]"
    >
      <p className="text-accent flex items-center gap-[8px] text-[11px] font-medium tracking-[0.88px]">
        <Icon src="/icons/sparkle-lg.svg" className="size-[16px]" />
        SCENE PICKER
      </p>

      <h2
        id="mood-prompt-heading"
        className="font-display text-[20px] leading-[1.22] font-bold tracking-[-0.1px]"
      >
        What are you in the mood for tonight?
      </h2>

      {/*
       * A checkbox group rather than buttons: these are multi-select filters, and
       * a screen reader announcing "pressed" on six buttons says less than
       * "checked" on six checkboxes in a named group.
       */}
      <div role="group" aria-label="Moods" className="flex w-full flex-wrap items-start gap-[10px]">
        {MOOD_OPTIONS.map((mood) => {
          const isSelected = selected.includes(mood.value);

          return (
            <label
              key={mood.value}
              className={`cursor-pointer rounded-full px-[16px] py-[10px] ${
                isSelected
                  ? 'bg-accent-soft border-accent text-accent border-[1.5px] text-[13px] font-semibold'
                  : 'bg-surface-card-raised border-border-strong text-text-secondary border text-[14px] font-medium'
              }`}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={isSelected}
                onChange={() => toggle(mood.value)}
                disabled={isPending}
              />
              {mood.label}
            </label>
          );
        })}
      </div>

      <div className="flex w-full items-center justify-between pt-[4px]">
        <p className="text-text-tertiary text-[13px] leading-[1.5]">
          Personalized from your watchlist, ratings &amp; favorite genres.
        </p>
        <button
          type="button"
          onClick={surpriseMe}
          disabled={isPending}
          className="bg-accent text-text-on-accent rounded-[12px] px-[20px] py-[13px] text-[14px] font-semibold disabled:opacity-60"
        >
          {isPending ? 'Picking…' : 'Surprise me'}
        </button>
      </div>

      {error && (
        <p role="alert" className="text-status-warning-text text-[13px] leading-[1.5]">
          {error}
        </p>
      )}
    </section>
  );
}
