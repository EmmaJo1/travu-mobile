import { supabase } from '@/lib/supabase';
import type { TablesInsert, TablesUpdate } from '@/types/supabase';

export function listRecordsByPlace(placeId: string) {
  return supabase
    .from('records')
    .select('*, record_photos(*)')
    .eq('place_id', placeId)
    .is('deleted_at', null)
    .order('visited_at', { ascending: true, nullsFirst: false });
}

export function createRecord(input: TablesInsert<'records'>) {
  return supabase
    .from('records')
    .insert(input)
    .select()
    .single();
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
