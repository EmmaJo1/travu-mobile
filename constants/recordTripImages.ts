import type { ImageSourcePropType } from 'react-native';

/**
 * Figma Record(1096:1231) · record-day-detail DateBadge 공통 에셋.
 * day-5 PNG는 날짜 라벨이 baked-in 되어 DateBadge 오버레이와 중복되므로 제외.
 */
export const RECORD_TRIP_IMAGES = {
  sydney: {
    cover: require('../assets/images/record-trip-sydney-cover.png'),
    dayThumbnails: [
      require('../assets/images/record-trip-sydney-day-1.png'),
      require('../assets/images/record-trip-sydney-day-2.png'),
      require('../assets/images/record-trip-sydney-day-3.png'),
      require('../assets/images/record-trip-sydney-day-4.png'),
    ] as ImageSourcePropType[],
  },
  kyoto: {
    cover: require('../assets/images/record-trip-kyoto-cover.png'),
    dayThumbnails: [
      require('../assets/images/record-trip-kyoto-day-1.png'),
      require('../assets/images/record-trip-kyoto-day-2.png'),
      require('../assets/images/record-trip-kyoto-day-3.png'),
      require('../assets/images/record-trip-kyoto-day-4.png'),
    ] as ImageSourcePropType[],
  },
  portugal: {
    cover: require('../assets/images/record-trip-portugal-cover.png'),
    dayThumbnails: [
      require('../assets/images/record-trip-portugal-day-1.png'),
      require('../assets/images/record-trip-portugal-day-2.png'),
      require('../assets/images/record-trip-portugal-day-3.png'),
      require('../assets/images/record-trip-portugal-day-4.png'),
    ] as ImageSourcePropType[],
  },
} as const;

/** record-day-detail PlaceEntryCard 사진 */
export const RECORD_DAY_ENTRY_IMAGES = {
  bondi1: require('../assets/images/record-day-bondi-1.png'),
  bondi2: require('../assets/images/record-day-bondi-2.png'),
  bondi3: require('../assets/images/record-day-bondi-3.png'),
  bondi4: require('../assets/images/record-day-bondi-4.png'),
  observatory1: require('../assets/images/record-day-observatory-1.png'),
  observatory2: require('../assets/images/record-day-observatory-2.png'),
  glenmore1: require('../assets/images/record-day-glenmore-1.png'),
  glenmore2: require('../assets/images/record-day-glenmore-2.png'),
  glenmore3: require('../assets/images/record-day-glenmore-3.png'),
  glenmore4: require('../assets/images/record-day-glenmore-4.png'),
} as const;
