import type { PlaceSearchResult, SelectedGooglePlace } from './types.ts';

export const MIN_PLACE_QUERY_LENGTH = 2;
export const PLACE_SEARCH_DEBOUNCE_MS = 325;

export function shouldRequestPlaceQuery(query: string) {
  return query.trim().length >= MIN_PLACE_QUERY_LENGTH;
}

export function shouldShowGoogleMapsAttribution(results: PlaceSearchResult[]) {
  return results.length > 0;
}

export function getPlaceSearchErrorMessage(code: string) {
  if (code === 'UNAUTHORIZED') return '장소 검색을 사용하려면 다시 로그인해주세요.';
  if (code === 'QUOTA_EXCEEDED') return '장소 검색 요청이 많아요. 잠시 후 다시 시도해주세요.';
  if (code === 'SERVER_CONFIGURATION_ERROR') return '장소 검색을 사용할 수 없어요. 직접 추가할 수 있어요.';
  if (code === 'EMPTY_GEOCODE') return '선택한 장소의 주소를 찾지 못했어요.';
  return '장소 검색을 사용할 수 없어요.';
}

export function normalizePersistedPlaceSource(source: unknown): 'google' | 'manual' {
  return source === 'google' ? 'google' : 'manual';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function normalizeGooglePlaceTypes(value: unknown) {
  if (!Array.isArray(value)) return [];

  return [...new Set(value.flatMap((type) => {
    if (typeof type !== 'string') return [];
    const normalized = type.trim();
    return normalized ? [normalized] : [];
  }))];
}

export function mapAutocompleteResponse(value: unknown): PlaceSearchResult[] {
  if (!isRecord(value) || !Array.isArray(value.results)) {
    return [];
  }

  return value.results.slice(0, 5).flatMap((item) => {
    if (!isRecord(item)) return [];
    const placeId = typeof item.placeId === 'string' ? item.placeId.trim() : '';
    const displayName = typeof item.mainText === 'string' ? item.mainText.trim() : '';
    const secondaryText = typeof item.secondaryText === 'string'
      ? item.secondaryText.trim() || undefined
      : undefined;
    const googleTypes = normalizeGooglePlaceTypes(item.types);

    return placeId && displayName
      ? [{ provider: 'google' as const, placeId, displayName, secondaryText, googleTypes }]
      : [];
  });
}

export function mapGeocodeResponse(value: unknown): SelectedGooglePlace | null {
  if (!isRecord(value)) return null;
  const place = isRecord(value.place) ? value.place : value;
  const googlePlaceId = typeof place.googlePlaceId === 'string' ? place.googlePlaceId.trim() : '';
  const formattedAddress = typeof place.formattedAddress === 'string'
    ? place.formattedAddress.trim()
    : '';
  const latitude = place.latitude;
  const longitude = place.longitude;

  if (
    !googlePlaceId || !formattedAddress ||
    typeof latitude !== 'number' || !Number.isFinite(latitude) ||
    typeof longitude !== 'number' || !Number.isFinite(longitude)
  ) return null;

  return {
    provider: 'google',
    googlePlaceId,
    formattedAddress,
    latitude,
    longitude,
    cityName: typeof place.cityName === 'string' ? place.cityName.trim() || undefined : undefined,
    countryName: typeof place.countryName === 'string' ? place.countryName.trim() || undefined : undefined,
    countryCode: typeof place.countryCode === 'string'
      ? place.countryCode.trim().toUpperCase() || undefined
      : undefined,
  };
}

export function mapAddressComponents(components: unknown, postalAddress?: unknown) {
  const normalized = Array.isArray(components) ? components.filter(isRecord) : [];
  const postal = isRecord(postalAddress) ? postalAddress : {};
  const find = (types: string[]) => normalized.find((component) => (
    Array.isArray(component.types) && component.types.some((type) => types.includes(String(type)))
  ));
  const city = find(['locality', 'postal_town', 'administrative_area_level_2']);
  const country = find(['country']);

  return {
    cityName: typeof city?.longText === 'string'
      ? city.longText
      : typeof postal.locality === 'string' ? postal.locality : undefined,
    countryName: typeof country?.longText === 'string' ? country.longText : undefined,
    countryCode: typeof country?.shortText === 'string'
      ? country.shortText.toUpperCase()
      : typeof postal.regionCode === 'string' ? postal.regionCode.toUpperCase() : undefined,
  };
}

export class PlaceRequestSequence {
  private current = 0;

  begin() {
    this.current += 1;
    return this.current;
  }

  isLatest(sequence: number) {
    return sequence === this.current;
  }
}
