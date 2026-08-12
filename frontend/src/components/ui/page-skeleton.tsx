import { Skeleton, SkeletonCard, SkeletonText } from './skeleton';

/**
 * The header every routed view opens with, as a skeleton (FIL-84).
 *
 * The paddings are copied from `PageHeader` (`px-[40px] pt-[28px] pb-[18px]`) and
 * have to stay in step with it. If they drift, the title visibly jumps the moment
 * real data arrives, which is the one thing a skeleton exists to prevent.
 */
export function PageHeaderSkeleton({ withActions = true }: { withActions?: boolean }) {
  return (
    <header className="flex w-full flex-wrap items-center justify-between gap-[12px] px-4 pt-[22px] pb-[18px] md:px-[40px] md:pt-[28px]">
      <div className="flex flex-col gap-[3px]">
        <SkeletonText className="h-[13px] w-[96px]" />
        <Skeleton className="h-[28px] w-[220px] rounded-[6px]" />
      </div>
      {withActions ? (
        <div className="flex items-center gap-[12px]">
          <Skeleton className="h-[38px] w-[120px] rounded-[10px]" />
          <Skeleton className="h-[38px] w-[104px] rounded-[10px]" />
        </div>
      ) : null}
    </header>
  );
}

/** The body wrapper the views share, so a skeleton indents like the real page. */
export function PageBodySkeleton({
  children,
  className = 'gap-[18px]',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-1 flex-col px-4 pb-[40px] md:px-[40px] ${className}`}>
      {children}
    </div>
  );
}

/**
 * The sidebar, for the one case where it is not on screen yet: the very first
 * load, while the shell layout is still reading the session and profile.
 *
 * Every navigation after that keeps the real sidebar mounted, which is why this
 * lives only in the root `loading.tsx` and not in any route's.
 */
export function SidebarSkeleton() {
  return (
    <aside
      className="bg-surface-sidebar fixed inset-y-0 left-0 z-10 flex w-[260px] flex-col justify-between px-4 pt-[26px] pb-[22px]"
      aria-hidden="true"
    >
      <div className="flex flex-col gap-[26px]">
        {/* Wordmark */}
        <Skeleton className="mx-2 h-[24px] w-[104px]" />

        <div className="flex flex-col gap-[18px]">
          {['menu', 'assistant', 'account'].map((group) => (
            <div key={group} className="flex flex-col gap-[8px]">
              <SkeletonText className="mx-2 h-[9px] w-[64px]" />
              <div className="rise-list flex flex-col gap-[6px]">
                <Skeleton className="h-[36px] w-full rounded-[10px]" />
                <Skeleton className="h-[36px] w-full rounded-[10px]" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* The profile footer, which is what the first load is actually waiting on. */}
      <div className="flex items-center gap-[10px] px-2">
        <Skeleton className="size-[34px] rounded-full" />
        <div className="flex flex-col gap-[5px]">
          <SkeletonText className="h-[12px] w-[88px]" />
          <SkeletonText className="h-[10px] w-[124px]" />
        </div>
      </div>
    </aside>
  );
}

/**
 * A form, for Add title and Edit title.
 *
 * Both draw the same fields, so both loading states are this one component with a
 * different heading width. Six rows, matching the real form's field count, so the
 * footer buttons do not travel when it resolves.
 */
export function FormSkeleton() {
  return (
    <SkeletonCard className="flex w-full max-w-[520px] flex-col gap-[18px] p-[28px]">
      <Skeleton className="h-[24px] w-[160px]" />

      <div className="rise-list flex flex-col gap-[14px]">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex flex-col gap-[6px]">
            <SkeletonText className="h-[11px] w-[72px]" />
            <Skeleton className="h-[40px] w-full rounded-[10px]" />
          </div>
        ))}
      </div>

      <div className="flex items-center justify-end gap-[10px]">
        <Skeleton className="h-[38px] w-[88px] rounded-[10px]" />
        <Skeleton className="h-[38px] w-[120px] rounded-[10px]" />
      </div>
    </SkeletonCard>
  );
}
