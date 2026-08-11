'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch } from '@/lib/api';
import type { Mood, PickCard } from '@/lib/dashboard';

/**
 * The Picker's three mutations, as Server Actions.
 *
 * Server Actions rather than client fetches because the API needs a bearer token
 * that only the server can mint. Calling NestJS from the browser would mean
 * shipping a token to it, which is exactly what the split-origin design avoids.
 *
 * **Every one revalidates `/` as well as `/picker` (FIL-73).** Generating,
 * adding and dismissing all change what the dashboard teaser should say, and
 * adding also changes the up-next rail and the genre counts. Revalidating only
 * the page the user is looking at would leave the dashboard stale until a hard
 * reload.
 */

function refreshPickerAndDashboard(): void {
  revalidatePath('/picker');
  revalidatePath('/');
}

/** "Surprise me" (PIC-5). Replaces the three cards on the page. */
export async function generatePicks(moods: Mood[]): Promise<void> {
  await apiFetch<PickCard[]>('/api/picker/picks', {
    method: 'POST',
    body: { moods },
  });

  refreshPickerAndDashboard();
}

/** "Add to watchlist" (PIC-7). Safe to call twice; the backend creates one title. */
export async function addPickToWatchlist(pickId: string): Promise<void> {
  await apiFetch<PickCard>(`/api/picker/picks/${pickId}/add`, { method: 'POST' });

  refreshPickerAndDashboard();
}

/**
 * "Not for me" (PIC-7).
 *
 * A25: the design removes the card with no replacement drawn, so nothing is
 * regenerated here. The candidate is excluded from every future run.
 */
export async function dismissPick(pickId: string): Promise<void> {
  await apiFetch<void>(`/api/picker/picks/${pickId}/dismiss`, { method: 'POST' });

  refreshPickerAndDashboard();
}
