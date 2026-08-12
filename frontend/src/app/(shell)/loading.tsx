import { PageBodySkeleton, PageHeaderSkeleton } from '@/components/ui/page-skeleton';
import { Skeleton, SkeletonCard, SkeletonText } from '@/components/ui/skeleton';

/**
 * The dashboard loading state (FIL-84), in the shape of frame 04.
 *
 * The sidebar is absent on purpose: this fallback replaces the page only, and the
 * real sidebar is already mounted and does not re-render on a navigation. Drawing
 * a second one here would flash a duplicate over it.
 *
 * The hero, the three stat cards, the activity chart, the rail and the teaser are
 * all reserved at their real heights, so the dashboard settles in place instead of
 * shuffling downward as each section arrives.
 */
export default function DashboardLoading() {
  return (
    <main className="flex flex-1 flex-col" aria-busy="true" aria-label="Loading your dashboard">
      <PageHeaderSkeleton />

      <PageBodySkeleton className="gap-[20px]">
        {/* Continue watching hero, then the picker teaser beside it (380px, per DSH-8). */}
        <div className="flex flex-col gap-[18px] xl:flex-row">
          <SkeletonCard className="flex h-[196px] flex-1 items-center gap-[18px] p-[24px]">
            <Skeleton className="h-[148px] w-[104px] rounded-[10px]" />
            <div className="flex flex-col gap-[10px]">
              <SkeletonText className="h-[11px] w-[120px]" />
              <Skeleton className="h-[24px] w-[240px]" />
              <SkeletonText className="h-[13px] w-[180px]" />
              <Skeleton className="mt-[6px] h-[36px] w-[132px] rounded-[10px]" />
            </div>
          </SkeletonCard>

          <SkeletonCard className="flex h-[196px] w-full shrink-0 flex-col gap-[14px] px-[24px] py-[18px] xl:w-[380px]">
            <SkeletonText className="h-[11px] w-[104px]" />
            <div className="flex items-center gap-[14px]">
              <Skeleton className="h-[80px] w-[56px] rounded-[6px]" />
              <div className="flex flex-col gap-[6px]">
                <Skeleton className="h-[16px] w-[150px]" />
                <SkeletonText className="h-[13px] w-[110px]" />
              </div>
            </div>
            <SkeletonText className="h-[13px] w-full" />
          </SkeletonCard>
        </div>

        {/* The three stat cards (DSH-3 to DSH-5), staggered as they arrive. */}
        <div className="rise-list flex flex-col gap-[18px] sm:flex-row">
          {Array.from({ length: 3 }, (_, i) => (
            <SkeletonCard key={i} className="flex flex-1 flex-col gap-[10px] px-[22px] py-[18px]">
              <SkeletonText className="h-[10px] w-[112px]" />
              <Skeleton className="h-[30px] w-[64px]" />
              <SkeletonText className="h-[11px] w-[96px]" />
            </SkeletonCard>
          ))}
        </div>

        {/* Watch activity (DSH-7): four bars, always. */}
        <SkeletonCard className="flex h-[180px] flex-col justify-between px-[22px] py-[18px]">
          <div className="flex items-center justify-between">
            <SkeletonText className="h-[13px] w-[120px]" />
            <Skeleton className="h-[22px] w-[104px] rounded-full" />
          </div>
          {/* Four uneven heights rather than four equal ones, so it reads as a
              chart mid-load instead of a placeholder grid. */}
          <div className="flex items-end gap-[18px]">
            {['h-[46px]', 'h-[78px]', 'h-[34px]', 'h-[62px]'].map((height) => (
              <div key={height} className="flex flex-1 flex-col items-center gap-[8px]">
                <Skeleton className={`w-full rounded-[8px] ${height}`} />
                <SkeletonText className="h-[9px] w-[28px]" />
              </div>
            ))}
          </div>
        </SkeletonCard>

        {/* Up next rail (DSH-6): seven cards, the rail's own limit. */}
        <div className="flex flex-col gap-[12px]">
          <SkeletonText className="h-[15px] w-[92px]" />
          <div className="rise-list flex gap-[14px]">
            {Array.from({ length: 7 }, (_, i) => (
              <div key={i} className="flex w-[124px] shrink-0 flex-col gap-[8px]">
                <Skeleton className="h-[176px] w-full rounded-[10px]" />
                <SkeletonText className="h-[12px] w-[100px]" />
                <SkeletonText className="h-[10px] w-[72px]" />
              </div>
            ))}
          </div>
        </div>
      </PageBodySkeleton>
    </main>
  );
}
