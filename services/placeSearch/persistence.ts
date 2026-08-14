import type { PlaceCreateInput } from '@/components/record/PlaceCreateModal';
import type { UpdatePlacePatch } from '@/services/supabase/places';
import type { PlaceSource } from '@/services/placeSearch/types';

type PlaceIdentity = {
  source?: PlaceSource;
  googlePlaceId?: string;
};

function normalizePlaceIdentity(value?: PlaceIdentity) {
  return value?.source === 'google' && value.googlePlaceId
    ? { source: 'google' as const, googlePlaceId: value.googlePlaceId }
    : { source: 'manual' as const, googlePlaceId: undefined };
}

export function hasPlaceIdentityChanged(initial?: PlaceIdentity, current?: PlaceIdentity) {
  const initialIdentity = normalizePlaceIdentity(initial);
  const currentIdentity = normalizePlaceIdentity(current);

  return initialIdentity.source !== currentIdentity.source
    || initialIdentity.googlePlaceId !== currentIdentity.googlePlaceId;
}

export function buildCreatePlaceIdentity(input: PlaceCreateInput) {
  const source = input.source === 'google' && input.googlePlaceId ? 'google' as const : 'manual' as const;
  return {
    address: source === 'google' ? input.formattedAddress ?? null : null,
    city: input.cityName ?? input.city ?? null,
    country: input.countryName ?? null,
    googlePlaceId: source === 'google' ? input.googlePlaceId ?? null : null,
    latitude: source === 'google' ? input.latitude ?? null : null,
    longitude: source === 'google' ? input.longitude ?? null : null,
    source,
  };
}

export function buildPlaceIdentityPatch(input: PlaceCreateInput): Pick<
  UpdatePlacePatch,
  'address' | 'city' | 'country' | 'google_place_id' | 'latitude' | 'longitude' | 'source'
> {
  if (input.source === 'google' && input.googlePlaceId) {
    return {
      address: input.formattedAddress ?? null,
      city: input.cityName ?? input.city ?? null,
      country: input.countryName ?? null,
      google_place_id: input.googlePlaceId,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      source: 'google',
    };
  }

  return {
    address: null,
    city: input.cityName ?? input.city ?? null,
    country: input.countryName ?? null,
    google_place_id: null,
    latitude: null,
    longitude: null,
    source: 'manual',
  };
}
