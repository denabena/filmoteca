import { LibraryTabs } from '@/components/library/library-tabs';
import { TitlesTable } from '@/components/library/titles-table';
import { AddTitleButton } from '@/components/shell/add-title-button';
import { PageHeader } from '@/components/shell/page-header';
import { apiFetch } from '@/lib/api';
import type { TitleListItem } from '@/lib/library';

/**
 * The Library (06 / 12 / 13). LIB-1 and LIB-2 (FIL-44), plus the table (FIL-45).
 *
 * An async Server Component: the rows are fetched here and handed down, so no
 * loading state ships to the browser and the client boundary still stops at
 * `LibraryTabs`. The header sits **outside** it, which is what makes FIL-44's
 * AC7 structural rather than a promise: switching tabs cannot change a header
 * that is not inside the component doing the switching.
 *
 * The genre cards are still a placeholder; they are FIL-50.
 */
export default async function LibraryPage() {
  const titles = await apiFetch<TitleListItem[]>('/api/titles');

  return (
    <main className="flex flex-1 flex-col">
      <PageHeader overline="Your watchlist" title="Library" actions={<AddTitleButton />} />

      <div className="flex flex-1 flex-col gap-[18px] px-[40px] pb-[40px]">
        <LibraryTabs
          table={<TitlesTable titles={titles} />}
          genres={<PanelPlaceholder>The genre cards land in FIL-50.</PanelPlaceholder>}
        />
      </div>
    </main>
  );
}

function PanelPlaceholder({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-border-default text-text-secondary flex flex-1 items-center justify-center rounded-[18px] border border-dashed p-[40px] text-[14px]">
      {children}
    </div>
  );
}
