import { useMutation, useQueryClient } from '@tanstack/react-query';

import { supabaseQueryKeys } from '@/hooks/supabaseQueryKeys';
import { useAuth } from '@/providers/AuthProvider';
import {
  ActiveTripExistsError,
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
    onSuccess: (trip) => {
      const userId = user?.id;

      if (trip.status === 'active') {
        queryClient.setQueryData(supabaseQueryKeys.activeTrip(userId), trip);
      }

      void Promise.all([
        queryClient.invalidateQueries({ queryKey: supabaseQueryKeys.myTrips(userId) }),
        queryClient.invalidateQueries({ queryKey: supabaseQueryKeys.activeTrip(userId) }),
        queryClient.invalidateQueries({ queryKey: supabaseQueryKeys.recentTripsRoot(userId) }),
      ]).catch(() => {
        if (__DEV__) {
          console.warn('[trip creation] home query refresh failed', {
            stage: 'invalidate_home',
            tripCreated: true,
          });
        }
      });
    },
    onError: async (error) => {
      if (error instanceof ActiveTripExistsError) {
        await queryClient.invalidateQueries({
          queryKey: supabaseQueryKeys.activeTrip(user?.id),
        });
      }
    },
  });
}
