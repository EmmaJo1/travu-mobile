export type DestinationOptionType = 'city' | 'country';

export interface DestinationOption {
  id: string;
  displayName: string;
  countryName: string;
  type: DestinationOptionType;
}

export const MOCK_TRIP_DESTINATIONS: DestinationOption[] = [
  {
    id: 'city-paris-fr',
    displayName: 'Paris',
    countryName: 'France',
    type: 'city',
  },
  {
    id: 'country-france',
    displayName: 'France',
    countryName: 'France',
    type: 'country',
  },
  {
    id: 'city-kyoto-jp',
    displayName: 'Kyoto',
    countryName: 'Japan',
    type: 'city',
  },
  {
    id: 'country-japan',
    displayName: 'Japan',
    countryName: 'Japan',
    type: 'country',
  },
];

export function searchTripDestinations(query: string): DestinationOption[] {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return MOCK_TRIP_DESTINATIONS;
  }

  return MOCK_TRIP_DESTINATIONS.filter((option) => (
    option.displayName.toLowerCase().includes(normalizedQuery) ||
    option.countryName.toLowerCase().includes(normalizedQuery)
  ));
}
