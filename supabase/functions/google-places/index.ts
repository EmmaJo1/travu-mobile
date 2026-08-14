// @ts-ignore Deno resolves npm specifiers in the Edge Function runtime.
import { createClient } from 'npm:@supabase/supabase-js@2.110.0';

declare const Deno: {
  env: { get: (name: string) => string | undefined };
  serve: (handler: (request: Request) => Response | Promise<Response>) => void;
};

const RESPONSE_HEADERS = {
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};
const AUTOCOMPLETE_FIELD_MASK = [
  'suggestions.placePrediction.placeId',
  'suggestions.placePrediction.structuredFormat.mainText.text',
  'suggestions.placePrediction.structuredFormat.secondaryText.text',
  'suggestions.placePrediction.types',
].join(',');
const GEOCODE_FIELD_MASK = [
  'placeId',
  'formattedAddress',
  'location',
  'postalAddress.locality',
  'postalAddress.regionCode',
  'addressComponents.longText',
  'addressComponents.shortText',
  'addressComponents.types',
].join(',');
const REQUEST_TIMEOUT_MS = 8000;
const DEFAULT_APP_LANGUAGE_CODE = 'ko';
const LANGUAGE_CODE_PATTERN = /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/;

type RequestBody = {
  operation?: unknown;
  query?: unknown;
  placeId?: unknown;
  languageCode?: unknown;
  locationBias?: unknown;
};

type AddressComponent = {
  longText?: string;
  shortText?: string;
  types?: string[];
};

class GooglePlacesError extends Error {
  constructor(readonly code: string, readonly status: number) {
    super(code);
  }
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { headers: RESPONSE_HEADERS, status });
}

function requireEnvironmentVariable(name: string) {
  const value = Deno.env.get(name)?.trim();
  if (!value) {
    throw new GooglePlacesError('SERVER_CONFIGURATION_ERROR', 500);
  }
  return value;
}

function getBearerToken(request: Request) {
  const authorization = request.headers.get('Authorization')?.trim();
  if (!authorization?.startsWith('Bearer ')) {
    throw new GooglePlacesError('UNAUTHORIZED', 401);
  }
  return authorization.slice('Bearer '.length).trim();
}

async function verifyUser(request: Request) {
  const token = getBearerToken(request);
  const supabaseUrl = requireEnvironmentVariable('SUPABASE_URL');
  const anonKey = requireEnvironmentVariable('SUPABASE_ANON_KEY');
  const client = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await client.auth.getUser(token);

  if (error || !data.user) {
    throw new GooglePlacesError('UNAUTHORIZED', 401);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalizeGoogleTypes(value: unknown) {
  if (!Array.isArray(value)) return [];

  return [...new Set(value.flatMap((type) => {
    if (typeof type !== 'string') return [];
    const normalized = type.trim();
    return normalized ? [normalized] : [];
  }))];
}

function getLocationBias(value: unknown) {
  if (!isRecord(value)) {
    return undefined;
  }
  const latitude = value.latitude;
  const longitude = value.longitude;
  if (
    typeof latitude !== 'number' || !Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
    typeof longitude !== 'number' || !Number.isFinite(longitude) || longitude < -180 || longitude > 180
  ) {
    return undefined;
  }
  return { circle: { center: { latitude, longitude }, radius: 50000 } };
}

function getLanguageCode(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return DEFAULT_APP_LANGUAGE_CODE;
  }
  if (typeof value !== 'string') {
    throw new GooglePlacesError('INVALID_REQUEST', 400);
  }

  const languageCode = value.trim();
  if (!languageCode || languageCode.length > 35 || !LANGUAGE_CODE_PATTERN.test(languageCode)) {
    throw new GooglePlacesError('INVALID_REQUEST', 400);
  }
  return languageCode;
}

async function googleFetch(url: string, init: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    if (!response.ok) {
      if (response.status === 429) {
        throw new GooglePlacesError('QUOTA_EXCEEDED', 429);
      }
      if (response.status === 400) {
        throw new GooglePlacesError('INVALID_REQUEST', 400);
      }
      if (response.status === 401 || response.status === 403) {
        throw new GooglePlacesError('GOOGLE_AUTH_ERROR', 502);
      }
      if (response.status >= 500) {
        throw new GooglePlacesError('GOOGLE_UNAVAILABLE', 503);
      }
      throw new GooglePlacesError('GOOGLE_ERROR', 502);
    }
    return await response.json() as unknown;
  } catch (error) {
    if (error instanceof GooglePlacesError) {
      throw error;
    }
    throw new GooglePlacesError('NETWORK_ERROR', 503);
  } finally {
    clearTimeout(timeout);
  }
}

