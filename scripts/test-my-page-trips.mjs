import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  USER_SAVED_TRIP_STATUSES,
  isUserSavedTripStatus,
} from '../services/supabase/tripStatus.ts';

const tripsSource = await readFile(
  new URL('../services/supabase/trips.ts', import.meta.url),
  'utf8',
);
const detailSource = await readFile(
  new URL('../app/day-archive-detail.tsx', import.meta.url),
  'utf8',
);
const profileSource = await readFile(
  new URL('../app/(tabs)/profile.tsx', import.meta.url),
  'utf8',
);
const listTripsByUserSource = tripsSource.match(
  /export function listTripsByUser\(userId: string\) \{([\s\S]*?)\r?\n\}/,
)?.[1];

assert.ok(listTripsByUserSource, 'My Page trip query source must exist.');

assert.deepEqual(USER_SAVED_TRIP_STATUSES, ['draft', 'active', 'archived', 'completed']);
for (const status of USER_SAVED_TRIP_STATUSES) {
  assert.equal(isUserSavedTripStatus(status), true, `${status} must be openable as a saved trip.`);
}
assert.equal(isUserSavedTripStatus('detected'), false);
assert.equal(isUserSavedTripStatus('ignored'), false);
assert.equal(isUserSavedTripStatus(null), false);

assert.match(listTripsByUserSource, /\.in\('status', USER_SAVED_TRIP_STATUSES\)/);
assert.match(listTripsByUserSource, /\.eq\('user_id', userId\)/);
assert.match(listTripsByUserSource, /\.is\('deleted_at', null\)/);
assert.doesNotMatch(listTripsByUserSource, /\.eq\('status', 'archived'\)/);
assert.match(
  listTripsByUserSource,
  /\.order\('start_date', \{ ascending: false, nullsFirst: false \}\)/,
);
assert.match(listTripsByUserSource, /\.order\('created_at', \{ ascending: false \}\)/);

assert.match(detailSource, /!isUserSavedTripStatus\(supabaseTrip\.status\)/);
assert.doesNotMatch(detailSource, /supabaseTrip\.status !== 'archived'/);
assert.match(detailSource, /isSupabaseArchiveTrip && dayOptions\.length === 0/);

assert.match(profileSource, /아직 저장된 여행이 없어요/);
assert.match(profileSource, /여행을 만들면 이곳에 차곡차곡 모여요\./);
assert.doesNotMatch(profileSource, /아직 완료한 여행이 없어요/);

console.log('Saved trip list/detail status contract tests passed');
