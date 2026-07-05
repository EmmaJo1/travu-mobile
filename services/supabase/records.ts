import { supabase } from '@/lib/supabase';
import type { Tables, TablesInsert, TablesUpdate } from '@/types/supabase';

export type RecordRow = Tables<'records'>;

export interface CreateRecordForPlaceInput {
  placeId: string;
  text?: string | null;
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

export function listRecordsByPlace(placeId: string) {
  return supabase
    .from('records')
    .select('*, record_photos(*)')
    .eq('place_id', placeId)
    .is('deleted_at', null)
    .order('visited_at', { ascending: true, nullsFirst: false });
}

export async function fetchRecordsByPlaceId(placeId: string): Promise<RecordRow[]> {
  const { data, error } = await listRecordsByPlace(placeId);
  throwIfError(error);
  return data ?? [];
}

export function listRecordsByTripDay(tripDayId: string) {
  return supabase
    .from('records')
    .select('*')
    .eq('trip_day_id', tripDayId)
    .is('deleted_at', null)
    .order('visited_at', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true });
}

export async function fetchRecordsByTripDayId(tripDayId: string): Promise<RecordRow[]> {
  const { data, error } = await listRecordsByTripDay(tripDayId);
  throwIfError(error);
  return data ?? [];
}

export function createRecord(input: TablesInsert<'records'>) {
  return supabase
    .from('records')
    .insert(input)
    .select()
    .single();
}

export async function createRecordForPlace(
  input: CreateRecordForPlaceInput,
): Promise<RecordRow> {
  const userId = await getCurrentUserId();
  const payload: TablesInsert<'records'> = {
    place_id: input.placeId,
    text: input.text ?? null,
    trip_day_id: input.tripDayId ?? null,
    trip_id: input.tripId,
    user_id: userId,
    visited_at: input.visitedAt ?? null,
  };

  const { data, error } = await createRecord(payload);
  throwIfError(error);

  if (!data) {
    throw new Error('기록을 저장하지 못했습니다.');
  }

  return data;
}

export function updateRecord(recordId: string, patch: TablesUpdate<'records'>) {
  return supabase
    .from('records')
    .update(patch)
    .eq('id', recordId)
    .select()
    .single();
}

export function softDeleteRecord(recordId: string) {
  return updateRecord(recordId, { deleted_at: new Date().toISOString() });
}

export function attachPhotoToRecord(input: TablesInsert<'record_photos'>) {
  return supabase
    .from('record_photos')
    .insert(input)
    .select()
    .single();
}

export function detachPhotoFromRecord(recordId: string, photoId: string) {
  return supabase
    .from('record_photos')
    .update({ deleted_at: new Date().toISOString() })
    .eq('record_id', recordId)
    .eq('photo_id', photoId);
}
