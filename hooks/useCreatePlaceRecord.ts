import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { PlaceCreateInput } from '@/components/record/PlaceCreateModal';
import { normalizePlaceCategoryValue } from '@/constants/placeCategories';
import { supabaseQueryKeys } from '@/hooks/supabaseQueryKeys';
import { useAuth } from '@/providers/AuthProvider';
import { buildCreatePlaceIdentity } from '@/services/placeSearch/persistence';
import {
  createPlaceForTripDay,
  softDeletePlace,
  type PlaceRow,
} from '@/services/supabase/places';
import { createRecordForPlace, type RecordRow } from '@/services/supabase/records';
import { resolveCreatePlaceTimeLabel } from '@/utils/createPlaceTime';
import { buildVisitedAtIso } from '@/utils/placeEntryTime';

export interface CreatePlaceRecordInput extends PlaceCreateInput {
  tripDayId: string;
  tripId: string;
}

function parseDateKeyFromDateLabel(dateLabel?: string) {
  const matched = dateLabel?.replace(/\s+/g, '').match(/^(\d{4})\.(\d{1,2})\.(\d{1,2})/);

  if (!matched) {
    return undefined;
  }

  return `${matched[1]}-${String(Number(matched[2])).padStart(2, '0')}-${String(
    Number(matched[3]),
  ).padStart(2, '0')}`;
}

export function useCreatePlaceRecord() {
  const queryClient = useQueryClient();
  const { canUseSupabaseUserData, user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreatePlaceRecordInput) => {
      if (!canUseSupabaseUserData || !user?.id) {
        throw new Error('A Supabase session is required to create a place record.');
      }

      const placeName = (input.placeName ?? input.place).trim();
      const recordText = input.text?.trim() || null;
      const shouldCreateRecord = Boolean(recordText);
      const dateKey = input.dateKey ?? parseDateKeyFromDateLabel(input.dateLabel);
      const resolvedTime = resolveCreatePlaceTimeLabel(input.time);
      const visitedAt = buildVisitedAtIso(dateKey, resolvedTime);
      const placeIdentity = buildCreatePlaceIdentity(input);
      const place = await createPlaceForTripDay({
        address: placeIdentity.address,
        city: placeIdentity.city,
        category: normalizePlaceCategoryValue(input.category) ?? null,
        country: placeIdentity.country,
        googlePlaceId: placeIdentity.googlePlaceId,
        latitude: placeIdentity.latitude,
        longitude: placeIdentity.longitude,
        memo: null,
        name: placeName,
        source: placeIdentity.source,
        tripDayId: input.tripDayId,
        tripId: input.tripId,
        visitedAt,
      });

      if (!shouldCreateRecord) {
        return { place, record: null };
      }

      try {
        const record = await createRecordForPlace({
          placeId: place.id,
          text: recordText,
          tripDayId: input.tripDayId,
          tripId: input.tripId,
          visitedAt,
        });

        return { place, record };
      } catch (error) {
        try {
          await softDeletePlace(place.id);
        } catch (rollbackError) {
          console.error('[useCreatePlaceRecord] rollback failed after record create error', {
            placeId: place.id,
            rollbackMessage: rollbackError instanceof Error ? rollbackError.message : String(rollbackError),
          });
        }

        throw error;
      }
    },
    onSuccess: (data, input) => {
      const userId = user?.id;
      const placesQueryKey = supabaseQueryKeys.tripDayPlaces(userId, input.tripDayId);
      const recordsQueryKey = supabaseQueryKeys.tripDayRecords(userId, input.tripDayId);

      queryClient.setQueryData<PlaceRow[]>(placesQueryKey, (currentPlaces) => [
        ...(currentPlaces ?? []).filter((place) => place.id !== data.place.id),
        data.place,
      ]);

      const createdRecord = data.record;
      if (createdRecord) {
        queryClient.setQueryData<RecordRow[]>(recordsQueryKey, (currentRecords) => [
          ...(currentRecords ?? []).filter((record) => record.id !== createdRecord.id),
          createdRecord,
        ]);
      }

      void Promise.all([
        queryClient.invalidateQueries({
          queryKey: supabaseQueryKeys.archivedTravelMoments(userId),
        }),
        queryClient.invalidateQueries({
          queryKey: placesQueryKey,
        }),
        queryClient.invalidateQueries({
          queryKey: recordsQueryKey,
        }),
        queryClient.invalidateQueries({
          queryKey: supabaseQueryKeys.tripPlaces(userId, input.tripId),
        }),
        queryClient.invalidateQueries({
          queryKey: supabaseQueryKeys.myTravelMapPlaces(userId),
        }),
        queryClient.invalidateQueries({
          queryKey: supabaseQueryKeys.tripRecords(userId, input.tripId),
        }),
        queryClient.invalidateQueries({
          queryKey: supabaseQueryKeys.tripDays(userId, input.tripId),
        }),
      ]).catch((error: unknown) => {
        console.warn('[useCreatePlaceRecord] invalidate failed', error);
      });
    },
  });
}
