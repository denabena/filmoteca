import 'server-only';
import { getAuth } from '@/lib/auth/server';

/**
 * Calls the NestJS API as the signed-in user.
 *
 * **Server-only, and the `server-only` import is what enforces it.** This mints a
 * session token, so importing it from a Client Component has to fail at build
 * time rather than ship a token minter to the browser.
 *
 * The chain, unchanged from the one `me/page.tsx` proved end to end: read the Neon
 * Auth session from the incoming cookie, mint a short-lived JWT, send it as a
 * bearer token. The API is a separate origin so it never sees the cookie, which is
 * why the token exists at all.
 *
 * `BACKEND_URL` keeps its unprefixed name deliberately. A `NEXT_PUBLIC_` variable
 * is inlined into the browser bundle, and in production this value is injected by
 * Vercel's service binding, so it differs per deployment and must never be baked
 * into client code.
 */
export async function apiFetch<T>(
  path: string,
  // PUT and DELETE arrive with the Edit modal and the delete dialog (FIL-61,
  // FIL-63). Listed rather than left as `string` so a typo is a build error.
  init: { method?: 'GET' | 'POST' | 'PUT' | 'DELETE'; body?: unknown } = {},
): Promise<T> {
  const auth = getAuth();
  const session = await auth.getSession();

  if (!session?.data) {
    // Callers reach this only through the shell, whose layout already redirects
    // an anonymous visitor to sign-in. Throwing rather than returning null keeps
    // every call site from having to defend against a case the routing prevents.
    throw new Error(`Not signed in, cannot call ${path}`);
  }

  const token = await auth.token();

  const response = await fetch(`${process.env.BACKEND_URL}${path}`, {
    method: init.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${token?.data?.token}`,
      ...(init.body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    // Every one of these reads per-user data that a mutation elsewhere can
    // change, so a cached response would show a stale dashboard after adding a
    // title. There is nothing here worth caching.
    cache: 'no-store',
  });

  if (!response.ok) {
    // The body may carry a Nest error message; the status alone is not much to
    // debug from when this fails in a deployed preview.
    const detail = await response.text().catch(() => '');
    throw new Error(`${path} failed: HTTP ${response.status} ${detail}`.trim());
  }

  // 204 on dismiss, and `.json()` on an empty body throws rather than returning
  // null, so the no-content case has to be handled before parsing.
  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
