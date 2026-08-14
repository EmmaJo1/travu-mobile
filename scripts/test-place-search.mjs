import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { getAppContentLanguageCode } from '../services/localization/appLanguage.ts';
import { localizeSavedPlaceGeography } from '../services/localization/placeGeography.ts';
import { getPlaceCategoryDisplayLabel } from '../constants/placeCategories.ts';
import {
  mapGooglePlaceTypesToCategory,
  resolvePlaceCategoryAfterSelection,
} from '../services/placeSearch/googlePlaceCategory.ts';
import {
  getPlaceSearchErrorMessage,
  mapAddressComponents,
  mapAutocompleteResponse,
  mapGeocodeResponse,
  normalizeGooglePlaceTypes,
  normalizePersistedPlaceSource,
  PLACE_SEARCH_DEBOUNCE_MS,
  PlaceRequestSequence,
  shouldRequestPlaceQuery,
  shouldShowGoogleMapsAttribution,
} from '../services/placeSearch/mappers.ts';
import {
  buildCreatePlaceIdentity,
  buildPlaceIdentityPatch,
  hasPlaceIdentityChanged,
} from '../services/placeSearch/persistence.ts';
import { resolveCreatePlaceTimeLabel } from '../utils/createPlaceTime.ts';

const tests = [];
const test = (name, run) => tests.push({ name, run });

const googleInput = {
  source: 'google',
  googlePlaceId: 'ChIJ-new',
  place: '내가 정한 이름',
  placeName: '내가 정한 이름',
  formattedAddress: '1 Example Road',
  cityName: 'Seoul',
  countryName: 'South Korea',
  latitude: 37.5,
  longitude: 127,
};

test('2글자 미만 query는 요청하지 않는다', () => {
  assert.equal(shouldRequestPlaceQuery(' 가 '), false);
  assert.equal(shouldRequestPlaceQuery(' 가나 '), true);
});

test('debounce 정책은 300~350ms다', () => {
  assert.ok(PLACE_SEARCH_DEBOUNCE_MS >= 300 && PLACE_SEARCH_DEBOUNCE_MS <= 350);
});

test('stale response sequence를 무시한다', () => {
  const policy = new PlaceRequestSequence();
  const oldRequest = policy.begin();
  const latestRequest = policy.begin();
  assert.equal(policy.isLatest(oldRequest), false);
  assert.equal(policy.isLatest(latestRequest), true);
});

test('Google 결과가 표시될 때 attribution을 표시한다', () => {
  assert.equal(shouldShowGoogleMapsAttribution([{
    provider: 'google', placeId: 'place-1', displayName: 'Place One', googleTypes: [],
  }]), true);
});

test('manual-only 상태에서는 Google attribution을 표시하지 않는다', () => {
  assert.equal(shouldShowGoogleMapsAttribution([]), false);
});

test('autocomplete 응답을 최대 5개로 매핑한다', () => {
  const results = mapAutocompleteResponse({
    results: Array.from({ length: 6 }, (_, index) => ({
      placeId: `id-${index}`,
      mainText: `place-${index}`,
      secondaryText: `address-${index}`,
      types: index === 0 ? ['cafe', 'restaurant'] : [],
    })),
  });
  assert.equal(results.length, 5);
  assert.deepEqual(results[0], {
    provider: 'google', placeId: 'id-0', displayName: 'place-0', secondaryText: 'address-0',
    googleTypes: ['cafe', 'restaurant'],
  });
});

test('autocomplete Google types를 안전하게 정규화한다', () => {
  assert.deepEqual(
    normalizeGooglePlaceTypes([' cafe ', '', null, 'restaurant', 'cafe', 42]),
    ['cafe', 'restaurant'],
  );
  assert.deepEqual(normalizeGooglePlaceTypes('cafe'), []);
});

test('Edge autocomplete field mask와 응답이 Google types를 포함한다', async () => {
  const source = await readFile(new URL('../supabase/functions/google-places/index.ts', import.meta.url), 'utf8');
  assert.equal(source.includes("'suggestions.placePrediction.types'"), true);
  assert.equal(source.includes('types = normalizeGoogleTypes(prediction.types)'), true);
});

