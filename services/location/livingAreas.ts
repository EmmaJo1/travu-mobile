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
  scope?: 'administrative_area' | 'locality' | 'district';
  exclusionRadiusKm?: number;
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

export type ConfirmedLivingAreaProfilePatch = {
  based_in: string | null;
  based_in_city: string | null;
  based_in_country: string | null;
  based_in_country_code: string | null;
  based_in_google_place_id: string | null;
  based_in_latitude: number | null;
  based_in_longitude: number | null;
};

const METROPOLITAN_EXCLUSION_RADIUS_KM = 45;
const CITY_EXCLUSION_RADIUS_KM = 30;

const LIVING_AREAS: LivingArea[] = [
  {
    id: 'kr-seoul',
    displayName: '서울특별시',
    countryCode: 'KR',
    countryName: '대한민국',
    administrativeArea: '서울특별시',
    locality: '서울특별시',
    latitude: 37.5665,
    longitude: 126.978,
    source: 'manual',
    scope: 'administrative_area',
    exclusionRadiusKm: METROPOLITAN_EXCLUSION_RADIUS_KM,
  },
  {
    id: 'kr-busan',
    displayName: '부산광역시',
    countryCode: 'KR',
    countryName: '대한민국',
    administrativeArea: '부산광역시',
    locality: '부산광역시',
    latitude: 35.1796,
    longitude: 129.0756,
    source: 'manual',
    scope: 'administrative_area',
    exclusionRadiusKm: METROPOLITAN_EXCLUSION_RADIUS_KM,
  },
  {
    id: 'kr-daegu',
    displayName: '대구광역시',
    countryCode: 'KR',
    countryName: '대한민국',
    administrativeArea: '대구광역시',
    locality: '대구광역시',
    latitude: 35.8714,
    longitude: 128.6014,
    source: 'manual',
    scope: 'administrative_area',
    exclusionRadiusKm: METROPOLITAN_EXCLUSION_RADIUS_KM,
  },
  {
    id: 'kr-incheon',
    displayName: '인천광역시',
    countryCode: 'KR',
    countryName: '대한민국',
    administrativeArea: '인천광역시',
    locality: '인천광역시',
    latitude: 37.4563,
    longitude: 126.7052,
    source: 'manual',
    scope: 'administrative_area',
    exclusionRadiusKm: METROPOLITAN_EXCLUSION_RADIUS_KM,
  },
  {
    id: 'kr-gwangju',
    displayName: '광주광역시',
    countryCode: 'KR',
    countryName: '대한민국',
    administrativeArea: '광주광역시',
    locality: '광주광역시',
    latitude: 35.1595,
    longitude: 126.8526,
    source: 'manual',
    scope: 'administrative_area',
    exclusionRadiusKm: METROPOLITAN_EXCLUSION_RADIUS_KM,
  },
  {
    id: 'kr-daejeon',
    displayName: '대전광역시',
    countryCode: 'KR',
    countryName: '대한민국',
    administrativeArea: '대전광역시',
    locality: '대전광역시',
    latitude: 36.3504,
    longitude: 127.3845,
    source: 'manual',
    scope: 'administrative_area',
    exclusionRadiusKm: METROPOLITAN_EXCLUSION_RADIUS_KM,
  },
  {
    id: 'kr-ulsan',
    displayName: '울산광역시',
    countryCode: 'KR',
    countryName: '대한민국',
    administrativeArea: '울산광역시',
    locality: '울산광역시',
    latitude: 35.5384,
    longitude: 129.3114,
    source: 'manual',
    scope: 'administrative_area',
    exclusionRadiusKm: METROPOLITAN_EXCLUSION_RADIUS_KM,
  },
  {
    id: 'kr-sejong',
    displayName: '세종특별자치시',
    countryCode: 'KR',
    countryName: '대한민국',
    administrativeArea: '세종특별자치시',
    locality: '세종특별자치시',
    latitude: 36.48,
    longitude: 127.289,
    source: 'manual',
    scope: 'administrative_area',
    exclusionRadiusKm: CITY_EXCLUSION_RADIUS_KM,
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
    scope: 'locality',
    exclusionRadiusKm: CITY_EXCLUSION_RADIUS_KM,
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
    scope: 'locality',
    exclusionRadiusKm: CITY_EXCLUSION_RADIUS_KM,
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
    scope: 'locality',
    exclusionRadiusKm: 35,
  },
];

function normalizeSearchText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, '');
}

function findCanonicalLivingArea(...values: Array<string | null | undefined>) {
  const normalizedValues = values
    .filter((value): value is string => Boolean(value))
    .map(normalizeSearchText);

  return LIVING_AREAS.find((area) => {
    const areaNames = [area.displayName, area.administrativeArea, area.locality]
      .filter((value): value is string => Boolean(value))
      .map(normalizeSearchText);

    return normalizedValues.some((value) => areaNames.some((areaName) => (
      value === areaName || value.startsWith(areaName) || areaName.startsWith(value)
    )));
  });
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
  const canonicalArea = findCanonicalLivingArea(
    basedInPlace?.region,
    basedInPlace?.city,
    basedInPlace?.displayName,
    basedIn,
  );

  // Existing district-level profiles such as "광주광역시 동구" are promoted to
  // the canonical city-wide area so the home-region filter excludes the whole city.
  if (canonicalArea?.scope === 'administrative_area') {
    return canonicalArea;
  }

  const displayName = canonicalArea?.displayName ?? basedInPlace?.displayName ?? basedIn;
  const latitude = canonicalArea?.latitude ?? basedInPlace?.latitude;
  const longitude = canonicalArea?.longitude ?? basedInPlace?.longitude;

  if (
    !displayName ||
    !isFiniteCoordinate(latitude) ||
    !isFiniteCoordinate(longitude)
  ) {
    return null;
  }

  return {
    id: canonicalArea?.id ?? basedInPlace?.placeId ?? `profile-${displayName}`,
    displayName,
    countryCode: canonicalArea?.countryCode ?? basedInPlace?.countryCode ?? undefined,
    countryName: canonicalArea?.countryName ?? basedInPlace?.country ?? undefined,
    administrativeArea: canonicalArea?.administrativeArea ?? basedInPlace?.region ?? undefined,
    locality: canonicalArea?.locality ?? basedInPlace?.city ?? displayName,
    latitude: latitude as number,
    longitude: longitude as number,
    providerPlaceId: canonicalArea?.providerPlaceId ?? basedInPlace?.placeId ?? undefined,
    source: canonicalArea?.source ?? 'manual',
    scope: canonicalArea?.scope ?? 'locality',
    exclusionRadiusKm: canonicalArea?.exclusionRadiusKm ?? CITY_EXCLUSION_RADIUS_KM,
  };
}

export function createConfirmedLivingAreaProfilePatch(
  livingArea: LivingArea | null,
): ConfirmedLivingAreaProfilePatch {
  return {
    based_in: livingArea?.displayName ?? null,
    based_in_city: livingArea?.locality ?? livingArea?.displayName ?? null,
    based_in_country: livingArea?.countryName ?? null,
    based_in_country_code: livingArea?.countryCode ?? null,
    based_in_google_place_id: livingArea?.providerPlaceId ?? null,
    based_in_latitude: livingArea?.latitude ?? null,
    based_in_longitude: livingArea?.longitude ?? null,
  };
}
