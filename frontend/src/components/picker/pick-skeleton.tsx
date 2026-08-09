import { Icon } from '@/components/dashboard/icon';

/**
 * The generating state (PIC-5; FIL-70).
 *
 * Its own heading and caption, replacing "Tonight's picks for you" while the
 * request runs, then three skeletons in the exact shape of a pick card so the
 * page does not jump when the real ones arrive.
 *
 * Generation is the only asynchronous operation in the whole design and has no
 * designed cancel control (A27), so there is nothing to dismiss it with: it ends
 * when the action resolves.
 *
 * `aria-live="polite"` on the wrapper announces the start; completion is
 * announced by the sibling region in PickerBoard, because this element unmounts
 * and an unmounted live region says nothing.
 */
export function PickSkeletons() {
  return (
    <div className="flex w-full flex-col gap-[14px]" aria-busy="true" aria-live="polite">
      <div className="flex flex-col gap-[6px]">
        <h2 className="text-[18px] leading-[1.3] font-semibold tracking-[-0.18px]">
          Finding your next watch...
        </h2>
        <p className="text-text-secondary flex items-center gap-[8px] text-[13px] leading-[1.5]">
          <Icon src="/icons/sparkle-sm.svg" className="size-[11px]" />
          Analyzing your ratings, favorites, and tonight&rsquo;s mood...
        </p>
      </div>

      <div className="flex w-full flex-col gap-[20px]">
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className="bg-surface-card border-border-default flex w-full items-center gap-[20px] rounded-[16px] border py-[20px] pr-[24px] pl-[20px]"
            aria-hidden="true"
            data-testid="pick-skeleton"
          >
            <div className="bg-surface-muted h-[136px] w-[94px] shrink-0 animate-pulse rounded-[8px]" />
            <div className="flex min-w-0 flex-1 flex-col gap-[10px]">
              <div className="bg-surface-muted h-[20px] w-[220px] animate-pulse rounded-[6px]" />
              <div className="bg-surface-muted h-[14px] w-[160px] animate-pulse rounded-[6px]" />
              <div className="bg-surface-muted h-[14px] w-full animate-pulse rounded-[6px]" />
              <div className="bg-surface-muted mt-[6px] h-[42px] w-[170px] animate-pulse rounded-[12px]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
