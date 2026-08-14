import { supabase } from '@/lib/supabase';
import { getAppContentLanguageCode } from '@/services/localization/appLanguage';
import type { PlaceSearchResult, SelectedGooglePlace } from '@/services/placeSearch/types';
import {
  getPlaceSearchErrorMessage,
  mapAutocompleteResponse,
  mapGeocodeResponse,
  MIN_PLACE_QUERY_LENGTH,
  PLACE_SEARCH_DEBOUNCE_MS,
} from '@/services/placeSearch/mappers';

export { mapAutocompleteResponse, mapGeocodeResponse } from '@/services/placeSearch/mappers';

export { MIN_PLACE_QUERY_LENGTH, PLACE_SEARCH_DEBOUNCE_MS } from '@/services/placeSearch/mappers';

type AutocompletePayload = {
  results?: unknown;
};

type GeocodePayload = {
  place?: unknown;
};

export class PlaceSearchError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = 'PlaceSearchError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalizeFunctionError(error: { message?: string } | null, data: unknown): PlaceSearchError {
  const code = isRecord(data) && typeof data.code === 'string' ? data.code : 'UNAVAILABLE';

  if (code === 'UNAUTHORIZED') {
    return new PlaceSearchError(code, getPlaceSearchErrorMessage(code));
  }
  if (code === 'QUOTA_EXCEEDED') {
    return new PlaceSearchError(code, getPlaceSearchErrorMessage(code));
  }
  if (code === 'SERVER_CONFIGURATION_ERROR') {
    return new PlaceSearchError(code, getPlaceSearchErrorMessage(code));
  }

  return new PlaceSearchError(code, error?.message ? '장소 검색에 연결하지 못했어요.' : '장소 검색을 사용할 수 없어요.');
}

async function invokeGooglePlaces(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke<AutocompletePayload & GeocodePayload>(
    'google-places',
    { body },
  );

  if (error || (isRecord(data as unknown) && typeof (data as Record<string, unknown>).code === 'string')) {
    throw normalizeFunctionError(error, data);
  }

  return data;
}

export async function autocompleteGooglePlaces(
  query: string,
  locationBias?: { latitude: number; longitude: number },
): Promise<PlaceSearchResult[]> {
  const normalizedQuery = query.trim();
  if (normalizedQuery.length < MIN_PLACE_QUERY_LENGTH) {
    return [];
  }

  const languageCode = getAppContentLanguageCode();
  const data = await invokeGooglePlaces({
    operation: 'autocomplete',
    query: normalizedQuery,
    languageCode,
    locationBias,
  });
  return mapAutocompleteResponse(data);
}

export async function geocodeGooglePlace(placeId: string): Promise<SelectedGooglePlace> {
  const languageCode = getAppContentLanguageCode();
  const data = await invokeGooglePlaces({
    operation: 'geocode_place',
    placeId: placeId.trim(),
    languageCode,
  });
  const place = mapGeocodeResponse(data);

  if (!place) {
    throw new PlaceSearchError('EMPTY_GEOCODE', getPlaceSearchErrorMessage('EMPTY_GEOCODE'));
  }

  return place;
}
