import Link from 'next/link';
import type { ContinueWatchingTitle } from '@/lib/dashboard';
import { Poster } from './poster';
import { Icon } from './icon';

/**
 * The continue-watching hero (DSH-1, FIL-34) and its empty state (FIL-35).
 *
 * One component with two branches rather than two exported components: the frame
 * is the same box, the same size and the same position in the page, and the empty
 * variant is a designed state of this card rather than a different card.
 */
export function ContinueWatchingHero({ title }: { title: ContinueWatchingTitle | null }) {
  return title ? <FilledHero title={title} /> : <EmptyHero />;
}

/** Shared shell, so the two states cannot drift apart in size or padding. */
function HeroFrame({ children }: { children: React.ReactNode }) {
  return (
    <section
      aria-labelledby="continue-watching-heading"
      className="border-border-default relative h-[264px] w-full overflow-hidden rounded-[18px] border bg-gradient-to-r from-[#181c22] to-[#201c34]"
    >
      {children}
    </section>
  );
}

function FilledHero({ title }: { title: ContinueWatchingTitle }) {
  // "{year} · {genre} · {type}". A hand-typed title has no year (A17), and the
  // design has no placeholder for that, so the segment is dropped rather than
  // rendered as a dash nobody drew.
  const meta = [title.year, title.genre, title.type === 'movie' ? 'Movie' : 'Series']
    .filter(Boolean)
    .join(' · ');

  return (
    <HeroFrame>
      <div className="absolute top-[29px] left-[39px] flex flex-col gap-[11px]">
        <p className="text-accent text-[11px] font-medium tracking-[0.88px]">CONTINUE WATCHING</p>
        <h2
          id="continue-watching-heading"
          className="font-display text-[42px] leading-[1.04] font-bold tracking-[-0.84px]"
        >
          {title.name}
        </h2>
        <div className="flex items-center gap-[12px]">
          <p className="text-text-secondary text-[14px] leading-[1.5]">{meta}</p>
          <span className="bg-status-warning-soft text-status-warning-text flex items-center gap-[6px] rounded-full py-[5px] pr-[11px] pl-[10px] text-[12px] font-medium">
            <span className="bg-status-warning size-[7px] rounded-full" aria-hidden="true" />
            Watching
          </span>
        </div>

        {/*
         * The design draws a progress bar and "Season 2 · Episode 4 of 10 · 60%"
         * here, and FIL-34's own title asks for it. It is deliberately absent.
         *
         * A9: season, episode and percent are display-only, and no form anywhere
         * in the app captures them, so there is no field to read. The backend
         * returns none for the same reason. Rendering a bar would mean inventing
         * a number and showing every user the same fictional 60%.
         *
         * When a form for progress is designed, this is where the bar goes.
         */}

        <div className="mt-[8px] flex items-center gap-[12px]">
          {/*
           * A10: "Resume" has no designed destination and no player exists in the
           * file. Disabled rather than omitted, because removing it would change a
           * layout the designer drew; disabled says "not yet" rather than lying.
           */}
          <button
            type="button"
            disabled
            title="Playback is not designed yet (A10)"
            className="bg-accent text-text-on-accent flex cursor-not-allowed items-center gap-[9px] rounded-[12px] py-[13px] pr-[22px] pl-[20px] text-[14px] font-semibold opacity-60"
          >
            <Icon src="/icons/play.svg" className="h-[14px] w-[11px]" />
            Resume
          </button>
          <Link
            href="/library"
            className="bg-surface-card-raised border-border-strong text-text-primary rounded-[12px] border px-[20px] py-[13px] text-[14px] font-semibold"
          >
            Details
          </Link>
        </div>
      </div>

      <div className="absolute top-1/2 right-[47px] -translate-y-1/2">
        <Poster
          posterPath={title.posterPath}
          name={title.name}
          className="h-[208px] w-[148px] rounded-[10px]"
        />
      </div>
    </HeroFrame>
  );
}

/**
 * "Nothing playing right now" (FIL-35).
 *
 * The overline is tertiary rather than accent here, unlike the filled state: an
 * empty slot should not shout in the brand colour.
 */
function EmptyHero() {
  return (
    <HeroFrame>
      <div className="absolute top-[29px] left-[39px] flex max-w-[420px] flex-col gap-[11px]">
        <p className="text-text-tertiary text-[11px] font-medium tracking-[0.88px]">
          NOTHING IN PROGRESS
        </p>
        <h2
          id="continue-watching-heading"
          className="font-display text-[30px] leading-[1.1] font-bold tracking-[-0.45px]"
        >
          Nothing playing right now
        </h2>
        <p className="text-text-secondary text-[14px] leading-[1.5]">
          Start a movie or show and you&rsquo;ll pick up right where you left off, right here.
        </p>
        <Link
          href="/library"
          className="bg-surface-card-raised border-border-strong text-text-primary mt-[8px] w-fit rounded-[12px] border px-[20px] py-[13px] text-[14px] font-semibold"
        >
          Browse watchlist
        </Link>
      </div>

      <div className="bg-surface-muted absolute top-1/2 right-[47px] h-[208px] w-[148px] -translate-y-1/2 rounded-[10px]" />
    </HeroFrame>
  );
}
