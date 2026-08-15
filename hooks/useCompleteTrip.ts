import { useMutation, useQueryClient } from '@tanstack/react-query';

import { supabaseQueryKeys } from '@/hooks/supabaseQueryKeys';
import { useAuth } from '@/providers/AuthProvider';
import { completeActiveTrip } from '@/services/supabase/trips';

export function useCompleteTrip() {
  const queryClient = useQueryClient();
  const { canUseSupabaseUserData, user } = useAuth();

  return useMutation({
    mutationFn: () => {
      if (!canUseSupabaseUserData || !user?.id) {
        throw new Error('A Supabase session is required to complete a trip.');
      }

      return completeActiveTrip();
    },
    onSuccess: async (trip) => {
      const userId = user?.id;

      queryClient.setQueryData(supabaseQueryKeys.tripDetail(userId, trip.id), trip);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: supabaseQueryKeys.activeTrip(userId) }),
        queryClient.invalidateQueries({ queryKey: supabaseQueryKeys.archivedTravelMoments(userId) }),
        queryClient.invalidateQueries({ queryKey: supabaseQueryKeys.myTrips(userId) }),
        queryClient.invalidateQueries({ queryKey: supabaseQueryKeys.myTravelMapPlaces(userId) }),
        queryClient.invalidateQueries({ queryKey: supabaseQueryKeys.recentTripsRoot(userId) }),
        queryClient.invalidateQueries({ queryKey: supabaseQueryKeys.tripDays(userId, trip.id) }),
        queryClient.invalidateQueries({ queryKey: supabaseQueryKeys.tripDetail(userId, trip.id) }),
      ]);
    },
  });
}
