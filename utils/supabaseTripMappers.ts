import { MOCK_MY_PAGE_TRIPS, type MyPageTrip } from '@/constants/mockMyPageTrips';
import type { IdleRecentTrip } from '@/constants/mockIdleHomeData';
import type { TripRow } from '@/services/supabase/trips';

const FALLBACK_TRIP_COVER = MOCK_MY_PAGE_TRIPS[0].coverImage;
const FALLBACK_TRIP_TITLE = MOCK_MY_PAGE_TRIPS[0].title || 'TRAVEL';

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

function formatDatePart(value?: string | null, includeYear = true) {
  const parts = getDateParts(value);

  if (!parts) {
    return '';
  }

  return includeYear
    ? `${parts.year}.${parts.month}.${parts.day}`
    : `${parts.month}.${parts.day}`;
}

function formatTripDateRange(trip: TripRow) {
  const start = formatDatePart(trip.start_date);

  if (!start) {
    return formatDatePart(trip.created_at?.slice(0, 10)) || '';
  }

  if (trip.is_end_date_undecided || !trip.end_date) {
    return start;
  }

  const startParts = getDateParts(trip.start_date);
  const endParts = getDateParts(trip.end_date);

  if (!startParts || !endParts) {
    return start;
  }

  const includeEndYear = startParts.year !== endParts.year;
  return `${start}-${formatDatePart(trip.end_date, includeEndYear)}`;
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

export function mapSupabaseTripToMyPageTrip(trip: TripRow): MyPageTrip {
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
    dateRangeLabel: formatTripDateRange(trip),
    coverImage: FALLBACK_TRIP_COVER,
    daysCount: getInclusiveDayCount(trip.start_date, trip.end_date),
    photoCount: 0,
  };
}

export function mapSupabaseTripsToMyPageTrips(trips: TripRow[]): MyPageTrip[] {
  return trips.map(mapSupabaseTripToMyPageTrip);
}

export function mapSupabaseTripToIdleRecentTrip(trip: TripRow): IdleRecentTrip {
  const city = getDisplayCity(trip);
  const country = getDisplayCountry(trip);

  return {
    id: `supabase-recent-${trip.id}`,
    tripId: trip.id,
    city,
    country,
    dateRange: formatTripDateRange(trip),
    image: FALLBACK_TRIP_COVER,
    photoCount: 0,
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
    dateRangeLabel: formatTripDateRange(trip),
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