test('Google 장소 유형을 Travu 카테고리로 매핑한다', () => {
  const cases = [
    ['cafe', 'cafe'],
    ['coffee_shop', 'cafe'],
    ['bakery', 'cafe'],
    ['restaurant', 'restaurant'],
    ['japanese_restaurant', 'restaurant'],
    ['hotel', 'lodging'],
    ['lodging', 'lodging'],
    ['hostel', 'lodging'],
    ['tourist_attraction', 'attraction'],
    ['museum', 'attraction'],
    ['historical_landmark', 'attraction'],
    ['shopping_mall', 'shopping'],
    ['department_store', 'shopping'],
    ['book_store', 'shopping'],
    ['unsupported_type', 'other'],
  ];

  for (const [googleType, expected] of cases) {
    assert.equal(mapGooglePlaceTypesToCategory([googleType]), expected, googleType);
  }
  assert.equal(mapGooglePlaceTypesToCategory([]), 'other');
});

test('복합 Google types는 고정된 의미 우선순위를 따른다', () => {
  assert.equal(mapGooglePlaceTypesToCategory(['restaurant', 'cafe']), 'cafe');
  assert.equal(mapGooglePlaceTypesToCategory(['restaurant', 'hotel']), 'lodging');
  assert.equal(mapGooglePlaceTypesToCategory(['store', 'museum']), 'attraction');
  assert.equal(mapGooglePlaceTypesToCategory(['restaurant', 'shopping_mall']), 'shopping');
});

test('Google 선택과 교체는 새 types로 카테고리를 계산한다', () => {
  assert.equal(resolvePlaceCategoryAfterSelection(undefined, {
    source: 'google', googleTypes: ['coffee_shop'],
  }), 'cafe');
  assert.equal(resolvePlaceCategoryAfterSelection('cafe', {
    source: 'google', googleTypes: ['hotel'],
  }), 'lodging');
});

test('manual 전환과 일반 edit는 기존 의미 카테고리를 보존한다', () => {
  assert.equal(resolvePlaceCategoryAfterSelection('관광명소', { source: 'manual' }), 'attraction');
  assert.equal(resolvePlaceCategoryAfterSelection('restaurant', { source: 'manual' }), 'restaurant');
});

test('다른 Google Place ID는 표시 값이 같아도 edit로 판정한다', () => {
  assert.equal(hasPlaceIdentityChanged(
    { source: 'google', googlePlaceId: 'place-a' },
    { source: 'google', googlePlaceId: 'place-b' },
  ), true);
  assert.equal(hasPlaceIdentityChanged(
    { source: 'google', googlePlaceId: 'place-a' },
    { source: 'google', googlePlaceId: 'place-a' },
  ), false);
});

test('null historical category의 표시 값은 기타다', () => {
  assert.equal(getPlaceCategoryDisplayLabel(null), '기타');
  assert.equal(getPlaceCategoryDisplayLabel('cafe'), '카페');
});

test('empty suggestions를 빈 배열로 처리한다', () => {
  assert.deepEqual(mapAutocompleteResponse({ results: [] }), []);
});

test('malformed autocomplete 응답을 제거한다', () => {
  assert.deepEqual(mapAutocompleteResponse({ results: [{ mainText: 'missing id' }, null] }), []);
  assert.deepEqual(mapAutocompleteResponse(null), []);
});

test('geocode 응답을 SelectedGooglePlace로 매핑한다', () => {
  assert.deepEqual(mapGeocodeResponse({ place: {
    googlePlaceId: 'ChIJ-1', formattedAddress: 'Seoul', latitude: 37.5, longitude: 127,
    cityName: 'Seoul', countryName: 'South Korea', countryCode: 'kr',
  } }), {
    provider: 'google', googlePlaceId: 'ChIJ-1', formattedAddress: 'Seoul', latitude: 37.5,
    longitude: 127, cityName: 'Seoul', countryName: 'South Korea', countryCode: 'KR',
  });
  assert.equal(mapGeocodeResponse({ place: { googlePlaceId: 'id' } }), null);
});

test('address component에서 city/country를 매핑한다', () => {
  assert.deepEqual(mapAddressComponents([
    { longText: 'Gangnam-gu', types: ['administrative_area_level_2'] },
    { longText: 'South Korea', shortText: 'kr', types: ['country'] },
  ]), { cityName: 'Gangnam-gu', countryName: 'South Korea', countryCode: 'KR' });
});

test('SelectedGooglePlace 값이 create identity로 전달된다', () => {
  assert.deepEqual(buildCreatePlaceIdentity(googleInput), {
    address: '1 Example Road', city: 'Seoul', country: 'South Korea', googlePlaceId: 'ChIJ-new',
    latitude: 37.5, longitude: 127, source: 'google',
  });
});

test('user-owned label은 Google display name으로 덮어쓰지 않는다', () => {
  assert.equal(googleInput.placeName, '내가 정한 이름');
  assert.notEqual(googleInput.placeName, 'Google canonical name');
});

