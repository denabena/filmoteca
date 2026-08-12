import { deleteTitle } from '@/app/(shell)/titles/actions';
import { RouteModal } from '@/components/shell/route-modal';
import { DeleteTitleDialog } from '@/components/titles/delete-title-dialog';
import { apiFetch } from '@/lib/api';
import type { TitleDetail } from '@/lib/dashboard';

/**
 * Delete confirmation, over whatever view is underneath (11 · FIL-63).
 *
 * The third and last of frames 08 to 11 to use `RouteModal`, which is why that
 * shell was kept generic rather than built into the Add title form.
 *
 * Both designed entry points reach here: the row menu's "Delete title" (DEL-2)
 * and the Edit modal's footer action (EDT-2). Neither knows about this file, and
 * neither has to, because both are links to the same URL. The Title detail page
 * deliberately has no entry point (DET-7).
 *
 * `RouteModal` supplies Escape, which for this dialog must cancel and can never
 * confirm: it closes by navigating back, so a stray keypress deletes nothing.
 */
export const dynamic = 'force-dynamic';

export default async function DeleteTitleModal({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const title = await apiFetch<TitleDetail>(`/api/titles/${id}`);

  return (
    <RouteModal label="Delete this title?">
      <DeleteTitleDialog
        titleId={title.id}
        titleName={title.name}
        onDelete={deleteTitle}
        dismissable
      />
    </RouteModal>
  );
}
