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
 * The four designed failure states (frames 22-25 · REG-5 to REG-8, FIL-18) reuse
 * the field-error pattern from FIL-16: taken email, weak password (its message
 * replaces the helper), unchecked consent, and blank name. Every failing field
 * shows its own message; the weak-password error is validated client-side, the
 * taken-email error comes back from Neon Auth. On success it lands on the
 * Dashboard; onboarding routing (A31) waits on FIL-21+.
 */
export function SignUpForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [consent, setConsent] = useState(false);

  const [nameError, setNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [consentError, setConsentError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNameError(null);
    setEmailError(null);
    setPasswordError(null);
    setConfirmError(null);
    setConsentError(null);
    setFormError(null);

    // Validate every field first, so several bad fields each show their own
    // message rather than one at a time (working decision on top of FIL-18).
    let invalid = false;
    if (!name.trim()) {
      setNameError('Enter your name.');
      invalid = true;
    }
    if (!email.trim()) {
      setEmailError('Enter your email.');
      invalid = true;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setPasswordError('Password must be at least 8 characters.');
      invalid = true;
    } else if (password !== confirmPassword) {
      // Confirm field is not in frame 21; added on request (see FIL-17 note).
      setConfirmError('Passwords do not match.');
      invalid = true;
    }
    if (!consent) {
      setConsentError('Please accept the Terms to continue.');
      invalid = true;
    }
    if (invalid) return;

    setSubmitting(true);

    try {
      const { error: signUpError } = await authClient.signUp.email({ name, email, password });

      if (signUpError) {
        if (signUpError.code === 'USER_ALREADY_EXISTS') {
          setEmailError('This email is already registered. Sign in instead?');
        } else {
          setFormError(
            authErrorMessage(signUpError, 'Could not create your account. Please try again.'),
          );
        }
        setSubmitting(false);
        return;
      }

      // TODO(FIL-21+): send new accounts into onboarding once those screens exist.
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
            error={nameError ?? undefined}
            onChange={(event) => {
              setName(event.target.value);
              if (nameError) setNameError(null);
            }}
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
            autoComplete="new-password"
            placeholder="••••••••"
            hint="At least 8 characters."
            error={passwordError ?? undefined}
            minLength={MIN_PASSWORD_LENGTH}
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              if (passwordError) setPasswordError(null);
            }}
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
            error={confirmError ?? undefined}
            minLength={MIN_PASSWORD_LENGTH}
            value={confirmPassword}
            onChange={(event) => {
              setConfirmPassword(event.target.value);
              if (confirmError) setConfirmError(null);
            }}
            required
          />
        </div>

        <div className="flex flex-col gap-[7px]">
          <div className="flex items-center gap-2.5">
            <input
              id="consent"
              type="checkbox"
              aria-invalid={consentError ? true : undefined}
              aria-describedby={consentError ? 'consent-error' : undefined}
              className="size-[18px] shrink-0 rounded accent-accent"
              checked={consent}
              onChange={(event) => {
                setConsent(event.target.checked);
                if (consentError) setConsentError(null);
              }}
            />
            <label
              htmlFor="consent"
              className="flex-1 text-[13px] leading-[1.5] text-text-secondary"
            >
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
          {consentError && (
            <p
              id="consent-error"
              role="alert"
              className="text-[13px] leading-[1.5] text-danger-text"
            >
              {consentError}
            </p>
          )}
        </div>

        {formError && (
          <p role="alert" className="text-[13px] leading-[1.5] text-danger-text">
            {formError}
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
