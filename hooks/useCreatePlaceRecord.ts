import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { PlaceCreateInput } from '@/components/record/PlaceCreateModal';
import { supabaseQueryKeys } from '@/hooks/supabaseQueryKeys';
import { useAuth } from '@/providers/AuthProvider';
import {
  createPlaceForTripDay,
  softDeletePlace,
  type PlaceRow,
} from '@/services/supabase/places';
import { createRecordForPlace, type RecordRow } from '@/services/supabase/records';

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

function buildVisitedAt(dateKey?: string, timeLabel?: string) {
  const resolvedDateKey = dateKey ?? undefined;

  if (!resolvedDateKey) {
    return null;
  }

  const trimmedTime = timeLabel?.trim();
  const matchedTime = trimmedTime?.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);

  if (!matchedTime) {
    return `${resolvedDateKey}T00:00:00.000Z`;
  }

  const hour12 = Number(matchedTime[1]);
  const minute = Number(matchedTime[2] ?? 0);
  const period = matchedTime[3].toUpperCase();
  const hour = period === 'AM'
    ? hour12 % 12
    : (hour12 % 12) + 12;

  return `${resolvedDateKey}T${String(hour).padStart(2, '0')}:${String(minute).padStart(
    2,
    '0',
  )}:00.000Z`;
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
      const visitedAt = buildVisitedAt(dateKey, input.time);
      const place = await createPlaceForTripDay({
        address: input.formattedAddress ?? null,
        city: input.cityName ?? input.city ?? null,
        country: input.countryName ?? null,
        googlePlaceId: input.googlePlaceId ?? null,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        memo: null,
        name: placeName,
        source: input.googlePlaceId ? 'google' : 'manual',
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
          queryKey: placesQueryKey,
        }),
        queryClient.invalidateQueries({
          queryKey: recordsQueryKey,
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
