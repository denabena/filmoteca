'use client';

import { NeonAuthUIProvider } from '@neondatabase/auth/react/ui';
import { authClient } from '@/lib/auth/client';

/**
 * Client boundary for Neon Auth.
 *
 * The root layout is a Server Component and cannot pass `authClient` across the
 * boundary, because it is a live object rather than serialisable data. So the
 * client is imported here, on the client side, and this component is what the
 * layout renders.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return <NeonAuthUIProvider authClient={authClient}>{children}</NeonAuthUIProvider>;
}
