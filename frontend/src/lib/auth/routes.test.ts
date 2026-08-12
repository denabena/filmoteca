import { isAuthEntryPath, isPublicPath, SIGN_IN_PATH, SIGNED_IN_HOME } from './routes';

/**
 * FIL-29's boundary, asserted directly.
 *
 * The proxy itself is not unit-tested: it is a thin `isPublicPath` check in
 * front of Neon's own middleware, and a test that stubs both would only assert
 * that two lines call each other. What can genuinely go wrong is the boundary,
 * which is this file, and the matcher, which is a regex and is checked below.
 */
describe('the shell boundary (FIL-29)', () => {
  describe('isPublicPath', () => {
    it.each([
      '/auth',
      '/auth/sign-in',
      '/auth/sign-up',
      // Followed while signed out by definition, so protecting it makes the
      // emailed link useless.
      '/auth/forgot-password',
      '/auth/reset-password',
      // Sign-in posts through here before any session exists.
      '/api/auth/sign-in/email',
      // The front door: its two controls are "Get started" and "Sign in", so a
      // visitor reaching it has no account yet (WEL-3, FIL-21/22).
      '/welcome',
    ])('lets a signed-out visitor reach %s', (pathname) => {
      expect(isPublicPath(pathname)).toBe(true);
    });

    it.each([
      ['the dashboard', '/'],
      ['the library', '/library'],
      ['the picker', '/picker'],
      ['settings', '/settings'],
      ['a title detail page', '/titles/8f1c/'],
      ['the add title route', '/titles/new'],
      // Setup runs for somebody who already has an account, and both steps save
      // through `PATCH /api/profile`, which needs a bearer token.
      ['the onboarding goal step', '/onboarding/goal'],
      ['the onboarding genres step', '/onboarding/genres'],
    ])('protects %s', (_label, pathname) => {
      expect(isPublicPath(pathname)).toBe(false);
    });

    /*
     * Deny-by-default is the whole design. A screen nobody has written yet is
     * protected because it is not on the public list, rather than unprotected
     * because it is not on a protected one.
     */
    it('protects a route that does not exist yet', () => {
      expect(isPublicPath('/some-screen-from-a-later-ticket')).toBe(false);
    });

    // A prefix match on the string alone would let this through, and it is not
    // an auth route: it is whatever "/authorise" turns out to be.
    it('does not treat a path that merely starts with the letters as public', () => {
      expect(isPublicPath('/authorise')).toBe(false);
      expect(isPublicPath('/authentic-cinema')).toBe(false);
    });
  });

  describe('isAuthEntryPath', () => {
    it.each(['/auth/sign-in', '/auth/sign-up'])(
      'sends a signed-in visitor away from %s',
      (pathname) => {
        expect(isAuthEntryPath(pathname)).toBe(true);
      },
    );

    /*
     * Deliberately narrower than "all of /auth". Somebody with a live session
     * may still want to change their password or verify a second address, and
     * bouncing them to the dashboard would break a flow the design never claimed
     * to own.
     */
    it.each(['/auth/forgot-password', '/auth/reset-password', '/auth'])(
      'leaves a signed-in visitor alone on %s',
      (pathname) => {
        expect(isAuthEntryPath(pathname)).toBe(false);
      },
    );
  });

  it('points sign-out at a public path and sign-in at a protected one', () => {
    // If either of these flipped, the redirect would bounce forever.
    expect(isPublicPath(SIGN_IN_PATH)).toBe(true);
    expect(isPublicPath(SIGNED_IN_HOME)).toBe(false);
  });
});
