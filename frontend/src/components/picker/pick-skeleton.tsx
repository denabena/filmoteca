/**
 * The generating state (PIC-4; FIL-70).
 *
 * Three skeletons in the exact shape of a pick card, so the page does not jump
 * when the real ones arrive. Generation is the only asynchronous operation in the
 * whole design, and it has no designed cancel control (A27), so there is nothing
 * to dismiss it with: it ends when the action resolves.
 */
export function PickSkeletons() {
  return (
    <div className="flex w-full flex-col gap-[20px]" aria-busy="true" aria-live="polite">
      <span className="sr-only">Generating your picks</span>
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className="bg-surface-card border-border-default flex w-full items-center gap-[20px] rounded-[16px] border py-[20px] pr-[24px] pl-[20px]"
          aria-hidden="true"
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
  );
}
