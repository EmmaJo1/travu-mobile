import * as ImagePicker from 'expo-image-picker';

const PLACE_GROUPING_DISTANCE_THRESHOLD_METERS = 300;
const UNKNOWN_LOCATION_LABEL = '\uC704\uCE58 \uC815\uBCF4 \uC5C6\uB294 \uC0AC\uC9C4';
const LOCATED_PHOTO_LABEL = '\uC704\uCE58 \uC815\uBCF4 \uC788\uB294 \uC0AC\uC9C4';
const WEEKDAY_LABELS = ['\uC77C', '\uC6D4', '\uD654', '\uC218', '\uBAA9', '\uAE08', '\uD1A0'] as const;

export interface LocalDetectedPhoto {
  uri: string;
  width: number;
  height: number;
  takenAt: string;
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
  createdAt: string;
  photoCount: number;
  days: LocalDetectedTripDraftDay[];
}

type PickedPhotoAsset = ImagePicker.ImagePickerAsset;

const drafts = new Map<string, LocalDetectedTripDraft>();

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

function getAssetTakenDate(asset: PickedPhotoAsset, fallbackDate: Date): Date {
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
    exif.OffsetTimeOriginal,
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

function getAssetCoordinates(asset: PickedPhotoAsset): { latitude: number; longitude: number } | null {
  const exif = asset.exif ?? {};
  const runtimeAsset = asset as PickedPhotoAsset & {
    latitude?: number | string;
    longitude?: number | string;
  };
  const latitude = applyCoordinateRef(
    readCoordinateValue(runtimeAsset.latitude ?? exif.GPSLatitude ?? exif.Latitude),
    exif.GPSLatitudeRef,
  );
  const longitude = applyCoordinateRef(
    readCoordinateValue(runtimeAsset.longitude ?? exif.GPSLongitude ?? exif.Longitude),
    exif.GPSLongitudeRef,
  );

  if (latitude == null || longitude == null) {
    return null;
  }

  return { latitude, longitude };
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

function createPhoto(asset: PickedPhotoAsset, takenDate: Date): LocalDetectedPhoto {
  const coordinates = getAssetCoordinates(asset);

  return {
    height: asset.height,
    latitude: coordinates?.latitude,
    longitude: coordinates?.longitude,
    takenAt: takenDate.toISOString(),
    uri: asset.uri,
    width: asset.width,
  };
}

function createDraftId() {
  return `photo-draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createLocalDetectedTripDraftFromAssets(
  assets: PickedPhotoAsset[],
): LocalDetectedTripDraft | null {
  if (assets.length === 0) {
    return null;
  }

  const fallbackDate = new Date();
  const photos = assets
    .map((asset) => {
      const takenDate = getAssetTakenDate(asset, fallbackDate);
      return {
        dateKey: toDateKey(takenDate),
        photo: createPhoto(asset, takenDate),
        takenDate,
      };
    })
    .sort((left, right) => left.takenDate.getTime() - right.takenDate.getTime());
  const photosByDate = new Map<string, typeof photos>();

  for (const item of photos) {
    const current = photosByDate.get(item.dateKey) ?? [];
    current.push(item);
    photosByDate.set(item.dateKey, current);
  }

  const draftId = createDraftId();
  const days: LocalDetectedTripDraftDay[] = [...photosByDate.entries()]
    .sort(([leftDate], [rightDate]) => leftDate.localeCompare(rightDate))
    .map(([dateKey, dayPhotos], dayIndex) => {
      const firstDate = dayPhotos[0]?.takenDate ?? fallbackDate;
      const groups: LocalDetectedPlaceGroup[] = [];
      const noLocationPhotos: LocalDetectedPhoto[] = [];

      for (const item of dayPhotos) {
        const coordinates = item.photo.latitude != null && item.photo.longitude != null
          ? { latitude: item.photo.latitude, longitude: item.photo.longitude }
          : null;

        if (!coordinates) {
          noLocationPhotos.push(item.photo);
          continue;
        }

        const group = groups.find((candidate) => canJoinLocationGroup(candidate, coordinates));

        if (group) {
          group.photos.push(item.photo);
          group.photos.sort((left, right) => (
            new Date(left.takenAt).getTime() - new Date(right.takenAt).getTime()
          ));
          group.time = formatEntryTime(new Date(group.photos[0]?.takenAt ?? item.photo.takenAt));
          continue;
        }

        groups.push({
          dateKey,
          id: `${draftId}-${dateKey}-located-${groups.length + 1}`,
          label: LOCATED_PHOTO_LABEL,
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
          photos: [item.photo],
          time: formatEntryTime(item.takenDate),
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

  return {
    createdAt: new Date().toISOString(),
    days,
    id: draftId,
    photoCount: assets.length,
    source: 'photoLibrary',
  };
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

  const draft = createLocalDetectedTripDraftFromAssets(result.assets);

  if (!draft) {
    return null;
  }

  drafts.set(draft.id, draft);

  if (__DEV__) {
    console.info('[photo-import] selected photo draft created', {
      dayCount: draft.days.length,
      draftId: draft.id,
      groups: draft.days.map((day) => ({
        dateKey: day.dateKey,
        groupCount: day.groups.length,
        photoCount: day.photoCount,
      })),
      photoCount: draft.photoCount,
    });
  }

  return draft;
}

export function getLocalDetectedTripDraft(draftId?: string | null) {
  return draftId ? drafts.get(draftId) : undefined;
}
