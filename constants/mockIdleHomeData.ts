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
}

export interface IdleRecentTrip {
  id: string;
  city: string;
  dateRange: string;
  image: ImageSourcePropType;
}

export interface IdlePastMoment {
  id: string;
  placeName: string;
  cityName: string;
  date: string;
  image: ImageSourcePropType;
}

export const MOCK_DETECTED_TRIP: DetectedTrip = {
  id: 'detected-kyoto',
  city: '교토',
  country: '일본',
  dateRange: '2026. 3. 30 - 4. 3',
  photoCount: 50,
  image: RECORD_TRIP_IMAGES.kyoto.cover,
};

export const MOCK_RECENT_TRIPS: IdleRecentTrip[] = [
  {
    id: 'recent-paris',
    city: '파리',
    dateRange: '2025. 8. 25 - 9. 1',
    image: FIGMA_IMAGES.archive.photoFrame,
  },
  {
    id: 'recent-sydney',
    city: '시드니',
    dateRange: '2025. 3. 5 - 3. 15',
    image: RECORD_TRIP_IMAGES.sydney.cover,
  },
];

export const MOCK_PAST_MOMENTS: IdlePastMoment[] = [
  {
    id: 'osaka-castle',
    placeName: '오사카성',
    cityName: '오사카',
    date: '2026. 6. 2',
    image: FIGMA_IMAGES.myPageTrips.osaka,
  },
  {
    id: 'marina-bay',
    placeName: '마리나 베이',
    cityName: '싱가포르',
    date: '2023. 8. 30',
    image: FIGMA_IMAGES.myPageTrips.singapore,
  },
  {
    id: 'lake-tekapo',
    placeName: '테카포 호수',
    cityName: '뉴질랜드 남섬',
    date: '2024. 12. 13',
    image: RECORD_TRIP_IMAGES.portugal.dayThumbnails[2],
  },
];
