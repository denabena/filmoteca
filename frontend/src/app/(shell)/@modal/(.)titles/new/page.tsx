import { RouteModal } from '@/components/shell/route-modal';
import { AddTitleForm } from '@/components/titles/add-title-form';
import { apiFetch } from '@/lib/api';
import type { GenreOption } from '@/lib/dashboard';

/**
 * Add title, as a modal over whatever view is underneath (08).
 *
 * This is an **intercepting** route: `(.)titles/new` catches a client-side
 * navigation to /titles/new and renders here instead of on the real page, which
 * is what makes frames 08 to 11 modals-over-Library rather than screens of their
 * own. A hard load, a reload or a pasted link still gets the full page at
 * ../../titles/new/page.tsx, so the URL stays shareable.
 *
 * The form itself is not duplicated. This route supplies the dialog and the
 * genre list; every field, rule and error string stays in `AddTitleForm`, which
 * is FIL-58 to FIL-60's work.
 */
export const dynamic = 'force-dynamic';

export default async function AddTitleModal() {
  const genres = await apiFetch<GenreOption[]>('/api/genres');

  return (
    <RouteModal label="Add title">
      <AddTitleForm genres={genres} dismissable />
    </RouteModal>
  );
}
