'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { authClient } from '@/lib/auth/client';
import { SignOutIcon } from './icons';

/**
 * Ends the Neon Auth session and returns to sign-in (FIL-20 · SHL). Kept as its
 * own component so the sidebar itself stays free of the auth client and router,
 * and its tests need no auth mocks.
 */
export function SignOutButton() {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    await authClient.signOut();
    router.push('/auth/sign-in');
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={signingOut}
      aria-label="Sign out"
      title="Sign out"
      className="flex size-9 shrink-0 items-center justify-center rounded-[10px] text-text-tertiary outline-offset-2 hover:bg-surface-card-raised/40 hover:text-text-primary focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-60"
    >
      <SignOutIcon className="size-5" />
    </button>
  );
}
