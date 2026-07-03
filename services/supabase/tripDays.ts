import { supabase } from '@/lib/supabase';
import type { TablesInsert, TablesUpdate } from '@/types/supabase';

export function listTripDays(tripId: string) {
  return supabase
    .from('trip_days')
    .select('*')
    .eq('trip_id', tripId)
    .is('deleted_at', null)
    .order('day_index', { ascending: true });
}

export function createTripDay(input: TablesInsert<'trip_days'>) {
  return supabase
    .from('trip_days')
    .insert(input)
    .select()
    .single();
}

export function updateTripDay(tripDayId: string, patch: TablesUpdate<'trip_days'>) {
  return supabase
    .from('trip_days')
    .update(patch)
    .eq('id', tripDayId)
    .select()
    .single();
}

export function softDeleteTripDay(tripDayId: string) {
  return updateTripDay(tripDayId, { deleted_at: new Date().toISOString() });
}
