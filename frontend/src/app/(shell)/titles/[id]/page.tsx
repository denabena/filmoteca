import Link from 'next/link';
import { TitleDetailCard } from '@/components/titles/title-detail-card';
import { apiFetch } from '@/lib/api';
import type { GenreOption, TitleDetail } from '@/lib/dashboard';

/**
 * Title detail (07). Covers FIL-52 and FIL-53, taken from Dominik because the
 * dashboard's "Details" button and poster cards have nowhere to go without it.
 *
 * The genre list is fetched alongside so the detail card can name the title's
 * genre and colour its chip. A dedicated read that returns the genre inline would
 * be better; that belongs with FIL-42's own ticket rather than here.
 */
export const dynamic = 'force-dynamic';

export default async function TitleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [title, genres] = await Promise.all([
    apiFetch<TitleDetail>(`/api/titles/${id}`),
    apiFetch<GenreOption[]>('/api/genres'),
  ]);

  const genre = genres.find((option) => option.id === title.genreId) ?? null;

  return (
    <main className="flex flex-1 flex-col">
      <div className="flex w-full items-center justify-between px-[40px] pt-[28px] pb-[18px]">
        <nav aria-label="Breadcrumb" className="flex items-center gap-[10px] text-[13px]">
          <Link href="/library" className="text-text-secondary">
            Library
          </Link>
          <span className="text-text-tertiary" aria-hidden="true">
            /
          </span>
          <span className="text-text-primary font-medium">{title.name}</span>
        </nav>
        {/*
         * Edit title (09) is FIL-61's screen and has no route yet. Disabled
         * rather than removed, so the header keeps the shape the design draws.
         */}
        <button
          type="button"
          disabled
          title="Editing arrives with FIL-61"
          className="bg-surface-card-raised border-border-strong text-text-primary cursor-not-allowed rounded-[12px] border px-[20px] py-[13px] text-[14px] font-semibold opacity-60"
        >
          Edit details
        </button>
      </div>

      <div className="px-[40px] pb-[40px]">
        <TitleDetailCard title={title} genre={genre} />
      </div>
    </main>
  );
}
