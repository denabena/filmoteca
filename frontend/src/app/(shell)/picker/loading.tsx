import { PageBodySkeleton, PageHeaderSkeleton } from '@/components/ui/page-skeleton';
import { Skeleton, SkeletonCard, SkeletonText } from '@/components/ui/skeleton';

/**
 * The Picker loading state (FIL-84), covering the page's own arrival.
 *
 * Distinct from `PickSkeletons`, and both are needed: that one is the *generating*
 * state, shown when "Surprise me" is pressed on a page already in front of the
 * user, with its own heading and live region. This one is the page itself
 * loading, before the gate or any existing batch is known.
 *
 * The mood prompt is reserved with six chips, because that is fixed by the design
 * (PIC-2) and known before any request resolves.
 */
export default function PickerLoading() {
  return (
    <main className="flex flex-1 flex-col" aria-busy="true" aria-label="Loading the Scene Picker">
      <PageHeaderSkeleton withActions={false} />

      <PageBodySkeleton className="gap-[20px]">
        {/* The mood prompt (PIC-2). */}
        <SkeletonCard className="flex w-full flex-col gap-[16px] px-[32px] py-[28px]">
          <SkeletonText className="h-[11px] w-[104px]" />
          <Skeleton className="h-[24px] w-[320px]" />
          {/*
            Six chips at the widths the real labels take ("Something light" through
            "Critically loved"), spelt out as classes rather than computed: Tailwind
            never sees an interpolated class name, so `w-[${n}px]` compiles to
            nothing and every chip would collapse.
          */}
          <div className="rise-list flex flex-wrap gap-[10px]">
            {['w-[132px]', 'w-[116px]', 'w-[112px]', 'w-[104px]', 'w-[124px]', 'w-[140px]'].map(
              (width) => (
                <Skeleton key={width} className={`h-[36px] rounded-full ${width}`} />
              ),
            )}
          </div>
          <div className="flex items-center justify-between">
            <SkeletonText className="h-[12px] w-[280px]" />
            <Skeleton className="h-[40px] w-[136px] rounded-[10px]" />
          </div>
        </SkeletonCard>

        {/* Three pick cards (PIC-6). */}
        <div className="rise-list flex flex-col gap-[18px]">
          {Array.from({ length: 3 }, (_, i) => (
            <SkeletonCard key={i} className="flex flex-1 flex-col gap-[14px] p-[18px]">
              <Skeleton className="h-[240px] w-full rounded-[12px]" />
              <div className="flex items-center justify-between">
                <Skeleton className="h-[22px] w-[92px] rounded-full" />
                <SkeletonText className="h-[11px] w-[64px]" />
              </div>
              <Skeleton className="h-[18px] w-[172px]" />
              <SkeletonText className="h-[12px] w-full" />
              <SkeletonText className="h-[12px] w-[80%]" />
              <div className="mt-[4px] flex items-center gap-[10px]">
                <Skeleton className="h-[38px] flex-1 rounded-[10px]" />
                <Skeleton className="h-[38px] w-[104px] rounded-[10px]" />
              </div>
            </SkeletonCard>
          ))}
        </div>
      </PageBodySkeleton>
    </main>
  );
}
