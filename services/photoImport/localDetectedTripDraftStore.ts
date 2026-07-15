import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as MediaLibrary from 'expo-media-library';
import type { ImageSourcePropType } from 'react-native';

import type { LivingArea } from '@/services/location/livingAreas';
import {
  applyHomeRegionCandidateFilter,
  HOME_REGION_EXCLUSION_RADIUS_KM,
  hasValidHomeRegion,
  type HomeRegionCoordinateSource,
  type HomeRegionRelation,
} from '@/services/photoImport/homeRegionCandidateFilter';
import type {
  PhotoImportCandidateDebugMetadata,
  PhotoImportOverseasTitleSource,
  PhotoImportCandidateQualityType,
  PhotoImportCandidateSplitReason,
  PhotoImportCandidateTitleCoordinateSource,
  PhotoImportCandidateTitleLocationSource,
  PhotoImportConfidenceLevel,
  PhotoImportTripCandidate,
} from '@/services/photoImport/types';

const PLACE_GROUPING_DISTANCE_THRESHOLD_METERS = 1000;
const TRIP_DAY_GAP_THRESHOLD_DAYS = 2;
const PHOTO_SCAN_PAGE_SIZE = 100;
const RECENT_PHOTO_SCAN_LOOKBACK_MONTHS = 12;
const MIN_PHOTOS_PER_DAY = 5;
const MIN_PHOTOS_PER_TRIP_CANDIDATE = 10;
const MAX_CONTINUOUS_TRIP_DAYS = 10;
const MAX_PHOTOS_PER_TRIP_CANDIDATE = 200;
const TRIP_LOCATION_SPLIT_DISTANCE_METERS = 30000;
const MIN_REAL_PHOTOS_PER_VISIBLE_CANDIDATE = 10;
const MIN_SHORT_TRIP_REAL_PHOTOS = 15;
const MIN_LONG_TRIP_REAL_PHOTOS = 30;
const MIN_SINGLE_DAY_VISIBLE_PHOTOS = 20;
const MIN_ONE_DAY_STRICT_REAL_PHOTOS = 30;
const MIN_ONE_DAY_STRICT_GPS_PHOTOS = 10;
const MIN_ONE_DAY_RELAXED_DISTANCE_KM = 10;
const MIN_VISIBLE_GPS_PHOTOS = 5;
const MIN_SINGLE_DAY_DISTANCE_KM = 3;
const LONG_TRIP_MIN_DAYS = 8;
const LONG_TRIP_MAX_DAYS = 45;
const LONG_STAY_MIN_DAYS = 15;
const LONG_STAY_MAX_DAYS = 90;
const LONG_TRIP_MERGE_MAX_GAP_DAYS = 5;
const LONG_TRIP_MERGE_MAX_CENTROID_DISTANCE_KM = 2500;
const REPEATED_LOCAL_CLUSTER_GRID_DEGREES = 0.05;
const REPEATED_LOCAL_CLUSTER_HIDE_COUNT = 5;
const REPEATED_LOCAL_EVENT_HIDE_COUNT = 3;
const REPEATED_LOCAL_LOW_COUNT = 2;
const SAVED_IMAGE_HEAVY_RATIO = 0.5;
const MOSTLY_SCREENSHOT_RATIO = 0.5;
const CONFIDENCE_HIGH_THRESHOLD = 70;
const CONFIDENCE_MEDIUM_THRESHOLD = 40;
const CONFIDENCE_WIDE_DISTANCE_KM = TRIP_LOCATION_SPLIT_DISTANCE_METERS / 1000;
const CONFIDENCE_TOO_MANY_PHOTOS = MAX_PHOTOS_PER_TRIP_CANDIDATE;
const CONFIDENCE_LOW_DISPLAYABLE_RATIO = 0.1;
const CONFIDENCE_HIGH_NO_GPS_RATIO = 0.8;
const UNKNOWN_LOCATION_LABEL = '\uC704\uCE58 \uC815\uBCF4 \uC5C6\uB294 \uC0AC\uC9C4';
const LOCATED_PHOTO_LABEL = '\uC704\uCE58 \uADF8\uB8F9';
const DETECTED_TRIP_TITLE = '\uC0AC\uC9C4\uCCA9 \uC5EC\uD589 \uD6C4\uBCF4';
const PENDING_LOCATION_TITLE = '\uC9C0\uC5ED \uD655\uC778 \uC911';
const LOCATION_BASED_TRIP_TITLE = '\uC704\uCE58 \uAE30\uBC18 \uC5EC\uD589';
const OVERSEAS_TRIP_TITLE = '\uD574\uC678 \uC5EC\uD589';
const UNRESOLVED_REGION_TITLE = '\uC9C0\uC5ED \uBBF8\uD655\uC778 \uC5EC\uD589';
const SAFE_PLACEHOLDER_IMAGE_URI =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
const COVER_HYDRATION_MAX_ASSETS_PER_CANDIDATE = 5;
const COVER_HYDRATION_INITIAL_CANDIDATE_LIMIT = 15;
const COVER_HYDRATION_DELAY_MS = 400;
const COVER_HYDRATION_TIMEOUT_MS = 4000;
const DETAIL_HYDRATION_MAX_PHOTOS_PER_GROUP = 3;
const DETAIL_HYDRATION_MAX_TOTAL_PHOTOS = 15;
const TITLE_REVERSE_GEOCODE_VISIBLE_LIMIT = 50;
const REVERSE_GEOCODE_DELAY_MS = 400;
const PENDING_TITLE_MAX_AGE_MS = 20000;
const AFTER_MAY_2024_CUTOFF_TIME = Date.UTC(2024, 5, 1);
const WEEKDAY_LABELS = ['\uC77C', '\uC6D4', '\uD654', '\uC218', '\uBAA9', '\uAE08', '\uD1A0'] as const;
const DAY_MS = 24 * 60 * 60 * 1000;

export type PhotoLibraryScanPermissionState = 'all' | 'limited' | 'denied';

export interface LocalDetectedPhoto {
  id: string;
  assetId?: string;
  assetUri?: string;
  displayUri: string | null;
  hasLocation: boolean;
  localUri?: string | null;
  uri: string | null;
  width: number;
  height: number;
  takenAt: string;
  filename?: string;
  fileExtension?: string;
  hasCameraExif: boolean;
  isScreenshot: boolean;
  isLikelyCameraPhoto: boolean;
  isLikelySavedImage: boolean;
  mediaType?: string;
  mediaSubtypes?: string[];
  latitude?: number;
  longitude?: number;
}

export interface LocalDetectedPlaceGroup {
  id: string;
  label: string;
  dateKey: string;
  time: string;
  photos: LocalDetectedPhoto[];
  latitude?: number;
  longitude?: number;
  centroidLat?: number;
  centroidLng?: number;
  coordinateSource?: HomeRegionCoordinateSource;
  distanceFromHomeKm?: number;
  groupDisplayName?: string;
  groupLocationLabel?: string;
  homeRegionRelation?: HomeRegionRelation;
}

export interface LocalDetectedTripDraftDay {
  id: string;
  dayNumber: number;
  dateKey: string;
  dateLabel: string;
  weekdayLabel: string;
  photoCount: number;
  groups: LocalDetectedPlaceGroup[];
}

export interface LocalDetectedTripDraft {
  id: string;
  source: 'photoLibrary';
  title: string;
  startDate: string;
  endDate: string;
  createdAt: string;
  photoCount: number;
  thumbnailCount: number;
  centroidLat?: number;
  centroidLng?: number;
  coverPhotoUri?: string;
  coverAssetId?: string;
  debugMetadata: PhotoImportCandidateDebugMetadata;
  displayTitle: string;
  enrichmentStatus:
    | 'pending'
    | 'pending_background'
    | 'success'
    | 'failed'
    | 'rate_limited'
    | 'skipped'
    | 'finalized_without_label';
  fallbackTitle: string;
  locationLabel?: string;
  regionLabel?: string;
  saveError?: string;
  savedTripId?: string;
  saveStatus?: 'idle' | 'saving' | 'saved' | 'failed';
  candidateFingerprint?: string;
  candidatePhotoIdentifiers?: string[];
  days: LocalDetectedTripDraftDay[];
}

export interface PhotoLibraryScanProgress {
  totalAssetCount: number;
  scannedAssetCount: number;
  currentPage: number;
  hasNextPage: boolean;
  detectedCandidateCount: number;
  scanAttemptId?: string;
}

export interface PhotoLibraryScanResult {
  scanAttemptId: string;
  permissionState: PhotoLibraryScanPermissionState;
  totalAssetCount: number;
  scannedAssetCount: number;
  pageCount: number;
  assetsWithLocationCount: number;
  assetsWithoutLocationCount: number;
  assetsWithDisplayUriCount: number;
  assetsWithoutDisplayUriCount: number;
  skippedPhUriCount: number;
  oversizedCandidateSplitCount: number;
  detectedTripCandidateCount: number;
  visibleDetectedTripCandidateCount: number;
  hiddenLowConfidenceCandidateCount: number;
  hiddenHomeRegionCandidateCount?: number;
  hiddenNoLocationTitleCandidateCount: number;
  hiddenScreenshotCandidateCount: number;
  hiddenTooFewRealPhotosCandidateCount: number;
  hiddenWeakSingleDayCandidateCount: number;
  hiddenLowGpsPhotoCandidateCount: number;
  duplicateCandidateCount: number;
  livingAreaApplied: boolean;
  livingAreaDisplayName?: string;
  livingAreaExcludedPhotoCount: number;
  livingAreaUnclassifiedPhotoCount: number;
  pendingEnrichmentCandidateCount: number;
  photosAfterScreenshotFilterCount: number;
  drafts: LocalDetectedTripDraft[];
  candidates: PhotoImportTripCandidate[];
  savedDetectedCandidateRegistryLoadedCount: number;
  detectedCandidateFingerprintComputedCount: number;
  detectedCandidateHiddenByExactFingerprintCount: number;
  detectedCandidateHiddenByPhotoOverlapCount: number;
  detectedCandidateVisibleAfterSavedFilterCount: number;
  skippedScreenshotCount: number;
}

interface PhotoLibraryScanOptions {
  createdAfter?: Date | number;
  homeRegionFilterSkipReason?: 'not_configured' | 'skipped_by_user' | 'invalid_coordinates' | 'storage_not_ready';
  livingArea?: LivingArea | null;
  pageSize?: number;
  savedRegistryUserId?: string | null;
  onProgress?: (progress: PhotoLibraryScanProgress) => void;
  onCandidatesUpdated?: (candidates: PhotoImportTripCandidate[]) => void;
  source?: 'home' | 'onboarding';
}

type PickedPhotoAsset = ImagePicker.ImagePickerAsset;
type ScannedAsset = MediaLibrary.AssetInfo | MediaLibrary.Asset;
type DateBucket = ReturnType<typeof createDateBuckets>[number];
type ReverseGeocodeResult = {
  address?: Location.LocationGeocodedAddress | null;
  failed: boolean;
  label: string | null;
  rateLimited: boolean;
};

type DetectedTripDisplayTitleResult = {
  displayTitle: string;
  overseasTitleSource?: PhotoImportOverseasTitleSource;
  reason: string;
};

interface CandidatePhotoChunk {
  photos: LocalDetectedPhoto[];
  splitReason: PhotoImportCandidateSplitReason;
  dateGapSplitCount: number;
  oversizedSplitCount: number;
}

interface CandidateGenerationStats {
  candidateCountAfterLongTripMerge: number;
  initialRangeCandidateCount: number;
  longTripCandidateCount: number;
  longTripPostMergeCount: number;
  oneDayCandidateCount: number;
  rawDateBucketCount: number;
  shortTripCandidateCount: number;
  splitByDateGapCount: number;
  splitByDistanceCount: number;
  splitByGpsMixedCount: number;
}

const drafts = new Map<string, LocalDetectedTripDraft>();
const processedCandidateFingerprints = new Set<string>();
const assetDisplayUriCache = new Map<string, Promise<string | null>>();
const coverHydrationFailedDraftIds = new Set<string>();
const coverHydrationInFlightDraftIds = new Set<string>();
const coverHydrationCompletedDraftIds = new Set<string>();
const reverseGeocodeCache = new Map<string, Promise<ReverseGeocodeResult>>();
const REVERSE_GEOCODE_TIMEOUT_MS = 2500;
const SAVED_DETECTED_CANDIDATE_REGISTRY_VERSION = 1;
const SAVED_DETECTED_CANDIDATE_REGISTRY_PREFIX = 'travu:saved-detected-candidates:v1';
const SAVED_DETECTED_CANDIDATE_REGISTRY_MAX_ENTRIES = 300;
const SAVED_CANDIDATE_OVERLAP_MIN_COMMON_PHOTOS = 5;
const SAVED_CANDIDATE_OVERLAP_RATIO = 0.9;

interface SavedDetectedCandidateRegistryEntry {
  endDate: string;
  fingerprint: string;
  photoIdentifiers: string[];
  savedAt: string;
  savedTripId: string;
  startDate: string;
}

interface SavedDetectedCandidateRegistryState {
  entries: SavedDetectedCandidateRegistryEntry[];
  userId: string;
  version: number;
}

type SavedCandidateMatchReason = 'exact_fingerprint' | 'photo_overlap';

interface SavedCandidateMatch {
  entry: SavedDetectedCandidateRegistryEntry;
  reason: SavedCandidateMatchReason;
}

const savedDetectedCandidateRegistry = new Map<string, SavedDetectedCandidateRegistryEntry>();
let savedDetectedCandidateRegistryUserId: string | null = null;
let savedDetectedCandidateRegistryLoaded = false;

function isFiniteCoordinateValue(value?: number | null): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isRenderableImageUri(uri?: string | null): uri is string {
  if (!uri) {
    return false;
  }

  return (
    uri.startsWith('file://') ||
    uri.startsWith('http://') ||
    uri.startsWith('https://') ||
    uri.startsWith('data:')
  );
}

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getSavedDetectedCandidateRegistryKey(userId: string) {
  return `${SAVED_DETECTED_CANDIDATE_REGISTRY_PREFIX}:${encodeURIComponent(userId)}`;
}

function stableHash(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36);
}

function getPhotoStableIdentifier(photo: LocalDetectedPhoto) {
  const assetId = normalizeStorageText(photo.assetId);

  if (assetId) {
    return `asset:${assetId}`;
  }

  const stablePhotoId = normalizeStorageText(photo.id);

  if (stablePhotoId) {
    return `photo:${stablePhotoId}`;
  }

  const metadata = [
    normalizeStorageText(photo.takenAt),
    normalizeStorageText(photo.filename),
    photo.width,
    photo.height,
  ].join('|');

  return `meta:${metadata}`;
}

function normalizeStorageText(value?: string | null) {
  return value?.trim() ?? '';
}

function getDraftPhotoIdentifiers(draft: LocalDetectedTripDraft) {
  const identifiers = getDraftPhotos(draft)
    .map(getPhotoStableIdentifier)
    .filter(Boolean);

  return [...new Set(identifiers)].sort();
}

function createDetectedCandidateFingerprint(photoIdentifiers: string[]) {
  return `photo-candidate:v1:${stableHash(photoIdentifiers.join('\n'))}`;
}

function syncDraftSavedCandidateFingerprint(draft: LocalDetectedTripDraft) {
  const photoIdentifiers = draft.candidatePhotoIdentifiers?.length
    ? [...draft.candidatePhotoIdentifiers].sort()
    : getDraftPhotoIdentifiers(draft);
  const fingerprint = draft.candidateFingerprint ??
    createDetectedCandidateFingerprint(photoIdentifiers);

  draft.candidatePhotoIdentifiers = photoIdentifiers;
  draft.candidateFingerprint = fingerprint;

  return {
    fingerprint,
    photoIdentifiers,
  };
}

function parseDateKeyTime(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);

  if (!year || !month || !day) {
    return NaN;
  }

  return Date.UTC(year, month - 1, day);
}

function getDateTimestamp(value: string | number | Date | null | undefined) {
  if (value instanceof Date) {
    const timestamp = value.getTime();
    return Number.isFinite(timestamp) ? timestamp : null;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string') {
    const timestamp = Date.parse(value);
    return Number.isFinite(timestamp) ? timestamp : null;
  }

  return null;
}

function summarizeDateTimestamps(timestamps: Array<number | null>) {
  const validTimestamps = timestamps.filter((timestamp): timestamp is number => (
    typeof timestamp === 'number' && Number.isFinite(timestamp)
  ));
  const earliestTimestamp = validTimestamps.length ? Math.min(...validTimestamps) : null;
  const latestTimestamp = validTimestamps.length ? Math.max(...validTimestamps) : null;

  return {
    count: timestamps.length,
    earliestCreationDate: earliestTimestamp === null
      ? null
      : new Date(earliestTimestamp).toISOString(),
    latestCreationDate: latestTimestamp === null
      ? null
      : new Date(latestTimestamp).toISOString(),
    photosAfter2024MayCount: validTimestamps.filter(
      (timestamp) => timestamp >= AFTER_MAY_2024_CUTOFF_TIME,
    ).length,
    photosIn2024Count: validTimestamps.filter((timestamp) => (
      new Date(timestamp).getUTCFullYear() === 2024
    )).length,
    photosIn2025Count: validTimestamps.filter((timestamp) => (
      new Date(timestamp).getUTCFullYear() === 2025
    )).length,
    photosIn2026Count: validTimestamps.filter((timestamp) => (
      new Date(timestamp).getUTCFullYear() === 2026
    )).length,
  };
}

function summarizeAssetDates(assets: Array<{ creationTime?: number | null }>) {
  return summarizeDateTimestamps(assets.map((asset) => getDateTimestamp(asset.creationTime ?? null)));
}

function summarizePhotoDates(photosToSummarize: LocalDetectedPhoto[]) {
  return summarizeDateTimestamps(photosToSummarize.map((photo) => getDateTimestamp(photo.takenAt)));
}

function summarizeDraftPhotoDates(draftsToSummarize: LocalDetectedTripDraft[]) {
  return summarizePhotoDates(draftsToSummarize.flatMap(getDraftPhotos));
}

function draftHasPhotoAfter2024May(draft: LocalDetectedTripDraft) {
  return getDraftPhotos(draft).some((photo) => {
    const timestamp = getDateTimestamp(photo.takenAt);
    return timestamp !== null && timestamp >= AFTER_MAY_2024_CUTOFF_TIME;
  });
}

function draftStartsAfter2024May(draft: LocalDetectedTripDraft) {
  const timestamp = parseDateKeyTime(draft.startDate);
  return Number.isFinite(timestamp) && timestamp >= AFTER_MAY_2024_CUTOFF_TIME;
}

function countDraftsAfter2024May(draftsToCount: LocalDetectedTripDraft[]) {
  return draftsToCount.filter((draft) => (
    draftStartsAfter2024May(draft) || draftHasPhotoAfter2024May(draft)
  )).length;
}

function logPhotoScanDateRangeSummary(
  label: string,
  summary: ReturnType<typeof summarizeDateTimestamps>,
  extra: Record<string, unknown> = {},
) {
  if (!__DEV__) {
    return;
  }

  console.info(`[photo-import scan] ${label}`, {
    ...summary,
    ...extra,
  });
}

