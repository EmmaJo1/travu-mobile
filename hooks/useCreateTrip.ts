import { useMutation, useQueryClient } from '@tanstack/react-query';

import { supabaseQueryKeys } from '@/hooks/supabaseQueryKeys';
import { useAuth } from '@/providers/AuthProvider';
import {
  createTripWithDays,
  type CreateTripWithDaysInput,
} from '@/services/supabase/trips';

export function useCreateTrip() {
  const queryClient = useQueryClient();
  const { canUseSupabaseUserData, user } = useAuth();

  return useMutation({
    mutationFn: (input: CreateTripWithDaysInput) => {
      if (!canUseSupabaseUserData || !user?.id) {
        throw new Error('A Supabase session is required to create a trip.');
      }

      return createTripWithDays(input);
    },
    onSuccess: () => {
      const userId = user?.id;

      void queryClient.invalidateQueries({ queryKey: supabaseQueryKeys.myTrips(userId) });
      void queryClient.invalidateQueries({ queryKey: supabaseQueryKeys.activeTrip(userId) });
      void queryClient.invalidateQueries({ queryKey: supabaseQueryKeys.recentTripsRoot(userId) });
    },
  });
}
