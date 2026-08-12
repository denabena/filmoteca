import { FormSkeleton, PageBodySkeleton, PageHeaderSkeleton } from '@/components/ui/page-skeleton';

/**
 * Edit title, loading (FIL-84).
 *
 * Waits on two calls, the title and the genre list, so it is the slower of the two
 * forms and the one where an unreserved layout would be most obvious: every field
 * arrives prefilled, so without this the form appears empty first.
 */
export default function EditTitleLoading() {
  return (
    <main
      className="flex flex-1 flex-col"
      aria-busy="true"
      aria-label="Loading the edit title form"
    >
      <PageHeaderSkeleton withActions={false} />
      <PageBodySkeleton>
        <FormSkeleton />
      </PageBodySkeleton>
    </main>
  );
}