function createPhotoScanAttemptId() {
  return `photo-scan-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatScanBoundaryDate(value?: Date | number) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return new Date(value).toISOString();
  }

  return undefined;
}

function getCandidateRejectionStage(draft: LocalDetectedTripDraft) {
  const savedReason = getSavedCandidateMatchReason(draft);
  const hiddenReasons = getCandidateHiddenReasons(draft);

  if (canShowDraftAsCandidate(draft)) {
    return 'visible';
  }

  if (savedReason) {
    return 'saved_candidate_filter';
  }

  if (hiddenReasons.includes('hidden_home_region')) {
    return 'home_region_filter';
  }

  if (hiddenReasons.some((reason) => (
    reason.includes('repeated') ||
    reason.includes('daily_life') ||
    reason.includes('daily_event') ||
    reason.includes('low_mobility') ||
    reason.includes('merged_daily_events')
  ))) {
    return 'repeated_local_or_daily_life_filter';
  }

  if (
    hiddenReasons.includes('confidence_low') ||
    hiddenReasons.includes('location_title_unresolved_low_confidence')
  ) {
    return 'confidence_filter';
  }

  if (hiddenReasons.length > 0) {
    return 'visibility_filter';
  }

  return 'unknown';
}

function compareDateKeys(left?: string | null, right?: string | null) {
  const leftTime = left ? parseDateKeyTime(left) : Number.POSITIVE_INFINITY;
  const rightTime = right ? parseDateKeyTime(right) : Number.POSITIVE_INFINITY;
  const safeLeftTime = Number.isFinite(leftTime) ? leftTime : Number.POSITIVE_INFINITY;
  const safeRightTime = Number.isFinite(rightTime) ? rightTime : Number.POSITIVE_INFINITY;

  return safeLeftTime - safeRightTime;
}

function sortDetectedDraftsOldestFirst(draftsToSort: LocalDetectedTripDraft[]) {
  return draftsToSort
    .map((draft, index) => ({ draft, index }))
    .sort((left, right) => {
      const startDiff = compareDateKeys(left.draft.startDate, right.draft.startDate);

      if (startDiff !== 0) {
        return startDiff;
      }

      const endDiff = compareDateKeys(left.draft.endDate, right.draft.endDate);

      if (endDiff !== 0) {
        return endDiff;
      }

      const idDiff = left.draft.id.localeCompare(right.draft.id);

      return idDiff !== 0 ? idDiff : left.index - right.index;
    })
    .map(({ draft }) => draft);
}

export function sortDetectedCandidatesOldestFirst(candidatesToSort: PhotoImportTripCandidate[]) {
  return candidatesToSort
    .map((candidate, index) => ({ candidate, index }))
    .sort((left, right) => {
      const leftMetadata = left.candidate.debugMetadata;
      const rightMetadata = right.candidate.debugMetadata;
      const startDiff = compareDateKeys(leftMetadata?.startDate, rightMetadata?.startDate);

      if (startDiff !== 0) {
        return startDiff;
      }

      const endDiff = compareDateKeys(leftMetadata?.endDate, rightMetadata?.endDate);

      if (endDiff !== 0) {
        return endDiff;
      }

      const idDiff = left.candidate.id.localeCompare(right.candidate.id);

      return idDiff !== 0 ? idDiff : left.index - right.index;
    })
    .map(({ candidate }) => candidate);
}

function getOutOfOrderPairCount<T>(
  items: T[],
  getStartDate: (item: T) => string | undefined,
  getEndDate: (item: T) => string | undefined,
) {
  let outOfOrderPairCount = 0;

  for (let index = 1; index < items.length; index += 1) {
    const previous = items[index - 1];
    const current = items[index];
    const startDiff = compareDateKeys(getStartDate(previous), getStartDate(current));
    const endDiff = compareDateKeys(getEndDate(previous), getEndDate(current));

    if (startDiff > 0 || (startDiff === 0 && endDiff > 0)) {
      outOfOrderPairCount += 1;
    }
  }

  return outOfOrderPairCount;
}

function logDetectedDraftStableSortSummary(
  stage: string,
  draftsToLog: LocalDetectedTripDraft[],
  scanAttemptId?: string,
) {
  if (!__DEV__) {
    return;
  }

  const outOfOrderPairCount = getOutOfOrderPairCount(
    draftsToLog,
    (draft) => draft.startDate,
    (draft) => draft.endDate,
  );

  console.info('[detectedCandidateStableSortSummary]', {
    candidateCount: draftsToLog.length,
    firstStartDate: draftsToLog[0]?.startDate,
    isAscending: outOfOrderPairCount === 0,
    lastStartDate: draftsToLog[draftsToLog.length - 1]?.startDate,
    outOfOrderPairCount,
    scanAttemptId,
    stage,
  });
}

function logDetectedCandidateStableSortSummary(
  stage: string,
  candidatesToLog: PhotoImportTripCandidate[],
  scanAttemptId?: string,
) {
  if (!__DEV__) {
    return;
  }

  const outOfOrderPairCount = getOutOfOrderPairCount(
    candidatesToLog,
    (candidate) => candidate.debugMetadata?.startDate,
    (candidate) => candidate.debugMetadata?.endDate,
  );

  console.info('[detectedCandidateStableSortSummary]', {
    candidateCount: candidatesToLog.length,
    firstStartDate: candidatesToLog[0]?.debugMetadata?.startDate,
    isAscending: outOfOrderPairCount === 0,
    lastStartDate: candidatesToLog[candidatesToLog.length - 1]?.debugMetadata?.startDate,
    outOfOrderPairCount,
    scanAttemptId,
    stage,
  });
}

function logRecentCandidateLifecycle(
  stage: string,
  draftsToLog: LocalDetectedTripDraft[],
  scanAttemptId?: string,
) {
  if (!__DEV__) {
    return;
  }

  draftsToLog.forEach((draft, listIndex) => {
    if (!draftStartsAfter2024May(draft) && !draftHasPhotoAfter2024May(draft)) {
      return;
    }

    const hiddenReasons = getCandidateHiddenReasons(draft);

    console.info('[recentCandidateLifecycle]', {
      draftId: draft.id,
      hiddenReason: hiddenReasons[0] ?? getSavedCandidateMatchReason(draft),
      listIndex,
      present: true,
      scanAttemptId,
      stage,
      startDate: draft.startDate,
    });
  });
}

function areSavedCandidateDateRangesClose(
  draft: LocalDetectedTripDraft,
  entry: SavedDetectedCandidateRegistryEntry,
) {
  const draftStart = parseDateKeyTime(draft.startDate);
  const draftEnd = parseDateKeyTime(draft.endDate);
  const savedStart = parseDateKeyTime(entry.startDate);
  const savedEnd = parseDateKeyTime(entry.endDate);

  if (
    Number.isNaN(draftStart) ||
    Number.isNaN(draftEnd) ||
    Number.isNaN(savedStart) ||
    Number.isNaN(savedEnd)
  ) {
    return false;
  }

  const dayMs = DAY_MS;
  const startDiffDays = Math.abs(draftStart - savedStart) / dayMs;
  const endDiffDays = Math.abs(draftEnd - savedEnd) / dayMs;
  const overlapStart = Math.max(draftStart, savedStart);
  const overlapEnd = Math.min(draftEnd, savedEnd);
  const overlapDays = Math.max(0, Math.round((overlapEnd - overlapStart) / dayMs) + 1);
  const draftDays = Math.max(1, Math.round((draftEnd - draftStart) / dayMs) + 1);
  const savedDays = Math.max(1, Math.round((savedEnd - savedStart) / dayMs) + 1);

  return (
    (startDiffDays <= 1 && endDiffDays <= 1) ||
    overlapDays / Math.min(draftDays, savedDays) >= 0.8
  );
}

function getSavedCandidatePhotoOverlapMatch(
  draft: LocalDetectedTripDraft,
  photoIdentifiers: string[],
) {
  if (photoIdentifiers.length < SAVED_CANDIDATE_OVERLAP_MIN_COMMON_PHOTOS) {
    return null;
  }

  const candidateIdentifierSet = new Set(photoIdentifiers);

  for (const entry of savedDetectedCandidateRegistry.values()) {
    if (!areSavedCandidateDateRangesClose(draft, entry)) {
      continue;
    }

    const smallerSetSize = Math.min(photoIdentifiers.length, entry.photoIdentifiers.length);

    if (smallerSetSize < SAVED_CANDIDATE_OVERLAP_MIN_COMMON_PHOTOS) {
      continue;
    }

    let commonPhotoCount = 0;

    for (const identifier of entry.photoIdentifiers) {
      if (candidateIdentifierSet.has(identifier)) {
        commonPhotoCount += 1;
      }
    }

    if (
      commonPhotoCount >= SAVED_CANDIDATE_OVERLAP_MIN_COMMON_PHOTOS &&
      commonPhotoCount / smallerSetSize >= SAVED_CANDIDATE_OVERLAP_RATIO
    ) {
      return entry;
    }
  }

  return null;
}

function getSavedDetectedCandidateMatch(draft: LocalDetectedTripDraft): SavedCandidateMatch | null {
  if (!savedDetectedCandidateRegistryLoaded) {
    return null;
  }

  const { fingerprint, photoIdentifiers } = syncDraftSavedCandidateFingerprint(draft);
  const exactEntry = savedDetectedCandidateRegistry.get(fingerprint);

  if (exactEntry) {
    return {
      entry: exactEntry,
      reason: 'exact_fingerprint',
    };
  }

  const overlapEntry = getSavedCandidatePhotoOverlapMatch(draft, photoIdentifiers);

  if (overlapEntry) {
    return {
      entry: overlapEntry,
      reason: 'photo_overlap',
    };
  }

  return null;
}

function getSavedCandidateMatchReason(draft: LocalDetectedTripDraft) {
  return getSavedDetectedCandidateMatch(draft)?.reason ?? null;
}

function getMaskedFingerprint(fingerprint?: string | null) {
  return fingerprint ? `${fingerprint.slice(0, 24)}...` : null;
}

async function persistSavedDetectedCandidateRegistry() {
  if (!savedDetectedCandidateRegistryUserId) {
    return;
  }

  const entries = [...savedDetectedCandidateRegistry.values()]
    .sort((left, right) => right.savedAt.localeCompare(left.savedAt))
    .slice(0, SAVED_DETECTED_CANDIDATE_REGISTRY_MAX_ENTRIES);
  const state: SavedDetectedCandidateRegistryState = {
    entries,
    userId: savedDetectedCandidateRegistryUserId,
    version: SAVED_DETECTED_CANDIDATE_REGISTRY_VERSION,
  };

  await AsyncStorage.setItem(
    getSavedDetectedCandidateRegistryKey(savedDetectedCandidateRegistryUserId),
    JSON.stringify(state),
  );
}

function formatDateLabel(date: Date): string {
  return `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}`;
}

function formatEntryTime(date: Date): string {
  const hour24 = date.getHours();
  const hour12 = hour24 % 12 || 12;
  const minute = date.getMinutes();
  const period = hour24 >= 12 ? 'PM' : 'AM';

  return minute === 0
    ? `${hour12} ${period}`
    : `${hour12}:${String(minute).padStart(2, '0')} ${period}`;
}

function parseExifDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  const exifMatched = normalized.match(/^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);

  if (exifMatched) {
    return new Date(
      Number(exifMatched[1]),
      Number(exifMatched[2]) - 1,
      Number(exifMatched[3]),
      Number(exifMatched[4]),
      Number(exifMatched[5]),
      Number(exifMatched[6] ?? 0),
    );
  }

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getScannedAssetDate(asset: ScannedAsset, fallbackDate: Date): Date {
  const exif = 'exif' in asset && asset.exif ? asset.exif as Record<string, unknown> : {};
  const candidates = [
    exif.DateTimeOriginal,
    exif.DateTimeDigitized,
    exif.DateTime,
    exif.CreationDate,
    asset.creationTime,
    asset.modificationTime,
  ];

  for (const candidate of candidates) {
    const date = parseExifDate(candidate);

    if (date) {
      return date;
    }
  }

  return fallbackDate;
}

function getPickedAssetDate(asset: PickedPhotoAsset, fallbackDate: Date): Date {
  const exif = asset.exif ?? {};
  const runtimeAsset = asset as PickedPhotoAsset & {
    creationTime?: number | string;
    modificationTime?: number | string;
  };
  const candidates = [
    exif.DateTimeOriginal,
    exif.DateTimeDigitized,
    exif.DateTime,
    exif.CreationDate,
    runtimeAsset.creationTime,
    runtimeAsset.modificationTime,
  ];

  for (const candidate of candidates) {
    const date = parseExifDate(candidate);

    if (date) {
      return date;
    }
  }

  return fallbackDate;
}

function readCoordinateValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  if (Array.isArray(value) && value.length >= 3) {
    const degrees = Number(value[0]);
    const minutes = Number(value[1]);
    const seconds = Number(value[2]);

    if ([degrees, minutes, seconds].every(Number.isFinite)) {
      return degrees + minutes / 60 + seconds / 3600;
    }
  }

  return null;
}

function applyCoordinateRef(value: number | null, ref: unknown): number | null {
  if (value == null) {
    return null;
  }

  if (typeof ref === 'string' && ['S', 'W'].includes(ref.toUpperCase())) {
    return -Math.abs(value);
  }

  return value;
}

function normalizeCoordinatePair(
  latitude: unknown,
  longitude: unknown,
): { latitude: number; longitude: number } | null {
  const parsedLatitude = readCoordinateValue(latitude);
  const parsedLongitude = readCoordinateValue(longitude);

  if (
    parsedLatitude == null ||
    parsedLongitude == null ||
    !Number.isFinite(parsedLatitude) ||
    !Number.isFinite(parsedLongitude) ||
    parsedLatitude < -90 ||
    parsedLatitude > 90 ||
    parsedLongitude < -180 ||
    parsedLongitude > 180
  ) {
    return null;
  }

  return {
    latitude: parsedLatitude,
    longitude: parsedLongitude,
  };
}

function readObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function normalizeStringArray(value: unknown): string[] {
  if (typeof value === 'string') {
    return [value.toLowerCase()];
  }

  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.toLowerCase());
}

function readMediaSubtypes(source: unknown): string[] {
  const object = readObject(source);

  if (!object) {
    return [];
  }

  return [
    ...normalizeStringArray(object.mediaSubtypes),
    ...normalizeStringArray(object.mediaSubtype),
  ];
}

function containsScreenshotText(value?: string | null) {
  return Boolean(value && /screenshot|screen shot|simulator screen shot|스크린샷|화면\s*캡처/i.test(value));
}

function readAssetFilename(asset: ScannedAsset | PickedPhotoAsset): string | undefined {
  const object = readObject(asset);

  if (!object) {
    return undefined;
  }

  return typeof object.filename === 'string'
    ? object.filename
    : typeof object.fileName === 'string'
      ? object.fileName
      : undefined;
}

function getFileExtension(filename?: string | null) {
  const matched = filename?.toLowerCase().match(/\.([a-z0-9]+)(?:\?.*)?$/);
  return matched?.[1];
}

function readExif(asset: ScannedAsset | PickedPhotoAsset) {
  const object = readObject(asset);
  return object && readObject(object.exif);
}

function hasCameraExif(asset: ScannedAsset | PickedPhotoAsset) {
  const exif = readExif(asset);

  if (!exif) {
    return false;
  }

  return Boolean(
    exif.Make ||
    exif.Model ||
    exif.LensModel ||
    exif.DateTimeOriginal ||
    exif.DateTimeDigitized,
  );
}

function hasCameraFilenamePattern(filename?: string | null) {
  return Boolean(filename && /^(IMG_|DSC_|PXL_|VID_|MVIMG_|DJI_)/i.test(filename));
}

function hasSavedImageFilenamePattern(filename?: string | null) {
  return Boolean(filename && /download|downloaded|save|saved|image|web|kakao|kakaotalk|instagram|pinterest/i.test(filename));
}

function isLikelySavedImageAsset(
  asset: ScannedAsset | PickedPhotoAsset,
  options: {
    coordinates: { latitude: number; longitude: number } | null;
    isScreenshot: boolean;
  },
) {
  if (options.isScreenshot || options.coordinates || hasCameraExif(asset)) {
    return false;
  }

  const filename = readAssetFilename(asset);
  const extension = getFileExtension(filename);

  return (
    hasSavedImageFilenamePattern(filename) ||
    ['png', 'webp', 'gif'].includes(extension ?? '')
  );
}

function isLikelyCameraPhotoAsset(
  asset: ScannedAsset | PickedPhotoAsset,
  options: {
    coordinates: { latitude: number; longitude: number } | null;
    isLikelySavedImage: boolean;
    isScreenshot: boolean;
  },
) {
  if (options.isScreenshot || options.isLikelySavedImage) {
    return false;
  }

  return Boolean(
    options.coordinates ||
    hasCameraExif(asset) ||
    hasCameraFilenamePattern(readAssetFilename(asset)),
  );
}

function isScreenshotAsset(asset: ScannedAsset | PickedPhotoAsset): boolean {
  const object = readObject(asset);
  const exif = object && readObject(object.exif);
  const mediaSubtypes = readMediaSubtypes(asset);
  const filename = readAssetFilename(asset);

  if (mediaSubtypes.some((subtype) => subtype.includes('screenshot') || subtype.includes('screen'))) {
    return true;
  }

  if (containsScreenshotText(filename)) {
    return true;
  }

  if (!exif) {
    return false;
  }

  return Object.values(exif).some((value) => (
    typeof value === 'string' && containsScreenshotText(value)
  ));
}

function extractPhotoCoordinates(source: unknown): { latitude: number; longitude: number } | null {
  const object = readObject(source);

  if (!object) {
    return null;
  }

  const directCoordinates = normalizeCoordinatePair(object.latitude, object.longitude);

  if (directCoordinates) {
    return directCoordinates;
  }

  const coordsCoordinates = extractPhotoCoordinates(object.coords);

  if (coordsCoordinates) {
    return coordsCoordinates;
  }

  return extractPhotoCoordinates(object.location);
}

function getPickedAssetCoordinates(asset: PickedPhotoAsset): { latitude: number; longitude: number } | null {
  const exif = asset.exif ?? {};
  const runtimeAsset = asset as PickedPhotoAsset & {
    latitude?: number | string;
    longitude?: number | string;
  };
  const directCoordinates = extractPhotoCoordinates(runtimeAsset);

  if (directCoordinates) {
    return directCoordinates;
  }

  const latitude = applyCoordinateRef(
    readCoordinateValue(runtimeAsset.latitude ?? exif.GPSLatitude ?? exif.Latitude),
    exif.GPSLatitudeRef,
  );
  const longitude = applyCoordinateRef(
    readCoordinateValue(runtimeAsset.longitude ?? exif.GPSLongitude ?? exif.Longitude),
    exif.GPSLongitudeRef,
  );

  return normalizeCoordinatePair(latitude, longitude);
}

function getScannedAssetCoordinates(asset: ScannedAsset): { latitude: number; longitude: number } | null {
  const directCoordinates = extractPhotoCoordinates(asset);

  if (directCoordinates) {
    return directCoordinates;
  }

  const exif = 'exif' in asset && asset.exif ? asset.exif as Record<string, unknown> : {};
  const latitude = applyCoordinateRef(
    readCoordinateValue(exif.GPSLatitude ?? exif.Latitude),
    exif.GPSLatitudeRef,
  );
  const longitude = applyCoordinateRef(
    readCoordinateValue(exif.GPSLongitude ?? exif.Longitude),
    exif.GPSLongitudeRef,
  );

  return normalizeCoordinatePair(latitude, longitude);
}

function getDistanceMeters(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
): number {
  const earthRadiusMeters = 6371000;
  const toRadians = (degrees: number) => degrees * (Math.PI / 180);
  const latDelta = toRadians(to.latitude - from.latitude);
  const lonDelta = toRadians(to.longitude - from.longitude);
  const fromLat = toRadians(from.latitude);
  const toLat = toRadians(to.latitude);
  const a =
    Math.sin(latDelta / 2) * Math.sin(latDelta / 2) +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(lonDelta / 2) * Math.sin(lonDelta / 2);

  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function canJoinLocationGroup(
  group: LocalDetectedPlaceGroup,
  coordinates: { latitude: number; longitude: number },
) {
  if (group.latitude == null || group.longitude == null) {
    return false;
  }

  return getDistanceMeters(
    { latitude: group.latitude, longitude: group.longitude },
    coordinates,
  ) <= PLACE_GROUPING_DISTANCE_THRESHOLD_METERS;
}

function createDraftId(prefix = 'photo-draft') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getPhotoDateKey(photo: LocalDetectedPhoto) {
  return toDateKey(new Date(photo.takenAt));
}

function getPhotoCoordinates(photo: LocalDetectedPhoto) {
  return isFiniteCoordinateValue(photo.latitude) && isFiniteCoordinateValue(photo.longitude)
    ? { latitude: photo.latitude, longitude: photo.longitude }
    : null;
}

function createCandidateFingerprint(draft: LocalDetectedTripDraft) {
  const assetIds = draft.days
    .flatMap((day) => day.groups)
    .flatMap((group) => group.photos)
    .map((photo) => photo.assetId ?? photo.id)
    .filter(Boolean)
    .sort()
    .join(',');
  const centroidKey = isFiniteCoordinateValue(draft.centroidLat) && isFiniteCoordinateValue(draft.centroidLng)
    ? `${draft.centroidLat.toFixed(2)},${draft.centroidLng.toFixed(2)}`
    : 'no-centroid';

  return [
    draft.startDate,
    draft.endDate,
    centroidKey,
    assetIds,
  ].join('|');
}

function filterDuplicateCandidateDrafts(draftsToFilter: LocalDetectedTripDraft[]) {
  const uniqueDrafts: LocalDetectedTripDraft[] = [];
  let duplicateCandidateCount = 0;

  for (const draft of draftsToFilter) {
    const fingerprint = createCandidateFingerprint(draft);

    if (processedCandidateFingerprints.has(fingerprint)) {
      duplicateCandidateCount += 1;
      continue;
    }

    processedCandidateFingerprints.add(fingerprint);
    uniqueDrafts.push(draft);
  }

  return {
    duplicateCandidateCount,
    drafts: uniqueDrafts,
  };
}

function calculateCentroid(photos: LocalDetectedPhoto[]) {
  const locatedPhotos = photos.filter((photo) => (
    isFiniteCoordinateValue(photo.latitude) && isFiniteCoordinateValue(photo.longitude)
  ));

  if (locatedPhotos.length === 0) {
    return null;
  }

  return {
    latitude: locatedPhotos.reduce((total, photo) => total + (photo.latitude ?? 0), 0) / locatedPhotos.length,
    longitude: locatedPhotos.reduce((total, photo) => total + (photo.longitude ?? 0), 0) / locatedPhotos.length,
  };
}

function formatCandidateDateTitle(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return DETECTED_TRIP_TITLE;
  }

  const startLabel = `${start.getFullYear()}. ${start.getMonth() + 1}. ${start.getDate()}`;
  const endLabel = start.getFullYear() === end.getFullYear()
    ? `${end.getMonth() + 1}. ${end.getDate()}`
    : `${end.getFullYear()}. ${end.getMonth() + 1}. ${end.getDate()}`;

  return startDate === endDate
    ? `${startLabel} \uC5EC\uD589 \uD6C4\uBCF4`
    : `${startLabel} - ${endLabel} \uC5EC\uD589 \uD6C4\uBCF4`;
}

function normalizeRegionPart(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

function createLocationLabel(address?: Location.LocationGeocodedAddress | null) {
  if (!address) {
    return null;
  }

  const parts = [
    normalizeRegionPart(address.city),
    normalizeRegionPart(address.district),
    normalizeRegionPart(address.subregion),
    normalizeRegionPart(address.region),
    normalizeRegionPart(address.country),
  ].filter((part, index, allParts): part is string => (
    Boolean(part) && allParts.indexOf(part) === index
  ));

  return parts.slice(0, 2).join(' ') || null;
}

function getAddressCountry(address?: Location.LocationGeocodedAddress | null) {
  return normalizeRegionPart(address?.country)?.toLowerCase() ?? '';
}

function normalizeKoreanRegionName(value?: string | null) {
  const normalized = normalizeRegionPart(value)
    ?.replace(/특별자치시|특별자치도|특별시|광역시|자치구|시|군|구$/u, '')
    .trim();

  return normalized && normalized.length > 0 ? normalized : null;
}

function isKoreanAddress(address?: Location.LocationGeocodedAddress | null, locationLabel?: string | null) {
  const country = normalizeRegionPart(address?.country)?.toLowerCase();

  return (
    country === '대한민국' ||
    country === '한국' ||
    country === 'south korea' ||
    country === 'republic of korea' ||
    country === 'korea' ||
    Boolean(locationLabel && /특별시|광역시|시|군|구|동|읍|면/u.test(locationLabel))
  );
}

function getAddressParts(address?: Location.LocationGeocodedAddress | null, locationLabel?: string | null) {
  return [
    normalizeRegionPart(address?.city),
    normalizeRegionPart(address?.district),
    normalizeRegionPart(address?.subregion),
    normalizeRegionPart(address?.region),
    normalizeRegionPart(address?.name),
    ...(locationLabel?.split(/\s+/u).map(normalizeRegionPart) ?? []),
  ].filter((part, index, parts): part is string => Boolean(part) && parts.indexOf(part) === index);
}

function buildDomesticDisplayTitle(
  address?: Location.LocationGeocodedAddress | null,
  locationLabel?: string | null,
): DetectedTripDisplayTitleResult {
  const parts = getAddressParts(address, locationLabel);
  const hasSeoul = parts.some((part) => /서울/u.test(part));

  if (hasSeoul) {
    const neighborhood = parts.find((part) => /동$/u.test(part) && !/서울/u.test(part));
    const district = parts.find((part) => /구$/u.test(part) && !/서울/u.test(part));
    const titleCore = neighborhood ?? normalizeKoreanRegionName(district) ?? '서울';

    return {
      displayTitle: `${titleCore} 여행`,
      reason: neighborhood ? 'seoul_neighborhood' : 'seoul_district',
    };
  }

  const metropolitanCity = parts.find((part) => /광역시|특별자치시/u.test(part));

  if (metropolitanCity) {
    return {
      displayTitle: `${normalizeKoreanRegionName(metropolitanCity) ?? metropolitanCity} 여행`,
      reason: 'domestic_metropolitan_city',
    };
  }

  const cityOrCounty = parts.find((part) => /시$|군$/u.test(part) && !/광역시|특별시/u.test(part));

  if (cityOrCounty) {
    return {
      displayTitle: `${normalizeKoreanRegionName(cityOrCounty) ?? cityOrCounty} 여행`,
      reason: 'domestic_city_or_county',
    };
  }

  const fallbackPart = parts.find((part) => !/대한민국|한국/u.test(part));

  return {
    displayTitle: `${normalizeKoreanRegionName(fallbackPart) ?? fallbackPart ?? '지역'} 여행`,
    reason: 'domestic_region_fallback',
  };
}

function buildOverseasDisplayTitle(
  address?: Location.LocationGeocodedAddress | null,
  locationLabel?: string | null,
  latitude?: number,
  longitude?: number,
): DetectedTripDisplayTitleResult {
  const majorCity = getMajorOverseasCityTitle(address, locationLabel, latitude, longitude);
  const city = normalizeOverseasCityName(normalizeRegionPart(address?.city));
  const subregion = normalizeOverseasCityName(normalizeRegionPart(address?.subregion));
  const region = normalizeOverseasCityName(normalizeRegionPart(address?.region));
  const fallbackPart = locationLabel?.split(/\s+/u).map((part) => (
    normalizeOverseasCityName(normalizeRegionPart(part))
  )).find(Boolean);
  const titleCore = majorCity?.titleCore ?? city ?? subregion ?? region ?? fallbackPart;
  const overseasTitleSource = majorCity?.source ?? (
    city ? 'placemark_city' : titleCore ? 'region_fallback' : 'country_fallback'
  );

  return titleCore
    ? {
      displayTitle: `${titleCore} 여행`,
      overseasTitleSource,
      reason: overseasTitleSource === 'placemark_city' ? 'overseas_city' : overseasTitleSource,
    }
    : {
      displayTitle: PENDING_LOCATION_TITLE,
      overseasTitleSource: 'country_fallback' as const,
      reason: 'pending_location',
    };
}

function normalizeOverseasCityName(value?: string | null) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  const normalized = trimmed
    .replace(/\s+\d+(?:st|nd|rd|th)?\s+Arr\.?$/i, '')
    .replace(/\s+Arrondissement$/i, '')
    .replace(/\s+Centro\s+Storico$/i, '')
    .replace(/\s+County$/i, '')
    .replace(/\s+City\s+Council$/i, '')
    .trim();

  return normalized || trimmed;
}

function isCoordinateInsideBox(
  latitude: number | undefined,
  longitude: number | undefined,
  box: { maxLat: number; maxLng: number; minLat: number; minLng: number },
) {
  return (
    isFiniteCoordinateValue(latitude) &&
    isFiniteCoordinateValue(longitude) &&
    latitude >= box.minLat &&
    latitude <= box.maxLat &&
    longitude >= box.minLng &&
    longitude <= box.maxLng
  );
}

function getMajorCityByCoordinate(
  latitude?: number,
  longitude?: number,
): { source: PhotoImportOverseasTitleSource; titleCore: string } | null {
  if (isCoordinateInsideBox(latitude, longitude, {
    minLat: -34.2,
    maxLat: -33.4,
    minLng: 150.5,
    maxLng: 151.5,
  })) {
    return { source: 'major_city_bbox', titleCore: 'Sydney' };
  }

  if (isCoordinateInsideBox(latitude, longitude, {
    minLat: 48.7,
    maxLat: 49.05,
    minLng: 2.1,
    maxLng: 2.65,
  })) {
    return { source: 'major_city_bbox', titleCore: 'Paris' };
  }

  if (isCoordinateInsideBox(latitude, longitude, {
    minLat: 45.35,
    maxLat: 45.6,
    minLng: 9.0,
    maxLng: 9.35,
  })) {
    return { source: 'major_city_bbox', titleCore: 'Milan' };
  }

  if (isCoordinateInsideBox(latitude, longitude, {
    minLat: 35.45,
    maxLat: 35.9,
    minLng: 139.45,
    maxLng: 140.05,
  })) {
    return { source: 'major_city_bbox', titleCore: 'Tokyo' };
  }

  return null;
}

function getMajorCityByAddress(
  address?: Location.LocationGeocodedAddress | null,
  locationLabel?: string | null,
): { source: PhotoImportOverseasTitleSource; titleCore: string } | null {
  const normalizedParts = [
    address?.city,
    address?.district,
    address?.subregion,
    address?.region,
    locationLabel,
  ]
    .map((part) => normalizeRegionPart(part)?.toLowerCase())
    .filter((part): part is string => Boolean(part));
  const combined = normalizedParts.join(' ');
  const country = getAddressCountry(address);

  if (
    country === 'australia' &&
    /sydney|willoughby|chatswood|north sydney|bondi|surry hills/u.test(combined)
  ) {
    return { source: 'major_city_alias', titleCore: 'Sydney' };
  }

  if (/paris|île-de-france|ile-de-france|arr\./u.test(combined)) {
    return { source: 'major_city_alias', titleCore: 'Paris' };
  }

  if (/milan|milano|centro storico/u.test(combined)) {
    return { source: 'major_city_alias', titleCore: 'Milan' };
  }

  if (/tokyo/u.test(combined)) {
    return { source: 'major_city_alias', titleCore: 'Tokyo' };
  }

  return null;
}

function getMajorOverseasCityTitle(
  address?: Location.LocationGeocodedAddress | null,
  locationLabel?: string | null,
  latitude?: number,
  longitude?: number,
) {
  return (
    getMajorCityByCoordinate(latitude, longitude) ??
    getMajorCityByAddress(address, locationLabel)
  );
}

function buildDetectedTripDisplayTitle(
  address?: Location.LocationGeocodedAddress | null,
  locationLabel?: string | null,
  latitude?: number,
  longitude?: number,
): DetectedTripDisplayTitleResult {
  if (!locationLabel) {
    return { displayTitle: PENDING_LOCATION_TITLE, reason: 'pending_location' };
  }

  return isKoreanAddress(address, locationLabel)
    ? buildDomesticDisplayTitle(address, locationLabel)
    : buildOverseasDisplayTitle(address, locationLabel, latitude, longitude);
}

function getReverseGeocodeCacheKey(latitude: number, longitude: number) {
  return `${latitude.toFixed(3)},${longitude.toFixed(3)}`;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    const timeoutId = setTimeout(() => resolve(fallback), timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timeoutId);
        resolve(value);
      })
      .catch(() => {
        clearTimeout(timeoutId);
        resolve(fallback);
      });
  });
}

function isRateLimitError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  return /rate limit|too many requests/i.test(message);
}

async function reverseGeocodeLocationLabel(latitude?: number, longitude?: number): Promise<ReverseGeocodeResult> {
  if (!isFiniteCoordinateValue(latitude) || !isFiniteCoordinateValue(longitude)) {
    return { failed: true, label: null, rateLimited: false };
  }

  const cacheKey = getReverseGeocodeCacheKey(latitude, longitude);
  const cached = reverseGeocodeCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const request = Location.reverseGeocodeAsync({ latitude, longitude })
    .then((addresses) => {
      const address = addresses[0] ?? null;
      const label = createLocationLabel(address);

      if (__DEV__) {
        console.info('[photo-import reverse geocode] success', {
          cacheKey,
          locationLabel: label,
        });
      }

      return { address, failed: !label, label, rateLimited: false };
    })
    .catch((error) => {
      const rateLimited = isRateLimitError(error);

      if (__DEV__) {
        console.info('[photo-import reverse geocode] fail', {
          cacheKey,
          message: error instanceof Error ? error.message : String(error),
          rateLimited,
        });
      }

      return { address: null, failed: true, label: null, rateLimited };
    });

  reverseGeocodeCache.set(cacheKey, request);

  if (__DEV__) {
    console.info('[photo-import reverse geocode] start', { cacheKey });
  }

  return request;
}

function addWarningReason(draft: LocalDetectedTripDraft, reason: string) {
  if (draft.debugMetadata.warningReasons.includes(reason)) {
    return;
  }

  draft.debugMetadata.warningReasons.push(reason);
}

function isLocatedPhotoGroup(group: LocalDetectedPlaceGroup) {
  return (
    isFiniteCoordinateValue(group.centroidLat) &&
    isFiniteCoordinateValue(group.centroidLng)
  ) || group.photos.some((photo) => Boolean(getPhotoCoordinates(photo)));
}

function isResolvedLocatedGroupLabel(label?: string | null) {
  const trimmed = label?.trim();

  return Boolean(
    trimmed &&
    trimmed !== UNKNOWN_LOCATION_LABEL &&
    !trimmed.startsWith(LOCATED_PHOTO_LABEL),
  );
}

function getLocatedGroups(draft: LocalDetectedTripDraft) {
  return draft.days
    .flatMap((day) => day.groups)
    .filter(isLocatedPhotoGroup);
}

function getGroupTitleCoordinates(group?: LocalDetectedPlaceGroup): {
  latitude: number;
  longitude: number;
  usedRepresentativeGps: boolean;
} | null {
  if (!group) {
    return null;
  }

  if (
    isFiniteCoordinateValue(group.centroidLat) &&
    isFiniteCoordinateValue(group.centroidLng)
  ) {
    return {
      latitude: group.centroidLat,
      longitude: group.centroidLng,
      usedRepresentativeGps: false,
    };
  }

  const representativePhoto = group.photos.find((photo) => Boolean(getPhotoCoordinates(photo)));

  const coordinates = representativePhoto ? getPhotoCoordinates(representativePhoto) : null;

  return coordinates
    ? {
      ...coordinates,
      usedRepresentativeGps: true,
    }
    : null;
}

type CandidateTitleCoordinate = {
  latitude?: number;
  longitude?: number;
  representativeGroupPhotoCount?: number;
  source: PhotoImportCandidateTitleCoordinateSource;
};

function getCandidateTitleCoordinateAttempts(draft: LocalDetectedTripDraft): CandidateTitleCoordinate[] {
  const attempts: CandidateTitleCoordinate[] = [];
  const locatedGroups = getLocatedGroups(draft);
  const firstLocatedGroup = locatedGroups[0];
  const firstLocatedGroupCoordinates = getGroupTitleCoordinates(firstLocatedGroup);

  if (firstLocatedGroup) {
    draft.debugMetadata.firstLocatedGroupLabel =
      firstLocatedGroup.groupLocationLabel ?? firstLocatedGroup.groupDisplayName ?? firstLocatedGroup.label;
    draft.debugMetadata.firstLocatedGroupCentroidLat = firstLocatedGroupCoordinates?.latitude;
    draft.debugMetadata.firstLocatedGroupCentroidLng = firstLocatedGroupCoordinates?.longitude;
    draft.debugMetadata.firstLocatedGroupPhotoCount = firstLocatedGroup.photos.length;
    draft.debugMetadata.firstLocatedGroupRepresentativeGpsLat =
      firstLocatedGroupCoordinates?.usedRepresentativeGps ? firstLocatedGroupCoordinates.latitude : undefined;
    draft.debugMetadata.firstLocatedGroupRepresentativeGpsLng =
      firstLocatedGroupCoordinates?.usedRepresentativeGps ? firstLocatedGroupCoordinates.longitude : undefined;
  }

  if (firstLocatedGroupCoordinates) {
    attempts.push({
      latitude: firstLocatedGroupCoordinates.latitude,
      longitude: firstLocatedGroupCoordinates.longitude,
      representativeGroupPhotoCount: firstLocatedGroup?.photos.length,
      source: firstLocatedGroupCoordinates.usedRepresentativeGps
        ? 'first_located_group_representative_gps'
        : 'first_located_group_centroid',
    });
  }

  const largestLocatedGroups = [...locatedGroups]
    .sort((left, right) => right.photos.length - left.photos.length);
  const largestLocatedGroup = largestLocatedGroups[0];
  const largestLocatedGroupCoordinates = getGroupTitleCoordinates(largestLocatedGroup);

  if (largestLocatedGroupCoordinates) {
    attempts.push({
      latitude: largestLocatedGroupCoordinates.latitude,
      longitude: largestLocatedGroupCoordinates.longitude,
      representativeGroupPhotoCount: largestLocatedGroup?.photos.length,
      source: 'largest_located_group_centroid',
    });
  }

  if (
    isFiniteCoordinateValue(draft.centroidLat) &&
    isFiniteCoordinateValue(draft.centroidLng)
  ) {
    attempts.push({
      latitude: draft.centroidLat,
      longitude: draft.centroidLng,
      source: 'candidate_centroid',
    });
  }

  const representativePhoto = draft.days
    .flatMap((day) => day.groups.flatMap((group) => group.photos))
    .find((photo) => Boolean(getPhotoCoordinates(photo)));
  const coordinates = representativePhoto ? getPhotoCoordinates(representativePhoto) : null;

  if (coordinates) {
    attempts.push({
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      representativeGroupPhotoCount: 1,
      source: 'representative_gps_photo',
    });
  }

  const seen = new Set<string>();

  return attempts.filter((attempt) => {
    if (!isFiniteCoordinateValue(attempt.latitude) || !isFiniteCoordinateValue(attempt.longitude)) {
      return false;
    }

    const key = `${attempt.latitude.toFixed(5)},${attempt.longitude.toFixed(5)}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function getCandidateTitleCoordinate(draft: LocalDetectedTripDraft): CandidateTitleCoordinate {
  return getCandidateTitleCoordinateAttempts(draft)[0] ?? { source: 'none' };
}

