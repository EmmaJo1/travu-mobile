import { useSyncExternalStore } from 'react';

import type { DetectedTrip } from '@/constants/mockDetectedTrips';
import type { DetectedTrip as IdleDetectedTrip } from '@/constants/mockIdleHomeData';
import type { MyPageTrip } from '@/constants/mockMyPageTrips';
import type { PhotoImportTripCandidate } from '@/services/photoImport/types';
import type { ImageSourcePropType } from 'react-native';

let savedTrips: MyPageTrip[] = [];
const listeners = new Set<() => void>();

const DETECTED_TRIP_ENGLISH_NAMES: Record<
  string,
  { city: string; title: string; visitedCities: string[]; visitedCountries: string[] }
> = {
  'detected-sydney': {
    city: 'Sydney',
    title: 'SYDNEY',
    visitedCities: ['Sydney'],
    visitedCountries: ['Australia'],
  },
  'detected-kyoto': {
    city: 'Kyoto',
    title: 'KYOTO',
    visitedCities: ['Kyoto'],
    visitedCountries: ['Japan'],
  },
  'detected-portugal': {
    city: 'Portugal',
    title: 'PORTUGAL',
    visitedCities: [],
    visitedCountries: ['Portugal'],
  },
};

const PHOTO_IMPORT_ENGLISH_NAMES: Record<string, { city: string; title: string }> = {
  'kyoto-2026': { city: 'Kyoto', title: 'KYOTO' },
  'paris-2025': { city: 'Paris', title: 'PARIS' },
  'new-york-2026': { city: 'New York', title: 'NEW YORK' },
  'danang-2025': { city: 'Da Nang', title: 'DA NANG' },
  'busan-2024': { city: 'Busan', title: 'BUSAN' },
};

const CITY_TO_COUNTRY: Record<string, string> = {
  Bangkok: 'Thailand',
  Busan: 'South Korea',
  Budapest: 'Hungary',
  'Da Nang': 'Vietnam',
  Florence: 'Italy',
  Hongkong: 'Hong Kong',
  Jeju: 'South Korea',
  Kyoto: 'Japan',
  Macao: 'Macao',
  'New York': 'United States',
  Osaka: 'Japan',
  Paris: 'France',
  Rome: 'Italy',
  Singapore: 'Singapore',
  Sydney: 'Australia',
  Tokyo: 'Japan',
  Venice: 'Italy',
  Vienna: 'Austria',
};

const EXTRA_DESTINATION_ENGLISH_LABELS: Record<string, string> = {
  'city-jeju-kr': 'Jeju',
  'city-seoul-kr': 'Seoul',
  'city-busan-kr': 'Busan',
  'city-gyeongju-kr': 'Gyeongju',
  'city-gangneung-kr': 'Gangneung',
  'city-osaka-jp': 'Osaka',
  'city-kyoto-jp': 'Kyoto',
  'city-tokyo-jp': 'Tokyo',
  'country-japan': 'Japan',
  'country-france': 'France',
  '\uC81C\uC8FC': 'Jeju',
  '\uC81C\uC8FC\uB3C4': 'Jeju',
  '\uC11C\uC6B8': 'Seoul',
  '\uBD80\uC0B0': 'Busan',
  '\uACBD\uC8FC': 'Gyeongju',
  '\uAC15\uB989': 'Gangneung',
  '\uC624\uC0AC\uCE74': 'Osaka',
  '\uAD50\uD1A0': 'Kyoto',
  '\uB3C4\uCFC4': 'Tokyo',
  '\uD30C\uB9AC': 'Paris',
  '\uD504\uB791\uC2A4': 'France',
  '\uC77C\uBCF8': 'Japan',
  '\uD55C\uAD6D': 'South Korea',
  '\uB300\uD55C\uBBFC\uAD6D': 'South Korea',
};

const INVALID_DESTINATION_LABELS = new Set([
  '',
  'default',
  'example',
  'location unknown',
  'mock',
  'sample',
  'set location',
  'travel',
  'unknown',
  'unknown location',
  '\uBBF8\uC815',
  '\uC704\uCE58 \uBBF8\uC815',
]);

const DESTINATION_ENGLISH_LABELS: Record<string, string> = {
  강릉: 'Gangneung',
  경주: 'Gyeongju',
  교토: 'Kyoto',
  도쿄: 'Tokyo',
  로마: 'Rome',
  마카오: 'Macao',
  방콕: 'Bangkok',
  부산: 'Busan',
  비엔나: 'Vienna',
  서울: 'Seoul',
  싱가포르: 'Singapore',
  시드니: 'Sydney',
  오사카: 'Osaka',
  파리: 'Paris',
  피렌체: 'Florence',
  홍콩: 'Hongkong',
  호주: 'Australia',
  일본: 'Japan',
  프랑스: 'France',
  이탈리아: 'Italy',
};

