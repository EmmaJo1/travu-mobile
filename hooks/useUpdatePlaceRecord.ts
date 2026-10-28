import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { PlaceCreateInput } from '@/components/record/PlaceCreateModal';
import { normalizePlaceCategoryValue } from '@/constants/placeCategories';
import { supabaseQueryKeys } from '@/hooks/supabaseQueryKeys';
import { useAuth } from '@/providers/AuthProvider';
import { updatePlace } from '@/services/supabase/places';
import { buildPlaceIdentityPatch } from '@/services/placeSearch/persistence';
import { createRecordForPlace, updateRecord } from '@/services/supabase/records';
import { buildVisitedAtIso } from '@/utils/placeEntryTime';

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
      const visitedAt = buildVisitedAtIso(dateKey, input.time);
      const place = await updatePlace(input.placeId, {
        ...buildPlaceIdentityPatch(input),
        category: normalizePlaceCategoryValue(input.category) ?? null,
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
          queryKey: supabaseQueryKeys.archivedTravelMoments(userId),
        }),
        queryClient.invalidateQueries({
          queryKey: supabaseQueryKeys.tripDayPlaces(userId, input.tripDayId),
        }),
        queryClient.invalidateQueries({
          queryKey: supabaseQueryKeys.tripDayRecords(userId, input.tripDayId),
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
        console.warn('[useUpdatePlaceRecord] invalidate failed', error);
      });
    },
  });
}
