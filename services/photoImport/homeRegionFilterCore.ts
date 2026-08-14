export const HOME_REGION_REVERSE_GEOCODE_MAX_CONCURRENCY = 2;
export const HOME_REGION_RATE_LIMIT_COOLDOWN_MS = 1000;

export type HomeRegionRelation = 'inside_home_region' | 'outside_home_region' | 'unknown';

export interface HomeRegionRelationEvaluation {
  distanceFromHomeKm?: number;
  relation: HomeRegionRelation;
}

export interface HomeRegionVisibilitySummary {
  farthestDistanceKm?: number;
  hiddenReason?: 'hidden_home_region';
  insideGroupCount: number;
  locatedGroupCount: number;
  meaningfulOutsideGroupCount: number;
  nearestDistanceKm?: number;
  outsideGroupCount: number;
  shouldHide: boolean;
  unknownGroupCount: number;
}

export function getHomeRegionGeocodeCoordinateKey(latitude: number, longitude: number) {
  return `${latitude.toFixed(3)},${longitude.toFixed(3)}`;
}

export function summarizeHomeRegionEvaluations(
  evaluations: HomeRegionRelationEvaluation[],
): HomeRegionVisibilitySummary {
  const insideGroupCount = evaluations.filter(
    (evaluation) => evaluation.relation === 'inside_home_region',
  ).length;
  const outsideGroupCount = evaluations.filter(
    (evaluation) => evaluation.relation === 'outside_home_region',
  ).length;
  const unknownGroupCount = evaluations.filter(
    (evaluation) => evaluation.relation === 'unknown',
  ).length;
  const distances = evaluations
    .map((evaluation) => evaluation.distanceFromHomeKm)
    .filter((distance): distance is number => typeof distance === 'number' && Number.isFinite(distance));
  // An unknown result can represent geocoder failure, so keep the candidate visible.
  const shouldHide =
    insideGroupCount > 0 &&
    outsideGroupCount === 0 &&
    unknownGroupCount === 0;

  return {
    farthestDistanceKm: distances.length ? Math.max(...distances) : undefined,
    hiddenReason: shouldHide ? 'hidden_home_region' : undefined,
    insideGroupCount,
    locatedGroupCount: insideGroupCount + outsideGroupCount,
    meaningfulOutsideGroupCount: outsideGroupCount,
    nearestDistanceKm: distances.length ? Math.min(...distances) : undefined,
    outsideGroupCount,
    shouldHide,
    unknownGroupCount,
  };
}

export interface HomeRegionGeocodeTask {
  key: string;
  latitude: number;
  longitude: number;
}

export interface HomeRegionGeocodeTaskResult {
  administrativeArea: string | null;
  rateLimited: boolean;
}

export interface HomeRegionGeocodeDiagnostics {
  cacheHitCount: number;
  coordinateInputCount: number;
  duplicateCoordinateCount: number;
  maxConcurrentRequestCount: number;
  rateLimitedRequestCount: number;
  requestCount: number;
  skippedAfterRateLimitCount: number;
  uniqueCoordinateCount: number;
}

export async function resolveHomeRegionGeocodeTasks(
  tasks: HomeRegionGeocodeTask[],
  resolveTask: (task: HomeRegionGeocodeTask) => Promise<HomeRegionGeocodeTaskResult>,
  successfulResultCache: Map<string, string>,
  options: {
    maxConcurrency?: number;
    rateLimitCooldownMs?: number;
  } = {},
) {
  const maxConcurrency = Math.max(
    1,
    Math.floor(options.maxConcurrency ?? HOME_REGION_REVERSE_GEOCODE_MAX_CONCURRENCY),
  );
  const rateLimitCooldownMs = Math.max(
    0,
    options.rateLimitCooldownMs ?? HOME_REGION_RATE_LIMIT_COOLDOWN_MS,
  );
  const uniqueTasks = new Map<string, HomeRegionGeocodeTask>();

  for (const task of tasks) {
    if (!uniqueTasks.has(task.key)) {
      uniqueTasks.set(task.key, task);
    }
  }

  const resultsByKey = new Map<string, string | null>();
  const pendingTasks: HomeRegionGeocodeTask[] = [];
  let cacheHitCount = 0;

  for (const task of uniqueTasks.values()) {
    const cached = successfulResultCache.get(task.key);

    if (cached) {
      cacheHitCount += 1;
      resultsByKey.set(task.key, cached);
    } else {
      pendingTasks.push(task);
    }
  }

  let activeRequestCount = 0;
  let maxConcurrentRequestCount = 0;
  let nextTaskIndex = 0;
  let rateLimitCircuitOpen = false;
  let rateLimitedRequestCount = 0;
  let requestCount = 0;

  async function runWorker() {
    while (!rateLimitCircuitOpen && nextTaskIndex < pendingTasks.length) {
      const task = pendingTasks[nextTaskIndex];
      nextTaskIndex += 1;
      activeRequestCount += 1;
      maxConcurrentRequestCount = Math.max(maxConcurrentRequestCount, activeRequestCount);

      let result: HomeRegionGeocodeTaskResult;

      try {
        requestCount += 1;
        result = await resolveTask(task);
      } finally {
        activeRequestCount -= 1;
      }

      resultsByKey.set(task.key, result.administrativeArea);

      if (result.administrativeArea) {
        successfulResultCache.set(task.key, result.administrativeArea);
      }

      if (result.rateLimited) {
        rateLimitedRequestCount += 1;
        rateLimitCircuitOpen = true;
      }
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(maxConcurrency, pendingTasks.length) },
      () => runWorker(),
    ),
  );

  const skippedAfterRateLimitCount = rateLimitCircuitOpen
    ? Math.max(0, pendingTasks.length - nextTaskIndex)
    : 0;

  if (rateLimitCircuitOpen && rateLimitCooldownMs > 0) {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, rateLimitCooldownMs);
    });
  }

  const diagnostics: HomeRegionGeocodeDiagnostics = {
    cacheHitCount,
    coordinateInputCount: tasks.length,
    duplicateCoordinateCount: tasks.length - uniqueTasks.size,
    maxConcurrentRequestCount,
    rateLimitedRequestCount,
    requestCount,
    skippedAfterRateLimitCount,
    uniqueCoordinateCount: uniqueTasks.size,
  };

  return { diagnostics, resultsByKey };
}
