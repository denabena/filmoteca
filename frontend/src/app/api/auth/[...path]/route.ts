import { getAuth } from '@/lib/auth/server';

/**
 * Catch-all route handler for Neon Auth.
 *
 * Everything the auth client does (sign in, sign up, sign out, get-session, and
 * the `token` endpoint that mints the JWT we forward to the NestJS API) goes
 * through here. Keeping it server-side means the Neon Auth base URL and the
 * cookie secret stay out of the browser bundle.
 *
 * These are thin wrappers rather than `export const { GET, POST } = auth.handler()`
 * on purpose. Destructuring at module scope would build the auth instance while
 * `next build` collects page data, which needs environment variables that a build
 * environment does not have. Resolving inside the request keeps the build clean.
 */
type RouteContext = { params: Promise<{ path: string[] }> };

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  return getAuth().handler().GET(request, context);
}

export async function POST(request: Request, context: RouteContext): Promise<Response> {
  return getAuth().handler().POST(request, context);
}
