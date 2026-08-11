import type { ImageSourcePropType } from 'react-native';

export type DestinationHeroContext = 'active-trip' | 'daily-home';

type HeroDestination = {
  country?: string | null;
  countryName?: string | null;
  displayName?: string | null;
  englishCountryName?: string | null;
  englishDisplayName?: string | null;
  id?: string | null;
  name?: string | null;
};

export type ResolveDestinationHeroInput = {
  context: DestinationHeroContext;
  countryCode?: string | null;
  countryName?: string | null;
  destination?: HeroDestination | null;
  regionName?: string | null;
};

type DestinationHeroRegion = {
  aliases: readonly string[];
  countryCodes?: readonly string[];
  countryKey?: string;
  images: readonly ImageSourcePropType[];
  key: string;
  scope: 'city' | 'country';
};

const KOREA_HERO_IMAGES = [
  require('../assets/images/destinations/korea/korea-hero-01.jpg') as ImageSourcePropType,
  require('../assets/images/destinations/korea/korea-hero-02.jpg') as ImageSourcePropType,
  require('../assets/images/destinations/korea/korea-hero-03.jpg') as ImageSourcePropType,
  require('../assets/images/destinations/korea/korea-hero-04.jpg') as ImageSourcePropType,
  require('../assets/images/destinations/korea/korea-hero-05.jpg') as ImageSourcePropType,
  require('../assets/images/destinations/korea/korea-hero-06.jpg') as ImageSourcePropType,
  require('../assets/images/destinations/korea/korea-hero-07.jpg') as ImageSourcePropType,
] as const;

const NEUTRAL_TRAVEL_HERO =
  require('../assets/images/onboarding-first-flight.jpg') as ImageSourcePropType;

// Add a city entry only when a dedicated city asset pool exists.
const DESTINATION_HERO_REGIONS: readonly DestinationHeroRegion[] = [
  {
    key: 'korea',
    scope: 'country',
    aliases: [
      '대한민국',
      '한국',
      'korea',
      'south korea',
      'republic of korea',
      'korea, republic of',
    ],
    countryCodes: ['KR', 'KOR'],
    images: KOREA_HERO_IMAGES,
  },
];

const sessionHeroByContextAndRegion = new Map<string, ImageSourcePropType>();

function normalizeAlias(value?: string | null) {
  return value?.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase() ?? '';
}

function normalizeCountryCode(value?: string | null) {
  return value?.trim().toUpperCase() ?? '';
}

function getCountryCodeFromDestinationId(destinationId?: string | null) {
  const tokens = destinationId?.trim().toUpperCase().split(/[-_:|]/u) ?? [];

  return tokens.find((token) => token.length === 2 || token.length === 3) ?? '';
}

function matchesAlias(region: DestinationHeroRegion, values: (string | null | undefined)[]) {
  const aliases = new Set(region.aliases.map(normalizeAlias));
  return values.some((value) => aliases.has(normalizeAlias(value)));
}

function resolveCountryRegion(input: ResolveDestinationHeroInput) {
  const countryCode =
    normalizeCountryCode(input.countryCode) ||
    getCountryCodeFromDestinationId(input.destination?.id);
  const countryNames = [
    input.countryName,
    input.destination?.englishCountryName,
    input.destination?.country,
    input.destination?.countryName,
  ];

  return DESTINATION_HERO_REGIONS.find((region) => {
    if (region.scope !== 'country') {
      return false;
    }

    if (countryCode) {
      return region.countryCodes?.includes(countryCode) ?? false;
    }

    return matchesAlias(region, countryNames);
  });
}

function resolveCityRegion(
  input: ResolveDestinationHeroInput,
  countryRegion?: DestinationHeroRegion,
) {
  const regionNames = [
    input.regionName,
    input.destination?.displayName,
    input.destination?.englishDisplayName,
    input.destination?.name,
  ];

  return DESTINATION_HERO_REGIONS.find((region) => {
    if (region.scope !== 'city' || !matchesAlias(region, regionNames)) {
      return false;
    }

    return !region.countryKey || region.countryKey === countryRegion?.key;
  });
}

function selectRandomHero(images: readonly ImageSourcePropType[]) {
  return images[Math.floor(Math.random() * images.length)];
}

export function resolveDestinationHero(input: ResolveDestinationHeroInput): ImageSourcePropType {
  const countryRegion = resolveCountryRegion(input);
  const region = resolveCityRegion(input, countryRegion) ?? countryRegion;
  const regionKey = region?.key ?? 'default';
  const cacheKey = `${input.context}:${regionKey}`;
  const cachedHero = sessionHeroByContextAndRegion.get(cacheKey);

  if (cachedHero) {
    return cachedHero;
  }

  const hero = region?.images.length
    ? selectRandomHero(region.images)
    : NEUTRAL_TRAVEL_HERO;

  sessionHeroByContextAndRegion.set(cacheKey, hero);
  return hero;
}
