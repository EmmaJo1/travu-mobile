import { getAppContentLanguageCode } from './appLanguage';

type SupportedDisplayLanguage = 'en' | 'ko';

type LocalizedLabels = Partial<Record<SupportedDisplayLanguage, string>>;

type CityLocalization = {
  aliases: string[];
  countryCode: string;
  labels: LocalizedLabels;
};

const COUNTRY_CODE_ALIASES: Record<string, string> = {
  australia: 'AU',
  '오스트레일리아': 'AU',
  '호주': 'AU',
  china: 'CN',
  '중국': 'CN',
  france: 'FR',
  '프랑스': 'FR',
  germany: 'DE',
  '독일': 'DE',
  hongkong: 'HK',
  'hong kong': 'HK',
  '홍콩': 'HK',
  italy: 'IT',
  '이탈리아': 'IT',
  japan: 'JP',
  '日本': 'JP',
  '일본': 'JP',
  korea: 'KR',
  'south korea': 'KR',
  'republic of korea': 'KR',
  '대한민국': 'KR',
  '한국': 'KR',
  singapore: 'SG',
  '싱가포르': 'SG',
  spain: 'ES',
  '스페인': 'ES',
  taiwan: 'TW',
  '대만': 'TW',
  thailand: 'TH',
  '태국': 'TH',
  'united kingdom': 'GB',
  uk: 'GB',
  '영국': 'GB',
  'united states': 'US',
  usa: 'US',
  '미국': 'US',
  vietnam: 'VN',
  'viet nam': 'VN',
  '베트남': 'VN',
};

const COUNTRY_LABELS: Record<string, LocalizedLabels> = {
  AU: { en: 'Australia', ko: '호주' },
  CN: { en: 'China', ko: '중국' },
  DE: { en: 'Germany', ko: '독일' },
  ES: { en: 'Spain', ko: '스페인' },
  FR: { en: 'France', ko: '프랑스' },
  GB: { en: 'United Kingdom', ko: '영국' },
  HK: { en: 'Hong Kong', ko: '홍콩' },
  IT: { en: 'Italy', ko: '이탈리아' },
  JP: { en: 'Japan', ko: '일본' },
  KR: { en: 'South Korea', ko: '대한민국' },
  SG: { en: 'Singapore', ko: '싱가포르' },
  TH: { en: 'Thailand', ko: '태국' },
  TW: { en: 'Taiwan', ko: '대만' },
  US: { en: 'United States', ko: '미국' },
  VN: { en: 'Vietnam', ko: '베트남' },
};

const CITY_LOCALIZATIONS: CityLocalization[] = [
  { countryCode: 'JP', aliases: ['osaka', 'osaka city', '大阪', '大阪市', '오사카', '오사카시'], labels: { en: 'Osaka', ko: '오사카' } },
  { countryCode: 'JP', aliases: ['kyoto', 'kyoto city', '京都', '京都市', '교토', '교토시'], labels: { en: 'Kyoto', ko: '교토' } },
  { countryCode: 'JP', aliases: ['tokyo', '東京都', '東京', '도쿄'], labels: { en: 'Tokyo', ko: '도쿄' } },
  { countryCode: 'JP', aliases: ['fukuoka', 'fukuoka city', '福岡', '福岡市', '후쿠오카', '후쿠오카시'], labels: { en: 'Fukuoka', ko: '후쿠오카' } },
  { countryCode: 'JP', aliases: ['sapporo', 'sapporo city', '札幌', '札幌市', '삿포로', '삿포로시'], labels: { en: 'Sapporo', ko: '삿포로' } },
  { countryCode: 'JP', aliases: ['okinawa', '沖縄', '오키나와'], labels: { en: 'Okinawa', ko: '오키나와' } },
  { countryCode: 'FR', aliases: ['paris', '파리'], labels: { en: 'Paris', ko: '파리' } },
  { countryCode: 'AU', aliases: ['sydney', '시드니'], labels: { en: 'Sydney', ko: '시드니' } },
  { countryCode: 'KR', aliases: ['seoul', '서울', '서울특별시'], labels: { en: 'Seoul', ko: '서울' } },
  { countryCode: 'KR', aliases: ['busan', '부산', '부산광역시'], labels: { en: 'Busan', ko: '부산' } },
  { countryCode: 'KR', aliases: ['jeju', 'jeju city', '제주', '제주시'], labels: { en: 'Jeju', ko: '제주' } },
  { countryCode: 'HK', aliases: ['hong kong', 'hongkong', '홍콩'], labels: { en: 'Hong Kong', ko: '홍콩' } },
  { countryCode: 'TW', aliases: ['taipei', '타이베이'], labels: { en: 'Taipei', ko: '타이베이' } },
  { countryCode: 'SG', aliases: ['singapore', '싱가포르'], labels: { en: 'Singapore', ko: '싱가포르' } },
  { countryCode: 'TH', aliases: ['bangkok', '방콕'], labels: { en: 'Bangkok', ko: '방콕' } },
  { countryCode: 'VN', aliases: ['da nang', 'danang', '다낭'], labels: { en: 'Da Nang', ko: '다낭' } },
];

function normalize(value?: string | null) {
  return value?.trim().replace(/\s+/g, ' ').toLowerCase() ?? '';
}

function getSupportedDisplayLanguage(languageCode: string): SupportedDisplayLanguage | null {
  const baseLanguage = languageCode.trim().toLowerCase().split('-')[0];
  return baseLanguage === 'ko' || baseLanguage === 'en' ? baseLanguage : null;
}

function resolveCountryCode(country?: string | null, explicitCountryCode?: string | null) {
  const normalizedExplicitCode = explicitCountryCode?.trim().toUpperCase();
  if (normalizedExplicitCode && /^[A-Z]{2}$/.test(normalizedExplicitCode)) {
    return normalizedExplicitCode;
  }

  return COUNTRY_CODE_ALIASES[normalize(country)] ?? null;
}

function resolveCityLabel(city: string, countryCode: string | null, language: SupportedDisplayLanguage) {
  const normalizedCity = normalize(city);
  if (!normalizedCity) {
    return city;
  }

  const match = CITY_LOCALIZATIONS.find((entry) =>
    (!countryCode || entry.countryCode === countryCode) &&
    entry.aliases.some((alias) => normalize(alias) === normalizedCity),
  );

  return match?.labels[language] ?? city;
}

export function localizeSavedPlaceGeography(
  input: {
    city?: string | null;
    country?: string | null;
    countryCode?: string | null;
  },
  languageCode = getAppContentLanguageCode(),
) {
  const rawCity = input.city?.trim() ?? '';
  const rawCountry = input.country?.trim() ?? '';
  const countryCode = resolveCountryCode(rawCountry, input.countryCode);
  const supportedLanguage = getSupportedDisplayLanguage(languageCode);

  if (!supportedLanguage) {
    return {
      cityName: rawCity || undefined,
      countryCode: countryCode ?? undefined,
      countryName: rawCountry || undefined,
    };
  }

  const localizedCountry = countryCode
    ? COUNTRY_LABELS[countryCode]?.[supportedLanguage] ?? rawCountry
    : rawCountry;

  return {
    cityName: rawCity ? resolveCityLabel(rawCity, countryCode, supportedLanguage) : undefined,
    countryCode: countryCode ?? undefined,
    countryName: localizedCountry || undefined,
  };
}
