import { useSyncExternalStore } from 'react';

import type { DetectedTrip } from '@/constants/mockDetectedTrips';
import type { DetectedTrip as IdleDetectedTrip } from '@/constants/mockIdleHomeData';
import type { MyPageTrip } from '@/constants/mockMyPageTrips';
import type { PhotoImportTripCandidate } from '@/services/photoImport/types';
import type { ImageSourcePropType } from 'react-native';

let savedTrips: MyPageTrip[] = [];
const listeners = new Set<() => void>();

const DETECTED_TRIP_ENGLISH_NAMES: Record<string, { city: string; title: string }> = {
  'detected-sydney': { city: 'Sydney', title: 'SYDNEY' },
  'detected-kyoto': { city: 'Kyoto', title: 'KYOTO' },
  'detected-portugal': { city: 'Portugal', title: 'PORTUGAL' },
};

const PHOTO_IMPORT_ENGLISH_NAMES: Record<string, { city: string; title: string }> = {
  'kyoto-2026': { city: 'Kyoto', title: 'KYOTO' },
  'paris-2025': { city: 'Paris', title: 'PARIS' },
  'new-york-2026': { city: 'New York', title: 'NEW YORK' },
  'danang-2025': { city: 'Da Nang', title: 'DA NANG' },
  'busan-2024': { city: 'Busan', title: 'BUSAN' },
};

export interface CompletedTripInput {
  id: string;
  destinationName: string;
  countryName: string;
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
    title: trip.title.toUpperCase(),
  };

  return {
    id: `saved-${trip.id}`,
    title: englishName.title,
    city: englishName.city,
    country: '',
    dateRangeLabel: formatMyPageDateRange(trip.dateRangeLabel),
    coverImage: trip.coverImage ?? trip.dayThumbnails[0],
    daysCount: trip.daysCount,
    photoCount: trip.photoCount,
  };
}

function toMyPageTripFromIdleDetectedTrip(trip: IdleDetectedTrip): MyPageTrip {
  const englishName = DETECTED_TRIP_ENGLISH_NAMES[trip.id] ?? {
    city: trip.city,
    title: trip.city.toUpperCase(),
  };

  return {
    id: `saved-${trip.id}`,
    title: englishName.title,
    city: englishName.city,
    country: trip.country,
    dateRangeLabel: formatMyPageDateRange(trip.dateRange),
    coverImage: trip.image,
    daysCount: getInclusiveDaysFromDateRange(trip.dateRange),
    photoCount: trip.photoCount,
  };
}

function toMyPageTripFromPhotoImportCandidate(candidate: PhotoImportTripCandidate): MyPageTrip {
  const englishName = PHOTO_IMPORT_ENGLISH_NAMES[candidate.id] ?? {
    city: candidate.city,
    title: candidate.city.toUpperCase(),
  };

  return {
    id: `photo-import-${candidate.id}`,
    title: englishName.title,
    city: englishName.city,
    country: candidate.country,
    dateRangeLabel: formatMyPageDateRange(candidate.dateRange),
    coverImage: candidate.image,
    daysCount: getInclusiveDaysFromDateRange(candidate.dateRange),
    photoCount: candidate.photoCount,
  };
}

function toMyPageTripFromCompletedTrip(trip: CompletedTripInput): MyPageTrip {
  const city = trip.destinationName;

  return {
    id: `completed-${trip.id}`,
    title: city.toUpperCase(),
    city,
    country: trip.countryName,
    dateRangeLabel: formatCompletedTripDateRange(trip.startDate, trip.endDate),
    coverImage: trip.coverImage,
    daysCount: trip.daysCount,
    photoCount: trip.photoCount,
  };
}

export function addSavedDetectedTrips(trips: DetectedTrip[]) {
  const nextTrips = trips
    .map(toMyPageTripFromDetectedTrip)
    .filter((trip) => !savedTrips.some((savedTrip) => savedTrip.id === trip.id));

  if (nextTrips.length === 0) {
    return;
  }

  savedTrips = [...nextTrips, ...savedTrips];
  emitChange();
}

export function addSavedIdleDetectedTrip(trip: IdleDetectedTrip) {
  const nextTrip = toMyPageTripFromIdleDetectedTrip(trip);

  if (savedTrips.some((savedTrip) => savedTrip.id === nextTrip.id)) {
    return;
  }

  savedTrips = [nextTrip, ...savedTrips];
  emitChange();
}

export function addSavedPhotoImportCandidates(candidates: PhotoImportTripCandidate[]) {
  const nextTrips = candidates
    .map(toMyPageTripFromPhotoImportCandidate)
    .filter((trip) => !savedTrips.some((savedTrip) => savedTrip.id === trip.id));

  if (nextTrips.length === 0) {
    return;
  }

  savedTrips = [...nextTrips, ...savedTrips];
  emitChange();
}

export function addSavedCompletedTrip(trip: CompletedTripInput) {
  const nextTrip = toMyPageTripFromCompletedTrip(trip);

  if (savedTrips.some((savedTrip) => savedTrip.id === nextTrip.id)) {
    return;
  }

  savedTrips = [nextTrip, ...savedTrips];
  emitChange();
}

export function useSavedMyPageTrips() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
