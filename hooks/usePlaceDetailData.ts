import { useQuery } from '@tanstack/react-query';

import { supabaseQueryKeys } from '@/hooks/supabaseQueryKeys';
import { useAuth } from '@/providers/AuthProvider';
import { fetchPlaceById } from '@/services/supabase/places';
import { fetchRecordsByPlaceId } from '@/services/supabase/records';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isSupabaseUuid(value?: string | null): value is string {
  return Boolean(value && UUID_PATTERN.test(value));
}

export function usePlaceDetailData(placeId?: string | null) {
  const { canUseSupabaseUserData, user } = useAuth();

  return useQuery({
    enabled: canUseSupabaseUserData && isSupabaseUuid(placeId),
    queryFn: async () => {
      const place = await fetchPlaceById(placeId as string);

      if (!place) {
        return { place: null, records: [] };
      }

      const records = await fetchRecordsByPlaceId(place.id);
      return { place, records };
    },
    queryKey: supabaseQueryKeys.placeDetail(user?.id, placeId),
  });
}
