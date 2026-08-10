'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { GenreChips } from '@/components/onboarding/genre-chips';
import { OnboardingShell } from '@/components/onboarding/onboarding-shell';

/**
 * Setup step 2 of 2: favorite genres (Figma frame 03 · GNR-1 to GNR-5) at
 * `/onboarding/genres`. Twelve multi-select chips, nothing preselected, and
 * "Finish setup" always enabled (A6). Finish saves the selection via the
 * `/api/profile` proxy and opens the Dashboard; Back returns to the goal step.
 *
 * Preserving the goal across Back is FIL-25 (it makes the goal step read the
 * persisted value); this step only navigates there.
 */
export default function GenresStepPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleFinish() {
    setError(null);
    setSaving(true);

    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ favoriteGenres: selected }),
      });

      if (!response.ok) {
        setError('Could not save your genres. Please try again.');
        setSaving(false);
        return;
      }

      router.push('/');
      router.refresh();
    } catch {
      setError('Something went wrong. Please try again.');
      setSaving(false);
    }
  }

  return (
    <OnboardingShell step={2}>
      <div className="relative flex w-[620px] max-w-full flex-col items-center gap-3.5 rounded-[20px] border border-border-default bg-surface-card px-12 pt-10 pb-9 text-center">
        <p className="text-[11px] leading-none font-medium tracking-[0.88px] text-accent">
          STEP 2 OF 2
        </p>
        <h1 className="font-display text-[20px] leading-[1.22] font-bold tracking-[-0.1px] text-text-primary">
          Pick a few favorite genres
        </h1>
        <p className="text-[14px] leading-[1.5] text-text-secondary">
          We&apos;ll use these to personalize your dashboard and Scene Picker suggestions.
        </p>

        <div className="w-full py-2">
          <GenreChips value={selected} onChange={setSelected} />
        </div>

        {error && (
          <p role="alert" className="text-[13px] leading-[1.5] text-accent">
            {error}
          </p>
        )}

        <div className="flex w-full gap-3">
          <button
            type="button"
            onClick={() => router.push('/onboarding/goal')}
            className="rounded-xl border border-border-strong bg-surface-card-raised px-5 py-[13px] text-[14px] font-semibold text-text-primary outline-offset-2 focus-visible:outline-2 focus-visible:outline-accent"
          >
            Back
          </button>
          <button
            type="button"
            onClick={handleFinish}
            disabled={saving}
            className="flex-1 rounded-xl bg-accent px-5 py-[13px] text-[14px] font-semibold text-text-on-accent outline-offset-2 focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Finish setup'}
          </button>
        </div>
      </div>
    </OnboardingShell>
  );
}
