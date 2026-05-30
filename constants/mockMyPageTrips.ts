import type { ImageSourcePropType } from 'react-native';

import type { SelectorOption } from '@/components/record/DaySelectorSheet';
import type { TripListItem } from '@/components/trip/TripListCard';
import { FIGMA_IMAGES } from '@/constants/figmaImages';

const IMG = FIGMA_IMAGES.myPageTrips;

export interface MyPageTrip {
  id: string;
  /** TripListCard 책표지 대문자 제목 */
  title: string;
  /** TripListCard 캡션 도시명 */
  city: string;
  country: string;
  /** 여행 기간 (예: "2025.8.25-9.1") — 연도 그룹은 시작 연도 기준으로 파생 */
  dateRangeLabel: string;
  coverImage: ImageSourcePropType;
  daysCount: number;
  photoCount: number;
}

/** Figma mypage-travel — TripListCard 12개 (2025·2024 각 2행×3열) */
export const MOCK_MY_PAGE_TRIPS: MyPageTrip[] = [
  {
    id: 'mp-paris',
    title: 'PARIS',
    city: 'Paris',
    country: 'France',
    dateRangeLabel: '2025.8.25-9.1',
    coverImage: IMG.paris,
    daysCount: 8,
    photoCount: 312,
  },
  {
    id: 'mp-rome',
    title: 'ROME',
    city: 'Rome',
    country: 'Italy',
    dateRangeLabel: '2025.9.6-9.12',
    coverImage: IMG.rome,
    daysCount: 7,
    photoCount: 248,
  },
  {
    id: 'mp-venice',
    title: 'VENICE',
    city: 'Venice',
    country: 'Italy',
    dateRangeLabel: '2025.9.12-9.16',
    coverImage: IMG.venice,
    daysCount: 5,
    photoCount: 186,
  },
  {
    id: 'mp-florence',
    title: 'FLORENCE',
    city: 'Florence',
    country: 'Italy',
    dateRangeLabel: '2025.9.16-9.25',
    coverImage: IMG.florence,
    daysCount: 10,
    photoCount: 211,
  },
  {
    id: 'mp-budapest',
    title: 'BUDAPEST',
    city: 'Budapest',
    country: 'Hungary',
    dateRangeLabel: '2025.9.25-9.30',
    coverImage: IMG.budapest,
    daysCount: 6,
    photoCount: 167,
  },
  {
    id: 'mp-vienna',
    title: 'VIENNA',
    city: 'Vienna',
    country: 'Austria',
    dateRangeLabel: '2025.10.1-10.7',
    coverImage: IMG.vienna,
    daysCount: 7,
    photoCount: 198,
  },
  {
    id: 'mp-tokyo',
    title: 'TOKYO',
    city: 'Tokyo',
    country: 'Japan',
    dateRangeLabel: '2024.3.23-3.27',
    coverImage: IMG.tokyo,
    daysCount: 5,
    photoCount: 142,
  },
  {
    id: 'mp-hongkong',
    title: 'HONGKONG',
    city: 'Hongkong',
    country: 'Hong Kong',
    dateRangeLabel: '2024.4.1-4.6',
    coverImage: IMG.hongkong,
    daysCount: 6,
    photoCount: 176,
  },
  {
    id: 'mp-macao',
    title: 'MACAO',
    city: 'Macao',
    country: 'Macao',
    dateRangeLabel: '2024.4.7-4.12',
    coverImage: IMG.macao,
    daysCount: 6,
    photoCount: 134,
  },
  {
    id: 'mp-osaka',
    title: 'OSAKA',
    city: 'Osaka',
    country: 'Japan',
    dateRangeLabel: '2024.9.12-9.16',
    coverImage: IMG.osaka,
    daysCount: 5,
    photoCount: 98,
  },
  {
    id: 'mp-singapore',
    title: 'SINGAPORE',
    city: 'Singapore',
    country: 'Singapore',
    dateRangeLabel: '2024.9.20-9.30',
    coverImage: IMG.singapore,
    daysCount: 11,
    photoCount: 221,
  },
  {
    id: 'mp-bangkok',
    title: 'BANGKOK',
    city: 'Bangkok',
    country: 'Thailand',
    dateRangeLabel: '2024.11.7-11.15',
    coverImage: IMG.bangkok,
    daysCount: 9,
    photoCount: 187,
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

export function getTripYearFromDateRange(dateRangeLabel: string): number {
  const match = dateRangeLabel.match(/^(\d{4})/);
  return match ? Number(match[1]) : new Date().getFullYear();
}

export function groupTripsByYear(trips: MyPageTrip[]): { year: number; trips: MyPageTrip[] }[] {
  const years = [...new Set(trips.map((t) => getTripYearFromDateRange(t.dateRangeLabel)))].sort(
    (a, b) => b - a,
  );
  return years.map((year) => ({
    year,
    trips: trips.filter((t) => getTripYearFromDateRange(t.dateRangeLabel) === year),
  }));
}

/** TripListCard 캡션 — Figma 표기 유지 (예: Hongkong) */
function formatTripListCity(city: string): string {
  if (/^[A-Z\s]+$/.test(city)) {
    return city
      .toLowerCase()
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  return city;
}

/** TripListCard prop 변환 */
export function toTripListItem(trip: MyPageTrip): TripListItem {
  return {
    id: trip.id,
    title: trip.title,
    city: formatTripListCity(trip.city),
    date: trip.dateRangeLabel,
    coverImage: trip.coverImage,
  };
}
