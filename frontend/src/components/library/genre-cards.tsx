import { Icon } from '@/components/dashboard/icon';
import { genreColorClass } from '@/lib/dashboard';
import { genreDescriptor, titleCountLabel, type GenreWithCount } from '@/lib/genres';

/**
 * The Genres tab's grid of cards (GEN-1, GEN-2, GEN-3 · FIL-50).
 *
 * **Every card is derived, and nothing here is a list.** A7 records the tension:
 * onboarding offers twelve genres and frame 12 draws eight cards. The eight are a
 * consequence of that mock's data, not a fixed set, so a genre appears once it
 * has a title and disappears with its last one, with no work on this side.
 * FIL-43's endpoint already omits the empties, which is why there is no filter
 * here.
 *
 * A29: the mock's counts total 36 across cards while frame 06 lists ten rows.
 * Illustrative only, so every number is computed.
 */
export function GenreCards({ genres }: { genres: GenreWithCount[] }) {
  /*
   * No genres-empty variant is designed (a gap the ticket names), and the tab is
   * reachable with an empty library. A plain line beats both an error and a blank
   * panel, and it deliberately does not repeat frame 13's "Add your first title"
   * call to action: the user is one tab away from that screen already.
   */
  if (genres.length === 0) {
    return (
      <div className="border-border-default text-text-secondary flex flex-1 items-center justify-center rounded-[18px] border border-dashed p-[40px] text-center text-[14px]">
        Genres appear here once you add titles.
      </div>
    );
  }

  return (
    <ul className="rise-list grid grid-cols-2 gap-[18px]">
      {genres.map((genre) => (
        <GenreCard key={genre.id} genre={genre} />
      ))}
    </ul>
  );
}

/**
 * One genre card.
 *
 * **Nothing on it is clickable, and that is deliberate (GEN-5 · A24, FIL-51).**
 * The card has no designed destination: there is no per-genre screen anywhere in
 * the file, so a click target here would promise a page that does not exist.
 * Note what is *absent* as a result: no `onClick`, no `cursor-pointer`, no hover
 * treatment. A card that lights up under the pointer and then does nothing is
 * the specific failure this ticket is guarding against, so the plain surface is
 * the feature.
 */
function GenreCard({ genre }: { genre: GenreWithCount }) {
  const descriptor = genreDescriptor(genre);

  return (
    <li className="bg-surface-card border-border-default flex flex-col gap-[16px] rounded-[16px] border p-[20px]">
      <div className="flex items-start gap-[14px]">
        <span
          className={`flex size-[40px] shrink-0 items-center justify-center rounded-[10px] ${genreColorClass(genre.colorSlot)}`}
          aria-hidden="true"
        >
          <Icon src="/icons/play.svg" className="h-[13px] w-[10px]" />
        </span>

        <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
          <h3 className="truncate text-[15px] leading-[1.3] font-semibold">{genre.name}</h3>
          {/*
            "1 title", not "1 titles". The mock has no single-title genre, so the
            wording is undrawn, and it is the kind of thing only ever noticed as a
            bug.
          */}
          <p className="text-text-tertiary text-[12.5px] leading-[1.3]">
            {titleCountLabel(genre.titleCount)}
          </p>
        </div>

        {/*
          Drawn but inert (GEN-5 · A24, FIL-51). The card kebab has no designed
          menu anywhere in the file, so there is nothing behind it.

          A `<span>`, not a disabled `<button>`, and the difference matters. A
          disabled button is still an announced control that happens to be
          unavailable; this is not a control at all, which is the truthful
          description of a mark with no behaviour designed for it. It is
          `aria-hidden`, so a screen reader passes over it rather than offering
          the user something they cannot complete, and it is not in the tab
          order.

          The mark still ships because the design draws it. **Removing it until a
          menu exists is the honest alternative and is a designer's call.**
        */}
        <span
          className="text-text-tertiary flex shrink-0 flex-col items-center gap-[3px] pt-[6px]"
          aria-hidden="true"
        >
          <span className="block size-[3px] rounded-full bg-current" />
          <span className="block size-[3px] rounded-full bg-current" />
          <span className="block size-[3px] rounded-full bg-current" />
        </span>
      </div>

      {/*
        Four of the twelve genres have no designed tagline, so their card renders
        without this line rather than with invented copy. See `lib/genres.ts`.
      */}
      {descriptor && (
        <p className="text-text-secondary text-[13.5px] leading-[1.4]">{descriptor}</p>
      )}
    </li>
  );
}
