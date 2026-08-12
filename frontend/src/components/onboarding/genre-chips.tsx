'use client';

import { GENRES } from '@/lib/genres';

/*
 * The multi-select genre chips from frame 03. An unselected chip shows a coloured
 * dot on Surface/Card Raised; a selected one shows a check and an accent border on
 * Brand/Accent Soft. Each chip is a toggle button (`aria-pressed`), so Tab moves
 * between them and Space/Enter toggles selection. Controlled: `value` is the list
 * of selected genre ids.
 */
interface GenreChipsProps {
  value: string[];
  onChange: (ids: string[]) => void;
}

function CheckIcon() {
  return (
    <svg width="11" height="9" viewBox="0 0 11 9" fill="none" aria-hidden="true">
      <path
        d="M1 4.5L4 7.5L10 1.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function GenreChips({ value, onChange }: GenreChipsProps) {
  const toggle = (id: string) =>
    onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);

  return (
    <div
      role="group"
      aria-label="Favorite genres"
      className="flex flex-wrap items-center justify-center gap-2.5"
    >
      {GENRES.map((genre) => {
        const selected = value.includes(genre.id);
        return (
          <button
            key={genre.id}
            type="button"
            aria-pressed={selected}
            onClick={() => toggle(genre.id)}
            className={`flex items-center gap-2 rounded-full py-2.5 pl-[14px] pr-4 outline-offset-2 focus-visible:outline-2 focus-visible:outline-accent ${
              selected
                ? 'border-[1.5px] border-accent bg-accent-soft text-accent'
                : 'border border-border-strong bg-surface-card-raised text-text-secondary'
            }`}
          >
            {selected ? (
              <CheckIcon />
            ) : (
              <span
                aria-hidden="true"
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: genre.color }}
              />
            )}
            <span className={selected ? 'text-[13px] font-semibold' : 'text-[14px] font-medium'}>
              {genre.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
