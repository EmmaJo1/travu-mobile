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

export type UpdateRecordPatch = Pick<
  TablesUpdate<'records'>,
  'text' | 'updated_at' | 'visited_at'
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

export async function updateRecord(
  recordId: string,
  patch: UpdateRecordPatch,
): Promise<{ id: string; updated_at: string }> {
  const userId = await getCurrentUserId();
  const updatedAt = patch.updated_at ?? new Date().toISOString();
  const payload: UpdateRecordPatch = {
    ...patch,
    updated_at: updatedAt,
  };
  const { error } = await supabase
    .from('records')
    .update(payload)
    .eq('id', recordId)
    .eq('user_id', userId)
    .is('deleted_at', null);

  throwIfError(error);
  return { id: recordId, updated_at: updatedAt };
}

export async function softDeleteRecord(
  recordId: string,
): Promise<{ deleted_at: string; id: string; updated_at: string }> {
  const userId = await getCurrentUserId();
  const timestamp = new Date().toISOString();
  const { error } = await supabase
    .from('records')
    .update({
      deleted_at: timestamp,
      updated_at: timestamp,
    })
    .eq('id', recordId)
    .eq('user_id', userId)
    .is('deleted_at', null);

  throwIfError(error);
  return { deleted_at: timestamp, id: recordId, updated_at: timestamp };
}

export async function softDeleteRecordsByPlaceId(
  placeId: string,
): Promise<{ deleted_at: string; place_id: string; updated_at: string }> {
  const userId = await getCurrentUserId();
  const timestamp = new Date().toISOString();
  const { error } = await supabase
    .from('records')
    .update({
      deleted_at: timestamp,
      updated_at: timestamp,
    })
    .eq('place_id', placeId)
    .eq('user_id', userId)
    .is('deleted_at', null);

  if (error) {
    console.warn('[softDeleteRecordsByPlaceId] update failed', {
      code: error.code,
      details: error.details,
      hint: error.hint,
      message: error.message,
      placeId,
      userId,
    });
  }
  throwIfError(error);
  return { deleted_at: timestamp, place_id: placeId, updated_at: timestamp };
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
