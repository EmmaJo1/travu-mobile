import { useQuery } from '@tanstack/react-query';

import { supabaseQueryKeys } from '@/hooks/supabaseQueryKeys';
import { isSupabaseUuid } from '@/hooks/usePlaceDetailData';
import { useAuth } from '@/providers/AuthProvider';
import { fetchPhotoRowsByTripId } from '@/services/supabase/photos';
import { fetchPlacesByTripId } from '@/services/supabase/places';
import { fetchRecordsByTripId } from '@/services/supabase/records';

export function useTripPlaces(tripId?: string | null, enabled = true) {
  const { canUseSupabaseUserData, user } = useAuth();

  return useQuery({
    enabled: enabled && canUseSupabaseUserData && isSupabaseUuid(tripId),
    queryFn: () => fetchPlacesByTripId(tripId as string),
    queryKey: supabaseQueryKeys.tripPlaces(user?.id, tripId),
  });
}

export function useTripRecords(tripId?: string | null) {
  const { canUseSupabaseUserData, user } = useAuth();

  return useQuery({
    enabled: canUseSupabaseUserData && isSupabaseUuid(tripId),
    queryFn: () => fetchRecordsByTripId(tripId as string),
    queryKey: supabaseQueryKeys.tripRecords(user?.id, tripId),
  });
}

export function useTripPhotos(tripId?: string | null) {
  const { canUseSupabaseUserData, user } = useAuth();

  return useQuery({
    enabled: canUseSupabaseUserData && isSupabaseUuid(tripId),
    queryFn: () => fetchPhotoRowsByTripId(tripId as string),
    queryKey: supabaseQueryKeys.tripPhotos(user?.id, tripId),
  });
}
