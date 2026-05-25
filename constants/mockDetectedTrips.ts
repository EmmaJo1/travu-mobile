import type { ImageSourcePropType } from 'react-native';

import type { DaySelectorItem } from '@/components/record/DaySelectorSheet';
import type { TripCardData } from '@/components/trip/TripCard';
import { RECORD_TRIP_IMAGES } from '@/constants/recordTripImages';

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
  startDate: { year: number; month: number; day: number };
  daysCount: number;
  photoCount: number;
  placeCount: number;
  coverImage?: ImageSourcePropType;
  dayThumbnails: ImageSourcePropType[];
  isSaved: boolean;
}

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'] as const;

/** 여행 시작일 + 기간(daysCount) 기준으로 DateBadge용 일별 목록 생성 */
export function generateTripDays(trip: DetectedTrip): DetectedTripDay[] {
  const { id, startDate, daysCount, dayThumbnails, photoCount } = trip;
  const start = new Date(startDate.year, startDate.month - 1, startDate.day);
  const photosPerDay = daysCount > 0 ? Math.floor(photoCount / daysCount) : 0;

  return Array.from({ length: daysCount }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);

    return {
      id: `${id}-d${index + 1}`,
      dayNumber: index + 1,
      dateLabel: `${date.getMonth() + 1}.${date.getDate()}`,
      weekdayLabel: WEEKDAY_LABELS[date.getDay()],
      photoCount: photosPerDay,
      thumbnailImage: dayThumbnails[index % dayThumbnails.length],
    };
  });
}

/** Figma Record flow — component-test MOCK_TRIP + record frame(1096:1231) 기준 */
export const MOCK_DETECTED_TRIPS: DetectedTrip[] = [
  {
    id: 'detected-sydney',
    title: '시드니',
    dateRangeLabel: '2025. 3. 5 - 3. 15',
    startDate: { year: 2025, month: 3, day: 5 },
    daysCount: 11,
    photoCount: 734,
    placeCount: 12,
    coverImage: RECORD_TRIP_IMAGES.sydney.cover,
    dayThumbnails: RECORD_TRIP_IMAGES.sydney.dayThumbnails,
    isSaved: false,
  },
  {
    id: 'detected-kyoto',
    title: '교토',
    dateRangeLabel: '2026. 3. 30 - 4. 3',
    startDate: { year: 2026, month: 3, day: 30 },
    daysCount: 5,
    photoCount: 211,
    placeCount: 5,
    coverImage: RECORD_TRIP_IMAGES.kyoto.cover,
    dayThumbnails: RECORD_TRIP_IMAGES.kyoto.dayThumbnails,
    isSaved: false,
  },
  {
    id: 'detected-portugal',
    title: '포르투갈',
    dateRangeLabel: '2025. 4. 1 - 4. 12',
    startDate: { year: 2025, month: 4, day: 1 },
    daysCount: 12,
    photoCount: 541,
    placeCount: 25,
    coverImage: RECORD_TRIP_IMAGES.portugal.cover,
    dayThumbnails: RECORD_TRIP_IMAGES.portugal.dayThumbnails,
    isSaved: false,
  },
];

export function toDaySelectorItems(trip: DetectedTrip): DaySelectorItem[] {
  return generateTripDays(trip).map((day) => ({
    id: day.id,
    dayNumber: day.dayNumber,
    dateLabel: `${trip.startDate.year}.${day.dateLabel}`,
    weekdayLabel: day.weekdayLabel,
    photoCount: day.photoCount,
  }));
}

export function getDetectedTripById(tripId: string): DetectedTrip | undefined {
  return MOCK_DETECTED_TRIPS.find((trip) => trip.id === tripId);
}

export function getDaySelectorItemsForTrip(tripId: string): DaySelectorItem[] | undefined {
  const trip = getDetectedTripById(tripId);
  return trip ? toDaySelectorItems(trip) : undefined;
}

export function toTripCardData(trip: DetectedTrip): TripCardData {
  const days = generateTripDays(trip);

  return {
    id: trip.id,
    country: trip.title,
    date: trip.dateRangeLabel,
    period: String(trip.daysCount),
    photoCount: String(trip.photoCount),
    placeCount: String(trip.placeCount),
    coverImage: trip.coverImage,
    isSaved: trip.isSaved,
    days,
    dateBadges: days.map((day) => ({
      date: day.dateLabel,
      day: day.weekdayLabel,
      image: day.thumbnailImage,
    })),
  };
}
