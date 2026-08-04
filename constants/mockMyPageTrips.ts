import type { ImageSourcePropType } from 'react-native';

import type { SelectorOption } from '@/components/record/DaySelectorSheet';
import type { TripListItem } from '@/components/trip/TripListCard';
import { FIGMA_IMAGES } from '@/constants/figmaImages';

const IMG = FIGMA_IMAGES.myPageTrips;

export interface MyPageTrip {
  id: string;
  /** TripListCard 책표지 대문자 제목 */
  title: string;
  /** Optional English title used only for the book cover title. */
  titleEn?: string;
  /** TripListCard 캡션 도시명 */
  city: string;
  country: string;
  /** Cities actually visited inside this trip book. Used for profile stats. */
  visitedCities: string[];
  /** Countries actually visited inside this trip book. Used for profile stats. */
  visitedCountries: string[];
  /** 여행 기간 (예: "2025.8.25-9.1") — 연도 그룹은 시작 연도 기준으로 파생 */
  dateRangeLabel: string;
  coverImage?: ImageSourcePropType;
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
    visitedCities: ['Paris'],
    visitedCountries: ['France'],
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
    visitedCities: ['Rome'],
    visitedCountries: ['Italy'],
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
    visitedCities: ['Venice'],
    visitedCountries: ['Italy'],
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
    visitedCities: ['Florence'],
    visitedCountries: ['Italy'],
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
    visitedCities: ['Budapest'],
    visitedCountries: ['Hungary'],
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
    visitedCities: ['Vienna'],
    visitedCountries: ['Austria'],
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
    visitedCities: ['Tokyo'],
    visitedCountries: ['Japan'],
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
    visitedCities: ['Hongkong'],
    visitedCountries: ['Hong Kong'],
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
    visitedCities: ['Macao'],
    visitedCountries: ['Macao'],
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
    visitedCities: ['Osaka'],
    visitedCountries: ['Japan'],
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
    visitedCities: ['Singapore'],
    visitedCountries: ['Singapore'],
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
    visitedCities: ['Bangkok'],
    visitedCountries: ['Thailand'],
    dateRangeLabel: '2024.11.7-11.15',
    coverImage: IMG.bangkok,
    daysCount: 9,
    photoCount: 187,
  },
];

export type TravelSortOption = 'latest' | 'oldest' | 'duration';

export const TRAVEL_SORT_LABELS: Record<TravelSortOption, string> = {
  latest: '\uCD5C\uC2E0\uC21C',
  oldest: '\uC624\uB798\uB41C\uC21C',
  duration: '\uC5EC\uD589\uAE30\uAC04 \uAE34 \uC21C',
};

function getTripStartTime(dateRangeLabel: string): number {
  const normalized = dateRangeLabel.replace(/\s+/g, '');
  const match = normalized.match(/^(\d{4})\.(\d{1,2})\.(\d{1,2})/);

  if (!match) {
    return 0;
  }

  const [, year, month, day] = match;
  return new Date(Number(year), Number(month) - 1, Number(day)).getTime();
}

export function sortMyPageTrips(trips: MyPageTrip[], sort: TravelSortOption): MyPageTrip[] {
  const copy = [...trips];
  switch (sort) {
    case 'oldest':
      return copy.sort((a, b) => getTripStartTime(a.dateRangeLabel) - getTripStartTime(b.dateRangeLabel));
    case 'duration':
      return copy.sort((a, b) => b.daysCount - a.daysCount);
    case 'latest':
    default:
      return copy.sort((a, b) => getTripStartTime(b.dateRangeLabel) - getTripStartTime(a.dateRangeLabel));
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
const COVER_TITLE_ENGLISH_FALLBACKS: Record<string, string> = {
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

function resolveBookCoverTitle(trip: MyPageTrip) {
  const rawTitle = (trip.titleEn ?? trip.title).trim();

  if (!rawTitle) {
    return rawTitle;
  }

  if (/^[\x00-\x7F]+$/.test(rawTitle)) {
    return rawTitle.toUpperCase();
  }

  const normalizedTitle = rawTitle.toLowerCase();
  const englishTitle = Object.entries(COVER_TITLE_ENGLISH_FALLBACKS).find(
    ([label]) => label.toLowerCase() === normalizedTitle,
  )?.[1];

  // TODO: Store titleEn when trips are persisted so cover titles do not need this fallback mapping.
  return (englishTitle ?? 'TRAVEL').toUpperCase();
}

export function toTripListItem(trip: MyPageTrip): TripListItem {
  return {
    id: trip.id,
    title: resolveBookCoverTitle(trip),
    city: formatTripListCity(trip.city),
    date: trip.dateRangeLabel,
    coverImage: trip.coverImage,
  };
}
