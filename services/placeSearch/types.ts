export type PlaceSource = 'mock' | 'manual';

export interface SelectedPlace {
  source: PlaceSource;
  googlePlaceId?: string;
  placeName: string;
  formattedAddress?: string;
  cityName?: string;
  countryName?: string;
  latitude?: number;
  longitude?: number;
}

export interface PlaceSearchSuggestion extends SelectedPlace {
  searchKeywords?: string[];
}
