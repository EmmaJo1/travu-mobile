import { useQuery } from '@tanstack/react-query';

import { supabaseQueryKeys } from '@/hooks/supabaseQueryKeys';
import { useAuth } from '@/providers/AuthProvider';
import { fetchTripDaysByTripId } from '@/services/supabase/tripDays';

export function useTripDays(tripId?: string | null) {
  const { canUseSupabaseUserData, user } = useAuth();

  return useQuery({
    enabled: canUseSupabaseUserData && Boolean(tripId),
    queryFn: () => fetchTripDaysByTripId(tripId as string),
    queryKey: supabaseQueryKeys.tripDays(user?.id, tripId),
  });
}
