'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ComponentType } from 'react';
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

export function Sidebar() {
  const pathname = usePathname();
  const { profile } = useProfile();

  return (
    <aside className="fixed inset-y-0 left-0 z-10 flex w-[260px] flex-col justify-between bg-surface-sidebar px-4 pt-[26px] pb-[22px]">
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
  );
}
