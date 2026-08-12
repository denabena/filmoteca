import { PickerBoard } from '@/components/picker/picker-board';
import { PickerLocked } from '@/components/picker/picker-locked';
import { PageHeader } from '@/components/shell/page-header';
import { apiFetch } from '@/lib/api';
import type { PickCard, PickerGateState } from '@/lib/dashboard';

/**
 * The Scene Picker (14, 15, 16). FIL-68 to FIL-73.
 *
 * A Server Component that reads the gate and the current picks, then hands them
 * to a client board for the interactive parts. The gate decides which of two
 * entirely different screens renders: the design hides the mood prompt when
 * locked rather than disabling it, so a locked user never sees a control that
 * would refuse them.
 *
 * Two requests rather than one, unlike the dashboard: the gate is cheap, and a
 * locked user must not pay for a picks query whose answer is always empty.
 */

// Reads the session cookie through apiFetch, so it can never be prerendered.
export const dynamic = 'force-dynamic';

export default async function PickerPage() {
  const picker = await apiFetch<PickerGateState>('/api/picker/gate');
  const picks = picker.unlocked ? await apiFetch<PickCard[]>('/api/picker/picks') : [];

  return (
    <main className="flex flex-1 flex-col">
      {/* Its own strings, the shared component (FIL-28). The Picker header has no
          page actions, which is the "still aligns with no actions" case. */}
      <PageHeader overline="AI assistant" title="Scene Picker" />

      <div className="flex flex-1 flex-col gap-[20px] px-[40px] pb-[40px]">
        {picker.unlocked ? <PickerBoard picks={picks} /> : <PickerLocked picker={picker} />}
      </div>
    </main>
  );
}
