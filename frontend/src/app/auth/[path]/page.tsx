import { AuthView } from '@neondatabase/auth/react/ui';

/**
 * Every auth screen Neon Auth ships, behind one dynamic route: /auth/sign-in,
 * /auth/sign-up, /auth/forgot-password and so on. `path` selects the view.
 *
 * This is scaffolding to prove the auth wiring works. The designed Filmoteca
 * sign-in screens (Figma frames 18 to 25) replace it later.
 */
export default async function AuthPage({ params }: { params: Promise<{ path: string }> }) {
  const { path } = await params;

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <AuthView path={path} />
    </main>
  );
}
