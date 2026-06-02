import { MOCK_PLACE_SEARCH_RESULTS } from '@/constants/mockPlaceSearchResults';
import type { PlaceSearchProvider, PlaceSearchSuggestion } from '@/services/placeSearch/types';

const MAX_RESULTS = 5;

function normalize(value?: string): string {
  return value?.trim().toLocaleLowerCase() ?? '';
}

function getSearchValues(place: PlaceSearchSuggestion): string[] {
  return [
    place.placeName,
    place.formattedAddress,
    place.cityName,
    place.countryName,
    ...(place.searchKeywords ?? []),
  ].map(normalize);
}

export const mockPlaceSearchProvider: PlaceSearchProvider = {
  search(query) {
    const normalizedQuery = normalize(query);

    return MOCK_PLACE_SEARCH_RESULTS.filter((place) => {
      if (!normalizedQuery) {
        return true;
      }

      return getSearchValues(place).some((value) => value.includes(normalizedQuery));
    }).slice(0, MAX_RESULTS);
  },
};
