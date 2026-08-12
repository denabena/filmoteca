import { SettingsCardsSkeleton } from '@/components/ui/settings-skeleton';

/**
 * The Settings route fallback (FIL-84).
 *
 * Short-lived by nature: the page is a Client Component, so it mounts almost
 * immediately and then does its own fetching, showing the same cards skeleton
 * while it waits. The two share `SettingsCardsSkeleton` precisely so the handover
 * between them is invisible.
 *
 * The header is drawn for real rather than as a skeleton, because "Account" and
 * "Settings" are static copy that needs no data and so should never shimmer.
 */
export default function SettingsLoading() {
  return (
    <div className="flex flex-col">
      <header className="flex flex-col gap-[3px] px-4 pt-6 pb-[18px] md:px-10 md:pt-7">
        <p className="text-text-secondary text-[13px] leading-none font-medium">Account</p>
        <h1 className="font-display text-text-primary text-[24px] leading-[1.16] font-bold tracking-[-0.24px]">
          Settings
        </h1>
      </header>

      <div className="px-10 pb-10">
        <SettingsCardsSkeleton />
      </div>
    </div>
  );
}
