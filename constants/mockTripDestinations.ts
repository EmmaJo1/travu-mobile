import type { ImageSourcePropType } from 'react-native';

export type DestinationOptionType = 'city' | 'country' | 'region' | 'custom';
export type DestinationScope = 'domestic' | 'overseas';
export type DestinationSource = 'mock' | 'google' | 'custom';

export interface DestinationCategory {
  id: string;
  label: string;
}

export interface DestinationOption {
  id: string;
  name: string;
  country?: string | null;
  region?: string | null;
  type: DestinationOptionType;
  source?: DestinationSource;
  image?: ImageSourcePropType | string;
  placeId?: string;
  latitude?: number;
  longitude?: number;
  isCustomDestination?: boolean;
  scope?: DestinationScope;
  categoryIds?: string[];
  searchKeywords?: string[];

  /** Legacy home active-trip fields. Keep these until all callers migrate. */
  displayName: string;
  countryName: string;
  englishDisplayName?: string;
  englishCountryName?: string;
}

export const DOMESTIC_DESTINATION_CATEGORIES: DestinationCategory[] = [
  { id: 'popular', label: '인기' },
  { id: 'jeju', label: '제주' },
  { id: 'seoul', label: '서울' },
  { id: 'busan', label: '부산' },
  { id: 'gangwon', label: '강원' },
  { id: 'jeolla', label: '전라' },
  { id: 'gyeongsang', label: '경상' },
  { id: 'chungcheong', label: '충청' },
];

export const OVERSEAS_DESTINATION_CATEGORIES: DestinationCategory[] = [
  { id: 'popular', label: '인기' },
  { id: 'japan', label: '일본' },
  { id: 'china', label: '중국' },
  { id: 'taiwan-hongkong', label: '대만/홍콩' },
  { id: 'southeast-asia', label: '동남아' },
  { id: 'europe', label: '유럽' },
  { id: 'america', label: '미주' },
  { id: 'oceania', label: '오세아니아' },
];

const destinationImages = {
  osaka: require('../assets/images/mypage-trips/mypage-trip-osaka.png') as ImageSourcePropType,
  kyoto: require('../assets/images/record-trip-kyoto-cover.png') as ImageSourcePropType,
  tokyo: require('../assets/images/mypage-trips/mypage-trip-tokyo.png') as ImageSourcePropType,
  hongkong: require('../assets/images/mypage-trips/mypage-trip-hongkong.png') as ImageSourcePropType,
  taiwan: require('../assets/images/mypage-trips/mypage-trip-macao.png') as ImageSourcePropType,
  singapore: require('../assets/images/mypage-trips/mypage-trip-singapore.png') as ImageSourcePropType,
  bangkok: require('../assets/images/mypage-trips/mypage-trip-bangkok.png') as ImageSourcePropType,
  danang: require('../assets/images/record-trip-portugal-day-3.png') as ImageSourcePropType,
  phuquoc: require('../assets/images/record-trip-sydney-day-1.png') as ImageSourcePropType,
  paris: require('../assets/images/mypage-trips/mypage-trip-paris.png') as ImageSourcePropType,
  sydney: require('../assets/images/record-trip-sydney-cover.png') as ImageSourcePropType,
  seoul: require('../assets/images/home-hero-paris.png') as ImageSourcePropType,
  busan: require('../assets/images/record-day-bondi-1.png') as ImageSourcePropType,
  jeju: require('../assets/images/record-day-glenmore-1.png') as ImageSourcePropType,
  gangneung: require('../assets/images/record-day-observatory-1.png') as ImageSourcePropType,
  sokcho: require('../assets/images/record-day-observatory-2.png') as ImageSourcePropType,
  yeosu: require('../assets/images/record-day-bondi-2.png') as ImageSourcePropType,
  jeonju: require('../assets/images/record-trip-kyoto-day-2.png') as ImageSourcePropType,
  gyeongju: require('../assets/images/record-trip-kyoto-day-3.png') as ImageSourcePropType,
  gapyeong: require('../assets/images/record-day-glenmore-2.png') as ImageSourcePropType,
} as const;

function makeDestination(option: Omit<DestinationOption, 'displayName' | 'countryName'>): DestinationOption {
  return {
    ...option,
    source: option.source ?? 'mock',
    displayName: option.name,
    countryName: option.country ?? '',
    englishDisplayName: option.englishDisplayName,
    englishCountryName: option.englishCountryName,
  };
}

