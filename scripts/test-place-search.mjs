import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  getPlaceSearchErrorMessage,
  mapAddressComponents,
  mapAutocompleteResponse,
  mapGeocodeResponse,
  normalizePersistedPlaceSource,
  PLACE_SEARCH_DEBOUNCE_MS,
  PlaceRequestSequence,
  shouldRequestPlaceQuery,
} from '../services/placeSearch/mappers.ts';
import {
  buildCreatePlaceIdentity,
  buildPlaceIdentityPatch,
} from '../services/placeSearch/persistence.ts';

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
