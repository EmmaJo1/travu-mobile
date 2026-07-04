import { useQuery } from '@tanstack/react-query';

import { supabaseQueryKeys } from '@/hooks/supabaseQueryKeys';
import { useAuth } from '@/providers/AuthProvider';
import {
  fetchActiveTrip,
  fetchMyTrips,
  fetchRecentTrips,
} from '@/services/supabase/trips';

export function useMyTrips() {
  const { canUseSupabaseUserData, user } = useAuth();

  return useQuery({
    enabled: canUseSupabaseUserData,
    queryFn: fetchMyTrips,
    queryKey: supabaseQueryKeys.myTrips(user?.id),
  });
}

export function useActiveTrip() {
  const { canUseSupabaseUserData, user } = useAuth();

  return useQuery({
    enabled: canUseSupabaseUserData,
    queryFn: fetchActiveTrip,
    queryKey: supabaseQueryKeys.activeTrip(user?.id),
  });
}

export function useRecentTrips(limit = 12) {
  const { canUseSupabaseUserData, user } = useAuth();

  return useQuery({
    enabled: canUseSupabaseUserData,
    queryFn: () => fetchRecentTrips(limit),
    queryKey: supabaseQueryKeys.recentTrips(user?.id, limit),
  });
}
