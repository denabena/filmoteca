import { Icon } from '@/components/dashboard/icon';
import { Poster } from '@/components/dashboard/poster';
import type { GenreOption, TitleDetail } from '@/lib/dashboard';
import { formatRuntime, genreColorClass, STATUS_LABEL, toStars } from '@/lib/dashboard';

/**
 * One title in full (07): the main card with the note, and the details column.
 *
 * **The "Genres & lists" card shows only the genre.** The design also draws
 * "Epic", "Rewatch" and "2024 favorites" chips, but A17 makes those display-only
 * with no editor anywhere, so there is no field to read them from. Rendering
 * invented chips would imply a feature that does not exist.
 */
export function TitleDetailCard({
  title,
  genre,
}: {
  title: TitleDetail;
  genre: GenreOption | null;
}) {
  const stars = toStars(title.rating);
  const runtime = formatRuntime(title.runtime);
  const meta = [title.year, runtime, title.director && `Directed by ${title.director}`]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="rise flex w-full items-start gap-[20px]">
      <section className="bg-surface-card border-border-default flex flex-1 items-start gap-[28px] rounded-[18px] border p-[24px]">
        <Poster
          posterPath={title.posterPath}
          name={title.name}
          className="h-[240px] w-[168px] shrink-0 rounded-[12px]"
        />

        <div className="flex min-w-0 flex-1 flex-col gap-[10px]">
          <p className="text-accent text-[11px] font-medium tracking-[0.88px]">
            {[genre?.name.toUpperCase(), title.type === 'movie' ? 'MOVIE' : 'SERIES']
              .filter(Boolean)
              .join(' · ')}
          </p>

          <h1 className="font-display text-[30px] leading-[1.1] font-bold tracking-[-0.45px]">
            {title.name}
          </h1>

          {/* Year, runtime and director are display-only (A17) and only ever
              populated by the Picker, so this line is often just the type. */}
          {meta && <p className="text-text-secondary text-[14px] leading-[1.5]">{meta}</p>}

          <div className="flex items-center gap-[10px]">
            <StatusChip status={title.status} />
            {title.favorite && (
              <span className="text-accent text-[13px]" title="Favorite">
                ♥<span className="sr-only">Favorite</span>
              </span>
            )}
          </div>

          {stars !== null && (
            <p className="flex items-center gap-[8px]" aria-label={`${stars} out of 5`}>
              <span className="flex gap-[3px]">
                {[1, 2, 3, 4, 5].map((position) => (
                  <Icon
                    key={position}
                    src={
                      position <= Math.round(stars)
                        ? '/icons/star-filled.svg'
                        : '/icons/star-empty.svg'
                    }
                    className="size-[15px]"
                  />
                ))}
              </span>
              <span className="text-text-secondary text-[13px]">{stars} / 5</span>
            </p>
          )}

          {/* A18: a title with no note hides the section rather than showing an
              empty heading. */}
          {title.note && (
            <div className="mt-[6px] flex flex-col gap-[6px]">
              <p className="text-text-tertiary text-[11px] font-medium tracking-[0.88px]">
                YOUR NOTE
              </p>
              <p className="text-text-secondary text-[14px] leading-[1.5]">{title.note}</p>
            </div>
          )}
        </div>
      </section>

      <div className="flex w-[300px] shrink-0 flex-col gap-[20px]">
        <section
          aria-labelledby="details-heading"
          className="bg-surface-card border-border-default flex flex-col gap-[12px] rounded-[16px] border px-[24px] py-[20px]"
        >
          <h2 id="details-heading" className="text-[16px] leading-[1.3] font-semibold">
            Details
          </h2>
          <dl className="flex flex-col gap-[10px] text-[13px]">
            <Row label="Type" value={title.type === 'movie' ? 'Movie' : 'Series'} />
            <Row label="Genre" value={genre?.name ?? '—'} />
            <Row label="Status" value={STATUS_LABEL[title.status]} accent />
            <Row label="Rating" value={stars === null ? '—' : `★ ${stars}`} />
            <Row label="Watch date" value={formatDate(title.watchDate)} />
            <Row label="Runtime" value={runtime ?? '—'} />
            <Row label="Added" value={formatDate(title.createdAt)} />
          </dl>
        </section>

        <section
          aria-labelledby="genres-heading"
          className="bg-surface-card border-border-default flex flex-col gap-[12px] rounded-[16px] border px-[24px] py-[20px]"
        >
          <h2 id="genres-heading" className="text-[16px] leading-[1.3] font-semibold">
            Genres &amp; lists
          </h2>
          <div className="flex flex-wrap gap-[8px]">
            {genre ? (
              <span className="bg-surface-card-raised border-border-strong flex items-center gap-[7px] rounded-full border px-[12px] py-[6px] text-[12px] font-medium">
                <span
                  className={`size-[8px] rounded-full ${genreColorClass(genre.colorSlot)}`}
                  aria-hidden="true"
                />
                {genre.name}
              </span>
            ) : (
              <p className="text-text-tertiary text-[13px]">No genre</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-[16px]">
      <dt className="text-text-tertiary">{label}</dt>
      <dd className={accent ? 'text-status-success-text font-medium' : 'font-medium'}>{value}</dd>
    </div>
  );
}

function StatusChip({ status }: { status: TitleDetail['status'] }) {
  // Only "Watching" has a designed tone (amber, on the hero). The other two use
  // the neutral surface until the designer says otherwise.
  const watching = status === 'watching';

  return (
    <span
      className={`flex items-center gap-[6px] rounded-full py-[5px] pr-[11px] pl-[10px] text-[12px] font-medium ${
        watching
          ? 'bg-status-warning-soft text-status-warning-text'
          : 'bg-surface-card-raised text-text-secondary'
      }`}
    >
      <span
        className={`size-[7px] rounded-full ${watching ? 'bg-status-warning' : 'bg-status-success'}`}
        aria-hidden="true"
      />
      {STATUS_LABEL[status]}
    </span>
  );
}

/** Dates come back as ISO strings; the design writes them as "Oct 12, 2024". */
function formatDate(value: string | null): string {
  if (!value) return '—';

  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
