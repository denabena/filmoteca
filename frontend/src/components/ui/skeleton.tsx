/**
 * The shapes every loading state is built from (FIL-84).
 *
 * One primitive, so a skeleton cannot drift from the thing it stands in for: the
 * shimmer, the radius and the tone live here, and a route's `loading.tsx` only
 * describes the layout.
 *
 * Skeletons rather than a spinner because these screens are **layouts, not single
 * values**. A spinner tells the user to wait; a skeleton tells them what is
 * coming and reserves the space it will need, so the page does not jump when the
 * data lands. That matters most on the Library table and the dashboard, where the
 * real content is tall.
 *
 * Nothing here is announced individually. Each `loading.tsx` marks its own region
 * `aria-busy`, which is one announcement for the screen rather than forty for its
 * boxes.
 */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton rounded-[6px] ${className}`} aria-hidden="true" />;
}

/** A line of text. Slightly rounded and short by default, like a real line. */
export function SkeletonText({ className = 'h-[13px] w-[120px]' }: { className?: string }) {
  return <Skeleton className={`rounded-[4px] ${className}`} />;
}

/**
 * A poster, at the aspect ratio the real ones use.
 *
 * The dimensions are passed in rather than fixed here, because the same poster is
 * drawn at three sizes (hero, rail card, table tile) and a skeleton that reserves
 * the wrong box is worse than none: the layout settles twice.
 */
export function SkeletonPoster({ className }: { className: string }) {
  return <Skeleton className={className} />;
}

/**
 * The card chrome the app repeats: elevated surface, strong border, 16px radius.
 *
 * Matching the real card means the border and background do not fade in
 * separately from the content inside them, which is the tell that makes a
 * skeleton look like a different screen rather than the same one loading.
 */
export function SkeletonCard({
  className = '',
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={`bg-surface-elevated border-border-strong rounded-[16px] border ${className}`}
      aria-hidden="true"
    >
      {children}
    </div>
  );
}
