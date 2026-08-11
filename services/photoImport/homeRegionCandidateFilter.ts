import * as Location from 'expo-location';

import type { LivingArea } from '@/services/location/livingAreas';
import type {
  LocalDetectedPhoto,
  LocalDetectedPlaceGroup,
  LocalDetectedTripDraft,
} from '@/services/photoImport/localDetectedTripDraftStore';

export const HOME_REGION_EXCLUSION_RADIUS_KM = 25;

export type HomeRegionRelation = 'inside_home_region' | 'outside_home_region' | 'unknown';
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

const reverseGeocodeRegionCache = new Map<string, Promise<string | null>>();

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

async function reverseGeocodeAdministrativeArea(latitude: number, longitude: number) {
  const cacheKey = `${latitude.toFixed(3)},${longitude.toFixed(3)}`;
  const cached = reverseGeocodeRegionCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const request = Location.reverseGeocodeAsync({ latitude, longitude })
    .then((addresses) => {
      const address = addresses[0];
      return normalizeAdministrativeArea(
        address?.region ?? address?.city ?? address?.subregion ?? null,
      );
    })
    .catch(() => null);

  reverseGeocodeRegionCache.set(cacheKey, request);
  return request;
}

export async function classifyGroupAgainstHomeRegion(
  group: LocalDetectedPlaceGroup,
  homeRegion: LivingArea,
): Promise<HomeRegionGroupEvaluation> {
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

  const administrativeArea = await reverseGeocodeAdministrativeArea(
    coordinates.latitude,
    coordinates.longitude,
  );
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
  const evaluations = await Promise.all(
    groups.map((group) => classifyGroupAgainstHomeRegion(group, homeRegion)),
  );
  const insideGroupCount = evaluations.filter((result) => result.relation === 'inside_home_region').length;
  const outsideGroupCount = evaluations.filter((result) => result.relation === 'outside_home_region').length;
  const unknownGroupCount = evaluations.filter((result) => result.relation === 'unknown').length;
  const locatedGroupCount = insideGroupCount + outsideGroupCount;
  const distances = evaluations
    .map((result) => result.distanceFromHomeKm)
    .filter(isFiniteCoordinate);

  // A candidate is hidden only when every resolved address belongs to the configured
  // administrative region. Any resolved address in another city/province keeps it visible.
  const shouldHide = locatedGroupCount > 0 && insideGroupCount > 0 && outsideGroupCount === 0;

  return {
    farthestDistanceKm: distances.length ? Math.max(...distances) : undefined,
    hiddenReason: shouldHide ? 'hidden_home_region' : undefined,
    insideGroupCount,
    locatedGroupCount,
    meaningfulOutsideGroupCount: outsideGroupCount,
    nearestDistanceKm: distances.length ? Math.min(...distances) : undefined,
    outsideGroupCount,
    shouldHide,
    unknownGroupCount,
  };
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

  return Promise.all(drafts.map(async (draft) => {
    const groups = draft.days.flatMap((day) => day.groups);
    const groupEvaluations = await Promise.all(
      groups.map((group) => classifyGroupAgainstHomeRegion(group, homeRegion)),
    );
    const insideGroupCount = groupEvaluations.filter((result) => result.relation === 'inside_home_region').length;
    const outsideGroupCount = groupEvaluations.filter((result) => result.relation === 'outside_home_region').length;
    const unknownGroupCount = groupEvaluations.filter((result) => result.relation === 'unknown').length;
    const distances = groupEvaluations
      .map((result) => result.distanceFromHomeKm)
      .filter(isFiniteCoordinate);
    const result: HomeRegionCandidateVisibilityResult = {
      farthestDistanceKm: distances.length ? Math.max(...distances) : undefined,
      hiddenReason: insideGroupCount > 0 && outsideGroupCount === 0 ? 'hidden_home_region' : undefined,
      insideGroupCount,
      locatedGroupCount: insideGroupCount + outsideGroupCount,
      meaningfulOutsideGroupCount: outsideGroupCount,
      nearestDistanceKm: distances.length ? Math.min(...distances) : undefined,
      outsideGroupCount,
      shouldHide: insideGroupCount > 0 && outsideGroupCount === 0,
      unknownGroupCount,
    };

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
  }));
}
