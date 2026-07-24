import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { PlaceCreateInput } from '@/components/record/PlaceCreateModal';
import { supabaseQueryKeys } from '@/hooks/supabaseQueryKeys';
import { useAuth } from '@/providers/AuthProvider';
import { updatePlace } from '@/services/supabase/places';
import { createRecordForPlace, updateRecord } from '@/services/supabase/records';

export interface UpdatePlaceRecordInput extends PlaceCreateInput {
  placeId: string;
  recordId?: string | null;
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
  if (!dateKey) {
    return null;
  }

  const matchedTime = timeLabel?.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);

  if (!matchedTime) {
    return `${dateKey}T00:00:00.000Z`;
  }

  const hour12 = Number(matchedTime[1]);
  const minute = Number(matchedTime[2] ?? 0);
  const period = matchedTime[3].toUpperCase();
  const hour = period === 'AM' ? hour12 % 12 : (hour12 % 12) + 12;

  return `${dateKey}T${String(hour).padStart(2, '0')}:${String(minute).padStart(
    2,
    '0',
  )}:00.000Z`;
}

export function useUpdatePlaceRecord() {
  const queryClient = useQueryClient();
  const { canUseSupabaseUserData, user } = useAuth();

  return useMutation({
    mutationFn: async (input: UpdatePlaceRecordInput) => {
      if (!canUseSupabaseUserData || !user?.id) {
        throw new Error('A Supabase session is required to update a place record.');
      }

      const placeName = (input.placeName ?? input.place).trim();
      const recordText = input.text?.trim() || null;
      const shouldCreateRecord = Boolean(recordText);
      const dateKey = input.dateKey ?? parseDateKeyFromDateLabel(input.dateLabel);
      const visitedAt = buildVisitedAt(dateKey, input.time);
      const place = await updatePlace(input.placeId, {
        address: input.formattedAddress ?? null,
        city: input.cityName ?? input.city ?? null,
        country: input.countryName ?? null,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        name: placeName,
        visited_at: visitedAt,
      });
      const record = input.recordId
        ? await updateRecord(input.recordId, {
          text: recordText,
          visited_at: visitedAt,
        }, {
          placeId: input.placeId,
          tripDayId: input.tripDayId,
          tripId: input.tripId,
        })
        : shouldCreateRecord
          ? await createRecordForPlace({
          placeId: input.placeId,
          text: recordText,
          tripDayId: input.tripDayId,
          tripId: input.tripId,
          visitedAt,
        })
          : null;

      return { place, record };
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
        console.warn('[useUpdatePlaceRecord] invalidate failed', error);
      });
    },
  });
}
