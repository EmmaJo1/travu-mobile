import type { ImageSourcePropType } from 'react-native';

import type { TripCardData } from '@/components/trip/TripCard';

export interface DetectedTripDay {
  id: string;
  dayNumber: number;
  dateLabel: string;
  weekdayLabel: string;
  photoCount: number;
  thumbnailImage?: ImageSourcePropType;
}

export interface DetectedTrip {
  id: string;
  title: string;
  dateRangeLabel: string;
  daysCount: number;
  photoCount: number;
  placeCount: number;
  coverImage?: ImageSourcePropType;
  isSaved: boolean;
  days: DetectedTripDay[];
}

/**
 * Figma Record 화면(1096:1231) TripCard 이미지.
 * TODO: Figma에서 export 후 assets/images/record-trip-*.png 로 교체.
 */
const RECORD_IMAGES = {
  sydneyCover: require('../assets/images/record-trip-sydney-cover.png'),
  sydneyDay1: require('../assets/images/record-trip-sydney-day-1.png'),
  sydneyDay2: require('../assets/images/record-trip-sydney-day-2.png'),
  sydneyDay3: require('../assets/images/record-trip-sydney-day-3.png'),
  sydneyDay4: require('../assets/images/record-trip-sydney-day-4.png'),
  sydneyDay5: require('../assets/images/record-trip-sydney-day-5.png'),
  kyotoCover: require('../assets/images/record-trip-kyoto-cover.png'),
  kyotoDay1: require('../assets/images/record-trip-kyoto-day-1.png'),
  kyotoDay2: require('../assets/images/record-trip-kyoto-day-2.png'),
  kyotoDay3: require('../assets/images/record-trip-kyoto-day-3.png'),
  kyotoDay4: require('../assets/images/record-trip-kyoto-day-4.png'),
  kyotoDay5: require('../assets/images/record-trip-kyoto-day-5.png'),
  portugalCover: require('../assets/images/record-trip-portugal-cover.png'),
  portugalDay1: require('../assets/images/record-trip-portugal-day-1.png'),
  portugalDay2: require('../assets/images/record-trip-portugal-day-2.png'),
  portugalDay3: require('../assets/images/record-trip-portugal-day-3.png'),
  portugalDay4: require('../assets/images/record-trip-portugal-day-4.png'),
  portugalDay5: require('../assets/images/record-trip-portugal-day-5.png'),
} as const;

/** Figma Record flow — component-test MOCK_TRIP + record frame(1096:1231) 기준 */
export const MOCK_DETECTED_TRIPS: DetectedTrip[] = [
  {
    id: 'detected-sydney',
    title: '시드니',
    dateRangeLabel: '2025. 3. 5 - 3. 15',
    daysCount: 11,
    photoCount: 734,
    placeCount: 12,
    coverImage: RECORD_IMAGES.sydneyCover,
    isSaved: false,
    days: [
      { id: 'syd-d1', dayNumber: 1, dateLabel: '3.5', weekdayLabel: '수', photoCount: 68, thumbnailImage: RECORD_IMAGES.sydneyDay1 },
      { id: 'syd-d2', dayNumber: 2, dateLabel: '3.6', weekdayLabel: '목', photoCount: 72, thumbnailImage: RECORD_IMAGES.sydneyDay2 },
      { id: 'syd-d3', dayNumber: 3, dateLabel: '3.7', weekdayLabel: '금', photoCount: 81, thumbnailImage: RECORD_IMAGES.sydneyDay3 },
      { id: 'syd-d4', dayNumber: 4, dateLabel: '3.8', weekdayLabel: '토', photoCount: 64, thumbnailImage: RECORD_IMAGES.sydneyDay4 },
      { id: 'syd-d5', dayNumber: 5, dateLabel: '3.9', weekdayLabel: '일', photoCount: 59, thumbnailImage: RECORD_IMAGES.sydneyDay5 },
    ],
  },
  {
    id: 'detected-kyoto',
    title: '교토',
    dateRangeLabel: '2026. 3. 30 - 4. 3',
    daysCount: 5,
    photoCount: 211,
    placeCount: 5,
    coverImage: RECORD_IMAGES.kyotoCover,
    isSaved: false,
    days: [
      { id: 'kyo-d1', dayNumber: 1, dateLabel: '3.30', weekdayLabel: '월', photoCount: 42, thumbnailImage: RECORD_IMAGES.kyotoDay1 },
      { id: 'kyo-d2', dayNumber: 2, dateLabel: '3.31', weekdayLabel: '화', photoCount: 38, thumbnailImage: RECORD_IMAGES.kyotoDay2 },
      { id: 'kyo-d3', dayNumber: 3, dateLabel: '4.1', weekdayLabel: '수', photoCount: 45, thumbnailImage: RECORD_IMAGES.kyotoDay3 },
      { id: 'kyo-d4', dayNumber: 4, dateLabel: '4.2', weekdayLabel: '목', photoCount: 51, thumbnailImage: RECORD_IMAGES.kyotoDay4 },
      { id: 'kyo-d5', dayNumber: 5, dateLabel: '4.3', weekdayLabel: '금', photoCount: 35, thumbnailImage: RECORD_IMAGES.kyotoDay5 },
    ],
  },
  {
    id: 'detected-portugal',
    title: '포르투갈',
    dateRangeLabel: '2025. 4. 1 - 4. 12',
    daysCount: 12,
    photoCount: 541,
    placeCount: 25,
    coverImage: RECORD_IMAGES.portugalCover,
    isSaved: false,
    days: [
      { id: 'por-d1', dayNumber: 1, dateLabel: '4.1', weekdayLabel: '화', photoCount: 48, thumbnailImage: RECORD_IMAGES.portugalDay1 },
      { id: 'por-d2', dayNumber: 2, dateLabel: '4.2', weekdayLabel: '수', photoCount: 52, thumbnailImage: RECORD_IMAGES.portugalDay2 },
      { id: 'por-d3', dayNumber: 3, dateLabel: '4.3', weekdayLabel: '목', photoCount: 46, thumbnailImage: RECORD_IMAGES.portugalDay3 },
      { id: 'por-d4', dayNumber: 4, dateLabel: '4.4', weekdayLabel: '금', photoCount: 44, thumbnailImage: RECORD_IMAGES.portugalDay4 },
      { id: 'por-d5', dayNumber: 5, dateLabel: '4.5', weekdayLabel: '토', photoCount: 39, thumbnailImage: RECORD_IMAGES.portugalDay5 },
    ],
  },
];

export function toTripCardData(trip: DetectedTrip): TripCardData {
  return {
    id: trip.id,
    country: trip.title,
    date: trip.dateRangeLabel,
    period: String(trip.daysCount),
    photoCount: String(trip.photoCount),
    placeCount: String(trip.placeCount),
    coverImage: trip.coverImage,
    isSaved: trip.isSaved,
    dateBadges: trip.days.map((day) => ({
      date: day.dateLabel,
      day: day.weekdayLabel,
      image: day.thumbnailImage,
    })),
    days: trip.days,
  };
}