function getReverseGeocodeLocationSource(
  coordinateSource: PhotoImportCandidateTitleCoordinateSource,
): PhotoImportCandidateTitleLocationSource {
  if (coordinateSource === 'candidate_centroid') {
    return 'reverse_geocode_candidate_centroid';
  }

  if (coordinateSource === 'first_located_group_centroid') {
    return 'first_located_group_centroid';
  }

  if (coordinateSource === 'first_located_group_representative_gps') {
    return 'first_located_group_representative_gps';
  }

  if (coordinateSource === 'largest_located_group_centroid') {
    return 'largest_located_group_centroid';
  }

  if (coordinateSource === 'representative_gps_photo') {
    return 'reverse_geocode_representative_photo';
  }

  return 'fallback';
}

function syncCandidateTitleCoordinateMetadata(draft: LocalDetectedTripDraft) {
  const titleCoordinate = getCandidateTitleCoordinate(draft);
  draft.debugMetadata.candidateTitleCoordinateSource = titleCoordinate.source;
  draft.debugMetadata.representativeGpsLat = titleCoordinate.latitude;
  draft.debugMetadata.representativeGpsLng = titleCoordinate.longitude;
  draft.debugMetadata.representativeGroupPhotoCount = titleCoordinate.representativeGroupPhotoCount;
  draft.debugMetadata.isOverseasCandidate = isOverseasCoordinate(
    titleCoordinate.latitude,
    titleCoordinate.longitude,
  );

  return titleCoordinate;
}

function applyLocatedGroupLabelTitle(draft: LocalDetectedTripDraft) {
  const locatedGroups = getLocatedGroups(draft);
  const firstResolvedGroup = locatedGroups.find((group) => (
    isResolvedLocatedGroupLabel(group.groupLocationLabel ?? group.groupDisplayName ?? group.label)
  ));

  if (!firstResolvedGroup) {
    return false;
  }

  const label = firstResolvedGroup.groupLocationLabel ?? firstResolvedGroup.groupDisplayName ?? firstResolvedGroup.label;
  const { displayTitle, reason } = buildDetectedTripDisplayTitle(null, label);

  if (displayTitle === PENDING_LOCATION_TITLE) {
    return false;
  }

  draft.displayTitle = displayTitle;
  draft.title = displayTitle;
  draft.locationLabel = label;
  draft.regionLabel = label;
  draft.enrichmentStatus = 'success';
  draft.debugMetadata.titleResolveState = 'success';
  draft.debugMetadata.candidateTitleLocationSource =
    firstResolvedGroup === locatedGroups[0] ? 'first_located_group_label' : 'largest_located_group_label';
  draft.debugMetadata.normalizedCityName = displayTitle.replace(/\s+\S+$/, '');
  draft.debugMetadata.titleFinalizeReason = 'success';
  draft.debugMetadata.titleEnrichmentFinalizedAt = new Date().toISOString();

  if (__DEV__) {
    console.info('[photo-import candidate title] applied located group label', {
      draftId: draft.id,
      groupLabel: label,
      titleAfter: draft.title,
      titleNormalizationReason: reason,
    });
  }

  return true;
}

async function getHydratedAssetDisplayUri(assetId?: string) {
  if (!assetId) {
    return null;
  }

  const cached = assetDisplayUriCache.get(assetId);

  if (cached) {
    return cached;
  }

  const request = MediaLibrary.getAssetInfoAsync(assetId, { shouldDownloadFromNetwork: true })
    .then((assetInfo) => {
      const localUri = 'localUri' in assetInfo ? assetInfo.localUri ?? null : null;
      return isRenderableImageUri(localUri) ? localUri : null;
    })
    .catch(() => null);

  assetDisplayUriCache.set(assetId, request);

  return request;
}

async function hydratePhotoDisplayUri(photo: LocalDetectedPhoto) {
  if (isRenderableImageUri(photo.displayUri)) {
    return photo.displayUri;
  }

  const displayUri = await getHydratedAssetDisplayUri(photo.assetId);

  if (!displayUri) {
    return null;
  }

  photo.displayUri = displayUri;
  photo.localUri = displayUri;
  photo.uri = displayUri;

  return displayUri;
}

function getDateGapDays(previousDateKey: string, nextDateKey: string) {
  const previousDate = new Date(`${previousDateKey}T00:00:00`);
  const nextDate = new Date(`${nextDateKey}T00:00:00`);

  return Math.round((nextDate.getTime() - previousDate.getTime()) / DAY_MS);
}

function getDateSpanDays(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 1;
  }

  return Math.max(1, Math.round((end.getTime() - start.getTime()) / DAY_MS) + 1);
}

function getMonthKey(dateKey: string) {
  return dateKey.slice(0, 7);
}

function getRepeatedLocalClusterKey(latitude?: number, longitude?: number) {
  if (!isFiniteCoordinateValue(latitude) || !isFiniteCoordinateValue(longitude)) {
    return undefined;
  }

  const latGrid = Math.round(latitude / REPEATED_LOCAL_CLUSTER_GRID_DEGREES);
  const lngGrid = Math.round(longitude / REPEATED_LOCAL_CLUSTER_GRID_DEGREES);

  return `${latGrid}:${lngGrid}`;
}

function isCoordinateInKorea(latitude?: number, longitude?: number) {
  return (
    isFiniteCoordinateValue(latitude) &&
    isFiniteCoordinateValue(longitude) &&
    latitude >= 33 &&
    latitude <= 39.5 &&
    longitude >= 124 &&
    longitude <= 132
  );
}

function isOverseasCoordinate(latitude?: number, longitude?: number) {
  return (
    isFiniteCoordinateValue(latitude) &&
    isFiniteCoordinateValue(longitude) &&
    !isCoordinateInKorea(latitude, longitude)
  );
}

function getLocationFallbackTitle(latitude?: number, longitude?: number) {
  return UNRESOLVED_REGION_TITLE;
}

function isGenericLocationFallbackTitle(title?: string | null) {
  return title === LOCATION_BASED_TRIP_TITLE || title === OVERSEAS_TRIP_TITLE;
}

function isUnresolvedRegionFallbackTitle(title?: string | null) {
  return title === UNRESOLVED_REGION_TITLE;
}

function isBlockedUserFacingDetectedTitle(title?: string | null) {
  return (
    isGenericLocationFallbackTitle(title) ||
    title === DETECTED_TRIP_TITLE ||
    Boolean(title && /\uC5EC\uD589\s*\uD6C4\uBCF4/u.test(title)) ||
    Boolean(title && /^\d{4}\.\s?\d{1,2}\.\s?\d{1,2}/.test(title))
  );
}

function hasResolvedCandidateDisplayTitle(draft: LocalDetectedTripDraft) {
  return (
    Boolean(draft.locationLabel) ||
    draft.enrichmentStatus === 'success' ||
    (
      isUnresolvedRegionFallbackTitle(draft.displayTitle) &&
      draft.enrichmentStatus !== 'pending'
    )
  );
}

function getUserFacingDetectedTitle(title?: string | null) {
  const trimmed = title?.trim();

  if (!trimmed) {
    return UNRESOLVED_REGION_TITLE;
  }

  if (trimmed === PENDING_LOCATION_TITLE || trimmed === UNRESOLVED_REGION_TITLE) {
    return trimmed;
  }

  return isBlockedUserFacingDetectedTitle(trimmed)
    ? UNRESOLVED_REGION_TITLE
    : trimmed;
}

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function getConfidenceLevel(score: number): PhotoImportConfidenceLevel {
  if (score >= CONFIDENCE_HIGH_THRESHOLD) {
    return 'high';
  }

  if (score >= CONFIDENCE_MEDIUM_THRESHOLD) {
    return 'medium';
  }

  return 'low';
}

function calculateMaxDistanceKmFromCentroid(
  photos: LocalDetectedPhoto[],
  centroid: { latitude: number; longitude: number } | null,
) {
  if (!centroid) {
    return 0;
  }

  const locatedPhotos = photos.filter((photo) => (
    isFiniteCoordinateValue(photo.latitude) && isFiniteCoordinateValue(photo.longitude)
  ));

  if (locatedPhotos.length <= 1) {
    return 0;
  }

  const maxDistanceMeters = locatedPhotos.reduce((maxDistance, photo) => {
    if (!isFiniteCoordinateValue(photo.latitude) || !isFiniteCoordinateValue(photo.longitude)) {
      return maxDistance;
    }

    const distance = getDistanceMeters(centroid, {
      latitude: photo.latitude,
      longitude: photo.longitude,
    });

    return Math.max(maxDistance, distance);
  }, 0);

  const maxDistanceKm = Math.round((maxDistanceMeters / 1000) * 10) / 10;

  return Number.isFinite(maxDistanceKm) ? maxDistanceKm : 0;
}

function countLocatedGroups(days: LocalDetectedTripDraftDay[]) {
  return days.reduce((total, day) => (
    total + day.groups.filter((group) => (
      isFiniteCoordinateValue(group.centroidLat) && isFiniteCoordinateValue(group.centroidLng)
    )).length
  ), 0);
}

function countGpsActiveDays(days: LocalDetectedTripDraftDay[]) {
  return days.filter((day) => (
    day.groups.some((group) => group.photos.some((photo) => Boolean(getPhotoCoordinates(photo))))
  )).length;
}

function calculateCandidateDebugMetadata({
  candidateId,
  dateGapSplitCount,
  days,
  endDate,
  oversizedSplitCount,
  photos,
  splitReason,
  startDate,
}: {
  candidateId: string;
  dateGapSplitCount: number;
  days: LocalDetectedTripDraftDay[];
  endDate: string;
  oversizedSplitCount: number;
  photos: LocalDetectedPhoto[];
  splitReason: PhotoImportCandidateSplitReason;
  startDate: string;
}): PhotoImportCandidateDebugMetadata {
  const centroid = calculateCentroid(photos);
  const photoCount = photos.length;
  const screenshotPhotoCount = photos.filter((photo) => photo.isScreenshot).length;
  const savedImageCount = photos.filter((photo) => photo.isLikelySavedImage).length;
  const realPhotoCount = photos.filter((photo) => (
    photo.isLikelyCameraPhoto && !photo.isScreenshot && !photo.isLikelySavedImage
  )).length;
  const gpsPhotoCount = photos.filter((photo) => getPhotoCoordinates(photo)).length;
  const noGpsPhotoCount = photoCount - gpsPhotoCount;
  const displayablePhotoCount = photos.filter((photo) => isRenderableImageUri(photo.displayUri)).length;
  const gpsRatio = photoCount > 0 ? gpsPhotoCount / photoCount : 0;
  const noGpsRatio = photoCount > 0 ? noGpsPhotoCount / photoCount : 0;
  const savedImageRatio = photoCount > 0 ? savedImageCount / photoCount : 0;
  const displayableRatio = photoCount > 0 ? displayablePhotoCount / photoCount : 0;
  const dayCount = days.length;
  const gpsActiveDayCount = countGpsActiveDays(days);
  const locationClusterCount = countLocatedGroups(days);
  const maxDistanceKm = calculateMaxDistanceKmFromCentroid(photos, centroid);
  const warningReasons: string[] = [];
  let confidenceScore = 25;

  if (photoCount >= MIN_PHOTOS_PER_TRIP_CANDIDATE) {
    confidenceScore += 20;
  } else {
    confidenceScore -= 25;
    warningReasons.push('too_few_photos');
  }

  if (realPhotoCount < MIN_REAL_PHOTOS_PER_VISIBLE_CANDIDATE) {
    confidenceScore -= 25;
    warningReasons.push('too_few_real_photos');
  }

  if (savedImageCount > 0) {
    warningReasons.push('contains_saved_images');
  }

  if (savedImageRatio >= SAVED_IMAGE_HEAVY_RATIO) {
    confidenceScore -= 20;
    warningReasons.push('possible_downloaded_images');
  }

  if (photoCount > 0 && screenshotPhotoCount / photoCount >= MOSTLY_SCREENSHOT_RATIO) {
    confidenceScore -= 25;
    warningReasons.push('screenshot_only_or_mostly_screenshot');
  }

  if (gpsPhotoCount > 0) {
    confidenceScore += 15;
  }

  if (gpsRatio >= 0.4) {
    confidenceScore += 15;
  }

  if (locationClusterCount > 0) {
    confidenceScore += 10;
  }

  if (dayCount >= 2 && dayCount <= 7) {
    confidenceScore += 15;
  } else if (dayCount > MAX_CONTINUOUS_TRIP_DAYS) {
    confidenceScore -= 15;
    warningReasons.push('long_day_span');
  }

  if (displayableRatio >= 0.2) {
    confidenceScore += 10;
  }

  if (photoCount > CONFIDENCE_TOO_MANY_PHOTOS) {
    confidenceScore -= 20;
    warningReasons.push('too_many_photos');
  }

  if (noGpsRatio > CONFIDENCE_HIGH_NO_GPS_RATIO) {
    confidenceScore -= 20;
    warningReasons.push('high_no_gps_ratio');
  }

  if (maxDistanceKm > CONFIDENCE_WIDE_DISTANCE_KM) {
    confidenceScore -= 15;
    warningReasons.push('wide_location_spread');
  }

  if (displayablePhotoCount === 0 || displayableRatio < CONFIDENCE_LOW_DISPLAYABLE_RATIO) {
    confidenceScore -= 10;
    warningReasons.push('few_displayable_thumbnails');
  }

  if (gpsPhotoCount > 0 && gpsPhotoCount < MIN_VISIBLE_GPS_PHOTOS) {
    confidenceScore -= 15;
    warningReasons.push('low_gps_photo_count');
  }

  if (
    dayCount === 1 &&
    realPhotoCount < MIN_SINGLE_DAY_VISIBLE_PHOTOS &&
    maxDistanceKm < MIN_SINGLE_DAY_DISTANCE_KM
  ) {
    confidenceScore -= 20;
    warningReasons.push('weak_single_day_candidate');
  }

  if (
    dayCount === 1 &&
    realPhotoCount <= MIN_SINGLE_DAY_VISIBLE_PHOTOS &&
    maxDistanceKm < MIN_SINGLE_DAY_DISTANCE_KM
  ) {
    warningReasons.push('possible_daily_life_candidate');
  }

  if (dayCount >= LONG_TRIP_MIN_DAYS) {
    warningReasons.push(dayCount <= LONG_TRIP_MAX_DAYS ? 'long_trip_candidate' : 'weak_long_trip_candidate');
  }

  if (dayCount >= LONG_STAY_MIN_DAYS && dayCount <= LONG_STAY_MAX_DAYS) {
    warningReasons.push('long_stay_candidate');
    warningReasons.push('possible_long_stay_candidate');
  }

  const normalizedScore = clampScore(confidenceScore);

  if (getConfidenceLevel(normalizedScore) === 'low') {
    warningReasons.push('confidence_low');
  }

  return {
    candidateId,
    centroidLat: centroid?.latitude,
    centroidLng: centroid?.longitude,
    confidenceLevel: getConfidenceLevel(normalizedScore),
    confidenceScore: normalizedScore,
    dateGapSplitCount,
    dayCount,
    displayablePhotoCount,
    endDate,
    gpsActiveDayCount,
    gpsPhotoCount,
    isLongTripCandidate: dayCount >= LONG_TRIP_MIN_DAYS,
    locationClusterCount,
    maxDistanceKm,
    noGpsPhotoCount,
    oversizedSplitCount,
    photoCount,
    realPhotoCount,
    savedImageCount,
    savedImageRatio,
    screenshotPhotoCount,
    splitReason,
    startDate,
    warningReasons,
  };
}

function createPhotoFromScannedAsset(asset: ScannedAsset, takenDate: Date): LocalDetectedPhoto {
  const coordinates = getScannedAssetCoordinates(asset);
  const localUri = 'localUri' in asset ? asset.localUri ?? null : null;
  const displayUri = isRenderableImageUri(localUri) ? localUri : null;
  const mediaSubtypes = readMediaSubtypes(asset);
  const isScreenshot = isScreenshotAsset(asset);
  const filename = readAssetFilename(asset);
  const isLikelySavedImage = isLikelySavedImageAsset(asset, { coordinates, isScreenshot });

  return {
    assetId: asset.id,
    assetUri: asset.uri,
    displayUri,
    fileExtension: getFileExtension(filename),
    filename,
    hasCameraExif: hasCameraExif(asset),
    hasLocation: Boolean(coordinates),
    height: asset.height,
    id: asset.id,
    isScreenshot,
    isLikelyCameraPhoto: isLikelyCameraPhotoAsset(asset, { coordinates, isLikelySavedImage, isScreenshot }),
    isLikelySavedImage,
    latitude: coordinates?.latitude,
    longitude: coordinates?.longitude,
    localUri,
    mediaType: asset.mediaType,
    mediaSubtypes,
    takenAt: takenDate.toISOString(),
    uri: displayUri,
    width: asset.width,
  };
}

