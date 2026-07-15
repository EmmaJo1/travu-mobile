import type { LivingArea } from '@/services/location/livingAreas';
import type {
  LocalDetectedPhoto,
  LocalDetectedPlaceGroup,
  LocalDetectedTripDraft,
} from '@/services/photoImport/localDetectedTripDraftStore';

export const HOME_REGION_EXCLUSION_RADIUS_KM = 25;
const MEANINGFUL_OUTSIDE_GROUP_MIN_PHOTOS = 3;
const MEANINGFUL_OUTSIDE_GROUP_MIN_DISTANCE_KM = 100;

export type HomeRegionRelation = 'inside_home_region' | 'outside_home_region' | 'unknown';
export type HomeRegionCoordinateSource =
  | 'group_centroid'
  | 'group_coordinate'
  | 'representative_gps_photo'
  | 'none';

export interface HomeRegionGroupEvaluation {
  coordinateSource: HomeRegionCoordinateSource;
  distanceFromHomeKm?: number;
  photoCount: number;
  relation: HomeRegionRelation;
}

export interface HomeRegionCandidateVisibilityResult {
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

function getEffectiveHomeRegionRadiusKm(homeRegion: LivingArea, fallbackRadiusKm: number) {
  return typeof homeRegion.exclusionRadiusKm === 'number' && Number.isFinite(homeRegion.exclusionRadiusKm)
    ? homeRegion.exclusionRadiusKm
    : fallbackRadiusKm;
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

export function classifyGroupAgainstHomeRegion(
  group: LocalDetectedPlaceGroup,
  homeRegion: LivingArea,
  radiusKm = HOME_REGION_EXCLUSION_RADIUS_KM,
): HomeRegionGroupEvaluation {
  const coordinates = getGroupCoordinateForHomeRegion(group);
  const effectiveRadiusKm = getEffectiveHomeRegionRadiusKm(homeRegion, radiusKm);

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

  const distanceFromHomeKm = calculateDistanceKm(
    {
      latitude: homeRegion.latitude,
      longitude: homeRegion.longitude,
    },
    {
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
    },
  );

  return {
    coordinateSource: coordinates.coordinateSource,
    distanceFromHomeKm,
    photoCount: group.photos.length,
    relation: distanceFromHomeKm <= effectiveRadiusKm ? 'inside_home_region' : 'outside_home_region',
  };
}

export function evaluateCandidateHomeRegionVisibility(
  draft: LocalDetectedTripDraft,
  homeRegion?: LivingArea | null,
  radiusKm = HOME_REGION_EXCLUSION_RADIUS_KM,
): HomeRegionCandidateVisibilityResult {
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
  const evaluations = groups.map((group) =>
    classifyGroupAgainstHomeRegion(group, homeRegion, radiusKm),
  );
  const insideGroupCount = evaluations.filter((result) => result.relation === 'inside_home_region').length;
  const outsideGroupCount = evaluations.filter((result) => result.relation === 'outside_home_region').length;
  const unknownGroupCount = evaluations.filter((result) => result.relation === 'unknown').length;
  const locatedGroupCount = insideGroupCount + outsideGroupCount;
  const meaningfulOutsideGroupCount = evaluations.filter((result) => (
    result.relation === 'outside_home_region' &&
    result.photoCount >= MEANINGFUL_OUTSIDE_GROUP_MIN_PHOTOS &&
    typeof result.distanceFromHomeKm === 'number' &&
    Number.isFinite(result.distanceFromHomeKm) &&
    result.distanceFromHomeKm >= MEANINGFUL_OUTSIDE_GROUP_MIN_DISTANCE_KM
  )).length;
  const distances = evaluations
    .map((result) => result.distanceFromHomeKm)
    .filter(isFiniteCoordinate);
  const shouldHide =
    locatedGroupCount > 0 &&
    insideGroupCount > 0 &&
    meaningfulOutsideGroupCount === 0;

  return {
    farthestDistanceKm: distances.length ? Math.max(...distances) : undefined,
    hiddenReason: shouldHide ? 'hidden_home_region' : undefined,
    insideGroupCount,
    locatedGroupCount,
    meaningfulOutsideGroupCount,
    nearestDistanceKm: distances.length ? Math.min(...distances) : undefined,
    outsideGroupCount,
    shouldHide,
    unknownGroupCount,
  };
}

export function applyHomeRegionCandidateFilter(
  drafts: LocalDetectedTripDraft[],
  homeRegion?: LivingArea | null,
  radiusKm = HOME_REGION_EXCLUSION_RADIUS_KM,
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

      for (const group of draft.days.flatMap((day) => day.groups)) {
        group.coordinateSource = undefined;
        group.distanceFromHomeKm = undefined;
        group.homeRegionRelation = undefined;
      }
    }

    return drafts.map((draft) => ({
      draftId: draft.id,
      result: evaluateCandidateHomeRegionVisibility(draft, null, radiusKm),
    }));
  }

  const effectiveRadiusKm = getEffectiveHomeRegionRadiusKm(homeRegion, radiusKm);

  return drafts.map((draft) => {
    if (__DEV__) {
      console.info('[photo-import home region] candidate evaluation started', {
        draftId: draft.id,
        effectiveRadiusKm,
        homeRegionCandidateEvaluationStarted: true,
        homeRegionDisplayName: homeRegion.displayName,
        homeRegionScope: homeRegion.scope,
        scanAttemptId,
      });
    }

    const result = evaluateCandidateHomeRegionVisibility(draft, homeRegion, radiusKm);

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

    for (const [groupIndex, group] of draft.days.flatMap((day) => day.groups).entries()) {
      const groupResult = classifyGroupAgainstHomeRegion(group, homeRegion, radiusKm);
      group.coordinateSource = groupResult.coordinateSource;
      group.distanceFromHomeKm = groupResult.distanceFromHomeKm;
      group.homeRegionRelation = groupResult.relation;

      if (__DEV__) {
        console.info('[photo-import home region] group distance evaluated', {
          coordinateSource: groupResult.coordinateSource,
          distanceKm: groupResult.distanceFromHomeKm,
          draftId: draft.id,
          effectiveRadiusKm,
          groupIndex,
          homeRegionGroupDistanceEvaluated: true,
          photoCount: groupResult.photoCount,
          relation: groupResult.relation,
          scanAttemptId,
        });
      }
    }

    if (__DEV__) {
      console.info('[photo-import home region] candidate evaluation completed', {
        draftId: draft.id,
        effectiveRadiusKm,
        hiddenReason: result.hiddenReason,
        homeRegionCandidateEvaluationCompleted: true,
        homeRegionDisplayName: homeRegion.displayName,
        insideGroupCount: result.insideGroupCount,
        locatedGroupCount: result.locatedGroupCount,
        meaningfulOutsideGroupCount: result.meaningfulOutsideGroupCount,
        outsideGroupCount: result.outsideGroupCount,
        scanAttemptId,
        shouldHide: result.shouldHide,
        startDate: draft.startDate,
        endDate: draft.endDate,
        unknownGroupCount: result.unknownGroupCount,
      });
    }

    return {
      draftId: draft.id,
      result,
    };
  });
}
