'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { AuthButton } from '@/components/auth/auth-button';
import { AuthCard } from '@/components/auth/auth-card';
import { AuthDivider } from '@/components/auth/auth-divider';
import { AuthField } from '@/components/auth/auth-field';
import { authClient } from '@/lib/auth/client';
import { authErrorMessage } from '@/lib/auth/errors';

/**
 * The designed Sign in screen (Figma frame 18 · SGN-1, SGN-3, SGN-7), replacing
 * Neon Auth's generic AuthView for this one path. A static segment, so it wins
 * over the `[path]` catch-all that still serves forgot-password and the rest.
 *
 * Wired to Neon Auth's email sign-in. The two distinct failure copies (wrong
 * password vs unknown email, SGN-4/SGN-5) are FIL-16; this ships one plain
 * message so the wiring is real and the happy path lands on the Dashboard.
 */
export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const { error: signInError } = await authClient.signIn.email({ email, password });

      if (signInError) {
        // Reset immediately so the button leaves its "Signing in…" state and the
        // reason (wrong password vs unknown email) shows at once.
        setError(authErrorMessage(signInError, 'Could not sign you in. Please try again.'));
        setSubmitting(false);
        return;
      }

      // A full navigation so the shell's Server Component re-reads the new session.
      router.push('/');
      router.refresh();
    } catch {
      setError('Something went wrong. Please try again.');
      setSubmitting(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    const { error: socialError } = await authClient.signIn.social({
      provider: 'google',
      callbackURL: '/',
    });

    if (socialError) {
      setError(authErrorMessage(socialError, 'Could not continue with Google.'));
    }
  }

  return (
    <AuthCard title="Sign in" subtitle="Pick up where you left off.">
      <form className="flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
        <div className="flex flex-col gap-4">
          <AuthField
            id="email"
            label="Email"
            type="email"
            name="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <AuthField
            id="password"
            label="Password"
            type="password"
            name="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>

        <div className="flex justify-end">
          {/* No destination in the design (A32); points at Neon's own page so
              nothing breaks. */}
          <Link
            href="/auth/forgot-password"
            className="text-[13px] leading-none font-semibold text-accent"
          >
            Forgot password?
          </Link>
        </div>

        {error && (
          <p role="alert" className="text-[13px] leading-[1.5] text-accent">
            {error}
          </p>
        )}

        <AuthButton type="submit" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </AuthButton>

        <AuthDivider />

        {/* Requires the Google provider to be enabled in the Neon Auth instance
            (FIL-19); the button surfaces any provider error inline. */}
        <AuthButton variant="secondary" onClick={handleGoogle}>
          Continue with Google
        </AuthButton>

        <div className="flex items-center justify-center gap-1.5 text-[14px]">
          <span className="leading-[1.5] text-text-tertiary">New here?</span>
          <Link href="/auth/sign-up" className="font-semibold text-accent">
            Create an account
          </Link>
        </div>
      </form>
    </AuthCard>
  );
}
