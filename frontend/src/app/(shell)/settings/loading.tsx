import { PageBodySkeleton, PageHeaderSkeleton } from '@/components/ui/page-skeleton';
import { Skeleton, SkeletonCard, SkeletonText } from '@/components/ui/skeleton';

/**
 * The Settings loading state (FIL-84).
 *
 * Settings is the screen where a skeleton earns the most: every field is
 * prefilled from `GET /api/profile`, so an empty form would render first and then
 * fill in, which looks briefly like the account has no name or email. Reserving
 * the rows means the values fade in where they will sit.
 */
export default function SettingsLoading() {
  return (
    <main className="flex flex-1 flex-col" aria-busy="true" aria-label="Loading your settings">
      <PageHeaderSkeleton withActions={false} />

      <PageBodySkeleton className="gap-[18px]">
        {/* Profile: photo, name, email. */}
        <SkeletonCard className="flex flex-col gap-[18px] p-[24px]">
          <Skeleton className="h-[18px] w-[120px]" />
          <div className="flex items-center gap-[16px]">
            <Skeleton className="size-[64px] rounded-full" />
            <div className="flex flex-col gap-[8px]">
              <Skeleton className="h-[34px] w-[132px] rounded-[10px]" />
              <SkeletonText className="h-[11px] w-[180px]" />
            </div>
          </div>
          <div className="rise-list flex flex-col gap-[14px]">
            {[0, 1].map((i) => (
              <div key={i} className="flex flex-col gap-[6px]">
                <SkeletonText className="h-[11px] w-[64px]" />
                <Skeleton className="h-[40px] w-full max-w-[420px] rounded-[10px]" />
              </div>
            ))}
          </div>
        </SkeletonCard>

        {/* Preferences: goal stepper, default type, favourite genres, reminders. */}
        <SkeletonCard className="flex flex-col gap-[18px] p-[24px]">
          <Skeleton className="h-[18px] w-[148px]" />

          <div className="flex flex-col gap-[6px]">
            <SkeletonText className="h-[11px] w-[136px]" />
            <Skeleton className="h-[40px] w-[180px] rounded-[10px]" />
          </div>

          <div className="flex flex-col gap-[8px]">
            <SkeletonText className="h-[11px] w-[104px]" />
            <div className="rise-list flex flex-wrap gap-[8px]">
              {Array.from({ length: 12 }, (_, i) => (
                <Skeleton key={i} className="h-[32px] w-[104px] rounded-full" />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <SkeletonText className="h-[13px] w-[220px]" />
            <Skeleton className="h-[24px] w-[44px] rounded-full" />
          </div>
        </SkeletonCard>

        <Skeleton className="h-[40px] w-[148px] rounded-[10px]" />
      </PageBodySkeleton>
    </main>
  );
}
