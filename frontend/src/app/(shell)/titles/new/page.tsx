import { TitleForm } from '@/components/titles/title-form';
import { apiFetch } from '@/lib/api';
import type { GenreOption } from '@/lib/dashboard';

/**
 * Add title (08). Covers FIL-58, FIL-59 and FIL-60, taken from Dominik because
 * every "Add title" and "Add your first title" button on the screens I built has
 * nowhere to go without it.
 *
 * **One deviation, stated plainly:** the design draws this as a modal over the
 * Library table. The Library list is FIL-45 onward and does not exist, so there
 * is nothing to overlay. It is the same card on its own route, and it becomes a
 * modal via an intercepting route once the Library is built.
 */
export const dynamic = 'force-dynamic';

export default async function AddTitlePage() {
  const genres = await apiFetch<GenreOption[]>('/api/genres');

  return (
    <main className="flex flex-1 items-start justify-center px-[40px] py-[40px]">
      <TitleForm genres={genres} />
    </main>
  );
}
