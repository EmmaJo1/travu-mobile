import countries from 'i18n-iso-countries';
import enLocale from 'i18n-iso-countries/langs/en.json';

export type CountryCodeSource =
  | 'country_code'
  | 'countryCode'
  | 'country_name'
  | 'country'
  | 'metadata'
  | 'unknown';

countries.registerLocale(enLocale);

const NON_OFFICIAL_FLAG_CODES = new Set(['XK']);
const ISO_ALPHA2_CODES = Object.keys(countries.getAlpha2Codes())
  .filter((code) => !NON_OFFICIAL_FLAG_CODES.has(code))
  .sort();
const SUPPORTED_COUNTRY_CODES = new Set([
  ...ISO_ALPHA2_CODES,
  ...NON_OFFICIAL_FLAG_CODES,
]);

const COUNTRY_NAME_ALIASES: Record<string, string> = {
  britain: 'GB',
  czechia: 'CZ',
  'czech republic': 'CZ',
  'hong kong': 'HK',
  korea: 'KR',
  russia: 'RU',
  'russian federation': 'RU',
  taiwan: 'TW',
  turkey: 'TR',
  turkiye: 'TR',
  türkiye: 'TR',
  uk: 'GB',
  'u.k.': 'GB',
  'united states': 'US',
  'united states of america': 'US',
  us: 'US',
  'u.s.': 'US',
  usa: 'US',
  'viet nam': 'VN',
  vietnam: 'VN',
  '대만': 'TW',
  '대한민국': 'KR',
  '러시아': 'RU',
  '미국': 'US',
  '베트남': 'VN',
  '영국': 'GB',
  '체코': 'CZ',
  '터키': 'TR',
  '튀르키예': 'TR',
  '한국': 'KR',
  '홍콩': 'HK',
};

function normalizeCountryName(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

const COUNTRY_ACCESSIBILITY_NAME_ALIASES: Record<string, string> = {
  AU: '호주',
  BR: '브라질',
  CN: '중국',
  FR: '프랑스',
  GB: '영국',
  IT: '이탈리아',
  JP: '일본',
  KR: '대한민국',
  US: '미국',
};

export function getOfficialIsoCountryCodes() {
  return ISO_ALPHA2_CODES;
}

export function getSupportedCountryCodes() {
  return [...SUPPORTED_COUNTRY_CODES].sort();
}

export function isOfficialIsoCountryCode(value?: string | null) {
  const trimmed = value?.trim().toUpperCase();
  return Boolean(trimmed && ISO_ALPHA2_CODES.includes(trimmed));
}

export function isSupportedCountryCode(value?: string | null) {
  const trimmed = value?.trim().toUpperCase();
  return Boolean(trimmed && SUPPORTED_COUNTRY_CODES.has(trimmed));
}

export function normalizeCountryCode(value?: string | null) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  const upper = trimmed.toUpperCase();

  if (!/^[A-Z]{2}$/.test(upper)) {
    return null;
  }

  return isSupportedCountryCode(upper) ? upper : null;
}

export function resolveCountryNameToCode(value?: string | null) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  const code = normalizeCountryCode(trimmed);

  if (code) {
    return code;
  }

  const candidates = [
    trimmed,
    ...trimmed.split(',').map((part) => part.trim()).reverse(),
  ];

  for (const candidate of candidates) {
    const normalized = normalizeCountryName(candidate);
    const aliasCode = COUNTRY_NAME_ALIASES[normalized];

    if (aliasCode) {
      return aliasCode;
    }

    const englishCode = countries.getAlpha2Code(candidate, 'en');

    if (englishCode && normalizeCountryCode(englishCode)) {
      return englishCode;
    }

  }

  return null;
}

export function getCountryAccessibilityName(countryCode?: string | null) {
  const code = normalizeCountryCode(countryCode);

  if (!code) {
    return null;
  }

  return COUNTRY_ACCESSIBILITY_NAME_ALIASES[code] ?? countries.getName(code, 'en') ?? code;
}

export function resolveCountryCodeFromPlace(input: {
  country?: string | null;
  countryCode?: string | null;
  countryName?: string | null;
  country_code?: string | null;
  metadataCountryCode?: string | null;
}): { countryCode: string | null; source: CountryCodeSource } {
  const explicitCode =
    normalizeCountryCode(input.countryCode) ??
    normalizeCountryCode(input.country_code);

  if (explicitCode) {
    return {
      countryCode: explicitCode,
      source: input.countryCode ? 'countryCode' : 'country_code',
    };
  }

  const metadataCode = normalizeCountryCode(input.metadataCountryCode);

  if (metadataCode) {
    return {
      countryCode: metadataCode,
      source: 'metadata',
    };
  }

  const countryNameCode = resolveCountryNameToCode(input.countryName);

  if (countryNameCode) {
    return {
      countryCode: countryNameCode,
      source: 'country_name',
    };
  }

  const countryCode = resolveCountryNameToCode(input.country);

  return {
    countryCode,
    source: countryCode ? 'country' : 'unknown',
  };
}
