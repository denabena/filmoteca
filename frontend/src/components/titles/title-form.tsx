'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { createTitle, updateTitle } from '@/app/(shell)/titles/actions';
import { Icon } from '@/components/dashboard/icon';
import type { GenreOption, TitleDetail } from '@/lib/dashboard';

/**
 * The Add title form (08) **and** the Edit title form (09). FIL-58 to FIL-60,
 * FIL-61.
 *
 * **One component, not two, and EDT-3 is why.** It says every Add title rule
 * applies to Edit, and two copies of a form are how the two screens end up
 * disagreeing: someone adds a field to Add, Edit silently keeps saving without
 * it, and the bug reads as "editing loses my data". The backend made the same
 * call for the same reason, with one `parseTitlePayload` behind both endpoints.
 *
 * What differs between the two is genuinely small and is all driven by whether a
 * `title` was passed: the heading, the submit label, the action called, and the
 * presence of the danger action in the footer. Everything else, every field,
 * every rule and every error string, is shared by construction.
 *
 * ADD-6: name, type, genre and status are required. A20 ties watch date and
 * rating to nothing, so both stay optional and editable whatever the status is.
 * A21 allows half stars, which is why the rating input steps in halves and is
 * sent as whole units of a half (0 to 10).
 */
export function TitleForm({
  genres,
  title,
  dismissable = false,
}: {
  genres: GenreOption[];
  /**
   * The title being edited, or absent when adding (FIL-61).
   *
   * Its presence is the whole mode switch. Every field below reads its default
   * from here, which is what "prefilled with that title's stored values" means:
   * the form shows what is stored, full stop. A29 and EDT-4 note that frame 09
   * draws an empty Note for a title frame 07 shows carrying one; that is a mock
   * inconsistency, not a rule, and a prefilled form showing a saved note is the
   * only sensible reading. **Worth flagging to the designer.**
   */
  title?: TitleDetail;
  /**
   * True when this form is inside the `@modal` intercepting route (FIL-28,
   * FIL-44). Cancel then closes the modal via history instead of navigating to
   * the dashboard, which is what "over the Library" requires: cancelling out of
   * a modal opened from /library must put you back on /library, not on /.
   *
   * Defaults to false so the standalone /titles/new page keeps the exact
   * behaviour it shipped with.
   */
  dismissable?: boolean;
}) {
  const router = useRouter();
  const editing = title !== undefined;
  const [rating, setRating] = useState<number | null>(title?.rating ?? null);
  const [favorite, setFavorite] = useState(title?.favorite ?? false);
  const [errorFields, setErrorFields] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(form: FormData) {
    setMessage(null);

    startTransition(async () => {
      const input = {
        name: String(form.get('name') ?? ''),
        type: String(form.get('type') ?? ''),
        status: String(form.get('status') ?? ''),
        genreId: String(form.get('genreId') ?? ''),
        watchDate: (form.get('watchDate') as string) || null,
        rating,
        note: (form.get('note') as string) || null,
        favorite,
      };

      const failure = editing ? await updateTitle(title.id, input) : await createTitle(input);

      // Both redirect on success, so reaching here means the save failed.
      setErrorFields(failure.fields);
      setMessage(failure.message);
    });
  }

  const invalid = (field: string) =>
    errorFields.includes(field) ? 'border-status-warning-text' : 'border-border-strong';

  return (
    <form
      action={submit}
      className="bg-surface-card border-border-default flex w-full max-w-[520px] flex-col gap-[16px] rounded-[18px] border p-4 sm:p-[28px]"
    >
      <div className="flex items-center justify-between">
        <h1 className="font-display text-[20px] leading-[1.22] font-bold tracking-[-0.1px]">
          {editing ? 'Edit title' : 'Add title'}
        </h1>
        {/*
          Named "Close", not "Cancel". The footer already has a Cancel and two
          controls sharing one accessible name is unusable by voice control and
          confusing in a screen reader's element list: "click Cancel" becomes
          ambiguous. They also do subtly different things once this form has a
          delete action in it, so one name for both was never right.
        */}
        {dismissable ? (
          <button
            type="button"
            onClick={() => router.back()}
            className="text-text-tertiary text-[13px]"
            aria-label="Close"
          >
            ✕
          </button>
        ) : (
          <Link
            href={editing ? `/titles/${title.id}` : '/'}
            className="text-text-tertiary text-[13px]"
            aria-label="Close"
          >
            ✕
          </Link>
        )}
      </div>

      <Field label="Title" htmlFor="name">
        <input
          id="name"
          name="name"
          required
          defaultValue={title?.name}
          placeholder="Dune: Part Two"
          className={`bg-surface-card-raised text-text-primary w-full rounded-[10px] border px-[14px] py-[11px] text-[14px] ${invalid('name')}`}
        />
      </Field>

      <div className="flex gap-[16px]">
        <Field label="Type" htmlFor="type" className="flex-1">
          <Select
            id="type"
            name="type"
            className={invalid('type')}
            defaultValue={title?.type ?? 'movie'}
          >
            <option value="movie">Movie</option>
            <option value="series">Series</option>
          </Select>
        </Field>
        <Field label="Genre" htmlFor="genreId" className="flex-1">
          <Select
            id="genreId"
            name="genreId"
            className={invalid('genreId')}
            defaultValue={title?.genreId ?? ''}
          >
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
            defaultValue={title?.status ?? 'want_to_watch'}
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
            // Stored as a full ISO timestamp; the input wants YYYY-MM-DD.
            defaultValue={title?.watchDate?.slice(0, 10) ?? ''}
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
          defaultValue={title?.note ?? ''}
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

      {/*
        Frame 09 puts the danger action on the left and the two safe ones on the
        right, which is the point of the split rather than a layout preference:
        the destructive control is nowhere near the button a user reaches for by
        muscle memory. `justify-between` with an empty left slot keeps Cancel and
        Save in exactly the same place on the Add form.
      */}
      <div className="flex items-center justify-between gap-[10px]">
        <div>{editing && <DeleteAction titleId={title.id} />}</div>

        <div className="flex items-center gap-[10px]">
          {dismissable ? (
            <button
              type="button"
              onClick={() => router.back()}
              className="bg-surface-card-raised border-border-strong text-text-primary rounded-[12px] border px-[20px] py-[13px] text-[14px] font-semibold"
            >
              Cancel
            </button>
          ) : (
            <Link
              href={editing ? `/titles/${title.id}` : '/'}
              className="bg-surface-card-raised border-border-strong text-text-primary rounded-[12px] border px-[20px] py-[13px] text-[14px] font-semibold"
            >
              Cancel
            </Link>
          )}
          <button
            type="submit"
            disabled={isPending}
            className="bg-accent text-text-on-accent rounded-[12px] px-[20px] py-[13px] text-[14px] font-semibold disabled:opacity-60"
          >
            {isPending ? (editing ? 'Saving…' : 'Adding…') : editing ? 'Save changes' : 'Add title'}
          </button>
        </div>
      </div>
    </form>
  );
}

/**
 * The Edit modal's "Delete title" action (EDT-2 · FIL-61).
 *
 * A `Link` rather than a button, and to a real route, for the same reason "Add
 * title" is: `/titles/{id}/delete` is intercepted into a dialog on a client
 * navigation and serves the full confirmation on a hard load, so the same
 * control works from both. **The dialog behind it is FIL-63's**; this ticket
 * owns only the way in.
 *
 * A text action rather than a filled button, per frame 09: it is the one control
 * here that destroys data, and giving it the visual weight of a primary would
 * put it in competition with Save changes.
 */
function DeleteAction({ titleId }: { titleId: string }) {
  return (
    <Link
      href={`/titles/${titleId}/delete`}
      className="text-accent flex items-center gap-[7px] rounded-[8px] py-[6px] text-[13px] font-semibold outline-offset-2 focus-visible:outline-2 focus-visible:outline-accent"
    >
      <span aria-hidden="true">🗑</span>
      Delete title
    </Link>
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
