import { TitleForm } from '@/components/titles/title-form';
import { apiFetch } from '@/lib/api';
import type { GenreOption, TitleDetail } from '@/lib/dashboard';

/**
 * Edit title (09) as a full page. FIL-61.
 *
 * The design draws this only as a modal, and normally it is one: the sibling
 * intercepting route catches every client-side navigation here. This page is
 * what a hard load, a reload or a pasted link gets, which is the price of making
 * the modal a real URL and the reason the entry points can be plain links.
 *
 * Both entry points (EDT-2's row menu and DET-1's detail header) point at this
 * same URL, so neither has to know which of the two renders.
 */
export const dynamic = 'force-dynamic';

export default async function EditTitlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [title, genres] = await Promise.all([
    apiFetch<TitleDetail>(`/api/titles/${id}`),
    apiFetch<GenreOption[]>('/api/genres'),
  ]);

  return (
    <main className="flex flex-1 items-start justify-center px-[40px] py-[40px]">
      <TitleForm genres={genres} title={title} />
    </main>
  );
}
