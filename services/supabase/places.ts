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
  category?: PlaceRow['category'];
}

export type UpdatePlacePatch = Pick<
  TablesUpdate<'places'>,
  | 'address'
  | 'city'
  | 'category'
  | 'country'
  | 'custom_name'
  | 'google_place_id'
  | 'latitude'
  | 'longitude'
  | 'memo'
  | 'name'
  | 'source'
  | 'trip_day_id'
  | 'updated_at'
  | 'visited_at'
>;

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

export function listPlacesByTrip(tripId: string) {
  return supabase
    .from('places')
    .select('*')
    .eq('trip_id', tripId)
    .is('deleted_at', null)
    .order('visited_at', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true });
}

export async function fetchPlacesByTripId(tripId: string): Promise<PlaceRow[]> {
  const { data, error } = await listPlacesByTrip(tripId);
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

export async function fetchPlaceById(placeId: string): Promise<PlaceRow | null> {
  const { data, error } = await getPlaceById(placeId);
  throwIfError(error);
  return data;
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
    category: input.category ?? null,
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

export async function updatePlace(
  placeId: string,
  patch: UpdatePlacePatch,
): Promise<{ id: string; updated_at: string }> {
  const userId = await getCurrentUserId();
  const updatedAt = patch.updated_at ?? new Date().toISOString();
  const payload: UpdatePlacePatch = {
    ...patch,
    updated_at: updatedAt,
  };
  const { error } = await supabase
    .from('places')
    .update(payload)
    .eq('id', placeId)
    .eq('user_id', userId)
    .is('deleted_at', null);

  throwIfError(error);
  return { id: placeId, updated_at: updatedAt };
}

export async function softDeletePlace(
  placeId: string,
): Promise<{ deleted_at: string; id: string; updated_at: string }> {
  const userId = await getCurrentUserId();
  const timestamp = new Date().toISOString();
  const { data, error } = await supabase
    .from('places')
    .update({
      deleted_at: timestamp,
      updated_at: timestamp,
    })
    .eq('id', placeId)
    .eq('user_id', userId)
    .is('deleted_at', null)
    .select('id, deleted_at, updated_at')
    .maybeSingle();

  if (error) {
    console.warn('[softDeletePlace] update failed', {
      code: error.code,
      details: error.details,
      hint: error.hint,
      message: error.message,
      placeId,
      userId,
    });
  }
  throwIfError(error);

  if (!data?.deleted_at) {
    throw new Error('The place could not be deleted.');
  }

  return {
    deleted_at: data.deleted_at,
    id: data.id,
    updated_at: data.updated_at,
  };
}

export async function softDeletePlaceTree(placeId: string) {
  const { data, error } = await supabase.rpc('soft_delete_place_tree', {
    p_place_id: placeId,
  });

  throwIfError(error);

  const result = data?.[0];
  if (!result) {
    throw new Error('The place could not be deleted.');
  }

  return result;
}
