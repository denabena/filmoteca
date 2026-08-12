'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { AuthField } from '@/components/auth/auth-field';
import { useProfile } from '@/components/profile-provider';
import { ToggleSwitch } from '@/components/settings/toggle-switch';
import { GOAL_MAX, GOAL_MIN } from '@/components/goal-stepper';
import { SettingsCardsSkeleton } from '@/components/ui/settings-skeleton';
import { avatarInitials } from '@/lib/current-user';
import { fileToAvatarDataUrl } from '@/lib/image';

/**
 * The Settings screen (Figma frame 17), inside the app shell. Three cards
 * (Profile, Watch preferences, Genres) and a single "Save changes" that persists
 * everything through `PATCH /api/profile` and propagates a name/email change to
 * the sidebar via the shared ProfileProvider (SET-6, FIL-76-79).
 *
 * Working decisions flagged on the tickets: the shared page header (FIL-28) is
 * inlined until it exists; the genres count is title-derived (FIL-43) which is
 * not built, so it falls back to the count of chosen favourite genres; "Change
 * photo" and "Manage genres" have no designed destinations (A28). A live save
 * also needs the FIL-74/75 backend merged.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface ProfileResponse {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  monthlyWatchGoal: number;
  defaultType: 'movie' | 'series';
  newReleaseReminders: boolean;
  favoriteGenres: string[];
  avatarUrl: string | null;
}

interface FieldErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  monthlyWatchGoal?: string;
}

/**
 * The static header, shared by the loading and loaded states.
 *
 * Extracted rather than duplicated so the two branches below cannot drift: the
 * heading must not move or re-render when the profile arrives, or the whole page
 * appears to reload.
 */
function SettingsHeader() {
  return (
    <header className="flex flex-col gap-[3px] px-4 pt-6 pb-[18px] md:px-10 md:pt-7">
      <p className="text-text-secondary text-[13px] leading-none font-medium">Account</p>
      <h1 className="font-display text-text-primary text-[24px] leading-[1.16] font-bold tracking-[-0.24px]">
        Settings
      </h1>
    </header>
  );
}

/**
 * Inline validation message under a field. Kept local because the shared
 * field-error treatment (FIL-16) lands on a different branch; this reads the same
 * once both merge.
 */
