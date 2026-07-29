import { supabase } from '@/lib/supabase';
import type { Json, Tables, TablesInsert, TablesUpdate } from '@/types/supabase';

export const PHOTO_STORAGE_BUCKET = 'photos';

export type PhotoRow = Tables<'photos'>;

export type PhotoQueryScreen =
  | 'saved_day_archive_detail'
  | 'saved_place_detail'
  | 'saved_trip_cover';

export type ResolvedPhotoRow = PhotoRow & {
  displayUrl: string | null;
  displayUrlStatus: 'failed' | 'missing' | 'ready';
};

export interface UploadPhotoAssetInput {
  exif?: Record<string, unknown> | null;
  fileName?: string | null;
  fileSize?: number | null;
  height?: number | null;
  latitude?: number | null;
  localUri: string;
  longitude?: number | null;
  mimeType?: string | null;
  onLifecycleEvent?: (
    event: 'photo_row_created' | 'storage_object_deleted' | 'storage_object_uploaded',
  ) => void;
  placeId?: string | null;
  takenAt?: Date | number | string | null;
  tripDayId: string;
  tripId: string;
  width?: number | null;
}

function notifyPhotoUploadLifecycle(
  input: UploadPhotoAssetInput,
  event: 'photo_row_created' | 'storage_object_deleted' | 'storage_object_uploaded',
) {
  try {
    input.onLifecycleEvent?.(event);
  } catch {
    // Observability must not change the upload transaction outcome.
  }
}

export interface UploadPhotoAssetResult {
  bucket: typeof PHOTO_STORAGE_BUCKET;
  photo: PhotoRow;
  storagePath: string;
}

export interface UploadPlacePhotoItem {
  input: UploadPhotoAssetInput;
  sourceIdentifier: string;
}

export interface UploadPlacePhotosResult {
  failedItems: UploadPlacePhotoItem[];
  failureCounts: Record<PhotoUploadFailureStage, number>;
  skippedCount: number;
  uploadedPhotoCount: number;
}

export type PhotoStorageDeleteStatus = 'deleted' | 'failed' | 'not_applicable';

export interface DeletePhotoResult {
  alreadyDeleted: boolean;
  photoId: string;
  placeCoverPhotoId: string | null;
  placeId: string | null;
  softDeleteSucceeded: true;
  storageDeleteFailed: boolean;
  storageDeleteStatus: PhotoStorageDeleteStatus;
  storageDeleteSucceeded: boolean;
  tripCoverPhotoId: string | null;
  tripDayId: string | null;
  tripId: string;
}

export interface DeletePhotoFailure {
  photoId: string;
  stage: 'rpc' | 'storage';
}

export interface DeletePhotosResult {
  failed: DeletePhotoFailure[];
  requestedPhotoCount: number;
  results: DeletePhotoResult[];
  softDeletedPhotoCount: number;
  storageCleanupFailedPhotoIds: string[];
  storageDeleteSuccessCount: number;
}

export interface EnsuredTripPhotoCovers {
  activePhotoCount: number;
  tripCoverPhotoId: string | null;
  tripId: string;
  updatedPlaceCount: number;
}

export type TripWithPhotoCover<T> = T & {
  active_photo_count?: number;
  cover_display_url?: string | null;
};

export type PhotoUploadFailureStage =
  | 'original_preparation'
  | 'photo_row_insert'
  | 'storage_upload';

export class PhotoUploadError extends Error {
  stage: PhotoUploadFailureStage;

  constructor(message: string, stage: PhotoUploadFailureStage) {
    super(message);
    this.name = 'PhotoUploadError';
    this.stage = stage;
  }
}

type SupportedPhotoMimeType =
  | 'image/heic'
  | 'image/heif'
  | 'image/jpeg'
  | 'image/png'
  | 'image/webp';

type NormalizedPhotoFileType = {
  extension: 'heic' | 'heif' | 'jpg' | 'png' | 'webp';
  mimeType: SupportedPhotoMimeType;
};

