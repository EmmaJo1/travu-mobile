export type DestinationType = 'city' | 'country';

export type DestinationContinent =
  | 'asia'
  | 'europe'
  | 'north-america'
  | 'south-america'
  | 'oceania'
  | 'africa';

export interface MockDestination {
  id: string;
  type: DestinationType;
  city: string;
  country: string;
  countryCode: string;
  continent: DestinationContinent;
  displayName: string;
  searchKeywords: string[];
}

export interface DestinationContinentFilter {
  id: 'all' | DestinationContinent;
  label: string;
}

export const DESTINATION_CONTINENT_FILTERS: DestinationContinentFilter[] = [
  { id: 'all', label: '전체' },
  { id: 'asia', label: '아시아' },
  { id: 'europe', label: '유럽' },
  { id: 'north-america', label: '북미' },
  { id: 'south-america', label: '남미' },
  { id: 'oceania', label: '오세아니아' },
  { id: 'africa', label: '아프리카' },
];

export const MOCK_DESTINATIONS: MockDestination[] = [
  {
    id: 'paris-fr',
    type: 'city',
    city: 'Paris',
    country: 'France',
    countryCode: 'FR',
    continent: 'europe',
    displayName: 'Paris, France',
    searchKeywords: ['파리', '프랑스', 'paris', 'france'],
  },
  {
    id: 'tokyo-jp',
    type: 'city',
    city: 'Tokyo',
    country: 'Japan',
    countryCode: 'JP',
    continent: 'asia',
    displayName: 'Tokyo, Japan',
    searchKeywords: ['도쿄', '일본', 'tokyo', 'japan'],
  },
  {
    id: 'seoul-kr',
    type: 'city',
    city: 'Seoul',
    country: 'Korea',
    countryCode: 'KR',
    continent: 'asia',
    displayName: 'Seoul, Korea',
    searchKeywords: ['서울', '한국', '대한민국', 'seoul', 'korea'],
  },
  {
    id: 'rome-it',
    type: 'city',
    city: 'Rome',
    country: 'Italy',
    countryCode: 'IT',
    continent: 'europe',
    displayName: 'Rome, Italy',
    searchKeywords: ['로마', '이탈리아', 'rome', 'italy'],
  },
  {
    id: 'lyon-fr',
    type: 'city',
    city: 'Lyon',
    country: 'France',
    countryCode: 'FR',
    continent: 'europe',
    displayName: 'Lyon, France',
    searchKeywords: ['리옹', '프랑스', 'lyon', 'france'],
  },
  {
    id: 'nice-fr',
    type: 'city',
    city: 'Nice',
    country: 'France',
    countryCode: 'FR',
    continent: 'europe',
    displayName: 'Nice, France',
    searchKeywords: ['니스', '프랑스', 'nice', 'france'],
  },
  {
    id: 'kyoto-jp',
    type: 'city',
    city: 'Kyoto',
    country: 'Japan',
    countryCode: 'JP',
    continent: 'asia',
    displayName: 'Kyoto, Japan',
    searchKeywords: ['교토', '일본', 'kyoto', 'japan'],
  },
  {
    id: 'osaka-jp',
    type: 'city',
    city: 'Osaka',
    country: 'Japan',
    countryCode: 'JP',
    continent: 'asia',
    displayName: 'Osaka, Japan',
    searchKeywords: ['오사카', '일본', 'osaka', 'japan'],
  },
  {
    id: 'busan-kr',
    type: 'city',
    city: 'Busan',
    country: 'Korea',
    countryCode: 'KR',
    continent: 'asia',
    displayName: 'Busan, Korea',
    searchKeywords: ['부산', '한국', '대한민국', 'busan', 'korea'],
  },
  {
    id: 'jeju-kr',
    type: 'city',
    city: 'Jeju',
    country: 'Korea',
    countryCode: 'KR',
    continent: 'asia',
    displayName: 'Jeju, Korea',
    searchKeywords: ['제주', '제주도', '한국', 'jeju', 'korea'],
  },
  {
    id: 'florence-it',
    type: 'city',
    city: 'Florence',
    country: 'Italy',
    countryCode: 'IT',
    continent: 'europe',
    displayName: 'Florence, Italy',
    searchKeywords: ['피렌체', '이탈리아', 'florence', 'italy'],
  },
  {
    id: 'venice-it',
    type: 'city',
    city: 'Venice',
    country: 'Italy',
    countryCode: 'IT',
    continent: 'europe',
    displayName: 'Venice, Italy',
    searchKeywords: ['베니스', '베네치아', '이탈리아', 'venice', 'italy'],
  },
  {
    id: 'sydney-au',
    type: 'city',
    city: 'Sydney',
    country: 'Australia',
    countryCode: 'AU',
    continent: 'oceania',
    displayName: 'Sydney, Australia',
    searchKeywords: ['시드니', '호주', 'sydney', 'australia'],
  },
  {
    id: 'new-york-us',
    type: 'city',
    city: 'New York',
    country: 'United States',
    countryCode: 'US',
    continent: 'north-america',
    displayName: 'New York, United States',
    searchKeywords: ['뉴욕', '미국', 'new york', 'united states', 'usa'],
  },
  {
    id: 'rio-br',
    type: 'city',
    city: 'Rio de Janeiro',
    country: 'Brazil',
    countryCode: 'BR',
    continent: 'south-america',
    displayName: 'Rio de Janeiro, Brazil',
    searchKeywords: ['리우데자네이루', '브라질', 'rio', 'brazil'],
  },
  {
    id: 'cape-town-za',
    type: 'city',
    city: 'Cape Town',
    country: 'South Africa',
    countryCode: 'ZA',
    continent: 'africa',
    displayName: 'Cape Town, South Africa',
    searchKeywords: ['케이프타운', '남아프리카공화국', 'cape town', 'south africa'],
  },
  {
    id: 'portugal',
    type: 'country',
    city: 'Portugal',
    country: 'Portugal',
    countryCode: 'PT',
    continent: 'europe',
    displayName: 'Portugal',
    searchKeywords: ['포르투갈', 'portugal'],
  },
  {
    id: 'france',
    type: 'country',
    city: 'France',
    country: 'France',
    countryCode: 'FR',
    continent: 'europe',
    displayName: 'France',
    searchKeywords: ['프랑스', 'france'],
  },
  {
    id: 'italy',
    type: 'country',
    city: 'Italy',
    country: 'Italy',
    countryCode: 'IT',
    continent: 'europe',
    displayName: 'Italy',
    searchKeywords: ['이탈리아', 'italy'],
  },
];

export const RECENT_DESTINATIONS = ['sydney-au', 'kyoto-jp', 'paris-fr']
  .map((id) => MOCK_DESTINATIONS.find((destination) => destination.id === id))
  .filter((destination): destination is MockDestination => Boolean(destination));

export function formatDestinationLabel(destination: MockDestination): string {
  return destination.displayName;
}

export function searchDestinations(query: string): MockDestination[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return MOCK_DESTINATIONS;

  return MOCK_DESTINATIONS.filter((destination) =>
    [
      destination.city,
      destination.country,
      destination.displayName,
      ...destination.searchKeywords,
    ].some((keyword) => keyword.toLowerCase().includes(normalized)),
  );
}
