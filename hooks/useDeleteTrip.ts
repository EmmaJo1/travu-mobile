import { useMutation, useQueryClient } from '@tanstack/react-query';

import { supabaseQueryKeys } from '@/hooks/supabaseQueryKeys';
import { useAuth } from '@/providers/AuthProvider';
import { softDeleteTrip } from '@/services/supabase/trips';

export function useDeleteTrip() {
  const queryClient = useQueryClient();
  const { canUseSupabaseUserData, user } = useAuth();

  return useMutation({
    mutationFn: (tripId: string) => {
      if (!canUseSupabaseUserData || !user?.id) {
        throw new Error('A Supabase session is required to delete a trip.');
      }

      return softDeleteTrip(tripId);
    },
    onSuccess: () => {
      const userId = user?.id;

      void Promise.all([
        queryClient.invalidateQueries({ queryKey: supabaseQueryKeys.activeTrip(userId) }),
        queryClient.invalidateQueries({ queryKey: supabaseQueryKeys.myTrips(userId) }),
        queryClient.invalidateQueries({ queryKey: supabaseQueryKeys.recentTripsRoot(userId) }),
      ]).catch((error: unknown) => {
        console.warn('[useDeleteTrip] invalidate failed', error);
      });
    },
  });
}
