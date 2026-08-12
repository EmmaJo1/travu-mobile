import React from 'react';

import { useAuth } from '@/providers/AuthProvider';

export type UserProfile = {
  name: string;
  basedIn: string;
  basedInPlace?: {
    displayName: string;
    city: string;
    region?: string;
    country: string;
    countryCode?: string;
    latitude?: number;
    longitude?: number;
    placeId?: string;
  };
  bio: string;
  travelStyles: string[];
  profileImageUri?: string;
};

const DEFAULT_PROFILE: UserProfile = {
  name: '',
  basedIn: '',
  bio: '',
  travelStyles: [],
};

type UserProfileContextValue = {
  profile: UserProfile;
  updateProfile: (profile: UserProfile) => void;
};

const UserProfileContext = React.createContext<UserProfileContextValue | null>(null);

export function UserProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = React.useState<UserProfile>(DEFAULT_PROFILE);
  const { profile: authProfile } = useAuth();

  React.useEffect(() => {
    if (!authProfile) {
      setProfile(DEFAULT_PROFILE);
    }
  }, [authProfile]);

  const updateProfile = React.useCallback((nextProfile: UserProfile) => {
    setProfile(nextProfile);
  }, []);

  const resolvedProfile = React.useMemo<UserProfile>(() => {
    if (!authProfile) {
      return profile;
    }

    return {
      name: authProfile.name,
      basedIn: authProfile.based_in ?? '',
      basedInPlace: authProfile.based_in
        ? {
            displayName: authProfile.based_in,
            city: authProfile.based_in_city ?? '',
            country: authProfile.based_in_country ?? '',
            countryCode: authProfile.based_in_country_code ?? undefined,
            latitude: authProfile.based_in_latitude ?? undefined,
            longitude: authProfile.based_in_longitude ?? undefined,
            placeId: authProfile.based_in_google_place_id ?? undefined,
          }
        : undefined,
      bio: authProfile.bio ?? '',
      travelStyles: authProfile.travel_styles,
      profileImageUri: authProfile.profile_image_url ?? undefined,
    };
  }, [authProfile, profile]);

  const value = React.useMemo(
    () => ({
      profile: resolvedProfile,
      updateProfile,
    }),
    [resolvedProfile, updateProfile],
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