export interface CompletedTripInput {
  id: string;
  destinationName: string;
  countryName: string;
  visitedCities?: string[];
  visitedCountries?: string[];
  startDate: string;
  endDate: string;
  coverImage: ImageSourcePropType;
  daysCount: number;
  photoCount: number;
}

function emitChange() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return savedTrips;
}

function formatMyPageDateRange(dateRangeLabel: string) {
  return dateRangeLabel.replace(/\s+/g, '');
}

function formatDateKeyForMyPage(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return `${year}.${month}.${day}`;
}

function formatCompletedTripDateRange(startDate: string, endDate: string) {
  const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
  const [endYear, endMonth, endDay] = endDate.split('-').map(Number);

  if (startYear === endYear) {
    return `${startYear}.${startMonth}.${startDay}-${endMonth}.${endDay}`;
  }

  return `${formatDateKeyForMyPage(startDate)}-${formatDateKeyForMyPage(endDate)}`;
}

function getVisitedCitiesFromDestination(destinationName: string, countryName: string) {
  const destination = normalizeDestinationLabel(destinationName);
  const country = normalizeDestinationLabel(countryName);
  const destinationKey = destination.trim().toLowerCase();
  const countryKey = country.trim().toLowerCase();

  if (destinationKey && countryKey && destinationKey === countryKey) {
    return [];
  }

  return destination ? [destination] : [];
}

function getVisitedCountriesFromCountryName(countryName: string) {
  const country = normalizeDestinationLabel(countryName);
  return country ? [country] : [];
}

function normalizeVisitedList(values: string[] | undefined) {
  const valueMap = new Map<string, string>();

  (values ?? []).forEach((value) => {
    const normalizedValue = normalizeDestinationLabel(value);

    if (!normalizedValue) return;

    valueMap.set(normalizedValue.toLowerCase(), normalizedValue);
  });

  return [...valueMap.values()];
}

function getNormalizedKey(value: string) {
  return value.trim().toLowerCase();
}

function isEnglishLike(value: string) {
  return /^[\x00-\x7F]+$/.test(value.trim());
}

function isInvalidDestinationLabel(value: string) {
  const normalizedValue = getNormalizedKey(value);

  return (
    !normalizedValue ||
    INVALID_DESTINATION_LABELS.has(normalizedValue) ||
    normalizedValue.includes('unknown') ||
    normalizedValue.includes('mock') ||
    normalizedValue.includes('sample')
  );
}

function resolveEnglishDestinationName(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue || isInvalidDestinationLabel(trimmedValue)) {
    return '';
  }

  const normalizedValue = getNormalizedKey(trimmedValue);
  const mappedValue =
    EXTRA_DESTINATION_ENGLISH_LABELS[trimmedValue] ??
    EXTRA_DESTINATION_ENGLISH_LABELS[normalizedValue] ??
    Object.entries(EXTRA_DESTINATION_ENGLISH_LABELS).find(
      ([label]) => getNormalizedKey(label) === normalizedValue,
    )?.[1] ??
    Object.entries(DESTINATION_ENGLISH_LABELS).find(
      ([label]) => getNormalizedKey(label) === normalizedValue,
    )?.[1];

  if (mappedValue && !isInvalidDestinationLabel(mappedValue)) {
    return mappedValue;
  }

  if (isEnglishLike(trimmedValue)) {
    return trimmedValue;
  }

  // TODO: Persist English destination names from geocoding/photo metadata instead of relying on fallback mapping.
  return '';
}

function normalizeDestinationLabel(value: string | undefined | null) {
  if (!value) {
    return '';
  }

  return resolveEnglishDestinationName(value);
}

function formatBookCoverTitle(value: string) {
  const englishName = resolveEnglishDestinationName(value);

  return englishName ? englishName.toUpperCase() : 'TRAVEL';
}

function getBookKey(trip: MyPageTrip) {
  return `${getNormalizedKey(trip.city)}|${getNormalizedKey(trip.country)}`;
}

function hasSavedCityBook(nextTrip: MyPageTrip) {
  const nextKey = getBookKey(nextTrip);

  return savedTrips.some(
    (savedTrip) => savedTrip.id !== nextTrip.id && getBookKey(savedTrip) === nextKey,
  );
}