function createPhotoFromPickedAsset(asset: PickedPhotoAsset, takenDate: Date): LocalDetectedPhoto {
  const coordinates = getPickedAssetCoordinates(asset);
  const displayUri = isRenderableImageUri(asset.uri) ? asset.uri : null;
  const mediaSubtypes = readMediaSubtypes(asset);
  const isScreenshot = isScreenshotAsset(asset);
  const filename = readAssetFilename(asset);
  const isLikelySavedImage = isLikelySavedImageAsset(asset, { coordinates, isScreenshot });

  return {
    assetId: asset.assetId ?? undefined,
    assetUri: asset.uri,
    displayUri,
    fileExtension: getFileExtension(filename),
    filename,
    hasCameraExif: hasCameraExif(asset),
    hasLocation: Boolean(coordinates),
    height: asset.height,
    id: asset.assetId ?? asset.uri,
    isScreenshot,
    isLikelyCameraPhoto: isLikelyCameraPhotoAsset(asset, { coordinates, isLikelySavedImage, isScreenshot }),
    isLikelySavedImage,
    latitude: coordinates?.latitude,
    longitude: coordinates?.longitude,
    mediaType: asset.type ?? 'image',
    mediaSubtypes,
    takenAt: takenDate.toISOString(),
    uri: displayUri,
    width: asset.width,
  };
}

function buildDraftFromPhotos(
  photos: LocalDetectedPhoto[],
  draftId: string,
  splitReason: PhotoImportCandidateSplitReason = 'final_chunk',
  dateGapSplitCount = 0,
  oversizedSplitCount = 0,
): LocalDetectedTripDraft | null {
  if (photos.length === 0) {
    return null;
  }

  const sortedPhotos = [...photos].sort(
    (left, right) => new Date(left.takenAt).getTime() - new Date(right.takenAt).getTime(),
  );
  const photosByDate = new Map<string, LocalDetectedPhoto[]>();

  for (const photo of sortedPhotos) {
    const dateKey = toDateKey(new Date(photo.takenAt));
    const current = photosByDate.get(dateKey) ?? [];
    current.push(photo);
    photosByDate.set(dateKey, current);
  }

  const days: LocalDetectedTripDraftDay[] = [...photosByDate.entries()]
    .sort(([leftDate], [rightDate]) => leftDate.localeCompare(rightDate))
    .map(([dateKey, dayPhotos], dayIndex) => {
      const firstDate = new Date(dayPhotos[0]?.takenAt ?? Date.now());
      const groups: LocalDetectedPlaceGroup[] = [];
      const noLocationPhotos: LocalDetectedPhoto[] = [];

      for (const photo of dayPhotos) {
        const coordinates = getPhotoCoordinates(photo);

        if (!coordinates) {
          noLocationPhotos.push(photo);
          continue;
        }

        const group = groups.find((candidate) => canJoinLocationGroup(candidate, coordinates));

        if (group) {
          group.photos.push(photo);
          group.photos.sort((left, right) => (
            new Date(left.takenAt).getTime() - new Date(right.takenAt).getTime()
          ));
          const groupCentroid = calculateCentroid(group.photos);
          group.centroidLat = groupCentroid?.latitude;
          group.centroidLng = groupCentroid?.longitude;
          group.time = formatEntryTime(new Date(group.photos[0]?.takenAt ?? photo.takenAt));
          continue;
        }

        groups.push({
          centroidLat: coordinates.latitude,
          centroidLng: coordinates.longitude,
          dateKey,
          id: `${draftId}-${dateKey}-located-${groups.length + 1}`,
          label: `${LOCATED_PHOTO_LABEL} ${groups.length + 1}`,
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
          photos: [photo],
          time: formatEntryTime(new Date(photo.takenAt)),
        });
      }

      if (noLocationPhotos.length > 0) {
        groups.push({
          dateKey,
          id: `${draftId}-${dateKey}-unknown-location`,
          label: UNKNOWN_LOCATION_LABEL,
          photos: noLocationPhotos.sort((left, right) => (
            new Date(left.takenAt).getTime() - new Date(right.takenAt).getTime()
          )),
          time: formatEntryTime(new Date(noLocationPhotos[0]?.takenAt ?? firstDate)),
        });
      }

      groups.sort((left, right) => (
        new Date(left.photos[0]?.takenAt ?? firstDate).getTime() -
        new Date(right.photos[0]?.takenAt ?? firstDate).getTime()
      ));

      return {
        dateKey,
        dateLabel: formatDateLabel(firstDate),
        dayNumber: dayIndex + 1,
        groups,
        id: `${draftId}-day-${dayIndex + 1}`,
        photoCount: dayPhotos.length,
        weekdayLabel: WEEKDAY_LABELS[firstDate.getDay()],
      };
    });

  const startDate = days[0]?.dateKey ?? toDateKey(new Date(sortedPhotos[0].takenAt));
  const endDate = days[days.length - 1]?.dateKey ?? startDate;
  const draftCentroid = calculateCentroid(sortedPhotos);
  const coverPhoto = sortedPhotos.find((photo) => isRenderableImageUri(photo.displayUri));
  const fallbackTitle = formatCandidateDateTitle(startDate, endDate);
  const candidatePhotoIdentifiers = [...new Set(sortedPhotos.map(getPhotoStableIdentifier))].sort();
  const candidateFingerprint = createDetectedCandidateFingerprint(candidatePhotoIdentifiers);
  const debugMetadata = calculateCandidateDebugMetadata({
    candidateId: draftId,
    dateGapSplitCount,
    days,
    endDate,
    oversizedSplitCount,
    photos: sortedPhotos,
    splitReason,
    startDate,
  });
  const isSavedImageHeavy =
    debugMetadata.savedImageRatio >= SAVED_IMAGE_HEAVY_RATIO &&
    debugMetadata.realPhotoCount < MIN_SINGLE_DAY_VISIBLE_PHOTOS;
  const isOneDayVisibleEnough =
    debugMetadata.dayCount !== 1 ||
    (
      debugMetadata.realPhotoCount >= MIN_ONE_DAY_STRICT_REAL_PHOTOS &&
      debugMetadata.gpsPhotoCount >= MIN_ONE_DAY_STRICT_GPS_PHOTOS &&
      (
        debugMetadata.maxDistanceKm >= MIN_SINGLE_DAY_DISTANCE_KM ||
        debugMetadata.locationClusterCount >= 2
      )
    ) ||
    (
      debugMetadata.maxDistanceKm >= MIN_ONE_DAY_RELAXED_DISTANCE_KM &&
      debugMetadata.realPhotoCount >= MIN_SHORT_TRIP_REAL_PHOTOS &&
      debugMetadata.gpsPhotoCount >= MIN_VISIBLE_GPS_PHOTOS
    );
  const isMultiDayVisibleEnough =
    debugMetadata.dayCount === 1 ||
    (
      debugMetadata.dayCount < LONG_TRIP_MIN_DAYS &&
      debugMetadata.realPhotoCount >= MIN_SHORT_TRIP_REAL_PHOTOS
    ) ||
    (
      debugMetadata.dayCount >= LONG_TRIP_MIN_DAYS &&
      debugMetadata.realPhotoCount >= MIN_LONG_TRIP_REAL_PHOTOS &&
      debugMetadata.gpsPhotoCount >= MIN_ONE_DAY_STRICT_GPS_PHOTOS &&
      debugMetadata.gpsActiveDayCount >= 2
    );
  const hasTitleCandidate =
    debugMetadata.confidenceLevel !== 'low' &&
    debugMetadata.gpsPhotoCount >= MIN_VISIBLE_GPS_PHOTOS &&
    debugMetadata.realPhotoCount >= MIN_REAL_PHOTOS_PER_VISIBLE_CANDIDATE &&
    isFiniteCoordinateValue(debugMetadata.centroidLat) &&
    isFiniteCoordinateValue(debugMetadata.centroidLng) &&
    !debugMetadata.warningReasons.includes('screenshot_only_or_mostly_screenshot') &&
    !isSavedImageHeavy &&
    isOneDayVisibleEnough &&
    isMultiDayVisibleEnough;

  return {
    centroidLat: draftCentroid?.latitude,
    centroidLng: draftCentroid?.longitude,
    coverAssetId: coverPhoto?.assetId,
    coverPhotoUri: coverPhoto?.displayUri ?? undefined,
    createdAt: new Date().toISOString(),
    candidateFingerprint,
    candidatePhotoIdentifiers,
    days,
    debugMetadata,
    displayTitle: hasTitleCandidate ? PENDING_LOCATION_TITLE : DETECTED_TRIP_TITLE,
    endDate,
    enrichmentStatus: hasTitleCandidate ? 'pending' : 'failed',
    fallbackTitle,
    id: draftId,
    photoCount: sortedPhotos.length,
    thumbnailCount: sortedPhotos.filter((photo) => isRenderableImageUri(photo.displayUri)).length,
    source: 'photoLibrary',
    startDate,
    title: hasTitleCandidate ? PENDING_LOCATION_TITLE : DETECTED_TRIP_TITLE,
  };
}

function createDateBuckets(photos: LocalDetectedPhoto[]) {
  const photosByDate = new Map<string, LocalDetectedPhoto[]>();

  for (const photo of photos) {
    const dateKey = getPhotoDateKey(photo);
    const current = photosByDate.get(dateKey) ?? [];
    current.push(photo);
    photosByDate.set(dateKey, current);
  }

  return [...photosByDate.entries()]
    .map(([dateKey, datePhotos]) => ({
      centroid: calculateCentroid(datePhotos),
      dateKey,
      photos: datePhotos.sort(
        (left, right) => new Date(left.takenAt).getTime() - new Date(right.takenAt).getTime(),
      ),
    }))
    .filter((bucket) => bucket.photos.length >= MIN_PHOTOS_PER_DAY)
    .sort((left, right) => left.dateKey.localeCompare(right.dateKey));
}

function getCandidateSegmentSplitReason(
  currentSegment: DateBucket[],
  nextBucket: DateBucket,
): PhotoImportCandidateSplitReason | null {
  const lastBucket = currentSegment[currentSegment.length - 1];

  if (!lastBucket) {
    return null;
  }

  const dateGapDays = getDateGapDays(lastBucket.dateKey, nextBucket.dateKey);
  const currentPhotos = currentSegment.flatMap((bucket) => bucket.photos);
  const currentCentroid = calculateCentroid(currentPhotos);

  if (dateGapDays > 1) {
    const isNearbyGap =
      dateGapDays <= 3 &&
      currentCentroid &&
      nextBucket.centroid &&
      getDistanceMeters(currentCentroid, nextBucket.centroid) <= TRIP_LOCATION_SPLIT_DISTANCE_METERS;

    if (!isNearbyGap && dateGapDays > TRIP_DAY_GAP_THRESHOLD_DAYS) {
      return 'date_gap';
    }
  }

  if (dateGapDays > LONG_TRIP_MERGE_MAX_GAP_DAYS) {
    return 'date_gap';
  }

  if (currentSegment.length >= MAX_CONTINUOUS_TRIP_DAYS) {
    return 'max_days_exceeded';
  }

  const currentPhotoCount = currentSegment.reduce((total, bucket) => total + bucket.photos.length, 0);

  if (currentPhotoCount + nextBucket.photos.length > MAX_PHOTOS_PER_TRIP_CANDIDATE) {
    return 'max_photos_exceeded';
  }

  if (currentCentroid && nextBucket.centroid) {
    return (
      currentSegment.length >= MAX_CONTINUOUS_TRIP_DAYS &&
      getDistanceMeters(currentCentroid, nextBucket.centroid) > TRIP_LOCATION_SPLIT_DISTANCE_METERS
    )
      ? 'distance_exceeded'
      : null;
  }

  return null;
}

function splitOversizedSegment(
  segment: ReturnType<typeof createDateBuckets>,
) {
  const chunks: LocalDetectedPhoto[][] = [];
  let currentChunk: LocalDetectedPhoto[] = [];
  let currentChunkDates = 0;

  for (const bucket of segment) {
    const shouldStartNextChunk =
      currentChunk.length > 0 &&
      (
        currentChunk.length + bucket.photos.length > MAX_PHOTOS_PER_TRIP_CANDIDATE ||
        currentChunkDates >= MAX_CONTINUOUS_TRIP_DAYS
      );

    if (shouldStartNextChunk) {
      chunks.push(currentChunk);
      currentChunk = [];
      currentChunkDates = 0;
    }

    currentChunk.push(...bucket.photos);
    currentChunkDates += 1;
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks;
}

function getDraftPhotos(draft: LocalDetectedTripDraft) {
  return draft.days.flatMap((day) => day.groups.flatMap((group) => group.photos));
}

function getInclusiveDateSpanDays(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 1;
  }

  return Math.max(1, Math.round((end.getTime() - start.getTime()) / DAY_MS) + 1);
}

function getDraftDateGapDays(left: LocalDetectedTripDraft, right: LocalDetectedTripDraft) {
  const leftEnd = new Date(`${left.endDate}T00:00:00`);
  const rightStart = new Date(`${right.startDate}T00:00:00`);

  if (Number.isNaN(leftEnd.getTime()) || Number.isNaN(rightStart.getTime())) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.max(0, Math.round((rightStart.getTime() - leftEnd.getTime()) / DAY_MS) - 1);
}

function canPostMergeDrafts(currentDrafts: LocalDetectedTripDraft[], nextDraft: LocalDetectedTripDraft) {
  const firstDraft = currentDrafts[0];

  if (!firstDraft) {
    return false;
  }

  if (getDraftDateGapDays(currentDrafts[currentDrafts.length - 1], nextDraft) > LONG_TRIP_MERGE_MAX_GAP_DAYS) {
    return false;
  }

  const mergedStartDate = firstDraft.startDate < nextDraft.startDate ? firstDraft.startDate : nextDraft.startDate;
  const mergedEndDate = currentDrafts.reduce((latest, draft) => (
    latest.localeCompare(draft.endDate) >= 0 ? latest : draft.endDate
  ), nextDraft.endDate);
  const mergedSpanDays = getInclusiveDateSpanDays(mergedStartDate, mergedEndDate);

  if (mergedSpanDays > LONG_STAY_MAX_DAYS) {
    return false;
  }

  const currentCentroid = calculateCentroid(currentDrafts.flatMap(getDraftPhotos));
  const nextCentroid = calculateCentroid(getDraftPhotos(nextDraft));

  if (!currentCentroid || !nextCentroid) {
    return false;
  }

  return getDistanceMeters(currentCentroid, nextCentroid) / 1000 <= LONG_TRIP_MERGE_MAX_CENTROID_DISTANCE_KM;
}

function buildMergedLongTripDraft(
  draftsToMerge: LocalDetectedTripDraft[],
): LocalDetectedTripDraft | null {
  const photos = draftsToMerge.flatMap(getDraftPhotos);
  const draft = buildDraftFromPhotos(
    photos,
    createDraftId('photo-scan-long'),
    'long_trip_post_merged',
    draftsToMerge.reduce((total, draft) => total + draft.debugMetadata.dateGapSplitCount, 0),
    draftsToMerge.reduce((total, draft) => total + draft.debugMetadata.oversizedSplitCount, 0),
  );

  if (!draft) {
    return null;
  }

  draft.debugMetadata.mergedFromCandidateCount = draftsToMerge.length;
  draft.debugMetadata.isLongTripCandidate = true;
  addWarningReason(draft, 'long_trip_post_merged');

  return draft;
}

function canKeepMergedLongTrip(draft: LocalDetectedTripDraft) {
  const metadata = draft.debugMetadata;
  const isSavedImageHeavy = metadata.savedImageRatio >= SAVED_IMAGE_HEAVY_RATIO && metadata.realPhotoCount < 20;

  return (
    metadata.dayCount >= LONG_TRIP_MIN_DAYS &&
    metadata.dayCount <= LONG_STAY_MAX_DAYS &&
    metadata.realPhotoCount >= MIN_LONG_TRIP_REAL_PHOTOS &&
    metadata.gpsPhotoCount >= MIN_ONE_DAY_STRICT_GPS_PHOTOS &&
    metadata.gpsActiveDayCount >= 2 &&
    !isSavedImageHeavy &&
    !metadata.warningReasons.includes('screenshot_only_or_mostly_screenshot')
  );
}

function postMergeLongTripDrafts(draftsToMerge: LocalDetectedTripDraft[]) {
  const sortedDrafts = [...draftsToMerge].sort((left, right) => left.startDate.localeCompare(right.startDate));
  const mergedDrafts: LocalDetectedTripDraft[] = [];
  let longTripPostMergeCount = 0;
  let index = 0;

  while (index < sortedDrafts.length) {
    const group = [sortedDrafts[index]];
    let cursor = index + 1;

    while (cursor < sortedDrafts.length && canPostMergeDrafts(group, sortedDrafts[cursor])) {
      group.push(sortedDrafts[cursor]);
      cursor += 1;
    }

    if (group.length > 1) {
      const mergedDraft = buildMergedLongTripDraft(group);

      if (mergedDraft && canKeepMergedLongTrip(mergedDraft)) {
        mergedDrafts.push(mergedDraft);
        longTripPostMergeCount += 1;
        index = cursor;
        continue;
      }
    }

    mergedDrafts.push(sortedDrafts[index]);
    index += 1;
  }

  return {
    drafts: mergedDrafts,
    longTripPostMergeCount,
  };
}

function applyRepeatedLocalClusterMetadata(draftsToAnalyze: LocalDetectedTripDraft[]) {
  const clusters = new Map<string, LocalDetectedTripDraft[]>();

  for (const draft of draftsToAnalyze) {
    const clusterKey = getRepeatedLocalClusterKey(
      draft.debugMetadata.centroidLat,
      draft.debugMetadata.centroidLng,
    );

    if (!clusterKey) {
      continue;
    }

    const clusterDrafts = clusters.get(clusterKey) ?? [];
    clusterDrafts.push(draft);
    clusters.set(clusterKey, clusterDrafts);
  }

  for (const [clusterKey, clusterDrafts] of clusters) {
    const sortedDrafts = [...clusterDrafts].sort((left, right) => left.startDate.localeCompare(right.startDate));
    const firstDraft = sortedDrafts[0];
    const lastDraft = sortedDrafts[sortedDrafts.length - 1];
    const activeMonths = new Set<string>();

    for (const draft of sortedDrafts) {
      activeMonths.add(getMonthKey(draft.startDate));
      activeMonths.add(getMonthKey(draft.endDate));
    }

    const dateSpanDays = firstDraft && lastDraft
      ? getDateSpanDays(firstDraft.startDate, lastDraft.endDate)
      : 1;

    for (const draft of clusterDrafts) {
      draft.debugMetadata.repeatedLocalClusterKey = clusterKey;
      draft.debugMetadata.repeatedLocalClusterCandidateCount = clusterDrafts.length;
      draft.debugMetadata.repeatedLocalClusterActiveMonthCount = activeMonths.size;
      draft.debugMetadata.repeatedLocalClusterDateSpanDays = dateSpanDays;

      if (
        draft.debugMetadata.dayCount >= LONG_STAY_MIN_DAYS &&
        draft.debugMetadata.dayCount <= LONG_STAY_MAX_DAYS &&
        draft.debugMetadata.gpsActiveDayCount >= 2 &&
        draft.debugMetadata.maxDistanceKm < MIN_SINGLE_DAY_DISTANCE_KM
      ) {
        addWarningReason(draft, 'long_stay_candidate');
        addWarningReason(draft, 'possible_long_stay_candidate');
        addWarningReason(draft, 'static_long_stay_candidate');
        addWarningReason(draft, 'possible_daily_life_long_range');
      } else if (
        draft.debugMetadata.dayCount >= LONG_TRIP_MIN_DAYS &&
        draft.debugMetadata.gpsActiveDayCount >= 2 &&
        draft.debugMetadata.maxDistanceKm < MIN_SINGLE_DAY_DISTANCE_KM
      ) {
        addWarningReason(draft, 'possible_daily_life_long_range');
      }
    }
  }
}

function splitPhotosIntoTripDrafts(photos: LocalDetectedPhoto[]): {
  drafts: LocalDetectedTripDraft[];
  oversizedCandidateSplitCount: number;
  stats: CandidateGenerationStats;
} {
  const buckets = createDateBuckets(photos);
  const segments: Array<{
    buckets: DateBucket[];
    dateGapSplitCount: number;
    splitReason: PhotoImportCandidateSplitReason;
  }> = [];
  let currentSegment: DateBucket[] = [];

  for (const bucket of buckets) {
    const splitReason = currentSegment.length > 0
      ? getCandidateSegmentSplitReason(currentSegment, bucket)
      : null;

    if (splitReason) {
      segments.push({
        buckets: currentSegment,
        dateGapSplitCount: splitReason === 'date_gap' ? 1 : 0,
        splitReason,
      });
      currentSegment = [];
    }

    currentSegment.push(bucket);
  }

  if (currentSegment.length > 0) {
    segments.push({
      buckets: currentSegment,
      dateGapSplitCount: 0,
      splitReason: 'final_chunk',
    });
  }

  let oversizedCandidateSplitCount = 0;
  const candidatePhotoChunks: CandidatePhotoChunk[] = segments.flatMap((segment) => {
    const segmentPhotoCount = segment.buckets.reduce((total, bucket) => total + bucket.photos.length, 0);
    const chunks = splitOversizedSegment(segment.buckets);
    const oversizedSplitCount = segmentPhotoCount > MAX_PHOTOS_PER_TRIP_CANDIDATE && chunks.length > 1
      ? chunks.length - 1
      : 0;

    if (oversizedSplitCount > 0) {
      oversizedCandidateSplitCount += oversizedSplitCount;
    }

    return chunks.map((chunk) => ({
      dateGapSplitCount: segment.dateGapSplitCount,
      oversizedSplitCount,
      photos: chunk,
      splitReason: oversizedSplitCount > 0 ? 'max_photos_exceeded' : segment.splitReason,
    }));
  });
  const initialDrafts = candidatePhotoChunks
    .filter((chunk) => chunk.photos.length >= MIN_PHOTOS_PER_TRIP_CANDIDATE)
    .map((chunk) => buildDraftFromPhotos(
      chunk.photos,
      createDraftId('photo-scan'),
      chunk.splitReason,
      chunk.dateGapSplitCount,
      chunk.oversizedSplitCount,
    ))
    .filter((draft): draft is LocalDetectedTripDraft => Boolean(draft));
  const { drafts, longTripPostMergeCount } = postMergeLongTripDrafts(initialDrafts);
  const countBySplitReason = (reason: PhotoImportCandidateSplitReason) => (
    candidatePhotoChunks.filter((chunk) => chunk.splitReason === reason).length
  );
  const countByDuration = (minDays: number, maxDays = Number.POSITIVE_INFINITY) => (
    drafts.filter((draft) => (
      draft.debugMetadata.dayCount >= minDays &&
      draft.debugMetadata.dayCount <= maxDays
    )).length
  );

  return {
    drafts,
    oversizedCandidateSplitCount,
    stats: {
      candidateCountAfterLongTripMerge: drafts.length,
      initialRangeCandidateCount: initialDrafts.length,
      longTripCandidateCount: countByDuration(LONG_TRIP_MIN_DAYS, LONG_TRIP_MAX_DAYS),
      longTripPostMergeCount,
      oneDayCandidateCount: countByDuration(1, 1),
      rawDateBucketCount: buckets.length,
      shortTripCandidateCount: countByDuration(2, 7),
      splitByDateGapCount: countBySplitReason('date_gap'),
      splitByDistanceCount: countBySplitReason('distance_exceeded'),
      splitByGpsMixedCount: countBySplitReason('gps_mixed_with_no_gps'),
    },
  };
}

async function hydrateDraftCoverPhoto(draft: LocalDetectedTripDraft) {
  if (isRenderableImageUri(draft.coverPhotoUri)) {
    coverHydrationCompletedDraftIds.add(draft.id);
    return 'skipped_has_cover' as const;
  }

  const photosToTry = draft.days
    .flatMap((day) => day.groups.flatMap((group) => group.photos))
    .filter((photo) => !photo.isScreenshot)
    .sort((left, right) => {
      const leftHasLocation = getPhotoCoordinates(left) ? 1 : 0;
      const rightHasLocation = getPhotoCoordinates(right) ? 1 : 0;

      if (leftHasLocation !== rightHasLocation) {
        return rightHasLocation - leftHasLocation;
      }

      return new Date(left.takenAt).getTime() - new Date(right.takenAt).getTime();
    })
    .slice(0, COVER_HYDRATION_MAX_ASSETS_PER_CANDIDATE);

  if (__DEV__) {
    console.info('[photo-import cover hydration] start', {
      assetsTriedForCover: photosToTry.length,
      draftId: draft.id,
      title: draft.title,
    });
  }

  for (const photo of photosToTry) {
    const displayUri = await withTimeout(
      hydratePhotoDisplayUri(photo),
      COVER_HYDRATION_TIMEOUT_MS,
      null,
    );

    if (displayUri) {
      draft.coverPhotoUri = displayUri;
      draft.coverAssetId = photo.assetId;
      draft.thumbnailCount = draft.days.reduce((total, day) => (
        total + day.groups.reduce((groupTotal, group) => (
          groupTotal + group.photos.filter((groupPhoto) => isRenderableImageUri(groupPhoto.displayUri)).length
        ), 0)
      ), 0);

      if (__DEV__) {
        console.info('[photo-import cover hydration] success', {
          assetsTriedForCover: photosToTry.length,
          draftId: draft.id,
          hydratedCoverPhotoUriExists: Boolean(draft.coverPhotoUri),
        });
      }

      coverHydrationCompletedDraftIds.add(draft.id);
      coverHydrationFailedDraftIds.delete(draft.id);
      return 'success' as const;
    }
  }

  if (__DEV__) {
    console.info('[photo-import cover hydration] fail', {
      assetsTriedForCover: photosToTry.length,
      draftId: draft.id,
      hydratedCoverPhotoUriExists: false,
    });
  }

  coverHydrationFailedDraftIds.add(draft.id);
  return 'failed' as const;
}

