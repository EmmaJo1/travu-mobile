import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  buildTripMapData,
  hasUsableCoordinates,
  isMyPageTravelMapTripStatus,
  orderTripMapPlaces,
} from '../services/maps/tripMapData.ts';
import {
  getCumulativePlaceDistanceKm,
  getCumulativePlaceDistanceMeters,
  getHaversineDistanceMeters,
} from '../services/maps/distance.ts';
import { getMapViewport } from '../services/maps/viewport.ts';

const validPlace = {
  id: 'place-valid',
  latitude: 34.6687,
  longitude: 135.5013,
};

assert.equal(hasUsableCoordinates({ latitude: null, longitude: 1 }), false);
assert.equal(hasUsableCoordinates({ latitude: undefined, longitude: 1 }), false);
assert.equal(hasUsableCoordinates({ latitude: Number.NaN, longitude: 1 }), false);
assert.equal(hasUsableCoordinates({ latitude: Number.POSITIVE_INFINITY, longitude: 1 }), false);
assert.equal(hasUsableCoordinates({ latitude: 91, longitude: 1 }), false);
assert.equal(hasUsableCoordinates({ latitude: 1, longitude: 181 }), false);
assert.equal(hasUsableCoordinates({ latitude: 0, longitude: 0 }), false);
assert.equal(hasUsableCoordinates(validPlace), true);

const tripDays = [
  { id: 'day-2', day_index: 2 },
  { id: 'day-1', day_index: 1 },
];
const unorderedPlaces = [
  {
    id: 'z-created-later',
    trip_id: 'trip-1',
    trip_day_id: 'day-1',
    visited_at: '2026-08-01T01:00:00Z',
    created_at: '2026-08-01T03:00:00Z',
    latitude: 1,
    longitude: 1,
  },
  {
    id: 'day-two',
    trip_id: 'trip-1',
    trip_day_id: 'day-2',
    visited_at: '2026-08-01T00:00:00Z',
    created_at: '2026-08-01T00:00:00Z',
    latitude: 2,
    longitude: 2,
  },
  {
    id: 'b-id',
    trip_id: 'trip-1',
    trip_day_id: 'day-1',
    visited_at: '2026-08-01T01:00:00Z',
    created_at: '2026-08-01T02:00:00Z',
    latitude: 3,
    longitude: 3,
  },
  {
    id: 'a-id',
    trip_id: 'trip-1',
    trip_day_id: 'day-1',
    visited_at: '2026-08-01T01:00:00Z',
    created_at: '2026-08-01T02:00:00Z',
    latitude: 4,
    longitude: 4,
  },
];

assert.deepEqual(
  orderTripMapPlaces(unorderedPlaces, tripDays).map(({ id }) => id),
  ['a-id', 'b-id', 'z-created-later', 'day-two'],
);
assert.deepEqual(
  orderTripMapPlaces([
    { id: 'later-created', trip_day_id: 'day-1', visited_at: null, created_at: '2026-08-02T00:00:00Z' },
    { id: 'earlier-created', trip_day_id: 'day-1', visited_at: null, created_at: '2026-08-01T00:00:00Z' },
  ], tripDays).map(({ id }) => id),
  ['earlier-created', 'later-created'],
);

const selectedDayData = buildTripMapData(unorderedPlaces, tripDays, {
  type: 'day',
  tripDayId: 'day-1',
});
assert.equal(selectedDayData.orderedPlaces.every((place) => place.trip_day_id === 'day-1'), true);
assert.deepEqual(selectedDayData.markers.map(({ number }) => number), [1, 2, 3]);

const allTripData = buildTripMapData(unorderedPlaces, tripDays, { type: 'all' });
assert.equal(allTripData.orderedPlaces.length, 4);
assert.deepEqual(allTripData.markers.map(({ number }) => number), [1, 2, 3, 4]);

const oneLongitudeDegreeMeters = getHaversineDistanceMeters(
  { latitude: 0, longitude: 1 },
  { latitude: 0, longitude: 2 },
);
assert.ok(Math.abs(oneLongitudeDegreeMeters - 111_194.9) < 1);
assert.equal(getCumulativePlaceDistanceMeters([]), 0);
assert.equal(getCumulativePlaceDistanceMeters([{ id: 'only', latitude: 1, longitude: 1 }]), 0);
assert.equal(getCumulativePlaceDistanceMeters([
  { id: 'same-a', latitude: 1, longitude: 1 },
  { id: 'same-b', latitude: 1, longitude: 1 },
]), 0);
assert.ok(Math.abs(getCumulativePlaceDistanceMeters([
  { id: 'a', latitude: 0, longitude: 1 },
  { id: 'b', latitude: 0, longitude: 2 },
  { id: 'c', latitude: 0, longitude: 3 },
]) - 222_389.9) < 2);
assert.equal(getCumulativePlaceDistanceMeters([
  { id: 'a', latitude: 0, longitude: 1 },
  { id: 'missing', latitude: null, longitude: null },
  { id: 'c', latitude: 0, longitude: 3 },
]), 0);
assert.equal(getCumulativePlaceDistanceKm([
  { id: 'a', latitude: 0, longitude: 1 },
  { id: 'b', latitude: 0, longitude: 2 },
]), 111.2);

