import { PageBodySkeleton, PageHeaderSkeleton } from '@/components/ui/page-skeleton';
import { Skeleton, SkeletonCard, SkeletonText } from '@/components/ui/skeleton';

/**
 * The Library loading state (FIL-84), in the shape of frame 06.
 *
 * Ten rows, which is what the mock draws, not the real count: the row count is
 * unknown until the response lands, and reserving a plausible tableful keeps the
 * page from growing under the pointer while somebody is already reaching for a
 * row. The tab pair and the three controls are drawn too, because they are
 * client state and appear immediately.
 */
export default function LibraryLoading() {
  return (
    <main className="flex flex-1 flex-col" aria-busy="true" aria-label="Loading your library">
      <PageHeaderSkeleton />

      <PageBodySkeleton>
        {/* Tab pair on the left, the three controls on the right (LIB-2). */}
        <div className="flex flex-col items-stretch justify-between gap-[12px] lg:flex-row lg:items-center">
          <Skeleton className="h-[36px] w-[196px] rounded-[10px]" />
          <div className="flex flex-wrap items-center gap-[10px]">
            <Skeleton className="h-[36px] w-[200px] rounded-[10px]" />
            <Skeleton className="h-[36px] w-[120px] rounded-[10px]" />
            <Skeleton className="h-[36px] w-[132px] rounded-[10px]" />
          </div>
        </div>

        <SkeletonCard className="flex flex-col overflow-x-auto">
          {/* Header row: TITLE, GENRE, STATUS, RATING, FAV, and the kebab column. */}
          <div className="border-border-strong flex items-center gap-[16px] border-b px-[20px] py-[12px]">
            <SkeletonText className="h-[10px] w-[52px]" />
            <div className="flex-1" />
            <SkeletonText className="h-[10px] w-[48px]" />
            <SkeletonText className="h-[10px] w-[52px]" />
            <SkeletonText className="h-[10px] w-[48px]" />
            <SkeletonText className="h-[10px] w-[28px]" />
          </div>

          <div className="rise-list flex flex-col">
            {Array.from({ length: 10 }, (_, i) => (
              <div key={i} className="flex items-center gap-[16px] px-[20px] py-[12px]">
                {/* The genre-coloured tile and the two caption lines. */}
                <Skeleton className="h-[46px] w-[34px] rounded-[6px]" />
                <div className="flex flex-1 flex-col gap-[5px]">
                  <SkeletonText className="h-[13px] w-[180px]" />
                  <SkeletonText className="h-[10px] w-[104px]" />
                </div>
                <div className="flex w-[110px] items-center gap-[7px]">
                  <Skeleton className="size-[8px] rounded-full" />
                  <SkeletonText className="h-[11px] w-[64px]" />
                </div>
                <Skeleton className="h-[24px] w-[92px] rounded-full" />
                <Skeleton className="h-[12px] w-[78px] rounded-[4px]" />
                <Skeleton className="size-[18px] rounded-[4px]" />
                <Skeleton className="size-[18px] rounded-[4px]" />
              </div>
            ))}
          </div>
        </SkeletonCard>
      </PageBodySkeleton>
    </main>
  );
}
