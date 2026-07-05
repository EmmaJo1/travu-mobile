import { useQuery } from '@tanstack/react-query';

import { supabaseQueryKeys } from '@/hooks/supabaseQueryKeys';
import { useAuth } from '@/providers/AuthProvider';
import { fetchRecordsByTripDayId } from '@/services/supabase/records';

export function useTripDayRecords(tripDayId?: string | null) {
  const { canUseSupabaseUserData, user } = useAuth();

  return useQuery({
    enabled: canUseSupabaseUserData && Boolean(tripDayId),
    queryFn: () => fetchRecordsByTripDayId(tripDayId as string),
    queryKey: supabaseQueryKeys.tripDayRecords(user?.id, tripDayId),
  });
}
