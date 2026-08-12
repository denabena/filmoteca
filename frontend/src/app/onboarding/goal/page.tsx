'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { GoalStepper, GOAL_DEFAULT } from '@/components/goal-stepper';
import { OnboardingShell } from '@/components/onboarding/onboarding-shell';

/**
 * Setup step 1 of 2: the monthly watch goal (Figma frame 02 · GOL-1, GOL-2,
 * GOL-4). FIL-24 built the step and the stepper; this ticket (FIL-25) wires the
 * flow: Continue saves the goal via `PATCH /api/profile` and opens the genres
 * step, Back returns to Welcome, and the entered value survives a Back/forward
 * round trip because the step reads the persisted goal from `GET /api/profile`
 * on mount.
 */
export default function GoalStepPage() {
  const router = useRouter();
  const [goal, setGoal] = useState(GOAL_DEFAULT);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Prefill the stepper with the persisted goal so a value entered earlier is
  // still shown after Back/forward (GOL requirement in FIL-25). A missing or
  // failed profile read just leaves the default in place; onboarding must not
  // block on it.
  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const response = await fetch('/api/profile');
        if (!active || !response.ok) return;

        const profile = await response.json();
        if (active && typeof profile?.monthlyWatchGoal === 'number') {
          setGoal(profile.monthlyWatchGoal);
        }
      } catch {
        // Keep the default; the value is re-saved on Continue anyway.
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  function persistGoal() {
    return fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ monthlyWatchGoal: goal }),
    });
  }

  async function handleContinue() {
    setError(null);
    setSaving(true);

    try {
      const response = await persistGoal();

      if (!response.ok) {
        setError('Could not save your goal. Please try again.');
        setSaving(false);
        return;
      }

      router.push('/onboarding/genres');
    } catch {
      setError('Something went wrong. Please try again.');
      setSaving(false);
    }
  }

  function handleBack() {
    // Persist the current value before leaving so a goal changed here survives
    // the Welcome round trip and is re-read on return (value-preservation AC).
    // Back must always work, so this is fire-and-forget: a failed write just
    // leaves the last persisted value, and navigation is never blocked on it.
    void persistGoal().catch(() => {});
    router.push('/welcome');
  }

  return (
    <OnboardingShell step={1}>
      <div className="relative flex w-[540px] max-w-full flex-col items-center gap-3.5 rounded-[20px] border border-border-default bg-surface-card px-5 pt-10 pb-9 text-center sm:px-12">
        <p className="text-[11px] leading-none font-medium tracking-[0.88px] text-accent">
          STEP 1 OF 2
        </p>
        <h1 className="font-display text-[20px] leading-[1.22] font-bold tracking-[-0.1px] text-text-primary">
          Set your monthly watch goal
        </h1>
        <p className="text-[14px] leading-[1.5] text-text-secondary">
          How many movies or shows do you want to watch each month? You can change this anytime.
        </p>

        <div className="py-2.5">
          <GoalStepper value={goal} onChange={setGoal} />
        </div>

        {error && (
          <p role="alert" className="text-[13px] leading-[1.5] text-accent">
            {error}
          </p>
        )}

        <div className="flex w-full gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="rounded-xl border border-border-strong bg-surface-card-raised px-5 py-[13px] text-[14px] font-semibold text-text-primary outline-offset-2 focus-visible:outline-2 focus-visible:outline-accent"
          >
            Back
          </button>
          <button
            type="button"
            onClick={handleContinue}
            disabled={saving}
            className="flex-1 rounded-xl bg-accent px-5 py-[13px] text-[14px] font-semibold text-text-on-accent outline-offset-2 focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Continue'}
          </button>
        </div>
      </div>
    </OnboardingShell>
  );
}
