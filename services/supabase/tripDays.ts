import { supabase } from '@/lib/supabase';
import type { Tables, TablesInsert, TablesUpdate } from '@/types/supabase';

export type TripDayRow = Tables<'trip_days'>;
export type TripRow = Tables<'trips'>;

export type UpdateActiveTripDateRangeInput = {
  tripId: string;
  startDate: string;
  endDate: string;
  isEndDateUndecided: boolean;
};

export type UpdateActiveTripDateRangeResult = {
  trip: TripRow;
  tripDays: TripDayRow[];
};

export class TripDateRangeHasDataError extends Error {
  blockedDates: string[];

  constructor(blockedDates: string[]) {
    super('Trip days with linked data cannot be removed from the date range.');
    this.name = 'TripDateRangeHasDataError';
    this.blockedDates = blockedDates;
  }
}

const DAY_MS = 86_400_000;

function throwIfError(error: Error | null) {
  if (error) {
    throw error;
  }
}

function parseDateKey(dateKey: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    throw new Error(`Invalid date key: ${dateKey}`);
  }

  const [year, month, day] = dateKey.split('-').map(Number);

  if (!year || !month || !day) {
    throw new Error(`Invalid date key: ${dateKey}`);
  }

  const normalizedDate = new Date(Date.UTC(year, month - 1, day));

  if (
    normalizedDate.getUTCFullYear() !== year ||
    normalizedDate.getUTCMonth() !== month - 1 ||
    normalizedDate.getUTCDate() !== day
  ) {
    throw new Error(`Invalid date key: ${dateKey}`);
  }

  return { day, month, year };
}

function dateKeyToUtcTime(dateKey: string) {
  const { day, month, year } = parseDateKey(dateKey);
  return Date.UTC(year, month - 1, day);
}

