'use client';

import type { KeyboardEvent } from 'react';

/**
 * Monthly watch goal bounds (A4, a working decision): whole numbers 1-99, step 1,
 * default 15. Shared by onboarding (FIL-24) and Settings, which use the same
 * stepper.
 */
export const GOAL_MIN = 1;
export const GOAL_MAX = 99;
export const GOAL_DEFAULT = 15;

interface GoalStepperProps {
  value: number;
  onChange: (value: number) => void;
}

function MinusIcon() {
  return (
    <svg width="16" height="3" viewBox="0 0 16 3" fill="currentColor" aria-hidden="true">
      <rect width="16" height="2.4" y="0.3" rx="1.2" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <rect y="6.8" width="16" height="2.4" rx="1.2" />
      <rect x="6.8" width="2.4" height="16" rx="1.2" />
    </svg>
  );
}

/**
 * The monthly-goal stepper from frame 02: a large readout between round minus and
 * plus buttons. Controlled. Clamps to [GOAL_MIN, GOAL_MAX] and disables the
 * button at each end. The readout is a `spinbutton`, so arrow keys change it and
 * screen readers announce the current value.
 */
export function GoalStepper({ value, onChange }: GoalStepperProps) {
  const atMin = value <= GOAL_MIN;
  const atMax = value >= GOAL_MAX;

  const set = (next: number) => onChange(Math.min(GOAL_MAX, Math.max(GOAL_MIN, next)));

  function handleKeyDown(event: KeyboardEvent<HTMLSpanElement>) {
    switch (event.key) {
      case 'ArrowUp':
      case 'ArrowRight':
        event.preventDefault();
        set(value + 1);
        break;
      case 'ArrowDown':
      case 'ArrowLeft':
        event.preventDefault();
        set(value - 1);
        break;
      case 'Home':
        event.preventDefault();
        set(GOAL_MIN);
        break;
      case 'End':
        event.preventDefault();
        set(GOAL_MAX);
        break;
      default:
        break;
    }
  }

  const roundButton =
    'flex size-12 shrink-0 items-center justify-center rounded-full border border-border-strong bg-surface-card-raised text-text-primary outline-offset-2 hover:border-text-tertiary focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-40';

  return (
    <div role="group" aria-label="Monthly watch goal" className="flex items-center gap-7">
      <button
        type="button"
        aria-label="Decrease goal"
        disabled={atMin}
        onClick={() => set(value - 1)}
        className={roundButton}
      >
        <MinusIcon />
      </button>

      <div className="flex flex-col items-center">
        <span
          role="spinbutton"
          tabIndex={0}
          aria-label="Monthly watch goal"
          aria-valuemin={GOAL_MIN}
          aria-valuemax={GOAL_MAX}
          aria-valuenow={value}
          aria-valuetext={`${value} titles per month`}
          onKeyDown={handleKeyDown}
          className="rounded font-display text-[42px] leading-[1.04] font-bold tracking-[-0.84px] text-text-primary outline-offset-4 focus-visible:outline-2 focus-visible:outline-accent"
        >
          {value}
        </span>
        <span className="text-[13px] leading-none font-medium text-text-tertiary">
          titles / month
        </span>
      </div>

      <button
        type="button"
        aria-label="Increase goal"
        disabled={atMax}
        onClick={() => set(value + 1)}
        className={roundButton}
      >
        <PlusIcon />
      </button>
    </div>
  );
}
