'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { createTitle } from '@/app/(shell)/titles/actions';
import { Icon } from '@/components/dashboard/icon';
import type { GenreOption } from '@/lib/dashboard';

/**
 * The Add title form (08). FIL-58, FIL-59, FIL-60.
 *
 * ADD-6: name, type, genre and status are required. A20 ties watch date and
 * rating to nothing, so both stay optional and editable whatever the status is.
 * A21 allows half stars, which is why the rating input steps in halves and is
 * sent as whole units of a half (0 to 10).
 */
export function AddTitleForm({ genres }: { genres: GenreOption[] }) {
  const [rating, setRating] = useState<number | null>(null);
  const [favorite, setFavorite] = useState(false);
  const [errorFields, setErrorFields] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(form: FormData) {
    setMessage(null);

    startTransition(async () => {
      const failure = await createTitle({
        name: String(form.get('name') ?? ''),
        type: String(form.get('type') ?? ''),
        status: String(form.get('status') ?? ''),
        genreId: String(form.get('genreId') ?? ''),
        watchDate: (form.get('watchDate') as string) || null,
        rating,
        note: (form.get('note') as string) || null,
        favorite,
      });

      // A successful create redirects, so reaching here means it failed.
      setErrorFields(failure.fields);
      setMessage(failure.message);
    });
  }

  const invalid = (field: string) =>
    errorFields.includes(field) ? 'border-status-warning-text' : 'border-border-strong';

  return (
    <form
      action={submit}
      className="bg-surface-card border-border-default flex w-[520px] flex-col gap-[16px] rounded-[18px] border p-[28px]"
    >
      <div className="flex items-center justify-between">
        <h1 className="font-display text-[20px] leading-[1.22] font-bold tracking-[-0.1px]">
          Add title
        </h1>
        <Link href="/" className="text-text-tertiary text-[13px]" aria-label="Cancel">
          ✕
        </Link>
      </div>

      <Field label="Title" htmlFor="name">
        <input
          id="name"
          name="name"
          required
          placeholder="Dune: Part Two"
          className={`bg-surface-card-raised text-text-primary w-full rounded-[10px] border px-[14px] py-[11px] text-[14px] ${invalid('name')}`}
        />
      </Field>

      <div className="flex gap-[16px]">
        <Field label="Type" htmlFor="type" className="flex-1">
          <Select id="type" name="type" className={invalid('type')} defaultValue="movie">
            <option value="movie">Movie</option>
            <option value="series">Series</option>
          </Select>
        </Field>
        <Field label="Genre" htmlFor="genreId" className="flex-1">
          <Select id="genreId" name="genreId" className={invalid('genreId')} defaultValue="">
            <option value="" disabled>
              Choose a genre
            </option>
            {genres.map((genre) => (
              <option key={genre.id} value={genre.id}>
                {genre.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="flex gap-[16px]">
        <Field label="Status" htmlFor="status" className="flex-1">
          <Select
            id="status"
            name="status"
            className={invalid('status')}
            defaultValue="want_to_watch"
          >
            <option value="want_to_watch">Want to watch</option>
            <option value="watching">Watching</option>
            <option value="watched">Watched</option>
          </Select>
        </Field>
        <Field label="Watch date" htmlFor="watchDate" className="flex-1">
          <input
            id="watchDate"
            name="watchDate"
            type="date"
            className={`bg-surface-card-raised text-text-primary w-full rounded-[10px] border px-[14px] py-[11px] text-[14px] ${invalid('watchDate')}`}
          />
        </Field>
      </div>

      <Field label="Rating" htmlFor="rating">
        <StarInput value={rating} onChange={setRating} />
      </Field>

      <Field label="Note" htmlFor="note">
        <textarea
          id="note"
          name="note"
          rows={3}
          placeholder="Add a note or first impression..."
          className="bg-surface-card-raised border-border-strong text-text-primary w-full rounded-[10px] border px-[14px] py-[11px] text-[14px]"
        />
      </Field>

      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-[2px]">
          <span className="text-[13px] font-medium">Mark as favorite</span>
          <span className="text-text-tertiary text-[11.5px]">
            Show this title in your favorites
          </span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={favorite}
          aria-label="Mark as favorite"
          onClick={() => setFavorite((current) => !current)}
          className={`h-[26px] w-[46px] rounded-full p-[3px] transition-colors ${
            favorite ? 'bg-accent' : 'bg-surface-elevated'
          }`}
        >
          <span
            className={`block size-[20px] rounded-full bg-white transition-transform ${
              favorite ? 'translate-x-[20px]' : ''
            }`}
          />
        </button>
      </div>

      {message && (
        <p role="alert" className="text-status-warning-text text-[13px]">
          {message}
        </p>
      )}

      <div className="flex items-center justify-end gap-[10px]">
        <Link
          href="/"
          className="bg-surface-card-raised border-border-strong text-text-primary rounded-[12px] border px-[20px] py-[13px] text-[14px] font-semibold"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={isPending}
          className="bg-accent text-text-on-accent rounded-[12px] px-[20px] py-[13px] text-[14px] font-semibold disabled:opacity-60"
        >
          {isPending ? 'Adding…' : 'Add title'}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-[6px] ${className ?? ''}`}>
      <label htmlFor={htmlFor} className="text-text-secondary text-[13px] font-medium">
        {label}
      </label>
      {children}
    </div>
  );
}

function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`bg-surface-card-raised text-text-primary w-full appearance-none rounded-[10px] border px-[14px] py-[11px] text-[14px] ${className ?? ''}`}
    >
      {children}
    </select>
  );
}

/**
 * Five stars in half steps (A21).
 *
 * Stored and sent as whole units of a half, 0 to 10, matching the column. A
 * range input rather than clickable stars: half-star hit targets are 7px wide,
 * and this is keyboard-operable for free.
 */
function StarInput({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  const stars = value === null ? 0 : value / 2;

  return (
    <div className="bg-surface-card-raised border-border-strong flex items-center gap-[12px] rounded-[10px] border px-[14px] py-[9px]">
      <span className="flex gap-[3px]" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((position) => (
          <Icon
            key={position}
            src={position <= Math.round(stars) ? '/icons/star-filled.svg' : '/icons/star-empty.svg'}
            className="size-[15px]"
          />
        ))}
      </span>
      <input
        id="rating"
        type="range"
        min={0}
        max={10}
        step={1}
        value={value ?? 0}
        onChange={(event) => {
          const next = Number(event.target.value);
          // Zero means "not rated" rather than a zero-star review: there is no
          // designed way to say "I watched it and it was worth nothing".
          onChange(next === 0 ? null : next);
        }}
        aria-label="Rating out of 5"
        className="accent-accent flex-1"
      />
      <span className="text-text-secondary w-[52px] text-[13px]">
        {value === null ? '— / 5' : `${stars} / 5`}
      </span>
    </div>
  );
}
