'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { apiFetch } from '@/lib/api';
import type { TitleDetail } from '@/lib/dashboard';

export interface CreateTitleInput {
  name: string;
  type: string;
  status: string;
  genreId: string;
  watchDate: string | null;
  rating: number | null;
  note: string | null;
  favorite: boolean;
}

/** What went wrong, per field, so the form can mark the inputs (FIL-59). */
export interface CreateTitleFailure {
  message: string;
  fields: string[];
}

/**
 * Creates a title from the Add title form (ADD-3, FIL-60).
 *
 * On success it revalidates the dashboard, because a new title changes the
 * up-next rail, the genre counts and possibly the Picker gate, then redirects to
 * the new title's detail screen. The design draws no after-state for the modal,
 * so landing on the thing you just made is the working decision.
 */
export async function createTitle(input: CreateTitleInput): Promise<CreateTitleFailure | never> {
  let created: TitleDetail;

  try {
    created = await apiFetch<TitleDetail>('/api/titles', {
      method: 'POST',
      body: input,
    });
  } catch (error) {
    // The backend names the offending fields; anything else is unexpected and
    // gets a single message rather than a guess at which input was wrong.
    const detail = error instanceof Error ? error.message : '';
    const fields = [...detail.matchAll(/"([a-zA-Z]+)"/g)].map((match) => match[1]);

    return {
      message: 'Check the highlighted fields and try again.',
      fields: fields.filter((field) =>
        ['name', 'type', 'status', 'genreId', 'rating'].includes(field),
      ),
    };
  }

  revalidatePath('/');
  revalidatePath('/library');

  // Outside the try: redirect throws by design, and catching it here would turn
  // a successful save into a form error.
  redirect(`/titles/${created.id}`);
}