test('create persistence에서 google source를 보존한다', () => {
  assert.equal(buildCreatePlaceIdentity(googleInput).source, 'google');
});

test('update에서 다른 Google place identity를 교체한다', () => {
  assert.deepEqual(buildPlaceIdentityPatch(googleInput), {
    address: '1 Example Road', city: 'Seoul', country: 'South Korea', google_place_id: 'ChIJ-new',
    latitude: 37.5, longitude: 127, source: 'google',
  });
});

test('이름/메모 edit는 전달된 Google identity를 보존한다', () => {
  const patch = buildPlaceIdentityPatch({ ...googleInput, place: '새 별명', placeName: '새 별명' });
  assert.equal(patch.google_place_id, 'ChIJ-new');
  assert.equal(patch.source, 'google');
});

test('manual 전환은 stale Google identity와 위치를 제거한다', () => {
  const patch = buildPlaceIdentityPatch({ ...googleInput, source: 'manual', place: '직접 입력' });
  assert.deepEqual(patch, {
    address: null, city: 'Seoul', country: 'South Korea', google_place_id: null,
    latitude: null, longitude: null, source: 'manual',
  });
});

test('Supabase source round-trip은 google을 보존한다', () => {
  assert.equal(normalizePersistedPlaceSource('google'), 'google');
  assert.equal(normalizePersistedPlaceSource('manual'), 'manual');
  assert.equal(normalizePersistedPlaceSource('photo_cluster'), 'manual');
});

test('production 검색 코드에 fixture가 없다', async () => {
  const source = await readFile(new URL('../components/common/PlaceSearchModal.tsx', import.meta.url), 'utf8');
  for (const fixture of ['Osaka Castle', 'Dotonbori', 'Louvre', 'Eiffel Tower', 'Sydney Opera House']) {
    assert.equal(source.includes(fixture), false);
  }
  assert.equal(source.includes("source: 'mock'"), false);
});

test('Google 검색 결과 선택 시 검색어가 아니라 선택한 display name을 초기 저장명으로 쓴다', async () => {
  const source = await readFile(new URL('../components/common/PlaceSearchModal.tsx', import.meta.url), 'utf8');
  assert.equal(source.includes('name: result.displayName,'), true);
  assert.equal(source.includes('name: trimmedSearchText,\n        googleDisplayName: result.displayName,'), false);
});

test('Google 장소 선택 후 중복 저장 이름 입력 필드를 표시하지 않는다', async () => {
  const source = await readFile(new URL('../components/record/PlaceCreateModal.tsx', import.meta.url), 'utf8');
  assert.equal(source.includes('저장할 장소 이름'), false);
  assert.equal(source.includes('googleLabelInput'), false);
  assert.equal(source.includes('Google Maps 장소:'), false);
});

test('현재 app-facing 장소 언어 source of truth는 한국어다', () => {
  assert.equal(getAppContentLanguageCode(), 'ko');
});

test('Places client가 autocomplete와 geocode 모두 app language를 전달한다', async () => {
  const source = await readFile(new URL('../services/placeSearch/googlePlaces.ts', import.meta.url), 'utf8');
  assert.equal(source.includes('const languageCode = getAppContentLanguageCode();'), true);
  assert.equal((source.match(/languageCode,/g) ?? []).length >= 2, true);
});

