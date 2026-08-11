'use server';

import { apiFetch } from '@/lib/api';
import type { MonthlyStats } from '@/lib/dashboard';

/**
 * Re-reads the month-scoped half of the dashboard.
 *
 * FIL-40 requires that a reload resets to the current month, which rules out
 * keeping the selection in the URL: `/?month=2026-08` survives a refresh by
 * definition. So the month lives in client state and this action fetches for it.
 *
 * The trade is real and worth naming: the view is no longer shareable and the
 * back button does not step through months. The acceptance criterion chose that,
 * and it is one line to reverse if the designer would rather have the URL.
 */
export async function fetchMonthlyStats(month: string): Promise<MonthlyStats> {
  const summary = await apiFetch<{ stats: MonthlyStats }>(`/api/dashboard?month=${month}`);

  return summary.stats;
}