const MAX_PHOTO_FILE_SIZE = 50 * 1024 * 1024;
const PHOTO_SIGNED_URL_TTL_SECONDS = 60 * 60;
const PHOTO_SIGNED_URL_CACHE_BUFFER_MS = 60 * 1000;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MIME_TYPE_BY_EXTENSION: Record<string, SupportedPhotoMimeType> = {
  heic: 'image/heic',
  heif: 'image/heif',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};
const FILE_TYPE_BY_MIME_TYPE: Record<SupportedPhotoMimeType, NormalizedPhotoFileType> = {
  'image/heic': { extension: 'heic', mimeType: 'image/heic' },
  'image/heif': { extension: 'heif', mimeType: 'image/heif' },
  'image/jpeg': { extension: 'jpg', mimeType: 'image/jpeg' },
  'image/png': { extension: 'png', mimeType: 'image/png' },
  'image/webp': { extension: 'webp', mimeType: 'image/webp' },
};
const signedPhotoUrlCache = new Map<string, {
  expiresAt: number;
  promise: Promise<string | null>;
}>();
const activePlacePhotoUploadOperations =
  new Map<string, Promise<UploadPlacePhotosResult>>();
const savedPlacePhotoResultsByIdentifier =
  new Map<string, UploadPhotoAssetResult>();
const activePhotoDeleteOperations = new Map<string, Promise<DeletePhotoResult>>();
const PHOTO_DELETE_CONCURRENCY = 3;

function throwIfError(error: Error | null) {
  if (error) {
    throw error;
  }
}

function getFiniteNumber(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getPositiveInteger(value?: number | null) {
  return Number.isInteger(value) && Number(value) > 0 ? Number(value) : null;
}

function getFileExtension(value?: string | null) {
  const withoutQuery = value?.split(/[?#]/)[0] ?? '';
  const match = withoutQuery.match(/\.([a-z0-9]+)$/i);
  return match?.[1]?.toLowerCase() ?? '';
}

function getUsablePhotoUrl(value?: string | null) {
  const trimmedValue = value?.trim();

  return trimmedValue && /^(https?:|content:|file:)/i.test(trimmedValue)
    ? trimmedValue
    : null;
}

function getCachedSignedPhotoUrl(storagePath: string) {
  const cached = signedPhotoUrlCache.get(storagePath);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.promise;
  }

  const promise = supabase.storage
    .from(PHOTO_STORAGE_BUCKET)
    .createSignedUrl(storagePath, PHOTO_SIGNED_URL_TTL_SECONDS)
    .then(({ data, error }) => {
      if (error || !data?.signedUrl) {
        signedPhotoUrlCache.delete(storagePath);
        return null;
      }

      return data.signedUrl;
    })
    .catch(() => {
      signedPhotoUrlCache.delete(storagePath);
      return null;
    });

  signedPhotoUrlCache.set(storagePath, {
    expiresAt:
      Date.now() +
      PHOTO_SIGNED_URL_TTL_SECONDS * 1000 -
      PHOTO_SIGNED_URL_CACHE_BUFFER_MS,
    promise,
  });

  return promise;
}

async function resolvePhotoRows(
  rows: PhotoRow[],
  screen: PhotoQueryScreen,
): Promise<ResolvedPhotoRow[]> {
  const storagePaths = [
    ...new Set(
      rows
        .filter((row) => (
          !getUsablePhotoUrl(row.thumbnail_url) &&
          !getUsablePhotoUrl(row.image_url)
        ))
        .map((row) => row.storage_path?.trim())
        .filter((path): path is string => Boolean(path)),
    ),
  ];
  const signedUrlEntries = await Promise.all(
    storagePaths.map(async (storagePath) => (
      [storagePath, await getCachedSignedPhotoUrl(storagePath)] as const
    )),
  );
  const signedUrlsByStoragePath = new Map(signedUrlEntries);
  const resolvedRows = rows.map((row): ResolvedPhotoRow => {
    const directUrl =
      getUsablePhotoUrl(row.thumbnail_url) ??
      getUsablePhotoUrl(row.image_url);
    const signedUrl = row.storage_path
      ? signedUrlsByStoragePath.get(row.storage_path.trim()) ?? null
      : null;
    const displayUrl = directUrl ?? signedUrl;

    return {
      ...row,
      displayUrl,
      displayUrlStatus: displayUrl
        ? 'ready'
        : row.storage_path
          ? 'failed'
          : 'missing',
    };
  });

  if (__DEV__) {
    console.info('[photo query] completed', {
      photoQueryStarted: true,
      photoRowCount: rows.length,
      renderedPhotoCount: resolvedRows.filter((row) => row.displayUrl).length,
      screen,
      signedUrlFailureCount: signedUrlEntries.filter(([, url]) => !url).length,
      signedUrlRequestedCount: storagePaths.length,
      signedUrlSuccessCount: signedUrlEntries.filter(([, url]) => Boolean(url)).length,
    });
  }

  return resolvedRows;
}

async function fetchResolvedPhotos(
  column: 'place_id' | 'trip_day_id',
  id: string,
  screen: PhotoQueryScreen,
) {
  if (__DEV__) {
    console.info('[photo query] started', {
      photoQueryStarted: true,
      screen,
    });
  }

  const { data, error } = await supabase
    .from('photos')
    .select(
      'id, user_id, trip_id, trip_day_id, place_id, storage_path, image_url, thumbnail_url, local_uri, taken_at, width, height, mime_type, file_name, file_size, latitude, longitude, city, country, city_ko, country_ko, exif_data, created_at, updated_at, deleted_at',
    )
    .eq(column, id)
    .is('deleted_at', null)
    .order('taken_at', { ascending: true, nullsFirst: false });

  throwIfError(error);
  return resolvePhotoRows(data ?? [], screen);
}

export function resolvePhotoUploadFileType(
  mimeType?: string | null,
  fileName?: string | null,
  localUri?: string | null,
): NormalizedPhotoFileType {
  const normalizedMimeType = mimeType?.split(';')[0]?.trim().toLowerCase();

  if (normalizedMimeType) {
    const supportedType = FILE_TYPE_BY_MIME_TYPE[normalizedMimeType as SupportedPhotoMimeType];

    if (!supportedType) {
      throw new Error('The selected image type is not supported.');
    }

    return supportedType;
  }

  const extension = getFileExtension(fileName) || getFileExtension(localUri);
  const inferredMimeType = MIME_TYPE_BY_EXTENSION[extension];

  if (extension && !inferredMimeType) {
    throw new Error('The selected image extension is not supported.');
  }

  return inferredMimeType
    ? FILE_TYPE_BY_MIME_TYPE[inferredMimeType]
    : FILE_TYPE_BY_MIME_TYPE['image/jpeg'];
}

function createPhotoUuid() {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);

  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }

  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, '0'));

  return [
    hex.slice(0, 4).join(''),
    hex.slice(4, 6).join(''),
    hex.slice(6, 8).join(''),
    hex.slice(8, 10).join(''),
    hex.slice(10, 16).join(''),
  ].join('-');
}

