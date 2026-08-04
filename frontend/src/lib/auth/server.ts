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
      },
    });
  }

  return instance;
}
