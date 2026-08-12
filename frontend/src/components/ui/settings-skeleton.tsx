import { Skeleton, SkeletonCard, SkeletonText } from './skeleton';

/**
 * The Settings cards, loading (FIL-84).
 *
 * Shared by the route's `loading.tsx` and by the page itself, and the page is the
 * one that matters. Settings is a Client Component that renders immediately and
 * fetches `GET /api/profile` in an effect, so the route-level fallback is gone
 * almost at once and the form used to sit there with empty fields until the values
 * snapped in. Nothing was broken; it just looked like an account with no name.
 *
 * Rendering this instead means the real cards **mount** when the data lands, which
 * is also what lets the `rise-list` stagger run: a CSS animation fires on mount,
 * so filling values into an already-mounted form could never have animated.
 *
 * Geometry matches the real cards (`rounded-2xl`, `px-7 pt-6 pb-[26px]`, 20px
 * gaps) so the page does not resettle underneath the pointer.
 */
export function SettingsCardsSkeleton() {
  return (
    <div
      className="flex w-full max-w-[820px] flex-col gap-5"
      aria-busy="true"
      aria-label="Loading your settings"
    >
      {/* Profile: photo, then first name / last name / email. */}
      <SkeletonCard className="flex flex-col gap-[18px] rounded-2xl px-7 pt-6 pb-[26px]">
        <Skeleton className="h-[18px] w-[84px]" />

        <div className="flex items-center gap-4">
          <Skeleton className="size-16 rounded-full" />
          <div className="flex flex-col gap-[8px]">
            <Skeleton className="h-[34px] w-[132px] rounded-xl" />
            <SkeletonText className="h-[11px] w-[188px]" />
          </div>
        </div>

        <div className="flex flex-col gap-[14px]">
          {['w-[300px]', 'w-[300px]', 'w-[420px]'].map((width, i) => (
            <div key={i} className="flex flex-col gap-[6px]">
              <SkeletonText className="h-[11px] w-[76px]" />
              <Skeleton className={`h-[46px] rounded-xl ${width}`} />
            </div>
          ))}
        </div>
      </SkeletonCard>

      {/* Watch preferences: monthly goal, default type, reminders toggle. */}
      <SkeletonCard className="flex flex-col gap-[18px] rounded-2xl px-7 pt-6 pb-[26px]">
        <Skeleton className="h-[18px] w-[148px]" />

        <div className="flex flex-col gap-[6px]">
          <SkeletonText className="h-[11px] w-[136px]" />
          <Skeleton className="h-[46px] w-[180px] rounded-xl" />
        </div>

        <div className="flex flex-col gap-[6px]">
          <SkeletonText className="h-[11px] w-[92px]" />
          <Skeleton className="h-[46px] w-[220px] rounded-xl" />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-[5px]">
            <SkeletonText className="h-[13px] w-[152px]" />
            <SkeletonText className="h-[11px] w-[240px]" />
          </div>
          <Skeleton className="h-[26px] w-[46px] rounded-full" />
        </div>
      </SkeletonCard>

      {/* Genres: the derived count line and its inert action. */}
      <SkeletonCard className="flex flex-col gap-[18px] rounded-2xl px-7 pt-6 pb-[26px]">
        <Skeleton className="h-[18px] w-[74px]" />
        <div className="flex items-center justify-between">
          <SkeletonText className="h-[13px] w-[320px]" />
          <Skeleton className="h-[34px] w-[124px] rounded-xl" />
        </div>
      </SkeletonCard>

      {/* The save row, so the button does not travel when the cards resolve. */}
      <div className="flex items-center justify-end">
        <Skeleton className="h-[46px] w-[148px] rounded-xl" />
      </div>
    </div>
  );
}
