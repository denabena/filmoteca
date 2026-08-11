import { RouteModal } from '@/components/shell/route-modal';
import { TitleForm } from '@/components/titles/title-form';
import { apiFetch } from '@/lib/api';
import type { GenreOption, TitleDetail } from '@/lib/dashboard';

/**
 * Edit title, as a modal over whatever view is underneath (09 · FIL-61).
 *
 * The same shape as the Add title modal beside it: this intercepting route
 * catches a client-side navigation to /titles/{id}/edit and renders the dialog,
 * while a hard load still gets the full page. Frames 08 to 11 are all modals
 * over the Library, so both use one `RouteModal` rather than growing a second
 * shell.
 *
 * The form is not duplicated. This route supplies the dialog, the title and the
 * genre list; every field, rule and error string lives in `TitleForm`, which is
 * also what Add renders. EDT-3 requires exactly that.
 */
export const dynamic = 'force-dynamic';

export default async function EditTitleModal({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [title, genres] = await Promise.all([
    apiFetch<TitleDetail>(`/api/titles/${id}`),
    apiFetch<GenreOption[]>('/api/genres'),
  ]);

  return (
    <RouteModal label="Edit title">
      <TitleForm genres={genres} title={title} dismissable />
    </RouteModal>
  );
}
