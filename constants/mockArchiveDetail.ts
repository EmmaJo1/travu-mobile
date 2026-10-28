import type { ImageSourcePropType } from 'react-native';

import type { DaySelectorItem } from '@/components/record/DaySelectorSheet';
import type { PlaceEntry } from '@/components/trip/PlaceEntryCard';
import { FIGMA_IMAGES } from '@/constants/figmaImages';

const IMG = {
  photoFrame: FIGMA_IMAGES.archive.photoFrame,
  louvre1: FIGMA_IMAGES.home.photoCandidate1,
  louvre2: FIGMA_IMAGES.home.photoCandidate2,
  louvre3: FIGMA_IMAGES.home.photoCandidate3,
  pietro1: require('../assets/images/record-day-observatory-1.png'),
  pietro2: require('../assets/images/record-day-observatory-2.png'),
  seine1: require('../assets/images/record-day-bondi-1.png'),
  seine2: require('../assets/images/record-day-bondi-2.png'),
  seine3: require('../assets/images/record-day-bondi-3.png'),
} as const;

export interface ArchiveDetailPlace {
  id: string;
  name: string;
  timeLabel: string;
  category?: string;
  city?: string;
  memo?: string;
  records?: string[];
  rating?: number;
  images: ImageSourcePropType[];
}

export interface ArchiveDetailData {
  id: string;
  city: string;
  country: string;
  dateRangeLabel: string;
  heroTitle: string;
  /** User-editable hero photo. The blurred backdrop reuses this same image. */
  photoFrameImage?: ImageSourcePropType;
  selectedDay: {
    dayNumber: number;
    dateLabel: string;
  };
  stats: {
    daysCount: number;
    photoCount: number;
    placeCount: number;
    distanceKm?: number;
  };
  places: ArchiveDetailPlace[];
}

/** Figma day-archive-detail — Day 선택 시트 mock (Paris 2025.8.25–9.1) */
export const ARCHIVE_DAY_OPTIONS: DaySelectorItem[] = [
  { id: 'archive-day-1', dayNumber: 1, dateLabel: '2025. 8. 25', weekdayLabel: 'Mon', photoCount: 28 },
  { id: 'archive-day-2', dayNumber: 2, dateLabel: '2025. 8. 26', weekdayLabel: 'Tue', photoCount: 42 },
  { id: 'archive-day-3', dayNumber: 3, dateLabel: '2025. 8. 27', weekdayLabel: 'Wed', photoCount: 36 },
  { id: 'archive-day-4', dayNumber: 4, dateLabel: '2025. 8. 28', weekdayLabel: 'Thu', photoCount: 31 },
  { id: 'archive-day-5', dayNumber: 5, dateLabel: '2025. 8. 29', weekdayLabel: 'Fri', photoCount: 45 },
  { id: 'archive-day-6', dayNumber: 6, dateLabel: '2025. 8. 30', weekdayLabel: 'Sat', photoCount: 52 },
  { id: 'archive-day-7', dayNumber: 7, dateLabel: '2025. 8. 31', weekdayLabel: 'Sun', photoCount: 38 },
  { id: 'archive-day-8', dayNumber: 8, dateLabel: '2025. 9. 1', weekdayLabel: 'Mon', photoCount: 40 },
];

export function formatArchiveDayLabel(day: DaySelectorItem): string {
  return `${day.dateLabel} ${day.weekdayLabel}`;
}

/** Figma day-archive-detail (506:704) mock */
export const MOCK_ARCHIVE_DETAIL: ArchiveDetailData = {
  id: 'archive-paris',
  city: 'Paris',
  country: 'France',
  dateRangeLabel: '2025.8.25-9.1',
  heroTitle: 'PARIS',
  photoFrameImage: IMG.photoFrame,
  selectedDay: {
    dayNumber: 2,
    dateLabel: '2025. 8. 26 Tue',
  },
  stats: {
    daysCount: 8,
    photoCount: 312,
    placeCount: 3,
    distanceKm: 20,
  },
  places: [
    {
      id: 'ap-1',
      name: '루브르 박물관',
      timeLabel: '2 PM',
      category: '관광명소',
      city: '파리',
      rating: 5,
      memo: '그 유명한 모나리자 그림을 보게 되어서 신기했다. 모나리자 앞에만 사람들이 가득했다. 사진을 찍어도 완전 점처럼 보여서 좀 아쉬웠다. 루브르 박물관 전경은 역시나 너무 아름다웠다',
      images: [IMG.louvre1, IMG.louvre2, IMG.louvre3],
    },
    {
      id: 'ap-2',
      name: 'Pietro',
      timeLabel: '5 PM',
      category: '음식점',
      city: '파리',
      rating: 4,
      memo: '어쩌다 들어가게 된 식당인데 맛있었다!\n피자 도우가 굉장히 쫄깃하고 특히 맛있었다',
      images: [IMG.pietro1, IMG.pietro2],
    },
    {
      id: 'ap-3',
      name: '센느 강',
      timeLabel: '7 PM',
      category: '관광명소',
      city: '파리',
      rating: 5,
      memo: '센느 강에서 에펠탑 뷰를 보며 노을을 구경하였다. 분홍색과 보랏빛 노을이 에펠탑과 어우러지면서 한폭의 그림 같았다. 옆에서는 버스킹도 하고 있었는데 음악 소리와 풍경이 어우러져서 분위기가 정말 좋았다.',
      images: [IMG.seine1, IMG.seine2, IMG.seine3],
    },
  ],
};

export function toPlaceEntries(places: ArchiveDetailPlace[]): PlaceEntry[] {
  return places.map((place) => ({
    id: place.id,
    placeName: place.name,
    cityName: place.city,
    countryName: MOCK_ARCHIVE_DETAIL.country,
    time: place.timeLabel,
    place: place.name,
    category: place.category,
    city: place.city,
    text: place.records?.[0] ?? place.memo,
    rating: place.rating,
    photoSources: place.images,
    photoCount: place.images.length,
    recordCount: place.records?.length ?? (place.memo ? 1 : 0),
  }));
}
