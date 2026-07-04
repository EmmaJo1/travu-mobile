import { supabase } from '@/lib/supabase';
import type { Tables, TablesInsert, TablesUpdate } from '@/types/supabase';

export type TripRow = Tables<'trips'>;

function throwIfError(error: Error | null) {
  if (error) {
    throw error;
  }
}

export function listTripsByUser(userId: string) {
  return supabase
    .from('trips')
    .select('*')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('start_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });
}

export function getTripById(tripId: string) {
  return supabase
    .from('trips')
    .select('*')
    .eq('id', tripId)
    .is('deleted_at', null)
    .maybeSingle();
}

export async function fetchMyTrips(): Promise<TripRow[]> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  throwIfError(authError);

  if (!authData.user) {
    return [];
  }

  const { data, error } = await listTripsByUser(authData.user.id);
  throwIfError(error);
  return data ?? [];
}

export async function fetchTripById(tripId: string): Promise<TripRow | null> {
  const { data, error } = await getTripById(tripId);
  throwIfError(error);
  return data;
}

export async function fetchActiveTrip(): Promise<TripRow | null> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  throwIfError(authError);

  if (!authData.user) {
    return null;
  }

  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .eq('user_id', authData.user.id)
    .eq('status', 'active')
    .is('deleted_at', null)
    .maybeSingle();

  throwIfError(error);
  return data;
}

export async function fetchRecentTrips(limit = 12): Promise<TripRow[]> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  throwIfError(authError);

  if (!authData.user) {
    return [];
  }

  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .eq('user_id', authData.user.id)
    .is('deleted_at', null)
    .order('start_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  throwIfError(error);
  return data ?? [];
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
