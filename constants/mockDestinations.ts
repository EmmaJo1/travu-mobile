export interface MockDestination {
  id: string;
  city: string;
  country: string;
  countryCode: string;
}

export const MOCK_DESTINATIONS: MockDestination[] = [
  { id: 'paris-fr', city: 'Paris', country: 'France', countryCode: 'FR' },
  { id: 'tokyo-jp', city: 'Tokyo', country: 'Japan', countryCode: 'JP' },
  { id: 'seoul-kr', city: 'Seoul', country: 'Korea', countryCode: 'KR' },
  { id: 'rome-it', city: 'Rome', country: 'Italy', countryCode: 'IT' },
  { id: 'lyon-fr', city: 'Lyon', country: 'France', countryCode: 'FR' },
  { id: 'nice-fr', city: 'Nice', country: 'France', countryCode: 'FR' },
  { id: 'kyoto-jp', city: 'Kyoto', country: 'Japan', countryCode: 'JP' },
  { id: 'osaka-jp', city: 'Osaka', country: 'Japan', countryCode: 'JP' },
  { id: 'busan-kr', city: 'Busan', country: 'Korea', countryCode: 'KR' },
  { id: 'jeju-kr', city: 'Jeju', country: 'Korea', countryCode: 'KR' },
  { id: 'florence-it', city: 'Florence', country: 'Italy', countryCode: 'IT' },
  { id: 'venice-it', city: 'Venice', country: 'Italy', countryCode: 'IT' },
];

export const RECOMMENDED_DESTINATIONS = MOCK_DESTINATIONS.filter((d) =>
  ['Paris', 'Tokyo', 'Seoul', 'Rome'].includes(d.city),
);

export const DESTINATION_COUNTRIES = ['France', 'Japan', 'Korea', 'Italy'] as const;

export function getCitiesByCountry(country: string): MockDestination[] {
  return MOCK_DESTINATIONS.filter((d) => d.country === country);
}

export function formatDestinationLabel(destination: MockDestination): string {
  return `${destination.city}, ${destination.country}`;
}

export function searchDestinations(query: string): MockDestination[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return RECOMMENDED_DESTINATIONS;

  return MOCK_DESTINATIONS.filter(
    (d) =>
      d.city.toLowerCase().includes(normalized) ||
      d.country.toLowerCase().includes(normalized),
  );
}