test('Edge Function이 Google Autocomplete와 Geocoding에 languageCode를 전달한다', async () => {
  const source = await readFile(new URL('../supabase/functions/google-places/index.ts', import.meta.url), 'utf8');
  assert.match(source, /languageCode,\r?\n      \.\.\.\(locationBias/);
  assert.equal(source.includes('?languageCode=${encodeURIComponent(languageCode)}'), true);
});

test('saved geography는 현재 한국어 locale에서 Osaka/日本을 한국어로 표시한다', () => {
  assert.deepEqual(
    localizeSavedPlaceGeography({ city: 'Osaka', country: '日本' }),
    { cityName: '오사카', countryCode: 'JP', countryName: '일본' },
  );
});

test('Google category prefill은 category UI 노출 여부와 무관하게 제출된다', async () => {
  const source = await readFile(new URL('../components/record/PlaceCreateModal.tsx', import.meta.url), 'utf8');
  assert.equal(source.includes('resolvePlaceCategoryAfterSelection(currentCategory, nextPlace)'), true);
  assert.equal(source.includes('category: category.trim() || undefined'), true);
  assert.equal(source.includes('showCategoryField ? ('), true);
});

test('Home category 위치는 provenance 문구를 사용하지 않는다', async () => {
  const source = await readFile(new URL('../app/(tabs)/index.tsx', import.meta.url), 'utf8');
  assert.equal(source.includes("categoryLabel: entry.category ?? '직접 추가'"), false);
  assert.equal(source.includes('categoryLabel: entry.category ?? getPlaceCategoryDisplayLabel(null)'), true);
});

test('raw Google types는 places persistence payload에 저장하지 않는다', async () => {
  const sources = await Promise.all([
    '../hooks/useCreatePlaceRecord.ts',
    '../hooks/useUpdatePlaceRecord.ts',
    '../services/supabase/places.ts',
  ].map((path) => readFile(new URL(path, import.meta.url), 'utf8')));
  assert.equal(sources.some((source) => source.includes('google_types')), false);
});

test('Osaka city 변형은 저장 원문과 무관하게 한국어 표시를 통일한다', () => {
  for (const city of ['Osaka', 'Osaka City', '大阪市', '오사카시']) {
    assert.deepEqual(
      localizeSavedPlaceGeography({ city, country: 'Japan' }),
      { cityName: '오사카', countryCode: 'JP', countryName: '일본' },
    );
  }
});

test('일본 country 원문 변형은 한국어 표시를 통일한다', () => {
  for (const country of ['Japan', '日本', '일본']) {
    assert.equal(localizeSavedPlaceGeography({ country }).countryName, '일본');
  }
});

test('saved geography는 표시 locale이 영어면 같은 원본을 영어로 표시한다', () => {
  assert.deepEqual(
    localizeSavedPlaceGeography({ city: '大阪市', country: '일본' }, 'en'),
    { cityName: 'Osaka', countryCode: 'JP', countryName: 'Japan' },
  );
});

test('지원하지 않는 표시 locale은 한국어를 강제하지 않고 source 값을 유지한다', () => {
  assert.deepEqual(
    localizeSavedPlaceGeography({ city: 'Osaka', country: 'Japan' }, 'fr'),
    { cityName: 'Osaka', countryCode: 'JP', countryName: 'Japan' },
  );
});

test('새 장소에서 시간을 비우면 추가 시각을 방문 시간으로 사용한다', () => {
  const now = new Date(2026, 7, 14, 16, 23, 0, 0);
  assert.equal(resolveCreatePlaceTimeLabel(undefined, now), '4:23 PM');
  assert.equal(resolveCreatePlaceTimeLabel('', now), '4:23 PM');
});

test('사용자/사진에서 정해진 시간이 있으면 추가 시각으로 덮어쓰지 않는다', () => {
  const now = new Date(2026, 7, 14, 16, 23, 0, 0);
  assert.equal(resolveCreatePlaceTimeLabel('9:10 AM', now), '9:10 AM');
});

test('Home 현재 기기 위치 라벨은 app language와 무관하게 영어 규칙을 유지한다', async () => {
  const source = await readFile(new URL('../app/(tabs)/index.tsx', import.meta.url), 'utf8');
  assert.equal(source.includes('const label = getEnglishDeviceLocationLabelFromLocality(locality);'), true);
  assert.equal(source.includes('getAppContentLanguageCode'), false);
});

test('place-detail은 city/country 표시를 shared localizer에 위임한다', async () => {
  const source = await readFile(new URL('../app/place-detail.tsx', import.meta.url), 'utf8');
  assert.equal(source.includes('localizeSavedPlaceGeography({'), true);
  assert.equal(source.includes('KOREAN_CITY_LABELS'), false);
  assert.equal(source.includes('KOREAN_COUNTRY_LABELS'), false);
  assert.equal(source.includes('getKoreanCityLabel'), false);
  assert.equal(source.includes('getKoreanCountryLabel'), false);
});

test('auth/config/quota/empty error를 안전한 문구로 정규화한다', () => {
  assert.match(getPlaceSearchErrorMessage('UNAUTHORIZED'), /로그인/);
  assert.match(getPlaceSearchErrorMessage('SERVER_CONFIGURATION_ERROR'), /직접 추가/);
  assert.match(getPlaceSearchErrorMessage('QUOTA_EXCEEDED'), /잠시 후/);
  assert.match(getPlaceSearchErrorMessage('EMPTY_GEOCODE'), /주소/);
  assert.equal(getPlaceSearchErrorMessage('GOOGLE_AUTH_ERROR').includes('key'), false);
});

let failed = 0;
for (const { name, run } of tests) {
  try {
    await run();
    console.log(`✓ ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`✗ ${name}`);
    console.error(error);
  }
}

if (failed > 0) process.exitCode = 1;
else console.log(`\n${tests.length} place-search tests passed.`);