async function hydrateDraftTitle(draft: LocalDetectedTripDraft) {
  const titleBefore = draft.title;
  const startedAt = draft.debugMetadata.titleEnrichmentStartedAt ?? new Date().toISOString();
  draft.debugMetadata.titleEnrichmentStartedAt = startedAt;
  draft.debugMetadata.titleGeocodingQueued = true;

  if (applyLocatedGroupLabelTitle(draft)) {
    draft.debugMetadata.titleEnrichmentElapsedMs =
      Date.now() - new Date(startedAt).getTime();
    return;
  }

  const titleCoordinates = getCandidateTitleCoordinateAttempts(draft);
  const primaryTitleCoordinate = syncCandidateTitleCoordinateMetadata(draft);
  const hasGpsPhotos = draft.debugMetadata.gpsPhotoCount > 0;

  draft.fallbackTitle = formatCandidateDateTitle(draft.startDate, draft.endDate);

  if (titleCoordinates.length > 0 && hasGpsPhotos) {
    draft.enrichmentStatus = 'pending';
    draft.displayTitle = PENDING_LOCATION_TITLE;
    draft.title = PENDING_LOCATION_TITLE;
    draft.debugMetadata.candidateTitleLocationSource = 'pending';
    draft.debugMetadata.titleGeocodingInFlight = true;
    draft.debugMetadata.titleGeocodingRetryable = true;
    draft.debugMetadata.titleResolveState = 'pending';

    let didResolveTitle = false;
    let didHitRateLimit = false;

    for (const titleCoordinate of titleCoordinates) {
    const result = await withTimeout(
      reverseGeocodeLocationLabel(titleCoordinate.latitude, titleCoordinate.longitude),
      REVERSE_GEOCODE_TIMEOUT_MS,
      { address: null, failed: true, label: null, rateLimited: false },
    );
    draft.locationLabel = result.label ?? undefined;
    draft.regionLabel = result.label ?? undefined;

    if (result.label) {
      const titleBeforeNormalization = draft.title;
      const wasShowingGenericFallback =
        isGenericLocationFallbackTitle(draft.displayTitle) ||
        isUnresolvedRegionFallbackTitle(draft.displayTitle);
      draft.debugMetadata.rawLocationLabel = result.label ?? undefined;
      draft.debugMetadata.rawPlacemarkCity = result.address?.city ?? undefined;
      draft.debugMetadata.rawPlacemarkCountry = result.address?.country ?? undefined;
      draft.debugMetadata.rawPlacemarkDistrict = result.address?.district ?? undefined;
      draft.debugMetadata.rawPlacemarkRegion = result.address?.region ?? undefined;
      draft.debugMetadata.rawPlacemarkSubregion = result.address?.subregion ?? undefined;

      const { displayTitle, overseasTitleSource, reason } = buildDetectedTripDisplayTitle(
        result.address,
        result.label,
        titleCoordinate.latitude,
        titleCoordinate.longitude,
      );
      draft.enrichmentStatus = 'success';
      draft.displayTitle = displayTitle;
      draft.title = displayTitle;
      draft.debugMetadata.candidateTitleLocationSource = getReverseGeocodeLocationSource(titleCoordinate.source);
      draft.debugMetadata.normalizedCityName = displayTitle.replace(/\s+\S+$/, '');
      draft.debugMetadata.overseasTitleSource = overseasTitleSource;
      draft.debugMetadata.genericFallbackSuppressed = undefined;
      draft.debugMetadata.unresolvedRegionFallbackTitle = undefined;
      draft.debugMetadata.unresolvedTitleFallbackSource = undefined;
      draft.debugMetadata.titleEnrichmentElapsedMs =
        Date.now() - new Date(startedAt).getTime();
      draft.debugMetadata.titleEnrichmentFinalizedAt = new Date().toISOString();
      draft.debugMetadata.titleFinalizeReason =
        wasShowingGenericFallback
          ? 'late_success'
          : 'success';
      draft.debugMetadata.titleGeocodingInFlight = false;
      draft.debugMetadata.titleGeocodingRetryable = false;
      draft.debugMetadata.titleResolveState = 'success';
      didResolveTitle = true;

      if (__DEV__) {
        console.info('[photo-import title normalization]', {
          candidateTitleCoordinateSource: titleCoordinate.source,
          candidateTitleLocationSource: draft.debugMetadata.candidateTitleLocationSource,
          normalizedDisplayTitle: displayTitle,
          overseasTitleSource,
          rawPlacemarkCity: result.address?.city,
          rawPlacemarkCountry: result.address?.country,
          rawPlacemarkDistrict: result.address?.district,
          rawPlacemarkRegion: result.address?.region,
          rawPlacemarkSubregion: result.address?.subregion,
          rawLocationLabel: result.label,
          titleAfter: draft.title,
          titleBefore: titleBeforeNormalization,
          titleNormalizationReason: reason,
        });
      }
      break;
    } else if (result.rateLimited) {
      draft.enrichmentStatus = 'rate_limited';
      draft.displayTitle = PENDING_LOCATION_TITLE;
      draft.title = PENDING_LOCATION_TITLE;
      draft.debugMetadata.candidateTitleLocationSource = 'pending';
      draft.debugMetadata.genericFallbackSuppressed = undefined;
      draft.debugMetadata.unresolvedRegionFallbackTitle = undefined;
      draft.debugMetadata.unresolvedTitleFallbackSource = 'rate_limited';
      draft.debugMetadata.titleEnrichmentElapsedMs =
        Date.now() - new Date(startedAt).getTime();
      draft.debugMetadata.titleEnrichmentFinalizedAt = new Date().toISOString();
      draft.debugMetadata.titleFinalizeReason = 'rate_limited';
      draft.debugMetadata.titleGeocodingInFlight = false;
      draft.debugMetadata.titleGeocodingRetryable = true;
      draft.debugMetadata.titleResolveState = 'pending';
      addWarningReason(draft, 'reverse_geocode_rate_limited');
      didHitRateLimit = true;
      break;
    } else {
      addWarningReason(draft, 'reverse_geocode_failed');
    }
    }

    if (!didResolveTitle && !didHitRateLimit) {
      draft.enrichmentStatus = 'failed';
      const fallbackTitle = getLocationFallbackTitle(primaryTitleCoordinate.latitude, primaryTitleCoordinate.longitude);
      draft.displayTitle = fallbackTitle;
      draft.title = fallbackTitle;
      draft.debugMetadata.candidateTitleLocationSource = 'unresolved_region_fallback';
      draft.debugMetadata.genericFallbackSuppressed = true;
      draft.debugMetadata.unresolvedRegionFallbackTitle = fallbackTitle;
      draft.debugMetadata.unresolvedTitleFallbackSource = 'failed';
      draft.debugMetadata.titleEnrichmentElapsedMs =
        Date.now() - new Date(startedAt).getTime();
      draft.debugMetadata.titleEnrichmentFinalizedAt = new Date().toISOString();
      draft.debugMetadata.titleFinalizeReason = 'failed';
      draft.debugMetadata.titleGeocodingInFlight = false;
      draft.debugMetadata.titleGeocodingRetryable = false;
      draft.debugMetadata.titleResolveState = 'unresolved';
      addWarningReason(draft, 'no_location_label');
    }
  } else {
    draft.enrichmentStatus = 'failed';
    const fallbackTitle = hasGpsPhotos
      ? getLocationFallbackTitle(primaryTitleCoordinate.latitude, primaryTitleCoordinate.longitude)
      : DETECTED_TRIP_TITLE;
    draft.displayTitle = fallbackTitle;
    draft.title = fallbackTitle;
    draft.debugMetadata.candidateTitleLocationSource = hasGpsPhotos ? 'unresolved_region_fallback' : 'pending';
    draft.debugMetadata.genericFallbackSuppressed = hasGpsPhotos;
    draft.debugMetadata.unresolvedRegionFallbackTitle = hasGpsPhotos ? fallbackTitle : undefined;
    draft.debugMetadata.unresolvedTitleFallbackSource = hasGpsPhotos ? 'finalized_without_label' : undefined;
    draft.debugMetadata.titleEnrichmentElapsedMs =
      Date.now() - new Date(startedAt).getTime();
    draft.debugMetadata.titleEnrichmentFinalizedAt = new Date().toISOString();
    draft.debugMetadata.titleFinalizeReason = hasGpsPhotos ? 'finalized_without_label' : 'failed';
    draft.debugMetadata.titleGeocodingInFlight = false;
    draft.debugMetadata.titleGeocodingRetryable = false;
    draft.debugMetadata.titleResolveState = hasGpsPhotos ? 'unresolved' : 'failed';
    addWarningReason(draft, hasGpsPhotos ? 'invalid_centroid' : 'no_gps_for_title');
  }

  if (__DEV__) {
    console.info('[photo-import candidate title]', {
      draftId: draft.id,
      locationLabel: draft.locationLabel,
      enrichmentStatus: draft.enrichmentStatus,
      titleAfter: draft.title,
      titleBefore,
    });
  }
}

function finalizePendingTitleForUi(
  draft: LocalDetectedTripDraft,
  reason: 'skipped' | 'ui_timeout' | 'finalized_without_label',
) {
  if (
    draft.enrichmentStatus !== 'pending' ||
    draft.displayTitle !== PENDING_LOCATION_TITLE
  ) {
    return false;
  }

  if (applyLocatedGroupLabelTitle(draft)) {
    return true;
  }

  const titleCoordinate = syncCandidateTitleCoordinateMetadata(draft);
  const now = new Date();
  const startedAt = draft.debugMetadata.titleEnrichmentStartedAt
    ? new Date(draft.debugMetadata.titleEnrichmentStartedAt)
    : now;

  draft.enrichmentStatus = reason === 'ui_timeout' ? 'pending_background' : 'pending';
  draft.displayTitle = PENDING_LOCATION_TITLE;
  draft.title = PENDING_LOCATION_TITLE;
  draft.debugMetadata.candidateTitleLocationSource = 'pending';
  draft.debugMetadata.genericFallbackSuppressed = undefined;
  draft.debugMetadata.unresolvedRegionFallbackTitle = undefined;
  draft.debugMetadata.unresolvedTitleFallbackSource = reason;
  draft.debugMetadata.titleEnrichmentElapsedMs = now.getTime() - startedAt.getTime();
  draft.debugMetadata.titleFinalizeReason = reason;
  draft.debugMetadata.titleGeocodingRetryable = true;
  draft.debugMetadata.titleResolveState = 'pending';

  if (reason === 'skipped') {
    draft.debugMetadata.titleGeocodingSkippedReason = 'visible_queue_limit';
  }

  if (__DEV__) {
    console.info('[photo-import candidate title] finalized pending UI title', {
      draftId: draft.id,
      displayTitle: draft.displayTitle,
      reason,
      titleCoordinateSource: titleCoordinate.source,
    });
  }

  return true;
}

function canShowDraftAsCandidate(draft: LocalDetectedTripDraft) {
  if (draft.saveStatus === 'saved' && draft.savedTripId) {
    return false;
  }

  if (getSavedDetectedCandidateMatch(draft)) {
    return false;
  }

  const quality = syncCandidateQualityMetadata(draft);
  return (
    quality.hiddenReasons.length === 0 &&
    (
      quality.candidateQualityType === 'high_confidence_trip' ||
      quality.candidateQualityType === 'long_stay_candidate'
    )
  );
}

function getVisibleLocalDetectedTripCandidates() {
  return getVisibleCandidateDrafts([...drafts.values()]).map(createCandidateFromDraft);
}

function canQueueDraftTitleEnrichment(draft: LocalDetectedTripDraft) {
  const quality = syncCandidateQualityMetadata(draft);
  const blockingReasons = quality.hiddenReasons.filter((reason) => (
    reason !== 'location_title_unresolved_low_confidence'
  ));
  const titleCoordinate = getCandidateTitleCoordinate(draft);

  return (
    blockingReasons.length === 0 &&
    quality.isLocationTitlePending &&
    draft.debugMetadata.gpsPhotoCount > 0 &&
    isFiniteCoordinateValue(titleCoordinate.latitude) &&
    isFiniteCoordinateValue(titleCoordinate.longitude)
  );
}

function evaluateCandidateQuality(draft: LocalDetectedTripDraft): {
  candidateQualityScore: number;
  candidateQualityType: PhotoImportCandidateQualityType;
  hiddenReasons: string[];
  isHighConfidenceTrip: boolean;
  isLikelyDailyLifeCandidate: boolean;
  isLocationTitlePending: boolean;
  isLowMobilityCandidate: boolean;
  reviewNeededReasons: string[];
} {
  const reasons: string[] = [];
  const reviewNeededReasons: string[] = [];
  const metadata = draft.debugMetadata;
  const hasValidCentroid =
    isFiniteCoordinateValue(metadata.centroidLat) &&
    isFiniteCoordinateValue(metadata.centroidLng);
  const isOverseasCandidate =
    hasValidCentroid &&
    !isCoordinateInKorea(metadata.centroidLat, metadata.centroidLng);
  const hasLocationTitle = hasResolvedCandidateDisplayTitle(draft);
  const isLocationTitlePending =
    draft.enrichmentStatus === 'pending' ||
    draft.displayTitle === PENDING_LOCATION_TITLE ||
    draft.title === PENDING_LOCATION_TITLE;
  const isSavedImageHeavy =
    metadata.savedImageRatio >= SAVED_IMAGE_HEAVY_RATIO &&
    metadata.realPhotoCount < MIN_SINGLE_DAY_VISIBLE_PHOTOS;
  const isHiddenHomeRegionCandidate = metadata.excludedBecauseHomeRegion === true;
  const isLongTripPostMerged = metadata.splitReason === 'long_trip_post_merged';
  const isProtectedLongStayCandidate =
    metadata.dayCount >= LONG_STAY_MIN_DAYS &&
    metadata.dayCount <= LONG_STAY_MAX_DAYS &&
    metadata.realPhotoCount >= MIN_LONG_TRIP_REAL_PHOTOS &&
    metadata.gpsPhotoCount >= MIN_ONE_DAY_STRICT_GPS_PHOTOS &&
    metadata.gpsActiveDayCount >= 2 &&
    !metadata.warningReasons.includes('screenshot_only_or_mostly_screenshot') &&
    !isSavedImageHeavy;
  const repeatedCount = metadata.repeatedLocalClusterCandidateCount ?? 0;
  const isRepeatedLow = repeatedCount < REPEATED_LOCAL_LOW_COUNT;
  const hasMobility =
    metadata.maxDistanceKm >= 5 ||
    metadata.locationClusterCount >= 2 ||
    isOverseasCandidate;
  const isLikelyRepeatedLocalCandidate =
    repeatedCount >= REPEATED_LOCAL_CLUSTER_HIDE_COUNT &&
    metadata.maxDistanceKm < MIN_SINGLE_DAY_DISTANCE_KM &&
    metadata.locationClusterCount <= 1 &&
    metadata.dayCount <= 2 &&
    isCoordinateInKorea(metadata.centroidLat, metadata.centroidLng) &&
    !isLongTripPostMerged;
  const isLikelyDailyPhotoEvent =
    metadata.dayCount === 1 &&
    repeatedCount >= REPEATED_LOCAL_EVENT_HIDE_COUNT &&
    metadata.maxDistanceKm < 2 &&
    metadata.realPhotoCount < 40;
  const dateSpanDays = getDateSpanDays(metadata.startDate, metadata.endDate);
  const isNonContinuousMultiDayCandidate = dateSpanDays > metadata.dayCount;
  const isLowMobilityMultiDayCandidate =
    metadata.dayCount >= 2 &&
    metadata.dayCount <= 5 &&
    metadata.maxDistanceKm < 5 &&
    metadata.locationClusterCount <= 1 &&
    repeatedCount >= REPEATED_LOCAL_LOW_COUNT &&
    !isOverseasCandidate &&
    !isProtectedLongStayCandidate &&
    metadata.maxDistanceKm < MIN_ONE_DAY_RELAXED_DISTANCE_KM;
  const isLowMobilityCandidate =
    metadata.dayCount <= 2 &&
    metadata.gpsActiveDayCount <= 1 &&
    metadata.maxDistanceKm < 5 &&
    metadata.locationClusterCount <= 1 &&
    repeatedCount >= REPEATED_LOCAL_LOW_COUNT &&
    !isOverseasCandidate &&
    !isProtectedLongStayCandidate;
  const hasGoodBaseEvidence =
    hasValidCentroid &&
    metadata.confidenceLevel !== 'low' &&
    metadata.gpsPhotoCount >= MIN_VISIBLE_GPS_PHOTOS &&
    metadata.realPhotoCount >= MIN_REAL_PHOTOS_PER_VISIBLE_CANDIDATE &&
    !isSavedImageHeavy &&
    !metadata.warningReasons.includes('screenshot_only_or_mostly_screenshot');
  const isOneDayException =
    metadata.dayCount === 1 &&
    (
      metadata.maxDistanceKm >= 20 ||
      isOverseasCandidate
    ) &&
    metadata.realPhotoCount >= MIN_ONE_DAY_STRICT_REAL_PHOTOS &&
    metadata.gpsPhotoCount >= MIN_ONE_DAY_STRICT_GPS_PHOTOS &&
    metadata.locationClusterCount >= 2 &&
    hasLocationTitle &&
    isRepeatedLow &&
    hasGoodBaseEvidence;
  const isGeneralTripCandidate =
    metadata.dayCount >= 2 &&
    metadata.dayCount <= 14 &&
    metadata.gpsActiveDayCount >= 2 &&
    metadata.realPhotoCount >= MIN_SHORT_TRIP_REAL_PHOTOS &&
    metadata.gpsPhotoCount >= MIN_VISIBLE_GPS_PHOTOS &&
    hasGoodBaseEvidence &&
    hasLocationTitle &&
    (isRepeatedLow || hasMobility);
  const isHighMobilityCandidate =
    metadata.maxDistanceKm >= MIN_ONE_DAY_RELAXED_DISTANCE_KM &&
    metadata.realPhotoCount >= MIN_SHORT_TRIP_REAL_PHOTOS &&
    metadata.gpsPhotoCount >= MIN_VISIBLE_GPS_PHOTOS &&
    hasGoodBaseEvidence;
  const isOverseasTripCandidate =
    isOverseasCandidate &&
    metadata.realPhotoCount >= MIN_REAL_PHOTOS_PER_VISIBLE_CANDIDATE &&
    metadata.gpsPhotoCount >= MIN_VISIBLE_GPS_PHOTOS &&
    hasGoodBaseEvidence;
  const isLongTripCandidate =
    metadata.dayCount >= LONG_TRIP_MIN_DAYS &&
    metadata.realPhotoCount >= MIN_LONG_TRIP_REAL_PHOTOS &&
    metadata.gpsPhotoCount >= MIN_ONE_DAY_STRICT_GPS_PHOTOS &&
    metadata.gpsActiveDayCount >= 2 &&
    hasGoodBaseEvidence;
  const isExtendedJourneyCandidate =
    metadata.dayCount > LONG_STAY_MAX_DAYS &&
    metadata.realPhotoCount >= MIN_LONG_TRIP_REAL_PHOTOS &&
    metadata.gpsPhotoCount >= MIN_ONE_DAY_STRICT_GPS_PHOTOS &&
    metadata.gpsActiveDayCount >= 2 &&
    hasGoodBaseEvidence;
  const isHighConfidenceTrip =
    isOneDayException ||
    isGeneralTripCandidate ||
    isHighMobilityCandidate ||
    isOverseasTripCandidate ||
    isLongTripCandidate;
  let candidateQualityScore = metadata.confidenceScore;

  if (metadata.confidenceLevel === 'low') {
    reasons.push('confidence_low');
    candidateQualityScore -= 20;
  }

  if (isHiddenHomeRegionCandidate) {
    reasons.push('hidden_home_region');
  }

  if (metadata.gpsPhotoCount <= 0) {
    reasons.push('no_gps_for_title');
    reviewNeededReasons.push('weak_location_evidence');
    candidateQualityScore -= 20;
  } else if (metadata.gpsPhotoCount < MIN_VISIBLE_GPS_PHOTOS) {
    reasons.push('low_gps_photo_count');
    reviewNeededReasons.push('weak_location_evidence');
    candidateQualityScore -= 12;
  }

  if (!hasValidCentroid) {
    reasons.push('invalid_centroid');
    reviewNeededReasons.push('weak_location_evidence');
    candidateQualityScore -= 15;
  }

  if (metadata.warningReasons.includes('screenshot_only_or_mostly_screenshot')) {
    reasons.push('screenshot_only_or_mostly_screenshot');
    candidateQualityScore -= 20;
  }

  if (isSavedImageHeavy) {
    reasons.push('saved_image_heavy_candidate');
    candidateQualityScore -= 15;
  }

  if (isLikelyRepeatedLocalCandidate) {
    reasons.push('likely_repeated_daily_location_candidate');
  }

  if (isLikelyDailyPhotoEvent) {
    reasons.push('likely_daily_photo_event');
  }

  if (isLowMobilityCandidate) {
    reasons.push('low_mobility_candidate');
    reasons.push('likely_daily_life_candidate');
    reasons.push('repeated_local_daily_candidate');
    reviewNeededReasons.push('possible_daily_life_candidate');
    reviewNeededReasons.push('low_mobility_but_enough_photos');
    candidateQualityScore -= 20;
  }

  if (isLowMobilityMultiDayCandidate) {
    reasons.push('merged_daily_events_candidate');
    reasons.push('low_mobility_multi_day_candidate');
    reasons.push('repeated_local_multi_day_candidate');
    reasons.push('likely_daily_life_candidate');

    if (isNonContinuousMultiDayCandidate) {
      reasons.push('non_continuous_daily_events_candidate');
    }

    reviewNeededReasons.push('possible_daily_life_candidate');
    reviewNeededReasons.push('low_mobility_but_enough_photos');
    candidateQualityScore -= 25;
  }

  if (isLocationTitlePending && !isHighConfidenceTrip) {
    reasons.push('location_title_unresolved_low_confidence');
    reviewNeededReasons.push('location_title_pending');
    candidateQualityScore -= 10;
  }

  if (!hasLocationTitle && !isHighConfidenceTrip) {
    reviewNeededReasons.push('weak_location_evidence');
  }

  if (metadata.realPhotoCount < MIN_REAL_PHOTOS_PER_VISIBLE_CANDIDATE) {
    reasons.push('too_few_real_photos');
    candidateQualityScore -= 20;
  }

  if (metadata.dayCount === 1) {
    const oneDayStrictEnough =
      metadata.realPhotoCount >= MIN_ONE_DAY_STRICT_REAL_PHOTOS &&
      metadata.gpsPhotoCount >= MIN_ONE_DAY_STRICT_GPS_PHOTOS &&
      (
        metadata.maxDistanceKm >= MIN_SINGLE_DAY_DISTANCE_KM ||
        metadata.locationClusterCount >= 2
      );
    const oneDayRelaxedForMovement =
      metadata.maxDistanceKm >= MIN_ONE_DAY_RELAXED_DISTANCE_KM &&
      metadata.realPhotoCount >= MIN_SHORT_TRIP_REAL_PHOTOS &&
      metadata.gpsPhotoCount >= MIN_VISIBLE_GPS_PHOTOS;

    if (!oneDayStrictEnough && !oneDayRelaxedForMovement) {
      reasons.push('weak_one_day_candidate');
      reviewNeededReasons.push('one_day_candidate');
    }

    if (metadata.realPhotoCount < MIN_ONE_DAY_STRICT_REAL_PHOTOS && !oneDayRelaxedForMovement) {
      reasons.push('too_few_camera_photos_for_one_day');
    }

    if (metadata.maxDistanceKm < MIN_SINGLE_DAY_DISTANCE_KM && metadata.locationClusterCount < 2) {
      reasons.push('too_static_one_day_candidate');
      reasons.push('likely_daily_event_not_trip');
      reviewNeededReasons.push('possible_daily_life_candidate');
    }
  } else if (metadata.dayCount < LONG_TRIP_MIN_DAYS) {
    if (metadata.realPhotoCount < MIN_SHORT_TRIP_REAL_PHOTOS) {
      reasons.push('too_few_camera_photos_for_short_trip');
      reviewNeededReasons.push('weak_location_evidence');
    }
  } else if (
    !isProtectedLongStayCandidate &&
    (
      metadata.realPhotoCount < MIN_LONG_TRIP_REAL_PHOTOS ||
      metadata.gpsPhotoCount < MIN_ONE_DAY_STRICT_GPS_PHOTOS ||
      metadata.gpsActiveDayCount < 2 ||
      isSavedImageHeavy
    )
  ) {
    reasons.push('weak_long_trip_candidate');
    reviewNeededReasons.push('weak_location_evidence');
  }

  let candidateQualityType: PhotoImportCandidateQualityType = 'review_needed_candidate';

  if (
    reasons.includes('hidden_home_region') ||
    reasons.includes('likely_daily_life_candidate') ||
    reasons.includes('likely_daily_event_not_trip') ||
    reasons.includes('likely_repeated_daily_location_candidate') ||
    reasons.includes('likely_daily_photo_event') ||
    reasons.includes('merged_daily_events_candidate')
  ) {
    candidateQualityType = 'daily_life_candidate';
  } else if (
    reasons.includes('weak_one_day_candidate') ||
    reasons.includes('weak_long_trip_candidate') ||
    reasons.includes('too_few_real_photos') ||
    reasons.includes('low_mobility_candidate')
  ) {
    candidateQualityType = 'weak_candidate';
  } else if (isExtendedJourneyCandidate) {
    candidateQualityType = 'extended_journey_candidate';
    reviewNeededReasons.push('weak_location_evidence');
  } else if (isProtectedLongStayCandidate) {
    candidateQualityType = 'long_stay_candidate';
  } else if (isHighConfidenceTrip) {
    candidateQualityType = 'high_confidence_trip';
  }

  if (candidateQualityType === 'review_needed_candidate') {
    reviewNeededReasons.push('review_needed_candidate');
  }

  return {
    candidateQualityScore: clampScore(candidateQualityScore),
    candidateQualityType,
    hiddenReasons: [...new Set(reasons)],
    isHighConfidenceTrip,
    isLikelyDailyLifeCandidate: candidateQualityType === 'daily_life_candidate',
    isLocationTitlePending,
    isLowMobilityCandidate,
    reviewNeededReasons: [...new Set(reviewNeededReasons)],
  };
}