function filterUnsavedUniqueBooks(trips: MyPageTrip[]) {
  const nextKeys = new Set<string>();

  return trips.filter((trip) => {
    if (!trip.city || isInvalidDestinationLabel(trip.city)) {
      return false;
    }

    const key = getBookKey(trip);

    if (nextKeys.has(key) || hasSavedCityBook(trip)) {
      return false;
    }

    nextKeys.add(key);
    return true;
  });
}

function upsertSavedTrips(nextTrips: MyPageTrip[]) {
  if (nextTrips.length === 0) {
    return false;
  }

  let didChange = false;
  const existingById = new Map(savedTrips.map((trip) => [trip.id, trip]));
  const mergedById = new Map(savedTrips.map((trip) => [trip.id, trip]));
  const newTrips: MyPageTrip[] = [];

  nextTrips.forEach((trip) => {
    const existingTrip = existingById.get(trip.id);

    if (existingTrip) {
      mergedById.set(trip.id, {
        ...existingTrip,
        ...trip,
      });
      didChange = true;
      return;
    }

    newTrips.push(trip);
    didChange = true;
  });

  if (!didChange) {
    return false;
  }

  savedTrips = [
    ...newTrips,
    ...savedTrips.map((trip) => mergedById.get(trip.id) ?? trip),
  ];

  return true;
}

function getMappedCountryForCity(city: string) {
  const normalizedCity = getNormalizedKey(city);

  return Object.entries(CITY_TO_COUNTRY).find(
    ([mappedCity]) => getNormalizedKey(mappedCity) === normalizedCity,
  )?.[1];
}

function resolveCountryForCity(
  city: string,
  fallbackCountries: string[],
  fallbackCountryName: string,
) {
  return (
    getMappedCountryForCity(city) ??
    normalizeDestinationLabel(fallbackCountries[0]) ??
    normalizeDestinationLabel(fallbackCountryName)
  );
}

function getInclusiveDaysFromDateRange(dateRangeLabel: string): number {
  const normalized = dateRangeLabel.replace(/\s+/g, '');
  const match = normalized.match(/^(\d{4})\.(\d{1,2})\.(\d{1,2})-(?:(\d{4})\.)?(\d{1,2})\.(\d{1,2})$/);

  if (!match) {
    return 1;
  }

  const [, startYear, startMonth, startDay, endYear, endMonth, endDay] = match;
  const start = new Date(Number(startYear), Number(startMonth) - 1, Number(startDay));
  const end = new Date(
    Number(endYear ?? startYear),
    Number(endMonth) - 1,
    Number(endDay),
  );
  const dayMs = 24 * 60 * 60 * 1000;

  return Math.max(1, Math.round((end.getTime() - start.getTime()) / dayMs) + 1);
}

function toMyPageTripFromDetectedTrip(trip: DetectedTrip): MyPageTrip {
  const englishName = DETECTED_TRIP_ENGLISH_NAMES[trip.id] ?? {
    city: trip.title,
    title: formatBookCoverTitle(trip.title),
    visitedCities: [trip.title],
    visitedCountries: [],
  };

  return {
    id: `saved-${trip.id}`,
    title: englishName.title,
    city: englishName.city,
    country: englishName.visitedCountries[0] ?? '',
    visitedCities: englishName.visitedCities,
    visitedCountries: englishName.visitedCountries,
    dateRangeLabel: formatMyPageDateRange(trip.dateRangeLabel),
    coverImage: trip.coverImage ?? trip.dayThumbnails[0],
    daysCount: trip.daysCount,
    photoCount: trip.photoCount,
  };
}

function toMyPageTripFromIdleDetectedTrip(trip: IdleDetectedTrip): MyPageTrip {
  const englishName = DETECTED_TRIP_ENGLISH_NAMES[trip.id] ?? {
    city: trip.city,
    title: formatBookCoverTitle(trip.city),
    visitedCities: [trip.city],
    visitedCountries: getVisitedCountriesFromCountryName(trip.country),
  };

  return {
    id: `saved-${trip.id}`,
    title: englishName.title,
    city: englishName.city,
    country: trip.country,
    visitedCities: englishName.visitedCities,
    visitedCountries: englishName.visitedCountries,
    dateRangeLabel: formatMyPageDateRange(trip.dateRange),
    coverImage: trip.image,
    daysCount: getInclusiveDaysFromDateRange(trip.dateRange),
    photoCount: trip.photoCount,
  };
}

