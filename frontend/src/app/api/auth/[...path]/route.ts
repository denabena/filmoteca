import { auth } from '@/lib/auth/server';

/**
 * Catch-all route handler for Neon Auth.
 *
 * Everything the auth client does (sign in, sign up, sign out, get-session, and
 * the `token` endpoint that mints the JWT we forward to the NestJS API) goes
 * through here. Keeping it server-side means the Neon Auth base URL and the
 * cookie secret stay out of the browser bundle.
 */
export const { GET, POST } = auth.handler();