function syncCandidateQualityMetadata(draft: LocalDetectedTripDraft) {
  const titleCoordinate = syncCandidateTitleCoordinateMetadata(draft);
  const quality = evaluateCandidateQuality(draft);
  draft.debugMetadata.candidateQualityScore = quality.candidateQualityScore;
  draft.debugMetadata.candidateQualityType = quality.candidateQualityType;
  draft.debugMetadata.candidateTitleCoordinateSource = titleCoordinate.source;
  draft.debugMetadata.candidateTitleLocationSource =
    draft.debugMetadata.candidateTitleLocationSource ??
    (draft.locationLabel
      ? 'candidate_location_label'
      : quality.isLocationTitlePending ? 'pending' : 'unresolved_region_fallback');
  draft.debugMetadata.hasLocationTitle = hasResolvedCandidateDisplayTitle(draft);
  draft.debugMetadata.hiddenReasons = quality.hiddenReasons;
  draft.debugMetadata.isHighConfidenceTrip = quality.isHighConfidenceTrip;
  draft.debugMetadata.isLikelyDailyLifeCandidate = quality.isLikelyDailyLifeCandidate;
  draft.debugMetadata.isLocationTitlePending = quality.isLocationTitlePending;
  draft.debugMetadata.isLowMobilityCandidate = quality.isLowMobilityCandidate;
  draft.debugMetadata.isOverseasCandidate = isOverseasCoordinate(titleCoordinate.latitude, titleCoordinate.longitude);
  draft.debugMetadata.normalizedCityName = draft.debugMetadata.normalizedCityName ?? (
    draft.displayTitle !== PENDING_LOCATION_TITLE &&
    draft.displayTitle !== LOCATION_BASED_TRIP_TITLE &&
    draft.displayTitle !== OVERSEAS_TRIP_TITLE &&
    draft.displayTitle !== UNRESOLVED_REGION_TITLE
      ? draft.displayTitle.replace(/\s+\S+$/, '')
      : undefined
  );
  draft.debugMetadata.reviewNeededReasons = quality.reviewNeededReasons;
  draft.debugMetadata.wasMergedFromDailyEvents = quality.hiddenReasons.includes('merged_daily_events_candidate');

  return quality;
}

function getCandidateHiddenReasons(draft: LocalDetectedTripDraft) {
  return syncCandidateQualityMetadata(draft).hiddenReasons;
}

function getVisibleCandidateDrafts(draftsToFilter: LocalDetectedTripDraft[]) {
  return sortDetectedDraftsOldestFirst(draftsToFilter.filter(canShowDraftAsCandidate));
}

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function enrichDraftTitlesInBackground(
  draftsToEnrich: LocalDetectedTripDraft[],
  onCandidatesUpdated?: (candidates: PhotoImportTripCandidate[]) => void,
) {
  const visiblePendingDrafts = draftsToEnrich
    .filter((draft) => canShowDraftAsCandidate(draft) || canQueueDraftTitleEnrichment(draft))
    .filter((draft) => draft.enrichmentStatus === 'pending')
    .sort((left, right) => {
      const leftNeedsLocation = !left.locationLabel ? 1 : 0;
      const rightNeedsLocation = !right.locationLabel ? 1 : 0;

      if (leftNeedsLocation !== rightNeedsLocation) {
        return rightNeedsLocation - leftNeedsLocation;
      }

      return right.debugMetadata.gpsPhotoCount - left.debugMetadata.gpsPhotoCount;
    });
  const queue = visiblePendingDrafts.slice(0, TITLE_REVERSE_GEOCODE_VISIBLE_LIMIT);
  const skippedDrafts = visiblePendingDrafts.slice(TITLE_REVERSE_GEOCODE_VISIBLE_LIMIT);

  for (const draft of visiblePendingDrafts) {
    draft.debugMetadata.titleEnrichmentStartedAt =
      draft.debugMetadata.titleEnrichmentStartedAt ?? new Date().toISOString();
  }

  for (const draft of skippedDrafts) {
    draft.debugMetadata.titleGeocodingQueued = false;
    finalizePendingTitleForUi(draft, 'skipped');
  }

  if (__DEV__) {
    console.info('[photo-import enrichment] geocoding queue started', {
      pendingTitleMaxAgeMs: PENDING_TITLE_MAX_AGE_MS,
      titleGeocodingQueueLimit: TITLE_REVERSE_GEOCODE_VISIBLE_LIMIT,
      titleGeocodingQueuedVisibleCandidateCount: queue.length,
      titleGeocodingSkippedVisibleCandidateCount: Math.max(0, visiblePendingDrafts.length - queue.length),
      titleGeocodingVisibleCandidateCount: visiblePendingDrafts.length,
      locationTitleEnrichmentQueuedCount: queue.length,
      locationTitleEnrichmentSkippedCount: Math.max(0, visiblePendingDrafts.length - queue.length),
      geocodingQueueSize: queue.length,
    });
  }

  if (skippedDrafts.length > 0) {
    onCandidatesUpdated?.(getVisibleCandidateDrafts(draftsToEnrich).map(createCandidateFromDraft));
  }

  void (async () => {
    let geocodingFailCount = 0;
    let geocodingRateLimitedCount = 0;
    let geocodingStartedCount = 0;
    let geocodingSuccessCount = 0;
    let titleEnrichmentPendingUiTimedOutCount = 0;

    const timeoutId = setTimeout(() => {
      for (const draft of queue) {
        if (finalizePendingTitleForUi(draft, 'ui_timeout')) {
          titleEnrichmentPendingUiTimedOutCount += 1;
        }
      }

      if (titleEnrichmentPendingUiTimedOutCount > 0) {
        onCandidatesUpdated?.(getVisibleCandidateDrafts(draftsToEnrich).map(createCandidateFromDraft));
      }
    }, PENDING_TITLE_MAX_AGE_MS);

    for (const draft of queue) {
      geocodingStartedCount += 1;
      await hydrateDraftTitle(draft);

      if (draft.enrichmentStatus === 'success') {
        geocodingSuccessCount += 1;
      } else if (draft.enrichmentStatus === 'rate_limited') {
        geocodingRateLimitedCount += 1;
        break;
      } else if (draft.enrichmentStatus === 'failed') {
        geocodingFailCount += 1;
      }

      onCandidatesUpdated?.(getVisibleCandidateDrafts(draftsToEnrich).map(createCandidateFromDraft));
      await wait(REVERSE_GEOCODE_DELAY_MS);
    }

    clearTimeout(timeoutId);
    onCandidatesUpdated?.(getVisibleCandidateDrafts(draftsToEnrich).map(createCandidateFromDraft));

    if (__DEV__) {
      console.info('[photo-import enrichment] geocoding queue completed', {
        geocodingFailCount,
        geocodingQueueSize: queue.length,
        geocodingRateLimitedCount,
        geocodingStartedCount,
        geocodingSuccessCount,
        titleEnrichmentPendingUiTimedOutCount,
      });
    }
  })();
}

function createCandidateFromDraft(draft: LocalDetectedTripDraft): PhotoImportTripCandidate {
  syncCandidateTitleCoordinateMetadata(draft);
  const start = formatCandidateCardDate(draft.startDate);
  const end = formatCandidateCardDate(draft.endDate);
  const displayTitle = getUserFacingDetectedTitle(draft.displayTitle);

  return {
    city: displayTitle,
    country: '',
    dateRange: start === end ? start : `${start}-${end}`,
    id: draft.id,
    debugMetadata: draft.debugMetadata,
    image: isRenderableImageUri(draft.coverPhotoUri)
      ? ({ uri: draft.coverPhotoUri } satisfies ImageSourcePropType)
      : ({ uri: SAFE_PLACEHOLDER_IMAGE_URI } satisfies ImageSourcePropType),
    initiallySelected: true,
    photoCount: draft.photoCount,
  };
}

function formatCandidateCardDate(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);

  if (!year || !month || !day) {
    return dateKey.replaceAll('-', '.');
  }

  return `${year}.${month}.${day}`;
}

export async function hydrateLocalDetectedTripDraftCovers(
  draftIds: string[],
  options: {
    maxCandidates?: number;
    onCandidatesUpdated?: (candidates: PhotoImportTripCandidate[]) => void;
  } = {},
) {
  const maxCandidates = options.maxCandidates ?? COVER_HYDRATION_INITIAL_CANDIDATE_LIMIT;
  const visibleDrafts = getVisibleCandidateDrafts([...drafts.values()]);
  const requestedDrafts = draftIds
    .map((draftId) => drafts.get(draftId))
    .filter((draft): draft is LocalDetectedTripDraft => Boolean(draft))
    .filter(canShowDraftAsCandidate)
    .filter((draft) => !coverHydrationInFlightDraftIds.has(draft.id))
    .filter((draft) => !coverHydrationCompletedDraftIds.has(draft.id))
    .filter((draft) => !coverHydrationFailedDraftIds.has(draft.id))
    .filter((draft) => !isRenderableImageUri(draft.coverPhotoUri))
    .slice(0, maxCandidates);

  let coverThumbnailFailedCount = 0;
  let coverThumbnailSkippedAlreadyHasCoverCount = draftIds.filter((draftId) => {
    const draft = drafts.get(draftId);
    return Boolean(draft && isRenderableImageUri(draft.coverPhotoUri));
  }).length;
  let coverThumbnailStartedCount = 0;
  let coverThumbnailSuccessCount = 0;
  let coverThumbnailTimeoutCount = 0;

  if (__DEV__) {
    console.info('[photo-import cover thumbnail] queue started', {
      coverThumbnailNetworkDownloadAllowed: true,
      coverThumbnailQueueSize: requestedDrafts.length,
      coverThumbnailSkippedAlreadyHasCoverCount,
      coverThumbnailSkippedOffscreenCount: Math.max(0, visibleDrafts.length - requestedDrafts.length),
    });
  }

  for (const draft of requestedDrafts) {
    coverHydrationInFlightDraftIds.add(draft.id);
    coverThumbnailStartedCount += 1;

    if (__DEV__) {
      console.info('[photo-import cover thumbnail] hydrate start', {
        activeCoverHydrationDraftId: draft.id,
      });
    }

    const result = await withTimeout(
      hydrateDraftCoverPhoto(draft),
      COVER_HYDRATION_TIMEOUT_MS,
      'timeout' as const,
    );

    coverHydrationInFlightDraftIds.delete(draft.id);

    if (result === 'success') {
      coverThumbnailSuccessCount += 1;
      options.onCandidatesUpdated?.(getVisibleCandidateDrafts([...drafts.values()]).map(createCandidateFromDraft));
    } else if (result === 'timeout') {
      coverThumbnailTimeoutCount += 1;
      coverHydrationFailedDraftIds.add(draft.id);
    } else if (result === 'failed') {
      coverThumbnailFailedCount += 1;
    } else if (result === 'skipped_has_cover') {
      coverThumbnailSkippedAlreadyHasCoverCount += 1;
    }

    await wait(COVER_HYDRATION_DELAY_MS);
  }

  options.onCandidatesUpdated?.(getVisibleCandidateDrafts([...drafts.values()]).map(createCandidateFromDraft));

  if (__DEV__) {
    console.info('[photo-import cover thumbnail] queue completed', {
      coverThumbnailFailedCount,
      coverThumbnailNetworkDownloadAllowed: true,
      coverThumbnailQueueSize: requestedDrafts.length,
      coverThumbnailSkippedAlreadyHasCoverCount,
      coverThumbnailStartedCount,
      coverThumbnailSuccessCount,
      coverThumbnailTimeoutCount,
    });
  }
}

function storeDrafts(nextDrafts: LocalDetectedTripDraft[]) {
  for (const draft of nextDrafts) {
    drafts.set(draft.id, draft);
  }
}

function yieldToEventLoop() {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

export async function hydrateSavedDetectedCandidateRegistry(userId?: string | null) {
  if (!userId) {
    savedDetectedCandidateRegistry.clear();
    savedDetectedCandidateRegistryUserId = null;
    savedDetectedCandidateRegistryLoaded = true;
    return 0;
  }

  if (savedDetectedCandidateRegistryLoaded && savedDetectedCandidateRegistryUserId === userId) {
    return savedDetectedCandidateRegistry.size;
  }

  savedDetectedCandidateRegistry.clear();
  savedDetectedCandidateRegistryUserId = userId;
  savedDetectedCandidateRegistryLoaded = false;

  try {
    const rawState = await AsyncStorage.getItem(getSavedDetectedCandidateRegistryKey(userId));
    const parsedState = rawState ? JSON.parse(rawState) as Partial<SavedDetectedCandidateRegistryState> : null;
    const entries = Array.isArray(parsedState?.entries) ? parsedState.entries : [];

    for (const entry of entries) {
      if (
        entry &&
        typeof entry.fingerprint === 'string' &&
        typeof entry.savedTripId === 'string' &&
        Array.isArray(entry.photoIdentifiers)
      ) {
        savedDetectedCandidateRegistry.set(entry.fingerprint, {
          endDate: typeof entry.endDate === 'string' ? entry.endDate : '',
          fingerprint: entry.fingerprint,
          photoIdentifiers: [...new Set(entry.photoIdentifiers.filter((value) => typeof value === 'string'))].sort(),
          savedAt: typeof entry.savedAt === 'string' ? entry.savedAt : new Date().toISOString(),
          savedTripId: entry.savedTripId,
          startDate: typeof entry.startDate === 'string' ? entry.startDate : '',
        });
      }
    }

    let backfilledCount = 0;

    for (const draft of drafts.values()) {
      if (draft.saveStatus !== 'saved' || !draft.savedTripId) {
        continue;
      }

      const { fingerprint, photoIdentifiers } = syncDraftSavedCandidateFingerprint(draft);

      if (savedDetectedCandidateRegistry.has(fingerprint)) {
        continue;
      }

      savedDetectedCandidateRegistry.set(fingerprint, {
        endDate: draft.endDate,
        fingerprint,
        photoIdentifiers,
        savedAt: new Date().toISOString(),
        savedTripId: draft.savedTripId,
        startDate: draft.startDate,
      });
      backfilledCount += 1;
    }

    if (backfilledCount > 0) {
      await persistSavedDetectedCandidateRegistry();
    }

    savedDetectedCandidateRegistryLoaded = true;

    if (__DEV__) {
      console.info('[detected trip saved registry] loaded', {
        detectedTripSavedFingerprintBackfilled: backfilledCount,
        savedDetectedCandidateRegistryLoadedCount: savedDetectedCandidateRegistry.size,
      });
    }

    return savedDetectedCandidateRegistry.size;
  } catch (error) {
    savedDetectedCandidateRegistryLoaded = true;
    console.warn('[detected trip saved registry] load failed', error);
    return savedDetectedCandidateRegistry.size;
  }
}

export async function recordSavedDetectedTripDraft(
  userId: string | null | undefined,
  draftId: string,
  savedTripId: string,
) {
  if (!userId) {
    return false;
  }

  if (!savedDetectedCandidateRegistryLoaded || savedDetectedCandidateRegistryUserId !== userId) {
    await hydrateSavedDetectedCandidateRegistry(userId);
  }

  const draft = drafts.get(draftId);

  if (!draft) {
    return false;
  }

  const { fingerprint, photoIdentifiers } = syncDraftSavedCandidateFingerprint(draft);

  savedDetectedCandidateRegistry.set(fingerprint, {
    endDate: draft.endDate,
    fingerprint,
    photoIdentifiers,
    savedAt: new Date().toISOString(),
    savedTripId,
    startDate: draft.startDate,
  });

  try {
    await persistSavedDetectedCandidateRegistry();

    if (__DEV__) {
      console.info('[detected trip saved registry] persisted', {
        detectedTripSavedFingerprintCreated: getMaskedFingerprint(fingerprint),
        detectedTripSavedFingerprintPersisted: true,
        detectedTripSavedFingerprintPhotoCount: photoIdentifiers.length,
      });
    }

    return true;
  } catch (error) {
    console.warn('[detected trip saved registry] persist failed', {
      detectedTripSavedFingerprintCreated: getMaskedFingerprint(fingerprint),
      detectedTripSavedFingerprintPersistFailed: true,
      detectedTripSavedFingerprintPhotoCount: photoIdentifiers.length,
      error,
    });
    return false;
  }
}

export function createLocalDetectedTripDraftFromAssets(
  assets: PickedPhotoAsset[],
): LocalDetectedTripDraft | null {
  const fallbackDate = new Date();
  const photos = assets.map((asset) => (
    createPhotoFromPickedAsset(asset, getPickedAssetDate(asset, fallbackDate))
  ));
  const draft = buildDraftFromPhotos(photos, createDraftId());

  if (draft) {
    drafts.set(draft.id, draft);
  }

  return draft;
}

export async function pickPhotoLibraryDetectedTripDraft(): Promise<LocalDetectedTripDraft | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) {
    throw new Error('photo-library-permission-denied');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    allowsMultipleSelection: true,
    exif: true,
    mediaTypes: ['images'],
    orderedSelection: false,
    quality: 1,
    selectionLimit: 0,
  });

  if (result.canceled || result.assets.length === 0) {
    return null;
  }

  return createLocalDetectedTripDraftFromAssets(result.assets);
}

export async function hydrateLocalDetectedTripDraftPhotos(
  draftId?: string | null,
  options: {
    maxPhotosPerGroup?: number;
    maxTotalPhotos?: number;
  } = {},
) {
  const draft = getLocalDetectedTripDraft(draftId);

  if (!draft) {
    return undefined;
  }

  const maxPhotosPerGroup = options.maxPhotosPerGroup ?? DETAIL_HYDRATION_MAX_PHOTOS_PER_GROUP;
  const maxTotalPhotos = options.maxTotalPhotos ?? DETAIL_HYDRATION_MAX_TOTAL_PHOTOS;
  const photosToHydrate: LocalDetectedPhoto[] = [];
  const renderableBeforeCount = draft.days.reduce((total, day) => (
    total + day.groups.reduce((groupTotal, group) => (
      groupTotal + group.photos.filter((photo) => isRenderableImageUri(photo.displayUri)).length
    ), 0)
  ), 0);

  for (const day of draft.days) {
    for (const group of day.groups) {
      const groupPhotos = group.photos
        .filter((photo) => !isRenderableImageUri(photo.displayUri))
        .slice(0, maxPhotosPerGroup);

      for (const photo of groupPhotos) {
        if (photosToHydrate.length >= maxTotalPhotos) {
          break;
        }

        photosToHydrate.push(photo);
      }

      if (photosToHydrate.length >= maxTotalPhotos) {
        break;
      }
    }

    if (photosToHydrate.length >= maxTotalPhotos) {
      break;
    }
  }

  if (__DEV__) {
    console.info('[photo-import detail hydration] start', {
      draftId,
      recordDayDetailHydrationStartedCount: photosToHydrate.length,
      photosToHydrate: photosToHydrate.length,
    });
  }

  let recordDayDetailHydrationSuccessCount = 0;

  for (const photo of photosToHydrate) {
    const displayUri = await withTimeout(
      hydratePhotoDisplayUri(photo),
      COVER_HYDRATION_TIMEOUT_MS,
      null,
    );

    if (displayUri) {
      recordDayDetailHydrationSuccessCount += 1;
    }
  }

  const coverPhoto = draft.days
    .flatMap((day) => day.groups.flatMap((group) => group.photos))
    .find((photo) => isRenderableImageUri(photo.displayUri));

  draft.coverPhotoUri = coverPhoto?.displayUri ?? draft.coverPhotoUri;
  draft.coverAssetId = coverPhoto?.assetId ?? draft.coverAssetId;
  draft.thumbnailCount = draft.days.reduce((total, day) => (
    total + day.groups.reduce((groupTotal, group) => (
      groupTotal + group.photos.filter((photo) => isRenderableImageUri(photo.displayUri)).length
    ), 0)
  ), 0);

  if (__DEV__) {
    console.info('[photo-import detail hydration] complete', {
      draftId,
      recordDayDetailHydrationStartedCount: photosToHydrate.length,
      recordDayDetailHydrationSuccessCount,
      recordDayDetailRenderablePhotoCount: draft.thumbnailCount,
      renderableBeforeCount,
      thumbnailCount: draft.thumbnailCount,
    });
  }

  return draft;
}