async function autocomplete(body: RequestBody, apiKey: string) {
  const query = typeof body.query === 'string' ? body.query.trim() : '';
  if (query.length < 2) {
    throw new GooglePlacesError('INVALID_REQUEST', 400);
  }

  const languageCode = getLanguageCode(body.languageCode);
  const locationBias = getLocationBias(body.locationBias);
  const response = await googleFetch('https://places.googleapis.com/v1/places:autocomplete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': AUTOCOMPLETE_FIELD_MASK,
    },
    body: JSON.stringify({
      input: query,
      includeQueryPredictions: false,
      languageCode,
      ...(locationBias ? { locationBias } : {}),
    }),
  });

  const suggestions = isRecord(response) && Array.isArray(response.suggestions)
    ? response.suggestions
    : [];
  const results = suggestions.slice(0, 5).flatMap((suggestion) => {
    if (!isRecord(suggestion) || !isRecord(suggestion.placePrediction)) {
      return [];
    }
    const prediction = suggestion.placePrediction;
    const format = isRecord(prediction.structuredFormat) ? prediction.structuredFormat : {};
    const main = isRecord(format.mainText) ? format.mainText.text : undefined;
    const secondary = isRecord(format.secondaryText) ? format.secondaryText.text : undefined;
    const types = normalizeGoogleTypes(prediction.types);
    return typeof prediction.placeId === 'string' && typeof main === 'string'
      ? [{
        placeId: prediction.placeId,
        mainText: main,
        types,
        ...(typeof secondary === 'string' ? { secondaryText: secondary } : {}),
      }]
      : [];
  });

  return { results };
}

function findComponent(components: AddressComponent[], types: string[]) {
  return components.find((component) => component.types?.some((type) => types.includes(type)));
}

async function geocodePlace(body: RequestBody, apiKey: string) {
  const placeId = typeof body.placeId === 'string' ? body.placeId.trim() : '';
  if (!placeId || placeId.length > 255) {
    throw new GooglePlacesError('INVALID_REQUEST', 400);
  }

  const languageCode = getLanguageCode(body.languageCode);
  const response = await googleFetch(
    `https://geocode.googleapis.com/v4/geocode/places/${encodeURIComponent(placeId)}?languageCode=${encodeURIComponent(languageCode)}`,
    { headers: { 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': GEOCODE_FIELD_MASK } },
  );
  const result = isRecord(response) ? response : null;
  if (!result || !isRecord(result.location)) {
    throw new GooglePlacesError('EMPTY_GEOCODE', 404);
  }

  const components = Array.isArray(result.addressComponents)
    ? result.addressComponents.filter(isRecord) as AddressComponent[]
    : [];
  const postalAddress = isRecord(result.postalAddress) ? result.postalAddress : {};
  const city = findComponent(components, ['locality', 'postal_town', 'administrative_area_level_2']);
  const country = findComponent(components, ['country']);
  const googlePlaceId = typeof result.placeId === 'string' ? result.placeId : placeId;
  const formattedAddress = typeof result.formattedAddress === 'string' ? result.formattedAddress : '';
  const latitude = result.location.latitude;
  const longitude = result.location.longitude;

  if (!formattedAddress || typeof latitude !== 'number' || typeof longitude !== 'number') {
    throw new GooglePlacesError('EMPTY_GEOCODE', 404);
  }

  return {
    place: {
      googlePlaceId,
      formattedAddress,
      latitude,
      longitude,
      cityName: city?.longText ?? (typeof postalAddress.locality === 'string' ? postalAddress.locality : undefined),
      countryName: country?.longText,
      countryCode: country?.shortText ?? (typeof postalAddress.regionCode === 'string' ? postalAddress.regionCode : undefined),
    },
  };
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: RESPONSE_HEADERS, status: 204 });
  }
  if (request.method !== 'POST') {
    return jsonResponse({ code: 'METHOD_NOT_ALLOWED' }, 405);
  }

  try {
    await verifyUser(request);
    const apiKey = requireEnvironmentVariable('GOOGLE_MAPS_PLATFORM_SERVER_KEY');
    let body: RequestBody;
    try {
      body = await request.json() as RequestBody;
    } catch {
      throw new GooglePlacesError('INVALID_REQUEST', 400);
    }

    if (body.operation === 'autocomplete') {
      return jsonResponse(await autocomplete(body, apiKey));
    }
    if (body.operation === 'geocode_place') {
      return jsonResponse(await geocodePlace(body, apiKey));
    }
    throw new GooglePlacesError('INVALID_OPERATION', 400);
  } catch (error) {
    const normalized = error instanceof GooglePlacesError
      ? error
      : new GooglePlacesError('INTERNAL_ERROR', 500);
    console.error('[google-places] request failed', { code: normalized.code });
    return jsonResponse({ code: normalized.code }, normalized.status);
  }
});
