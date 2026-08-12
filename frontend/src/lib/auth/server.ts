import { createNeonAuth, type NeonAuth } from '@neondatabase/auth/next/server';

/**
 * Server-side Neon Auth (Managed Better Auth).
 *
 * This owns the session cookie, so it must never be imported into a Client
 * Component. `NEON_AUTH_COOKIE_SECRET` deliberately has no NEXT_PUBLIC_ prefix:
 * a prefixed variable is inlined into the browser bundle and would leak the key
 * that signs every session.
 *
 * Built on **first request**, not at module load. `next build` collects page data
 * for every route, which imports this module, so constructing eagerly made the
 * production build fail anywhere the variables are absent, CI included. Local
 * builds passed only because a developer machine has a real `.env.local`.
 * Deferring keeps the build environment-free; a missing variable still fails
 * loudly, just on the first auth request.
 */
let instance: NeonAuth | undefined;

function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(
      `${name} is not set. Copy frontend/.env.example to frontend/.env.local. ` +
        'Get the base URL from: npx neonctl neon-auth status --project-id <id>',
    );
  }

  return value;
}

export function getAuth(): NeonAuth {
  if (!instance) {
    instance = createNeonAuth({
      baseUrl: requireEnv('NEON_AUTH_BASE_URL'),
      cookies: {
        // Better Auth rejects anything under 32 characters, so a short secret
        // fails here rather than silently weakening session signing.
        secret: requireEnv('NEON_AUTH_COOKIE_SECRET'),

        /*
         * **Required for OAuth to work at all. Do not drop this to take the
         * SDK's default.**
         *
         * Signing in with Google is a round trip: we send the browser to Google,
         * Google returns it to Neon, and Neon returns it to us with a
         * `neon_auth_session_verifier` query parameter. The SDK's middleware then
         * exchanges that verifier for a session, but only if the request also
         * carries the `session_challenge` cookie set when the flow started.
         *
         * `@neondatabase/auth` defaults that cookie to `SameSite=Strict`, and its
         * own types call `lax` the "previous hard-coded behavior". A Strict cookie
         * is **not sent on a cross-site top-level navigation**, which is exactly
         * the trip back from Google, so the challenge never arrives, the exchange
         * never runs, and the user lands on a protected route with no session and
         * is redirected to sign in. Google authenticates them and a session row is
         * created on Neon's side every time; the app simply never sees it. The
         * symptom is "Google sign-in just bounces me back to sign in forever",
         * with nothing in any log, because nothing failed.
         *
         * `lax` is the browser's own default for a cookie that does not say:
         * sent on top-level GET navigations, withheld from cross-site
         * subrequests, so it still blocks the CSRF that Strict is reached for.
         * Email and password sign-in is unaffected either way, being same-site,
         * which is why that kept working while Google did not.
         */
        sameSite: 'lax',
      },
    });
  }

  return instance;
}
