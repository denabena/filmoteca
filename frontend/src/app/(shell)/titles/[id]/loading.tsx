import { PageBodySkeleton, PageHeaderSkeleton } from '@/components/ui/page-skeleton';
import { Skeleton, SkeletonCard, SkeletonText } from '@/components/ui/skeleton';

/**
 * The Title detail loading state (FIL-84), in the shape of frame 07.
 *
 * **This is the one the user feels most.** Clicking a library row navigates to a
 * Server Component that fetches the title, so without a fallback the row stays
 * highlighted and nothing else happens until the response lands, which reads as a
 * dead click. The poster, the meta rows and the note are reserved at their real
 * sizes so the card does not resize under the pointer.
 */
export default function TitleDetailLoading() {
  return (
    <main className="flex flex-1 flex-col" aria-busy="true" aria-label="Loading title">
      <PageHeaderSkeleton />

      <PageBodySkeleton>
        {/* Breadcrumb back to the Library (DET-1). */}
        <SkeletonText className="h-[11px] w-[128px]" />

        <SkeletonCard className="flex gap-[28px] p-[28px]">
          <Skeleton className="h-[300px] w-[204px] shrink-0 rounded-[12px]" />

          <div className="flex flex-1 flex-col gap-[18px]">
            <div className="flex flex-col gap-[8px]">
              <Skeleton className="h-[30px] w-[280px]" />
              <SkeletonText className="h-[13px] w-[200px]" />
              <div className="mt-[4px] flex items-center gap-[10px]">
                <Skeleton className="h-[24px] w-[96px] rounded-full" />
                <Skeleton className="h-[12px] w-[84px] rounded-[4px]" />
              </div>
            </div>

            {/* Year, runtime, director, genre, watch date: the A17 rows. */}
            <div className="rise-list flex flex-col gap-[10px]">
              {Array.from({ length: 5 }, (_, i) => (
                <div key={i} className="flex items-center gap-[18px]">
                  <SkeletonText className="h-[11px] w-[76px]" />
                  <SkeletonText className="h-[11px] w-[128px]" />
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-[7px]">
              <SkeletonText className="h-[11px] w-[52px]" />
              <SkeletonText className="h-[12px] w-full" />
              <SkeletonText className="h-[12px] w-[72%]" />
            </div>
          </div>
        </SkeletonCard>
      </PageBodySkeleton>
    </main>
  );
}