function toMyPageTripFromPhotoImportCandidate(candidate: PhotoImportTripCandidate): MyPageTrip {
  const englishName = PHOTO_IMPORT_ENGLISH_NAMES[candidate.id] ?? {
    city: resolveEnglishDestinationName(candidate.city),
    title: formatBookCoverTitle(candidate.city),
  };

  return {
    id: `photo-import-${candidate.id}`,
    title: englishName.title,
    city: englishName.city,
    country: candidate.country,
    visitedCities: getVisitedCitiesFromDestination(englishName.city, candidate.country),
    visitedCountries: getVisitedCountriesFromCountryName(candidate.country),
    dateRangeLabel: formatMyPageDateRange(candidate.dateRange),
    coverImage: candidate.image,
    daysCount: getInclusiveDaysFromDateRange(candidate.dateRange),
    photoCount: candidate.photoCount,
  };
}

function toMyPageTripFromCompletedTrip(trip: CompletedTripInput): MyPageTrip {
  const city = normalizeDestinationLabel(trip.destinationName);
  const visitedCities = normalizeVisitedList(trip.visitedCities);
  const visitedCountries = normalizeVisitedList(trip.visitedCountries);
  const country = normalizeDestinationLabel(trip.countryName);

  return {
    id: `completed-${trip.id}`,
    title: formatBookCoverTitle(city),
    city,
    country,
    visitedCities: visitedCities.length > 0
      ? visitedCities
      : getVisitedCitiesFromDestination(city, country),
    visitedCountries: visitedCountries.length > 0
      ? visitedCountries
      : getVisitedCountriesFromCountryName(country),
    dateRangeLabel: formatCompletedTripDateRange(trip.startDate, trip.endDate),
    coverImage: trip.coverImage,
    daysCount: trip.daysCount,
    photoCount: trip.photoCount,
  };
}

function createCompletedTripBooks(trip: CompletedTripInput): MyPageTrip[] {
  const visitedCities = normalizeVisitedList(trip.visitedCities);
  const visitedCountries = normalizeVisitedList(trip.visitedCountries);
  const fallbackCity = normalizeDestinationLabel(trip.destinationName);
  const normalizedTrip = {
    ...trip,
    destinationName: fallbackCity,
    countryName: normalizeDestinationLabel(trip.countryName),
  };
  const citiesForBooks = visitedCities.length > 0
    ? visitedCities
    : getVisitedCitiesFromDestination(fallbackCity, normalizedTrip.countryName);

  if (citiesForBooks.length === 0) {
    return [];
  }

  return citiesForBooks.map((city, index) => {
    const country = resolveCountryForCity(city, visitedCountries, normalizedTrip.countryName);

    return toMyPageTripFromCompletedTrip({
      ...normalizedTrip,
      id: `${trip.id}-${city.toLowerCase().replace(/\s+/g, '-')}-${index}`,
      destinationName: city,
      countryName: country,
      visitedCities: [city],
      visitedCountries: country ? [country] : [],
    });
  });
}

export function addSavedDetectedTrips(trips: DetectedTrip[]) {
  const nextTrips = filterUnsavedUniqueBooks(trips.map(toMyPageTripFromDetectedTrip));

  if (!upsertSavedTrips(nextTrips)) {
    return;
  }

  emitChange();
}

export function addSavedIdleDetectedTrip(trip: IdleDetectedTrip) {
  const nextTrip = toMyPageTripFromIdleDetectedTrip(trip);

  if (hasSavedCityBook(nextTrip)) {
    return;
  }

  if (!upsertSavedTrips([nextTrip])) {
    return;
  }

  emitChange();
}

export function addSavedPhotoImportCandidates(candidates: PhotoImportTripCandidate[]) {
  const nextTrips = filterUnsavedUniqueBooks(candidates.map(toMyPageTripFromPhotoImportCandidate));

  if (!upsertSavedTrips(nextTrips)) {
    return;
  }

  emitChange();
}

export function addSavedCompletedTrip(trip: CompletedTripInput) {
  const nextTrips = filterUnsavedUniqueBooks(createCompletedTripBooks(trip));

  if (!upsertSavedTrips(nextTrips)) {
    return;
  }

  emitChange();
}

export function updateSavedMyPageTrip(tripId: string, patch: Partial<MyPageTrip>) {
  let didUpdate = false;

  savedTrips = savedTrips.map((trip) => {
    if (trip.id !== tripId) {
      return trip;
    }

    didUpdate = true;
    return {
      ...trip,
      ...patch,
    };
  });

  if (didUpdate) {
    emitChange();
  }
}

export function removeSavedMyPageTrip(tripId: string) {
  const previousLength = savedTrips.length;

  savedTrips = savedTrips.filter((trip) => trip.id !== tripId);

  if (savedTrips.length !== previousLength) {
    emitChange();
  }
}

export function useSavedMyPageTrips() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
