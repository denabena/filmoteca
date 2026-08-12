import { FormSkeleton, PageBodySkeleton, PageHeaderSkeleton } from '@/components/ui/page-skeleton';

/**
 * Add title, loading (FIL-84).
 *
 * The full-page variant, reached by a hard load or a pasted link. The in-app click
 * opens the intercepted modal instead, which has its own fallback beside it under
 * `@modal`.
 *
 * The form waits on `GET /api/genres` for its select, so there is a real gap to
 * cover here even though nothing else on the screen is fetched.
 */
export default function AddTitleLoading() {
  return (
    <main className="flex flex-1 flex-col" aria-busy="true" aria-label="Loading the add title form">
      <PageHeaderSkeleton withActions={false} />
      <PageBodySkeleton>
        <FormSkeleton />
      </PageBodySkeleton>
    </main>
  );
}
