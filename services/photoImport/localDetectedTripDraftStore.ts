import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as MediaLibrary from 'expo-media-library';
import type { ImageSourcePropType } from 'react-native';

import type {
  PhotoImportCandidateDebugMetadata,
  PhotoImportCandidateSplitReason,
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
const LONG_TRIP_MERGE_MAX_GAP_DAYS = 5;
const LONG_TRIP_MERGE_MAX_CENTROID_DISTANCE_KM = 2500;
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
const SAFE_PLACEHOLDER_IMAGE_URI =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
const COVER_HYDRATION_MAX_ASSETS_PER_CANDIDATE = 5;
const COVER_HYDRATION_INITIAL_CANDIDATE_LIMIT = 15;
const COVER_HYDRATION_DELAY_MS = 400;
const COVER_HYDRATION_TIMEOUT_MS = 4000;
const DETAIL_HYDRATION_MAX_PHOTOS_PER_GROUP = 3;
const DETAIL_HYDRATION_MAX_TOTAL_PHOTOS = 15;
const INITIAL_REVERSE_GEOCODE_CANDIDATE_LIMIT = 20;
const REVERSE_GEOCODE_DELAY_MS = 400;
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
  enrichmentStatus: 'pending' | 'success' | 'failed' | 'rate_limited';
  fallbackTitle: string;
  locationLabel?: string;
  regionLabel?: string;
  days: LocalDetectedTripDraftDay[];
}

export interface PhotoLibraryScanProgress {
  totalAssetCount: number;
  scannedAssetCount: number;
  currentPage: number;
  hasNextPage: boolean;
  detectedCandidateCount: number;
}

export interface PhotoLibraryScanResult {
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
  hiddenNoLocationTitleCandidateCount: number;
  hiddenScreenshotCandidateCount: number;
  hiddenTooFewRealPhotosCandidateCount: number;
  hiddenWeakSingleDayCandidateCount: number;
  hiddenLowGpsPhotoCandidateCount: number;
  pendingEnrichmentCandidateCount: number;
  photosAfterScreenshotFilterCount: number;
  drafts: LocalDetectedTripDraft[];
  candidates: PhotoImportTripCandidate[];
  skippedScreenshotCount: number;
}

interface PhotoLibraryScanOptions {
  createdAfter?: Date | number;
  pageSize?: number;
  onProgress?: (progress: PhotoLibraryScanProgress) => void;
  onCandidatesUpdated?: (candidates: PhotoImportTripCandidate[]) => void;
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
const assetDisplayUriCache = new Map<string, Promise<string | null>>();
const coverHydrationFailedDraftIds = new Set<string>();
const coverHydrationInFlightDraftIds = new Set<string>();
const coverHydrationCompletedDraftIds = new Set<string>();
const reverseGeocodeCache = new Map<string, Promise<ReverseGeocodeResult>>();
const REVERSE_GEOCODE_TIMEOUT_MS = 2500;

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
) {
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
) {
  const city = normalizeRegionPart(address?.city);
  const fallbackPart = locationLabel?.split(/\s+/u).map(normalizeRegionPart).find(Boolean);
  const titleCore = city ?? fallbackPart;

  return titleCore
    ? { displayTitle: `${titleCore} 여행`, reason: 'overseas_city' }
    : { displayTitle: PENDING_LOCATION_TITLE, reason: 'pending_location' };
}