function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-[13px] leading-[1.5] text-accent">
      {message}
    </p>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { setProfile } = useProfile();

  const [loading, setLoading] = useState(true);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [monthlyWatchGoal, setMonthlyWatchGoal] = useState('15');
  const [defaultType, setDefaultType] = useState<'movie' | 'series'>('movie');
  const [reminders, setReminders] = useState(false);
  const [genreCount, setGenreCount] = useState(0);
  const [avatarUrl, setAvatarUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await fetch('/api/profile', { cache: 'no-store' });
        if (!response.ok) throw new Error('load failed');
        const profile = (await response.json()) as ProfileResponse;
        if (!active) return;
        setFirstName(profile.firstName ?? '');
        setLastName(profile.lastName ?? '');
        setEmail(profile.email ?? '');
        setMonthlyWatchGoal(String(profile.monthlyWatchGoal ?? 15));
        setDefaultType(profile.defaultType ?? 'movie');
        setReminders(Boolean(profile.newReleaseReminders));
        setGenreCount(profile.favoriteGenres?.length ?? 0);
        setAvatarUrl(profile.avatarUrl ?? '');
      } catch {
        if (active) setFormError('Could not load your settings. Please refresh.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  function validate(): FieldErrors {
    const next: FieldErrors = {};
    if (!firstName.trim()) next.firstName = 'First name is required.';
    if (!lastName.trim()) next.lastName = 'Last name is required.';
    if (!EMAIL_PATTERN.test(email.trim())) next.email = 'Enter a valid email.';
    const goal = Number(monthlyWatchGoal);
    if (!Number.isInteger(goal) || goal < GOAL_MIN || goal > GOAL_MAX) {
      next.monthlyWatchGoal = `Enter a whole number from ${GOAL_MIN} to ${GOAL_MAX}.`;
    }
    return next;
  }

  async function handleSave() {
    setFormError(null);
    setSaved(false);

    const found = validate();
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }
    setErrors({});
    setSaving(true);

    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          monthlyWatchGoal: Number(monthlyWatchGoal),
          defaultType,
          newReleaseReminders: reminders,
          avatarUrl: avatarUrl || null,
        }),
      });

      if (!response.ok) {
        // Surface a taken email against its field; anything else is form-level.
        setFormError(
          response.status === 409 ? null : 'Could not save your changes. Please try again.',
        );
        if (response.status === 409) {
          setErrors({ email: 'This email is already in use.' });
        }
        setSaving(false);
        return;
      }

      // Propagate the identity change to the sidebar (SET-6); no per-screen copy
      // of the profile. Includes the avatar so a new or removed photo shows in
      // the footer immediately, without waiting for a reload.
      setProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        avatarUrl: avatarUrl || null,
      });
      setSaved(true);
      setSaving(false);
      router.refresh();
    } catch {
      setFormError('Something went wrong. Please try again.');
      setSaving(false);
    }
  }

  async function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Reset the input so picking the same file again still fires onChange.
    event.target.value = '';
    if (!file) return;

    setFormError(null);
    try {
      const dataUrl = await fileToAvatarDataUrl(file);
      setAvatarUrl(dataUrl);
      setSaved(false);
    } catch {
      setFormError('Could not read that image. Please try another.');
    }
  }

  const initials = avatarInitials({ firstName, lastName, email });

  /*
   * The fields are prefilled from `GET /api/profile`, so until it resolves there
   * is nothing to show but empty inputs. Rendering the skeleton instead does two
   * things: it stops Settings briefly looking like an account with no name, and it
   * means the real cards **mount** when the data lands, which is the only way the
   * `rise-list` stagger below can run at all. A CSS animation fires on mount;
   * values filling into an already-mounted form animate nothing (FIL-84).
   */
  if (loading) {
    return (
      <div className="flex flex-col">
        <SettingsHeader />
        <div className="px-10 pb-10">
          <SettingsCardsSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <SettingsHeader />

      <div className="px-10 pb-10">
        <div className="rise-list flex w-full max-w-[820px] flex-col gap-5">
          {/* Profile card (SET-1, SET-2). */}
          <section className="flex flex-col gap-[18px] rounded-2xl border border-border-default bg-surface-card px-7 pt-6 pb-[26px]">
            <h2 className="text-[18px] leading-[1.3] font-semibold tracking-[-0.18px] text-text-primary">
              Profile
            </h2>
            <div className="flex items-center gap-4">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt="Profile photo"
                  className="size-16 rounded-full object-cover"
                />
              ) : (
                <span
                  aria-hidden="true"
                  className="flex size-16 items-center justify-center rounded-full bg-surface-elevated text-[16px] font-semibold text-text-primary"
                >
                  {initials}
                </span>
              )}

              {/* Not in the design (A28 has no upload flow); added on request.
                  Downsized client-side and saved with the rest on Save changes. */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoChange}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-xl border border-border-strong bg-surface-card-raised px-5 py-[13px] text-[14px] font-semibold text-text-primary"
              >
                Change photo
              </button>
              {avatarUrl && (
                <button
                  type="button"
                  onClick={() => setAvatarUrl('')}
                  className="text-[14px] font-medium text-text-tertiary hover:text-text-primary"
                >
                  Remove
                </button>
              )}
            </div>
            <div className="flex gap-3.5">
              <div className="flex flex-1 flex-col gap-[7px]">
                <AuthField
                  id="firstName"
                  label="First name"
                  value={firstName}
                  onChange={(event) => {
                    setFirstName(event.target.value);
                    if (errors.firstName) setErrors((e) => ({ ...e, firstName: undefined }));
                  }}
                />
                <FieldError message={errors.firstName} />
              </div>
              <div className="flex flex-1 flex-col gap-[7px]">
                <AuthField
                  id="lastName"
                  label="Last name"
                  value={lastName}
                  onChange={(event) => {
                    setLastName(event.target.value);
                    if (errors.lastName) setErrors((e) => ({ ...e, lastName: undefined }));
                  }}
                />
                <FieldError message={errors.lastName} />
              </div>
            </div>
            <div className="flex flex-col gap-[7px]">
              <AuthField
                id="email"
                label="Email"
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  if (errors.email) setErrors((e) => ({ ...e, email: undefined }));
                }}
              />
              <FieldError message={errors.email} />
            </div>
          </section>

          {/* Watch preferences card (SET-3, SET-4). */}
          <section className="flex flex-col gap-[18px] rounded-2xl border border-border-default bg-surface-card px-7 pt-6 pb-[26px]">
            <h2 className="text-[18px] leading-[1.3] font-semibold tracking-[-0.18px] text-text-primary">
              Watch preferences
            </h2>
            <div className="flex gap-3.5">
              <div className="flex flex-1 flex-col gap-[7px]">
                <AuthField
                  id="monthlyWatchGoal"
                  label="Monthly watch goal"
                  type="number"
                  min={GOAL_MIN}
                  max={GOAL_MAX}
                  value={monthlyWatchGoal}
                  onChange={(event) => {
                    setMonthlyWatchGoal(event.target.value);
                    if (errors.monthlyWatchGoal)
                      setErrors((e) => ({ ...e, monthlyWatchGoal: undefined }));
                  }}
                />
                <FieldError message={errors.monthlyWatchGoal} />
              </div>
              <div className="flex flex-1 flex-col gap-[7px]">
                <label
                  htmlFor="defaultType"
                  className="text-[13px] leading-none font-medium text-text-secondary"
                >
                  Default type
                </label>
                <select
                  id="defaultType"
                  value={defaultType}
                  onChange={(event) => setDefaultType(event.target.value as 'movie' | 'series')}
                  className="w-full rounded-xl border border-border-strong bg-surface-card-raised px-4 py-[13px] text-[14px] leading-[1.5] text-text-primary outline-none focus-visible:border-accent"
                >
                  <option value="movie">Movie</option>
                  <option value="series">Series</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-between pt-1">
              <div className="flex flex-col gap-0.5">
                <p className="text-[14px] font-semibold text-text-primary">New release reminders</p>
                <p className="text-[13px] leading-[1.5] text-text-secondary">
                  Notify me when titles on my watchlist start streaming
                </p>
              </div>
              <ToggleSwitch
                checked={reminders}
                onChange={setReminders}
                label="New release reminders"
              />
            </div>
          </section>

          {/* Genres summary card (SET-5). Count is title-derived (FIL-43); until
              that exists it falls back to the chosen favourite genres. */}
          <section className="flex items-center justify-between rounded-2xl border border-border-default bg-surface-card px-7 py-6">
            <div className="flex flex-col gap-0.5">
              <h2 className="text-[16px] leading-[1.3] font-semibold tracking-[-0.08px] text-text-primary">
                Genres
              </h2>
              <p className="text-[13px] leading-[1.5] text-text-secondary">
                {genreCount} genres · organize how your library is grouped
              </p>
            </div>
            <Link
              href="/library"
              className="rounded-xl border border-border-strong bg-surface-card-raised px-5 py-[13px] text-[14px] font-semibold text-text-primary"
            >
              Manage genres
            </Link>
          </section>

          {formError && (
            <p role="alert" className="text-[13px] leading-[1.5] text-accent">
              {formError}
            </p>
          )}

          <div className="flex items-center justify-end gap-3">
            {saved && (
              <span role="status" className="text-[13px] text-text-secondary">
                Changes saved
              </span>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || loading}
              className="rounded-xl bg-accent px-5 py-[13px] text-[14px] font-semibold text-text-on-accent outline-offset-2 focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
