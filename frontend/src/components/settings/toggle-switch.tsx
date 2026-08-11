'use client';

/*
 * An accessible on/off switch (the "New release reminders" toggle on Settings,
 * frame 17). A real button with role="switch", so Space/Enter flip it from the
 * keyboard and screen readers announce the on/off state via aria-checked.
 */
interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}

export function ToggleSwitch({ checked, onChange, label }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-[26px] w-11 shrink-0 items-center rounded-full outline-offset-2 transition-colors focus-visible:outline-2 focus-visible:outline-accent ${
        checked ? 'bg-accent' : 'bg-surface-elevated'
      }`}
    >
      <span
        className={`inline-block size-5 rounded-full bg-white transition-transform ${
          checked ? 'translate-x-[21px]' : 'translate-x-[3px]'
        }`}
      />
    </button>
  );
}
