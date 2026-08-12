/**
 * Which side of the app-shell line each route falls on (FIL-29).
 *
 * One list, read by the proxy and by the auth screens, because the two have to
 * agree: if the proxy protects a path the shell does not own, a signed-out
 * visitor is bounced off a screen designed for them. Spelling the boundary out
 * once is what stops that drifting.
 *
 * The shell is not enumerated route by route on purpose. It is "everything that
 * is not public", so a new screen added under `(shell)` is protected the moment
 * it exists rather than when somebody remembers to add it here. Getting that
 * backwards is how a route leaks.
 */

/** Where a signed-out visitor is sent, and where they land back from. */
export const SIGN_IN_PATH = '/auth/sign-in';

/** Where a signed-in visitor is sent when they open an auth screen. */
export const SIGNED_IN_HOME = '/';

/**
 * Paths a signed-out visitor may reach.
 *
 * `/auth` covers sign in, create account and everything Neon's own `[path]`
 * catch-all serves, such as forgot-password and email verification: a password
 * reset link is followed by definition while signed out, so protecting it would
 * make the link useless. `/api/auth` is the proxy to Neon itself and must stay
 * open, since sign-in posts through it before any session exists.
 *
 * `/welcome` is public because it is the screen a visitor with **no account**
 * lands on: its two controls are "Get started" (to create an account) and "Sign
 * in" (WEL-3). Protecting it made the app's own front door redirect to sign-in,
 * which is only visible once FIL-21/22 and FIL-29 are on the same branch.
 *
 * **`/onboarding` is deliberately not public.** Setup runs for somebody who has
 * an account but has not finished configuring it, so a session exists by then,
 * and both steps save through `PATCH /api/profile` — which needs a bearer token
 * and would 401 for a signed-out visitor. Protecting it fails at the door rather
 * than at the Continue button.
 */
const PUBLIC_PREFIXES = ['/auth', '/api/auth', '/welcome'];

/** True when a signed-out visitor is allowed to see this path. */
export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

/**
 * The auth screens a signed-in visitor should not be looking at.
 *
 * Deliberately just these two rather than all of `/auth`. Sign in and create
 * account are meaningless with a session, which is FIL-29's last criterion. The
 * rest of Neon's views are not: somebody with a live session may still want to
 * change their password or verify a second email, and bouncing them to the
 * dashboard would break a flow the design never claimed to own.
 */
const SIGNED_IN_FORBIDDEN = ['/auth/sign-in', '/auth/sign-up'];

/** True when this path should send a signed-in visitor to the Dashboard. */
export function isAuthEntryPath(pathname: string): boolean {
  return SIGNED_IN_FORBIDDEN.includes(pathname);
}

/**
 * Which requests the proxy runs on at all.
 *
 * Everything except Next's own asset routes and the static files in `public/`.
 * `_next/static` and `_next/image` are excluded because an auth check in front
 * of them would put a network round trip before assets the browser fetches
 * dozens of times per page, and they carry no session to check anyway. The
 * trailing alternation covers the favicon and icons, which the browser requests
 * rather than navigates to.
 *
 * It deliberately still matches `/api/auth/*`, which `isPublicPath` lets through
 * by name. Excluding it here instead would hide the reason: that path stays open
 * because sign-in posts through it before a session exists, and that belongs
 * beside the other routing rules rather than buried in a regex.
 *
 * **This is a second copy of the pattern, on purpose.** `proxy.ts` must spell it
 * out literally, because Next parses that `config` object statically at build
 * time and rejects an imported value. Declaring it here too is what makes it
 * testable at all: importing `proxy.ts` pulls in `next/server`, which needs Edge
 * globals jsdom does not have. A test asserts the two copies still agree, so the
 * duplication cannot rot silently.
 */
export const PROXY_MATCHER = ['/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.png$).*)'];
