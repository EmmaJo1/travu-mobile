import type { ImageSourcePropType } from 'react-native';

export interface PlaceDetailPhoto {
  id: string;
  source: ImageSourcePropType;
  takenAt?: string;
  createdAt?: string;
  timestamp?: string | number;
  photoTakenAt?: string;
  exifDateTimeOriginal?: string;
}

export interface PlaceDetailRecord {
  id: string;
  tripId: string;
  dayId: string;
  placeId: string;
  time?: string;
  text?: string;
  photoIds?: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface PlaceDetailData {
  tripId: string;
  dayId: string;
  placeId: string;
  placeName: string;
  cityName: string;
  countryName: string;
  dateLabel: string;
  timeLabel?: string;
  categoryLabel?: string;
  tripName: string;
  tripDateRange: string;
  photos: PlaceDetailPhoto[];
  records: PlaceDetailRecord[];
}

const sydneyPhotos: PlaceDetailPhoto[] = [
  { id: 'sydney-cover', source: require('../assets/images/record-trip-sydney-cover.png') },
  { id: 'sydney-day-1', source: require('../assets/images/record-trip-sydney-day-1.png') },
  { id: 'sydney-day-2', source: require('../assets/images/record-trip-sydney-day-2.png') },
  { id: 'sydney-day-3', source: require('../assets/images/record-trip-sydney-day-3.png') },
  { id: 'sydney-day-4', source: require('../assets/images/record-trip-sydney-day-4.png') },
  { id: 'sydney-day-5', source: require('../assets/images/record-trip-sydney-day-5.png') },
];

const parisPhotos: PlaceDetailPhoto[] = [
  { id: 'notre-dame-cover', source: require('../assets/images/home-photo-candidate-1.png') },
  { id: 'sainte-chapelle-cover', source: require('../assets/images/home-photo-candidate-2.png') },
  { id: 'louvre-cover', source: require('../assets/images/home-photo-candidate-3.png') },
  { id: 'paris-archive', source: require('../assets/images/archive-frame-paris.jpg') },
  { id: 'paris-trip', source: require('../assets/images/mypage-trips/mypage-trip-paris.png') },
];

const osakaPhotos: PlaceDetailPhoto[] = [
  { id: 'osaka-cover', source: require('../assets/images/mypage-trips/mypage-trip-osaka.png') },
  { id: 'kyoto-cover', source: require('../assets/images/record-trip-kyoto-cover.png') },
  { id: 'kyoto-day-1', source: require('../assets/images/record-trip-kyoto-day-1.png') },
  { id: 'kyoto-day-2', source: require('../assets/images/record-trip-kyoto-day-2.png') },
];

const singaporePhotos: PlaceDetailPhoto[] = [
  { id: 'singapore-cover', source: require('../assets/images/mypage-trips/mypage-trip-singapore.png') },
  { id: 'sydney-cover', source: require('../assets/images/record-trip-sydney-cover.png') },
  { id: 'sydney-day-2', source: require('../assets/images/record-trip-sydney-day-2.png') },
];

const tekapoPhotos: PlaceDetailPhoto[] = [
  { id: 'tekapo-cover', source: require('../assets/images/record-trip-portugal-cover.png') },
  { id: 'tekapo-day-1', source: require('../assets/images/record-trip-portugal-day-1.png') },
  { id: 'tekapo-day-2', source: require('../assets/images/record-trip-portugal-day-2.png') },
];

export const MOCK_PLACE_DETAILS: PlaceDetailData[] = [
  {
    tripId: 'moment-sydney-trip',
    dayId: 'moment-sydney-day-1',
    placeId: 'opera-house',
    placeName: '오페라 하우스',
    cityName: '시드니',
    countryName: '오스트레일리아',
    dateLabel: '2025.3.5 (수)',
    timeLabel: '6 PM',
    categoryLabel: '랜드마크',
    tripName: '시드니 여행',
    tripDateRange: '2025.3.5 - 3.15',
    photos: sydneyPhotos,
    records: [
      {
        id: 'opera-note-1',
        tripId: 'moment-sydney-trip',
        dayId: 'moment-sydney-day-1',
        placeId: 'opera-house',
        time: '6 PM',
        text: '하버브릿지 위에서 내려다보는 오페라 하우스의 모습은 정말 좋았다. 아직은 늦여름과 초가을 사이라서 조금 더웠지만 높은 다리 위라서 그런지 바람이 많이 불어서 좋았다.',
        photoIds: ['sydney-cover'],
        createdAt: '2025-03-05T18:10:00.000Z',
      },
      {
        id: 'opera-note-2',
        tripId: 'moment-sydney-trip',
        dayId: 'moment-sydney-day-1',
        placeId: 'opera-house',
        time: '6 PM',
        text: '옆에서 조금 떨어진 곳에서 다른 분도 카메라로 사진을 찍고 계셨는데 말을 걸고 싶었다. 어떤 모습을 프레임으로 담고 있는지 궁금했다.',
        createdAt: '2025-03-05T18:25:00.000Z',
      },
      {
        id: 'opera-note-3',
        tripId: 'moment-sydney-trip',
        dayId: 'moment-sydney-day-1',
        placeId: 'opera-house',
        time: '7 PM',
        text: '바람도 선선하게 불고, 에어팟을 통해서 들리는 노랫소리는 마음을 몽글몽글하고 설레게 만들었다. 점점 붉게 물드는 하늘을 보면서 셔터를 계속 눌렀다.',
        createdAt: '2025-03-05T19:00:00.000Z',
      },
    ],
  },
  {
    tripId: 'moment-osaka-trip',
    dayId: 'moment-osaka-day-1',
    placeId: 'osaka-castle',
    placeName: '오사카성',
    cityName: '오사카',
    countryName: '일본',
    dateLabel: '2026.6.2 (화)',
    timeLabel: '3 PM',
    categoryLabel: '관광명소',
    tripName: '오사카 여행',
    tripDateRange: '2026.6.2 - 6.6',
    photos: osakaPhotos,
    records: [
      {
        id: 'osaka-note-1',
        tripId: 'moment-osaka-trip',
        dayId: 'moment-osaka-day-1',
        placeId: 'osaka-castle',
        time: '3 PM',
        text: '성 주변의 나무가 생각보다 훨씬 푸르렀다. 사진을 찍을 때마다 흰 성벽과 초록색이 같이 잡혀서 좋았다.',
        photoIds: ['osaka-cover'],
        createdAt: '2026-06-02T15:12:00.000Z',
      },
    ],
  },
  {
    tripId: 'moment-singapore-trip',
    dayId: 'moment-singapore-day-1',
    placeId: 'marina-bay',
    placeName: '마리나 베이',
    cityName: '싱가포르',
    countryName: '싱가포르',
    dateLabel: '2023.8.30 (수)',
    timeLabel: '8 PM',
    categoryLabel: '야경명소',
    tripName: '싱가포르 여행',
    tripDateRange: '2023.8.30 - 9.3',
    photos: singaporePhotos,
    records: [
      {
        id: 'marina-note-1',
        tripId: 'moment-singapore-trip',
        dayId: 'moment-singapore-day-1',
        placeId: 'marina-bay',
        time: '8 PM',
        text: '밤에 보는 마리나 베이는 낮과 완전히 다른 분위기였다. 물 위로 비치는 불빛이 오래 남았다.',
        photoIds: ['singapore-cover'],
        createdAt: '2023-08-30T20:18:00.000Z',
      },
    ],
  },
  {
    tripId: 'active-paris-trip',
    dayId: 'active-paris-day-1',
    placeId: 'notre-dame',
    placeName: '노트르담 대성당',
    cityName: '파리',
    countryName: '프랑스',
    dateLabel: '2025.11.2 (일)',
    timeLabel: '2 PM',
    categoryLabel: '관광명소',
    tripName: 'Paris 여행',
    tripDateRange: '2025.11.2 - 11.12',
    photos: parisPhotos,
    records: [
      {
        id: 'notre-note-1',
        tripId: 'active-paris-trip',
        dayId: 'active-paris-day-1',
        placeId: 'notre-dame',
        time: '2 PM',
        text: '날씨가 좋고 햇살이 아름다웠던 시간. 성당 내부의 스테인드글라스가 특히 인상적이었다.',
        photoIds: ['notre-dame-cover'],
        createdAt: '2025-11-02T14:05:00.000Z',
      },
      {
        id: 'notre-note-2',
        tripId: 'active-paris-trip',
        dayId: 'active-paris-day-1',
        placeId: 'notre-dame',
        time: '2 PM',
        text: '파리의 분위기를 제대로 느낄 수 있었던 장소.',
        createdAt: '2025-11-02T14:22:00.000Z',
      },
    ],
  },
  {
    tripId: 'active-paris-trip',
    dayId: 'active-paris-day-1',
    placeId: 'sainte-chapelle',
    placeName: '생트 샤펠',
    cityName: '파리',
    countryName: '프랑스',
    dateLabel: '2025.11.2 (일)',
    timeLabel: '4 PM',
    categoryLabel: '관광명소',
    tripName: 'Paris 여행',
    tripDateRange: '2025.11.2 - 11.12',
    photos: [parisPhotos[1], parisPhotos[0], parisPhotos[3]],
    records: [
      {
        id: 'chapelle-note-1',
        tripId: 'active-paris-trip',
        dayId: 'active-paris-day-1',
        placeId: 'sainte-chapelle',
        time: '4 PM',
        text: '창문을 통해 들어오는 빛이 공간 전체를 채웠다.',
        photoIds: ['sainte-chapelle-cover'],
        createdAt: '2025-11-02T16:08:00.000Z',
      },
    ],
  },
  {
    tripId: 'active-paris-trip',
    dayId: 'active-paris-day-1',
    placeId: 'louvre',
    placeName: '루브르 박물관',
    cityName: '파리',
    countryName: '프랑스',
    dateLabel: '2025.11.2 (일)',
    timeLabel: '6 PM',
    categoryLabel: '관광명소',
    tripName: 'Paris 여행',
    tripDateRange: '2025.11.2 - 11.12',
    photos: [parisPhotos[2], parisPhotos[3], parisPhotos[0]],
    records: [
      {
        id: 'louvre-note-1',
        tripId: 'active-paris-trip',
        dayId: 'active-paris-day-1',
        placeId: 'louvre',
        time: '6 PM',
        text: '유리 피라미드가 켜지는 순간이 좋았다.',
        photoIds: ['louvre-cover'],
        createdAt: '2025-11-02T18:20:00.000Z',
      },
    ],
  },
  {
    tripId: 'moment-newzealand-trip',
    dayId: 'moment-newzealand-day-1',
    placeId: 'lake-tekapo',
    placeName: '테카포 호수',
    cityName: '뉴질랜드 남섬',
    countryName: '뉴질랜드',
    dateLabel: '2024.12.13 (금)',
    timeLabel: '5 PM',
    categoryLabel: '자연명소',
    tripName: '뉴질랜드 여행',
    tripDateRange: '2024.12.13 - 12.18',
    photos: tekapoPhotos,
    records: [
      {
        id: 'tekapo-note-1',
        tripId: 'moment-newzealand-trip',
        dayId: 'moment-newzealand-day-1',
        placeId: 'lake-tekapo',
        time: '5 PM',
        text: '호수 주변의 색이 사진보다 더 선명했다. 바람은 차가웠지만 오래 걷고 싶었다.',
        photoIds: ['tekapo-cover'],
        createdAt: '2024-12-13T17:04:00.000Z',
      },
    ],
  },
];

export function getMockPlaceDetail(
  tripId?: string,
  dayId?: string,
  placeId?: string,
): PlaceDetailData | undefined {
  return MOCK_PLACE_DETAILS.find((detail) => {
    if (placeId && detail.placeId !== placeId) {
      return false;
    }

    if (tripId && detail.tripId !== tripId) {
      return false;
    }

    if (dayId && detail.dayId !== dayId) {
      return false;
    }

    return true;
  }) ?? MOCK_PLACE_DETAILS.find((detail) => detail.placeId === placeId);
}
