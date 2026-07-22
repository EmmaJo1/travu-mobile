import { useMutation, useQueryClient } from '@tanstack/react-query';

import { supabaseQueryKeys } from '@/hooks/supabaseQueryKeys';
import { useAuth } from '@/providers/AuthProvider';
import {
  updateActiveTripDestination,
  type UpdateActiveTripDestinationInput,
} from '@/services/supabase/trips';

export function useUpdateActiveTripDestination() {
  const queryClient = useQueryClient();
  const { canUseSupabaseUserData, user } = useAuth();

  return useMutation({
    mutationFn: (input: UpdateActiveTripDestinationInput) => {
      if (!canUseSupabaseUserData || !user?.id) {
        throw new Error('A Supabase session is required to update a trip destination.');
      }

      return updateActiveTripDestination(input);
    },
    onSuccess: async (trip) => {
      const userId = user?.id;

      queryClient.setQueryData(supabaseQueryKeys.activeTrip(userId), trip);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: supabaseQueryKeys.activeTrip(userId) }),
        queryClient.invalidateQueries({ queryKey: supabaseQueryKeys.myTrips(userId) }),
        queryClient.invalidateQueries({ queryKey: supabaseQueryKeys.recentTripsRoot(userId) }),
      ]);
    },
  });
}