function buildDetectedTripDisplayTitle(
  address?: Location.LocationGeocodedAddress | null,
  locationLabel?: string | null,
) {
  if (!locationLabel) {
    return { displayTitle: PENDING_LOCATION_TITLE, reason: 'pending_location' };
  }

  return isKoreanAddress(address, locationLabel)
    ? buildDomesticDisplayTitle(address, locationLabel)
    : buildOverseasDisplayTitle(address, locationLabel);
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

  if (mergedSpanDays > LONG_TRIP_MAX_DAYS) {
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
    metadata.dayCount <= LONG_TRIP_MAX_DAYS &&
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
  const hasCentroid =
    isFiniteCoordinateValue(draft.centroidLat) &&
    isFiniteCoordinateValue(draft.centroidLng);
  const hasGpsPhotos = draft.debugMetadata.gpsPhotoCount > 0;

  draft.fallbackTitle = formatCandidateDateTitle(draft.startDate, draft.endDate);

  if (hasCentroid && hasGpsPhotos) {
    const result = await withTimeout(
      reverseGeocodeLocationLabel(draft.centroidLat, draft.centroidLng),
      REVERSE_GEOCODE_TIMEOUT_MS,
      { address: null, failed: true, label: null, rateLimited: false },
    );
    draft.locationLabel = result.label ?? undefined;
    draft.regionLabel = result.label ?? undefined;

    if (result.label) {
      const titleBeforeNormalization = draft.title;
      const { displayTitle, reason } = buildDetectedTripDisplayTitle(result.address, result.label);
      draft.enrichmentStatus = 'success';
      draft.displayTitle = displayTitle;
      draft.title = displayTitle;

      if (__DEV__) {
        console.info('[photo-import title normalization]', {
          normalizedDisplayTitle: displayTitle,
          rawLocationLabel: result.label,
          titleAfter: draft.title,
          titleBefore: titleBeforeNormalization,
          titleNormalizationReason: reason,
        });
      }
    } else if (result.rateLimited) {
      draft.enrichmentStatus = 'rate_limited';
      draft.displayTitle = PENDING_LOCATION_TITLE;
      draft.title = PENDING_LOCATION_TITLE;
      addWarningReason(draft, 'reverse_geocode_rate_limited');
    } else {
      draft.enrichmentStatus = 'failed';
      draft.displayTitle = PENDING_LOCATION_TITLE;
      draft.title = PENDING_LOCATION_TITLE;
      addWarningReason(draft, 'reverse_geocode_failed');
      addWarningReason(draft, 'no_location_label');
    }
  } else {
    draft.enrichmentStatus = 'failed';
    draft.displayTitle = DETECTED_TRIP_TITLE;
    draft.title = DETECTED_TRIP_TITLE;
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

function canShowDraftAsCandidate(draft: LocalDetectedTripDraft) {
  return getCandidateHiddenReasons(draft).length === 0;
}

function getCandidateHiddenReasons(draft: LocalDetectedTripDraft) {
  const reasons: string[] = [];
  const metadata = draft.debugMetadata;
  const hasValidCentroid =
    isFiniteCoordinateValue(metadata.centroidLat) &&
    isFiniteCoordinateValue(metadata.centroidLng);
  const isSavedImageHeavy =
    metadata.savedImageRatio >= SAVED_IMAGE_HEAVY_RATIO &&
    metadata.realPhotoCount < MIN_SINGLE_DAY_VISIBLE_PHOTOS;

  if (metadata.confidenceLevel === 'low') {
    reasons.push('confidence_low');
  }

  if (metadata.gpsPhotoCount <= 0) {
    reasons.push('no_gps_for_title');
  } else if (metadata.gpsPhotoCount < MIN_VISIBLE_GPS_PHOTOS) {
    reasons.push('low_gps_photo_count');
  }

  if (!hasValidCentroid) {
    reasons.push('invalid_centroid');
  }

  if (metadata.warningReasons.includes('screenshot_only_or_mostly_screenshot')) {
    reasons.push('screenshot_only_or_mostly_screenshot');
  }

  if (isSavedImageHeavy) {
    reasons.push('saved_image_heavy_candidate');
  }

  if (metadata.realPhotoCount < MIN_REAL_PHOTOS_PER_VISIBLE_CANDIDATE) {
    reasons.push('too_few_real_photos');
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
    }

    if (metadata.realPhotoCount < MIN_ONE_DAY_STRICT_REAL_PHOTOS && !oneDayRelaxedForMovement) {
      reasons.push('too_few_camera_photos_for_one_day');
    }

    if (metadata.maxDistanceKm < MIN_SINGLE_DAY_DISTANCE_KM && metadata.locationClusterCount < 2) {
      reasons.push('too_static_one_day_candidate');
      reasons.push('likely_daily_event_not_trip');
    }
  } else if (metadata.dayCount < LONG_TRIP_MIN_DAYS) {
    if (metadata.realPhotoCount < MIN_SHORT_TRIP_REAL_PHOTOS) {
      reasons.push('too_few_camera_photos_for_short_trip');
    }
  } else if (
    metadata.realPhotoCount < MIN_LONG_TRIP_REAL_PHOTOS ||
    metadata.gpsPhotoCount < MIN_ONE_DAY_STRICT_GPS_PHOTOS ||
    metadata.gpsActiveDayCount < 2 ||
    isSavedImageHeavy
  ) {
    reasons.push('weak_long_trip_candidate');
  }

  return [...new Set(reasons)];
}

function getVisibleCandidateDrafts(draftsToFilter: LocalDetectedTripDraft[]) {
  return draftsToFilter.filter(canShowDraftAsCandidate);
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
  const queue = draftsToEnrich
    .filter(canShowDraftAsCandidate)
    .filter((draft) => draft.enrichmentStatus === 'pending')
    .slice(0, INITIAL_REVERSE_GEOCODE_CANDIDATE_LIMIT);

  if (__DEV__) {
    console.info('[photo-import enrichment] geocoding queue started', {
      geocodingQueueSize: queue.length,
    });
  }

  void (async () => {
    let geocodingFailCount = 0;
    let geocodingRateLimitedCount = 0;
    let geocodingStartedCount = 0;
    let geocodingSuccessCount = 0;

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

    onCandidatesUpdated?.(getVisibleCandidateDrafts(draftsToEnrich).map(createCandidateFromDraft));

    if (__DEV__) {
      console.info('[photo-import enrichment] geocoding queue completed', {
        geocodingFailCount,
        geocodingQueueSize: queue.length,
        geocodingRateLimitedCount,
        geocodingStartedCount,
        geocodingSuccessCount,
      });
    }
  })();
}

function createCandidateFromDraft(draft: LocalDetectedTripDraft): PhotoImportTripCandidate {
  const start = formatCandidateCardDate(draft.startDate);
  const end = formatCandidateCardDate(draft.endDate);

  return {
    city: draft.displayTitle,
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
      hiddenNoLocationTitleCandidateCount: 0,
      hiddenLowConfidenceCandidateCount: 0,
      hiddenScreenshotCandidateCount: 0,
      hiddenTooFewRealPhotosCandidateCount: 0,
      hiddenWeakSingleDayCandidateCount: 0,
      hiddenLowGpsPhotoCandidateCount: 0,
      oversizedCandidateSplitCount: 0,
      pageCount: 0,
      pendingEnrichmentCandidateCount: 0,
      permissionState,
      photosAfterScreenshotFilterCount: 0,
      scannedAssetCount: 0,
      skippedScreenshotCount: 0,
      skippedPhUriCount: 0,
      totalAssetCount: 0,
      visibleDetectedTripCandidateCount: 0,
    };
  }

  const photos: LocalDetectedPhoto[] = [];
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
      scannedAssetCount: photos.length,
      totalAssetCount,
    });

    if (__DEV__) {
      console.info('[photo-import scan] page', {
        currentPage: pageCount,
        hasNextPage,
        scannedAssetCount: photos.length,
        totalAssetCount,
      });
    }

    await yieldToEventLoop();
  }

  const skippedScreenshotCount = photos.filter((photo) => photo.isScreenshot).length;
  const candidatePhotos = photos.filter((photo) => !photo.isScreenshot);
  const photosAfterScreenshotFilterCount = candidatePhotos.length;
  const assetsWithLocationCount = photos.filter((photo) => photo.hasLocation).length;
  const photosWithCoordinatesCount = photos.filter((photo) => getPhotoCoordinates(photo)).length;
  const assetsWithoutLocationCount = photos.length - assetsWithLocationCount;
  const assetsWithDisplayUriCount = photos.filter((photo) => isRenderableImageUri(photo.displayUri)).length;
  const assetsWithoutDisplayUriCount = photos.length - assetsWithDisplayUriCount;
  const skippedPhUriCount = photos.filter((photo) => (
    photo.assetUri?.startsWith('ph://') && !isRenderableImageUri(photo.displayUri)
  )).length;
  const {
    drafts: nextDrafts,
    oversizedCandidateSplitCount,
    stats: candidateGenerationStats,
  } = splitPhotosIntoTripDrafts(candidatePhotos);

  storeDrafts(nextDrafts);
  options.onProgress?.({
    currentPage: pageCount,
    detectedCandidateCount: 0,
    hasNextPage: false,
    scannedAssetCount: photos.length,
    totalAssetCount,
  });

  if (__DEV__) {
    console.info('[photo-import scan] scan phase completed', {
      detectedTripCandidateCount: nextDrafts.length,
      scannedAssetCount: photos.length,
      totalAssetCount,
    });
    console.info('[photo-import enrichment] title phase scheduled', {
      candidateCount: nextDrafts.length,
    });
  }

  const visibleDrafts = getVisibleCandidateDrafts(nextDrafts);
  const candidates = visibleDrafts.map(createCandidateFromDraft);
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
    (draft) => getCandidateHiddenReasons(draft).includes('weak_single_day_candidate'),
  ).length;
  const hiddenLowGpsPhotoCandidateCount = nextDrafts.filter(
    (draft) => getCandidateHiddenReasons(draft).includes('low_gps_photo_count'),
  ).length;
  const hiddenWeakOneDayCandidateCount = nextDrafts.filter(
    (draft) => getCandidateHiddenReasons(draft).includes('weak_one_day_candidate'),
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
  const pendingEnrichmentCandidateCount = nextDrafts.filter((draft) => (
    draft.debugMetadata.confidenceLevel !== 'low' &&
    draft.debugMetadata.gpsPhotoCount > 0 &&
    isFiniteCoordinateValue(draft.debugMetadata.centroidLat) &&
    isFiniteCoordinateValue(draft.debugMetadata.centroidLng) &&
    draft.enrichmentStatus === 'pending'
  )).length;
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

  enrichDraftTitlesInBackground(nextDrafts, options.onCandidatesUpdated);
  options.onProgress?.({
    currentPage: pageCount,
    detectedCandidateCount: candidates.length,
    hasNextPage: false,
    scannedAssetCount: totalAssetCount || photos.length,
    totalAssetCount: totalAssetCount || photos.length,
  });

  if (__DEV__) {
    for (const draft of nextDrafts) {
      console.info('[detected trip candidate]', {
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
        hiddenFromCandidateList: !canShowDraftAsCandidate(draft),
        hiddenReasons: getCandidateHiddenReasons(draft),
        locationClusterCount: draft.debugMetadata.locationClusterCount,
        locationLabel: draft.locationLabel,
        enrichmentStatus: draft.enrichmentStatus,
        maxDistanceKm: draft.debugMetadata.maxDistanceKm,
        mergedFromCandidateCount: draft.debugMetadata.mergedFromCandidateCount,
        noGpsPhotoCount: draft.debugMetadata.noGpsPhotoCount,
        photoCount: draft.debugMetadata.photoCount,
        realPhotoCount: draft.debugMetadata.realPhotoCount,
        savedImageCount: draft.debugMetadata.savedImageCount,
        savedImageRatio: draft.debugMetadata.savedImageRatio,
        screenshotPhotoCount: draft.debugMetadata.screenshotPhotoCount,
        splitReason: draft.debugMetadata.splitReason,
        startDate: draft.debugMetadata.startDate,
        isLongTripCandidate: draft.debugMetadata.isLongTripCandidate,
        title: draft.title,
        warningReasons: draft.debugMetadata.warningReasons,
      });
    }

    console.info('[photo-import scan] result', {
      assetsWithLocationCount,
      assetsWithDisplayUriCount,
      assetsWithoutLocationCount,
      assetsWithoutDisplayUriCount,
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
      detectedTripCandidateCount: nextDrafts.length,
      generatedDraftIds: nextDrafts.map((draft) => draft.id),
      hiddenSavedImageHeavyCandidateCount,
      hiddenTooFewCameraPhotosCandidateCount,
      hiddenNoLocationTitleCandidateCount,
      hiddenLowConfidenceCandidateCount,
      hiddenScreenshotCandidateCount,
      hiddenTooFewRealPhotosCandidateCount,
      hiddenWeakSingleDayCandidateCount,
      hiddenWeakOneDayCandidateCount,
      hiddenWeakLongTripCandidateCount,
      hiddenLowGpsPhotoCandidateCount,
      initialRangeCandidateCount: candidateGenerationStats.initialRangeCandidateCount,
      longTripCandidateCount: candidateGenerationStats.longTripCandidateCount,
      longTripPostMergeCount: candidateGenerationStats.longTripPostMergeCount,
      longTripVisibleCandidateCount,
      oneDayCandidateCount: candidateGenerationStats.oneDayCandidateCount,
      oneDayVisibleCandidateCount,
      oversizedCandidateSplitCount,
      pageCount,
      pendingEnrichmentCandidateCount,
      photosAfterScreenshotFilterCount,
      photosWithCoordinatesCount,
      rawDateBucketCount: candidateGenerationStats.rawDateBucketCount,
      scannedAssetCount: photos.length,
      shortTripCandidateCount: candidateGenerationStats.shortTripCandidateCount,
      shortTripVisibleCandidateCount,
      skippedScreenshotCount,
      skippedPhUriCount,
      splitByDateGapCount: candidateGenerationStats.splitByDateGapCount,
      splitByDistanceCount: candidateGenerationStats.splitByDistanceCount,
      splitByGpsMixedCount: candidateGenerationStats.splitByGpsMixedCount,
      totalAssetCount,
      visibleDetectedTripCandidateCount: candidates.length,
    });
    console.info('[photo-import enrichment] title phase scheduled', {
      candidateCountAfterLongTripMerge: candidateGenerationStats.candidateCountAfterLongTripMerge,
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

  return {
    assetsWithDisplayUriCount,
    assetsWithLocationCount,
    assetsWithoutDisplayUriCount,
    assetsWithoutLocationCount,
    candidates,
    detectedTripCandidateCount: nextDrafts.length,
    drafts: nextDrafts,
    hiddenNoLocationTitleCandidateCount,
    hiddenLowConfidenceCandidateCount,
    hiddenScreenshotCandidateCount,
    hiddenTooFewRealPhotosCandidateCount,
    hiddenWeakSingleDayCandidateCount,
    hiddenLowGpsPhotoCandidateCount,
    oversizedCandidateSplitCount,
    pageCount,
    pendingEnrichmentCandidateCount,
    permissionState,
    photosAfterScreenshotFilterCount,
    scannedAssetCount: photos.length,
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

export const PHOTO_LIBRARY_SCAN_LIMITS = {
  maxCandidateDays: MAX_CONTINUOUS_TRIP_DAYS,
  maxCandidatePhotos: MAX_PHOTOS_PER_TRIP_CANDIDATE,
  minCandidatePhotos: MIN_PHOTOS_PER_TRIP_CANDIDATE,
  minPhotosPerDay: MIN_PHOTOS_PER_DAY,
  pageSize: PHOTO_SCAN_PAGE_SIZE,
  recentLookbackMonths: RECENT_PHOTO_SCAN_LOOKBACK_MONTHS,
};
