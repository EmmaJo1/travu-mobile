export type PlaceSource = 'google' | 'manual';

export type PlaceSearchResult = {
  provider: 'google';
  placeId: string;
  displayName: string;
  secondaryText?: string;
};

export type SelectedGooglePlace = {
  provider: 'google';
  googlePlaceId: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
  cityName?: string;
  countryName?: string;
  countryCode?: string;
};

export interface SelectedPlace {
  source: PlaceSource;
  googlePlaceId?: string;
  googleDisplayName?: string;
  placeName: string;
  formattedAddress?: string;
  cityName?: string;
  countryName?: string;
  countryCode?: string;
  latitude?: number;
  longitude?: number;
}

export interface PlaceSearchSuggestion extends SelectedPlace {
  searchKeywords?: string[];
}
