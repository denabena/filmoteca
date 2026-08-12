import type { ReactNode } from 'react';

/**
 * The page header every routed view sits under (SHL-2 · FIL-28).
 *
 * One overline, one title, and a right-aligned slot for that view's actions. The
 * strings are **always** passed in: the dashboard, Library, Picker and Settings
 * each own their own copy inside their own epic, so hardcoding any of them here
 * would put four epics' text in one file and guarantee it drifts.
 *
 * Not a Client Component, and deliberately so. It holds no state, which lets a
 * Server Component (the Library page) and a Client Component (`DashboardView`,
 * which owns the month) render the same header without either one pulling the
 * other's boundary along with it. Anything interactive arrives already-built
 * through `actions`.
 *
 * `actions` is optional and renders nothing at all when absent, rather than an
 * empty flex row. With `justify-between` and a single child the overline and
 * title stay left-aligned exactly as they do with actions present, which is the
 * "still align as designed" criterion.
 */
export function PageHeader({
  overline,
  title,
  actions,
}: {
  overline: string;
  title: string;
  actions?: ReactNode;
}) {
  return (
    <header className="rise flex w-full items-center justify-between px-[40px] pt-[28px] pb-[18px]">
      <div className="flex flex-col gap-[3px]">
        <p className="text-text-secondary text-[13px] font-medium">{overline}</p>
        <h1 className="font-display text-[24px] leading-[1.16] font-bold tracking-[-0.24px]">
          {title}
        </h1>
      </div>
      {actions ? <div className="flex items-center gap-[12px]">{actions}</div> : null}
    </header>
  );
}