export const MOCK_TRIP_DESTINATIONS: DestinationOption[] = [
  makeDestination({
    id: 'city-osaka-jp',
    name: '오사카',
    country: '일본',
    type: 'city',
    scope: 'overseas',
    categoryIds: ['popular', 'japan'],
    image: destinationImages.osaka,
    searchKeywords: ['osaka', 'japan', '오사카', '일본'],
  }),
  makeDestination({
    id: 'city-kyoto-jp',
    name: '교토',
    country: '일본',
    type: 'city',
    scope: 'overseas',
    categoryIds: ['popular', 'japan'],
    image: destinationImages.kyoto,
    searchKeywords: ['kyoto', 'japan', '교토', '일본'],
  }),
  makeDestination({
    id: 'city-tokyo-jp',
    name: '도쿄',
    country: '일본',
    type: 'city',
    scope: 'overseas',
    categoryIds: ['popular', 'japan'],
    image: destinationImages.tokyo,
    searchKeywords: ['tokyo', 'japan', '도쿄', '일본'],
  }),
  makeDestination({
    id: 'city-fukuoka-jp',
    name: '후쿠오카',
    country: '일본',
    type: 'city',
    scope: 'overseas',
    categoryIds: ['japan'],
    image: destinationImages.kyoto,
    searchKeywords: ['fukuoka', 'japan', '후쿠오카', '일본'],
  }),
  makeDestination({
    id: 'city-sapporo-jp',
    name: '삿포로',
    country: '일본',
    type: 'city',
    scope: 'overseas',
    categoryIds: ['japan'],
    image: destinationImages.tokyo,
    searchKeywords: ['sapporo', 'japan', '삿포로', '일본'],
  }),
  makeDestination({
    id: 'city-okinawa-jp',
    name: '오키나와',
    country: '일본',
    type: 'city',
    scope: 'overseas',
    categoryIds: ['japan'],
    image: destinationImages.phuquoc,
    searchKeywords: ['okinawa', 'japan', '오키나와', '일본'],
  }),
  makeDestination({
    id: 'city-hongkong-hk',
    name: '홍콩',
    country: '홍콩',
    type: 'city',
    scope: 'overseas',
    categoryIds: ['popular', 'taiwan-hongkong'],
    image: destinationImages.hongkong,
    searchKeywords: ['hong kong', 'hongkong', '홍콩'],
  }),
  makeDestination({
    id: 'city-taipei-tw',
    name: '대만',
    country: '대만',
    type: 'city',
    scope: 'overseas',
    categoryIds: ['popular', 'taiwan-hongkong'],
    image: destinationImages.taiwan,
    searchKeywords: ['taipei', 'taiwan', '타이베이', '대만'],
  }),
  makeDestination({
    id: 'city-singapore-sg',
    name: '싱가포르',
    country: '싱가포르',
    type: 'city',
    scope: 'overseas',
    categoryIds: ['popular', 'southeast-asia'],
    image: destinationImages.singapore,
    searchKeywords: ['singapore', '싱가포르'],
  }),
  makeDestination({
    id: 'city-bangkok-th',
    name: '방콕',
    country: '태국',
    type: 'city',
    scope: 'overseas',
    categoryIds: ['popular', 'southeast-asia'],
    image: destinationImages.bangkok,
    searchKeywords: ['bangkok', 'thailand', '방콕', '태국'],
  }),
  makeDestination({
    id: 'city-danang-vn',
    name: '다낭',
    country: '베트남',
    type: 'city',
    scope: 'overseas',
    categoryIds: ['popular', 'southeast-asia'],
    image: destinationImages.danang,
    searchKeywords: ['danang', 'da nang', 'vietnam', '다낭', '베트남'],
  }),
  makeDestination({
    id: 'city-phuquoc-vn',
    name: '푸꾸옥',
    country: '베트남',
    type: 'city',
    scope: 'overseas',
    categoryIds: ['popular', 'southeast-asia'],
    image: destinationImages.phuquoc,
    searchKeywords: ['phu quoc', 'vietnam', '푸꾸옥', '베트남'],
  }),
  makeDestination({
    id: 'city-paris-fr',
    name: 'Paris',
    country: 'France',
    type: 'city',
    scope: 'overseas',
    categoryIds: ['europe'],
    image: destinationImages.paris,
    searchKeywords: ['파리', '프랑스', 'paris', 'france'],
  }),
  makeDestination({
    id: 'country-france',
    name: 'France',
    country: 'France',
    type: 'country',
    scope: 'overseas',
    categoryIds: ['europe'],
    image: destinationImages.paris,
    searchKeywords: ['프랑스', 'france'],
  }),
  makeDestination({
    id: 'country-japan',
    name: 'Japan',
    country: 'Japan',
    type: 'country',
    scope: 'overseas',
    categoryIds: ['japan'],
    image: destinationImages.kyoto,
    searchKeywords: ['일본', 'japan'],
  }),
  makeDestination({
    id: 'city-sydney-au',
    name: 'Sydney',
    country: 'Australia',
    type: 'city',
    scope: 'overseas',
    categoryIds: ['oceania'],
    image: destinationImages.sydney,
    searchKeywords: ['시드니', '호주', 'sydney', 'australia'],
  }),
  makeDestination({
    id: 'city-seoul-kr',
    name: '서울',
    country: '대한민국',
    type: 'city',
    scope: 'domestic',
    categoryIds: ['popular', 'seoul'],
    image: destinationImages.seoul,
    searchKeywords: ['서울', '대한민국', '한국', 'seoul', 'korea'],
  }),
  makeDestination({
    id: 'city-jeju-kr',
    name: '제주',
    country: '대한민국',
    type: 'city',
    scope: 'domestic',
    categoryIds: ['popular', 'jeju'],
    image: destinationImages.jeju,
    searchKeywords: ['제주', '제주도', '대한민국', 'jeju', 'korea'],
  }),
  makeDestination({
    id: 'city-busan-kr',
    name: '부산',
    country: '대한민국',
    type: 'city',
    scope: 'domestic',
    categoryIds: ['popular', 'busan'],
    image: destinationImages.busan,
    searchKeywords: ['부산', '대한민국', 'busan', 'korea'],
  }),
  makeDestination({
    id: 'city-sokcho-kr',
    name: '속초',
    country: '대한민국',
    type: 'city',
    scope: 'domestic',
    categoryIds: ['popular', 'gangwon'],
    image: destinationImages.sokcho,
    searchKeywords: ['속초', '강원', '대한민국', 'sokcho', 'korea'],
  }),
  makeDestination({
    id: 'city-yeosu-kr',
    name: '여수',
    country: '대한민국',
    type: 'city',
    scope: 'domestic',
    categoryIds: ['popular', 'jeolla'],
    image: destinationImages.yeosu,
    searchKeywords: ['여수', '전라', '전남', '대한민국', 'yeosu', 'korea'],
  }),
  makeDestination({
    id: 'city-jeonju-kr',
    name: '전주',
    country: '대한민국',
    type: 'city',
    scope: 'domestic',
    categoryIds: ['popular', 'jeolla'],
    image: destinationImages.jeonju,
    searchKeywords: ['전주', '전라', '전북', '대한민국', 'jeonju', 'korea'],
  }),
  makeDestination({
    id: 'city-gyeongju-kr',
    name: '경주',
    country: '대한민국',
    type: 'city',
    scope: 'domestic',
    categoryIds: ['popular', 'gyeongsang'],
    image: destinationImages.gyeongju,
    searchKeywords: ['경주', '경상', '경북', '대한민국', 'gyeongju', 'korea'],
  }),
  makeDestination({
    id: 'city-gangneung-kr',
    name: '강릉',
    country: '대한민국',
    type: 'city',
    scope: 'domestic',
    categoryIds: ['popular', 'gangwon'],
    image: destinationImages.gangneung,
    searchKeywords: ['강릉', '강원', '대한민국', 'gangneung', 'korea'],
  }),
  makeDestination({
    id: 'city-gapyeong-kr',
    name: '가평',
    country: '대한민국',
    type: 'city',
    scope: 'domestic',
    categoryIds: ['popular', 'gangwon'],
    image: destinationImages.gapyeong,
    searchKeywords: ['가평', '경기', '대한민국', 'gapyeong', 'korea'],
  }),
];

