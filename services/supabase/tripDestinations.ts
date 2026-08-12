import { supabase } from '@/lib/supabase';
import type { Json, Tables } from '@/types/supabase';

export type TripDestinationRow = Tables<'trip_destinations'>;

export type TripDestinationInput = {
  destinationKey: string;
  name: string;
  nameKo?: string | null;
  country?: string | null;
  countryKo?: string | null;
  destinationType: 'city' | 'country';
};

export type SyncActiveTripDestinationsInput = {
  tripId: string;
  destinations: TripDestinationInput[];
};

function normalizeOptionalText(value?: string | null) {
  const normalized = value?.trim();
  return normalized || null;
}

export async function fetchTripDestinations(tripId: string): Promise<TripDestinationRow[]> {
  const { data, error } = await supabase
    .from('trip_destinations')
    .select('*')
    .eq('trip_id', tripId)
    .is('deleted_at', null)
    .order('sort_order', { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function syncActiveTripDestinations(
  input: SyncActiveTripDestinationsInput,
): Promise<TripDestinationRow[]> {
  if (input.destinations.length === 0) {
    throw new Error('At least one destination is required.');
  }

  const destinations = input.destinations.map((destination) => {
    const destinationKey = destination.destinationKey.trim();
    const name = destination.name.trim();

    if (!destinationKey || !name) {
      throw new Error('Each destination requires a key and name.');
    }

    return {
      destination_key: destinationKey,
      name,
      name_ko: normalizeOptionalText(destination.nameKo),
      country: normalizeOptionalText(destination.country),
      country_ko: normalizeOptionalText(destination.countryKo),
      destination_type: destination.destinationType,
    };
  });

  const { data, error } = await supabase.rpc('sync_active_trip_destinations', {
    p_trip_id: input.tripId,
    p_destinations: destinations as Json,
  });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export const createTripDestinations = syncActiveTripDestinations;
