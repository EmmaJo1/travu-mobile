import React from 'react';

import { MOCK_MY_PAGE_PROFILE } from '@/constants/mockMyPageProfile';

export type UserProfile = {
  name: string;
  basedIn: string;
  bio: string;
  travelStyles: string[];
  profileImageUri?: string;
};

const DEFAULT_PROFILE: UserProfile = {
  name: MOCK_MY_PAGE_PROFILE.userName,
  basedIn: MOCK_MY_PAGE_PROFILE.basedIn,
  bio: MOCK_MY_PAGE_PROFILE.tagline,
  travelStyles: [],
};

type UserProfileContextValue = {
  profile: UserProfile;
  updateProfile: (profile: UserProfile) => void;
};

const UserProfileContext = React.createContext<UserProfileContextValue | null>(null);

export function UserProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = React.useState<UserProfile>(DEFAULT_PROFILE);

  const updateProfile = React.useCallback((nextProfile: UserProfile) => {
    // TODO: Replace this in-memory update with Supabase or durable local persistence.
    setProfile(nextProfile);
  }, []);

  const value = React.useMemo(
    () => ({
      profile,
      updateProfile,
    }),
    [profile, updateProfile],
  );

  return (
    <UserProfileContext.Provider value={value}>
      {children}
    </UserProfileContext.Provider>
  );
}

export function useUserProfile() {
  const context = React.useContext(UserProfileContext);

  if (!context) {
    throw new Error('useUserProfile must be used within UserProfileProvider');
  }

  return context;
}
