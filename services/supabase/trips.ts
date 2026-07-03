import { supabase } from '@/lib/supabase';
import type { TablesInsert, TablesUpdate } from '@/types/supabase';

export function listTripsByUser(userId: string) {
  return supabase
    .from('trips')
    .select('*')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('start_date', { ascending: false, nullsFirst: false });
}

export function getTripById(tripId: string) {
  return supabase
    .from('trips')
    .select('*')
    .eq('id', tripId)
    .is('deleted_at', null)
    .maybeSingle();
}

export function createTrip(input: TablesInsert<'trips'>) {
  return supabase
    .from('trips')
    .insert(input)
    .select()
    .single();
}

export function updateTrip(tripId: string, patch: TablesUpdate<'trips'>) {
  return supabase
    .from('trips')
    .update(patch)
    .eq('id', tripId)
    .select()
    .single();
}

export function softDeleteTrip(tripId: string) {
  return updateTrip(tripId, { deleted_at: new Date().toISOString() });
}
