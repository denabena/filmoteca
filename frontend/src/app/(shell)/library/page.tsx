import { toggleFavorite } from '@/app/(shell)/titles/actions';
import { LibraryView } from '@/components/library/library-view';
import { AddTitleButton } from '@/components/shell/add-title-button';
import { PageHeader } from '@/components/shell/page-header';
import { apiFetch } from '@/lib/api';
import type { TitleListItem } from '@/lib/library';

/**
 * The Library (06 / 12 / 13). LIB-1 and LIB-2 (FIL-44), the table (FIL-45), the
 * empty state (FIL-48) and the three controls (FIL-49).
 *
 * An async Server Component: the rows are fetched once here and handed down, so
 * no loading state ships to the browser. Everything below the header is one
 * client island, `LibraryView`, because the controls sit on the tab row while
 * what they narrow is the panel underneath, and one piece of state drives both.
 *
 * The header sits **outside** that island, which is what makes FIL-44's AC7
 * structural rather than a promise: switching tabs cannot change a header that is
 * not inside the component doing the switching.
 *
 * The genre cards are still a placeholder; they are FIL-50.
 */
export default async function LibraryPage() {
  const titles = await apiFetch<TitleListItem[]>('/api/titles');

  return (
    <main className="flex flex-1 flex-col">
      <PageHeader overline="Your watchlist" title="Library" actions={<AddTitleButton />} />

      <div className="flex flex-1 flex-col gap-[18px] px-[40px] pb-[40px]">
        <LibraryView
          titles={titles}
          onToggleFavorite={toggleFavorite}
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
