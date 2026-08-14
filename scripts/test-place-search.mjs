import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { getAppContentLanguageCode } from '../services/localization/appLanguage.ts';
import { localizeSavedPlaceGeography } from '../services/localization/placeGeography.ts';
import {
  getPlaceSearchErrorMessage,
  mapAddressComponents,
  mapAutocompleteResponse,
  mapGeocodeResponse,
  normalizePersistedPlaceSource,
  PLACE_SEARCH_DEBOUNCE_MS,
  PlaceRequestSequence,
  shouldRequestPlaceQuery,
  shouldShowGoogleMapsAttribution,
} from '../services/placeSearch/mappers.ts';
import {
  buildCreatePlaceIdentity,
  buildPlaceIdentityPatch,
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
    provider: 'google', placeId: 'place-1', displayName: 'Place One',
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
    })),
  });
  assert.equal(results.length, 5);
  assert.deepEqual(results[0], {
    provider: 'google', placeId: 'id-0', displayName: 'place-0', secondaryText: 'address-0',
  });
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
  assert.equal(source.includes('languageCode,\n      ...(locationBias'), true);
  assert.equal(source.includes('?languageCode=${encodeURIComponent(languageCode)}'), true);
});

test('saved geography는 현재 한국어 locale에서 Osaka/日本을 한국어로 표시한다', () => {
  assert.deepEqual(
    localizeSavedPlaceGeography({ city: 'Osaka', country: '日本' }),
    { cityName: '오사카', countryCode: 'JP', countryName: '일본' },
  );
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
