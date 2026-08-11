import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabaseQueryKeys } from '@/hooks/supabaseQueryKeys';
import { useAuth } from '@/providers/AuthProvider';
import {
  fetchTripDestinations,
  syncActiveTripDestinations,
  type SyncActiveTripDestinationsInput,
} from '@/services/supabase/tripDestinations';

export function useTripDestinations(tripId?: string | null) {
  const { canUseSupabaseUserData, user } = useAuth();

  return useQuery({
    enabled: canUseSupabaseUserData && Boolean(tripId),
    queryFn: () => fetchTripDestinations(tripId as string),
    queryKey: supabaseQueryKeys.tripDestinations(user?.id, tripId),
  });
}

export function useSyncActiveTripDestinations() {
  const queryClient = useQueryClient();
  const { canUseSupabaseUserData, user } = useAuth();

  return useMutation({
    mutationFn: (input: SyncActiveTripDestinationsInput) => {
      if (!canUseSupabaseUserData || !user?.id) {
        throw new Error('A Supabase session is required to update trip destinations.');
      }

      return syncActiveTripDestinations(input);
    },
    onSuccess: async (destinations, input) => {
      const userId = user?.id;

      queryClient.setQueryData(
        supabaseQueryKeys.tripDestinations(userId, input.tripId),
        destinations,
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: supabaseQueryKeys.activeTrip(userId) }),
        queryClient.invalidateQueries({ queryKey: supabaseQueryKeys.myTrips(userId) }),
        queryClient.invalidateQueries({ queryKey: supabaseQueryKeys.recentTripsRoot(userId) }),
        queryClient.invalidateQueries({
          queryKey: supabaseQueryKeys.tripDetail(userId, input.tripId),
        }),
        queryClient.invalidateQueries({
          queryKey: supabaseQueryKeys.tripDestinations(userId, input.tripId),
        }),
      ]);
    },
  });
}
