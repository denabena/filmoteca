'use client';

import { useState } from 'react';
import { GoalStepper, GOAL_DEFAULT } from '@/components/goal-stepper';
import { OnboardingShell } from '@/components/onboarding/onboarding-shell';

/**
 * Setup step 1 of 2: the monthly watch goal (Figma frame 02 · GOL-1, GOL-2,
 * GOL-4). This ticket (FIL-24) builds the step and the stepper with its bounds;
 * wiring Back/Continue and persisting the value to `PATCH /api/profile` is FIL-25,
 * so those buttons render but do nothing yet.
 */
export default function GoalStepPage() {
  const [goal, setGoal] = useState(GOAL_DEFAULT);

  return (
    <OnboardingShell step={1}>
      <div className="relative flex w-[540px] max-w-full flex-col items-center gap-3.5 rounded-[20px] border border-border-default bg-surface-card px-12 pt-10 pb-9 text-center">
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

        {/* TODO(FIL-25): wire Back/Continue navigation and persist the goal via
            PATCH /api/profile. Rendered here for the designed layout only. */}
        <div className="flex w-full gap-3">
          <button
            type="button"
            className="rounded-xl border border-border-strong bg-surface-card-raised px-5 py-[13px] text-[14px] font-semibold text-text-primary outline-offset-2 focus-visible:outline-2 focus-visible:outline-accent"
          >
            Back
          </button>
          <button
            type="button"
            className="flex-1 rounded-xl bg-accent px-5 py-[13px] text-[14px] font-semibold text-text-on-accent outline-offset-2 focus-visible:outline-2 focus-visible:outline-accent"
          >
            Continue
          </button>
        </div>
      </div>
    </OnboardingShell>
  );
}
