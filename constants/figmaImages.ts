import type { ImageSourcePropType } from 'react-native';

import { RECORD_DAY_ENTRY_IMAGES, RECORD_TRIP_IMAGES } from '@/constants/recordTripImages';

/** Figma 01_MVP Screens에서 export한 로컬 이미지 모음 */
export const FIGMA_IMAGES = {
  home: {
    idleHeroParis: require('../assets/images/home-idle-hero-paris.jpg') as ImageSourcePropType,
    heroParis: require('../assets/images/home-hero-paris.png') as ImageSourcePropType,
    photoCandidate1: require('../assets/images/home-photo-candidate-1.png') as ImageSourcePropType,
    photoCandidate2: require('../assets/images/home-photo-candidate-2.png') as ImageSourcePropType,
    photoCandidate3: require('../assets/images/home-photo-candidate-3.png') as ImageSourcePropType,
  },
  profile: {
    avatar: require('../assets/images/home-photo-candidate-2.png') as ImageSourcePropType,
  },
  archive: {
    hero: require('../assets/images/home-hero-paris.png') as ImageSourcePropType,
    photoFrame: require('../assets/images/archive-frame-paris.jpg') as ImageSourcePropType,
  },
  onboarding: {
    firstFlight: require('../assets/images/onboarding-first-flight.jpg') as ImageSourcePropType,
  },
  record: RECORD_TRIP_IMAGES,
  dayEntry: RECORD_DAY_ENTRY_IMAGES,
  /** Figma mypage-travel TripListCard img_spot (64×76) */
  myPageTrips: {
    paris: require('../assets/images/mypage-trips/mypage-trip-paris.png') as ImageSourcePropType,
    rome: require('../assets/images/mypage-trips/mypage-trip-rome.png') as ImageSourcePropType,
    venice: require('../assets/images/mypage-trips/mypage-trip-venice.png') as ImageSourcePropType,
    florence: require('../assets/images/mypage-trips/mypage-trip-florence.png') as ImageSourcePropType,
    budapest: require('../assets/images/mypage-trips/mypage-trip-budapest.png') as ImageSourcePropType,
    vienna: require('../assets/images/mypage-trips/mypage-trip-vienna.png') as ImageSourcePropType,
    tokyo: require('../assets/images/mypage-trips/mypage-trip-tokyo.png') as ImageSourcePropType,
    hongkong: require('../assets/images/mypage-trips/mypage-trip-hongkong.png') as ImageSourcePropType,
    macao: require('../assets/images/mypage-trips/mypage-trip-macao.png') as ImageSourcePropType,
    osaka: require('../assets/images/mypage-trips/mypage-trip-osaka.png') as ImageSourcePropType,
    singapore: require('../assets/images/mypage-trips/mypage-trip-singapore.png') as ImageSourcePropType,
    bangkok: require('../assets/images/mypage-trips/mypage-trip-bangkok.png') as ImageSourcePropType,
  },
} as const;
