import type { ActivityStat } from '@/lib/dashboard';
import { Icon } from './icon';

/**
 * The "Watch activity" card (DSH-7, FIL-38).
 *
 * Four bars, always. Months span four to six calendar weeks and the chart draws
 * four, so the backend cuts them as days 1-7, 8-14, 15-21 and 22 to the end. That
 * makes the last bar one to three days longer, which is documented there and needs
 * a designer's answer.
 *
 * The badge is the sum of the bars, and equals the watched-count card by
 * construction. A29 records that the mock contradicts itself here, showing 14 on
 * the badge and 12 on the card for the same month.
 */
export function WatchActivity({ activity }: { activity: ActivityStat }) {
  // The tallest bar sets the scale, so a quiet month still reads as a chart rather
  // than four slivers. Guarded against an all-zero month, which would divide by 0.
  const peak = Math.max(...activity.buckets, 1);

  return (
    <section
      aria-labelledby="watch-activity-heading"
      className="bg-surface-card border-border-default flex min-w-0 flex-1 flex-col gap-[18px] rounded-[16px] border px-4 py-[20px] sm:px-[28px]"
    >
      <div className="flex w-full items-center justify-between">
        <h2
          id="watch-activity-heading"
          className="text-[16px] leading-[1.3] font-semibold tracking-[-0.08px]"
        >
          Watch activity
        </h2>
        {activity.total === 0 ? (
          <span className="bg-surface-elevated text-text-tertiary rounded-full py-[6px] pr-[12px] pl-[12px] text-[13px] font-semibold">
            No activity yet
          </span>
        ) : (
          <span className="bg-status-success-soft text-status-success-text flex items-center gap-[6px] rounded-full py-[6px] pr-[12px] pl-[10px] text-[13px] font-semibold">
            <Icon src="/icons/trend-up.svg" className="size-[9px]" />
            {activity.total} this month
          </span>
        )}
      </div>

      <ol className="flex min-h-[90px] w-full items-end justify-between">
        {activity.buckets.map((count, index) => {
          const isCurrent = activity.currentBucket === index;

          return (
            <li key={index} className="flex flex-col items-center justify-end gap-[8px]">
              <span
                className={
                  isCurrent
                    ? 'text-accent text-[13px] font-semibold'
                    : 'text-text-tertiary text-[12px] font-medium'
                }
              >
                {count}
              </span>
              <span
                // A zero bar keeps a 3px stub so the baseline stays readable as a
                // row of four rather than collapsing to nothing.
                style={{ height: `${count === 0 ? 3 : Math.round((count / peak) * 108)}px` }}
                className={`w-[52px] rounded-t-[8px] rounded-b-[3px] bg-gradient-to-b ${
                  isCurrent ? 'from-[#f0455e] to-[#d12e47]' : 'from-[#4d3038] to-[#332930]'
                }`}
                aria-hidden="true"
              />
              <span
                className={`text-[11.5px] leading-[1.4] ${
                  isCurrent ? 'text-accent' : 'text-text-tertiary'
                }`}
              >
                {isCurrent ? 'This week' : `W${index + 1}`}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