function utcTimeToDateKey(time: number) {
  const date = new Date(time);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function buildTripDaysForRange(tripId: string, startDate: string, endDate: string) {
  const startTime = dateKeyToUtcTime(startDate);
  const endTime = dateKeyToUtcTime(endDate);

  if (endTime < startTime) {
    throw new Error('Trip end date must be on or after start date.');
  }

  const dayCount = Math.floor((endTime - startTime) / DAY_MS) + 1;

  return Array.from({ length: dayCount }, (_, index): TablesInsert<'trip_days'> => ({
    date: utcTimeToDateKey(startTime + index * DAY_MS),
    day_index: index + 1,
    trip_id: tripId,
  }));
}

export function listTripDays(tripId: string) {
  return supabase
    .from('trip_days')
    .select('*')
    .eq('trip_id', tripId)
    .is('deleted_at', null)
    .order('day_index', { ascending: true });
}

export async function fetchTripDays(tripId: string): Promise<TripDayRow[]> {
  const { data, error } = await listTripDays(tripId);
  throwIfError(error);
  return data ?? [];
}

export async function fetchTripDaysByTripId(tripId: string): Promise<TripDayRow[]> {
  return fetchTripDays(tripId);
}

export async function fetchTripDayByDate(
  tripId: string,
  date: string,
): Promise<TripDayRow | null> {
  const { data, error } = await supabase
    .from('trip_days')
    .select('*')
    .eq('trip_id', tripId)
    .eq('date', date)
    .is('deleted_at', null)
    .maybeSingle();

  throwIfError(error);
  return data;
}

export function createTripDay(input: TablesInsert<'trip_days'>) {
  return supabase
    .from('trip_days')
    .insert(input)
    .select()
    .single();
}

export async function createTripDaysForRange(
  tripId: string,
  startDate: string,
  endDate: string,
): Promise<TripDayRow[]> {
  const tripDays = buildTripDaysForRange(tripId, startDate, endDate);
  const { data, error } = await supabase
    .from('trip_days')
    .insert(tripDays)
    .select();

  throwIfError(error);
  return data ?? [];
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

function getTodayDateKey() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function findTripDayIdsWithActiveData(tripDayIds: string[]): Promise<Set<string>> {
  if (tripDayIds.length === 0) {
    return new Set();
  }

  const [placesResult, photosResult, recordsResult] = await Promise.all([
    supabase
      .from('places')
      .select('trip_day_id')
      .in('trip_day_id', tripDayIds)
      .is('deleted_at', null),
    supabase
      .from('photos')
      .select('trip_day_id')
      .in('trip_day_id', tripDayIds)
      .is('deleted_at', null),
    supabase
      .from('records')
      .select('trip_day_id')
      .in('trip_day_id', tripDayIds)
      .is('deleted_at', null),
  ]);

  throwIfError(placesResult.error);
  throwIfError(photosResult.error);
  throwIfError(recordsResult.error);

  return new Set(
    [...(placesResult.data ?? []), ...(photosResult.data ?? []), ...(recordsResult.data ?? [])]
      .map((row) => row.trip_day_id)
      .filter((tripDayId): tripDayId is string => Boolean(tripDayId)),
  );
}

async function restoreOrCreateTripDay(input: TablesInsert<'trip_days'>): Promise<{
  row: TripDayRow;
  restored: boolean;
}> {
  const timestamp = new Date().toISOString();
  const { data: softDeletedTripDay, error: findError } = await supabase
    .from('trip_days')
    .select('*')
    .eq('trip_id', input.trip_id)
    .eq('date', input.date)
    .not('deleted_at', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  throwIfError(findError);

  if (!softDeletedTripDay) {
    const { data: created, error: createError } = await createTripDay(input);
    throwIfError(createError);

    if (!created) {
      throw new Error(`Trip day was not created for ${input.date}.`);
    }

    return { row: created, restored: false };
  }

  const { data: restored, error: restoreError } = await supabase
    .from('trip_days')
    .update({
      day_index: input.day_index,
      deleted_at: null,
      updated_at: timestamp,
    })
    .eq('id', softDeletedTripDay.id)
    .select()
    .single();

  throwIfError(restoreError);

  if (!restored) {
    throw new Error(`Trip day was not restored for ${input.date}.`);
  }

  return { row: restored, restored: true };
}

async function restoreTripDaySnapshot(
  snapshot: TripDayRow[],
  createdTripDayIds: string[],
  restoredTripDayIds: string[],
) {
  const timestamp = new Date().toISOString();
  const rollbackBase =
    Math.max(0, ...snapshot.map((day) => day.day_index)) + snapshot.length * 2 + 200;

  for (const tripDayId of [...createdTripDayIds, ...restoredTripDayIds]) {
    const { error } = await supabase
      .from('trip_days')
      .update({ deleted_at: timestamp, updated_at: timestamp })
      .eq('id', tripDayId);
    throwIfError(error);
  }

  for (const [index, day] of snapshot.entries()) {
    const { error } = await supabase
      .from('trip_days')
      .update({ day_index: rollbackBase + index, updated_at: timestamp })
      .eq('id', day.id);
    throwIfError(error);
  }

  for (const day of snapshot) {
    const { error } = await supabase
      .from('trip_days')
      .update({
        day_index: day.day_index,
        deleted_at: day.deleted_at,
        updated_at: timestamp,
      })
      .eq('id', day.id);
    throwIfError(error);
  }

  if (snapshot.length > 0) {
    const restoredTripDays = await fetchTripDays(snapshot[0].trip_id);
    const snapshotByDate = new Map(snapshot.map((day) => [day.date, day.day_index]));
    const wasRestored =
      restoredTripDays.length === snapshot.length &&
      restoredTripDays.every((day) => snapshotByDate.get(day.date) === day.day_index);

    if (!wasRestored) {
      throw new Error('Trip day rollback could not restore the original active rows.');
    }
  }
}

export async function updateActiveTripDateRange(
  input: UpdateActiveTripDateRangeInput,
): Promise<UpdateActiveTripDateRangeResult> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  throwIfError(authError);

  if (!authData.user) {
    throw new Error('A Supabase session is required to update a trip date range.');
  }

  const startTime = dateKeyToUtcTime(input.startDate);
  const requestedEndTime = dateKeyToUtcTime(input.endDate);

  if (!input.isEndDateUndecided && requestedEndTime < startTime) {
    throw new Error('Trip end date must be on or after start date.');
  }

  const today = getTodayDateKey();
  const effectiveEndDate = input.isEndDateUndecided
    ? startTime > dateKeyToUtcTime(today) ? input.startDate : today
    : input.endDate;
  const desiredTripDays = buildTripDaysForRange(
    input.tripId,
    input.startDate,
    effectiveEndDate,
  );

  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .select('*')
    .eq('id', input.tripId)
    .eq('user_id', authData.user.id)
    .eq('status', 'active')
    .is('deleted_at', null)
    .maybeSingle();
  throwIfError(tripError);

  if (!trip) {
    throw new Error('No active trip was found to update.');
  }

  const existingTripDays = await fetchTripDays(input.tripId);
  const desiredDates = new Set(desiredTripDays.map((day) => day.date));
  const existingByDate = new Map(existingTripDays.map((day) => [day.date, day]));
  const excludedTripDays = existingTripDays.filter((day) => !desiredDates.has(day.date));
  const tripDayIdsWithData = await findTripDayIdsWithActiveData(
    excludedTripDays.map((day) => day.id),
  );
  const blockedDates = excludedTripDays
    .filter((day) => tripDayIdsWithData.has(day.id))
    .map((day) => day.date)
    .sort();

  if (blockedDates.length > 0) {
    throw new TripDateRangeHasDataError(blockedDates);
  }

  const timestamp = new Date().toISOString();
  const temporaryBase =
    Math.max(0, ...existingTripDays.map((day) => day.day_index)) +
    desiredTripDays.length +
    existingTripDays.length +
    100;
  const createdTripDayIds: string[] = [];
  const restoredTripDayIds: string[] = [];
  let tripWasUpdated = false;

  try {
    for (const [index, day] of existingTripDays.entries()) {
      const { error } = await supabase
        .from('trip_days')
        .update({ day_index: temporaryBase + index, updated_at: timestamp })
        .eq('id', day.id);
      throwIfError(error);
    }

    const desiredRows: TripDayRow[] = [];

    for (const desiredDay of desiredTripDays) {
      const existingDay = existingByDate.get(desiredDay.date);

      if (existingDay) {
        desiredRows.push(existingDay);
        continue;
      }

      const result = await restoreOrCreateTripDay(desiredDay);
      desiredRows.push(result.row);

      if (result.restored) {
        restoredTripDayIds.push(result.row.id);
      } else {
        createdTripDayIds.push(result.row.id);
      }
    }

    for (const [index, day] of desiredRows.entries()) {
      const { error } = await supabase
        .from('trip_days')
        .update({ day_index: index + 1, updated_at: timestamp })
        .eq('id', day.id);
      throwIfError(error);
    }

    if (excludedTripDays.length > 0) {
      const { error } = await supabase
        .from('trip_days')
        .update({ deleted_at: timestamp, updated_at: timestamp })
        .in('id', excludedTripDays.map((day) => day.id));
      throwIfError(error);
    }

    const { data: updatedTrip, error: updateTripError } = await supabase
      .from('trips')
      .update({
        start_date: input.startDate,
        end_date: input.isEndDateUndecided ? null : input.endDate,
        is_end_date_undecided: input.isEndDateUndecided,
        updated_at: timestamp,
      })
      .eq('id', input.tripId)
      .eq('user_id', authData.user.id)
      .eq('status', 'active')
      .is('deleted_at', null)
      .select()
      .maybeSingle();
    throwIfError(updateTripError);

    if (!updatedTrip) {
      throw new Error('No active trip was found to update.');
    }

    tripWasUpdated = true;
    const syncedTripDays = await fetchTripDays(input.tripId);
    const isFullySynced =
      syncedTripDays.length === desiredTripDays.length &&
      syncedTripDays.every(
        (day, index) =>
          day.date === desiredTripDays[index]?.date && day.day_index === index + 1,
      );

    if (!isFullySynced) {
      throw new Error('Trip days did not match the requested date range after synchronization.');
    }

    return { trip: updatedTrip, tripDays: syncedTripDays };
  } catch (error) {
    try {
      await restoreTripDaySnapshot(
        existingTripDays,
        createdTripDayIds,
        restoredTripDayIds,
      );

      if (tripWasUpdated) {
        const { error: restoreTripError } = await supabase
          .from('trips')
          .update({
            start_date: trip.start_date,
            end_date: trip.end_date,
            is_end_date_undecided: trip.is_end_date_undecided,
            updated_at: new Date().toISOString(),
          })
          .eq('id', trip.id)
          .eq('user_id', authData.user.id);
        throwIfError(restoreTripError);
      }
    } catch (rollbackError) {
      console.error('Failed to restore trip date range after an update error.', rollbackError);
    }

    throw error;
  }
}
