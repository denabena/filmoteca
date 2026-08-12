import {
  PageBodySkeleton,
  PageHeaderSkeleton,
  SidebarSkeleton,
} from '@/components/ui/page-skeleton';
import { Skeleton, SkeletonCard } from '@/components/ui/skeleton';

/**
 * The whole-app loading state (FIL-84).
 *
 * **This one is at the root rather than inside `(shell)`, and it has to be.** The
 * shell's layout awaits `getCurrentUser()` before it renders anything, so a
 * `loading.tsx` inside that segment cannot show while the profile is being read:
 * a segment's fallback replaces its *page*, and the layout above it has already
 * blocked. Only a boundary above the layout covers that wait, which is the load
 * the user notices, because it is the one with nothing on screen yet.
 *
 * It therefore includes the sidebar, unlike every route-level loading state
 * below it, where the real sidebar is already mounted and stays put.
 */
export default function AppLoading() {
  return (
    <div aria-busy="true" aria-label="Loading Scene">
      <SidebarSkeleton />

      <div className="flex min-h-screen flex-1 flex-col pl-[260px]">
        <PageHeaderSkeleton />
        <PageBodySkeleton>
          <SkeletonCard className="h-[196px] w-full" />
          <div className="rise-list flex gap-[18px]">
            <SkeletonCard className="h-[104px] flex-1" />
            <SkeletonCard className="h-[104px] flex-1" />
            <SkeletonCard className="h-[104px] flex-1" />
          </div>
          <Skeleton className="h-[140px] w-full rounded-[16px]" />
        </PageBodySkeleton>
      </div>
    </div>
  );
}
