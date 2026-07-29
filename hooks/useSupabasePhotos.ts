import { useQuery } from '@tanstack/react-query';

import { supabaseQueryKeys } from '@/hooks/supabaseQueryKeys';
import { isSupabaseUuid } from '@/hooks/usePlaceDetailData';
import { useAuth } from '@/providers/AuthProvider';
import {
  fetchPhotosByPlaceId,
  fetchPhotosByTripDayId,
} from '@/services/supabase/photos';

export function usePlacePhotos(placeId?: string | null) {
  const { canUseSupabaseUserData, user } = useAuth();

  return useQuery({
    enabled: canUseSupabaseUserData && isSupabaseUuid(placeId),
    queryFn: () => fetchPhotosByPlaceId(placeId as string),
    queryKey: supabaseQueryKeys.placePhotos(user?.id, placeId),
  });
}

export function useTripDayPhotos(tripDayId?: string | null) {
  const { canUseSupabaseUserData, user } = useAuth();

  return useQuery({
    enabled: canUseSupabaseUserData && isSupabaseUuid(tripDayId),
    queryFn: () => fetchPhotosByTripDayId(tripDayId as string),
    queryKey: supabaseQueryKeys.tripDayPhotos(user?.id, tripDayId),
  });
}
