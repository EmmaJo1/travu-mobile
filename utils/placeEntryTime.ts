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

export function buildVisitedAtIso(
  dateKey?: string | null,
  timeLabel?: string | null,
): string | null {
  const dateMatch = dateKey?.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const timeMatch = timeLabel?.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);

  if (!dateMatch || !timeMatch) {
    return null;
  }

  const year = Number(dateMatch[1]);
  const monthIndex = Number(dateMatch[2]) - 1;
  const day = Number(dateMatch[3]);
  const hour12 = Number(timeMatch[1]);
  const minute = Number(timeMatch[2] ?? 0);

  if (
    year < 1 ||
    monthIndex < 0 ||
    monthIndex > 11 ||
    day < 1 ||
    day > 31 ||
    hour12 < 1 ||
    hour12 > 12 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  const meridiem = timeMatch[3].toUpperCase() as PlaceEntryMeridiem;
  const hour = meridiem === 'AM' ? hour12 % 12 : (hour12 % 12) + 12;
  const localDate = new Date(year, monthIndex, day, hour, minute, 0, 0);

  if (
    localDate.getFullYear() !== year ||
    localDate.getMonth() !== monthIndex ||
    localDate.getDate() !== day ||
    localDate.getHours() !== hour ||
    localDate.getMinutes() !== minute
  ) {
    return null;
  }

  return localDate.toISOString();
}

export function formatLocalDateKeyFromTimestamp(
  value?: string | null,
): string | undefined {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

export function formatVisitedAtTimeLabel(value?: string | null): string | undefined {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return formatPlaceEntryTime(convertDateToPlaceEntryTime(date));
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
