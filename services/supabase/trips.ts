import { supabase } from '@/lib/supabase';
import type { Tables, TablesInsert, TablesUpdate } from '@/types/supabase';
import { createTripDaysForRange } from '@/services/supabase/tripDays';
import {
  syncActiveTripDestinations,
  type TripDestinationInput,
} from '@/services/supabase/tripDestinations';
import {
  enrichTripsWithPhotoCovers,
  type TripWithPhotoCover,
} from '@/services/supabase/photos';

export type TripRow = TripWithPhotoCover<Tables<'trips'>>;
export type SoftDeletedTrip = Pick<TripRow, 'deleted_at' | 'id' | 'updated_at'>;

export class ActiveTripExistsError extends Error {
  constructor() {
    super('An active trip already exists for this user.');
    this.name = 'ActiveTripExistsError';
  }
}

type CreateTripStatus = Extract<TripRow['status'], 'active' | 'draft' | 'detected'>;

export type CreateTripWithDaysInput = {
  destinations?: TripDestinationInput[];
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

export type UpdateActiveTripDestinationInput = {
  destinationCity: string;
  destinationCityKo?: string | null;
  destinationCountry?: string | null;
  destinationCountryKo?: string | null;
  tripId: string;
};

function throwIfError(error: Error | null) {
  if (error) {
    throw error;
  }
}

function normalizeText(value?: string | null) {
  return value?.trim() ?? '';
}

function createLegacyDestinationKey(name: string, country: string) {
  return `legacy:${name.toLowerCase()}|${country.toLowerCase()}`;
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
  return enrichTripsWithPhotoCovers(data ?? []);
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
  const [trip] = data ? await enrichTripsWithPhotoCovers([data]) : [];
  return trip ?? null;
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

export async function completeActiveTrip(): Promise<TripRow> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  throwIfError(authError);

  if (!authData.user) {
    throw new Error('A Supabase session is required to complete a trip.');
  }

  const { data, error } = await supabase
    .from('trips')
    .update({
      status: 'archived',
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', authData.user.id)
    .eq('status', 'active')
    .is('deleted_at', null)
    .select()
    .maybeSingle();

  throwIfError(error);

  if (!data) {
    throw new Error('No active trip was found to complete.');
  }

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
  return enrichTripsWithPhotoCovers(data ?? []);
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

    if (status === 'active') {
      const destinations = input.destinations?.length
        ? input.destinations
        : [{
            destinationKey: createLegacyDestinationKey(destinationCity, destinationCountry ?? ''),
            name: destinationCity,
            nameKo: destinationCityKo,
            country: destinationCountry,
            countryKo: destinationCountryKo,
            destinationType: 'city' as const,
          }];

      await syncActiveTripDestinations({
        tripId: trip.id,
        destinations,
      });
    }
  } catch (creationError) {
    try {
      await softDeleteTrip(trip.id);
    } catch {
      // Keep the original dependent-row creation error as the actionable failure.
    }
    throw creationError;
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

export async function updateActiveTripDestination(
  input: UpdateActiveTripDestinationInput,
): Promise<TripRow> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  throwIfError(authError);

  if (!authData.user) {
    throw new Error('A Supabase session is required to update a trip destination.');
  }

  const { data, error } = await supabase
    .from('trips')
    .update({
      destination_city: normalizeText(input.destinationCity),
      destination_city_ko:
        normalizeText(input.destinationCityKo) || normalizeText(input.destinationCity) || null,
      destination_country:
        normalizeText(input.destinationCountry) ||
        normalizeText(input.destinationCountryKo) ||
        null,
      destination_country_ko:
        normalizeText(input.destinationCountryKo) ||
        normalizeText(input.destinationCountry) ||
        null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.tripId)
    .eq('user_id', authData.user.id)
    .eq('status', 'active')
    .is('deleted_at', null)
    .select()
    .maybeSingle();

  throwIfError(error);

  if (!data) {
    throw new Error('No active trip was found to update.');
  }

  return data;
}

export async function softDeleteTrip(tripId: string): Promise<SoftDeletedTrip> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  throwIfError(sessionError);

  const { data: authData, error: authError } = await supabase.auth.getUser();
  throwIfError(authError);

  const sessionUserId = sessionData.session?.user.id;
  const authUserId = authData.user?.id;

  console.warn('[softDeleteTrip] session check', {
    getSessionUserId: sessionUserId,
    getUserUserId: authUserId,
    idsMatch: Boolean(sessionUserId && authUserId && sessionUserId === authUserId),
    tripId,
  });

  if (!sessionData.session || !sessionUserId) {
    throw new Error('Login session is required.');
  }

  if (!authData.user || !authUserId) {
    throw new Error('Login user is required.');
  }

  if (sessionUserId !== authUserId) {
    throw new Error('Login session user does not match current user.');
  }

  if (!authData.user) {
    throw new Error('로그인이 필요합니다.');
  }

  const { data: targetTrip, error: targetError } = await supabase
    .from('trips')
    .select('id,user_id,deleted_at')
    .eq('id', tripId)
    .is('deleted_at', null)
    .maybeSingle();

  if (targetError) {
    console.warn('[softDeleteTrip] target lookup failed', {
      code: targetError.code,
      details: targetError.details,
      hint: targetError.hint,
      message: targetError.message,
      tripId,
      userId: authUserId,
    });
    throw new Error(targetError.message);
  }

  if (!targetTrip) {
    throw new Error('Could not find a deletable trip for the current user.');
  }

  const timestamp = new Date().toISOString();
  const payload = {
    deleted_at: timestamp,
    updated_at: timestamp,
  };

  console.warn('[softDeleteTrip] target and payload check', {
    payloadFields: Object.keys(payload),
    targetDeletedAt: targetTrip.deleted_at,
    targetTripId: targetTrip.id,
    targetUserId: targetTrip.user_id,
    tripId,
    userId: authUserId,
    userIdMatchesTarget: targetTrip.user_id === authUserId,
  });

  const { error } = await supabase
    .from('trips')
    .update(payload)
    .eq('id', tripId)
    .eq('user_id', authUserId)
    .is('deleted_at', null);

  if (error) {
    console.warn('[softDeleteTrip] update failed', {
      code: error.code,
      details: error.details,
      hint: error.hint,
      message: error.message,
      tripId,
      userId: authUserId,
    });
    throw new Error(error.message);
  }

  return {
    deleted_at: timestamp,
    id: tripId,
    updated_at: timestamp,
  };
}
