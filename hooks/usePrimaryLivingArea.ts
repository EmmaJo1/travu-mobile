import React from 'react';

import { supabaseQueryKeys } from '@/hooks/supabaseQueryKeys';
import { queryClient } from '@/lib/queryClient';
import { useAuth } from '@/providers/AuthProvider';
import { useUserProfile } from '@/providers/UserProfileProvider';
import {
  createConfirmedLivingAreaProfilePatch,
  createLivingAreaFromProfile,
  type LivingArea,
} from '@/services/location/livingAreas';
import { updateUserProfile } from '@/services/supabase/users';

export function usePrimaryLivingArea() {
  const {
    canUseSupabaseUserData,
    profile: authProfile,
    profileStatus,
    setProfileSnapshot,
    user,
  } = useAuth();
  const { profile, updateProfile } = useUserProfile();

  const livingArea = React.useMemo(
    () => canUseSupabaseUserData
      ? createLivingAreaFromProfile(
          authProfile?.based_in,
          authProfile
            ? {
                displayName: authProfile.based_in,
                city: authProfile.based_in_city,
                country: authProfile.based_in_country,
                countryCode: authProfile.based_in_country_code,
                latitude: authProfile.based_in_latitude,
                longitude: authProfile.based_in_longitude,
                placeId: authProfile.based_in_google_place_id,
              }
            : null,
        )
      : createLivingAreaFromProfile(profile.basedIn, profile.basedInPlace),
    [authProfile, canUseSupabaseUserData, profile.basedIn, profile.basedInPlace],
  );

  const persistLivingArea = React.useCallback(async (area: LivingArea | null) => {
    if (canUseSupabaseUserData && user?.id) {
      const timestamp = new Date().toISOString();

      const savedProfile = await updateUserProfile(user.id, {
        ...createConfirmedLivingAreaProfilePatch(area),
        updated_at: timestamp,
      });
      queryClient.setQueryData(supabaseQueryKeys.myProfile(user.id), savedProfile);
      setProfileSnapshot(savedProfile);
    }

    updateProfile({
      ...profile,
      basedIn: area?.displayName ?? '',
      basedInPlace: area
        ? {
            displayName: area.displayName,
            city: area.locality ?? area.displayName,
            region: area.administrativeArea,
            country: area.countryName ?? '',
            countryCode: area.countryCode,
            latitude: area.latitude,
            longitude: area.longitude,
            placeId: area.providerPlaceId,
          }
        : undefined,
    });
  }, [canUseSupabaseUserData, profile, setProfileSnapshot, updateProfile, user?.id]);

  const saveLivingArea = React.useCallback(
    (area: LivingArea) => persistLivingArea(area),
    [persistLivingArea],
  );

  const clearLivingArea = React.useCallback(
    () => persistLivingArea(null),
    [persistLivingArea],
  );

  return {
    clearLivingArea,
    isLoading: canUseSupabaseUserData && profileStatus === 'loading',
    livingArea,
    saveLivingArea,
  };
}
