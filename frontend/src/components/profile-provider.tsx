'use client';

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Profile } from '@/lib/current-user';

/*
 * Holds the signed-in profile in client state so the sidebar footer and avatar
 * initials update the moment the profile changes, with no page reload (SHL-1).
 *
 * The provider is seeded on the server from `getCurrentUser()`, so the first
 * paint already has the right name and there is no loading state to design.
 * `setProfile` is what Settings "Save changes" (FIL-79) will call.
 */

interface ProfileContextValue {
  profile: Profile;
  setProfile: (profile: Profile) => void;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

interface ProfileProviderProps {
  initialProfile: Profile;
  children: ReactNode;
}

export function ProfileProvider({ initialProfile, children }: ProfileProviderProps) {
  const [profile, setProfile] = useState(initialProfile);
  const value = useMemo(() => ({ profile, setProfile }), [profile]);

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile(): ProfileContextValue {
  const context = useContext(ProfileContext);

  if (context === null) {
    throw new Error('useProfile must be used inside a <ProfileProvider>.');
  }

  return context;
}
