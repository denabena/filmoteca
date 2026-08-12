'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { AuthButton } from '@/components/auth/auth-button';
import { AuthCard } from '@/components/auth/auth-card';
import { AuthDivider } from '@/components/auth/auth-divider';
import { AuthField } from '@/components/auth/auth-field';
import { authClient } from '@/lib/auth/client';
import { authErrorMessage, signInFieldError } from '@/lib/auth/errors';

/**
 * The designed Sign in screen (Figma frame 18 · SGN-1, SGN-3, SGN-7), replacing
 * Neon Auth's generic AuthView for this one path. A static segment, so it wins
 * over the `[path]` catch-all that still serves forgot-password and the rest.
 *
 * Wired to Neon Auth's email sign-in. The two designed failure states (frames 19
 * and 20, SGN-4/SGN-5) mark the offending field: `signInFieldError` picks Email
 * or Password and only one is ever marked. Network/unexpected failures fall back
 * to a form-level message.
 */
export function SignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEmailError(null);
    setPasswordError(null);
    setFormError(null);
    setSubmitting(true);

    try {
      const { error: signInError } = await authClient.signIn.email({ email, password });

      if (signInError) {
        // Mark the offending field and reset immediately, so the reason shows at
        // once and the button leaves its "Signing in…" state. Only one field is
        // ever marked, per the design.
        const { field, message } = signInFieldError(signInError);
        setEmailError(field === 'email' ? message : null);
        setPasswordError(field === 'password' ? message : null);
        setSubmitting(false);
        return;
      }

      // A full navigation so the shell's Server Component re-reads the new session.
      router.push('/');
      router.refresh();
    } catch {
      setFormError('Something went wrong. Please try again.');
      setSubmitting(false);
    }
  }

  async function handleGoogle() {
    setFormError(null);
    const { error: socialError } = await authClient.signIn.social({
      provider: 'google',
      callbackURL: '/',
    });

    if (socialError) {
      setFormError(authErrorMessage(socialError, 'Could not continue with Google.'));
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
            error={emailError ?? undefined}
            onChange={(event) => {
              setEmail(event.target.value);
              if (emailError) setEmailError(null);
            }}
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
            error={passwordError ?? undefined}
            onChange={(event) => {
              setPassword(event.target.value);
              if (passwordError) setPasswordError(null);
            }}
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

        {formError && (
          <p role="alert" className="text-[13px] leading-[1.5] text-danger-text">
            {formError}
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
