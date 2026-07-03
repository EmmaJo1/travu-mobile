import { supabase } from '@/lib/supabase';
import type { TablesInsert, TablesUpdate } from '@/types/supabase';

export function listPlacesByTripDay(tripDayId: string) {
  return supabase
    .from('places')
    .select('*')
    .eq('trip_day_id', tripDayId)
    .is('deleted_at', null)
    .order('visited_at', { ascending: true, nullsFirst: false });
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
