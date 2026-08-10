import { getAuth } from '@/lib/auth/server';

/**
 * Same-origin proxy so client components can read and update the profile without
 * ever holding the backend JWT. It reads the Neon Auth session from the incoming
 * cookie, mints a short-lived token, and forwards to the NestJS API. Introduced
 * for the onboarding genre save (FIL-26); the goal step (FIL-25) and Settings
 * reuse it.
 */
async function forward(request: Request, method: 'GET' | 'PATCH'): Promise<Response> {
  const auth = getAuth();
  const session = await auth.getSession();

  if (!session?.data) {
    return Response.json({ error: 'Not signed in' }, { status: 401 });
  }

  const token = await auth.token();
  const jwt = token?.data?.token;

  const response = await fetch(`${process.env.BACKEND_URL}/api/profile`, {
    method,
    headers: {
      Authorization: `Bearer ${jwt}`,
      ...(method === 'PATCH' ? { 'Content-Type': 'application/json' } : {}),
    },
    body: method === 'PATCH' ? await request.text() : undefined,
    cache: 'no-store',
  });

  // Pass the backend's status and JSON straight through.
  const body = await response.text();
  return new Response(body, {
    status: response.status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function GET(request: Request): Promise<Response> {
  return forward(request, 'GET');
}

export async function PATCH(request: Request): Promise<Response> {
  return forward(request, 'PATCH');
}
