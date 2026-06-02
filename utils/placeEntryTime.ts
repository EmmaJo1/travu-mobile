import type { ImagePickerAsset } from 'expo-image-picker';

export type PlaceEntryMeridiem = 'AM' | 'PM';

export interface PlaceEntryTime {
  hour: number;
  minute: number;
  meridiem: PlaceEntryMeridiem;
}

const PHOTO_TAKEN_AT_KEYS = [
  'DateTimeOriginal',
  'DateTimeDigitized',
  'DateTime',
  'datetimeOriginal',
  'datetimeDigitized',
  'datetime',
];

export const DEFAULT_PLACE_ENTRY_TIME: PlaceEntryTime = {
  hour: 3,
  minute: 0,
  meridiem: 'PM',
};

export function formatPlaceEntryTime(time: PlaceEntryTime): string {
  const minute = String(time.minute).padStart(2, '0');

  return time.minute === 0
    ? `${time.hour} ${time.meridiem}`
    : `${time.hour}:${minute} ${time.meridiem}`;
}

export function parsePlaceEntryTime(value?: string): PlaceEntryTime {
  const matched = value?.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);

  if (!matched) {
    return DEFAULT_PLACE_ENTRY_TIME;
  }

  return {
    hour: Number(matched[1]),
    minute: Number(matched[2] ?? 0),
    meridiem: matched[3].toUpperCase() as PlaceEntryMeridiem,
  };
}

export function convertDateToPlaceEntryTime(date: Date): PlaceEntryTime {
  const hour = date.getHours();

  return {
    hour: hour % 12 || 12,
    minute: date.getMinutes(),
    meridiem: hour >= 12 ? 'PM' : 'AM',
  };
}

function parseExifDate(value: unknown): Date | null {
  try {
    if (typeof value !== 'string') {
      return null;
    }

    const matched = value
      .trim()
      .match(/^(\d{4})[:-](\d{2})[:-](\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);

    if (!matched) {
      return null;
    }

    const date = new Date(
      Number(matched[1]),
      Number(matched[2]) - 1,
      Number(matched[3]),
      Number(matched[4]),
      Number(matched[5]),
      Number(matched[6] ?? 0),
    );

    return Number.isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

export function extractPhotoTakenAt(asset: ImagePickerAsset): Date | null {
  try {
    for (const key of PHOTO_TAKEN_AT_KEYS) {
      const date = parseExifDate(asset.exif?.[key]);

      if (date) {
        return date;
      }
    }

    return null;
  } catch {
    return null;
  }
}

export function getEarliestPhotoTakenAt(assets: ImagePickerAsset[]): Date | null {
  return assets.reduce<Date | null>((earliest, asset) => {
    const takenAt = extractPhotoTakenAt(asset);

    if (!takenAt || (earliest && earliest <= takenAt)) {
      return earliest;
    }

    return takenAt;
  }, null);
}
