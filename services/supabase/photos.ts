import { supabase } from '@/lib/supabase';
import type { TablesInsert, TablesUpdate } from '@/types/supabase';

export function listPhotosByPlace(placeId: string) {
  return supabase
    .from('photos')
    .select('*')
    .eq('place_id', placeId)
    .is('deleted_at', null)
    .order('taken_at', { ascending: true, nullsFirst: false });
}

export function listPhotosByTrip(tripId: string) {
  return supabase
    .from('photos')
    .select('*')
    .eq('trip_id', tripId)
    .is('deleted_at', null)
    .order('taken_at', { ascending: true, nullsFirst: false });
}

export function createPhoto(input: TablesInsert<'photos'>) {
  return supabase
    .from('photos')
    .insert(input)
    .select()
    .single();
}

export function updatePhoto(photoId: string, patch: TablesUpdate<'photos'>) {
  return supabase
    .from('photos')
    .update(patch)
    .eq('id', photoId)
    .select()
    .single();
}

export function softDeletePhoto(photoId: string) {
  return updatePhoto(photoId, { deleted_at: new Date().toISOString() });
}
