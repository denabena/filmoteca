import { createNeonAuth } from '@neondatabase/auth/next/server';

/**
 * Server-side Neon Auth instance (Managed Better Auth).
 *
 * This owns the session cookie, so it must never be imported into a Client
 * Component. `NEON_AUTH_COOKIE_SECRET` deliberately has no NEXT_PUBLIC_ prefix:
 * a prefixed variable is inlined into the browser bundle and would leak the key
 * that signs every session.
 */
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

export const auth = createNeonAuth({
  baseUrl: requireEnv('NEON_AUTH_BASE_URL'),
  cookies: {
    // Better Auth rejects anything under 32 characters, so a short secret fails
    // at startup rather than silently weakening session signing.
    secret: requireEnv('NEON_AUTH_COOKIE_SECRET'),
  },
});
