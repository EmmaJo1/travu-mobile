import { supabase } from '@/lib/supabase';
import type { Tables, TablesInsert, TablesUpdate } from '@/types/supabase';
import {
  createTripDaysForRange,
  updateActiveTripDateRange,
} from '@/services/supabase/tripDays';
import {
  syncActiveTripDestinations,
  type TripDestinationInput,
} from '@/services/supabase/tripDestinations';
import {
  enrichTripsWithBookCovers,
  enrichTripsWithPhotoCovers,
  type TripWithPhotoCover,
} from '@/services/supabase/photos';
import {
  evaluateTripActivityForHome,
  getCurrentLocalDateKey,
} from '@/utils/tripActivity';
import { drainPendingPhotoStorageCleanup } from '@/services/supabase/photoStorageCleanup';

export type TripRow = TripWithPhotoCover<Tables<'trips'>>;
export interface SoftDeletedTrip {
  alreadyDeleted: boolean;
  deletedAt: string;
  deletedDestinationCount: number;
  deletedPhotoCount: number;
  deletedPlaceCount: number;
  deletedRecordCount: number;
  deletedRecordPhotoCount: number;
  deletedTripDayCount: number;
  id: string;
  storageCleanupIncomplete: boolean;
}

export class ActiveTripExistsError extends Error {
  constructor() {
    super('An active trip already exists for this user.');
    this.name = 'ActiveTripExistsError';
  }
}

export type TripCreationStage =
  | 'archive_expired_active_trip'
  | 'check_existing_active_trip'
  | 'create_trip'
  | 'create_trip_days'
  | 'sync_destinations';

type SupabaseErrorFields = {
  code?: unknown;
  details?: unknown;
  hint?: unknown;
  message?: unknown;
  status?: unknown;
};

export class TripCreationStageError extends Error {
  code?: string;
  details?: string;
  hint?: string;
  stage: TripCreationStage;
  status?: number;
  tripCreated: boolean;
  tripDayCount: number;

