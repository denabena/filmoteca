'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ComponentType } from 'react';
import { useProfile } from '@/components/profile-provider';
import { avatarInitials, shortName } from '@/lib/current-user';
import { DashboardIcon, LibraryIcon, PickerIcon, SceneLogo, SettingsIcon } from './icons';
import { SignOutButton } from './sign-out-button';

/*
 * The fixed sidebar every signed-in screen sits beside (SHL-1).
 *
 * A Client Component because the active item is derived from the current route
 * and the footer follows client-side profile state. It stays a leaf: page content
 * arrives through the layout's `children`, so nothing else is pulled into the
 * client bundle.
 *
 * **Below `md` it becomes a drawer, and that is undesigned.** The Figma file has
 * desktop frames only, so a 260px column permanently occupying a 390px phone was
 * never a decision anybody made. A drawer behind a top bar is the conventional
 * answer and keeps the desktop layout byte-identical: everything mobile-specific
 * here is a `md:` breakpoint away from what was already shipped.
 *
 * Worth a designer's eye on two points: the top bar's height (56px, chosen to
 * clear a thumb without eating the viewport) and the fact that the sign-out
 * control now lives inside the drawer on a phone rather than always on screen.
 */

interface NavItem {
  href: string;
  label: string;
  Icon: ComponentType<{ className?: string }>;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

// Sections, order and labels are exactly as designed (SHL-1).
const NAV_SECTIONS: NavSection[] = [
  {
    label: 'MENU',
    items: [
      { href: '/', label: 'Dashboard', Icon: DashboardIcon },
      { href: '/library', label: 'Library', Icon: LibraryIcon },
    ],
  },
  {
    label: 'ASSISTANT',
    items: [{ href: '/picker', label: 'Picker', Icon: PickerIcon }],
  },
  {
    label: 'ACCOUNT',
    items: [{ href: '/settings', label: 'Settings', Icon: SettingsIcon }],
  },
];

/**
 * Exactly one item may match. The dashboard is the index route, so it matches
 * only itself; every other item also matches its nested routes, so a title detail
 * page under /library keeps "Library" highlighted.
 */
function isActive(pathname: string, href: string): boolean {
  if (href === '/') {
    return pathname === '/';
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * The hamburger and the bar it sits in, mobile only.
 *
 * The wordmark is deliberately absent: the drawer already carries it, and a second
 * "Scene" on screen is a duplicate for a screen reader to read out. The mark alone
 * is enough of an anchor, and the button carries the accessible name.
 */
function MobileTopBar({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <header className="bg-surface-sidebar border-border-default fixed inset-x-0 top-0 z-30 flex h-[56px] items-center gap-3 border-b px-4 md:hidden">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls="app-sidebar"
        aria-label={open ? 'Close menu' : 'Open menu'}
        className="text-text-secondary hover:text-text-primary -ml-2 flex size-10 items-center justify-center rounded-[10px] outline-offset-2 focus-visible:outline-2 focus-visible:outline-accent"
      >
        {/* Two bars crossing into an X, so the control reads as a toggle rather
            than two different buttons swapping places. */}
        <span aria-hidden="true" className="relative block h-[12px] w-[18px]">
          <span
            className={`absolute left-0 block h-[2px] w-full rounded-full bg-current transition-transform duration-200 ${
              open ? 'top-[5px] rotate-45' : 'top-0'
            }`}
          />
          <span
            className={`absolute left-0 block h-[2px] w-full rounded-full bg-current transition-transform duration-200 ${
              open ? 'top-[5px] -rotate-45' : 'top-[10px]'
            }`}
          />
        </span>
      </button>

      <SceneLogo className="size-[28px] shrink-0" />
    </header>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { profile } = useProfile();
  const [open, setOpen] = useState(false);

  // Escape closes it, which is the one keyboard expectation an overlay cannot skip.
  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  return (
    <>
      <MobileTopBar open={open} onToggle={() => setOpen((current) => !current)} />

      {/*
        The scrim, mobile only.

        `aria-hidden` with `tabIndex={-1}` on purpose: tapping outside is a pointer
        affordance, and the same job is already done for a keyboard by Escape and by
        the toggle itself. Exposing it as a third control would put a second thing
        called "Close menu" in the accessibility tree, which is the ambiguity that
        makes voice control guess.
      */}
      {open ? (
        <button
          type="button"
          aria-hidden="true"
          tabIndex={-1}
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-20 bg-black/60 md:hidden"
        />
      ) : null}

      <aside
        id="app-sidebar"
        /*
         * Off-canvas below `md`, static from `md` up. `translate-x` rather than
         * `display` so it slides, and so the drawer's contents stay in the DOM:
         * `hidden` would drop focus wherever it happened to be.
         */
        className={`bg-surface-sidebar fixed inset-y-0 left-0 z-30 flex w-[260px] max-w-[85vw] flex-col justify-between overflow-y-auto px-4 pt-[26px] pb-[22px] transition-transform duration-200 md:z-10 md:max-w-none md:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/*
        The design lays the logo, the section labels and the items out as one
        column with a uniform 4px gap between every child, so the gap repeats at
        each nesting level here rather than only between items.
      */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-[11px] pb-[26px] pl-2">
            <SceneLogo className="size-[34px] shrink-0" />
            <span className="font-display text-[20px] leading-[normal] font-bold tracking-[-0.2px] text-text-primary">
              Scene
            </span>
          </div>

          <nav aria-label="Main" className="flex flex-col gap-1">
            {NAV_SECTIONS.map((section, sectionIndex) => (
              <div key={section.label} className="flex flex-col gap-1">
                <h2
                  id={`nav-section-${section.label.toLowerCase()}`}
                  // 13px line box, as measured in the design. `normal` computes to
                  // 14 here, and the extra pixel drifts every item below it.
                  className={`pl-2 pb-1.5 text-[11px] leading-[13px] font-medium tracking-[0.88px] text-text-tertiary ${
                    sectionIndex === 0 ? 'pt-0.5' : 'pt-[18px]'
                  }`}
                >
                  {section.label}
                </h2>
                <ul
                  aria-labelledby={`nav-section-${section.label.toLowerCase()}`}
                  className="flex flex-col gap-1"
                >
                  {section.items.map(({ href, label, Icon }) => {
                    const active = isActive(pathname, href);

                    return (
                      <li key={href}>
                        <Link
                          href={href}
                          /*
                           * Closes the drawer on a phone, where it covers the page
                           * the tap just asked for. A no-op above `md`, where the
                           * drawer is never open in the first place.
                           *
                           * On the link rather than in an effect watching the path:
                           * `setState` in an effect is what `react-hooks` flags, and
                           * rightly, since it renders twice to reach the same place.
                           */
                          onClick={() => setOpen(false)}
                          aria-current={active ? 'page' : undefined}
                          className={`flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[14px] leading-[normal] font-medium outline-offset-2 focus-visible:outline-2 focus-visible:outline-accent ${
                            active
                              ? 'bg-surface-card-raised text-text-primary [--icon-mask:var(--color-surface-card-raised)]'
                              : 'text-text-secondary [--icon-mask:var(--color-surface-sidebar)] hover:bg-surface-card-raised/40 hover:text-text-primary'
                          }`}
                        >
                          <Icon
                            className={`size-5 shrink-0 ${active ? 'text-accent' : 'text-text-tertiary'}`}
                          />
                          {label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        {/*
        Profile footer: the identity block with the sign-out control beside it
        (FIL-20 · SHL). The name/email column flexes so the button sits flush
        right without a fixed width.
      */}
        <div className="flex items-center gap-2.5 pt-4 pl-2">
          {profile.avatarUrl ? (
            // A user-uploaded data URL, not a remote asset, so next/image (which
            // needs a loader and known dimensions) buys nothing here.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatarUrl}
              alt=""
              aria-hidden="true"
              className="size-[34px] shrink-0 rounded-full object-cover"
            />
          ) : (
            <span
              aria-hidden="true"
              className="flex size-[34px] shrink-0 items-center justify-center rounded-full bg-surface-elevated text-[12px] leading-[normal] font-medium text-text-primary"
            >
              {avatarInitials(profile)}
            </span>
          )}
          <div className="flex min-w-0 flex-1 flex-col gap-px">
            <span className="truncate text-[13px] leading-[normal] font-semibold text-text-primary">
              {shortName(profile)}
            </span>
            <span className="truncate text-[11.5px] leading-[1.4] text-text-tertiary">
              {profile.email}
            </span>
          </div>
          <SignOutButton />
        </div>
      </aside>
    </>
  );
}
