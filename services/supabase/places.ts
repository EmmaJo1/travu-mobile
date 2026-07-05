import { supabase } from '@/lib/supabase';
import type { Tables, TablesInsert, TablesUpdate } from '@/types/supabase';

export type PlaceRow = Tables<'places'>;

export interface CreatePlaceForTripDayInput {
  address?: string | null;
  city?: string | null;
  country?: string | null;
  googlePlaceId?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  memo?: string | null;
  name: string;
  source?: PlaceRow['source'];
  tripDayId?: string | null;
  tripId: string;
  visitedAt?: string | null;
}

function throwIfError(error: Error | null) {
  if (error) {
    throw error;
  }
}

async function getCurrentUserId() {
  const { data, error } = await supabase.auth.getUser();
  throwIfError(error);

  if (!data.user?.id) {
    throw new Error('로그인이 필요합니다.');
  }

  return data.user.id;
}

export function listPlacesByTripDay(tripDayId: string) {
  return supabase
    .from('places')
    .select('*')
    .eq('trip_day_id', tripDayId)
    .is('deleted_at', null)
    .order('visited_at', { ascending: true, nullsFirst: false });
}

export async function fetchPlacesByTripDayId(tripDayId: string): Promise<PlaceRow[]> {
  const { data, error } = await listPlacesByTripDay(tripDayId);
  throwIfError(error);
  return data ?? [];
}

export function getPlaceById(placeId: string) {
  return supabase
    .from('places')
    .select('*')
    .eq('id', placeId)
    .is('deleted_at', null)
    .maybeSingle();
}

export function createPlace(input: TablesInsert<'places'>) {
  return supabase
    .from('places')
    .insert(input)
    .select()
    .single();
}

export async function createPlaceForTripDay(
  input: CreatePlaceForTripDayInput,
): Promise<PlaceRow> {
  const userId = await getCurrentUserId();
  const source = input.googlePlaceId ? 'google' : input.source ?? 'manual';

  const payload: TablesInsert<'places'> = {
    address: input.address ?? null,
    city: input.city ?? null,
    country: input.country ?? null,
    google_place_id: input.googlePlaceId ?? null,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    memo: input.memo ?? null,
    name: input.name,
    source,
    trip_day_id: input.tripDayId ?? null,
    trip_id: input.tripId,
    user_id: userId,
    visited_at: input.visitedAt ?? null,
  };

  const { data, error } = await createPlace(payload);
  throwIfError(error);

  if (!data) {
    throw new Error('장소를 저장하지 못했습니다.');
  }

  return data;
}

export function updatePlace(placeId: string, patch: TablesUpdate<'places'>) {
  return supabase
    .from('places')
    .update(patch)
    .eq('id', placeId)
    .select()
    .single();
}

export function softDeletePlace(placeId: string) {
  return updatePlace(placeId, { deleted_at: new Date().toISOString() });
}
