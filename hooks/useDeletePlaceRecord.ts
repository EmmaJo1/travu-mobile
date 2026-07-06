import { useMutation, useQueryClient } from '@tanstack/react-query';

import { supabaseQueryKeys } from '@/hooks/supabaseQueryKeys';
import { useAuth } from '@/providers/AuthProvider';
import { softDeletePlace } from '@/services/supabase/places';
import { softDeleteRecordsByPlaceId } from '@/services/supabase/records';

export interface DeletePlaceRecordInput {
  placeId: string;
  tripDayId: string;
  tripId: string;
}

export function useDeletePlaceRecord() {
  const queryClient = useQueryClient();
  const { canUseSupabaseUserData, user } = useAuth();

  return useMutation({
    mutationFn: async (input: DeletePlaceRecordInput) => {
      if (!canUseSupabaseUserData || !user?.id) {
        throw new Error('A Supabase session is required to delete a place record.');
      }

      await softDeleteRecordsByPlaceId(input.placeId);
      return softDeletePlace(input.placeId);
    },
    onSuccess: (_data, input) => {
      const userId = user?.id;

      void Promise.all([
        queryClient.invalidateQueries({
          queryKey: supabaseQueryKeys.tripDayPlaces(userId, input.tripDayId),
        }),
        queryClient.invalidateQueries({
          queryKey: supabaseQueryKeys.tripDayRecords(userId, input.tripDayId),
        }),
        queryClient.invalidateQueries({
          queryKey: supabaseQueryKeys.tripDays(userId, input.tripId),
        }),
      ]).catch((error: unknown) => {
        console.warn('[useDeletePlaceRecord] invalidate failed', error);
      });
    },
  });
}
