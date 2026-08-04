import type { MyPageTrip } from '@/constants/mockMyPageTrips';
import type { IdleRecentTrip } from '@/constants/mockIdleHomeData';
import type { TripDayRow } from '@/services/supabase/tripDays';
import type { TripRow } from '@/services/supabase/trips';
import { formatTripDateRangeLabel } from '@/utils/tripDateRange';

const FALLBACK_TRIP_TITLE = 'TRAVEL';

export type HomeSummaryTripInput = {
  city?: string | null;
  cityName?: string | null;
  dateRangeLabel?: string | null;
  destinationName?: string | null;
  endDate?: string | null;
  isEndDateUndecided?: boolean | null;
  photoCount?: number | null;
  startDate?: string | null;
  status?: string | null;
  visitedCities?: string[] | null;
};

function normalizeText(value?: string | null) {
  return value?.trim() ?? '';
}

function getDateParts(value?: string | null) {
  if (!value) {
    return null;
  }

  const [year, month, day] = value.split('-').map(Number);

  if (!year || !month || !day) {
    return null;
  }

  return { day, month, year };
}

function getInclusiveDayCount(startDate?: string | null, endDate?: string | null) {
  const startParts = getDateParts(startDate);
  const endParts = getDateParts(endDate);

  if (!startParts || !endParts) {
    return 1;
  }

  const start = Date.UTC(startParts.year, startParts.month - 1, startParts.day);
  const end = Date.UTC(endParts.year, endParts.month - 1, endParts.day);
  const diff = Math.floor((end - start) / 86_400_000) + 1;

  return Math.max(1, diff);
}

function getDisplayCity(trip: TripRow) {
  return (
    normalizeText(trip.destination_city_ko) ||
    normalizeText(trip.destination_city) ||
    normalizeText(trip.title) ||
    FALLBACK_TRIP_TITLE
  );
}

function getTripBookTitle(trip: TripRow) {
  return (
    normalizeText(trip.destination_city) ||
    normalizeText(trip.title) ||
    normalizeText(trip.destination_city_ko) ||
    FALLBACK_TRIP_TITLE ||
    'TRAVEL'
  );
}

function getDisplayCountry(trip: TripRow) {
  return normalizeText(trip.destination_country_ko) || normalizeText(trip.destination_country);
}

export function mapSupabaseTripToMyPageTrip(
  trip: TripRow,
  tripDays?: TripDayRow[] | null,
): MyPageTrip {
  const city = getDisplayCity(trip);
  const country = getDisplayCountry(trip);
  const safeTitle = getTripBookTitle(trip);

  return {
    id: trip.id,
    title: safeTitle,
    city,
    country,
    visitedCities: city ? [city] : [],
    visitedCountries: country ? [country] : [],
    dateRangeLabel: formatTripDateRangeLabel({
      createdAt: trip.created_at,
      endDate: trip.end_date,
      startDate: trip.start_date,
    }, tripDays),
    coverImage: trip.cover_display_url
      ? { uri: trip.cover_display_url }
      : undefined,
    daysCount: tripDays?.length ?? getInclusiveDayCount(trip.start_date, trip.end_date),
    photoCount: trip.active_photo_count ?? 0,
  };
}

export function mapSupabaseTripsToMyPageTrips(trips: TripRow[]): MyPageTrip[] {
  return trips.map((trip) => mapSupabaseTripToMyPageTrip(trip));
}

export function mapSupabaseTripToIdleRecentTrip(trip: TripRow): IdleRecentTrip {
  const city = getDisplayCity(trip);
  const country = getDisplayCountry(trip);

  return {
    id: `supabase-recent-${trip.id}`,
    tripId: trip.id,
    city,
    country,
    dateRange: formatTripDateRangeLabel({
      createdAt: trip.created_at,
      endDate: trip.end_date,
      startDate: trip.start_date,
    }),
    image: trip.cover_display_url
      ? { uri: trip.cover_display_url }
      : undefined,
    photoCount: trip.active_photo_count ?? 0,
    placeCount: 0,
    startDate: trip.start_date ?? undefined,
    endDate: trip.end_date ?? trip.start_date ?? undefined,
    status: 'saved',
  };
}

export function mapSupabaseTripsToIdleRecentTrips(trips: TripRow[]): IdleRecentTrip[] {
  return trips.map(mapSupabaseTripToIdleRecentTrip);
}

export function mapSupabaseTripToHomeSummaryTrip(trip: TripRow): HomeSummaryTripInput {
  const city = getDisplayCity(trip);

  return {
    city,
    cityName: trip.destination_city_ko,
    dateRangeLabel: formatTripDateRangeLabel({
      createdAt: trip.created_at,
      endDate: trip.end_date,
      startDate: trip.start_date,
    }),
    destinationName: city,
    endDate: trip.end_date,
    isEndDateUndecided: trip.is_end_date_undecided,
    // TODO: Replace with photos table counts after Supabase photo/storage sync is connected.
    photoCount: 0,
    startDate: trip.start_date,
    status: trip.status,
    visitedCities: city ? [city] : [],
  };
}

export function mapSupabaseTripsToHomeSummaryTrips(trips: TripRow[]): HomeSummaryTripInput[] {
  return trips
    .filter((trip) => trip.status !== 'ignored')
    .map(mapSupabaseTripToHomeSummaryTrip);
}
