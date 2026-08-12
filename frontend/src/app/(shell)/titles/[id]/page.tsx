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
      <div className="flex w-full flex-wrap items-center justify-between gap-[12px] px-4 pt-[22px] pb-[18px] md:px-[40px] md:pt-[28px]">
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
          DET-1's entry point into Edit title, live now that FIL-61 exists. A
          `Link`, so the intercepting route turns an in-app click into the modal
          over this page while a pasted URL still gets the full screen.
        */}
        <Link
          href={`/titles/${title.id}/edit`}
          className="bg-surface-card-raised border-border-strong text-text-primary rounded-[12px] border px-[20px] py-[13px] text-[14px] font-semibold outline-offset-2 focus-visible:outline-2 focus-visible:outline-accent"
        >
          Edit details
        </Link>
      </div>

      <div className="px-4 pb-[40px] md:px-[40px]">
        <TitleDetailCard title={title} genre={genre} />
      </div>
    </main>
  );
}
