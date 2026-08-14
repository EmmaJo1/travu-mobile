import * as Location from 'expo-location';

import type { LivingArea } from '@/services/location/livingAreas';
import {
  getHomeRegionGeocodeCoordinateKey,
  resolveHomeRegionGeocodeTasks,
  summarizeHomeRegionEvaluations,
  type HomeRegionGeocodeDiagnostics,
  type HomeRegionGeocodeTask,
  type HomeRegionRelation,
  type HomeRegionVisibilitySummary,
} from '@/services/photoImport/homeRegionFilterCore';
import type {
  LocalDetectedPhoto,
  LocalDetectedPlaceGroup,
  LocalDetectedTripDraft,
} from '@/services/photoImport/localDetectedTripDraftStore';

export const HOME_REGION_EXCLUSION_RADIUS_KM = 25;

export type { HomeRegionRelation } from '@/services/photoImport/homeRegionFilterCore';
export type HomeRegionCoordinateSource =
  | 'group_centroid'
  | 'group_coordinate'
  | 'representative_gps_photo'
  | 'none';

export interface HomeRegionGroupEvaluation {
  administrativeArea?: string;
  coordinateSource: HomeRegionCoordinateSource;
  distanceFromHomeKm?: number;
  photoCount: number;
  relation: HomeRegionRelation;
}

export interface HomeRegionCandidateVisibilityResult extends HomeRegionVisibilitySummary {}

const reverseGeocodeRegionCache = new Map<string, string>();

function isFiniteCoordinate(value?: number | null): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function hasValidHomeRegion(homeRegion?: LivingArea | null): homeRegion is LivingArea {
  return Boolean(
    homeRegion &&
      isFiniteCoordinate(homeRegion.latitude) &&
      isFiniteCoordinate(homeRegion.longitude),
  );
}

function normalizeAdministrativeArea(value?: string | null) {
  if (!value) {
    return null;
  }

  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/특별자치도|특별자치시|광역시|특별시|도$/u, '');

  const aliases: Record<string, string> = {
    gwangju: '광주',
    seoul: '서울',
    busan: '부산',
    daegu: '대구',
    incheon: '인천',
    daejeon: '대전',
    ulsan: '울산',
    sejong: '세종',
    jeju: '제주',
    jeollanamdo: '전남',
    jeollabukdo: '전북',
    gyeonggido: '경기',
    gangwondo: '강원',
    chungcheongnamdo: '충남',
    chungcheongbukdo: '충북',
    gyeongsangnamdo: '경남',
    gyeongsangbukdo: '경북',
  };

  return aliases[normalized] ?? normalized;
}

function getHomeAdministrativeArea(homeRegion: LivingArea) {
  return normalizeAdministrativeArea(
    homeRegion.administrativeArea ?? homeRegion.locality ?? homeRegion.displayName,
  );
}

function isRateLimitError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  return /rate limit|too many requests/i.test(message);
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

