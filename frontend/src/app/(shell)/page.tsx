/*
 * Placeholder for the dashboard (04 / 05). It exists so the sidebar has a route
 * to mark active; the real page header pattern is FIL-28 and the dashboard
 * content is its own epic.
 */
export default function DashboardPage() {
  return (
    <main className="flex flex-1 flex-col gap-2 px-10 py-8">
      <h1 className="text-[28px] font-semibold tracking-tight">Dashboard</h1>
      <p className="text-text-secondary">Coming in the Dashboard epic.</p>
    </main>
  );
}