export function buildPhotoStoragePath(
  userId: string,
  tripId: string,
  photoId: string,
  extension: NormalizedPhotoFileType['extension'],
) {
  if (![userId, tripId, photoId].every((value) => UUID_PATTERN.test(value))) {
    throw new Error('A valid user, trip, and photo identifier is required.');
  }

  return `${userId}/${tripId}/${photoId}.${extension}`;
}

function normalizeOriginalFileName(
  fileName: string | null | undefined,
  photoId: string,
  extension: NormalizedPhotoFileType['extension'],
) {
  const normalizedName = fileName
    ?.split(/[\\/]/)
    .pop()
    ?.replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
    .slice(0, 255);

  return normalizedName || `${photoId}.${extension}`;
}

function normalizeDate(value: unknown): string | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }

  if (typeof value === 'number') {
    const milliseconds = value < 10_000_000_000 ? value * 1000 : value;
    const date = new Date(milliseconds);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }

  const trimmedValue = value.trim();
  const exifMatch = trimmedValue.match(
    /^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/,
  );

  if (exifMatch) {
    const [, year, month, day, hour, minute, second] = exifMatch.map(Number);
    const date = new Date(year, month - 1, day, hour, minute, second);

    if (
      Number.isNaN(date.getTime()) ||
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day ||
      date.getHours() !== hour ||
      date.getMinutes() !== minute ||
      date.getSeconds() !== second
    ) {
      return null;
    }

    return date.toISOString();
  }

  const date = new Date(trimmedValue);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function normalizeCoordinates(
  latitudeInput: unknown,
  longitudeInput: unknown,
  latitudeReference?: unknown,
  longitudeReference?: unknown,
) {
  const latitude = getFiniteNumber(latitudeInput);
  const longitude = getFiniteNumber(longitudeInput);

  if (
    latitude == null ||
    longitude == null ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  ) {
    return { latitude: null, longitude: null };
  }

  return {
    latitude: String(latitudeReference).toUpperCase() === 'S'
      ? -Math.abs(latitude)
      : latitude,
    longitude: String(longitudeReference).toUpperCase() === 'W'
      ? -Math.abs(longitude)
      : longitude,
  };
}

