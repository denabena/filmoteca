import Link from 'next/link';
import { auth } from '@/lib/auth/server';

/**
 * End-to-end proof that auth spans both apps.
 *
 * The chain: this Server Component reads the Neon Auth session from the incoming
 * cookie, mints a short-lived JWT, and calls the NestJS API with it as a bearer
 * token. The API verifies that JWT against Neon's JWKS and answers with the user
 * it recovered plus a live database ping. Nothing here trusts the client.
 *
 * Scaffolding for FIL-10. The designed screens replace it.
 */

// Reads the session cookie, so it can never be prerendered. Without this Next
// attempts static generation at build time and logs a dynamic-server-usage error.
export const dynamic = 'force-dynamic';

/** Mirrors MeResponse in backend/src/auth/auth.controller.ts. */
interface MeResponse {
  user: { id: string; email?: string; name?: string };
  tokenClaims: string[];
  database: { ok: boolean; database: string; version: string; latencyMs: number };
}

export default async function MePage() {
  const session = await auth.getSession();

  if (!session?.data) {
    return (
      <main className="mx-auto max-w-2xl p-8">
        <h1 className="text-2xl font-semibold">Not signed in</h1>
        <p className="mt-2 text-sm opacity-70">
          The backend cannot identify you without a session.
        </p>
        <Link href="/auth/sign-up" className="mt-4 inline-block underline">
          Create an account
        </Link>
      </main>
    );
  }

  const token = await auth.token();
  const jwt = token?.data?.token;

  // The backend URL is read server-side only, so it keeps its unprefixed name.
  const response = await fetch(`${process.env.BACKEND_URL}/api/me`, {
    headers: { Authorization: `Bearer ${jwt}` },
    cache: 'no-store',
  });

  if (!response.ok) {
    return (
      <main className="mx-auto max-w-2xl p-8">
        <h1 className="text-2xl font-semibold">Backend rejected the token</h1>
        <p className="mt-2 text-sm opacity-70">
          HTTP {response.status}. Check NEON_AUTH_JWKS_URL in backend/.env.
        </p>
      </main>
    );
  }

  const me = (await response.json()) as MeResponse;

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-semibold">Verified end to end</h1>
      <p className="mt-2 text-sm opacity-70">
        Next.js signed you in, NestJS verified the token against Neon&apos;s JWKS.
      </p>

      <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
        <dt className="opacity-60">User id</dt>
        <dd className="font-mono">{me.user.id}</dd>
        <dt className="opacity-60">Email</dt>
        <dd>{me.user.email ?? '-'}</dd>
        <dt className="opacity-60">Name</dt>
        <dd>{me.user.name ?? '-'}</dd>
        <dt className="opacity-60">Database</dt>
        <dd>
          {me.database.database} · {me.database.version} · {me.database.latencyMs}ms
        </dd>
        <dt className="opacity-60">Token claims</dt>
        <dd className="font-mono text-xs">{me.tokenClaims.join(', ')}</dd>
      </dl>
    </main>
  );
}
