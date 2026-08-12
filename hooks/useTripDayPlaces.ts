import { useQuery } from '@tanstack/react-query';

import { supabaseQueryKeys } from '@/hooks/supabaseQueryKeys';
import { isSupabaseUuid } from '@/hooks/usePlaceDetailData';
import { useAuth } from '@/providers/AuthProvider';
import { fetchPlacesByTripDayId } from '@/services/supabase/places';

export function useTripDayPlaces(tripDayId?: string | null) {
  const { canUseSupabaseUserData, user } = useAuth();

  return useQuery({
    enabled: canUseSupabaseUserData && isSupabaseUuid(tripDayId),
    queryFn: () => fetchPlacesByTripDayId(tripDayId as string),
    queryKey: supabaseQueryKeys.tripDayPlaces(user?.id, tripDayId),
  });
}
