import { supabase } from '@/lib/supabase';
import type { Tables, TablesInsert, TablesUpdate } from '@/types/supabase';

export type TripDayRow = Tables<'trip_days'>;

const DAY_MS = 86_400_000;

function throwIfError(error: Error | null) {
  if (error) {
    throw error;
  }
}

function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);

  if (!year || !month || !day) {
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