export function normalizePhotoMetadata(input: UploadPhotoAssetInput) {
  const exif = input.exif ?? {};
  const takenAt = normalizeDate(
    input.takenAt ??
    exif.DateTimeOriginal ??
    exif.DateTimeDigitized ??
    exif.DateTime,
  );
  const coordinates = normalizeCoordinates(
    input.latitude ?? exif.GPSLatitude,
    input.longitude ?? exif.GPSLongitude,
    exif.GPSLatitudeRef,
    exif.GPSLongitudeRef,
  );
  const orientation = getFiniteNumber(exif.Orientation);
  const normalizedExif: Json | null = orientation == null
    ? null
    : { orientation };

  return {
    exifData: normalizedExif,
    height: getPositiveInteger(input.height),
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
    takenAt,
    width: getPositiveInteger(input.width),
  };
}

async function getCurrentUserId() {
  const { data, error } = await supabase.auth.getUser();
  throwIfError(error);

  if (!data.user?.id) {
    throw new Error('A Supabase session is required.');
  }

  return data.user.id;
}

async function validatePhotoUploadRelationships(
  input: UploadPhotoAssetInput,
  userId: string,
) {
  const [
    { data: trip, error: tripError },
    { data: tripDay, error: tripDayError },
    placeResult,
  ] = await Promise.all([
    supabase
      .from('trips')
      .select('id, user_id, deleted_at')
      .eq('id', input.tripId)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .maybeSingle(),
    supabase
      .from('trip_days')
      .select('id, trip_id, deleted_at')
      .eq('id', input.tripDayId)
      .eq('trip_id', input.tripId)
      .is('deleted_at', null)
      .maybeSingle(),
    input.placeId
      ? supabase
        .from('places')
        .select('id, user_id, trip_id, trip_day_id, deleted_at')
        .eq('id', input.placeId)
        .eq('user_id', userId)
        .is('deleted_at', null)
        .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  throwIfError(tripError);
  throwIfError(tripDayError);
  throwIfError(placeResult.error);

  const hasValidTripRelationship =
    trip?.user_id === userId &&
    tripDay?.trip_id === input.tripId;
  const hasValidPlaceRelationship =
    !input.placeId ||
    (
      placeResult.data?.user_id === userId &&
      placeResult.data.trip_id === input.tripId &&
      placeResult.data.trip_day_id === input.tripDayId
    );

  if (!hasValidTripRelationship || !hasValidPlaceRelationship) {
    throw new Error('The selected trip, trip day, and place are not an active relationship.');
  }
}

async function removePhotoStorageObjectForUser(storagePath: string, userId: string) {
  const [pathUserId, pathTripId, pathFileName, extraSegment] = storagePath.split('/');
  const pathPhotoId = pathFileName?.split('.')[0] ?? '';

  if (
    pathUserId !== userId ||
    !UUID_PATTERN.test(pathUserId) ||
    !UUID_PATTERN.test(pathTripId ?? '') ||
    !UUID_PATTERN.test(pathPhotoId) ||
    !getFileExtension(pathFileName) ||
    extraSegment != null
  ) {
    throw new Error('The photo storage path does not belong to the current user.');
  }

  const { error } = await supabase.storage
    .from(PHOTO_STORAGE_BUCKET)
    .remove([storagePath]);

  throwIfError(error);
  signedPhotoUrlCache.delete(storagePath);
}

export async function removePhotoStorageObject(storagePath: string) {
  const userId = await getCurrentUserId();
  await removePhotoStorageObjectForUser(storagePath, userId);
}

export async function uploadPhotoAsset(
  input: UploadPhotoAssetInput,
): Promise<UploadPhotoAssetResult> {
  if (!/^(blob:|content:\/\/|file:\/\/)/i.test(input.localUri.trim())) {
    throw new Error('A renderable local photo URI is required for upload.');
  }

  if (
    input.fileSize != null &&
    (!Number.isFinite(input.fileSize) || input.fileSize <= 0)
  ) {
    throw new Error('The selected image has an invalid file size.');
  }

  if (input.fileSize != null && input.fileSize > MAX_PHOTO_FILE_SIZE) {
    throw new Error('The selected image exceeds the photo upload size limit.');
  }

  const userId = await getCurrentUserId();
  await validatePhotoUploadRelationships(input, userId);

  const fileType = resolvePhotoUploadFileType(input.mimeType, input.fileName, input.localUri);
  const metadata = normalizePhotoMetadata(input);

  if (!metadata.width || !metadata.height) {
    throw new Error('The selected image dimensions are required.');
  }

  const photoId = createPhotoUuid();
  const storagePath = buildPhotoStoragePath(
    userId,
    input.tripId,
    photoId,
    fileType.extension,
  );
  let fileData: ArrayBuffer;

  try {
    const response = await fetch(input.localUri);
    fileData = await response.arrayBuffer();
  } catch {
    throw new PhotoUploadError(
      'The selected image could not be prepared for upload.',
      'original_preparation',
    );
  }

  if (fileData.byteLength === 0) {
    throw new Error('The selected image file is empty.');
  }

  if (fileData.byteLength > MAX_PHOTO_FILE_SIZE) {
    throw new Error('The selected image exceeds the photo upload size limit.');
  }

  const { error: uploadError } = await supabase.storage
    .from(PHOTO_STORAGE_BUCKET)
    .upload(storagePath, fileData, {
      contentType: fileType.mimeType,
      upsert: false,
    });

  if (uploadError) {
    throw new PhotoUploadError(
      'The selected image could not be uploaded.',
      'storage_upload',
    );
  }
  notifyPhotoUploadLifecycle(input, 'storage_object_uploaded');

  const payload: TablesInsert<'photos'> = {
    exif_data: metadata.exifData,
    file_name: normalizeOriginalFileName(input.fileName, photoId, fileType.extension),
    file_size: fileData.byteLength,
    height: metadata.height,
    id: photoId,
    image_url: null,
    latitude: metadata.latitude,
    local_uri: null,
    longitude: metadata.longitude,
    mime_type: fileType.mimeType,
    place_id: input.placeId ?? null,
    storage_path: storagePath,
    taken_at: metadata.takenAt,
    thumbnail_url: null,
    trip_day_id: input.tripDayId,
    trip_id: input.tripId,
    user_id: userId,
    width: metadata.width,
  };

  try {
    const { data: photo, error: insertError } = await createPhoto(payload);
    throwIfError(insertError);

    if (!photo) {
      throw new Error('The uploaded photo metadata could not be saved.');
    }
    notifyPhotoUploadLifecycle(input, 'photo_row_created');

    return {
      bucket: PHOTO_STORAGE_BUCKET,
      photo,
      storagePath,
    };
  } catch (insertError) {
    try {
      await removePhotoStorageObjectForUser(storagePath, userId);
      notifyPhotoUploadLifecycle(input, 'storage_object_deleted');
    } catch {
      console.warn('[photo upload] storage rollback failed', {
        storageRollbackFailed: true,
      });
    }

    throw insertError instanceof PhotoUploadError
      ? insertError
      : new PhotoUploadError(
        'The uploaded photo metadata could not be saved.',
        'photo_row_insert',
      );
  }
}

export function uploadPlacePhotos(items: UploadPlacePhotoItem[]) {
  const firstItem = items[0];

  if (!firstItem) {
    return Promise.resolve<UploadPlacePhotosResult>({
      failedItems: [],
      failureCounts: {
        original_preparation: 0,
        photo_row_insert: 0,
        storage_upload: 0,
      },
      skippedCount: 0,
      uploadedPhotoCount: 0,
    });
  }

  const operationKey = [
    firstItem.input.tripId,
    firstItem.input.tripDayId,
    firstItem.input.placeId ?? 'no-place',
  ].join(':');
  const activeOperation = activePlacePhotoUploadOperations.get(operationKey);

  if (activeOperation) {
    if (__DEV__) {
      console.info('[photo upload] duplicate blocked', {
        photoUploadDuplicateBlocked: true,
      });
    }
    return activeOperation;
  }

  const operation = (async (): Promise<UploadPlacePhotosResult> => {
    const uniqueItems = [
      ...new Map(
        items.map((item) => [
          `${operationKey}:${item.sourceIdentifier}`,
          item,
        ]),
      ).values(),
    ];
    const pendingItems = uniqueItems.filter((item) => (
      !savedPlacePhotoResultsByIdentifier.has(
        `${operationKey}:${item.sourceIdentifier}`,
      )
    ));
    const skippedCount = items.length - pendingItems.length;
    const uploadedRows: PhotoRow[] = [];
    const failedItems: UploadPlacePhotoItem[] = [];
    const failureCounts: Record<PhotoUploadFailureStage, number> = {
      original_preparation: 0,
      photo_row_insert: 0,
      storage_upload: 0,
    };
    let nextIndex = 0;
    let rollbackDeleteCount = 0;

    if (__DEV__) {
      console.info('[photo upload] started', {
        photoUploadStarted: true,
        selectedPhotoCount: items.length,
        skippedPhotoCount: skippedCount,
      });
    }

    async function uploadNext() {
      while (nextIndex < pendingItems.length) {
        const item = pendingItems[nextIndex];
        nextIndex += 1;

        try {
          const result = await uploadPhotoAsset({
            ...item.input,
            onLifecycleEvent: (event) => {
              item.input.onLifecycleEvent?.(event);

              if (event === 'storage_object_deleted') {
                rollbackDeleteCount += 1;
              }
            },
          });

          savedPlacePhotoResultsByIdentifier.set(
            `${operationKey}:${item.sourceIdentifier}`,
            result,
          );
          uploadedRows.push(result.photo);
        } catch (error) {
          const failureStage = error instanceof PhotoUploadError
            ? error.stage
            : 'original_preparation';
          failureCounts[failureStage] += 1;
          failedItems.push(item);
        }
      }
    }

    await Promise.all(
      Array.from(
        { length: Math.min(3, pendingItems.length) },
        () => uploadNext(),
      ),
    );

    if (__DEV__) {
      console.info('[photo upload] completed', {
        photoUploadFailureCount: failedItems.length,
        photoUploadSuccessCount: uploadedRows.length,
        photoUploadFailureCounts: failureCounts,
        rollbackDeleteCount,
      });
    }

    return {
      failedItems,
      failureCounts,
      skippedCount,
      uploadedPhotoCount: uploadedRows.length,
    };
  })();

  activePlacePhotoUploadOperations.set(operationKey, operation);
  const clearActiveOperation = () => {
    if (activePlacePhotoUploadOperations.get(operationKey) === operation) {
      activePlacePhotoUploadOperations.delete(operationKey);
    }
  };
  void operation.then(clearActiveOperation, clearActiveOperation);

  return operation;
}

export function listPhotosByPlace(placeId: string) {
  return supabase
    .from('photos')
    .select('*')
    .eq('place_id', placeId)
    .is('deleted_at', null)
    .order('taken_at', { ascending: true, nullsFirst: false });
}

export async function fetchPhotosByPlaceId(
  placeId: string,
  screen: PhotoQueryScreen = 'saved_place_detail',
) {
  const { data: place, error: placeError } = await supabase
    .from('places')
    .select('id, trip_id, cover_photo_id')
    .eq('id', placeId)
    .is('deleted_at', null)
    .maybeSingle();

  throwIfError(placeError);

  if (!place) {
    return [];
  }

  await ensurePhotoCoversForTrip(place.trip_id);
  const [{ data: refreshedPlace, error: refreshedPlaceError }, photos] =
    await Promise.all([
      supabase
        .from('places')
        .select('cover_photo_id')
        .eq('id', placeId)
        .is('deleted_at', null)
        .maybeSingle(),
      fetchResolvedPhotos('place_id', placeId, screen),
    ]);

  throwIfError(refreshedPlaceError);

  if (!refreshedPlace?.cover_photo_id) {
    return photos;
  }

  return [
    ...photos.filter((photo) => photo.id === refreshedPlace.cover_photo_id),
    ...photos.filter((photo) => photo.id !== refreshedPlace.cover_photo_id),
  ];
}

export function fetchPhotosByTripDayId(
  tripDayId: string,
  screen: PhotoQueryScreen = 'saved_day_archive_detail',
) {
  return fetchResolvedPhotos('trip_day_id', tripDayId, screen);
}

export function listPhotosByTrip(tripId: string) {
  return supabase
    .from('photos')
    .select('*')
    .eq('trip_id', tripId)
    .is('deleted_at', null)
    .order('taken_at', { ascending: true, nullsFirst: false });
}

export async function ensurePhotoCoversForTrip(
  tripId: string,
): Promise<EnsuredTripPhotoCovers> {
  await getCurrentUserId();
  const { data, error } = await supabase
    .rpc('ensure_photo_covers_for_trip', { p_trip_id: tripId })
    .single();

  throwIfError(error);

  if (!data) {
    throw new Error('The trip photo covers could not be resolved.');
  }

  return {
    activePhotoCount: Number(data.active_photo_count ?? 0),
    tripCoverPhotoId: data.trip_cover_photo_id,
    tripId: data.trip_id,
    updatedPlaceCount: data.updated_place_count,
  };
}

export async function enrichTripsWithPhotoCovers<
  T extends { cover_photo_id: string | null; id: string },
>(trips: T[]): Promise<TripWithPhotoCover<T>[]> {
  const uniqueTrips = [...new Map(trips.map((trip) => [trip.id, trip])).values()];
  const ensuredCovers: EnsuredTripPhotoCovers[] = [];
  let nextIndex = 0;

  const ensureNext = async () => {
    while (nextIndex < uniqueTrips.length) {
      const trip = uniqueTrips[nextIndex];
      nextIndex += 1;
      ensuredCovers.push(await ensurePhotoCoversForTrip(trip.id));
    }
  };

  await Promise.all(
    Array.from(
      { length: Math.min(PHOTO_DELETE_CONCURRENCY, uniqueTrips.length) },
      () => ensureNext(),
    ),
  );

  const ensuredByTripId = new Map(
    ensuredCovers.map((cover) => [cover.tripId, cover]),
  );
  const coverPhotoIds = [
    ...new Set(
      ensuredCovers
        .map((cover) => cover.tripCoverPhotoId)
        .filter((photoId): photoId is string => Boolean(photoId)),
    ),
  ];
  const coverUrlByPhotoId = new Map<string, string | null>();

  if (coverPhotoIds.length > 0) {
    const { data, error } = await supabase
      .from('photos')
      .select(
        'id, user_id, trip_id, trip_day_id, place_id, storage_path, image_url, thumbnail_url, local_uri, taken_at, width, height, mime_type, file_name, file_size, latitude, longitude, city, country, city_ko, country_ko, exif_data, created_at, updated_at, deleted_at',
      )
      .in('id', coverPhotoIds)
      .is('deleted_at', null);

    throwIfError(error);
    const resolvedCovers = await resolvePhotoRows(data ?? [], 'saved_trip_cover');
    resolvedCovers.forEach((photo) => {
      coverUrlByPhotoId.set(photo.id, photo.displayUrl);
    });
  }

  return trips.map((trip) => {
    const ensuredCover = ensuredByTripId.get(trip.id);
    const coverPhotoId = ensuredCover?.tripCoverPhotoId ?? trip.cover_photo_id;

    return {
      ...trip,
      active_photo_count: ensuredCover?.activePhotoCount,
      cover_display_url: coverPhotoId
        ? coverUrlByPhotoId.get(coverPhotoId) ?? null
        : null,
      cover_photo_id: coverPhotoId,
    };
  });
}

async function executePhotoDelete(photoId: string): Promise<DeletePhotoResult> {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .rpc('soft_delete_photo', { p_photo_id: photoId })
    .single();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error('The photo could not be deleted.');
  }

  let storageDeleteStatus: PhotoStorageDeleteStatus = 'not_applicable';

  if (data.storage_path) {
    try {
      await removePhotoStorageObjectForUser(data.storage_path, userId);
      storageDeleteStatus = 'deleted';
    } catch {
      storageDeleteStatus = 'failed';
    }
  }

  return {
    alreadyDeleted: data.already_deleted,
    photoId: data.photo_id,
    placeCoverPhotoId: data.place_cover_photo_id,
    placeId: data.place_id,
    softDeleteSucceeded: true,
    storageDeleteFailed: storageDeleteStatus === 'failed',
    storageDeleteStatus,
    storageDeleteSucceeded: storageDeleteStatus === 'deleted',
    tripCoverPhotoId: data.trip_cover_photo_id,
    tripDayId: data.trip_day_id,
    tripId: data.trip_id,
  };
}

export function softDeletePhoto(photoId: string) {
  const activeOperation = activePhotoDeleteOperations.get(photoId);

  if (activeOperation) {
    if (__DEV__) {
      console.info('[photo delete] duplicate blocked', {
        saveOperationDuplicateBlocked: true,
      });
    }
    return activeOperation;
  }

  const operation = executePhotoDelete(photoId);
  activePhotoDeleteOperations.set(photoId, operation);
  const clearOperation = () => {
    if (activePhotoDeleteOperations.get(photoId) === operation) {
      activePhotoDeleteOperations.delete(photoId);
    }
  };
  void operation.then(clearOperation, clearOperation);

  return operation;
}

export async function softDeletePhotos(photoIds: string[]): Promise<DeletePhotosResult> {
  const uniquePhotoIds = [...new Set(photoIds.filter(Boolean))];
  const results: DeletePhotoResult[] = [];
  const failed: DeletePhotoFailure[] = [];
  let nextIndex = 0;

  if (__DEV__) {
    console.info('[photo delete] started', {
      eligiblePhotoCount: uniquePhotoIds.length,
      photoDeleteStarted: true,
      requestedPhotoCount: uniquePhotoIds.length,
    });
  }

  const deleteNext = async () => {
    while (nextIndex < uniquePhotoIds.length) {
      const photoId = uniquePhotoIds[nextIndex];
      nextIndex += 1;

      try {
        const result = await softDeletePhoto(photoId);
        results.push(result);
      } catch {
        failed.push({ photoId, stage: 'rpc' });
      }
    }
  };

  await Promise.all(
    Array.from(
      { length: Math.min(PHOTO_DELETE_CONCURRENCY, uniquePhotoIds.length) },
      () => deleteNext(),
    ),
  );

  const storageCleanupFailedPhotoIds = results
    .filter((result) => result.storageDeleteFailed)
    .map((result) => result.photoId);
  const storageDeleteSuccessCount = results.filter(
    (result) => result.storageDeleteSucceeded,
  ).length;

  if (__DEV__) {
    console.info('[photo delete] completed', {
      failedPhotoCount: failed.length,
      representativeFallbackCount: results.filter(
        (result) => result.placeCoverPhotoId || result.tripCoverPhotoId,
      ).length,
      softDeletedPhotoCount: results.filter((result) => !result.alreadyDeleted).length,
      storageDeleteFailureCount: storageCleanupFailedPhotoIds.length,
      storageDeleteSuccessCount,
    });
  }

  return {
    failed,
    requestedPhotoCount: uniquePhotoIds.length,
    results,
    softDeletedPhotoCount: results.filter((result) => !result.alreadyDeleted).length,
    storageCleanupFailedPhotoIds,
    storageDeleteSuccessCount,
  };
}

export function createPhoto(input: TablesInsert<'photos'>) {
  return supabase
    .from('photos')
    .insert(input)
    .select()
    .single();
}

export function updatePhoto(photoId: string, patch: TablesUpdate<'photos'>) {
  return supabase
    .from('photos')
    .update(patch)
    .eq('id', photoId)
    .select()
    .single();
}
