import { ContinueWatchingHero } from '@/components/dashboard/continue-watching';
import { DashboardView } from '@/components/dashboard/dashboard-view';
import { PickerTeaser } from '@/components/dashboard/picker-teaser';
import { UpNextRail } from '@/components/dashboard/up-next-rail';
import { apiFetch } from '@/lib/api';
import type { DashboardSummary } from '@/lib/dashboard';
import { getCurrentUser } from '@/lib/current-user.server';

/**
 * The dashboard (04 / 05). FIL-34 to FIL-40.
 *
 * An async Server Component with **one** backend call. The tech spec models this
 * as a single `getDashboardSummary(month)` and frame 04 renders every section at
 * once, so splitting it into a request per card would buy four round trips nobody
 * needs.
 *
 * It always fetches the **current** month: FIL-40 requires a reload to reset, so
 * the selection cannot live in the URL. `DashboardView` holds it in client state.
 *
 * The hero, rail and teaser are rendered here and passed down as slots, so a
 * month change re-renders neither. Both empty and filled states come from the
 * same components: the design draws 05 as the same layout with different
 * contents, not as a different screen.
 */

// Reads the session cookie through apiFetch, so it can never be prerendered.
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const [summary, profile] = await Promise.all([
    apiFetch<DashboardSummary>('/api/dashboard'),
    getCurrentUser(),
  ]);

  return (
    <DashboardView
      firstName={profile.firstName}
      initialStats={summary.stats}
      availableMonths={summary.availableMonths}
      hero={<ContinueWatchingHero title={summary.continueWatching} />}
      rail={<UpNextRail titles={summary.upNext} />}
      teaser={<PickerTeaser picker={summary.picker} topPick={summary.topPick} />}
    />
  );
}
