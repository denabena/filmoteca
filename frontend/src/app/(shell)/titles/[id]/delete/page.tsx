import { deleteTitle } from '@/app/(shell)/titles/actions';
import { DeleteTitleDialog } from '@/components/titles/delete-title-dialog';
import { apiFetch } from '@/lib/api';
import type { TitleDetail } from '@/lib/dashboard';

/**
 * Delete confirmation (11) as a full page. FIL-63.
 *
 * The design draws this only as a dialog, and normally it is one: the sibling
 * intercepting route catches every client-side navigation here. This page is what
 * a hard load or a pasted link gets, which is the price of making the dialog a
 * real URL and the reason both entry points can be plain links.
 *
 * The title is fetched so the copy can quote its name, which is the one thing
 * this dialog cannot do without.
 */
export const dynamic = 'force-dynamic';

export default async function DeleteTitlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const title = await apiFetch<TitleDetail>(`/api/titles/${id}`);

  return (
    <main className="flex flex-1 items-start justify-center px-[40px] py-[40px]">
      <DeleteTitleDialog titleId={title.id} titleName={title.name} onDelete={deleteTitle} />
    </main>
  );
}
