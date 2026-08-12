import { LibraryTabs } from '@/components/library/library-tabs';
import { AddTitleButton } from '@/components/shell/add-title-button';
import { PageHeader } from '@/components/shell/page-header';

/**
 * The Library (06 / 12 / 13). LIB-1 and LIB-2, which is FIL-44.
 *
 * A Server Component: the header and the two panel slots are static, and only the
 * tab switch itself needs state, so the client boundary stops at `LibraryTabs`.
 * The header sits **outside** it, which is what makes AC7 structural rather than
 * a promise: switching tabs cannot change a header that is not inside the
 * component doing the switching.
 *
 * The panels are placeholders on purpose. The titles table is FIL-45 and the
 * genre cards are their own task; this ticket owns the header and the switching
 * and nothing else, per its own technical notes. Each placeholder names the
 * ticket that replaces it so neither is mistaken for a finished screen.
 */
export default function LibraryPage() {
  return (
    <main className="flex flex-1 flex-col">
      <PageHeader overline="Your watchlist" title="Library" actions={<AddTitleButton />} />

      <div className="flex flex-1 flex-col gap-[18px] px-[40px] pb-[40px]">
        <LibraryTabs
          table={<PanelPlaceholder>The titles table lands in FIL-45.</PanelPlaceholder>}
          genres={<PanelPlaceholder>The genre cards land in the genres task.</PanelPlaceholder>}
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
