import { useMutation, useQueryClient } from '@tanstack/react-query';

import { supabaseQueryKeys } from '@/hooks/supabaseQueryKeys';
import { useAuth } from '@/providers/AuthProvider';
import {
  updateActiveTripDateRange,
  type UpdateActiveTripDateRangeInput,
} from '@/services/supabase/tripDays';

export function useUpdateActiveTripDateRange() {
  const queryClient = useQueryClient();
  const { canUseSupabaseUserData, user } = useAuth();

  return useMutation({
    retry: false,
    mutationFn: (input: UpdateActiveTripDateRangeInput) => {
      if (!canUseSupabaseUserData || !user?.id) {
        throw new Error('A Supabase session is required to update a trip date range.');
      }

      return updateActiveTripDateRange(input);
    },
    onSuccess: async ({ trip, tripDays }, input) => {
      const userId = user?.id;

      queryClient.setQueryData(supabaseQueryKeys.activeTrip(userId), trip);
      queryClient.setQueryData(supabaseQueryKeys.tripDetail(userId, input.tripId), trip);
      queryClient.setQueryData(supabaseQueryKeys.tripDays(userId, input.tripId), tripDays);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: supabaseQueryKeys.activeTrip(userId) }),
        queryClient.invalidateQueries({ queryKey: supabaseQueryKeys.myTrips(userId) }),
        queryClient.invalidateQueries({ queryKey: supabaseQueryKeys.recentTripsRoot(userId) }),
        queryClient.invalidateQueries({
          queryKey: supabaseQueryKeys.tripDetail(userId, input.tripId),
        }),
        queryClient.invalidateQueries({
          queryKey: supabaseQueryKeys.tripDays(userId, input.tripId),
        }),
      ]);
    },
    onError: async (_error, input) => {
      const userId = user?.id;

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: supabaseQueryKeys.activeTrip(userId) }),
        queryClient.invalidateQueries({
          queryKey: supabaseQueryKeys.tripDays(userId, input.tripId),
        }),
      ]);
    },
  });
}