async function scanPhotoLibraryForTripDrafts(
  options: PhotoLibraryScanOptions = {},
): Promise<PhotoLibraryScanResult> {
  const scanAttemptId = createPhotoScanAttemptId();
  drafts.clear();
  processedCandidateFingerprints.clear();
  coverHydrationFailedDraftIds.clear();
  coverHydrationInFlightDraftIds.clear();
  coverHydrationCompletedDraftIds.clear();

  if (__DEV__) {
    console.info('[photo-import scan] transient state reset', {
      photoScanTransientStateReset: true,
      scanAttemptId,
    });
  }
  const isAvailable = await MediaLibrary.isAvailableAsync();

  if (!isAvailable) {
    throw new Error('photo-library-unavailable');
  }

  const permission = await MediaLibrary.requestPermissionsAsync(false, ['photo']);
  const permissionState: PhotoLibraryScanPermissionState = permission.accessPrivileges === 'limited'
    ? 'limited'
    : permission.granted
      ? 'all'
      : 'denied';

  if (__DEV__) {
    console.info('[photo-import scan] permission', {
      accessPrivileges: permission.accessPrivileges,
      granted: permission.granted,
      scanAttemptId,
      status: permission.status,
    });
  }

  if (!permission.granted) {
    return {
      assetsWithDisplayUriCount: 0,
      assetsWithLocationCount: 0,
      assetsWithoutDisplayUriCount: 0,
      assetsWithoutLocationCount: 0,
      candidates: [],
      detectedTripCandidateCount: 0,
      drafts: [],
      hiddenHomeRegionCandidateCount: 0,
      hiddenNoLocationTitleCandidateCount: 0,
      hiddenLowConfidenceCandidateCount: 0,
      hiddenScreenshotCandidateCount: 0,
      hiddenTooFewRealPhotosCandidateCount: 0,
      hiddenWeakSingleDayCandidateCount: 0,
      hiddenLowGpsPhotoCandidateCount: 0,
      duplicateCandidateCount: 0,
      livingAreaApplied: hasValidHomeRegion(options.livingArea),
      livingAreaDisplayName: options.livingArea?.displayName,
      livingAreaExcludedPhotoCount: 0,
      livingAreaUnclassifiedPhotoCount: 0,
      oversizedCandidateSplitCount: 0,
      pageCount: 0,
      pendingEnrichmentCandidateCount: 0,
      permissionState,
      photosAfterScreenshotFilterCount: 0,
      savedDetectedCandidateRegistryLoadedCount: 0,
      scanAttemptId,
      scannedAssetCount: 0,
      detectedCandidateFingerprintComputedCount: 0,
      detectedCandidateHiddenByExactFingerprintCount: 0,
      detectedCandidateHiddenByPhotoOverlapCount: 0,
      detectedCandidateVisibleAfterSavedFilterCount: 0,
      skippedScreenshotCount: 0,
      skippedPhUriCount: 0,
      totalAssetCount: 0,
      visibleDetectedTripCandidateCount: 0,
    };
  }

  const photos: LocalDetectedPhoto[] = [];
  const savedDetectedCandidateRegistryLoadedCount =
    await hydrateSavedDetectedCandidateRegistry(options.savedRegistryUserId);
  let after: string | undefined;
  let hasNextPage = true;
  let pageCount = 0;
  let totalAssetCount = 0;

  while (hasNextPage) {
    const page = await MediaLibrary.getAssetsAsync({
      after,
      createdAfter: options.createdAfter,
      first: options.pageSize ?? PHOTO_SCAN_PAGE_SIZE,
      mediaType: MediaLibrary.MediaType.photo,
      sortBy: [[MediaLibrary.SortBy.creationTime, false]],
    });
    pageCount += 1;
    totalAssetCount = page.totalCount;

    if (pageCount === 1) {
      logPhotoScanDateRangeSummary(
        'photoScanMediaLibraryFirstPageSummary',
        summarizeAssetDates(page.assets),
        {
          accessPrivileges: permission.accessPrivileges,
          createdAfter: formatScanBoundaryDate(options.createdAfter),
          endCursorExists: Boolean(page.endCursor),
          hasNextPage: page.hasNextPage,
          mediaLibraryPageSize: options.pageSize ?? PHOTO_SCAN_PAGE_SIZE,
          scanAttemptId,
          sortBy: 'creationTime_desc',
          totalAssetCount: page.totalCount,
        },
      );
    }

    const assetInfos = await Promise.all(
      page.assets.map((asset) =>
        MediaLibrary.getAssetInfoAsync(asset, { shouldDownloadFromNetwork: false }).catch(() => asset),
      ),
    );
    const fallbackDate = new Date();

    photos.push(
      ...assetInfos
        .map((asset) => createPhotoFromScannedAsset(asset, getScannedAssetDate(asset, fallbackDate)))
        .filter((photo) => photo.assetId),
    );
    after = page.endCursor;
    hasNextPage = page.hasNextPage;
    options.onProgress?.({
      currentPage: pageCount,
      detectedCandidateCount: 0,
      hasNextPage,
      scanAttemptId,
      scannedAssetCount: photos.length,
      totalAssetCount,
    });

    if (__DEV__) {
      console.info('[photo-import scan] page', {
        currentPage: pageCount,
        hasNextPage,
        scanAttemptId,
        scannedAssetCount: photos.length,
        totalAssetCount,
      });
    }

    await yieldToEventLoop();
  }

  logPhotoScanDateRangeSummary(
    'photoScanMediaLibraryPaginationSummary',
    summarizePhotoDates(photos),
    {
      createdAfter: formatScanBoundaryDate(options.createdAfter),
      pageCount,
      scanAttemptId,
      scanCompletedHasNextPage: hasNextPage,
      totalAssetCount,
    },
  );
  logPhotoScanDateRangeSummary(
    'photoScanInputDateRangeSummary',
    summarizePhotoDates(photos),
    { scanAttemptId },
  );

  const skippedScreenshotCount = photos.filter((photo) => photo.isScreenshot).length;
  const screenshotFilteredPhotos = photos.filter((photo) => !photo.isScreenshot);
  const candidatePhotos = screenshotFilteredPhotos;
  const photosAfterScreenshotFilterCount = candidatePhotos.length;
  const inputPhotoCountAfter2024May = photos.filter((photo) => {
    const timestamp = getDateTimestamp(photo.takenAt);
    return timestamp !== null && timestamp >= AFTER_MAY_2024_CUTOFF_TIME;
  }).length;
  const gpsPhotoCountAfter2024May = photos.filter((photo) => {
    const timestamp = getDateTimestamp(photo.takenAt);
    return (
      timestamp !== null &&
      timestamp >= AFTER_MAY_2024_CUTOFF_TIME &&
      photo.hasLocation
    );
  }).length;
  const nonGpsPhotoCountAfter2024May = photos.filter((photo) => {
    const timestamp = getDateTimestamp(photo.takenAt);
    return (
      timestamp !== null &&
      timestamp >= AFTER_MAY_2024_CUTOFF_TIME &&
      !photo.hasLocation
    );
  }).length;
  const screenshotExcludedCountAfter2024May = photos.filter((photo) => {
    const timestamp = getDateTimestamp(photo.takenAt);
    return (
      timestamp !== null &&
      timestamp >= AFTER_MAY_2024_CUTOFF_TIME &&
      photo.isScreenshot
    );
  }).length;
  logPhotoScanDateRangeSummary(
    'photoScanAfterScreenshotFilterSummary',
    summarizePhotoDates(candidatePhotos),
    {
      inputPhotoCountAfter2024May,
      gpsPhotoCountAfter2024May,
      nonGpsPhotoCountAfter2024May,
      scanAttemptId,
      screenshotExcludedCountAfter2024May,
      skippedScreenshotCount,
    },
  );
  const assetsWithLocationCount = photos.filter((photo) => photo.hasLocation).length;
  const photosWithCoordinatesCount = photos.filter((photo) => getPhotoCoordinates(photo)).length;
  const assetsWithoutLocationCount = photos.length - assetsWithLocationCount;
  const assetsWithDisplayUriCount = photos.filter((photo) => isRenderableImageUri(photo.displayUri)).length;
  const assetsWithoutDisplayUriCount = photos.length - assetsWithDisplayUriCount;
  const skippedPhUriCount = photos.filter((photo) => (
    photo.assetUri?.startsWith('ph://') && !isRenderableImageUri(photo.displayUri)
  )).length;
  const {
    drafts: generatedDrafts,
    oversizedCandidateSplitCount,
    stats: candidateGenerationStats,
  } = splitPhotosIntoTripDrafts(candidatePhotos);
  const {
    duplicateCandidateCount,
    drafts: nextDrafts,
  } = filterDuplicateCandidateDrafts(generatedDrafts);
  for (const draft of nextDrafts) {
    draft.debugMetadata.scanAttemptId = scanAttemptId;
  }
  const sortedGeneratedDrafts = sortDetectedDraftsOldestFirst(generatedDrafts);
  const sortedNextDrafts = sortDetectedDraftsOldestFirst(nextDrafts);
  logRecentCandidateLifecycle('candidate_created', sortedGeneratedDrafts, scanAttemptId);
  logRecentCandidateLifecycle('after_merge_split', sortedNextDrafts, scanAttemptId);
  logDetectedDraftStableSortSummary('after_merge_split', sortedNextDrafts, scanAttemptId);
  logPhotoScanDateRangeSummary(
    'photoScanCandidateDateRangeSummary',
    summarizeDraftPhotoDates(sortedNextDrafts),
    {
      candidatesCreatedAfter2024May: countDraftsAfter2024May(generatedDrafts),
      candidatesMergedAfter2024May: countDraftsAfter2024May(sortedNextDrafts),
      duplicateCandidateCount,
      generatedCandidateCount: generatedDrafts.length,
      scanAttemptId,
      visibleCandidateInputCount: sortedNextDrafts.length,
    },
  );

  applyRepeatedLocalClusterMetadata(nextDrafts);
  logRecentCandidateLifecycle('after_repeated_local', sortedNextDrafts, scanAttemptId);
  logPhotoScanDateRangeSummary(
    'photoScanAfterRepeatedLocalSummary',
    summarizeDraftPhotoDates(sortedNextDrafts),
    {
      candidatesRejectedRepeatedLocalAfter2024May: nextDrafts.filter((draft) => (
        draftHasPhotoAfter2024May(draft) &&
        getCandidateRejectionStage(draft) === 'repeated_local_or_daily_life_filter'
      )).length,
      scanAttemptId,
    },
  );
  const loadedHomeRegion = hasValidHomeRegion(options.livingArea) ? options.livingArea : null;
  const hasValidLoadedHomeRegion = Boolean(loadedHomeRegion);
  if (__DEV__) {
    if (hasValidLoadedHomeRegion) {
      console.info('[photo-import home region] filter loaded', {
        basedIn: options.livingArea?.displayName,
        basedInPlaceExists: Boolean(options.livingArea?.displayName),
        hasHomeRegion: Boolean(options.livingArea),
        hasValidCoordinates: true,
        homeRegionFilterLoaded: true,
        radiusKm: HOME_REGION_EXCLUSION_RADIUS_KM,
        scanAttemptId,
        source: options.source ?? 'home',
        updatedAt: undefined,
      });
    } else {
      console.info('[photo-import home region] filter skipped', {
        hasHomeRegion: Boolean(options.livingArea),
        hasValidCoordinates: false,
        homeRegionFilterSkipped: true,
        reason: options.homeRegionFilterSkipReason ??
          (options.livingArea ? 'invalid_coordinates' : 'not_configured'),
        scanAttemptId,
      });
    }
  }
  const homeRegionEvaluations = applyHomeRegionCandidateFilter(
    nextDrafts,
    loadedHomeRegion,
    HOME_REGION_EXCLUSION_RADIUS_KM,
    scanAttemptId,
  );
  const hiddenHomeRegionCandidateCount = homeRegionEvaluations.filter(
    ({ result }) => result.shouldHide,
  ).length;
  const draftByIdForHomeRegion = new Map(nextDrafts.map((draft) => [draft.id, draft]));
  const livingAreaExcludedPhotoCount = homeRegionEvaluations.reduce((total, { draftId, result }) => (
    result.shouldHide ? total + (draftByIdForHomeRegion.get(draftId)?.debugMetadata.photoCount ?? 0) : total
  ), 0);
  const livingAreaUnclassifiedPhotoCount = homeRegionEvaluations.filter(
    ({ result }) => result.locatedGroupCount === 0 && result.unknownGroupCount > 0,
  ).length;
  const candidatesHiddenHomeRegionAfter2024May = nextDrafts.filter((draft) => (
    draftHasPhotoAfter2024May(draft) &&
    draft.debugMetadata.excludedBecauseHomeRegion
  )).length;
  logRecentCandidateLifecycle('after_home_filter', sortedNextDrafts, scanAttemptId);
  logPhotoScanDateRangeSummary(
    'photoScanAfterHomeRegionFilterSummary',
    summarizeDraftPhotoDates(sortedNextDrafts),
    {
      candidatesHiddenHomeRegionAfter2024May,
      homeRegionCandidateHiddenCount: hiddenHomeRegionCandidateCount,
      homeRegionFilterLoaded: hasValidLoadedHomeRegion,
      livingAreaExcludedPhotoCount,
      livingAreaUnclassifiedPhotoCount,
      scanAttemptId,
    },
  );
  storeDrafts(sortedNextDrafts);
  logRecentCandidateLifecycle('store_persisted', sortedNextDrafts, scanAttemptId);
  const savedCandidateMatchReasons = nextDrafts.map((draft) => getSavedCandidateMatchReason(draft));
  const detectedCandidateFingerprintComputedCount = nextDrafts.filter(
    (draft) => Boolean(syncDraftSavedCandidateFingerprint(draft).fingerprint),
  ).length;
  const detectedCandidateHiddenByExactFingerprintCount = savedCandidateMatchReasons.filter(
    (reason) => reason === 'exact_fingerprint',
  ).length;
  const detectedCandidateHiddenByPhotoOverlapCount = savedCandidateMatchReasons.filter(
    (reason) => reason === 'photo_overlap',
  ).length;
  const candidatesHiddenSavedAfter2024May = nextDrafts.filter((draft) => (
    draftHasPhotoAfter2024May(draft) &&
    Boolean(getSavedCandidateMatchReason(draft))
  )).length;
  logRecentCandidateLifecycle('after_saved_filter', sortedNextDrafts, scanAttemptId);
  logPhotoScanDateRangeSummary(
    'photoScanAfterSavedFilterSummary',
    summarizeDraftPhotoDates(sortedNextDrafts),
    {
      candidatesHiddenSavedAfter2024May,
      detectedCandidateHiddenByExactFingerprintCount,
      detectedCandidateHiddenByPhotoOverlapCount,
      scanAttemptId,
      savedDetectedCandidateRegistryLoadedCount,
    },
  );
  options.onProgress?.({
    currentPage: pageCount,
    detectedCandidateCount: 0,
    hasNextPage: false,
    scanAttemptId,
    scannedAssetCount: photos.length,
    totalAssetCount,
  });

  if (__DEV__) {
    console.info('[photo-import scan] scan phase completed', {
      detectedTripCandidateCount: nextDrafts.length,
      duplicateCandidateCount,
      hiddenHomeRegionCandidateCount,
      homeRegionCandidateFilterEntryPoint: options.source ?? 'home',
      homeRegionCandidateHiddenCount: hiddenHomeRegionCandidateCount,
      homeRegionCandidateUnknownLocationCount: livingAreaUnclassifiedPhotoCount,
      homeRegionCandidateVisibleCount: nextDrafts.length - hiddenHomeRegionCandidateCount,
      homeRegionFilterLoaded: hasValidLoadedHomeRegion,
      homeRegionFilterSkipped: !hasValidLoadedHomeRegion,
      homeRegionFilterSkippedReason: hasValidLoadedHomeRegion
        ? undefined
        : options.homeRegionFilterSkipReason ?? (options.livingArea ? 'invalid_coordinates' : 'not_configured'),
      livingAreaApplied: hasValidLoadedHomeRegion,
      livingAreaDisplayName: options.livingArea?.displayName,
      livingAreaExcludedPhotoCount,
      livingAreaRadiusKm: HOME_REGION_EXCLUSION_RADIUS_KM,
      livingAreaUnclassifiedPhotoCount,
      scanSource: options.source ?? 'home',
      scannedAssetCount: photos.length,
      totalAssetCount,
    });
    console.info('[photo-import enrichment] title phase scheduled', {
      candidateCount: nextDrafts.length,
    });
  }

  const visibleDrafts = getVisibleCandidateDrafts(sortedNextDrafts);
  logRecentCandidateLifecycle('visible_candidates', visibleDrafts, scanAttemptId);
  logDetectedDraftStableSortSummary('visible_candidates', visibleDrafts, scanAttemptId);
  const candidates = sortDetectedCandidatesOldestFirst(visibleDrafts.map(createCandidateFromDraft));
  logDetectedCandidateStableSortSummary('screen_delivered_candidates', candidates, scanAttemptId);
  const candidatesRejectedRepeatedLocalAfter2024May = nextDrafts.filter((draft) => (
    draftHasPhotoAfter2024May(draft) &&
    getCandidateRejectionStage(draft) === 'repeated_local_or_daily_life_filter'
  )).length;
  const candidatesRejectedConfidenceAfter2024May = nextDrafts.filter((draft) => (
    draftHasPhotoAfter2024May(draft) &&
    getCandidateRejectionStage(draft) === 'confidence_filter'
  )).length;
  const candidatesVisibleAfter2024May = countDraftsAfter2024May(visibleDrafts);
  logPhotoScanDateRangeSummary(
    'photoScanVisibleDateRangeSummary',
    summarizeDraftPhotoDates(visibleDrafts),
    {
      candidatesHiddenHomeRegionAfter2024May,
      candidatesHiddenSavedAfter2024May,
      candidatesRejectedConfidenceAfter2024May,
      candidatesRejectedRepeatedLocalAfter2024May,
      candidatesVisibleAfter2024May,
      scanAttemptId,
      visibleDetectedTripCandidateCount: candidates.length,
    },
  );
  logPhotoScanDateRangeSummary(
    'photoScanHighConfidenceVisibleSummary',
    summarizeDraftPhotoDates(visibleDrafts),
    {
      highConfidenceVisibleCount: visibleDrafts.filter((draft) => (
        syncCandidateQualityMetadata(draft).candidateQualityType === 'high_confidence_trip'
      )).length,
      scanAttemptId,
    },
  );
  const detectedCandidateVisibleAfterSavedFilterCount = candidates.length;
  const hiddenLowConfidenceCandidateCount = nextDrafts.filter(
    (draft) => getCandidateHiddenReasons(draft).includes('confidence_low'),
  ).length;
  const hiddenNoLocationTitleCandidateCount = nextDrafts.filter(
    (draft) => (
      getCandidateHiddenReasons(draft).includes('no_gps_for_title') ||
      getCandidateHiddenReasons(draft).includes('invalid_centroid')
    ),
  ).length;
  const hiddenScreenshotCandidateCount = nextDrafts.filter(
    (draft) => getCandidateHiddenReasons(draft).includes('screenshot_only_or_mostly_screenshot'),
  ).length;
  const hiddenTooFewRealPhotosCandidateCount = nextDrafts.filter(
    (draft) => getCandidateHiddenReasons(draft).includes('too_few_real_photos'),
  ).length;
  const hiddenWeakSingleDayCandidateCount = nextDrafts.filter(
    (draft) => (
      getCandidateHiddenReasons(draft).includes('weak_single_day_candidate') ||
      getCandidateHiddenReasons(draft).includes('weak_one_day_candidate')
    ),
  ).length;
  const hiddenLowGpsPhotoCandidateCount = nextDrafts.filter(
    (draft) => getCandidateHiddenReasons(draft).includes('low_gps_photo_count'),
  ).length;
  const hiddenWeakOneDayCandidateCount = nextDrafts.filter(
    (draft) => getCandidateHiddenReasons(draft).includes('weak_one_day_candidate'),
  ).length;
  const hiddenLocationTitleUnresolvedLowConfidenceCount = nextDrafts.filter(
    (draft) => getCandidateHiddenReasons(draft).includes('location_title_unresolved_low_confidence'),
  ).length;
  const hiddenLowMobilityCandidateCount = nextDrafts.filter(
    (draft) => getCandidateHiddenReasons(draft).includes('low_mobility_candidate'),
  ).length;
  const hiddenSavedImageHeavyCandidateCount = nextDrafts.filter(
    (draft) => getCandidateHiddenReasons(draft).includes('saved_image_heavy_candidate'),
  ).length;
  const hiddenTooFewCameraPhotosCandidateCount = nextDrafts.filter((draft) => (
    getCandidateHiddenReasons(draft).some((reason) => (
      reason === 'too_few_camera_photos_for_one_day' ||
      reason === 'too_few_camera_photos_for_short_trip'
    ))
  )).length;
  const hiddenWeakLongTripCandidateCount = nextDrafts.filter(
    (draft) => getCandidateHiddenReasons(draft).includes('weak_long_trip_candidate'),
  ).length;
  const hiddenRepeatedDailyLocationCandidateCount = nextDrafts.filter(
    (draft) => getCandidateHiddenReasons(draft).includes('likely_repeated_daily_location_candidate'),
  ).length;
  const mergedDailyEventsCandidateCount = nextDrafts.filter(
    (draft) => getCandidateHiddenReasons(draft).includes('merged_daily_events_candidate'),
  ).length;
  const hiddenMergedDailyEventsCandidateCount = mergedDailyEventsCandidateCount;
  const hiddenLowMobilityMultiDayCandidateCount = nextDrafts.filter(
    (draft) => getCandidateHiddenReasons(draft).includes('low_mobility_multi_day_candidate'),
  ).length;
  const hiddenRepeatedLocalMultiDayCandidateCount = nextDrafts.filter(
    (draft) => getCandidateHiddenReasons(draft).includes('repeated_local_multi_day_candidate'),
  ).length;
  const hiddenDailyPhotoEventCandidateCount = nextDrafts.filter(
    (draft) => getCandidateHiddenReasons(draft).includes('likely_daily_photo_event'),
  ).length;
  const warningStaticLocationCandidateCount = nextDrafts.filter(
    (draft) => draft.debugMetadata.warningReasons.includes('possible_daily_life_long_range'),
  ).length;
  const pendingEnrichmentCandidateCount = nextDrafts.filter((draft) => (
    draft.debugMetadata.confidenceLevel !== 'low' &&
    draft.debugMetadata.gpsPhotoCount > 0 &&
    isFiniteCoordinateValue(draft.debugMetadata.centroidLat) &&
    isFiniteCoordinateValue(draft.debugMetadata.centroidLng) &&
    draft.enrichmentStatus === 'pending'
  )).length;
  const highConfidenceTripCandidateCount = nextDrafts.filter(
    (draft) => syncCandidateQualityMetadata(draft).candidateQualityType === 'high_confidence_trip',
  ).length;
  const reviewNeededCandidateCount = nextDrafts.filter(
    (draft) => syncCandidateQualityMetadata(draft).candidateQualityType === 'review_needed_candidate',
  ).length;
  const dailyLifeCandidateCount = nextDrafts.filter(
    (draft) => syncCandidateQualityMetadata(draft).candidateQualityType === 'daily_life_candidate',
  ).length;
  const weakCandidateCount = nextDrafts.filter(
    (draft) => syncCandidateQualityMetadata(draft).candidateQualityType === 'weak_candidate',
  ).length;
  const candidatesWithGpsCount = nextDrafts.filter((draft) => draft.debugMetadata.gpsPhotoCount > 0).length;
  const candidatesWithValidCentroidCount = nextDrafts.filter((draft) => (
    isFiniteCoordinateValue(draft.debugMetadata.centroidLat) &&
    isFiniteCoordinateValue(draft.debugMetadata.centroidLng)
  )).length;
  const candidateCountBeforeVisibilityFilter = nextDrafts.length;
  const candidateCountAfterConfidenceFilter = nextDrafts.filter(
    (draft) => !getCandidateHiddenReasons(draft).includes('confidence_low'),
  ).length;
  const candidateCountAfterGpsFilter = nextDrafts.filter((draft) => (
    !getCandidateHiddenReasons(draft).some((reason) => (
      reason === 'no_gps_for_title' ||
      reason === 'invalid_centroid' ||
      reason === 'low_gps_photo_count'
    ))
  )).length;
  const candidateCountAfterRealPhotoFilter = nextDrafts.filter((draft) => (
    !getCandidateHiddenReasons(draft).some((reason) => (
      reason === 'too_few_real_photos' ||
      reason === 'too_few_camera_photos_for_one_day' ||
      reason === 'too_few_camera_photos_for_short_trip'
    ))
  )).length;
  const candidateCountAfterSavedImageFilter = nextDrafts.filter(
    (draft) => !getCandidateHiddenReasons(draft).includes('saved_image_heavy_candidate'),
  ).length;
  const candidateCountAfterOneDayStrictFilter = nextDrafts.filter((draft) => (
    draft.debugMetadata.dayCount !== 1 ||
    !getCandidateHiddenReasons(draft).some((reason) => (
      reason === 'weak_one_day_candidate' ||
      reason === 'too_static_one_day_candidate' ||
      reason === 'likely_daily_event_not_trip'
    ))
  )).length;
  const candidateCountAfterShortTripFilter = nextDrafts.filter((draft) => (
    draft.debugMetadata.dayCount < 2 ||
    draft.debugMetadata.dayCount >= LONG_TRIP_MIN_DAYS ||
    !getCandidateHiddenReasons(draft).includes('too_few_camera_photos_for_short_trip')
  )).length;
  const oneDayVisibleCandidateCount = visibleDrafts.filter((draft) => draft.debugMetadata.dayCount === 1).length;
  const shortTripVisibleCandidateCount = visibleDrafts.filter((draft) => (
    draft.debugMetadata.dayCount >= 2 &&
    draft.debugMetadata.dayCount < LONG_TRIP_MIN_DAYS
  )).length;
  const longTripVisibleCandidateCount = visibleDrafts.filter(
    (draft) => draft.debugMetadata.dayCount >= LONG_TRIP_MIN_DAYS,
  ).length;
  const visibleHighConfidenceTripCandidateCount = visibleDrafts.filter(
    (draft) => syncCandidateQualityMetadata(draft).candidateQualityType === 'high_confidence_trip',
  ).length;
  const visibleReviewNeededCandidateCount = visibleDrafts.filter(
    (draft) => syncCandidateQualityMetadata(draft).candidateQualityType === 'review_needed_candidate',
  ).length;
  const visibleCandidatesWithGpsButNoLocationLabelCount = visibleDrafts.filter((draft) => (
    draft.debugMetadata.gpsPhotoCount > 0 &&
    isFiniteCoordinateValue(draft.debugMetadata.centroidLat) &&
    isFiniteCoordinateValue(draft.debugMetadata.centroidLng) &&
    !draft.locationLabel
  )).length;
  const pendingLocationTitleCandidateCount = visibleDrafts.filter(
    (draft) => draft.enrichmentStatus === 'pending',
  ).length;
  const failedLocationTitleCandidateCount = visibleDrafts.filter(
    (draft) => draft.enrichmentStatus === 'failed',
  ).length;
  const rateLimitedLocationTitleCandidateCount = visibleDrafts.filter(
    (draft) => draft.enrichmentStatus === 'rate_limited',
  ).length;
  const fallbackLocationTitleCandidateCount = visibleDrafts.filter((draft) => (
    draft.displayTitle === LOCATION_BASED_TRIP_TITLE ||
    draft.displayTitle === OVERSEAS_TRIP_TITLE
  )).length;
  const unresolvedRegionTitleAppliedCount = visibleDrafts.filter((draft) => (
    draft.displayTitle === UNRESOLVED_REGION_TITLE
  )).length;
  const genericFallbackTitleSuppressedCount = visibleDrafts.filter((draft) => (
    draft.debugMetadata.genericFallbackSuppressed
  )).length;
  const pendingFallbackAppliedCount = visibleDrafts.filter((draft) => (
    draft.enrichmentStatus === 'pending' &&
    (
      draft.displayTitle === LOCATION_BASED_TRIP_TITLE ||
      draft.displayTitle === OVERSEAS_TRIP_TITLE
    )
  )).length;
  const visiblePendingDraftCount = visibleDrafts.filter((draft) => draft.enrichmentStatus === 'pending').length;
  const visiblePendingLocationTitleCandidateCount = visibleDrafts.filter((draft) => (
    syncCandidateQualityMetadata(draft).isLocationTitlePending
  )).length;
  const visibleCandidatesUsingGroupCentroidTitleCount = visibleDrafts.filter(
    (draft) => (
      draft.debugMetadata.candidateTitleCoordinateSource === 'first_located_group_centroid' ||
      draft.debugMetadata.candidateTitleCoordinateSource === 'largest_located_group_centroid'
    ),
  ).length;
  const candidateTitleFromFirstLocatedGroupCount = visibleDrafts.filter(
    (draft) => (
      draft.debugMetadata.candidateTitleCoordinateSource === 'first_located_group_centroid' ||
      draft.debugMetadata.candidateTitleLocationSource === 'first_located_group_label' ||
      draft.debugMetadata.candidateTitleLocationSource === 'first_located_group_centroid'
    ),
  ).length;
  const candidateTitleFromLargestLocatedGroupCount = visibleDrafts.filter(
    (draft) => (
      draft.debugMetadata.candidateTitleCoordinateSource === 'largest_located_group_centroid' ||
      draft.debugMetadata.candidateTitleLocationSource === 'largest_located_group_label' ||
      draft.debugMetadata.candidateTitleLocationSource === 'largest_located_group_centroid'
    ),
  ).length;
  const groupLocationLabelAvailableCount = visibleDrafts.filter((draft) => (
    isResolvedLocatedGroupLabel(draft.debugMetadata.firstLocatedGroupLabel)
  )).length;
  const groupLocationLabelPendingCount = visibleDrafts.filter((draft) => (
    draft.debugMetadata.firstLocatedGroupLabel &&
    !isResolvedLocatedGroupLabel(draft.debugMetadata.firstLocatedGroupLabel)
  )).length;
  const titleEnrichmentPendingSkippedCount = visibleDrafts.filter(
    (draft) => draft.debugMetadata.titleFinalizeReason === 'skipped',
  ).length;
  const titleEnrichmentPendingUiTimedOutCount = visibleDrafts.filter(
    (draft) => draft.debugMetadata.titleFinalizeReason === 'ui_timeout',
  ).length;
  const titleEnrichmentFinalizedWithoutLabelCount = visibleDrafts.filter(
    (draft) => draft.debugMetadata.titleFinalizeReason === 'finalized_without_label',
  ).length;
  const titleEnrichmentLateSuccessCount = visibleDrafts.filter(
    (draft) => draft.debugMetadata.titleFinalizeReason === 'late_success',
  ).length;
  const genericFallbackUsedAfterAllGroupAttemptsFailedCount = unresolvedRegionTitleAppliedCount;
  const visibleCandidatesUsingRepresentativeGpsTitleCount = visibleDrafts.filter(
    (draft) => draft.debugMetadata.candidateTitleCoordinateSource === 'representative_gps_photo',
  ).length;
  const overseasCityTitleNormalizedCount = nextDrafts.filter((draft) => (
    draft.debugMetadata.isOverseasCandidate &&
    draft.debugMetadata.normalizedCityName
  )).length;
  const domesticTitleNormalizedCount = nextDrafts.filter((draft) => (
    draft.debugMetadata.isOverseasCandidate === false &&
    draft.debugMetadata.normalizedCityName
  )).length;
  const overseasMajorCityNormalizedCount = nextDrafts.filter((draft) => (
    draft.debugMetadata.overseasTitleSource === 'major_city_bbox' ||
    draft.debugMetadata.overseasTitleSource === 'major_city_alias'
  )).length;
  const overseasSuburbSuppressedCount = overseasMajorCityNormalizedCount;

  enrichDraftTitlesInBackground(nextDrafts, options.onCandidatesUpdated);
  options.onProgress?.({
    currentPage: pageCount,
    detectedCandidateCount: candidates.length,
    hasNextPage: false,
    scanAttemptId,
    scannedAssetCount: totalAssetCount || photos.length,
    totalAssetCount: totalAssetCount || photos.length,
  });

  if (__DEV__) {
    for (const draft of nextDrafts) {
      const quality = syncCandidateQualityMetadata(draft);

      console.info('[detected trip candidate]', {
        candidateQualityScore: quality.candidateQualityScore,
        candidateQualityType: quality.candidateQualityType,
        draftId: draft.id,
        scanAttemptId,
        candidateTitleCoordinateSource: draft.debugMetadata.candidateTitleCoordinateSource,
        candidateTitleLocationSource: draft.debugMetadata.candidateTitleLocationSource,
        confidenceLevel: draft.debugMetadata.confidenceLevel,
        confidenceScore: draft.debugMetadata.confidenceScore,
        dayCount: draft.debugMetadata.dayCount,
        displayTitle: draft.displayTitle,
        displayablePhotoCount: draft.debugMetadata.displayablePhotoCount,
        endDate: draft.debugMetadata.endDate,
        gpsActiveDayCount: draft.debugMetadata.gpsActiveDayCount,
        gpsPhotoCount: draft.debugMetadata.gpsPhotoCount,
        centroidLat: draft.debugMetadata.centroidLat,
        centroidLng: draft.debugMetadata.centroidLng,
        hasValidCentroid:
          isFiniteCoordinateValue(draft.debugMetadata.centroidLat) &&
          isFiniteCoordinateValue(draft.debugMetadata.centroidLng),
        finalVisibility: canShowDraftAsCandidate(draft) ? 'visible' : 'hidden',
        hiddenFromCandidateList: !canShowDraftAsCandidate(draft),
        hiddenReasons: quality.hiddenReasons,
        hiddenReason: quality.hiddenReasons[0] ?? null,
        homeRegionFilterApplied: draft.debugMetadata.homeRegionFilterApplied,
        homeRegionHiddenReason: draft.debugMetadata.homeRegionHiddenReason,
        homeRegionInsideGroupCount: draft.debugMetadata.homeRegionInsideGroupCount,
        homeRegionLocatedGroupCount: draft.debugMetadata.homeRegionLocatedGroupCount,
        homeRegionMeaningfulOutsideGroupCount: draft.debugMetadata.homeRegionMeaningfulOutsideGroupCount,
        homeRegionOutsideGroupCount: draft.debugMetadata.homeRegionOutsideGroupCount,
        homeRegionUnknownGroupCount: draft.debugMetadata.homeRegionUnknownGroupCount,
        hasLocationTitle: draft.debugMetadata.hasLocationTitle,
        locationClusterCount: draft.debugMetadata.locationClusterCount,
        locatedGroupCount: draft.days.reduce((total, day) => (
          total + day.groups.filter((group) => (
            isFiniteCoordinateValue(group.centroidLat) ||
            isFiniteCoordinateValue(group.latitude)
          )).length
        ), 0),
        locationLabel: draft.locationLabel,
        enrichmentStatus: draft.enrichmentStatus,
        firstLocatedGroupCentroidLat: draft.debugMetadata.firstLocatedGroupCentroidLat,
        firstLocatedGroupCentroidLng: draft.debugMetadata.firstLocatedGroupCentroidLng,
        firstLocatedGroupLabel: draft.debugMetadata.firstLocatedGroupLabel,
        firstLocatedGroupPhotoCount: draft.debugMetadata.firstLocatedGroupPhotoCount,
        firstLocatedGroupRepresentativeGpsLat: draft.debugMetadata.firstLocatedGroupRepresentativeGpsLat,
        firstLocatedGroupRepresentativeGpsLng: draft.debugMetadata.firstLocatedGroupRepresentativeGpsLng,
        finalTitleResolutionState: draft.debugMetadata.titleResolveState,
        isHighConfidenceTrip: quality.isHighConfidenceTrip,
        isLikelyDailyLifeCandidate: quality.isLikelyDailyLifeCandidate,
        isLocationTitlePending: quality.isLocationTitlePending,
        isLowMobilityCandidate: quality.isLowMobilityCandidate,
        isOverseasCandidate: draft.debugMetadata.isOverseasCandidate,
        maxDistanceKm: draft.debugMetadata.maxDistanceKm,
        mergedFromCandidateCount: draft.debugMetadata.mergedFromCandidateCount,
        noGpsPhotoCount: draft.debugMetadata.noGpsPhotoCount,
        normalizedCityName: draft.debugMetadata.normalizedCityName,
        overseasTitleSource: draft.debugMetadata.overseasTitleSource,
        photoCount: draft.debugMetadata.photoCount,
        rawLocationLabel: draft.debugMetadata.rawLocationLabel,
        rawPlacemarkCity: draft.debugMetadata.rawPlacemarkCity,
        rawPlacemarkCountry: draft.debugMetadata.rawPlacemarkCountry,
        rawPlacemarkDistrict: draft.debugMetadata.rawPlacemarkDistrict,
        rawPlacemarkRegion: draft.debugMetadata.rawPlacemarkRegion,
        rawPlacemarkSubregion: draft.debugMetadata.rawPlacemarkSubregion,
        realPhotoCount: draft.debugMetadata.realPhotoCount,
        repeatedLocalClusterActiveMonthCount: draft.debugMetadata.repeatedLocalClusterActiveMonthCount,
        repeatedLocalClusterCandidateCount: draft.debugMetadata.repeatedLocalClusterCandidateCount,
        repeatedLocalClusterDateSpanDays: draft.debugMetadata.repeatedLocalClusterDateSpanDays,
        representativeGpsLat: draft.debugMetadata.representativeGpsLat,
        representativeGpsLng: draft.debugMetadata.representativeGpsLng,
        representativeGroupPhotoCount: draft.debugMetadata.representativeGroupPhotoCount,
        savedImageCount: draft.debugMetadata.savedImageCount,
        savedImageRatio: draft.debugMetadata.savedImageRatio,
        screenshotPhotoCount: draft.debugMetadata.screenshotPhotoCount,
        reviewNeededReasons: quality.reviewNeededReasons,
        rejectionStage: getCandidateRejectionStage(draft),
        splitReason: draft.debugMetadata.splitReason,
        startDate: draft.debugMetadata.startDate,
        isLongTripCandidate: draft.debugMetadata.isLongTripCandidate,
        title: draft.title,
        titleEnrichmentElapsedMs: draft.debugMetadata.titleEnrichmentElapsedMs,
        titleEnrichmentFinalizedAt: draft.debugMetadata.titleEnrichmentFinalizedAt,
        titleEnrichmentStartedAt: draft.debugMetadata.titleEnrichmentStartedAt,
        titleFinalizeReason: draft.debugMetadata.titleFinalizeReason,
        titleGeocodingQueued: draft.debugMetadata.titleGeocodingQueued,
        titleGeocodingInFlight: draft.debugMetadata.titleGeocodingInFlight,
        titleGeocodingRetryable: draft.debugMetadata.titleGeocodingRetryable,
        titleGeocodingSkippedReason: draft.debugMetadata.titleGeocodingSkippedReason,
        titleResolveState: draft.debugMetadata.titleResolveState,
        candidateTitleTransition: draft.debugMetadata.titleResolveState === 'success'
          ? draft.debugMetadata.titleFinalizeReason === 'late_success'
            ? 'unresolved_to_late_success'
            : 'pending_to_success'
          : draft.debugMetadata.titleResolveState === 'unresolved'
            ? 'pending_to_unresolved'
            : 'pending',
        genericFallbackSuppressed: draft.debugMetadata.genericFallbackSuppressed,
        savedCandidateFilterReason: getSavedCandidateMatchReason(draft),
        savedCandidateFingerprint: getMaskedFingerprint(draft.candidateFingerprint),
        savedCandidatePhotoIdentifierCount: draft.candidatePhotoIdentifiers?.length ?? 0,
        unresolvedRegionFallbackTitle: draft.debugMetadata.unresolvedRegionFallbackTitle,
        unresolvedTitleFallbackSource: draft.debugMetadata.unresolvedTitleFallbackSource,
        warningReasons: draft.debugMetadata.warningReasons,
        wasMergedFromDailyEvents: draft.debugMetadata.wasMergedFromDailyEvents,
      });
    }

      console.info('[photo-import scan] result', {
      assetsWithLocationCount,
      assetsWithDisplayUriCount,
      assetsWithoutLocationCount,
      assetsWithoutDisplayUriCount,
      scanAttemptId,
      candidatesCreatedAfter2024May: countDraftsAfter2024May(generatedDrafts),
      candidatesHiddenHomeRegionAfter2024May,
      candidatesHiddenSavedAfter2024May,
      candidatesMergedAfter2024May: countDraftsAfter2024May(nextDrafts),
      candidatesRejectedConfidenceAfter2024May,
      candidatesRejectedRepeatedLocalAfter2024May,
      candidatesVisibleAfter2024May,
      candidateCountAfterConfidenceFilter,
      candidateCountAfterGpsFilter,
      candidateCountAfterLongTripMerge: candidateGenerationStats.candidateCountAfterLongTripMerge,
      candidateCountAfterOneDayStrictFilter,
      candidateCountAfterRealPhotoFilter,
      candidateCountAfterSavedImageFilter,
      candidateCountAfterShortTripFilter,
      candidateCountBeforeVisibilityFilter,
      candidatesWithGpsCount,
      candidatesWithValidCentroidCount,
      candidatesShownWithPendingLocationCount: visibleDrafts.filter(
        (draft) => draft.enrichmentStatus === 'pending',
      ).length,
      coverPhotoUrisRenderable: nextDrafts.map((draft) => isRenderableImageUri(draft.coverPhotoUri)),
      detectedCandidateFingerprintComputedCount,
      detectedCandidateHiddenByExactFingerprintCount,
      detectedCandidateHiddenByPhotoOverlapCount,
      detectedCandidateVisibleAfterSavedFilterCount,
      detectedTripCandidateCount: nextDrafts.length,
      domesticTitleNormalizedCount,
      dailyLifeCandidateCount,
      generatedDraftIds: nextDrafts.map((draft) => draft.id),
      hiddenSavedImageHeavyCandidateCount,
      hiddenDailyPhotoEventCandidateCount,
      hiddenLocationTitleUnresolvedLowConfidenceCount,
      hiddenLowMobilityCandidateCount,
      hiddenLowMobilityMultiDayCandidateCount,
      hiddenMergedDailyEventsCandidateCount,
      hiddenRepeatedDailyLocationCandidateCount,
      hiddenRepeatedLocalMultiDayCandidateCount,
      hiddenTooFewCameraPhotosCandidateCount,
      hiddenNoLocationTitleCandidateCount,
      hiddenLowConfidenceCandidateCount,
      hiddenScreenshotCandidateCount,
      hiddenTooFewRealPhotosCandidateCount,
      hiddenWeakSingleDayCandidateCount,
      hiddenWeakOneDayCandidateCount,
      hiddenWeakLongTripCandidateCount,
      hiddenLowGpsPhotoCandidateCount,
      highConfidenceTripCandidateCount,
      failedLocationTitleCandidateCount,
      fallbackLocationTitleCandidateCount,
      genericFallbackTitleSuppressedCount,
      candidateTitleFromFirstLocatedGroupCount,
      candidateTitleFromLargestLocatedGroupCount,
      candidateTitleUpdatedFromGroupLabelCount: visibleDrafts.filter(
        (draft) => (
          draft.debugMetadata.candidateTitleLocationSource === 'first_located_group_label' ||
          draft.debugMetadata.candidateTitleLocationSource === 'largest_located_group_label'
        ),
      ).length,
      genericFallbackUsedAfterAllGroupAttemptsFailedCount,
      groupLocationLabelAvailableCount,
      groupLocationLabelPendingCount,
      pendingFallbackAppliedCount,
      initialRangeCandidateCount: candidateGenerationStats.initialRangeCandidateCount,
      longTripCandidateCount: candidateGenerationStats.longTripCandidateCount,
      longTripPostMergeCount: candidateGenerationStats.longTripPostMergeCount,
      longTripVisibleCandidateCount,
      mergedDailyEventsCandidateCount,
      oneDayCandidateCount: candidateGenerationStats.oneDayCandidateCount,
      oneDayVisibleCandidateCount,
      oversizedCandidateSplitCount,
      pageCount,
      pendingEnrichmentCandidateCount,
      pendingLocationTitleCandidateCount,
      pendingTitleDisplayedCount: visibleDrafts.filter((draft) => (
        draft.displayTitle === PENDING_LOCATION_TITLE ||
        draft.title === PENDING_LOCATION_TITLE
      )).length,
      pendingTitleCandidateCountAfterFinalize: visibleDrafts.filter((draft) => (
        draft.displayTitle === PENDING_LOCATION_TITLE ||
        draft.title === PENDING_LOCATION_TITLE
      )).length,
      pendingTitleCandidateCountBeforeFinalize: pendingLocationTitleCandidateCount,
      pendingTitleMaxAgeMs: PENDING_TITLE_MAX_AGE_MS,
      unresolvedRegionTitleAppliedCount,
      photosAfterScreenshotFilterCount,
      gpsPhotoCountAfter2024May,
      inputPhotoCountAfter2024May,
      nonGpsPhotoCountAfter2024May,
      photosWithCoordinatesCount,
      rawDateBucketCount: candidateGenerationStats.rawDateBucketCount,
      scannedAssetCount: photos.length,
      savedDetectedCandidateRegistryLoadedCount,
      shortTripCandidateCount: candidateGenerationStats.shortTripCandidateCount,
      shortTripVisibleCandidateCount,
      screenshotExcludedCountAfter2024May,
      skippedScreenshotCount,
      skippedPhUriCount,
      splitByDateGapCount: candidateGenerationStats.splitByDateGapCount,
      splitByDistanceCount: candidateGenerationStats.splitByDistanceCount,
      splitByGpsMixedCount: candidateGenerationStats.splitByGpsMixedCount,
      rateLimitedLocationTitleCandidateCount,
      reviewNeededCandidateCount,
      overseasCityTitleNormalizedCount,
      overseasMajorCityNormalizedCount,
      overseasSuburbSuppressedCount,
      totalAssetCount,
      visibleCandidatesWithGpsButNoLocationLabelCount,
      visibleCandidatesUsingGroupCentroidTitleCount,
      visibleCandidatesUsingRepresentativeGpsTitleCount,
      visibleDetectedTripCandidateCount: candidates.length,
      visibleHighConfidenceTripCandidateCount,
      visiblePendingLocationTitleCandidateCount,
      visibleReviewNeededCandidateCount,
      warningStaticLocationCandidateCount,
      titleEnrichmentFinalizedWithoutLabelCount,
      titleEnrichmentLateSuccessCount,
      titleEnrichmentPendingSkippedCount,
      titleEnrichmentPendingUiTimedOutCount,
      firstLocatedGroupTitleGeocodingQueuedCount: visibleDrafts.filter(
        (draft) => (
          (
            draft.debugMetadata.candidateTitleCoordinateSource === 'first_located_group_centroid' ||
            draft.debugMetadata.candidateTitleCoordinateSource === 'first_located_group_representative_gps'
          ) &&
          draft.debugMetadata.titleGeocodingQueued
        ),
      ).length,
      firstLocatedGroupTitleGeocodingSuccessCount: visibleDrafts.filter(
        (draft) => (
          (
            draft.debugMetadata.candidateTitleCoordinateSource === 'first_located_group_centroid' ||
            draft.debugMetadata.candidateTitleCoordinateSource === 'first_located_group_representative_gps'
          ) &&
          draft.debugMetadata.titleResolveState === 'success'
        ),
      ).length,
      firstLocatedGroupTitleGeocodingFailedCount: visibleDrafts.filter(
        (draft) => (
          (
            draft.debugMetadata.candidateTitleCoordinateSource === 'first_located_group_centroid' ||
            draft.debugMetadata.candidateTitleCoordinateSource === 'first_located_group_representative_gps'
          ) &&
          draft.debugMetadata.titleResolveState === 'unresolved'
        ),
      ).length,
      unresolvedRegionTitleBlockedBecauseGroupPendingCount: visibleDrafts.filter(
        (draft) => (
          (
            draft.debugMetadata.candidateTitleCoordinateSource === 'first_located_group_centroid' ||
            draft.debugMetadata.candidateTitleCoordinateSource === 'first_located_group_representative_gps'
          ) &&
          draft.debugMetadata.titleResolveState === 'pending' &&
          (
            draft.displayTitle === PENDING_LOCATION_TITLE ||
            draft.title === PENDING_LOCATION_TITLE
          )
        ),
      ).length,
      weakCandidateCount,
    });
    console.info('[photo-import enrichment] title phase scheduled', {
      candidateCountAfterLongTripMerge: candidateGenerationStats.candidateCountAfterLongTripMerge,
      scanAttemptId,
      titleGeocodingQueueLimit: TITLE_REVERSE_GEOCODE_VISIBLE_LIMIT,
      titleGeocodingVisibleCandidateCount: visiblePendingDraftCount,
      titleGeocodingQueuedVisibleCandidateCount: Math.min(
        TITLE_REVERSE_GEOCODE_VISIBLE_LIMIT,
        visiblePendingDraftCount,
      ),
      titleGeocodingSkippedVisibleCandidateCount: Math.max(
        0,
        visiblePendingDraftCount - TITLE_REVERSE_GEOCODE_VISIBLE_LIMIT,
      ),
      locationTitleEnrichmentQueuedCount: Math.min(
        TITLE_REVERSE_GEOCODE_VISIBLE_LIMIT,
        visiblePendingDraftCount,
      ),
      locationTitleEnrichmentSkippedCount: Math.max(
        0,
        visiblePendingDraftCount - TITLE_REVERSE_GEOCODE_VISIBLE_LIMIT,
      ),
      hiddenNoLocationTitleCandidateCount,
      hiddenLowConfidenceCandidateCount,
      hiddenScreenshotCandidateCount,
      hiddenTooFewRealPhotosCandidateCount,
      hiddenWeakSingleDayCandidateCount,
      hiddenLowGpsPhotoCandidateCount,
      hiddenSavedImageHeavyCandidateCount,
      hiddenTooFewCameraPhotosCandidateCount,
      hiddenWeakLongTripCandidateCount,
      hiddenWeakOneDayCandidateCount,
      visibleDetectedTripCandidateCount: candidates.length,
    });
  }

  logPhotoScanDateRangeSummary(
    'photoScanDeliveredToDetectedTripsSummary',
    summarizeDraftPhotoDates(visibleDrafts),
    {
      deliveredCandidateCount: candidates.length,
      scanAttemptId,
    },
  );

  return {
    assetsWithDisplayUriCount,
    assetsWithLocationCount,
    assetsWithoutDisplayUriCount,
    assetsWithoutLocationCount,
    candidates,
    detectedTripCandidateCount: nextDrafts.length,
    duplicateCandidateCount,
    drafts: sortedNextDrafts,
    hiddenNoLocationTitleCandidateCount,
    hiddenLowConfidenceCandidateCount,
    hiddenScreenshotCandidateCount,
    hiddenTooFewRealPhotosCandidateCount,
    hiddenWeakSingleDayCandidateCount,
    hiddenLowGpsPhotoCandidateCount,
    hiddenHomeRegionCandidateCount,
    livingAreaApplied: hasValidLoadedHomeRegion,
    livingAreaDisplayName: options.livingArea?.displayName,
    livingAreaExcludedPhotoCount,
    livingAreaUnclassifiedPhotoCount,
    oversizedCandidateSplitCount,
    pageCount,
    pendingEnrichmentCandidateCount,
    permissionState,
    photosAfterScreenshotFilterCount,
    savedDetectedCandidateRegistryLoadedCount,
    scanAttemptId,
    scannedAssetCount: photos.length,
    detectedCandidateFingerprintComputedCount,
    detectedCandidateHiddenByExactFingerprintCount,
    detectedCandidateHiddenByPhotoOverlapCount,
    detectedCandidateVisibleAfterSavedFilterCount,
    skippedScreenshotCount,
    skippedPhUriCount,
    totalAssetCount,
    visibleDetectedTripCandidateCount: candidates.length,
  };
}

