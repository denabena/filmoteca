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

const MIN_PASSWORD_LENGTH = 8;

/**
 * The designed Create account screen (Figma frame 21 · REG-1, REG-2, REG-3,
 * REG-10, REG-11), replacing Neon Auth's generic view for /auth/sign-up.
 *
 * Wired to Neon Auth's email sign-up. The four designed error states (short
 * password, taken email, blank name, missing consent as distinct messages) are
 * FIL-18; this ships the happy path plus one plain message and the client-side
 * guards the form needs to be usable. On success it lands on the Dashboard;
 * routing into onboarding (A31) waits on the onboarding screens (FIL-21 onward).
 */
export function SignUpForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!consent) {
      setError('Please accept the Terms and Privacy Policy to continue.');
      return;
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError('Password must be at least 8 characters.');
      return;
    }

    // Not in the Figma design (frame 21 has one password field); added on
    // request. Raise with the designer before this ships (see note on FIL-17).
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);

    try {
      const { error: signUpError } = await authClient.signUp.email({ name, email, password });

      if (signUpError) {
        setError(authErrorMessage(signUpError, 'Could not create your account. Please try again.'));
        setSubmitting(false);
        return;
      }

      // TODO(FIL-21+): send new accounts into onboarding once those screens exist.
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
    <AuthCard title="Create your account" subtitle="Start tracking what you want to watch.">
      <form className="flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
        <div className="flex flex-col gap-4">
          <AuthField
            id="name"
            label="Name"
            type="text"
            name="name"
            autoComplete="name"
            placeholder="Alex Rivera"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
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
            autoComplete="new-password"
            placeholder="••••••••"
            hint="At least 8 characters."
            minLength={MIN_PASSWORD_LENGTH}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          {/* Confirm field is not in frame 21; added on request (see FIL-17 note). */}
          <AuthField
            id="confirm-password"
            label="Confirm password"
            type="password"
            name="confirmPassword"
            autoComplete="new-password"
            placeholder="••••••••"
            minLength={MIN_PASSWORD_LENGTH}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
          />
        </div>

        <div className="flex items-center gap-2.5">
          <input
            id="consent"
            type="checkbox"
            className="size-[18px] shrink-0 rounded accent-accent"
            checked={consent}
            onChange={(event) => setConsent(event.target.checked)}
          />
          <label htmlFor="consent" className="flex-1 text-[13px] leading-[1.5] text-text-secondary">
            I agree to the{' '}
            {/* No designed destination (A34); render as links that do not navigate. */}
            <button type="button" className="font-medium text-accent">
              Terms
            </button>{' '}
            and{' '}
            <button type="button" className="font-medium text-accent">
              Privacy Policy
            </button>
          </label>
        </div>

        {error && (
          <p role="alert" className="text-[13px] leading-[1.5] text-accent">
            {error}
          </p>
        )}

        <AuthButton type="submit" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Create account'}
        </AuthButton>

        <AuthDivider />

        {/* Requires the Google provider to be enabled in the Neon Auth instance
            (FIL-19); the button surfaces any provider error inline. */}
        <AuthButton variant="secondary" onClick={handleGoogle}>
          Continue with Google
        </AuthButton>

        <div className="flex items-center justify-center gap-1.5 text-[14px]">
          <span className="leading-[1.5] text-text-tertiary">Already have an account?</span>
          <Link href="/auth/sign-in" className="font-semibold text-accent">
            Sign in
          </Link>
        </div>
      </form>
    </AuthCard>
  );
}
