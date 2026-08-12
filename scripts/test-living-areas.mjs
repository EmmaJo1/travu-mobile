import assert from 'node:assert/strict';

import {
  createConfirmedLivingAreaProfilePatch,
  createLivingAreaFromProfile,
  searchLivingAreas,
} from '../services/location/livingAreas.ts';

const [seoul] = searchLivingAreas('서울');

assert.ok(seoul, '서울 생활지역 검색 결과가 있어야 합니다.');
assert.deepEqual(createConfirmedLivingAreaProfilePatch(seoul), {
  based_in: '서울특별시',
  based_in_city: '서울특별시',
  based_in_country: '대한민국',
  based_in_country_code: 'KR',
  based_in_google_place_id: null,
  based_in_latitude: 37.5665,
  based_in_longitude: 126.978,
});

assert.equal(createLivingAreaFromProfile(null, null), null);
assert.equal(createLivingAreaFromProfile('', undefined), null);
assert.equal(createLivingAreaFromProfile('서울특별시', null)?.id, 'kr-seoul');
assert.deepEqual(createConfirmedLivingAreaProfilePatch(null), {
  based_in: null,
  based_in_city: null,
  based_in_country: null,
  based_in_country_code: null,
  based_in_google_place_id: null,
  based_in_latitude: null,
  based_in_longitude: null,
});

console.log('living-area canonical mapping tests passed');