export function createCustomDestination(name: string): DestinationOption {
  const trimmedName = name.trim();
  const idValue = trimmedName
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w가-힣-]/g, '');

  return {
    id: `custom-${idValue || 'destination'}`,
    name: trimmedName,
    country: null,
    region: null,
    type: 'custom',
    source: 'custom',
    isCustomDestination: true,
    displayName: trimmedName,
    countryName: '',
    englishDisplayName: /^[\x00-\x7F]+$/.test(trimmedName) ? trimmedName : undefined,
  };
}

export function getDestinationCategories(scope: DestinationScope): DestinationCategory[] {
  return scope === 'domestic'
    ? DOMESTIC_DESTINATION_CATEGORIES
    : OVERSEAS_DESTINATION_CATEGORIES;
}

export function getDestinationsByCategory(
  scope: DestinationScope,
  categoryId: string,
): DestinationOption[] {
  return MOCK_TRIP_DESTINATIONS.filter((destination) => (
    destination.scope === scope &&
    (destination.categoryIds ?? []).includes(categoryId)
  ));
}

export function searchTripDestinations(
  query: string,
  scope?: DestinationScope,
): DestinationOption[] {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return scope
      ? MOCK_TRIP_DESTINATIONS.filter((option) => option.scope === scope)
      : MOCK_TRIP_DESTINATIONS;
  }

  return MOCK_TRIP_DESTINATIONS.filter((option) => {
    if (scope && option.scope !== scope) return false;

    return [
      option.name,
      option.country,
      option.region,
      option.displayName,
      option.countryName,
      ...(option.searchKeywords ?? []),
    ].some((keyword) => keyword?.toLowerCase().includes(normalizedQuery));
  });
}
