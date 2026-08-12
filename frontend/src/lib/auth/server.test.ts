import type { createNeonAuth as CreateNeonAuth } from '@neondatabase/auth/next/server';
import type { getAuth as GetAuth } from './server';

/**
 * The one thing about this module worth pinning in a test.
 *
 * `sameSite: 'lax'` is what makes OAuth work, and its absence fails in a way no
 * other test would notice: signing in with Google authenticates correctly and a
 * session is created on Neon's side, yet the app still bounces the user to the
 * sign-in screen, because the challenge cookie is withheld on the cross-site trip
 * back. Nothing throws and nothing logs.
 *
 * It is also exactly the sort of line that gets "cleaned up" as redundant, or
 * reverted by an SDK upgrade changing its default again, so it is asserted rather
 * than only commented.
 */
jest.mock('@neondatabase/auth/next/server', () => ({
  createNeonAuth: jest.fn(() => ({ handler: jest.fn(), middleware: jest.fn() })),
}));

/**
 * A fresh copy of the module under test, plus the mock **from the same registry**.
 *
 * Resetting the registry re-runs the `jest.mock` factory, so a mock captured at
 * file scope is a different function from the one the reloaded module imports and
 * would record none of its calls. Both have to be pulled after the reset, as a
 * pair. The instance is a module-level singleton, so every test that counts
 * construction needs its own registry.
 */
async function freshModule(): Promise<{
  getAuth: typeof GetAuth;
  create: jest.MockedFunction<typeof CreateNeonAuth>;
}> {
  jest.resetModules();

  const { createNeonAuth } = (await import('@neondatabase/auth/next/server')) as unknown as {
    createNeonAuth: jest.MockedFunction<typeof CreateNeonAuth>;
  };
  const { getAuth } = await import('./server');

  return { getAuth, create: createNeonAuth };
}

describe('getAuth', () => {
  const env = process.env;

  beforeEach(() => {
    process.env = {
      ...env,
      NEON_AUTH_BASE_URL: 'https://example.neonauth.test/neondb/auth',
      NEON_AUTH_COOKIE_SECRET: 'x'.repeat(32),
    };
  });

  afterAll(() => {
    process.env = env;
  });

  it('sends session cookies with SameSite=Lax so the OAuth return trip carries them', async () => {
    const { getAuth, create } = await freshModule();

    getAuth();

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        cookies: expect.objectContaining({ sameSite: 'lax' }),
      }),
    );
  });

  // Built on first use, never at module load: `next build` collects page data for
  // every route, and constructing here reads variables a build environment has no
  // reason to hold. This repo has shipped that mistake twice.
  it('does not build the instance until it is asked for', async () => {
    const { getAuth, create } = await freshModule();

    expect(create).not.toHaveBeenCalled();

    getAuth();

    expect(create).toHaveBeenCalledTimes(1);
  });

  it('reuses one instance rather than rebuilding it per request', async () => {
    const { getAuth, create } = await freshModule();

    expect(getAuth()).toBe(getAuth());
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('fails loudly when a variable is missing rather than at first sign-in', async () => {
    delete process.env.NEON_AUTH_COOKIE_SECRET;
    const { getAuth } = await freshModule();

    expect(() => getAuth()).toThrow('NEON_AUTH_COOKIE_SECRET is not set');
  });
});
