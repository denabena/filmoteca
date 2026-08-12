import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PROXY_MATCHER } from './routes';

/**
 * The matcher is a regex, and a regex nobody exercises is a regex that quietly
 * stops matching. These run it against the paths it decides, so editing it later
 * fails here rather than in production.
 *
 * The proxy handler itself is not tested: it is one `isPublicPath` call in front
 * of Neon's own middleware, both covered by their own tests, and stubbing the
 * pair would only assert that two lines call each other.
 */
describe('the proxy matcher (FIL-29)', () => {
  const matches = (pathname: string) =>
    PROXY_MATCHER.some((pattern) => new RegExp(`^${pattern}$`).test(pathname));

  it.each([
    ['the dashboard', '/'],
    ['the library', '/library'],
    ['the picker', '/picker'],
    ['settings', '/settings'],
    ['a title detail page', '/titles/8f1c-4d2e'],
    // Matched on purpose and let through by name in the handler, so the reason
    // sits with the other routing rules rather than buried in a regex.
    ['the auth API proxy', '/api/auth/sign-in/email'],
    ['the sign in screen', '/auth/sign-in'],
  ])('runs on %s', (_label, pathname) => {
    expect(matches(pathname)).toBe(true);
  });

  /*
   * An auth check in front of these would put a network round trip before assets
   * the browser fetches dozens of times per page, and they carry no session to
   * check anyway.
   */
  it.each([
    ['build output', '/_next/static/chunks/main.js'],
    ['optimised images', '/_next/image'],
    ['the favicon', '/favicon.ico'],
    ['the app icon', '/icon.svg'],
    ['a static image', '/poster.png'],
  ])('skips %s', (_label, pathname) => {
    expect(matches(pathname)).toBe(false);
  });

  /*
   * `proxy.ts` cannot import PROXY_MATCHER: Next parses its `config` object
   * statically at build time and rejects anything it cannot read literally. So
   * the pattern exists twice, and everything above tests the copy that is not
   * the one Next actually uses. This is the guard that keeps them the same
   * string, by reading the file rather than trusting a comment.
   */
  it('matches the literal the proxy actually ships', () => {
    const source = readFileSync(join(process.cwd(), 'src/proxy.ts'), 'utf8');

    for (const pattern of PROXY_MATCHER) {
      // Source-escaped, since the file spells `\\.png` inside a string literal.
      expect(source).toContain(pattern.replace(/\\/g, '\\\\'));
    }
  });
});
