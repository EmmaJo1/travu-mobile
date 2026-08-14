import assert from 'node:assert/strict';

import {
  getHomeRegionGeocodeCoordinateKey,
  HOME_REGION_REVERSE_GEOCODE_MAX_CONCURRENCY,
  resolveHomeRegionGeocodeTasks,
  summarizeHomeRegionEvaluations,
} from '../services/photoImport/homeRegionFilterCore.ts';

function visibility(...relations) {
  return summarizeHomeRegionEvaluations(relations.map((relation) => ({ relation })));
}

assert.equal(visibility('inside_home_region', 'inside_home_region').shouldHide, true);
assert.equal(visibility('inside_home_region', 'outside_home_region').shouldHide, false);
assert.equal(visibility('inside_home_region', 'unknown').shouldHide, false);
assert.equal(visibility('unknown', 'unknown').shouldHide, false);
assert.equal(
  getHomeRegionGeocodeCoordinateKey(35.12341, 126.98741),
  getHomeRegionGeocodeCoordinateKey(35.12349, 126.98749),
);

const manyTasks = Array.from({ length: 24 }, (_, index) => ({
  key: `coordinate-${index % 12}`,
  latitude: 35 + index / 100,
  longitude: 126 + index / 100,
}));
let activeRequestCount = 0;
let observedMaxConcurrency = 0;
const successfulResultCache = new Map([['coordinate-0', '광주']]);
const boundedResult = await resolveHomeRegionGeocodeTasks(
  manyTasks,
  async () => {
    activeRequestCount += 1;
    observedMaxConcurrency = Math.max(observedMaxConcurrency, activeRequestCount);
    await new Promise((resolve) => setTimeout(resolve, 2));
    activeRequestCount -= 1;
    return { administrativeArea: '광주', rateLimited: false };
  },
  successfulResultCache,
  { rateLimitCooldownMs: 0 },
);

assert.equal(HOME_REGION_REVERSE_GEOCODE_MAX_CONCURRENCY, 2);
assert.ok(observedMaxConcurrency <= HOME_REGION_REVERSE_GEOCODE_MAX_CONCURRENCY);
assert.ok(
  boundedResult.diagnostics.maxConcurrentRequestCount <=
    HOME_REGION_REVERSE_GEOCODE_MAX_CONCURRENCY,
);
assert.equal(boundedResult.diagnostics.uniqueCoordinateCount, 12);
assert.equal(boundedResult.diagnostics.duplicateCoordinateCount, 12);
assert.equal(boundedResult.diagnostics.cacheHitCount, 1);
assert.equal(boundedResult.diagnostics.requestCount, 11);

let rateLimitedRequestCount = 0;
const rateLimitedResult = await resolveHomeRegionGeocodeTasks(
  manyTasks,
  async () => {
    rateLimitedRequestCount += 1;
    return { administrativeArea: null, rateLimited: true };
  },
  new Map(),
  { rateLimitCooldownMs: 0 },
);

assert.ok(rateLimitedRequestCount <= HOME_REGION_REVERSE_GEOCODE_MAX_CONCURRENCY);
assert.equal(
  rateLimitedResult.diagnostics.rateLimitedRequestCount,
  rateLimitedRequestCount,
);
assert.equal(
  rateLimitedResult.diagnostics.skippedAfterRateLimitCount,
  12 - rateLimitedRequestCount,
);
const rateLimitedCoordinateResult = rateLimitedResult.resultsByKey.get('coordinate-0');
assert.equal(rateLimitedCoordinateResult, null);
assert.equal(
  visibility(
    'inside_home_region',
    rateLimitedCoordinateResult ? 'outside_home_region' : 'unknown',
  ).shouldHide,
  false,
);

console.log('home-region filter policy and bounded geocoding tests passed');
