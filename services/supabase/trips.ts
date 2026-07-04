import { supabase } from '@/lib/supabase';
import type { Tables, TablesInsert, TablesUpdate } from '@/types/supabase';
import { createTripDaysForRange } from '@/services/supabase/tripDays';

export type TripRow = Tables<'trips'>;

export class ActiveTripExistsError extends Error {
  constructor() {
    super('An active trip already exists for this user.');
    this.name = 'ActiveTripExistsError';
  }
}

type CreateTripStatus = Extract<TripRow['status'], 'active' | 'draft' | 'detected'>;

export type CreateTripWithDaysInput = {
  destinationCity?: string | null;
  destinationCityKo?: string | null;
  destinationCountry?: string | null;
  destinationCountryKo?: string | null;
  endDate: string;
  isEndDateUndecided?: boolean;
  startDate: string;
  status?: CreateTripStatus;
  title: string;
};

function throwIfError(error: Error | null) {
  if (error) {
    throw error;
  }
}

function normalizeText(value?: string | null) {
  return value?.trim() ?? '';
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
  const { data: authData, error: authError } = await supabase.auth.getUser();
  throwIfError(authError);

  if (!authData.user) {
    return null;
  }

  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .eq('id', tripId)
    .eq('user_id', authData.user.id)
    .neq('status', 'ignored')
    .is('deleted_at', null)
    .maybeSingle();

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

export async function completeActiveTrip(): Promise<TripRow | null> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  throwIfError(authError);

  if (!authData.user) {
    throw new Error('A Supabase session is required to complete a trip.');
  }

  const { data, error } = await supabase
    .from('trips')
    .update({
      status: 'completed',
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', authData.user.id)
    .eq('status', 'active')
    .is('deleted_at', null)
    .select()
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

export async function createTripWithDays(input: CreateTripWithDaysInput): Promise<TripRow> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  throwIfError(authError);

  if (!authData.user) {
    throw new Error('A Supabase session is required to create a trip.');
  }

  const status = input.status ?? 'active';

  if (status === 'active') {
    const existingActiveTrip = await fetchActiveTrip();

    if (existingActiveTrip) {
      throw new ActiveTripExistsError();
    }
  }

  const destinationCity =
    normalizeText(input.destinationCity) ||
    normalizeText(input.destinationCityKo) ||
    normalizeText(input.title) ||
    'Travel';
  const destinationCityKo =
    normalizeText(input.destinationCityKo) ||
    normalizeText(input.destinationCity) ||
    null;
  const destinationCountry =
    normalizeText(input.destinationCountry) ||
    normalizeText(input.destinationCountryKo) ||
    null;
  const destinationCountryKo =
    normalizeText(input.destinationCountryKo) ||
    normalizeText(input.destinationCountry) ||
    null;
  const title = normalizeText(input.title) || destinationCity;

  const { data: trip, error } = await createTrip({
    destination_city: destinationCity,
    destination_city_ko: destinationCityKo,
    destination_country: destinationCountry,
    destination_country_ko: destinationCountryKo,
    end_date: input.isEndDateUndecided ? null : input.endDate,
    is_end_date_undecided: input.isEndDateUndecided ?? false,
    start_date: input.startDate,
    status,
    title,
    user_id: authData.user.id,
  });
  throwIfError(error);

  if (!trip) {
    throw new Error('Trip was not created.');
  }

  try {
    await createTripDaysForRange(trip.id, input.startDate, input.endDate);
  } catch (tripDaysError) {
    try {
      await softDeleteTrip(trip.id);
    } catch {
      // Keep the original trip day creation error as the actionable failure.
    }
    throw tripDaysError;
  }

  return trip;
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
