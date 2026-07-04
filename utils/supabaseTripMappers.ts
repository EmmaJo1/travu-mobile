import { MOCK_MY_PAGE_TRIPS, type MyPageTrip } from '@/constants/mockMyPageTrips';
import type { TripRow } from '@/services/supabase/trips';

const FALLBACK_TRIP_COVER = MOCK_MY_PAGE_TRIPS[0].coverImage;
const FALLBACK_TRIP_TITLE = MOCK_MY_PAGE_TRIPS[0].title || 'TRAVEL';

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
    normalizeText(trip.destination_city) ||
    normalizeText(trip.title) ||
    normalizeText(trip.destination_city_ko) ||
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
