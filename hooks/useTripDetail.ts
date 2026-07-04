import { useQuery } from '@tanstack/react-query';

import { supabaseQueryKeys } from '@/hooks/supabaseQueryKeys';
import { useAuth } from '@/providers/AuthProvider';
import { fetchTripById } from '@/services/supabase/trips';

export function useTripDetail(tripId?: string | null) {
  const { canUseSupabaseUserData, user } = useAuth();

  return useQuery({
    enabled: canUseSupabaseUserData && Boolean(tripId),
    queryFn: () => fetchTripById(tripId as string),
    queryKey: supabaseQueryKeys.tripDetail(user?.id, tripId),
  });
}
