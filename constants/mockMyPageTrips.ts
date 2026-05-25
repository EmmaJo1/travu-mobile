import type { ImageSourcePropType } from 'react-native';

import type { SelectorOption } from '@/components/record/DaySelectorSheet';
import type { TripListItem } from '@/components/trip/TripListCard';

const IMG = {
  paris: require('../assets/images/home-hero-paris.png'),
  kyoto: require('../assets/images/record-trip-kyoto-cover.png'),
  portugal: require('../assets/images/record-trip-portugal-cover.png'),
  sydney: require('../assets/images/record-trip-sydney-cover.png'),
  sydneyDay1: require('../assets/images/record-trip-sydney-day-1.png'),
  kyotoDay1: require('../assets/images/record-trip-kyoto-day-1.png'),
} as const;

export interface MyPageTrip {
  id: string;
  year: number;
  city: string;
  country: string;
  dateRangeLabel: string;
  coverImage: ImageSourcePropType;
  daysCount: number;
  photoCount: number;
}

/** Figma mypage-travel — TripListCard 그리드 mock */
export const MOCK_MY_PAGE_TRIPS: MyPageTrip[] = [
  {
    id: 'mp-paris',
    year: 2025,
    city: 'PARIS',
    country: 'France',
    dateRangeLabel: '2025.8.25-9.1',
    coverImage: IMG.paris,
    daysCount: 8,
    photoCount: 312,
  },
  {
    id: 'mp-tokyo',
    year: 2025,
    city: 'TOKYO',
    country: 'Japan',
    dateRangeLabel: '2025.4.1-4.7',
    coverImage: IMG.kyoto,
    daysCount: 7,
    photoCount: 211,
  },
  {
    id: 'mp-bali',
    year: 2025,
    city: 'BALI',
    country: 'Indonesia',
    dateRangeLabel: '2025.6.10-6.17',
    coverImage: IMG.portugal,
    daysCount: 8,
    photoCount: 186,
  },
  {
    id: 'mp-nyc',
    year: 2025,
    city: 'NEW YORK',
    country: 'USA',
    dateRangeLabel: '2025.9.3-9.10',
    coverImage: IMG.sydney,
    daysCount: 8,
    photoCount: 248,
  },
  {
    id: 'mp-sydney',
    year: 2025,
    city: 'SYDNEY',
    country: 'Australia',
    dateRangeLabel: '2025.3.5-3.15',
    coverImage: IMG.sydneyDay1,
    daysCount: 11,
    photoCount: 734,
  },
  {
    id: 'mp-kyoto',
    year: 2025,
    city: 'KYOTO',
    country: 'Japan',
    dateRangeLabel: '2026.3.30-4.3',
    coverImage: IMG.kyotoDay1,
    daysCount: 5,
    photoCount: 211,
  },
  {
    id: 'mp-lisbon',
    year: 2024,
    city: 'LISBON',
    country: 'Portugal',
    dateRangeLabel: '2024.10.2-10.12',
    coverImage: IMG.portugal,
    daysCount: 11,
    photoCount: 541,
  },
  {
    id: 'mp-seoul',
    year: 2024,
    city: 'SEOUL',
    country: 'Korea',
    dateRangeLabel: '2024.5.1-5.5',
    coverImage: IMG.sydneyDay1,
    daysCount: 5,
    photoCount: 98,
  },
  {
    id: 'mp-barcelona',
    year: 2024,
    city: 'BARCELONA',
    country: 'Spain',
    dateRangeLabel: '2024.7.14-7.21',
    coverImage: IMG.paris,
    daysCount: 8,
    photoCount: 167,
  },
];

export type TravelSortOption = 'latest' | 'oldest' | 'duration' | 'photos';

export const TRAVEL_SORT_LABELS: Record<TravelSortOption, string> = {
  latest: '최신순',
  oldest: '오래된순',
  duration: '여행 기간 긴 순',
  photos: '사진 많은 순',
};

export function sortMyPageTrips(trips: MyPageTrip[], sort: TravelSortOption): MyPageTrip[] {
  const copy = [...trips];
  switch (sort) {
    case 'oldest':
      return copy.sort((a, b) => a.dateRangeLabel.localeCompare(b.dateRangeLabel));
    case 'duration':
      return copy.sort((a, b) => b.daysCount - a.daysCount);
    case 'photos':
      return copy.sort((a, b) => b.photoCount - a.photoCount);
    case 'latest':
    default:
      return copy.sort((a, b) => b.dateRangeLabel.localeCompare(a.dateRangeLabel));
  }
}

export const TRAVEL_SORT_OPTIONS: SelectorOption[] = (
  Object.entries(TRAVEL_SORT_LABELS) as [TravelSortOption, string][]
).map(([id, label]) => ({ id, label }));

export function groupTripsByYear(trips: MyPageTrip[]): { year: number; trips: MyPageTrip[] }[] {
  const years = [...new Set(trips.map((t) => t.year))].sort((a, b) => b - a);
  return years.map((year) => ({
    year,
    trips: trips.filter((t) => t.year === year),
  }));
}

function formatCountryLabel(city: string, country: string): string {
  const label = city
    .split(' ')
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
  return `${label}, ${country}`;
}

/** TripListCard prop 변환 */
export function toTripListItem(trip: MyPageTrip): TripListItem {
  return {
    id: trip.id,
    title: trip.city,
    country: formatCountryLabel(trip.city, trip.country),
    date: trip.dateRangeLabel,
    coverImage: trip.coverImage,
  };
}
