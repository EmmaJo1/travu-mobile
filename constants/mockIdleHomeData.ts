import type { ImageSourcePropType } from 'react-native';

import { FIGMA_IMAGES } from '@/constants/figmaImages';
import { RECORD_TRIP_IMAGES } from '@/constants/recordTripImages';

export interface DetectedTrip {
  id: string;
  city: string;
  country: string;
  dateRange: string;
  photoCount: number;
  image: ImageSourcePropType;
  status?: 'pending' | 'saved' | 'dismissed';
  startDate?: string;
  endDate?: string;
  createdAt?: string;
}

export interface IdleRecentTrip {
  id: string;
  tripId?: string;
  city: string;
  country?: string;
  dateRange: string;
  placeCount?: number;
  photoCount?: number;
  image?: ImageSourcePropType;
  startDate?: string;
  endDate?: string;
  status?: 'saved';
}

export interface IdlePastMoment {
  id: string;
  tripId?: string;
  dayId?: string;
  placeId?: string;
  momentId?: string;
  placeName: string;
  cityName: string;
  date: string;
  image: ImageSourcePropType;
  memoText?: string;
  photoCount?: number;
  takenAt?: string;
  dateMatchScore?: number;
}

export const MOCK_DETECTED_TRIP: DetectedTrip = {
  id: 'detected-kyoto',
  city: '교토',
  country: '일본',
  dateRange: '2026. 3. 30 - 4. 3',
  photoCount: 50,
  image: RECORD_TRIP_IMAGES.kyoto.cover,
  status: 'pending',
  startDate: '2026-03-30',
  endDate: '2026-04-03',
  createdAt: '2026-04-04',
};

export const MOCK_RECENT_TRIPS: IdleRecentTrip[] = [
  {
    id: 'recent-paris',
    tripId: 'recent-paris',
    city: '파리',
    country: '프랑스',
    dateRange: '2025. 8. 25 - 9. 1',
    placeCount: 11,
    photoCount: 32,
    image: FIGMA_IMAGES.archive.photoFrame,
    startDate: '2025-08-25',
    endDate: '2025-09-01',
    status: 'saved',
  },
  {
    id: 'recent-sydney',
    tripId: 'recent-sydney',
    city: '시드니',
    country: '호주',
    dateRange: '2025. 3. 5 - 3. 15',
    placeCount: 11,
    photoCount: 32,
    image: RECORD_TRIP_IMAGES.sydney.cover,
    startDate: '2025-03-05',
    endDate: '2025-03-15',
    status: 'saved',
  },
];

export const MOCK_PAST_MOMENTS: IdlePastMoment[] = [
  {
    id: 'osaka-castle',
    tripId: 'moment-osaka-trip',
    dayId: 'moment-osaka-day-1',
    placeId: 'osaka-castle',
    momentId: 'osaka-castle',
    placeName: '오사카성',
    cityName: '오사카',
    date: '2026. 6. 2',
    image: FIGMA_IMAGES.myPageTrips.osaka,
    memoText: 'castle walk',
    photoCount: 44,
    takenAt: '2026-06-02',
  },
  {
    id: 'marina-bay',
    tripId: 'moment-singapore-trip',
    dayId: 'moment-singapore-day-1',
    placeId: 'marina-bay',
    momentId: 'marina-bay',
    placeName: '마리나 베이',
    cityName: '싱가포르',
    date: '2023. 8. 30',
    image: FIGMA_IMAGES.myPageTrips.singapore,
    photoCount: 68,
    takenAt: '2023-08-30',
  },
  {
    id: 'lake-tekapo',
    tripId: 'moment-new-zealand-trip',
    dayId: 'moment-new-zealand-day-1',
    placeId: 'lake-tekapo',
    momentId: 'lake-tekapo',
    placeName: '테카포 호수',
    cityName: '뉴질랜드 남섬',
    date: '2024. 12. 13',
    image: RECORD_TRIP_IMAGES.portugal.dayThumbnails[2],
    memoText: 'lake view',
    photoCount: 39,
    takenAt: '2024-12-13',
  },
];
