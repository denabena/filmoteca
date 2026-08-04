'use client';

import { createAuthClient } from '@neondatabase/auth/next';

/**
 * Browser-side auth client. Talks to this app's own /api/auth/* route handler,
 * which proxies to Neon Auth, so no Neon URL or secret reaches the browser.
 *
 * Created once at module scope rather than per render: the client holds session
 * state, and a fresh instance on every render would drop it.
 */
export const authClient = createAuthClient();
