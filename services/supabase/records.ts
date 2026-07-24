import { supabase } from '@/lib/supabase';
import type { Tables, TablesInsert, TablesUpdate } from '@/types/supabase';

export type RecordRow = Tables<'records'>;

export interface CreateRecordForPlaceInput {
  placeId: string;
  text?: string | null;
  tripDayId: string;
  tripId: string;
  visitedAt?: string | null;
}

export interface RecordMutationContext {
  placeId: string;
  tripDayId: string;
  tripId: string;
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

async function validateActiveRecordContext(
  recordId: string,
  context: RecordMutationContext,
  userId: string,
) {
  const [
    { data: record, error: recordError },
    { data: place, error: placeError },
    { data: tripDay, error: tripDayError },
    { data: trip, error: tripError },
  ] = await Promise.all([
    supabase
      .from('records')
      .select('id, user_id, place_id, trip_id, trip_day_id, deleted_at')
      .eq('id', recordId)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .maybeSingle(),
    supabase
      .from('places')
      .select('id, user_id, trip_id, trip_day_id, deleted_at')
      .eq('id', context.placeId)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .maybeSingle(),
    supabase
      .from('trip_days')
      .select('id, trip_id, date, deleted_at')
      .eq('id', context.tripDayId)
      .eq('trip_id', context.tripId)
      .is('deleted_at', null)
      .maybeSingle(),
    supabase
      .from('trips')
      .select('id, user_id, deleted_at')
      .eq('id', context.tripId)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .maybeSingle(),
  ]);

  throwIfError(recordError);
  throwIfError(placeError);
  throwIfError(tripDayError);
  throwIfError(tripError);

  const hasValidRelationship =
    record?.user_id === userId &&
    record.place_id === context.placeId &&
    record.trip_id === context.tripId &&
    record.trip_day_id === context.tripDayId &&
    place?.user_id === userId &&
    place.trip_id === context.tripId &&
    place.trip_day_id === context.tripDayId &&
    tripDay?.trip_id === context.tripId &&
    trip?.user_id === userId;

  if (!hasValidRelationship || !tripDay) {
    throw new Error('The selected record does not belong to the active place and trip day.');
  }

  return { record, tripDay };
}

export function listRecordsByPlace(placeId: string) {
  return supabase
    .from('records')
    .select('*, record_photos(*)')
    .eq('place_id', placeId)
    .is('deleted_at', null)
    .order('visited_at', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true });
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
  const normalizedText = input.text?.trim();

  if (!normalizedText) {
    throw new Error('A record must contain text.');
  }

  if (!input.visitedAt || Number.isNaN(new Date(input.visitedAt).getTime())) {
    throw new Error('A record must contain a valid visit time.');
  }

  const [
    { data: place, error: placeError },
    { data: tripDay, error: tripDayError },
    { data: trip, error: tripError },
  ] = await Promise.all([
    supabase
      .from('places')
      .select('id, user_id, trip_id, trip_day_id, deleted_at')
      .eq('id', input.placeId)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .maybeSingle(),
    supabase
      .from('trip_days')
      .select('id, trip_id, date, deleted_at')
      .eq('id', input.tripDayId)
      .eq('trip_id', input.tripId)
      .is('deleted_at', null)
      .maybeSingle(),
    supabase
      .from('trips')
      .select('id, user_id, deleted_at')
      .eq('id', input.tripId)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .maybeSingle(),
  ]);

  throwIfError(placeError);
  throwIfError(tripDayError);
  throwIfError(tripError);

  const hasValidParentRelationship =
    place?.user_id === userId &&
    place.trip_id === input.tripId &&
    place.trip_day_id === input.tripDayId &&
    tripDay?.trip_id === input.tripId &&
    input.visitedAt.slice(0, 10) === tripDay.date &&
    trip?.user_id === userId;

  if (!hasValidParentRelationship) {
    throw new Error('The selected place and trip day do not belong to the same active trip.');
  }

  const payload: TablesInsert<'records'> = {
    place_id: input.placeId,
    text: normalizedText,
    trip_day_id: input.tripDayId,
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
  context: RecordMutationContext,
): Promise<RecordRow> {
  const userId = await getCurrentUserId();
  const normalizedText = patch.text?.trim();
  const visitedAt = patch.visited_at;

  if (!normalizedText) {
    throw new Error('A record must contain text.');
  }

  if (!visitedAt || Number.isNaN(new Date(visitedAt).getTime())) {
    throw new Error('A record must contain a valid visit time.');
  }

  const { tripDay } = await validateActiveRecordContext(recordId, context, userId);

  if (visitedAt.slice(0, 10) !== tripDay.date) {
    throw new Error('The record visit time must belong to the selected trip day.');
  }

  const updatedAt = patch.updated_at ?? new Date().toISOString();
  const payload: UpdateRecordPatch = {
    text: normalizedText,
    updated_at: updatedAt,
    visited_at: visitedAt,
  };
  const { data, error } = await supabase
    .from('records')
    .update(payload)
    .eq('id', recordId)
    .eq('user_id', userId)
    .is('deleted_at', null)
    .select()
    .maybeSingle();

  throwIfError(error);

  if (!data) {
    throw new Error('The record could not be updated.');
  }

  return data;
}

export async function softDeleteRecord(
  recordId: string,
  context: RecordMutationContext,
): Promise<{ deleted_at: string; id: string; updated_at: string }> {
  const userId = await getCurrentUserId();
  await validateActiveRecordContext(recordId, context, userId);

  const timestamp = new Date().toISOString();
  const { data, error } = await supabase
    .from('records')
    .update({
      deleted_at: timestamp,
      updated_at: timestamp,
    })
    .eq('id', recordId)
    .eq('user_id', userId)
    .is('deleted_at', null)
    .select('id, deleted_at, updated_at')
    .maybeSingle();

  throwIfError(error);

  if (!data?.deleted_at) {
    throw new Error('The record could not be deleted.');
  }

  return {
    deleted_at: data.deleted_at,
    id: data.id,
    updated_at: data.updated_at,
  };
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