export function calculateDistanceKm(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
) {
  const earthRadiusKm = 6371;
  const latDelta = toRadians(to.latitude - from.latitude);
  const lonDelta = toRadians(to.longitude - from.longitude);
  const fromLat = toRadians(from.latitude);
  const toLat = toRadians(to.latitude);
  const a =
    Math.sin(latDelta / 2) * Math.sin(latDelta / 2) +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(lonDelta / 2) * Math.sin(lonDelta / 2);

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getPhotoCoordinates(photo: LocalDetectedPhoto) {
  return isFiniteCoordinate(photo.latitude) && isFiniteCoordinate(photo.longitude)
    ? { latitude: photo.latitude, longitude: photo.longitude }
    : null;
}

export function getGroupCoordinateForHomeRegion(group: LocalDetectedPlaceGroup): {
  coordinateSource: HomeRegionCoordinateSource;
  latitude?: number;
  longitude?: number;
} {
  if (isFiniteCoordinate(group.centroidLat) && isFiniteCoordinate(group.centroidLng)) {
    return {
      coordinateSource: 'group_centroid',
      latitude: group.centroidLat,
      longitude: group.centroidLng,
    };
  }

  if (isFiniteCoordinate(group.latitude) && isFiniteCoordinate(group.longitude)) {
    return {
      coordinateSource: 'group_coordinate',
      latitude: group.latitude,
      longitude: group.longitude,
    };
  }

  const representativeCoordinates = group.photos
    .map(getPhotoCoordinates)
    .find((coordinates) => Boolean(coordinates));

  if (representativeCoordinates) {
    return {
      coordinateSource: 'representative_gps_photo',
      latitude: representativeCoordinates.latitude,
      longitude: representativeCoordinates.longitude,
    };
  }

  return {
    coordinateSource: 'none',
  };
}

async function requestReverseGeocodedAdministrativeArea(task: HomeRegionGeocodeTask) {
  try {
    const addresses = await Location.reverseGeocodeAsync({
      latitude: task.latitude,
      longitude: task.longitude,
    });
    const address = addresses[0];

    return {
      administrativeArea: normalizeAdministrativeArea(
        address?.region ?? address?.city ?? address?.subregion ?? null,
      ),
      rateLimited: false,
    };
  } catch (error) {
    return {
      administrativeArea: null,
      rateLimited: isRateLimitError(error),
    };
  }
}

async function resolveAdministrativeAreasForGroups(groups: LocalDetectedPlaceGroup[]) {
  const taskByGroup = new Map<LocalDetectedPlaceGroup, HomeRegionGeocodeTask>();

  for (const group of groups) {
    const coordinates = getGroupCoordinateForHomeRegion(group);

    if (
      !isFiniteCoordinate(coordinates.latitude) ||
      !isFiniteCoordinate(coordinates.longitude)
    ) {
      continue;
    }

    taskByGroup.set(group, {
      key: getHomeRegionGeocodeCoordinateKey(coordinates.latitude, coordinates.longitude),
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
    });
  }

  const { diagnostics, resultsByKey } = await resolveHomeRegionGeocodeTasks(
    [...taskByGroup.values()],
    requestReverseGeocodedAdministrativeArea,
    reverseGeocodeRegionCache,
  );
  const administrativeAreaByGroup = new Map<LocalDetectedPlaceGroup, string | null>();

  for (const [group, task] of taskByGroup) {
    administrativeAreaByGroup.set(group, resultsByKey.get(task.key) ?? null);
  }

  return { administrativeAreaByGroup, diagnostics };
}

function createGroupEvaluation(
  group: LocalDetectedPlaceGroup,
  homeRegion: LivingArea,
  administrativeArea?: string | null,
): HomeRegionGroupEvaluation {
  const coordinates = getGroupCoordinateForHomeRegion(group);

  if (
    !isFiniteCoordinate(coordinates.latitude) ||
    !isFiniteCoordinate(coordinates.longitude)
  ) {
    return {
      coordinateSource: 'none',
      photoCount: group.photos.length,
      relation: 'unknown',
    };
  }

  const homeAdministrativeArea = getHomeAdministrativeArea(homeRegion);
  const distanceFromHomeKm = calculateDistanceKm(
    { latitude: homeRegion.latitude, longitude: homeRegion.longitude },
    { latitude: coordinates.latitude, longitude: coordinates.longitude },
  );

  if (!administrativeArea || !homeAdministrativeArea) {
    return {
      administrativeArea: administrativeArea ?? undefined,
      coordinateSource: coordinates.coordinateSource,
      distanceFromHomeKm,
      photoCount: group.photos.length,
      relation: 'unknown',
    };
  }

  return {
    administrativeArea,
    coordinateSource: coordinates.coordinateSource,
    distanceFromHomeKm,
    photoCount: group.photos.length,
    relation: administrativeArea === homeAdministrativeArea
      ? 'inside_home_region'
      : 'outside_home_region',
  };
}

export async function classifyGroupAgainstHomeRegion(
  group: LocalDetectedPlaceGroup,
  homeRegion: LivingArea,
): Promise<HomeRegionGroupEvaluation> {
  const { administrativeAreaByGroup } = await resolveAdministrativeAreasForGroups([group]);

  return createGroupEvaluation(group, homeRegion, administrativeAreaByGroup.get(group));
}

export async function evaluateCandidateHomeRegionVisibility(
  draft: LocalDetectedTripDraft,
  homeRegion?: LivingArea | null,
): Promise<HomeRegionCandidateVisibilityResult> {
  if (!hasValidHomeRegion(homeRegion)) {
    return {
      insideGroupCount: 0,
      locatedGroupCount: 0,
      meaningfulOutsideGroupCount: 0,
      outsideGroupCount: 0,
      shouldHide: false,
      unknownGroupCount: 0,
    };
  }

  const groups = draft.days.flatMap((day) => day.groups);
  const { administrativeAreaByGroup } = await resolveAdministrativeAreasForGroups(groups);
  const evaluations = groups.map((group) => (
    createGroupEvaluation(group, homeRegion, administrativeAreaByGroup.get(group))
  ));
  return summarizeHomeRegionEvaluations(
    evaluations,
  );
}

export async function applyHomeRegionCandidateFilter(
  drafts: LocalDetectedTripDraft[],
  homeRegion?: LivingArea | null,
  _radiusKm = HOME_REGION_EXCLUSION_RADIUS_KM,
  scanAttemptId?: string,
) {
  if (!hasValidHomeRegion(homeRegion)) {
    for (const draft of drafts) {
      draft.debugMetadata.distanceFromHomeFarthestKm = undefined;
      draft.debugMetadata.distanceFromHomeNearestKm = undefined;
      draft.debugMetadata.excludedBecauseHomeRegion = false;
      draft.debugMetadata.homeRegionFilterApplied = false;
      draft.debugMetadata.homeRegionHiddenReason = undefined;
      draft.debugMetadata.homeRegionInsideGroupCount = 0;
      draft.debugMetadata.homeRegionLocatedGroupCount = 0;
      draft.debugMetadata.homeRegionMeaningfulOutsideGroupCount = 0;
      draft.debugMetadata.homeRegionOutsideGroupCount = 0;
      draft.debugMetadata.homeRegionUnknownGroupCount = 0;
    }

    return drafts.map((draft) => ({
      draftId: draft.id,
      result: {
        insideGroupCount: 0,
        locatedGroupCount: 0,
        meaningfulOutsideGroupCount: 0,
        outsideGroupCount: 0,
        shouldHide: false,
        unknownGroupCount: 0,
      } satisfies HomeRegionCandidateVisibilityResult,
    }));
  }

  const homeAdministrativeArea = getHomeAdministrativeArea(homeRegion);
  const allGroups = drafts.flatMap((draft) => draft.days.flatMap((day) => day.groups));
  const { administrativeAreaByGroup, diagnostics } =
    await resolveAdministrativeAreasForGroups(allGroups);
  const evaluations = drafts.map((draft) => {
    const groups = draft.days.flatMap((day) => day.groups);
    const groupEvaluations = groups.map((group) => (
      createGroupEvaluation(group, homeRegion, administrativeAreaByGroup.get(group))
    ));
    const result = summarizeHomeRegionEvaluations(groupEvaluations);

    draft.debugMetadata.distanceFromHomeFarthestKm = result.farthestDistanceKm;
    draft.debugMetadata.distanceFromHomeNearestKm = result.nearestDistanceKm;
    draft.debugMetadata.excludedBecauseHomeRegion = result.shouldHide;
    draft.debugMetadata.homeRegionFilterApplied = true;
    draft.debugMetadata.homeRegionHiddenReason = result.hiddenReason;
    draft.debugMetadata.homeRegionInsideGroupCount = result.insideGroupCount;
    draft.debugMetadata.homeRegionLocatedGroupCount = result.locatedGroupCount;
    draft.debugMetadata.homeRegionMeaningfulOutsideGroupCount = result.meaningfulOutsideGroupCount;
    draft.debugMetadata.homeRegionOutsideGroupCount = result.outsideGroupCount;
    draft.debugMetadata.homeRegionUnknownGroupCount = result.unknownGroupCount;

    groups.forEach((group, groupIndex) => {
      const groupResult = groupEvaluations[groupIndex];
      group.coordinateSource = groupResult.coordinateSource;
      group.distanceFromHomeKm = groupResult.distanceFromHomeKm;
      group.homeRegionRelation = groupResult.relation;

      if (__DEV__) {
        console.info('[photo-import home region] group address evaluated', {
          administrativeArea: groupResult.administrativeArea,
          draftId: draft.id,
          groupIndex,
          homeAdministrativeArea,
          photoCount: groupResult.photoCount,
          relation: groupResult.relation,
          scanAttemptId,
        });
      }
    });

    if (__DEV__) {
      console.info('[photo-import home region] candidate evaluation completed', {
        draftId: draft.id,
        hiddenReason: result.hiddenReason,
        homeAdministrativeArea,
        homeRegionDisplayName: homeRegion.displayName,
        insideGroupCount: result.insideGroupCount,
        outsideGroupCount: result.outsideGroupCount,
        scanAttemptId,
        shouldHide: result.shouldHide,
        startDate: draft.startDate,
        endDate: draft.endDate,
        unknownGroupCount: result.unknownGroupCount,
      });
    }

    return { draftId: draft.id, result };
  });

  if (__DEV__) {
    const hiddenCandidateCount = evaluations.filter(({ result }) => result.shouldHide).length;
    const candidateKeptBecauseUnknownCount = evaluations.filter(({ result }) => (
      result.insideGroupCount > 0 &&
      result.outsideGroupCount === 0 &&
      result.unknownGroupCount > 0
    )).length;
    const unknownGroupCount = evaluations.reduce(
      (total, { result }) => total + result.unknownGroupCount,
      0,
    );

    logHomeRegionFilterSummary({
      candidateCount: drafts.length,
      candidateKeptBecauseUnknownCount,
      diagnostics,
      hiddenCandidateCount,
      homeAdministrativeArea,
      homeRegion,
      scanAttemptId,
      unknownGroupCount,
    });
  }

  return evaluations;
}

function logHomeRegionFilterSummary({
  candidateCount,
  candidateKeptBecauseUnknownCount,
  diagnostics,
  hiddenCandidateCount,
  homeAdministrativeArea,
  homeRegion,
  scanAttemptId,
  unknownGroupCount,
}: {
  candidateCount: number;
  candidateKeptBecauseUnknownCount: number;
  diagnostics: HomeRegionGeocodeDiagnostics;
  hiddenCandidateCount: number;
  homeAdministrativeArea: string | null;
  homeRegion: LivingArea;
  scanAttemptId?: string;
  unknownGroupCount: number;
}) {
  console.info('[photo-import home region] filter summary', {
    candidateCount,
    candidateKeptBecauseUnknownCount,
    confirmedLivingAreaAdministrativeArea: homeRegion.administrativeArea,
    confirmedLivingAreaDisplayName: homeRegion.displayName,
    confirmedLivingAreaId: homeRegion.id,
    confirmedLivingAreaLocality: homeRegion.locality,
    hiddenCandidateCount,
    homeAdministrativeArea,
    reverseGeocodeCacheHitCount: diagnostics.cacheHitCount,
    reverseGeocodeCoordinateInputCount: diagnostics.coordinateInputCount,
    reverseGeocodeDuplicateCoordinateCount: diagnostics.duplicateCoordinateCount,
    reverseGeocodeMaxConcurrentRequestCount: diagnostics.maxConcurrentRequestCount,
    reverseGeocodeRateLimitedRequestCount: diagnostics.rateLimitedRequestCount,
    reverseGeocodeRequestCount: diagnostics.requestCount,
    reverseGeocodeSkippedAfterRateLimitCount: diagnostics.skippedAfterRateLimitCount,
    reverseGeocodeUniqueCoordinateCount: diagnostics.uniqueCoordinateCount,
    scanAttemptId,
    unknownGroupCount,
  });
}