assert.deepEqual(getMapViewport([]), { type: 'empty' });
assert.equal(getMapViewport([{ latitude: 1, longitude: 2 }]).type, 'single');
assert.deepEqual(
  getMapViewport([{ latitude: 1, longitude: 2 }, { latitude: 3, longitude: 4 }]),
  { type: 'bounds', coordinates: [{ latitude: 1, longitude: 2 }, { latitude: 3, longitude: 4 }] },
);

assert.equal(isMyPageTravelMapTripStatus('archived'), true);
assert.equal(isMyPageTravelMapTripStatus('completed'), true);
assert.equal(isMyPageTravelMapTripStatus('draft'), false);
assert.equal(isMyPageTravelMapTripStatus('active'), false);
assert.equal(isMyPageTravelMapTripStatus('detected'), false);
assert.equal(isMyPageTravelMapTripStatus('ignored'), false);

const day21Place = {
  id: 'day21-place',
  trip_id: 'owner-trip',
  trip_day_id: 'day-1',
  google_place_id: 'ChIJ-test',
  latitude: 34.6687,
  longitude: 135.5013,
  category: 'attraction',
  city: 'Osaka City',
  country: 'Japan',
};
const [day21Marker] = buildTripMapData([day21Place], tripDays, { type: 'all' }).markers;
assert.equal(day21Marker.place, day21Place);
assert.equal(day21Marker.tripId, 'owner-trip');
assert.equal(day21Marker.place.google_place_id, 'ChIJ-test');
assert.equal(day21Marker.place.latitude, 34.6687);
assert.equal(day21Marker.place.longitude, 135.5013);
assert.equal(day21Marker.place.category, 'attraction');
assert.equal(day21Marker.place.city, 'Osaka City');
assert.equal(day21Marker.place.country, 'Japan');

const placesServiceSource = await readFile(new URL('../services/supabase/places.ts', import.meta.url), 'utf8');
assert.match(placesServiceSource, /function listMapPlacesByUser\(userId: string\)/);
assert.match(placesServiceSource, /\.eq\('user_id', userId\)/);
assert.match(placesServiceSource, /\.is\('deleted_at', null\)/);

const profileSource = await readFile(new URL('../app/(tabs)/profile.tsx', import.meta.url), 'utf8');
assert.match(profileSource, /useMyPageTravelMapPlaces\(\)/);
assert.match(profileSource, /isMyPageTravelMapTripStatus\(trip\.status\)/);
assert.match(profileSource, /trip\.deleted_at === null/);
assert.doesNotMatch(profileSource, /useTripPlaces\(/);
assert.doesNotMatch(profileSource, /centroid/i);
assert.doesNotMatch(profileSource, /MapPlaceholderCard/);

const recordDaySource = await readFile(new URL('../app/record-day-detail.tsx', import.meta.url), 'utf8');
const archiveSource = await readFile(new URL('../app/day-archive-detail.tsx', import.meta.url), 'utf8');
const homeSource = await readFile(new URL('../app/(tabs)/index.tsx', import.meta.url), 'utf8');
const languagePolicySource = await readFile(
  new URL('../services/localization/appLanguage.ts', import.meta.url),
  'utf8',
);
assert.doesNotMatch(recordDaySource, /MapPlaceholderCard/);
assert.doesNotMatch(archiveSource, /MapPlaceholderCard/);
assert.doesNotMatch(homeSource, /distanceKm:\s*0/);
assert.match(recordDaySource, /setSelectedFilterId\(ALL_DAYS_ID\)/);
assert.match(archiveSource, /setAllTripSelected\(true\)/);
assert.match(languagePolicySource, /device-location label is a[\s\S]*remain English-only/i);

const nativeMapSource = await readFile(
  new URL('../components/map/TripPlacesMap.native.tsx', import.meta.url),
  'utf8',
);
const appConfigSource = await readFile(new URL('../app.config.ts', import.meta.url), 'utf8');
assert.match(nativeMapSource, /provider=\{PROVIDER_GOOGLE\}/);
assert.match(nativeMapSource, /showsMyLocationButton=\{false\}/);
assert.match(nativeMapSource, /showsUserLocation=\{false\}/);
assert.match(appConfigSource, /GOOGLE_MAPS_ANDROID_API_KEY/);
assert.match(appConfigSource, /GOOGLE_MAPS_IOS_API_KEY/);
assert.doesNotMatch(appConfigSource, /AIza[0-9A-Za-z_-]+/);

console.log('trip map regression tests passed');
