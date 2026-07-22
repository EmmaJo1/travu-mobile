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
    onSuccess: async () => {
      const userId = user?.id;

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: supabaseQueryKeys.activeTrip(userId) }),
        queryClient.invalidateQueries({ queryKey: supabaseQueryKeys.myTrips(userId) }),
        queryClient.invalidateQueries({ queryKey: supabaseQueryKeys.recentTripsRoot(userId) }),
      ]);
    },
  });
}
