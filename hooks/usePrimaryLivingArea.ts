import React from 'react';

import { useAuth } from '@/providers/AuthProvider';
import { useUserProfile } from '@/providers/UserProfileProvider';
import {
  createLivingAreaFromProfile,
  type LivingArea,
} from '@/services/location/livingAreas';
import { updateUserProfile } from '@/services/supabase/users';

export function usePrimaryLivingArea() {
  const { canUseSupabaseUserData, refreshProfile, user } = useAuth();
  const { profile, updateProfile } = useUserProfile();

  const livingArea = React.useMemo(
    () => createLivingAreaFromProfile(profile.basedIn, profile.basedInPlace),
    [profile.basedIn, profile.basedInPlace],
  );

  const saveLivingArea = React.useCallback(async (area: LivingArea) => {
    if (canUseSupabaseUserData && user?.id) {
      const timestamp = new Date().toISOString();

      await updateUserProfile(user.id, {
        based_in: area.displayName,
        based_in_city: area.locality ?? area.displayName,
        based_in_country: area.countryName,
        based_in_country_code: area.countryCode,
        based_in_google_place_id: area.providerPlaceId,
        based_in_latitude: area.latitude,
        based_in_longitude: area.longitude,
        updated_at: timestamp,
      });
      await refreshProfile();
    }

    updateProfile({
      ...profile,
      basedIn: area.displayName,
      basedInPlace: {
        displayName: area.displayName,
        city: area.locality ?? area.displayName,
        region: area.administrativeArea,
        country: area.countryName ?? '',
        countryCode: area.countryCode,
        latitude: area.latitude,
        longitude: area.longitude,
        placeId: area.providerPlaceId,
      },
    });
  }, [canUseSupabaseUserData, profile, refreshProfile, updateProfile, user?.id]);

  return {
    livingArea,
    saveLivingArea,
  };
}