export async function scanEntirePhotoLibraryForTrips(
  options: Omit<PhotoLibraryScanOptions, 'createdAfter'> = {},
) {
  return scanPhotoLibraryForTripDrafts(options);
}

export async function scanRecentPhotosForTrips(
  options: Omit<PhotoLibraryScanOptions, 'createdAfter'> = {},
) {
  const createdAfter = new Date();
  createdAfter.setMonth(createdAfter.getMonth() - RECENT_PHOTO_SCAN_LOOKBACK_MONTHS);

  return scanPhotoLibraryForTripDrafts({
    ...options,
    createdAfter,
  });
}

let lastScanCompletedAt: Date | null = null;

export async function scanPhotosSinceLastScan(
  options: Omit<PhotoLibraryScanOptions, 'createdAfter'> = {},
) {
  return scanPhotoLibraryForTripDrafts({
    ...options,
    createdAfter: lastScanCompletedAt ?? undefined,
  }).then((result) => {
    lastScanCompletedAt = new Date();
    return result;
  });
}

export function getLocalDetectedTripDraft(draftId?: string | null) {
  return draftId ? drafts.get(draftId) : undefined;
}

export function getLocalDetectedTripCandidates() {
  return getVisibleLocalDetectedTripCandidates();
}

export function markLocalDetectedTripDraftSaving(draftId: string) {
  const draft = drafts.get(draftId);

  if (!draft) {
    return undefined;
  }

  draft.saveStatus = 'saving';
  draft.saveError = undefined;

  return draft;
}

export function markLocalDetectedTripDraftSaveFailed(draftId: string, errorMessage: string) {
  const draft = drafts.get(draftId);

  if (!draft) {
    return undefined;
  }

  draft.saveStatus = 'failed';
  draft.saveError = errorMessage;

  return draft;
}

export function markLocalDetectedTripDraftSaved(draftId: string, savedTripId: string) {
  const draft = drafts.get(draftId);

  if (!draft) {
    return undefined;
  }

  draft.saveStatus = 'saved';
  draft.savedTripId = savedTripId;
  draft.saveError = undefined;

  return draft;
}

export const PHOTO_LIBRARY_SCAN_LIMITS = {
  maxCandidateDays: MAX_CONTINUOUS_TRIP_DAYS,
  maxCandidatePhotos: MAX_PHOTOS_PER_TRIP_CANDIDATE,
  minCandidatePhotos: MIN_PHOTOS_PER_TRIP_CANDIDATE,
  minPhotosPerDay: MIN_PHOTOS_PER_DAY,
  pageSize: PHOTO_SCAN_PAGE_SIZE,
  recentLookbackMonths: RECENT_PHOTO_SCAN_LOOKBACK_MONTHS,
};
