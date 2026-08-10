import { useMutation, useQueryClient } from '@tanstack/react-query';

import { supabaseQueryKeys } from '@/hooks/supabaseQueryKeys';
import { useAuth } from '@/providers/AuthProvider';
import { drainPendingPhotoStorageCleanup } from '@/services/supabase/photoStorageCleanup';
import { type PhotoRow, type ResolvedPhotoRow } from '@/services/supabase/photos';
import { softDeletePlaceTree, type PlaceRow } from '@/services/supabase/places';
import type { RecordRow } from '@/services/supabase/records';

export interface DeletePlaceRecordInput {
  placeId: string;
  tripDayId: string;
  tripId: string;
}

type DeletePlaceRecordResult = {
  place: Awaited<ReturnType<typeof softDeletePlaceTree>>;
  storageCleanupIncomplete: boolean;
};

const activePlaceDeleteOperations = new Map<string, Promise<DeletePlaceRecordResult>>();

function filterPlaceRows<T extends { id: string }>(rows: T[] | undefined, placeId: string) {
  return rows?.filter((row) => row.id !== placeId);
}

function filterRowsByPlaceId<T extends { place_id: string | null }>(
  rows: T[] | undefined,
  placeId: string,
) {
  return rows?.filter((row) => row.place_id !== placeId);
}

export function useDeletePlaceRecord() {
  const queryClient = useQueryClient();
  const { canUseSupabaseUserData, user } = useAuth();

  return useMutation({
    mutationFn: async (input: DeletePlaceRecordInput) => {
      if (!canUseSupabaseUserData || !user?.id) {
        throw new Error('A Supabase session is required to delete a place record.');
      }

      const activeOperation = activePlaceDeleteOperations.get(input.placeId);

      if (activeOperation) {
        return activeOperation;
      }

      const operation = (async (): Promise<DeletePlaceRecordResult> => {
        const place = await softDeletePlaceTree(input.placeId);
        const storageCleanup = await drainPendingPhotoStorageCleanup();

        if (storageCleanup.incomplete) {
          console.warn('[useDeletePlaceRecord] photo storage cleanup incomplete', {
            attemptedObjectCount: storageCleanup.attemptedObjectCount,
            batchCount: storageCleanup.batchCount,
          });
        }

        return {
          place,
          storageCleanupIncomplete: storageCleanup.incomplete,
        };
      })();

      activePlaceDeleteOperations.set(input.placeId, operation);

      try {
        return await operation;
      } finally {
        if (activePlaceDeleteOperations.get(input.placeId) === operation) {
          activePlaceDeleteOperations.delete(input.placeId);
        }
      }
    },
    onSuccess: (_data, input) => {
      const userId = user?.id;

      queryClient.setQueryData<PlaceRow[]>(
        supabaseQueryKeys.tripDayPlaces(userId, input.tripDayId),
        (current) => filterPlaceRows(current, input.placeId),
      );
      queryClient.setQueryData<RecordRow[]>(
        supabaseQueryKeys.tripDayRecords(userId, input.tripDayId),
        (current) => filterRowsByPlaceId(current, input.placeId),
      );
      queryClient.setQueryData<ResolvedPhotoRow[]>(
        supabaseQueryKeys.tripDayPhotos(userId, input.tripDayId),
        (current) => filterRowsByPlaceId(current, input.placeId),
      );
      queryClient.setQueryData<PlaceRow[]>(
        supabaseQueryKeys.tripPlaces(userId, input.tripId),
        (current) => filterPlaceRows(current, input.placeId),
      );
      queryClient.setQueryData<RecordRow[]>(
        supabaseQueryKeys.tripRecords(userId, input.tripId),
        (current) => filterRowsByPlaceId(current, input.placeId),
      );
      queryClient.setQueryData<PhotoRow[]>(
        supabaseQueryKeys.tripPhotos(userId, input.tripId),
        (current) => filterRowsByPlaceId(current, input.placeId),
      );
      queryClient.setQueryData<ResolvedPhotoRow[]>(
        supabaseQueryKeys.placePhotos(userId, input.placeId),
        (current) => current ? [] : current,
      );

      void Promise.all([
        queryClient.invalidateQueries({
          queryKey: supabaseQueryKeys.archivedTravelMoments(userId),
        }),
        queryClient.invalidateQueries({
          queryKey: supabaseQueryKeys.tripDayPlaces(userId, input.tripDayId),
        }),
        queryClient.invalidateQueries({
          queryKey: supabaseQueryKeys.tripDayRecords(userId, input.tripDayId),
        }),
        queryClient.invalidateQueries({
          queryKey: supabaseQueryKeys.tripDayPhotos(userId, input.tripDayId),
        }),
        queryClient.invalidateQueries({
          queryKey: supabaseQueryKeys.placePhotos(userId, input.placeId),
        }),
        queryClient.invalidateQueries({
          queryKey: supabaseQueryKeys.tripPlaces(userId, input.tripId),
        }),
        queryClient.invalidateQueries({
          queryKey: supabaseQueryKeys.tripRecords(userId, input.tripId),
        }),
        queryClient.invalidateQueries({
          queryKey: supabaseQueryKeys.tripPhotos(userId, input.tripId),
        }),
        queryClient.invalidateQueries({
          queryKey: supabaseQueryKeys.tripDays(userId, input.tripId),
        }),
        queryClient.invalidateQueries({
          queryKey: supabaseQueryKeys.activeTrip(userId),
        }),
        queryClient.invalidateQueries({
          queryKey: supabaseQueryKeys.tripDetail(userId, input.tripId),
        }),
        queryClient.invalidateQueries({
          queryKey: supabaseQueryKeys.myTrips(userId),
        }),
        queryClient.invalidateQueries({
          queryKey: supabaseQueryKeys.recentTripsRoot(userId),
        }),
      ]).catch((error: unknown) => {
        console.warn('[useDeletePlaceRecord] invalidate failed', error);
      });
    },
    onError: (_error, input) => {
      const userId = user?.id;

      void Promise.all([
        queryClient.invalidateQueries({
          queryKey: supabaseQueryKeys.tripDayPlaces(userId, input.tripDayId),
        }),
        queryClient.invalidateQueries({
          queryKey: supabaseQueryKeys.tripDayRecords(userId, input.tripDayId),
        }),
        queryClient.invalidateQueries({
          queryKey: supabaseQueryKeys.tripDayPhotos(userId, input.tripDayId),
        }),
        queryClient.invalidateQueries({
          queryKey: supabaseQueryKeys.placePhotos(userId, input.placeId),
        }),
        queryClient.invalidateQueries({
          queryKey: supabaseQueryKeys.tripPlaces(userId, input.tripId),
        }),
        queryClient.invalidateQueries({
          queryKey: supabaseQueryKeys.tripRecords(userId, input.tripId),
        }),
        queryClient.invalidateQueries({
          queryKey: supabaseQueryKeys.tripPhotos(userId, input.tripId),
        }),
        queryClient.invalidateQueries({
          queryKey: supabaseQueryKeys.tripDays(userId, input.tripId),
        }),
        queryClient.invalidateQueries({
          queryKey: supabaseQueryKeys.activeTrip(userId),
        }),
        queryClient.invalidateQueries({
          queryKey: supabaseQueryKeys.tripDetail(userId, input.tripId),
        }),
      ]).catch((error: unknown) => {
        console.warn('[useDeletePlaceRecord] reconcile after delete failure failed', error);
      });
    },
  });
}