  constructor(
    stage: TripCreationStage,
    cause: unknown,
    context: {
      tripCreated?: boolean;
      tripDayCount?: number;
    } = {},
  ) {
    const fields =
      cause && typeof cause === 'object'
        ? (cause as SupabaseErrorFields)
        : {};
    const message =
      typeof fields.message === 'string'
        ? fields.message
        : cause instanceof Error
          ? cause.message
          : 'Trip creation failed.';

    super(message);
    this.name = 'TripCreationStageError';
    this.stage = stage;
    this.code = typeof fields.code === 'string' ? fields.code : undefined;
    this.details = typeof fields.details === 'string' ? fields.details : undefined;
    this.hint = typeof fields.hint === 'string' ? fields.hint : undefined;
    this.status = typeof fields.status === 'number' ? fields.status : undefined;
    this.tripCreated = context.tripCreated ?? false;
    this.tripDayCount = context.tripDayCount ?? 0;
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

function listPersistedActiveTripsByUser(userId: string) {
  return supabase
    .from('trips')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .is('deleted_at', null)
    .order('start_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });
}

async function fetchPersistedActiveTripsByUser(userId: string): Promise<TripRow[]> {
  const { data, error } = await listPersistedActiveTripsByUser(userId);
  throwIfError(error);
  return data ?? [];
}

export function listTripsByUser(userId: string) {
  return supabase
    .from('trips')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'archived')
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
  return enrichTripsWithBookCovers(data ?? []);
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

  const data = await fetchPersistedActiveTripsByUser(authData.user.id);
  const currentLocalDateKey = getCurrentLocalDateKey();
  const evaluations = data.map((trip) => ({
    evaluation: evaluateTripActivityForHome(trip, currentLocalDateKey),
    trip,
  }));
  const selectedTrip = evaluations.find(({ evaluation }) => evaluation.isActive)?.trip ?? null;

  if (__DEV__) {
    console.info('[home trip activity] evaluated', {
      activeTripCandidateCount: evaluations.length,
      activeTripSelected: Boolean(selectedTrip),
      dateBoundedTripCount: evaluations.filter(
        ({ evaluation }) => evaluation.reason === 'active_date_bounded',
      ).length,
      expiredTripCount: evaluations.filter(
        ({ evaluation }) => evaluation.reason === 'inactive_expired',
      ).length,
      homeMode: selectedTrip ? 'travel' : 'idle',
      openEndedTripCount: evaluations.filter(
        ({ evaluation }) => evaluation.reason === 'active_open_ended',
      ).length,
      periodUnsetTripCount: evaluations.filter(
        ({ evaluation }) => evaluation.reason === 'active_period_unset',
      ).length,
      tripListCount: evaluations.length,
    });
  }

  if (!selectedTrip) {
    return null;
  }

  const [tripWithCover] = await enrichTripsWithPhotoCovers([selectedTrip]);
  return tripWithCover ?? selectedTrip;
}

export async function completeActiveTrip(): Promise<TripRow> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  throwIfError(authError);

  if (!authData.user) {
    throw new Error('A Supabase session is required to complete a trip.');
  }

  const persistedActiveTrips = await fetchPersistedActiveTripsByUser(authData.user.id);
  const activeTrip = persistedActiveTrips[0];

  if (!activeTrip) {
    throw new Error('No active trip was found to complete.');
  }

  const currentLocalDateKey = getCurrentLocalDateKey();
  const startDate = activeTrip.start_date ?? currentLocalDateKey;
  const endDate = startDate > currentLocalDateKey ? startDate : currentLocalDateKey;
  const synchronized = await updateActiveTripDateRange({
    endDate,
    isEndDateUndecided: false,
    startDate,
    tripId: activeTrip.id,
  });

  const { data, error } = await supabase
    .from('trips')
    .update({
      status: 'archived',
      updated_at: new Date().toISOString(),
    })
    .eq('id', synchronized.trip.id)
    .eq('user_id', authData.user.id)
    .eq('status', 'active')
    .is('deleted_at', null)
    .select()
    .maybeSingle();

  throwIfError(error);

  if (!data) {
    throw new Error('The active trip was not archived after its date range was finalized.');
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
    .eq('status', 'archived')
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

async function preparePersistedActiveTripsForNewStart(userId: string) {
  const currentLocalDateKey = getCurrentLocalDateKey();
  let persistedActiveTrips: TripRow[];

  try {
    persistedActiveTrips = await fetchPersistedActiveTripsByUser(userId);
  } catch (error) {
    throw new TripCreationStageError('check_existing_active_trip', error);
  }
  const evaluations = persistedActiveTrips.map((trip) => ({
    evaluation: evaluateTripActivityForHome(trip, currentLocalDateKey),
    trip,
  }));
  const blockingTrip = evaluations.find(
    ({ evaluation }) => evaluation.reason !== 'inactive_expired',
  );

  if (blockingTrip) {
    throw new ActiveTripExistsError();
  }

  for (const { trip } of evaluations) {
    if (!trip.start_date || !trip.end_date) {
      throw new ActiveTripExistsError();
    }

    const { data, error } = await supabase
      .from('trips')
      .update({
        status: 'archived',
        updated_at: new Date().toISOString(),
      })
      .eq('id', trip.id)
      .eq('user_id', userId)
      .eq('status', 'active')
      .eq('start_date', trip.start_date)
      .eq('end_date', trip.end_date)
      .eq('is_end_date_undecided', false)
      .is('deleted_at', null)
      .select('id')
      .maybeSingle();

    if (error || !data) {
      throw new TripCreationStageError(
        'archive_expired_active_trip',
        error ?? new Error('The expired active trip was not archived.'),
      );
    }
  }

  if (__DEV__ && evaluations.length > 0) {
    console.info('[trip creation] expired active trips archived', {
      archivedTripCount: evaluations.length,
      stage: 'archive_expired_active_trip',
    });
  }
}

export async function createTripWithDays(input: CreateTripWithDaysInput): Promise<TripRow> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  throwIfError(authError);

  if (!authData.user) {
    throw new Error('A Supabase session is required to create a trip.');
  }

  const status = input.status ?? 'active';

  if (status === 'active') {
    await preparePersistedActiveTripsForNewStart(authData.user.id);
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

  if (error) {
    const uniqueViolationContext = `${error.message} ${error.details ?? ''}`;

    if (
      error.code === '23505'
      && uniqueViolationContext.includes('trips_one_active_per_user_idx')
    ) {
      throw new ActiveTripExistsError();
    }

    throw new TripCreationStageError('create_trip', error);
  }

  if (!trip) {
    throw new TripCreationStageError(
      'create_trip',
      new Error('Trip was not created.'),
    );
  }

  if (__DEV__) {
    console.info('[trip creation] stage completed', {
      stage: 'create_trip',
      tripCreated: true,
    });
  }

  let createdTripDayCount = 0;

  try {
    const tripDays = await createTripDaysForRange(trip.id, input.startDate, input.endDate);
    createdTripDayCount = tripDays.length;

    if (__DEV__) {
      console.info('[trip creation] stage completed', {
        stage: 'create_trip_days',
        tripCreated: true,
        tripDayCount: createdTripDayCount,
      });
    }
  } catch (creationError) {
    try {
      await softDeleteTrip(trip.id);
    } catch {
      // Keep the original dependent-row creation error as the actionable failure.
    }
    throw new TripCreationStageError('create_trip_days', creationError, {
      tripCreated: true,
    });
  }

  try {
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

      if (__DEV__) {
        console.info('[trip creation] stage completed', {
          stage: 'sync_destinations',
          tripCreated: true,
          tripDayCount: createdTripDayCount,
        });
      }
    }
  } catch (creationError) {
    try {
      await softDeleteTrip(trip.id);
    } catch {
      // Keep the original dependent-row creation error as the actionable failure.
    }
    throw new TripCreationStageError('sync_destinations', creationError, {
      tripCreated: true,
      tripDayCount: createdTripDayCount,
    });
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
  const { data, error } = await supabase.rpc('soft_delete_trip_tree', {
    p_trip_id: tripId,
  });
  throwIfError(error);

  const result = data?.[0];
  if (!result) {
    throw new Error('The trip could not be deleted.');
  }

  const storageCleanup = await drainPendingPhotoStorageCleanup();
  if (storageCleanup.incomplete) {
    console.warn('[softDeleteTrip] photo storage cleanup incomplete', {
      attemptedObjectCount: storageCleanup.attemptedObjectCount,
      batchCount: storageCleanup.batchCount,
    });
  }

  return {
    alreadyDeleted: result.already_deleted,
    deletedAt: result.deleted_at,
    deletedDestinationCount: result.deleted_destination_count,
    deletedPhotoCount: result.deleted_photo_count,
    deletedPlaceCount: result.deleted_place_count,
    deletedRecordCount: result.deleted_record_count,
    deletedRecordPhotoCount: result.deleted_record_photo_count,
    deletedTripDayCount: result.deleted_trip_day_count,
    id: result.trip_id,
    storageCleanupIncomplete: storageCleanup.incomplete,
  };
}
