import { supabase } from '@/lib/supabase';
import type { Json, Tables, TablesInsert, TablesUpdate } from '@/types/supabase';

export const PHOTO_STORAGE_BUCKET = 'photos';

export type PhotoRow = Tables<'photos'>;

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
    throw new Error('A Supabase session is required to upload a photo.');
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
  const response = await fetch(input.localUri);
  const fileData = await response.arrayBuffer();

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

  throwIfError(uploadError);
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

    throw insertError;
  }
}

export function listPhotosByPlace(placeId: string) {
  return supabase
    .from('photos')
    .select('*')
    .eq('place_id', placeId)
    .is('deleted_at', null)
    .order('taken_at', { ascending: true, nullsFirst: false });
}

export function listPhotosByTrip(tripId: string) {
  return supabase
    .from('photos')
    .select('*')
    .eq('trip_id', tripId)
    .is('deleted_at', null)
    .order('taken_at', { ascending: true, nullsFirst: false });
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

export function softDeletePhoto(photoId: string) {
  return updatePhoto(photoId, { deleted_at: new Date().toISOString() });
}
