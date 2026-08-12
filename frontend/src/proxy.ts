import { NextResponse, type NextRequest } from 'next/server';
import { getAuth } from '@/lib/auth/server';
import { isPublicPath, SIGN_IN_PATH } from '@/lib/auth/routes';

/**
 * Route protection for the app shell (FIL-29).
 *
 * **This file is `proxy.ts`, not `middleware.ts`.** Next.js 16 renamed the
 * convention; the behaviour is unchanged but the old filename is simply not
 * picked up, so a `middleware.ts` here would look correct and protect nothing.
 * See `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`.
 *
 * What it does: anything that is not a public path needs a session, and a
 * visitor without one is sent to sign in. Neon's own middleware is what decides
 * "has a session", because it also refreshes an expiring one, so a user reading
 * a long page is not signed out mid-session by a cookie quietly ageing out.
 *
 * **Protection is deny-by-default.** The list in `routes.ts` names what is
 * *public*, and everything else is protected, so a screen added under `(shell)`
 * tomorrow is covered the moment it exists. An allowlist of protected routes is
 * the same code with the failure inverted: the one path somebody forgets to add
 * is the one that leaks.
 *
 * **The shell layout still redirects too, and that is not redundant.** The proxy
 * is an optimistic check by Next's own framing, and its `matcher` is a regex
 * somebody will eventually edit. `getCurrentUser()` reading the session on the
 * server is what actually guarantees no shell screen renders for nobody; this
 * catches it one layer earlier so the redirect is a redirect rather than a
 * render-then-bounce.
 *
 * **`getAuth()` is called inside the handler, never at module scope.** It reads
 * `NEON_AUTH_BASE_URL` and the cookie secret, and `next build` evaluates this
 * module while collecting routes. Constructing at import time is the mistake
 * this codebase has already made twice: it passes locally, where `.env.local`
 * exists, and fails the build in CI, where it does not.
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const guard = getAuth().middleware({ loginUrl: SIGN_IN_PATH });

  return guard(request);
}

/**
 * Which requests reach the handler above. Explained in `routes.ts`, where the
 * same pattern is exported as `PROXY_MATCHER` and exercised by tests.
 *
 * **It is spelt out here rather than imported, and it has to be.** Next parses
 * this object statically at build time and rejects anything it cannot read
 * literally, so `matcher: PROXY_MATCHER` fails the build with "matcher needs to
 * be a static string". A test asserts the two copies still say the same thing.
 */
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.png$).*)'],
};
