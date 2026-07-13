export type LivingArea = {
  id: string;
  displayName: string;
  countryCode?: string;
  countryName?: string;
  administrativeArea?: string;
  locality?: string;
  subLocality?: string;
  latitude: number;
  longitude: number;
  providerPlaceId?: string;
  source: 'google' | 'apple' | 'manual';
};

export type LivingAreaProfileValue = {
  displayName?: string | null;
  city?: string | null;
  region?: string | null;
  country?: string | null;
  countryCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  placeId?: string | null;
};

const LIVING_AREAS: LivingArea[] = [
  {
    id: 'kr-seoul-mapo',
    displayName: '서울특별시 마포구',
    countryCode: 'KR',
    countryName: '대한민국',
    administrativeArea: '서울특별시',
    locality: '마포구',
    latitude: 37.5663,
    longitude: 126.9018,
    source: 'manual',
  },
  {
    id: 'kr-seoul-gangnam',
    displayName: '서울특별시 강남구',
    countryCode: 'KR',
    countryName: '대한민국',
    administrativeArea: '서울특별시',
    locality: '강남구',
    latitude: 37.5173,
    longitude: 127.0473,
    source: 'manual',
  },
  {
    id: 'kr-seoul-songpa',
    displayName: '서울특별시 송파구',
    countryCode: 'KR',
    countryName: '대한민국',
    administrativeArea: '서울특별시',
    locality: '송파구',
    latitude: 37.5145,
    longitude: 127.1059,
    source: 'manual',
  },
  {
    id: 'kr-gyeonggi-gwangju',
    displayName: '경기도 광주시',
    countryCode: 'KR',
    countryName: '대한민국',
    administrativeArea: '경기도',
    locality: '광주시',
    latitude: 37.4293,
    longitude: 127.2551,
    source: 'manual',
  },
  {
    id: 'kr-gyeonggi-suwon',
    displayName: '경기도 수원시',
    countryCode: 'KR',
    countryName: '대한민국',
    administrativeArea: '경기도',
    locality: '수원시',
    latitude: 37.2636,
    longitude: 127.0286,
    source: 'manual',
  },
  {
    id: 'kr-incheon-yeonsu',
    displayName: '인천광역시 연수구',
    countryCode: 'KR',
    countryName: '대한민국',
    administrativeArea: '인천광역시',
    locality: '연수구',
    latitude: 37.4103,
    longitude: 126.6783,
    source: 'manual',
  },
  {
    id: 'kr-busan-haeundae',
    displayName: '부산광역시 해운대구',
    countryCode: 'KR',
    countryName: '대한민국',
    administrativeArea: '부산광역시',
    locality: '해운대구',
    latitude: 35.1631,
    longitude: 129.1636,
    source: 'manual',
  },
  {
    id: 'kr-gwangju-dong',
    displayName: '광주광역시 동구',
    countryCode: 'KR',
    countryName: '대한민국',
    administrativeArea: '광주광역시',
    locality: '동구',
    latitude: 35.1461,
    longitude: 126.9231,
    source: 'manual',
  },
  {
    id: 'kr-jeju-jeju',
    displayName: '제주특별자치도 제주시',
    countryCode: 'KR',
    countryName: '대한민국',
    administrativeArea: '제주특별자치도',
    locality: '제주시',
    latitude: 33.4996,
    longitude: 126.5312,
    source: 'manual',
  },
];

function normalizeSearchText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, '');
}

export function searchLivingAreas(query: string, limit = 8) {
  const normalizedQuery = normalizeSearchText(query);

  if (normalizedQuery.length < 2) {
    return [];
  }

  return LIVING_AREAS.filter((area) => {
    const haystack = [
      area.displayName,
      area.countryName,
      area.administrativeArea,
      area.locality,
      area.subLocality,
    ]
      .filter(Boolean)
      .map((value) => normalizeSearchText(value ?? ''));

    return haystack.some((value) => value.includes(normalizedQuery));
  }).slice(0, limit);
}

function isFiniteCoordinate(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value);
}

export function createLivingAreaFromProfile(
  basedIn?: string | null,
  basedInPlace?: LivingAreaProfileValue | null,
): LivingArea | null {
  const displayName = basedInPlace?.displayName ?? basedIn;
  const latitude = basedInPlace?.latitude;
  const longitude = basedInPlace?.longitude;

  if (
    !displayName ||
    !isFiniteCoordinate(latitude) ||
    !isFiniteCoordinate(longitude)
  ) {
    return null;
  }

  return {
    id: basedInPlace?.placeId ?? `profile-${displayName}`,
    displayName,
    countryCode: basedInPlace?.countryCode ?? undefined,
    countryName: basedInPlace?.country ?? undefined,
    administrativeArea: basedInPlace?.region ?? undefined,
    locality: basedInPlace?.city ?? displayName,
    latitude: latitude as number,
    longitude: longitude as number,
    providerPlaceId: basedInPlace?.placeId ?? undefined,
    source: 'manual',
  };
}
