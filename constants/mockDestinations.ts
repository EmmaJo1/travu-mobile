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
    id: 'melbourne-au',
    type: 'city',
    city: 'Melbourne',
    country: 'Australia',
    countryCode: 'AU',
    continent: 'oceania',
    displayName: 'Melbourne, Australia',
    searchKeywords: ['멜버른', '호주', 'melbourne', 'australia'],
  },
  {
    id: 'barcelona-es',
    type: 'city',
    city: 'Barcelona',
    country: 'Spain',
    countryCode: 'ES',
    continent: 'europe',
    displayName: 'Barcelona, Spain',
    searchKeywords: ['바르셀로나', '스페인', 'barcelona', 'spain'],
  },
  {
    id: 'madrid-es',
    type: 'city',
    city: 'Madrid',
    country: 'Spain',
    countryCode: 'ES',
    continent: 'europe',
    displayName: 'Madrid, Spain',
    searchKeywords: ['마드리드', '스페인', 'madrid', 'spain'],
  },
  {
    id: 'london-gb',
    type: 'city',
    city: 'London',
    country: 'United Kingdom',
    countryCode: 'GB',
    continent: 'europe',
    displayName: 'London, United Kingdom',
    searchKeywords: ['런던', '영국', 'london', 'united kingdom', 'uk'],
  },
  {
    id: 'lisbon-pt',
    type: 'city',
    city: 'Lisbon',
    country: 'Portugal',
    countryCode: 'PT',
    continent: 'europe',
    displayName: 'Lisbon, Portugal',
    searchKeywords: ['리스본', '포르투갈', 'lisbon', 'portugal'],
  },
  {
    id: 'fukuoka-jp',
    type: 'city',
    city: 'Fukuoka',
    country: 'Japan',
    countryCode: 'JP',
    continent: 'asia',
    displayName: 'Fukuoka, Japan',
    searchKeywords: ['후쿠오카', '일본', 'fukuoka', 'japan'],
  },
  {
    id: 'sapporo-jp',
    type: 'city',
    city: 'Sapporo',
    country: 'Japan',
    countryCode: 'JP',
    continent: 'asia',
    displayName: 'Sapporo, Japan',
    searchKeywords: ['삿포로', '일본', 'sapporo', 'japan'],
  },
  {
    id: 'bangkok-th',
    type: 'city',
    city: 'Bangkok',
    country: 'Thailand',
    countryCode: 'TH',
    continent: 'asia',
    displayName: 'Bangkok, Thailand',
    searchKeywords: ['방콕', '태국', 'bangkok', 'thailand'],
  },
  {
    id: 'singapore-sg',
    type: 'city',
    city: 'Singapore',
    country: 'Singapore',
    countryCode: 'SG',
    continent: 'asia',
    displayName: 'Singapore',
    searchKeywords: ['싱가포르', 'singapore'],
  },
  {
    id: 'taipei-tw',
    type: 'city',
    city: 'Taipei',
    country: 'Taiwan',
    countryCode: 'TW',
    continent: 'asia',
    displayName: 'Taipei, Taiwan',
    searchKeywords: ['타이베이', '대만', 'taipei', 'taiwan'],
  },
  {
    id: 'vancouver-ca',
    type: 'city',
    city: 'Vancouver',
    country: 'Canada',
    countryCode: 'CA',
    continent: 'north-america',
    displayName: 'Vancouver, Canada',
    searchKeywords: ['밴쿠버', '캐나다', 'vancouver', 'canada'],
  },
  {
    id: 'los-angeles-us',
    type: 'city',
    city: 'Los Angeles',
    country: 'United States',
    countryCode: 'US',
    continent: 'north-america',
    displayName: 'Los Angeles, United States',
    searchKeywords: ['로스앤젤레스', '미국', 'los angeles', 'united states', 'usa'],
  },
  {
    id: 'buenos-aires-ar',
    type: 'city',
    city: 'Buenos Aires',
    country: 'Argentina',
    countryCode: 'AR',
    continent: 'south-america',
    displayName: 'Buenos Aires, Argentina',
    searchKeywords: ['부에노스아이레스', '아르헨티나', 'buenos aires', 'argentina'],
  },
  {
    id: 'cairo-eg',
    type: 'city',
    city: 'Cairo',
    country: 'Egypt',
    countryCode: 'EG',
    continent: 'africa',
    displayName: 'Cairo, Egypt',
    searchKeywords: ['카이로', '이집트', 'cairo', 'egypt'],
  },
  {
    id: 'australia',
    type: 'country',
    city: 'Australia',
    country: 'Australia',
    countryCode: 'AU',
    continent: 'oceania',
    displayName: 'Australia',
    searchKeywords: ['호주', 'australia'],
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
  {
    id: 'japan',
    type: 'country',
    city: 'Japan',
    country: 'Japan',
    countryCode: 'JP',
    continent: 'asia',
    displayName: 'Japan',
    searchKeywords: ['일본', 'japan'],
  },
  {
    id: 'spain',
    type: 'country',
    city: 'Spain',
    country: 'Spain',
    countryCode: 'ES',
    continent: 'europe',
    displayName: 'Spain',
    searchKeywords: ['스페인', 'spain'],
  },
  {
    id: 'thailand',
    type: 'country',
    city: 'Thailand',
    country: 'Thailand',
    countryCode: 'TH',
    continent: 'asia',
    displayName: 'Thailand',
    searchKeywords: ['태국', 'thailand'],
  },
  {
    id: 'united-kingdom',
    type: 'country',
    city: 'United Kingdom',
    country: 'United Kingdom',
    countryCode: 'GB',
    continent: 'europe',
    displayName: 'United Kingdom',
    searchKeywords: ['영국', 'united kingdom', 'uk'],
  },
];

export function sortDestinations(destinations: MockDestination[]): MockDestination[] {
  return [...destinations].sort((left, right) => {
    const countryOrder = left.country.localeCompare(right.country, 'en', {
      sensitivity: 'base',
    });
    if (countryOrder !== 0) return countryOrder;

    if (left.type !== right.type) return left.type === 'country' ? -1 : 1;

    return left.city.localeCompare(right.city, 'en', { sensitivity: 'base' });
  });
}

export function formatDestinationLabel(destination: MockDestination): string {
  return destination.displayName;
}

export function searchDestinations(query: string): MockDestination[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return sortDestinations(MOCK_DESTINATIONS);

  return sortDestinations(
    MOCK_DESTINATIONS.filter((destination) =>
      [
        destination.city,
        destination.country,
        destination.displayName,
        ...destination.searchKeywords,
      ].some((keyword) => keyword.toLowerCase().includes(normalized)),
    ),
  );
}
