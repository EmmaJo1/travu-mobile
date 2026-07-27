/**
 * record-day-detail
 * Figma: day-recording-detail (1207:2245)
 */
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type ImageSourcePropType,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import Text from '@/components/common/AppText';
import FullScreenImageViewer from '@/components/common/FullScreenImageViewer';
import StartTripSetupModal, {
  type StartTripSetupValue,
} from '@/components/home/StartTripSetupModal';
import MapPlaceholderCard from '@/components/common/MapPlaceholderCard';
import ScreenHeader from '@/components/nav/ScreenHeader';
import DaySelectorSheet, { type DaySelectorItem } from '@/components/record/DaySelectorSheet';
import PlaceCreateModal, {
  type PlaceCreateInput,
  type PlaceEntryDayOption,
  type PlaceEntryFormMode,
} from '@/components/record/PlaceCreateModal';
import PlaceEntryCard, { type PlaceEntry } from '@/components/trip/PlaceEntryCard';
import {
  getDaySelectorItemsForTrip,
  getDetectedTripById,
} from '@/constants/mockDetectedTrips';
import { MOCK_PHOTO_IMPORT_CANDIDATES } from '@/services/photoImport/mockPhotoImportProvider';
import {
  getLocalDetectedTripDraft,
  markLocalDetectedTripDraftSaveFailed,
  markLocalDetectedTripDraftSaved,
  markLocalDetectedTripDraftSaving,
  recordSavedDetectedTripDraft,
  type LocalDetectedTripDraft,
} from '@/services/photoImport/localDetectedTripDraftStore';
import {
  DetectedTripSaveError,
  getDetectedTripSaveUserMessage,
  saveDetectedTripDraftToSupabase,
  type DetectedTripPhotoSaveProgress,
} from '@/services/photoImport/saveDetectedTripDraft';
import type { PhotoImportTripCandidate } from '@/services/photoImport/types';
import {
  DEFAULT_RECORD_DAY,
  RECORD_DAY_ENTRIES,
  RECORD_DAY_OPTIONS,
} from '@/constants/mockRecordDayDetail';
import { RECORD_DAY_ENTRY_IMAGES } from '@/constants/recordTripImages';
import { addSavedCompletedTrip } from '@/constants/savedMyPageTrips';
import type { DestinationOption } from '@/constants/mockTripDestinations';
import { Colors, FontFamily, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { supabaseQueryKeys } from '@/hooks/supabaseQueryKeys';
import { useAuth } from '@/providers/AuthProvider';
import {
  isPlaceDetailDeleted,
  markPlaceDetailDeleted,
} from '@/services/placeDetailDeletionRegistry';
import { isSupabaseUuid } from '@/hooks/usePlaceDetailData';
import { useCreatePlaceRecord } from '@/hooks/useCreatePlaceRecord';
import { useDeletePlaceRecord } from '@/hooks/useDeletePlaceRecord';
import { useTripDayPlaces } from '@/hooks/useTripDayPlaces';
import { useTripDayRecords } from '@/hooks/useTripDayRecords';
import { useTripDays } from '@/hooks/useTripDays';
import { useUpdatePlaceRecord } from '@/hooks/useUpdatePlaceRecord';
import type { TripDayRow } from '@/services/supabase/tripDays';
import { mapSupabasePlacesToPlaceEntries } from '@/utils/supabasePlaceRecordMappers';

const ALL_DAYS_ID = 'all';
const DAY_FILTER_BG = '#F2F2F2';
const WEEKDAY_LABELS = ['\uC77C', '\uC6D4', '\uD654', '\uC218', '\uBAA9', '\uAE08', '\uD1A0'] as const;
const PLACE_GROUPING_TIME_THRESHOLD_MINUTES = 90;
const PLACE_GROUPING_DISTANCE_THRESHOLD_METERS = 300;
const LABEL_TRIP_INFO_EDIT = '\uC5EC\uD589 \uC815\uBCF4 \uC218\uC815';
const LABEL_DELETE_SELECTED_PHOTOS = '\uC120\uD0DD\uD55C \uC0AC\uC9C4\uC744 \uC0AD\uC81C\uD560\uAE4C\uC694?';
const LABEL_DELETE_PHOTO_DESCRIPTION = '\uC571\uC5D0\uC11C\uB9CC \uC0AD\uC81C\uB418\uBA70, \uAE30\uAE30\uC758 \uC6D0\uBCF8 \uC0AC\uC9C4\uC740 \uC720\uC9C0\uB429\uB2C8\uB2E4.';
const LABEL_DELETE = '\uC0AD\uC81C';
const LABEL_CANCEL = '\uCDE8\uC18C';
const LABEL_SAVE_DETECTED_TRIP = '\uC774 \uC5EC\uD589 \uC800\uC7A5\uD558\uAE30';
const LABEL_SAVING_DETECTED_TRIP = '\uC800\uC7A5\uD558\uACE0 \uC788\uC5B4\uC694';
const DETECTED_SAVE_BAR_HEIGHT = 48;

type PickedPhotoAsset = ImagePicker.ImagePickerAsset;
type PhotoPlaceGroup = {
  assets: PickedPhotoAsset[];
  coordinates: { latitude: number; longitude: number } | null;
  date: Date;
  dateKey: string;
};

function formatHeaderDate(day: DaySelectorItem): string {
  return `${day.dateLabel} ${day.weekdayLabel}`;
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

function parseDayDate(day: DaySelectorItem): Date | null {
  const matched = day.dateLabel.match(/^(\d{4})\.(\d{1,2})\.(\d{1,2})$/);

  if (!matched) {
    return null;
  }

  return new Date(Number(matched[1]), Number(matched[2]) - 1, Number(matched[3]));
}

function getDayDateKey(day: DaySelectorItem): string | null {
  const date = parseDayDate(day);
  return date ? toDateKey(date) : null;
}

function parseRouteDateKey(value?: string): Date | null {
  if (!value) {
    return null;
  }

  const matched = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!matched) {
    return null;
  }

  return new Date(Number(matched[1]), Number(matched[2]) - 1, Number(matched[3]));
}

function createDetectedTripDraftDays(
  startDate?: string,
  endDate?: string,
  totalPhotoCountValue?: string,
): DaySelectorItem[] {
  const start = parseRouteDateKey(startDate);
  const end = parseRouteDateKey(endDate) ?? start;
  const totalPhotoCount = Number(totalPhotoCountValue ?? 0);

  if (!start || !end) {
    return RECORD_DAY_OPTIONS;
  }

  const dayMs = 24 * 60 * 60 * 1000;
  const dayCount = Math.max(1, Math.round((end.getTime() - start.getTime()) / dayMs) + 1);

  return Array.from({ length: dayCount }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);

    return {
      id: `detected-draft-day-${index + 1}`,
      dayNumber: index + 1,
      dateLabel: formatDateLabel(date),
      weekdayLabel: WEEKDAY_LABELS[date.getDay()],
      photoCount: Number.isFinite(totalPhotoCount) ? Math.floor(totalPhotoCount / dayCount) : 0,
    };
  });
}

function createDetectedDraftDestination(
  detectedTripId?: string,
  cityName?: string,
  countryName?: string,
): DestinationOption | null {
  const city = cityName?.trim();

  if (!city) {
    return null;
  }

  const country = countryName?.trim() ?? '';

  return {
    id: `detected-${detectedTripId ?? city.toLowerCase().replace(/\s+/g, '-')}`,
    name: city,
    displayName: city,
    country,
    countryName: country,
    type: 'city',
    source: 'custom',
  };
}

function normalizeDetectedTripHeaderTitle(value?: string | null) {
  const rawTitle = value?.trim();

  if (!rawTitle) {
    return null;
  }

  if (rawTitle === '지역 확인 중') {
    return '지역 확인 중';
  }

  if (
    rawTitle === '지역 확인 중 여행' ||
    rawTitle === '지역 미확인 여행' ||
    rawTitle === '위치 기반 여행' ||
    rawTitle === '해외 여행' ||
    rawTitle === '사진첩 여행 후보' ||
    /^\d{4}\.\s?\d{1,2}\.\s?\d{1,2}/.test(rawTitle)
  ) {
    return '지역 미확인 여행';
  }

  const baseTitle = rawTitle
    .replace(/\s*여행\s*후보$/u, '')
    .replace(/\s*여행$/u, '')
    .trim();

  if (!baseTitle) {
    return null;
  }

  if (baseTitle.includes('서울')) {
    const neighborhood = baseTitle.match(/([가-힣]+동)/u)?.[1];
    const district = baseTitle.match(/([가-힣]+)구/u)?.[1];
    return `${neighborhood ?? district ?? '서울'} 여행`;
  }

  const metroCity = baseTitle.match(/(부산|대구|인천|광주|대전|울산)(?:광역시)?/u)?.[1];

  if (metroCity) {
    return `${metroCity} 여행`;
  }

  const cityOrCounty = baseTitle.match(/([가-힣]+)(?:시|군)/u)?.[1];

  if (cityOrCounty) {
    return `${cityOrCounty} 여행`;
  }

  if (/^[A-Za-z]/.test(baseTitle)) {
    const words = baseTitle.split(/\s+/);
    const titleCore = words[0] === 'Massa' && words[1] === 'Lubrense'
      ? 'Massa Lubrense'
      : words[0];

    return `${titleCore} 여행`;
  }

  return rawTitle.endsWith('여행') ? rawTitle : `${baseTitle} 여행`;
}

function isDetectedTripRoute(entryPoint?: string, mode?: string, tripId?: string) {
  return (
    entryPoint === 'detectedTrip' ||
    entryPoint === 'detectedTrips' ||
    entryPoint === 'detectedPhotoDraft' ||
    mode === 'create' ||
    Boolean(tripId && (getDetectedTripById(tripId) || getPhotoImportCandidateById(tripId)))
  );
}

function isExplicitMockRoute(entryPoint?: string, mode?: string, tripId?: string) {
  if (entryPoint === 'mock' || mode === 'mock') {
    return true;
  }

  return !tripId && !entryPoint && !mode;
}

function parseDetectedDateRange(dateRange?: string) {
  const normalized = dateRange?.replace(/\s+/g, '') ?? '';
  const singleDateMatched = normalized.match(/^(\d{4})\.(\d{1,2})\.(\d{1,2})$/);
  const matched = normalized.match(/^(\d{4})\.(\d{1,2})\.(\d{1,2})-(?:(\d{4})\.)?(\d{1,2})\.(\d{1,2})$/);

  const formatDateKey = (year: number, month: number, day: number) =>
    `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  if (singleDateMatched) {
    const dateKey = formatDateKey(
      Number(singleDateMatched[1]),
      Number(singleDateMatched[2]),
      Number(singleDateMatched[3]),
    );

    return { endDate: dateKey, startDate: dateKey };
  }

  if (!matched) {
    return { endDate: undefined, startDate: undefined };
  }

  const startYear = Number(matched[1]);
  const startMonth = Number(matched[2]);
  const startDay = Number(matched[3]);
  const endYear = Number(matched[4] ?? matched[1]);
  const endMonth = Number(matched[5]);
  const endDay = Number(matched[6]);

  return {
    endDate: formatDateKey(endYear, endMonth, endDay),
    startDate: formatDateKey(startYear, startMonth, startDay),
  };
}

function getPhotoImportCandidateById(tripId?: string) {
  return tripId ? MOCK_PHOTO_IMPORT_CANDIDATES.find((candidate) => candidate.id === tripId) : undefined;
}

function createDetectedTripDayOptionsFromCandidate(
  candidate: PhotoImportTripCandidate,
): DaySelectorItem[] {
  const { endDate, startDate } = parseDetectedDateRange(candidate.dateRange);

  if (!startDate || !endDate) {
    return [];
  }

  return createDetectedTripDraftDays(startDate, endDate, String(candidate.photoCount)).map((day) => ({
    ...day,
    id: `${candidate.id}-d${day.dayNumber}`,
  }));
}

function createLocalDetectedTripDayOptions(
  draft: LocalDetectedTripDraft,
): DaySelectorItem[] {
  return draft.days.map((day) => ({
    dateLabel: day.dateLabel,
    dayNumber: day.dayNumber,
    id: day.id,
    photoCount: day.photoCount,
    weekdayLabel: day.weekdayLabel,
  }));
}

function createDetectedTripEntries(
  tripId: string | undefined,
  days: DaySelectorItem[],
  selectedDay: DaySelectorItem,
  selectedFilterId: string,
): PlaceEntry[] {
  const photoImportCandidate = getPhotoImportCandidateById(tripId);
  const detectedTrip = tripId ? getDetectedTripById(tripId) : undefined;
  const city = photoImportCandidate?.city ?? detectedTrip?.title;
  const country = photoImportCandidate?.country;

  if (!city) {
    return [];
  }

  const targetDays = selectedFilterId === ALL_DAYS_ID ? days : [selectedDay];

  return targetDays.map((day) => ({
    category: '\uC0AC\uC9C4 \uBB36\uC74C',
    city,
    cityName: city,
    countryName: country,
    dataSource: 'detected',
    dateLabel: day.dateLabel,
    dayId: day.id,
    dayNumber: day.dayNumber,
    id: `${tripId ?? 'detected'}-${day.id}-entry`,
    photoCount: day.photoCount,
    photoSources: photoImportCandidate?.image
      ? [photoImportCandidate.image]
      : detectedTrip?.dayThumbnails?.[(day.dayNumber - 1) % detectedTrip.dayThumbnails.length]
        ? [detectedTrip.dayThumbnails[(day.dayNumber - 1) % detectedTrip.dayThumbnails.length]]
        : undefined,
    place: city,
    placeId: `${tripId ?? 'detected'}-${day.id}-place`,
    placeName: city,
    source: 'detected',
    time: '',
    tripId,
    weekdayLabel: day.weekdayLabel,
  }));
}

function createLocalDetectedTripEntries(
  draft: LocalDetectedTripDraft,
  selectedDay: DaySelectorItem,
  selectedFilterId: string,
): PlaceEntry[] {
  const targetDays = selectedFilterId === ALL_DAYS_ID
    ? draft.days
    : draft.days.filter((day) => day.id === selectedDay.id);

  return targetDays.flatMap((day) =>
    day.groups.map((group) => {
      const latitude = group.centroidLat ?? group.latitude;
      const longitude = group.centroidLng ?? group.longitude;
      const hasGroupCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude);

      return {
      dataSource: 'detected' as const,
      dateKey: day.dateKey,
      dateLabel: day.dateLabel,
      dayId: day.id,
      dayNumber: day.dayNumber,
      id: group.id,
      latitude,
      longitude,
      countryName: hasGroupCoordinates ? draft.debugMetadata.rawPlacemarkCountry : undefined,
      photoCount: group.photos.length,
      photoUris: group.photos
        .map((photo) => photo.previewUri ?? photo.displayUri)
        .filter((uri): uri is string => Boolean(uri)),
      place: group.label,
      placeId: group.id,
      placeName: group.label,
      source: 'detected' as const,
      time: group.time,
      tripId: draft.id,
      weekdayLabel: day.weekdayLabel,
      };
    }),
  );
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

  return null;
}

function getAssetCoordinates(asset: PickedPhotoAsset): { latitude: number; longitude: number } | null {
  const exif = asset.exif ?? {};
  const runtimeAsset = asset as PickedPhotoAsset & {
    latitude?: number | string;
    longitude?: number | string;
  };
  const latitude = readCoordinateValue(runtimeAsset.latitude ?? exif.GPSLatitude ?? exif.Latitude);
  const longitude = readCoordinateValue(runtimeAsset.longitude ?? exif.GPSLongitude ?? exif.Longitude);

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

function canAssetJoinPlaceGroup(
  group: PhotoPlaceGroup,
  takenDate: Date,
  coordinates: { latitude: number; longitude: number } | null,
) {
  if (group.dateKey !== toDateKey(takenDate)) {
    return false;
  }

  const timeDiffMinutes = Math.abs(takenDate.getTime() - group.date.getTime()) / 60000;

  if (timeDiffMinutes > PLACE_GROUPING_TIME_THRESHOLD_MINUTES) {
    return false;
  }

  if (group.coordinates && coordinates) {
    return getDistanceMeters(group.coordinates, coordinates) <= PLACE_GROUPING_DISTANCE_THRESHOLD_METERS;
  }

  return true;
}

function groupAssetsByPlaceVisit(
  assets: PickedPhotoAsset[],
  fallbackDay: DaySelectorItem,
): PhotoPlaceGroup[] {
  const fallbackDate = parseDayDate(fallbackDay) ?? new Date();
  const sortedAssets = assets
    .map((asset) => ({
      asset,
      coordinates: getAssetCoordinates(asset),
      takenDate: getAssetTakenDate(asset, fallbackDate),
    }))
    .sort((left, right) => left.takenDate.getTime() - right.takenDate.getTime());
  const groups: PhotoPlaceGroup[] = [];

  for (const item of sortedAssets) {
    const group = groups.find((candidate) =>
      canAssetJoinPlaceGroup(candidate, item.takenDate, item.coordinates),
    );

    if (group) {
      group.assets.push(item.asset);
      if (!group.coordinates && item.coordinates) {
        group.coordinates = item.coordinates;
      }
      continue;
    }

    groups.push({
      assets: [item.asset],
      coordinates: item.coordinates,
      date: item.takenDate,
      dateKey: toDateKey(item.takenDate),
    });
  }

  return groups;
}

function groupAssetsByTakenDate(
  assets: PickedPhotoAsset[],
  fallbackDay: DaySelectorItem,
): { date: Date; dateKey: string; assets: PickedPhotoAsset[] }[] {
  const fallbackDate = parseDayDate(fallbackDay) ?? new Date();
  const grouped = new Map<string, { date: Date; dateKey: string; assets: PickedPhotoAsset[] }>();

  for (const asset of assets) {
    const takenDate = getAssetTakenDate(asset, fallbackDate);
    const dateKey = toDateKey(takenDate);
    const group = grouped.get(dateKey);

    if (group) {
      group.assets.push(asset);
    } else {
      grouped.set(dateKey, { date: takenDate, dateKey, assets: [asset] });
    }
  }

  return [...grouped.values()].sort((left, right) => left.date.getTime() - right.date.getTime());
}

function mergeDayOptionsWithPhotoGroups(
  currentDays: DaySelectorItem[],
  photoGroups: { date: Date; dateKey: string; assets: PickedPhotoAsset[] }[],
): DaySelectorItem[] {
  const nextDaysByDate = new Map<string, DaySelectorItem>();

  for (const day of currentDays) {
    const dateKey = getDayDateKey(day);

    if (dateKey) {
      nextDaysByDate.set(dateKey, day);
    }
  }

  for (const group of photoGroups) {
    const currentDay = nextDaysByDate.get(group.dateKey);

    nextDaysByDate.set(group.dateKey, {
      id: currentDay?.id ?? `local-${group.dateKey}`,
      dayNumber: currentDay?.dayNumber ?? 0,
      dateLabel: currentDay?.dateLabel ?? formatDateLabel(group.date),
      weekdayLabel: currentDay?.weekdayLabel ?? WEEKDAY_LABELS[group.date.getDay()],
      photoCount: (currentDay?.photoCount ?? 0) + group.assets.length,
    });
  }

  return [...nextDaysByDate.entries()]
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([, day], index) => ({
      ...day,
      dayNumber: index + 1,
    }));
}

function toPlaceEntryDayOption(day: DaySelectorItem): PlaceEntryDayOption {
  return {
    id: day.id,
    dayNumber: day.dayNumber,
    dateLabel: day.dateLabel,
    weekdayLabel: day.weekdayLabel,
    photoCount: day.photoCount,
  };
}

function createRecordDayOptionFromTripDay(day: TripDayRow): DaySelectorItem {
  const date = parseRouteDateKey(day.date);

  return {
    id: day.id,
    dayNumber: day.day_index,
    dateLabel: date ? formatDateLabel(date) : day.date,
    weekdayLabel: date ? WEEKDAY_LABELS[date.getDay()] : '',
    photoCount: 0,
  };
}

function resolveDayForPlaceInput(
  currentDays: DaySelectorItem[],
  input: PlaceCreateInput,
  fallbackDay: DaySelectorItem,
): { dayOptions: DaySelectorItem[]; targetDay: DaySelectorItem } {
  const matchedById = input.dayId
    ? currentDays.find((day) => day.id === input.dayId)
    : undefined;

  if (matchedById) {
    return { dayOptions: currentDays, targetDay: matchedById };
  }

  const inputDate = input.dateKey ? parseRouteDateKey(input.dateKey) : null;

  if (!inputDate) {
    return { dayOptions: currentDays, targetDay: fallbackDay };
  }

  const inputDateKey = toDateKey(inputDate);
  const matchedByDate = currentDays.find((day) => getDayDateKey(day) === inputDateKey);

  if (matchedByDate) {
    return { dayOptions: currentDays, targetDay: matchedByDate };
  }

  const nextDayOptions = mergeDayOptionsWithPhotoGroups(currentDays, [
    {
      assets: [],
      date: inputDate,
      dateKey: inputDateKey,
    },
  ]);
  const targetDay = nextDayOptions.find((day) => getDayDateKey(day) === inputDateKey) ?? fallbackDay;

  return { dayOptions: nextDayOptions, targetDay };
}

function getTimeSortValue(time?: string): number {
  const matched = time?.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);

  if (!matched) {
    return Number.POSITIVE_INFINITY;
  }

  const hour = Number(matched[1]) % 12;
  const minute = Number(matched[2] ?? '0');
  const periodOffset = matched[3].toUpperCase() === 'PM' ? 12 * 60 : 0;

  return periodOffset + hour * 60 + minute;
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

function getEntryPlaceId(entry: PlaceEntry): string {
  return entry.placeId ?? entry.googlePlaceId ?? entry.id;
}

function getLocalEntryDeletionKey(
  tripId: string | undefined,
  day: DaySelectorItem,
  entry: PlaceEntry,
  index: number,
) {
  return [
    tripId ?? 'record-trip',
    day.id || getDayDateKey(day) || day.dayNumber,
    entry.id || getEntryPlaceId(entry),
    index,
  ].join(':');
}

function createPhotoEntry(
  dayId: string,
  date: Date,
  photoUris: string[],
  sourceEntry?: PlaceEntry,
): PlaceEntry {
  return {
    id: `photo-import-${dayId}-${date.getTime()}`,
    time: formatEntryTime(date),
    place: sourceEntry?.place ?? sourceEntry?.placeName ?? '\uCD94\uAC00\uD55C \uC0AC\uC9C4',
    placeName: sourceEntry?.placeName,
    category: sourceEntry?.category ?? '\uC0AC\uC9C4',
    city: sourceEntry?.city,
    cityName: sourceEntry?.cityName,
    countryCode: sourceEntry?.countryCode,
    countryName: sourceEntry?.countryName,
    googlePlaceId: sourceEntry?.googlePlaceId,
    photoUris,
  };
}

function getPhotoSources(entry: PlaceEntry | null): ImageSourcePropType[] {
  if (!entry) {
    return [];
  }

  return [
    ...(entry.photoSources ?? []),
    ...(entry.photoUris ?? []).map((uri) => ({ uri })),
  ];
}

function getDetectedSaveErrorInfo(error: unknown) {
  if (error instanceof DetectedTripSaveError) {
    return {
      errorCode: error.code,
      errorMessage: error.message,
      errorName: error.name,
      errorStage: error.stage,
      originalSupabaseCode: error.originalSupabaseCode,
      rollbackAttempted: error.rollbackAttempted,
      rollbackSucceeded: error.rollbackSucceeded,
    };
  }

  return {
    errorCode: typeof error === 'object' && error && 'code' in error ? String(error.code) : undefined,
    errorMessage: error instanceof Error ? error.message : String(error),
    errorName: error instanceof Error ? error.name : typeof error,
    errorStage: undefined,
    originalSupabaseCode: undefined,
    rollbackAttempted: undefined,
    rollbackSucceeded: undefined,
  };
}

function createDetectedTripSaveAttemptId(draftId?: string | null) {
  return `detected-save-${draftId ?? 'missing'}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function deleteEntryPhotoIndexes(entry: PlaceEntry, indexes: number[]): PlaceEntry {
  const indexSet = new Set(indexes);
  const sourceCount = entry.photoSources?.length ?? 0;

  return {
    ...entry,
    photoSources: entry.photoSources?.filter((_, index) => !indexSet.has(index)),
    photoUris: entry.photoUris?.filter((_, index) => !indexSet.has(sourceCount + index)),
  };
}

function createDayOptionsFromDateRange(
  startDateKey: string,
  endDateKey: string,
  currentDays: DaySelectorItem[],
): DaySelectorItem[] {
  const startDate = new Date(`${startDateKey}T00:00:00`);
  const endDate = new Date(`${endDateKey}T00:00:00`);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return currentDays;
  }

  const currentByDate = new Map<string, DaySelectorItem>();
  currentDays.forEach((day) => {
    const dateKey = getDayDateKey(day);

    if (dateKey) {
      currentByDate.set(dateKey, day);
    }
  });

  const days: DaySelectorItem[] = [];
  const cursor = new Date(startDate);

  while (cursor.getTime() <= endDate.getTime()) {
    const dateKey = toDateKey(cursor);
    const currentDay = currentByDate.get(dateKey);

    days.push({
      id: currentDay?.id ?? `local-${dateKey}`,
      dayNumber: days.length + 1,
      dateLabel: formatDateLabel(cursor),
      weekdayLabel: WEEKDAY_LABELS[cursor.getDay()],
      photoCount: currentDay?.photoCount ?? 0,
    });

    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
}

function createDestinationFromEntries(entries: PlaceEntry[]): DestinationOption | null {
  const entry = entries.find((item) => item.cityName || item.city || item.placeName || item.place);

  if (!entry) {
    return null;
  }

  const name = entry.cityName ?? entry.city ?? entry.placeName ?? entry.place;
  const country = entry.countryName ?? '';

  return {
    id: `record-${name.toLowerCase().replace(/\s+/g, '-')}`,
    name,
    displayName: name,
    country,
    countryName: country,
    type: 'city',
    source: 'custom',
  };
}

function createTripSetupInitialValue(
  days: DaySelectorItem[],
  entries: PlaceEntry[],
): StartTripSetupValue {
  const firstDay = days[0] ?? DEFAULT_RECORD_DAY;
  const lastDay = days[days.length - 1] ?? firstDay;
  const startDate = getDayDateKey(firstDay) ?? '2025-03-04';
  const endDate = getDayDateKey(lastDay) ?? startDate;
  const destination = createDestinationFromEntries(entries);

  return {
    countryName: destination?.countryName ?? '',
    destinationName: destination?.displayName ?? '',
    destinations: destination ? [destination] : [],
    endDate,
    isEndDateUndecided: false,
    startDate,
    visitedCities: destination ? [destination.displayName] : [],
    visitedCountries: destination?.countryName ? [destination.countryName] : [],
  };
}

function getEntryPhotoUrisParam(entry: PlaceEntry): string | undefined {
  if (!entry.photoUris?.length) {
    return undefined;
  }

  return JSON.stringify(entry.photoUris);
}


function parseUpdatedPhotoUris(value?: string | string[]): string[] {
  const rawValue = Array.isArray(value) ? value[0] : value;

  if (!rawValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed)
      ? parsed.filter((uri): uri is string => typeof uri === 'string' && uri.length > 0)
      : [];
  } catch {
    return [];
  }
}

function parseNumberArrayParam(value?: string | string[]): number[] {
  const rawValue = Array.isArray(value) ? value[0] : value;

  if (!rawValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is number => Number.isInteger(item) && item >= 0)
      : [];
  } catch {
    return [];
  }
}

function readRouteParam(value?: string | string[]): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function resolveInitialDay(
  dayOptions: DaySelectorItem[],
  dayId?: string,
): DaySelectorItem {
  if (dayId) {
    const matched = dayOptions.find((day) => day.id === dayId);
    if (matched) {
      return matched;
    }
  }

  return dayOptions[0] ?? DEFAULT_RECORD_DAY;
}

interface DayFilterBarProps {
  days: DaySelectorItem[];
  selectedId: string;
  onSelectAll: () => void;
  onSelectDay: (day: DaySelectorItem) => void;
}

function getDayChipLabel(day: DaySelectorItem, days: DaySelectorItem[]) {
  const parsedDate = parseDayDate(day);

  if (!parsedDate) {
    return `${day.dayNumber}\uC77C\uCC28`;
  }

  const years = new Set(
    days
      .map(parseDayDate)
      .filter((date): date is Date => Boolean(date))
      .map((date) => date.getFullYear()),
  );
  const datePrefix = years.size > 1
    ? `${String(parsedDate.getFullYear()).slice(2)}.${parsedDate.getMonth() + 1}.${parsedDate.getDate()}`
    : `${parsedDate.getMonth() + 1}.${parsedDate.getDate()}`;

  return `${datePrefix} ${day.weekdayLabel}`.trim();
}

function DayFilterBar({ days, selectedId, onSelectAll, onSelectDay }: DayFilterBarProps) {
  const [hasScrolledDays, setHasScrolledDays] = useState(false);

  return (
    <View style={styles.dayFilterBar}>
      <Pressable accessibilityRole="button" onPress={onSelectAll} style={styles.allChip}>
        <Text style={styles.allChipText}>전체</Text>
        <Feather name="chevron-down" size={10} color={Colors.foundation.black} />
      </Pressable>

      <View style={styles.dayChipViewport}>
        <ScrollView
          horizontal
          onScroll={(event) => {
            const nextHasScrolledDays = event.nativeEvent.contentOffset.x > 1;
            setHasScrolledDays((current) =>
              current === nextHasScrolledDays ? current : nextHasScrolledDays,
            );
          }}
          scrollEventThrottle={16}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dayChipContent}
        >
          {days.map((day) => {
            const selected = selectedId === day.id;
            return (
              <Pressable
                accessibilityRole="button"
                key={day.id}
                onPress={() => onSelectDay(day)}
                style={[styles.dayChip, selected && styles.dayChipSelected]}
              >
                <Text style={[styles.dayChipText, selected && styles.dayChipTextSelected]}>
                  {getDayChipLabel(day, days)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <LinearGradient
          pointerEvents="none"
          colors={[DAY_FILTER_BG, 'rgba(242, 242, 242, 0)']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={[styles.dayChipFade, !hasScrolledDays && styles.dayChipFadeHidden]}
        />
      </View>
    </View>
  );
}

export default function RecordDayDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { canUseSupabaseUserData, user } = useAuth();
  const { width } = useWindowDimensions();
  const routeParams = useLocalSearchParams<{
    tripId?: string | string[];
    dayId?: string | string[];
    tripDayId?: string | string[];
    date?: string | string[];
    dayIndex?: string | string[];
    updatedPlaceId?: string | string[];
    updatedPhotoUris?: string | string[];
    deletedSourceIndexes?: string | string[];
    entryPoint?: string | string[];
    mode?: string | string[];
    detectedTripId?: string | string[];
    cityName?: string | string[];
    displayTitle?: string | string[];
    countryName?: string | string[];
    startDate?: string | string[];
    endDate?: string | string[];
    photoCount?: string | string[];
    tripTitle?: string | string[];
  }>();
  const tripId = readRouteParam(routeParams.tripId);
  const dayId = readRouteParam(routeParams.dayId);
  const tripDayId = readRouteParam(routeParams.tripDayId);
  const date = readRouteParam(routeParams.date);
  const dayIndex = readRouteParam(routeParams.dayIndex);
  const updatedPlaceId = readRouteParam(routeParams.updatedPlaceId);
  const updatedPhotoUris = readRouteParam(routeParams.updatedPhotoUris);
  const deletedSourceIndexes = readRouteParam(routeParams.deletedSourceIndexes);
  const entryPoint = readRouteParam(routeParams.entryPoint);
  const mode = readRouteParam(routeParams.mode);
  const detectedTripId = readRouteParam(routeParams.detectedTripId);
  const cityName = readRouteParam(routeParams.cityName);
  const displayTitle = readRouteParam(routeParams.displayTitle);
  const countryName = readRouteParam(routeParams.countryName);
  const startDate = readRouteParam(routeParams.startDate);
  const endDate = readRouteParam(routeParams.endDate);
  const photoCount = readRouteParam(routeParams.photoCount);
  const tripTitle = readRouteParam(routeParams.tripTitle);
  const routeTripId = tripId;
  const routeTripDayId = tripDayId ?? dayId;
  const routeLocalDetectedTripDraft = useMemo(
    () => getLocalDetectedTripDraft(routeTripId),
    [routeTripId],
  );
  const [localDetectedTripDraft, setLocalDetectedTripDraft] =
    useState<LocalDetectedTripDraft | undefined>(() => routeLocalDetectedTripDraft);
  const isLocalDetectedPhotoDraftRoute = entryPoint === 'detectedPhotoDraft';
  const isDetectedTripPreviewRoute = isDetectedTripRoute(entryPoint, mode, routeTripId);
  const isExplicitMockRecordRoute = isExplicitMockRoute(entryPoint, mode, routeTripId);
  const isSupabaseTripRoute = isSupabaseUuid(routeTripId);
  const isSupabaseTripDayRoute = isSupabaseUuid(routeTripDayId);
  const shouldUseSupabaseRecordDay = isSupabaseTripRoute || isSupabaseTripDayRoute;
  const createPlaceRecordMutation = useCreatePlaceRecord();
  const deletePlaceRecordMutation = useDeletePlaceRecord();
  const updatePlaceRecordMutation = useUpdatePlaceRecord();
  const { data: supabaseTripDays } = useTripDays(isSupabaseTripRoute ? routeTripId : undefined);

  useEffect(() => {
    setLocalDetectedTripDraft(routeLocalDetectedTripDraft);
  }, [routeLocalDetectedTripDraft]);

  useEffect(() => {
    setDetectedTripSaveStatus(localDetectedTripDraft?.saveStatus ?? 'idle');
  }, [localDetectedTripDraft?.saveStatus]);

  useEffect(() => {
    if (!__DEV__) {
      return;
    }

    console.log('[record-day-detail params]', {
      cityName,
      countryName,
      date,
      dayId,
      dayIndex,
      detectedTripId,
      entryPoint,
      isDetectedTripRoute: isDetectedTripPreviewRoute,
      isExplicitMockRoute: isExplicitMockRecordRoute,
      isSupabaseRoute: shouldUseSupabaseRecordDay,
      isSupabaseTrip: isSupabaseTripRoute,
      isSupabaseTripDay: isSupabaseTripDayRoute,
      mode,
      photoCount,
      localDetectedDraftId: localDetectedTripDraft?.id,
      localDetectedPhotoCount: localDetectedTripDraft?.photoCount,
      isLocalDetectedPhotoDraftRoute,
      routeTripDayId,
      tripDayId,
      tripId,
    });
  }, [
    cityName,
    countryName,
    date,
    dayId,
    dayIndex,
    detectedTripId,
    entryPoint,
    isDetectedTripPreviewRoute,
    isExplicitMockRecordRoute,
    isLocalDetectedPhotoDraftRoute,
    localDetectedTripDraft?.id,
    localDetectedTripDraft?.photoCount,
    isSupabaseTripDayRoute,
    isSupabaseTripRoute,
    mode,
    photoCount,
    routeTripDayId,
    shouldUseSupabaseRecordDay,
    tripDayId,
    tripId,
  ]);

  const baseDayOptions = useMemo(() => {
    if (shouldUseSupabaseRecordDay) {
      const tripDayOptions = (supabaseTripDays ?? []).map(createRecordDayOptionFromTripDay);

      if (tripDayOptions.length > 0) {
        return tripDayOptions;
      }

      if (isSupabaseUuid(routeTripDayId)) {
        const routeDate = parseRouteDateKey(date ?? '');
        const routeDayNumber = Number(dayIndex);

        return [
          {
            id: routeTripDayId,
            dayNumber: Number.isFinite(routeDayNumber) && routeDayNumber > 0 ? routeDayNumber : 1,
            dateLabel: routeDate ? formatDateLabel(routeDate) : date ?? '',
            weekdayLabel: routeDate ? WEEKDAY_LABELS[routeDate.getDay()] : '',
            photoCount: 0,
          },
        ];
      }

      return [];
    }

    if (isDetectedTripPreviewRoute) {
      if (localDetectedTripDraft) {
        return createLocalDetectedTripDayOptions(localDetectedTripDraft);
      }

      if (isLocalDetectedPhotoDraftRoute) {
        return [];
      }

      const photoImportCandidate = getPhotoImportCandidateById(routeTripId);
      const detectedTripDays = routeTripId ? getDaySelectorItemsForTrip(routeTripId) : undefined;

      if (photoImportCandidate) {
        return createDetectedTripDayOptionsFromCandidate(photoImportCandidate);
      }

      if (detectedTripDays) {
        return detectedTripDays;
      }

      return createDetectedTripDraftDays(startDate, endDate, photoCount);
    }

    if (isExplicitMockRecordRoute && routeTripId) {
      return getDaySelectorItemsForTrip(routeTripId) ?? RECORD_DAY_OPTIONS;
    }
    return isExplicitMockRecordRoute ? RECORD_DAY_OPTIONS : [];
  }, [
    endDate,
    isDetectedTripPreviewRoute,
    isExplicitMockRecordRoute,
    isLocalDetectedPhotoDraftRoute,
    date,
    dayIndex,
    photoCount,
    localDetectedTripDraft,
    routeTripDayId,
    routeTripId,
    shouldUseSupabaseRecordDay,
    startDate,
    supabaseTripDays,
  ]);

  const [dayOptions, setDayOptions] = useState<DaySelectorItem[]>(() => baseDayOptions);
  const [selectedDay, setSelectedDay] = useState<DaySelectorItem>(() =>
    resolveInitialDay(baseDayOptions, routeTripDayId),
  );
  const [selectedFilterId, setSelectedFilterId] = useState<string>(() =>
    resolveInitialDay(baseDayOptions, routeTripDayId).id,
  );
  const [daySheetVisible, setDaySheetVisible] = useState(false);
  const [headerMenuVisible, setHeaderMenuVisible] = useState(false);
  const [placeEntryModalVisible, setPlaceEntryModalVisible] = useState(false);
  const [placeEntryFormMode, setPlaceEntryFormMode] =
    useState<PlaceEntryFormMode>('create');
  const [editingEntry, setEditingEntry] = useState<PlaceEntry | null>(null);
  const [entriesByDay, setEntriesByDay] = useState<Record<string, PlaceEntry[]>>({});
  const [deletedLocalEntryKeys, setDeletedLocalEntryKeys] = useState<Set<string>>(() => new Set());
  const [photoGridEntry, setPhotoGridEntry] = useState<PlaceEntry | null>(null);
  const [isPhotoGridSelectionMode, setPhotoGridSelectionMode] = useState(false);
  const [selectedPhotoIndexes, setSelectedPhotoIndexes] = useState<number[]>([]);
  const [photoViewerIndex, setPhotoViewerIndex] = useState<number | null>(null);
  const [detectedTripSaveStatus, setDetectedTripSaveStatus] =
    useState<'idle' | 'saving' | 'saved' | 'failed'>('idle');
  const [detectedTripPhotoSaveProgress, setDetectedTripPhotoSaveProgress] =
    useState<DetectedTripPhotoSaveProgress>();
  const [, setPendingDeletePhoto] = useState<{
    entry: PlaceEntry;
    photoIndex: number;
  } | null>(null);
  const [tripInfoModalVisible, setTripInfoModalVisible] = useState(false);
  const selectedSupabaseTripDayId = shouldUseSupabaseRecordDay && isSupabaseUuid(selectedDay.id)
    ? selectedDay.id
    : isSupabaseTripDayRoute
      ? routeTripDayId
      : null;
  const { data: supabasePlaces } = useTripDayPlaces(selectedSupabaseTripDayId);
  const { data: supabaseRecords } = useTripDayRecords(selectedSupabaseTripDayId);

  useEffect(() => {
    setDayOptions(baseDayOptions);
    const initialDay = resolveInitialDay(baseDayOptions, routeTripDayId);
    setSelectedDay(initialDay);
    setSelectedFilterId(initialDay.id);
  }, [baseDayOptions, routeTripDayId]);

  useEffect(() => {
    const nextPhotoUris = parseUpdatedPhotoUris(updatedPhotoUris);
    const nextDeletedSourceIndexes = parseNumberArrayParam(deletedSourceIndexes);

    if (shouldUseSupabaseRecordDay) {
      return;
    }

    if (!updatedPlaceId || (nextPhotoUris.length === 0 && nextDeletedSourceIndexes.length === 0)) {
      return;
    }

    const targetDayId = dayId ?? selectedDay.id;

    setEntriesByDay((current) => {
      const dayEntries = current[targetDayId] ?? (isDetectedTripPreviewRoute ? [] : RECORD_DAY_ENTRIES);
      let didUpdate = false;
      const nextDayEntries = dayEntries.map((entry) => {
        if (getEntryPlaceId(entry) !== updatedPlaceId) {
          return entry;
        }

        const deletedSourceIndexSet = new Set(nextDeletedSourceIndexes);
        const originalEntry = RECORD_DAY_ENTRIES.find((item) => getEntryPlaceId(item) === getEntryPlaceId(entry));
        const originalPhotoSources = originalEntry?.photoSources ?? [];
        didUpdate = true;

        return {
          ...entry,
          photoSources: entry.photoSources?.filter((source, index) => {
            const originalIndex = originalPhotoSources.findIndex((originalSource) => originalSource === source);
            return !deletedSourceIndexSet.has(originalIndex >= 0 ? originalIndex : index);
          }),
          photoUris: nextPhotoUris,
        };
      });

      if (!didUpdate) {
        return current;
      }

      return {
        ...current,
        [targetDayId]: nextDayEntries,
      };
    });
  }, [
    dayId,
    deletedSourceIndexes,
    isDetectedTripPreviewRoute,
    selectedDay.id,
    shouldUseSupabaseRecordDay,
    updatedPhotoUris,
    updatedPlaceId,
  ]);

  const supabaseEntries = useMemo(() => {
    if (!shouldUseSupabaseRecordDay) {
      return [];
    }

    return mapSupabasePlacesToPlaceEntries(
      supabasePlaces ?? [],
      supabaseRecords ?? [],
    ).filter((entry) => !isPlaceDetailDeleted(getEntryPlaceId(entry))).sort(
      (left, right) => getTimeSortValue(left.time) - getTimeSortValue(right.time),
    );
  }, [
    shouldUseSupabaseRecordDay,
    supabasePlaces,
    supabaseRecords,
  ]);

  const detectedTripEntries = useMemo(() => {
    if (!isDetectedTripPreviewRoute || shouldUseSupabaseRecordDay) {
      return [];
    }

    if (isLocalDetectedPhotoDraftRoute && !localDetectedTripDraft) {
      return [];
    }

    const baseDetectedEntries = localDetectedTripDraft
      ? createLocalDetectedTripEntries(
        localDetectedTripDraft,
        selectedDay,
        selectedFilterId,
      )
      : createDetectedTripEntries(
        routeTripId,
        dayOptions,
        selectedDay,
        selectedFilterId,
      );
    const addedDetectedEntries = selectedFilterId === ALL_DAYS_ID
      ? dayOptions.flatMap((day) => entriesByDay[day.id] ?? [])
      : entriesByDay[selectedDay.id] ?? [];

    return [...baseDetectedEntries, ...addedDetectedEntries].filter((entry, index) => (
      !deletedLocalEntryKeys.has(getLocalEntryDeletionKey(
        routeTripId,
        dayOptions.find((day) => day.id === entry.dayId) ?? selectedDay,
        entry,
        index,
      ))
    ));
  }, [
    dayOptions,
    deletedLocalEntryKeys,
    entriesByDay,
    isDetectedTripPreviewRoute,
    isLocalDetectedPhotoDraftRoute,
    localDetectedTripDraft,
    routeTripId,
    selectedDay,
    selectedFilterId,
    shouldUseSupabaseRecordDay,
  ]);

  const localEntries = useMemo(() => {
    if (shouldUseSupabaseRecordDay || isDetectedTripPreviewRoute || !isExplicitMockRecordRoute) {
      return [];
    }

    const filteredLocalEntries = selectedFilterId === ALL_DAYS_ID
      ? dayOptions.flatMap((day) =>
        (entriesByDay[day.id] ?? RECORD_DAY_ENTRIES).filter(
          (entry, index) => !deletedLocalEntryKeys.has(getLocalEntryDeletionKey(routeTripId, day, entry, index)),
        ),
      )
      : (entriesByDay[selectedDay.id] ?? RECORD_DAY_ENTRIES).filter(
        (entry, index) => !deletedLocalEntryKeys.has(getLocalEntryDeletionKey(routeTripId, selectedDay, entry, index)),
      );

    return filteredLocalEntries.sort(
      (left, right) => getTimeSortValue(left.time) - getTimeSortValue(right.time),
    );
  }, [
    dayOptions,
    deletedLocalEntryKeys,
    entriesByDay,
    isDetectedTripPreviewRoute,
    isExplicitMockRecordRoute,
    routeTripId,
    selectedDay,
    selectedFilterId,
    shouldUseSupabaseRecordDay,
  ]);

  const selectedDataSource = shouldUseSupabaseRecordDay
    ? 'supabase'
    : isDetectedTripPreviewRoute
      ? 'detected'
      : isExplicitMockRecordRoute
        ? 'mock'
        : 'empty';
  const entries = useMemo(() => {
    if (selectedDataSource === 'supabase') {
      return supabaseEntries;
    }

    if (selectedDataSource === 'detected') {
      return detectedTripEntries;
    }

    if (selectedDataSource === 'mock') {
      return localEntries;
    }

    return [];
  }, [
    detectedTripEntries,
    localEntries,
    selectedDataSource,
    supabaseEntries,
  ]);

  useEffect(() => {
    if (!__DEV__) {
      return;
    }

    const mockLeakedIntoSupabaseRoute = shouldUseSupabaseRecordDay && entries.some((entry) => (
      entry.dataSource !== 'supabase' || !entry.placeId || !isSupabaseUuid(entry.placeId)
    ));

    console.log('[record-day-detail entries]', {
      finalEntries: entries.length,
      finalEntryIds: entries.map((entry) => ({
        dataSource: entry.dataSource,
        id: entry.id,
        placeId: entry.placeId,
        placeName: entry.placeName ?? entry.place,
      })),
      isSupabaseRoute: shouldUseSupabaseRecordDay,
      isDetectedTripRoute: isDetectedTripPreviewRoute,
      isExplicitMockRoute: isExplicitMockRecordRoute,
      selectedDataSource,
      detectedTripEntries: detectedTripEntries.length,
      localEntries: localEntries.length,
      selectedFilterId,
      selectedTripDayId: selectedSupabaseTripDayId,
      supabasePlaces: supabasePlaces?.length ?? 0,
      supabaseRecords: supabaseRecords?.length ?? 0,
      supabaseEntries: supabaseEntries.length,
    });

    if (mockLeakedIntoSupabaseRoute) {
      console.warn('[record-day-detail] mock entries leaked into Supabase route', {
        entries,
        routeTripDayId,
        routeTripId,
        selectedFilterId,
      });
    }
  }, [
    entries,
    detectedTripEntries.length,
    isDetectedTripPreviewRoute,
    isExplicitMockRecordRoute,
    localEntries.length,
    routeTripDayId,
    routeTripId,
    selectedFilterId,
    selectedSupabaseTripDayId,
    selectedDataSource,
    shouldUseSupabaseRecordDay,
    supabasePlaces,
    supabaseRecords,
    supabaseEntries.length,
  ]);
  const tripInfoInitialValue = useMemo(
    () => {
      const initialValue = createTripSetupInitialValue(dayOptions, entries);

      if (!isDetectedTripPreviewRoute) {
        return initialValue;
      }

      const destination = createDetectedDraftDestination(detectedTripId, cityName, countryName);

      return {
        ...initialValue,
        countryName: destination?.countryName ?? '',
        destinationName: destination?.displayName ?? '',
        destinations: destination ? [destination] : [],
        endDate: endDate || initialValue.endDate,
        startDate: startDate || initialValue.startDate,
        visitedCities: destination ? [destination.displayName] : [],
        visitedCountries: destination?.countryName ? [destination.countryName] : [],
      };
    },
    [
      cityName,
      countryName,
      dayOptions,
      detectedTripId,
      endDate,
      entries,
      isDetectedTripPreviewRoute,
      startDate,
    ],
  );
  const photoGridSources = useMemo(() => getPhotoSources(photoGridEntry), [photoGridEntry]);
  useEffect(() => {
    if (photoViewerIndex == null) {
      return;
    }

    if (photoGridSources.length === 0) {
      setPhotoViewerIndex(null);
      return;
    }

    if (photoViewerIndex > photoGridSources.length - 1) {
      setPhotoViewerIndex(photoGridSources.length - 1);
    }
  }, [photoGridSources.length, photoViewerIndex]);

  const headerTitleInfo = useMemo(() => {
    const dateHeaderTitle = formatHeaderDate(selectedDay);
    const isDetectedHeaderRoute =
      !shouldUseSupabaseRecordDay &&
      (
        entryPoint === 'detectedTrips' ||
        entryPoint === 'detectedPhotoDraft' ||
        Boolean(localDetectedTripDraft)
      );

    if (!isDetectedHeaderRoute) {
      return {
        source: 'date',
        title: dateHeaderTitle,
      };
    }

    const titleCandidates = [
      { source: 'localDetectedDraftDisplayTitle', value: localDetectedTripDraft?.displayTitle },
      { source: 'localDetectedDraftTitle', value: localDetectedTripDraft?.title },
      { source: 'localDetectedDraftLocationLabel', value: localDetectedTripDraft?.locationLabel },
      { source: 'routeDisplayTitle', value: displayTitle },
      { source: 'routeTripTitle', value: tripTitle },
      { source: 'routeCityName', value: cityName },
    ];

    for (const candidate of titleCandidates) {
      const title = normalizeDetectedTripHeaderTitle(candidate.value);

      if (title) {
        return {
          source: candidate.source,
          title,
        };
      }
    }

    return {
      source: 'pendingLocation',
      title: '지역 확인 중',
    };
  }, [
    cityName,
    displayTitle,
    entryPoint,
    localDetectedTripDraft,
    selectedDay,
    shouldUseSupabaseRecordDay,
    tripTitle,
  ]);

  useEffect(() => {
    if (!__DEV__) {
      return;
    }

    console.info('[record-day-detail header title]', {
      headerTitleAfter: headerTitleInfo.title,
      headerTitleBefore: formatHeaderDate(selectedDay),
      headerTitleSource: headerTitleInfo.source,
      isDetectedTripRoute: isDetectedTripPreviewRoute,
      localDetectedDraftDisplayTitle: localDetectedTripDraft?.displayTitle,
      localDetectedDraftTitle: localDetectedTripDraft?.title,
      routeCityName: cityName,
    });
  }, [
    cityName,
    headerTitleInfo.source,
    headerTitleInfo.title,
    isDetectedTripPreviewRoute,
    localDetectedTripDraft?.displayTitle,
    localDetectedTripDraft?.title,
    selectedDay,
  ]);

  const handleClosePlaceEntryModal = () => {
    setPlaceEntryModalVisible(false);
    setPlaceEntryFormMode('create');
    setEditingEntry(null);
  };

  const handleOpenCreate = () => {
    setHeaderMenuVisible(false);
    setEditingEntry(null);
    setPlaceEntryFormMode('create');
    setPlaceEntryModalVisible(true);
  };

  const handleOpenEditEntry = (entry: PlaceEntry) => {
    setEditingEntry(entry);
    setPlaceEntryFormMode('edit');
    setPlaceEntryModalVisible(true);
  };

  const updateEntryPhotos = (targetEntry: PlaceEntry, photoIndexes: number[]) => {
    if (photoIndexes.length === 0) {
      return;
    }

    setEntriesByDay((current) => {
      const nextEntriesByDay = { ...current };
      let didUpdate = false;

      for (const day of dayOptions) {
        const dayEntries = nextEntriesByDay[day.id]
          ?? (day.id === selectedDay.id ? RECORD_DAY_ENTRIES : undefined);

        if (!dayEntries) {
          continue;
        }

        let didUpdateDay = false;
        const nextDayEntries = dayEntries.map((entry) => {
          if (entry.id !== targetEntry.id) {
            return entry;
          }

          didUpdateDay = true;
          return deleteEntryPhotoIndexes(entry, photoIndexes);
        });

        if (didUpdateDay) {
          didUpdate = true;
          nextEntriesByDay[day.id] = nextDayEntries;
        }
      }

      return didUpdate ? nextEntriesByDay : current;
    });
  };

  const handleDeletePhotoFromEntry = (entry: PlaceEntry, photoIndex: number) => {
    updateEntryPhotos(entry, [photoIndex]);
  };

  const confirmDeletePhotoFromEntry = (entry: PlaceEntry, photoIndex: number) => {
    const deleteTarget = { entry, photoIndex };
    setPendingDeletePhoto(deleteTarget);

    Alert.alert(
      '\uC0AD\uC81C\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?',
      '\uC774 \uC0AC\uC9C4\uC744 \uAE30\uB85D\uC5D0\uC11C \uC0AD\uC81C\uD569\uB2C8\uB2E4.',
      [
        {
          text: '\uCDE8\uC18C',
          style: 'cancel',
          onPress: () => setPendingDeletePhoto(null),
        },
        {
          text: '\uC0AD\uC81C',
          style: 'destructive',
          onPress: () => {
            handleDeletePhotoFromEntry(deleteTarget.entry, deleteTarget.photoIndex);
            setPendingDeletePhoto(null);
          },
        },
      ],
      {
        onDismiss: () => setPendingDeletePhoto(null),
      },
    );
  };

  const handleClosePhotoGrid = () => {
    setPhotoGridEntry(null);
    setPhotoGridSelectionMode(false);
    setSelectedPhotoIndexes([]);
    setPhotoViewerIndex(null);
  };

  const togglePhotoGridSelection = (photoIndex: number) => {
    setSelectedPhotoIndexes((current) =>
      current.includes(photoIndex)
        ? current.filter((index) => index !== photoIndex)
        : [...current, photoIndex],
    );
  };

  const handleConfirmDeleteGridPhotos = () => {
    if (!photoGridEntry || selectedPhotoIndexes.length === 0) {
      return;
    }

    const nextPhotoGridEntry = deleteEntryPhotoIndexes(photoGridEntry, selectedPhotoIndexes);

    updateEntryPhotos(photoGridEntry, selectedPhotoIndexes);

    if (getPhotoSources(nextPhotoGridEntry).length === 0) {
      handleClosePhotoGrid();
      return;
    }

    setPhotoGridEntry(nextPhotoGridEntry);
    setPhotoGridSelectionMode(false);
    setSelectedPhotoIndexes([]);
  };

  const handleOpenTripInfoEdit = () => {
    setHeaderMenuVisible(false);
    setTripInfoModalVisible(true);
  };

  const handleSubmitTripInfoEdit = (value: StartTripSetupValue) => {
    const endDate = value.isEndDateUndecided ? value.startDate : value.endDate;
    const nextDayOptions = createDayOptionsFromDateRange(value.startDate, endDate, dayOptions);
    const selectedDateKey = getDayDateKey(selectedDay);
    const nextSelectedDay =
      nextDayOptions.find((day) => getDayDateKey(day) === selectedDateKey) ??
      nextDayOptions[0] ??
      selectedDay;

    setDayOptions(nextDayOptions);
    setSelectedDay(nextSelectedDay);
    setSelectedFilterId(nextSelectedDay.id);
    setTripInfoModalVisible(false);
    // TODO: Persist edited trip information to Supabase when backend sync is connected.
  };

  const handleAddPhotosToEntry = async (entry: PlaceEntry) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 1,
        exif: true,
      });

      if (result.canceled || result.assets.length === 0) {
        return;
      }

      const photoGroups = groupAssetsByTakenDate(result.assets, selectedDay);
      const nextDayOptions = mergeDayOptionsWithPhotoGroups(dayOptions, photoGroups);
      const firstTargetDay = nextDayOptions.find((day) => getDayDateKey(day) === photoGroups[0]?.dateKey);
      const targetPlaceId = getEntryPlaceId(entry);

      setDayOptions(nextDayOptions);

      if (firstTargetDay) {
        setSelectedDay(firstTargetDay);
        setSelectedFilterId(firstTargetDay.id);
      }

      setEntriesByDay((current) => {
        const nextEntriesByDay = { ...current };

        for (const group of photoGroups) {
          const targetDay = nextDayOptions.find((day) => getDayDateKey(day) === group.dateKey);

          if (!targetDay) {
            continue;
          }

          const targetDayId = targetDay.id;
          const dayEntries = nextEntriesByDay[targetDayId]
            ?? (targetDayId === selectedDay.id ? RECORD_DAY_ENTRIES : []);
          const nextUris = group.assets.map((asset) => asset.uri);
          const hasTargetEntry = dayEntries.some((item) => getEntryPlaceId(item) === targetPlaceId);

          nextEntriesByDay[targetDayId] = hasTargetEntry
            ? dayEntries.map((item) => {
              if (getEntryPlaceId(item) !== targetPlaceId) {
                return item;
              }

              return {
                ...item,
                photoUris: [...new Set([...(item.photoUris ?? []), ...nextUris])],
              };
            })
            : [
              ...dayEntries,
              createPhotoEntry(targetDayId, group.date, nextUris, entry),
            ];
        }

        return nextEntriesByDay;
      });
    } catch {
      Alert.alert(
        '\uC0AC\uC9C4 \uCD94\uAC00 \uC2E4\uD328',
        '\uC0AC\uC9C4\uC744 \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4. \uB2E4\uC2DC \uC2DC\uB3C4\uD574\uC8FC\uC138\uC694.',
      );
    }
  };

  const handleSelectDay = (day: DaySelectorItem) => {
    setSelectedDay(day);
    setSelectedFilterId(day.id);
  };

  const handleOpenPlaceDetail = (entry: PlaceEntry) => {
    const entryDayId = entry.tripDayId ?? entry.dayId ?? selectedDay.id;

    router.push({
      pathname: '/place-detail',
      params: {
        tripId: entry.tripId ?? routeTripId ?? 'record-trip',
        dayId: entryDayId,
        placeId: getEntryPlaceId(entry),
        entryPoint: 'recordDayDetail',
        placeName: entry.placeName ?? entry.place,
        cityName: entry.cityName ?? entry.city,
        countryName: entry.countryName,
        categoryLabel: entry.category,
        dateLabel: formatHeaderDate(selectedDay),
        timeLabel: entry.time,
        recordText: entry.text,
        photoUris: getEntryPhotoUrisParam(entry),
      },
    });
  };

  const handleOpenPlacePhotoGrid = (entry: PlaceEntry) => {
    setPhotoGridEntry(entry);
    setPhotoGridSelectionMode(false);
    setSelectedPhotoIndexes([]);
    setPhotoViewerIndex(null);
  };

  const handleOpenPhotoViewerFromGrid = (index: number) => {
    if (photoGridSources.length === 0) {
      if (__DEV__) {
        console.warn('[record-day-detail photo viewer]', {
          photoViewerOpenFailureReason: 'empty_photo_grid_sources',
          photoGridPressedIndex: index,
          photoViewerPhotoCount: photoGridSources.length,
        });
      }
      return;
    }

    const initialIndex = Math.max(0, Math.min(index, photoGridSources.length - 1));

    if (__DEV__) {
      console.info('[record-day-detail photo viewer]', {
        photoGridItemPressCount: 1,
        photoGridPressedIndex: index,
        photoGridPressedPhotoId: `record-grid-photo-${initialIndex}`,
        photoViewerInitialIndex: initialIndex,
        photoViewerOpenRequestedCount: 1,
        photoViewerOpenSucceeded: true,
        photoViewerPhotoCount: photoGridSources.length,
      });
    }

    setPhotoViewerIndex(initialIndex);
  };

  const getEntryDayId = (entry: PlaceEntry) => {
    if (entry.tripDayId) {
      return entry.tripDayId;
    }

    for (const day of dayOptions) {
      const dayEntries = entriesByDay[day.id]
        ?? (day.id === selectedDay.id ? RECORD_DAY_ENTRIES : undefined);

      if (dayEntries?.some((item) => item.id === entry.id)) {
        return day.id;
      }
    }

    return entry.dayId ?? selectedDay.id;
  };

  const handleSubmitPlaceEntry = async (input: PlaceCreateInput) => {
    const { dayOptions: nextDayOptions, targetDay } = resolveDayForPlaceInput(
      dayOptions,
      input,
      selectedDay,
    );
    const targetDayId = targetDay.id;

    if (shouldUseSupabaseRecordDay && routeTripId && isSupabaseUuid(targetDayId)) {
      try {
        if (
          editingEntry?.dataSource === 'supabase' &&
          editingEntry.placeId
        ) {
          await updatePlaceRecordMutation.mutateAsync({
            ...input,
            placeId: editingEntry.placeId,
            recordId: editingEntry.recordId,
            tripDayId: targetDayId,
            tripId: routeTripId,
          });
        } else {
          await createPlaceRecordMutation.mutateAsync({
            ...input,
            tripDayId: targetDayId,
            tripId: routeTripId,
          });
        }

        handleClosePlaceEntryModal();
      } catch (error) {
        console.warn('[record-day-detail] save place record failed', error);
        Alert.alert(
          '\uC7A5\uC18C\uB97C \uC800\uC7A5\uD558\uC9C0 \uBABB\uD588\uC5B4\uC694',
          '\uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574\uC8FC\uC138\uC694.',
        );
      }
      return;
    }

    if (nextDayOptions !== dayOptions) {
      setDayOptions(nextDayOptions);
      setSelectedDay((current) =>
        nextDayOptions.find((day) => day.id === current.id) ?? current,
      );
    }

    if (isDetectedTripPreviewRoute) {
      setEntriesByDay((current) => {
        const targetDayEntries = current[targetDayId] ?? [];

        if (editingEntry) {
          const sourceDayId = getEntryDayId(editingEntry);
          const sourceDayEntries = current[sourceDayId] ?? [];
          const nextEntriesByDay = {
            ...current,
            [sourceDayId]: sourceDayEntries.filter((entry) => entry.id !== editingEntry.id),
          };
          const normalizedTargetEntries = sourceDayId === targetDayId
            ? nextEntriesByDay[sourceDayId]
            : targetDayEntries;
          const updatedEntry: PlaceEntry = {
            ...editingEntry,
            ...input,
            dataSource: 'detected',
            id: editingEntry.id,
            source: 'detected',
            dayId: targetDay.id,
            dateKey: getDayDateKey(targetDay) ?? undefined,
            dateLabel: targetDay.dateLabel,
            weekdayLabel: targetDay.weekdayLabel,
          };

          return {
            ...nextEntriesByDay,
            [targetDayId]: [...normalizedTargetEntries, updatedEntry].sort(
              (left, right) => getTimeSortValue(left.time) - getTimeSortValue(right.time),
            ),
          };
        }

        const newEntry: PlaceEntry = {
          id: `detected-manual-${targetDayId}-${Date.now()}`,
          ...input,
          dataSource: 'detected',
          source: 'detected',
          dayId: targetDay.id,
          dateKey: getDayDateKey(targetDay) ?? undefined,
          dateLabel: targetDay.dateLabel,
          weekdayLabel: targetDay.weekdayLabel,
        };

        return {
          ...current,
          [targetDayId]: [...targetDayEntries, newEntry].sort(
            (left, right) => getTimeSortValue(left.time) - getTimeSortValue(right.time),
          ),
        };
      });
      handleClosePlaceEntryModal();
      return;
    }

    setEntriesByDay((current) => {
      const targetDayEntries = current[targetDayId]
        ?? (targetDayId === selectedDay.id ? RECORD_DAY_ENTRIES : []);

      if (editingEntry) {
        const sourceDayId = getEntryDayId(editingEntry);
        const sourceDayEntries = current[sourceDayId]
          ?? (sourceDayId === selectedDay.id ? RECORD_DAY_ENTRIES : []);
        const nextEntriesByDay = {
          ...current,
          [sourceDayId]: sourceDayEntries.filter((entry) => entry.id !== editingEntry.id),
        };
        const normalizedTargetEntries = sourceDayId === targetDayId
          ? nextEntriesByDay[sourceDayId]
          : targetDayEntries;
        const updatedEntry: PlaceEntry = {
          ...editingEntry,
          ...input,
          id: editingEntry.id,
          dayId: targetDay.id,
          dateKey: getDayDateKey(targetDay) ?? undefined,
          dateLabel: targetDay.dateLabel,
          weekdayLabel: targetDay.weekdayLabel,
        };

        return {
          ...nextEntriesByDay,
          [targetDayId]: [...normalizedTargetEntries, updatedEntry].sort(
            (left, right) => getTimeSortValue(left.time) - getTimeSortValue(right.time),
          ),
        };
      }

      const newEntry: PlaceEntry = {
        id: `manual-${targetDayId}-${Date.now()}`,
        ...input,
        dayId: targetDay.id,
        dateKey: getDayDateKey(targetDay) ?? undefined,
        dateLabel: targetDay.dateLabel,
        weekdayLabel: targetDay.weekdayLabel,
      };

      return {
        ...current,
        [targetDayId]: [...targetDayEntries, newEntry].sort(
          (left, right) => getTimeSortValue(left.time) - getTimeSortValue(right.time),
        ),
      };
    });
    handleClosePlaceEntryModal();
  };

  const handleDeleteEntry = (entry: PlaceEntry, entryIndex?: number) => {
    const targetPlaceId = getEntryPlaceId(entry);

    Alert.alert(
      '\uC774 \uC7A5\uC18C \uAE30\uB85D\uC744 \uC0AD\uC81C\uD560\uAE4C\uC694?',
      '\uC0AD\uC81C\uD558\uBA74 \uC774 \uC7A5\uC18C\uC758 \uC0AC\uC9C4, \uAE30\uB85D, \uC0C1\uC138 \uD398\uC774\uC9C0 \uC5F0\uACB0\uB3C4 \uD568\uAED8 \uC815\uB9AC\uB3FC\uC694.',
      [
        { text: '\uCDE8\uC18C', style: 'cancel' },
        {
          text: '\uC0AD\uC81C',
          style: 'destructive',
          onPress: () => {
            if (
              entry.dataSource === 'supabase' &&
              entry.placeId &&
              entry.tripDayId &&
              entry.tripId
            ) {
              void deletePlaceRecordMutation.mutateAsync({
                placeId: entry.placeId,
                tripDayId: entry.tripDayId,
                tripId: entry.tripId,
              }).then(() => {
                markPlaceDetailDeleted(targetPlaceId);
              }).catch((error) => {
                console.warn('[record-day-detail] delete place record failed', error);
                Alert.alert(
                  '\uC7A5\uC18C\uB97C \uC0AD\uC81C\uD558\uC9C0 \uBABB\uD588\uC5B4\uC694',
                  '\uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574\uC8FC\uC138\uC694.',
                );
              });
              return;
            }

            if (entry.dataSource === 'detected') {
              const targetDay = dayOptions.find((day) => day.id === entry.dayId) ?? selectedDay;
              const nextDeletedKey = getLocalEntryDeletionKey(
                routeTripId,
                targetDay,
                entry,
                entryIndex ?? 0,
              );

              setDeletedLocalEntryKeys((current) => {
                const next = new Set(current);
                next.add(nextDeletedKey);
                return next;
              });
              return;
            }

            const targetDay = selectedFilterId === ALL_DAYS_ID
              ? dayOptions.find((day) =>
                (entriesByDay[day.id] ?? RECORD_DAY_ENTRIES).some((item) => item === entry),
              ) ?? selectedDay
              : selectedDay;
            const targetDayEntries = entriesByDay[targetDay.id] ?? RECORD_DAY_ENTRIES;
            const targetIndex = entryIndex ?? targetDayEntries.findIndex((item) => item === entry);
            const nextDeletedKey = getLocalEntryDeletionKey(
              routeTripId,
              targetDay,
              entry,
              targetIndex >= 0 ? targetIndex : 0,
            );

            setDeletedLocalEntryKeys((current) => {
              const next = new Set(current);
              next.add(nextDeletedKey);
              return next;
            });
            setEntriesByDay((current) => {
              const nextEntriesByDay = { ...current };
              const dayEntries = nextEntriesByDay[targetDay.id]
                ?? (targetDay.id === selectedDay.id ? RECORD_DAY_ENTRIES : undefined);

              if (dayEntries) {
                nextEntriesByDay[targetDay.id] = dayEntries.filter((item, index) => (
                  index !== (targetIndex >= 0 ? targetIndex : 0)
                ));
              }

              return nextEntriesByDay;
            });
          },
        },
      ],
    );
  };

  const handleAddTripPhotos = async () => {
    setHeaderMenuVisible(false);

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 1,
        exif: true,
      });

      if (result.canceled || result.assets.length === 0) {
        return;
      }

      const photoGroups = groupAssetsByPlaceVisit(result.assets, selectedDay);
      const nextDayOptions = mergeDayOptionsWithPhotoGroups(dayOptions, photoGroups);
      const firstTargetDay = nextDayOptions.find((day) => getDayDateKey(day) === photoGroups[0]?.dateKey);

      setDayOptions(nextDayOptions);

      if (firstTargetDay) {
        setSelectedDay(firstTargetDay);
        setSelectedFilterId(firstTargetDay.id);
      }

      setEntriesByDay((current) => {
        const nextEntriesByDay = { ...current };

        for (const group of photoGroups) {
          const targetDay = nextDayOptions.find((day) => getDayDateKey(day) === group.dateKey);

          if (!targetDay) {
            continue;
          }

          const targetDayId = targetDay.id;
          const dayEntries = nextEntriesByDay[targetDayId]
            ?? (targetDayId === selectedDay.id ? RECORD_DAY_ENTRIES : []);
          const nextUris = group.assets.map((asset) => asset.uri);
          const nextEntry = createPhotoEntry(targetDayId, group.date, nextUris);

          if (group.coordinates) {
            nextEntry.latitude = group.coordinates.latitude;
            nextEntry.longitude = group.coordinates.longitude;
          }

          nextEntriesByDay[targetDayId] = [...dayEntries, nextEntry].sort(
            (left, right) => getTimeSortValue(left.time) - getTimeSortValue(right.time),
          );
        }

        return nextEntriesByDay;
      });
    } catch {
      Alert.alert(
        '\uC0AC\uC9C4 \uCD94\uAC00 \uC2E4\uD328',
        '\uC0AC\uC9C4\uC744 \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4. \uB2E4\uC2DC \uC2DC\uB3C4\uD574\uC8FC\uC138\uC694.',
      );
    }
  };

  const handleSaveTrip = async () => {
    setHeaderMenuVisible(false);

    if (isDetectedTripPreviewRoute) {
      const saveAttemptId = createDetectedTripSaveAttemptId(localDetectedTripDraft?.id);

      if (__DEV__) {
        console.info('[detected trip save] button pressed', {
          detectedTripSaveButtonPressed: true,
          draftId: localDetectedTripDraft?.id,
          isDetectedTripRoute: isDetectedTripPreviewRoute,
          saveAttemptId,
          savedTripIdExists: Boolean(localDetectedTripDraft?.savedTripId),
          saveStatus: localDetectedTripDraft?.saveStatus ?? detectedTripSaveStatus,
        });
      }

      if (!localDetectedTripDraft) {
        if (__DEV__) {
          console.warn('[detected trip save] draft missing', {
            detectedTripSaveDraftLoaded: false,
            detectedTripSaveFailureModalShown: true,
            reason: 'missing_draft',
            saveAttemptId,
          });
        }
        Alert.alert(
          '\uC5EC\uD589\uC744 \uC800\uC7A5\uD558\uC9C0 \uBABB\uD588\uC5B4\uC694',
          '\uC0AC\uC9C4\uCCA9 \uC5EC\uD589 \uC815\uBCF4\uB97C \uB2E4\uC2DC \uD655\uC778\uD574\uC8FC\uC138\uC694.',
        );
        return;
      }

      if (!canUseSupabaseUserData || !user?.id) {
        Alert.alert(
          '\uB85C\uADF8\uC778\uC774 \uD544\uC694\uD574\uC694',
          '\uC5EC\uD589\uC744 \uC800\uC7A5\uD558\uB824\uBA74 \uBA3C\uC800 \uB85C\uADF8\uC778\uD574\uC8FC\uC138\uC694.',
        );
        return;
      }

      if (detectedTripSaveStatus === 'saving') {
        if (__DEV__) {
          console.info('[detected trip save] duplicate blocked', {
            detectedTripSaveBlockedDuplicate: true,
            draftId: localDetectedTripDraft.id,
          });
        }
        return;
      }

      if (localDetectedTripDraft.saveStatus === 'saved' && localDetectedTripDraft.savedTripId) {
        router.replace({
          pathname: '/day-archive-detail',
          params: { tripId: localDetectedTripDraft.savedTripId },
        } as never);
        return;
      }

      const startedAt = Date.now();
      setDetectedTripSaveStatus('saving');
      setDetectedTripPhotoSaveProgress(undefined);
      markLocalDetectedTripDraftSaving(localDetectedTripDraft.id);

      try {
        if (__DEV__) {
          const groupCount = localDetectedTripDraft.days.reduce(
            (total, day) => total + day.groups.length,
            0,
          );
          const groupsWithCentroidCount = localDetectedTripDraft.days.reduce(
            (total, day) => total + day.groups.filter((group) => (
              Number.isFinite(group.centroidLat ?? group.latitude) &&
              Number.isFinite(group.centroidLng ?? group.longitude)
            )).length,
            0,
          );

          console.info('[detected trip save] draft loaded', {
            coverUriExists: Boolean(localDetectedTripDraft.coverPhotoUri),
            dayCount: localDetectedTripDraft.days.length,
            detectedTripSaveDraftLoaded: true,
            detectedTripSaveLatestDraftLookup: true,
            displayTitle: localDetectedTripDraft.displayTitle,
            draftId: localDetectedTripDraft.id,
            endDate: localDetectedTripDraft.endDate,
            groupCount,
            groupsWithCentroidCount,
            photoCount: localDetectedTripDraft.photoCount,
            saveAttemptId,
            startDate: localDetectedTripDraft.startDate,
          });
          console.info('[detected trip save] cover state', {
            detectedTripSaveCoverFailureIgnored: !localDetectedTripDraft.coverPhotoUri,
            detectedTripSaveCoverState: true,
            detectedTripSaveProceedingWithoutCover: !localDetectedTripDraft.coverPhotoUri,
            draftId: localDetectedTripDraft.id,
            saveAttemptId,
          });
          console.info('[detected trip save] requested', {
            detectedTripSaveRequested: true,
            draftId: localDetectedTripDraft.id,
            saveAttemptId,
          });
          console.info('[detected trip save] calling service', {
            detectedTripSaveHandlerCallingService: true,
            detectedTripSaveServiceCallStarted: true,
            draftId: localDetectedTripDraft.id,
            saveAttemptId,
          });
        }

        const result = await saveDetectedTripDraftToSupabase(localDetectedTripDraft, {
          onPhotoProgress: setDetectedTripPhotoSaveProgress,
          saveAttemptId,
        });
        if (__DEV__) {
          console.info('[detected trip save] service resolved', {
            detectedTripSaveHandlerServiceResolved: true,
            detectedTripSaveServiceCallResolved: true,
            draftId: localDetectedTripDraft.id,
            placeCreatedCount: result.placeCreatedCount,
            saveAttemptId,
            tripDayCreatedCount: result.tripDayCreatedCount,
            tripId: result.trip.id,
          });
        }
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: supabaseQueryKeys.myTrips(user.id) }),
          queryClient.invalidateQueries({ queryKey: supabaseQueryKeys.recentTripsRoot(user.id) }),
          queryClient.invalidateQueries({ queryKey: supabaseQueryKeys.tripDetail(user.id, result.trip.id) }),
          queryClient.invalidateQueries({ queryKey: supabaseQueryKeys.tripDays(user.id, result.trip.id) }),
          ...result.tripDays.map((tripDay) =>
            queryClient.invalidateQueries({
              queryKey: supabaseQueryKeys.tripDayPlaces(user.id, tripDay.id),
            }),
          ),
        ]).catch((error: unknown) => {
          console.warn('[record-day-detail] detected save invalidate failed', error);
        });

        await recordSavedDetectedTripDraft(user.id, localDetectedTripDraft.id, result.trip.id);
        markLocalDetectedTripDraftSaved(localDetectedTripDraft.id, result.trip.id);
        setDetectedTripSaveStatus('saved');

        if (__DEV__) {
          console.info('[detected trip save] navigation', {
            detectedTripSaveElapsedMs: Date.now() - startedAt,
            detectedTripSaveNavigationTarget: '/day-archive-detail',
            detectedTripSavedTripId: result.trip.id,
            saveAttemptId,
          });
        }

        router.replace({
          pathname: '/day-archive-detail',
          params: { tripId: result.trip.id },
        } as never);
      } catch (error) {
        const errorInfo = getDetectedSaveErrorInfo(error);
        const message = error instanceof Error ? error.message : 'Detected trip save failed';
        markLocalDetectedTripDraftSaveFailed(localDetectedTripDraft.id, message);
        setDetectedTripSaveStatus('failed');
        console.warn('[record-day-detail] detected trip save failed', {
          detectedTripSaveHandlerServiceRejected: true,
          detectedTripSaveServiceCallRejected: true,
          draftId: localDetectedTripDraft.id,
          saveAttemptId,
          ...errorInfo,
        });
        if (__DEV__) {
          console.info('[detected trip save] failure modal shown', {
            detectedTripSaveFailureModalShown: true,
            draftId: localDetectedTripDraft.id,
            reason: errorInfo.errorStage ?? errorInfo.errorCode ?? 'unknown',
            saveAttemptId,
          });
        }
        const userMessage = getDetectedTripSaveUserMessage(error);
        Alert.alert(userMessage.title, userMessage.message);
      }
      return;
    }

    const coverEntry = entries.find((entry) => entry.photoSources?.[0] || entry.photoUris?.[0]);
    const visitedCities = [
      ...new Set(
        entries
          .map((entry) => (entry.cityName ?? entry.city ?? '').trim())
          .filter(Boolean),
      ),
    ];
    const visitedCountries = [
      ...new Set(
        entries
          .map((entry) => (entry.countryName ?? '').trim())
          .filter(Boolean),
      ),
    ];

    addSavedCompletedTrip({
      id: tripId ?? 'record-trip',
      destinationName: coverEntry?.cityName ?? coverEntry?.city ?? '',
      countryName: coverEntry?.countryName ?? '',
      visitedCities,
      visitedCountries,
      startDate: '2025-03-04',
      endDate: '2025-03-07',
      coverImage: coverEntry?.photoSources?.[0] ?? RECORD_DAY_ENTRY_IMAGES.bondi1,
      daysCount: dayOptions.length,
      photoCount: entries.reduce((total, entry) => (
        total + (entry.photoCount ?? entry.photoSources?.length ?? 0) + (entry.photoUris?.length ?? 0)
      ), 0),
    });
    // TODO: Mark the source photo-detection candidate as saved when persisted state is connected.
    router.replace('/(tabs)' as never);
  };

  const handleDeleteTrip = () => {
    setHeaderMenuVisible(false);
    Alert.alert(
      '\uC5EC\uD589\uC744 \uC0AD\uC81C\uD560\uAE4C\uC694?',
      '\uC571\uC5D0\uC11C\uB9CC \uC0AD\uC81C\uB418\uBA70, \uAE30\uAE30\uC758 \uC6D0\uBCF8 \uC0AC\uC9C4\uC740 \uC720\uC9C0\uB429\uB2C8\uB2E4.',
      [
        { text: '\uCDE8\uC18C', style: 'cancel' },
        {
          text: '\uC0AD\uC81C',
          style: 'destructive',
          onPress: () => {
            // TODO: Mark the source photo-detection candidate as ignored when persisted state is connected.
            router.replace('/(tabs)' as never);
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        balancedSlots
        leftSlot={
          <Pressable
            accessibilityLabel="뒤로가기"
            accessibilityRole="button"
            hitSlop={10}
            onPress={() => router.back()}
            style={styles.headerBackButton}
          >
            <Feather name="chevron-left" size={28} color={Colors.foundation.black} />
          </Pressable>
        }
        onBackPress={() => router.back()}
        centerSlot={
          <Text style={styles.headerDateText}>{headerTitleInfo.title}</Text>
        }
        rightSlot={
          <Pressable
            accessibilityLabel="\uC5EC\uD589 \uBA54\uB274"
            accessibilityRole="button"
            hitSlop={10}
            onPress={() => setHeaderMenuVisible((visible) => !visible)}
            style={styles.headerMoreButton}
          >
            <Feather name="more-horizontal" size={24} color={Colors.foundation.black} />
          </Pressable>
        }
        style={styles.header}
      />

      {headerMenuVisible ? (
        <>
          <Pressable
            accessibilityLabel="\uC5EC\uD589 \uBA54\uB274 \uB2EB\uAE30"
            accessibilityRole="button"
            onPress={() => setHeaderMenuVisible(false)}
            style={styles.headerMenuDismiss}
          />
          <View style={styles.headerMenu}>
            <Pressable accessibilityRole="button" onPress={handleOpenCreate} style={styles.headerMenuRow}>
              <Feather name="map-pin" size={18} color={Colors.foundation.black} />
              <Text style={styles.headerMenuLabel}>{'\uC7A5\uC18C \uCD94\uAC00'}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={handleOpenTripInfoEdit} style={styles.headerMenuRow}>
              <Feather name="edit-3" size={18} color={Colors.foundation.black} />
              <Text style={styles.headerMenuLabel}>{LABEL_TRIP_INFO_EDIT}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={handleAddTripPhotos} style={styles.headerMenuRow}>
              <Feather name="image" size={18} color={Colors.foundation.black} />
              <Text style={styles.headerMenuLabel}>{'\uC0AC\uC9C4 \uCD94\uAC00'}</Text>
            </Pressable>
            <View style={styles.headerMenuDivider} />
            {!isDetectedTripPreviewRoute ? (
              <Pressable accessibilityRole="button" onPress={handleSaveTrip} style={styles.headerMenuRow}>
                <Feather name="archive" size={18} color={Colors.foundation.black} />
                <Text style={styles.headerMenuLabel}>{'\uC5EC\uD589 \uC800\uC7A5'}</Text>
              </Pressable>
            ) : null}
            <Pressable accessibilityRole="button" onPress={handleDeleteTrip} style={styles.headerMenuRow}>
              <Feather name="trash-2" size={18} color={styles.destructiveText.color} />
              <Text style={[styles.headerMenuLabel, styles.destructiveText]}>{'\uC5EC\uD589 \uC0AD\uC81C'}</Text>
            </Pressable>
          </View>
        </>
      ) : null}

      <ScrollView
        stickyHeaderIndices={[1]}
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          isDetectedTripPreviewRoute && styles.detectedScrollContent,
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.mapWrap}>
        <MapPlaceholderCard align="center" style={styles.map} />
        </View>

        <DayFilterBar
          days={dayOptions}
          selectedId={selectedFilterId}
          onSelectAll={() => setDaySheetVisible(true)}
          onSelectDay={handleSelectDay}
        />

        <View style={styles.entriesContent}>
        {entries.map((entry, index) => (
          <PlaceEntryCard
            key={`${selectedFilterId}-${entry.id}-${index}`}
            entry={entry}
            flagScreen={isDetectedTripPreviewRoute ? 'detected_record_day_detail' : undefined}
            photoDisplayMode="limited"
            showRating={false}
            variant="recordPhotoReview"
            onLongPress={() => handleDeleteEntry(entry, index)}
            onPress={() => handleOpenPlaceDetail(entry)}
            onPhotoDelete={(photoIndex) => confirmDeletePhotoFromEntry(entry, photoIndex)}
            onPhotoGridOpen={() => handleOpenPlacePhotoGrid(entry)}
            onQuickAddPhoto={() => handleAddPhotosToEntry(entry)}
            onQuickEdit={() => handleOpenEditEntry(entry)}
            onQuickDelete={() => handleDeleteEntry(entry, index)}
          />
        ))}
        </View>
      </ScrollView>

      {isDetectedTripPreviewRoute ? (
        <View style={[styles.detectedSaveBar, { paddingBottom: Math.max(insets.bottom, Spacing.lg) }]}>
          <Pressable
            accessibilityRole="button"
            disabled={detectedTripSaveStatus === 'saving'}
            onPress={handleSaveTrip}
            style={({ pressed }) => [
              styles.detectedSaveButton,
              pressed && detectedTripSaveStatus !== 'saving' && styles.buttonPressed,
              detectedTripSaveStatus === 'saving' && styles.detectedSaveButtonSaving,
            ]}
          >
            <Text style={styles.detectedSaveButtonText}>
              {detectedTripSaveStatus === 'saving'
                ? detectedTripPhotoSaveProgress
                  ? `${detectedTripPhotoSaveProgress.phase === 'preparing' ? '원본 사진 준비 중' : '사진 저장 중'} · ${detectedTripPhotoSaveProgress.completedCount.toLocaleString()} / ${detectedTripPhotoSaveProgress.totalCount.toLocaleString()}`
                  : LABEL_SAVING_DETECTED_TRIP
                : LABEL_SAVE_DETECTED_TRIP}
            </Text>
          </Pressable>
        </View>
      ) : null}

      <PlaceCreateModal
        visible={placeEntryModalVisible}
        mode={placeEntryFormMode}
        tripId={tripId ?? 'record-trip'}
        dayId={selectedDay.id}
        dayOptions={dayOptions.map(toPlaceEntryDayOption)}
        selectedDayId={editingEntry ? getEntryDayId(editingEntry) : selectedDay.id}
        initialValue={
          editingEntry
            ? {
              ...editingEntry,
              source: editingEntry.source === 'mock' ? ('mock' as const) : ('manual' as const),
              dayId: getEntryDayId(editingEntry),
            }
            : {
              dayId: selectedDay.id,
              dateKey: getDayDateKey(selectedDay) ?? undefined,
              dateLabel: selectedDay.dateLabel,
              weekdayLabel: selectedDay.weekdayLabel,
            }
        }
        onDelete={(entryId) => {
          if (
            editingEntry?.dataSource === 'supabase' &&
            editingEntry.placeId &&
            editingEntry.tripDayId &&
            editingEntry.tripId
          ) {
            void deletePlaceRecordMutation.mutateAsync({
              placeId: editingEntry.placeId,
              tripDayId: editingEntry.tripDayId,
              tripId: editingEntry.tripId,
            }).then(() => {
              markPlaceDetailDeleted(getEntryPlaceId(editingEntry));
              handleClosePlaceEntryModal();
            }).catch((error) => {
              console.warn('[record-day-detail] delete place record from modal failed', error);
              Alert.alert(
                '\uC7A5\uC18C\uB97C \uC0AD\uC81C\uD558\uC9C0 \uBABB\uD588\uC5B4\uC694',
                '\uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574\uC8FC\uC138\uC694.',
              );
            });
            return;
          }

          if (editingEntry?.dataSource === 'detected') {
            const targetDay = dayOptions.find((day) => day.id === editingEntry.dayId) ?? selectedDay;
            const nextDeletedKey = getLocalEntryDeletionKey(routeTripId, targetDay, editingEntry, 0);

            setDeletedLocalEntryKeys((currentKeys) => {
              const next = new Set(currentKeys);
              next.add(nextDeletedKey);
              return next;
            });
            handleClosePlaceEntryModal();
            return;
          }

          setEntriesByDay((current) => {
            const nextEntriesByDay = { ...current };

            for (const day of dayOptions) {
              const dayEntries = nextEntriesByDay[day.id]
                ?? (day.id === selectedDay.id ? RECORD_DAY_ENTRIES : undefined);
              const matchedEntryIndex = dayEntries?.findIndex((entry) => entry.id === entryId) ?? -1;
              const matchedEntry = matchedEntryIndex >= 0 ? dayEntries?.[matchedEntryIndex] : undefined;

              if (!dayEntries || !matchedEntry) {
                continue;
              }

              const nextDeletedKey = getLocalEntryDeletionKey(routeTripId, day, matchedEntry, matchedEntryIndex);
              setDeletedLocalEntryKeys((currentKeys) => {
                const next = new Set(currentKeys);
                next.add(nextDeletedKey);
                return next;
              });
              nextEntriesByDay[day.id] = dayEntries.filter((_, index) => index !== matchedEntryIndex);
              break;
            }

            return nextEntriesByDay;
          });
          handleClosePlaceEntryModal();
        }}
        onClose={handleClosePlaceEntryModal}
        onSubmit={handleSubmitPlaceEntry}
      />

      <StartTripSetupModal
        visible={tripInfoModalVisible}
        mode="edit"
        initialValue={tripInfoInitialValue}
        onCancel={() => setTripInfoModalVisible(false)}
        onStart={handleSubmitTripInfoEdit}
      />

      <Modal
        animationType="slide"
        onRequestClose={handleClosePhotoGrid}
        visible={photoGridEntry != null}
      >
        <SafeAreaView
          style={[styles.photoGridScreen, { paddingTop: insets.top }]}
          edges={['bottom']}
        >
          <View style={styles.photoGridHeader}>
            <Pressable
              accessibilityRole="button"
              hitSlop={10}
              onPress={handleClosePhotoGrid}
              style={styles.photoGridHeaderButton}
            >
              <Feather
                name="chevron-left"
                size={28}
                color={Colors.foundation.black}
                style={styles.photoGridBackIcon}
              />
            </Pressable>
            <View style={styles.photoGridHeaderSpacer} />
            <Pressable
              accessibilityRole="button"
              disabled={photoGridSources.length === 0}
              hitSlop={10}
              onPress={() => {
                if (isPhotoGridSelectionMode && selectedPhotoIndexes.length > 0) {
                  Alert.alert(LABEL_DELETE_SELECTED_PHOTOS, LABEL_DELETE_PHOTO_DESCRIPTION, [
                    { text: LABEL_CANCEL, style: 'cancel' },
                    {
                      text: LABEL_DELETE,
                      style: 'destructive',
                      onPress: handleConfirmDeleteGridPhotos,
                    },
                  ]);
                  return;
                }

                if (isPhotoGridSelectionMode) {
                  setPhotoGridSelectionMode(false);
                  setSelectedPhotoIndexes([]);
                  return;
                }

                setPhotoGridSelectionMode(true);
                setSelectedPhotoIndexes([]);
              }}
              style={styles.photoGridHeaderButton}
            >
              <Feather
                name="trash-2"
                size={22}
                color={photoGridSources.length === 0 ? Colors.foundation.grey300 : Colors.foundation.black}
              />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.photoGridContent}>
            {photoGridSources.map((source, index) => {
              const selected = selectedPhotoIndexes.includes(index);

              return (
                <Pressable
                  accessibilityRole="imagebutton"
                  key={`record-grid-photo-${index}`}
                  onPress={() => {
                    if (isPhotoGridSelectionMode) {
                      togglePhotoGridSelection(index);
                      return;
                    }

                    handleOpenPhotoViewerFromGrid(index);
                  }}
                  style={[
                    styles.photoGridItem,
                    { width: (width - Spacing.xl * 2 - Spacing.xs * 2) / 3 },
                  ]}
                >
                  <Image source={source} style={styles.photoGridImage} resizeMode="cover" />
                  {isPhotoGridSelectionMode ? (
                    <View style={[styles.photoGridSelection, selected && styles.photoGridSelectionSelected]}>
                      {selected ? (
                        <Feather name="check" size={14} color={Colors.foundation.white} />
                      ) : null}
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>

          <FullScreenImageViewer
            images={photoGridSources}
            initialIndex={photoViewerIndex ?? 0}
            presentation="inline"
            visible={photoViewerIndex != null && photoGridSources.length > 0}
            onClose={() => setPhotoViewerIndex(null)}
          />
        </SafeAreaView>
      </Modal>

      <DaySelectorSheet
        visible={daySheetVisible}
        days={dayOptions}
        selectedId={selectedFilterId}
        title={'\uB0A0\uC9DC \uC120\uD0DD'}
        onSelectDay={(day) => {
          handleSelectDay(day);
          setDaySheetVisible(false);
        }}
        onClose={() => setDaySheetVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.light.bgScreen,
  },
  header: {
    width: '100%',
    height: 44,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.light.bgScreen,
    zIndex: 20,
  },
  headerDateText: {
    ...Typography.body1Regular,
    color: Colors.foundation.black,
    textAlign: 'center',
  },
  headerBackButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -10,
  },
  headerMoreButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -10,
  },
  headerMenuDismiss: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 25,
  },
  headerMenu: {
    position: 'absolute',
    top: 44,
    right: Spacing.xl,
    width: 174,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.lg,
    backgroundColor: Colors.foundation.white,
    zIndex: 30,
    ...Shadows.modal,
  },
  headerMenuRow: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  headerMenuLabel: {
    ...Typography.body2Regular,
    color: Colors.foundation.black,
  },
  headerMenuDivider: {
    height: 1,
    marginVertical: Spacing.xs,
    marginHorizontal: Spacing.lg,
    backgroundColor: Colors.light.borderStrong,
  },
  destructiveText: {
    color: '#EB524D',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing['4xl'],
  },
  detectedScrollContent: {
    paddingBottom: DETECTED_SAVE_BAR_HEIGHT + Spacing['4xl'] * 2,
  },
  mapWrap: {
    height: 272,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    backgroundColor: Colors.light.bgScreen,
  },
  map: {
    maxWidth: undefined,
  },
  dayFilterBar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DAY_FILTER_BG,
  },
  allChip: {
    width: 57,
    height: 28,
    marginLeft: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    borderRadius: Radius.lg,
    backgroundColor: Colors.foundation.white,
    zIndex: 2,
  },
  allChipText: {
    fontFamily: FontFamily.pretendard,
    fontSize: 13,
    lineHeight: 16,
    color: Colors.foundation.black,
  },
  dayChipViewport: {
    flex: 1,
    height: 28,
    marginLeft: Spacing.sm,
    marginRight: 7,
    overflow: 'hidden',
  },
  dayChipContent: {
    gap: Spacing.xs,
    paddingRight: Spacing.xl,
  },
  dayChip: {
    height: 28,
    minWidth: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderRadius: Radius.lg,
    backgroundColor: Colors.foundation.white,
  },
  dayChipSelected: {
    backgroundColor: Colors.foundation.black,
  },
  dayChipText: {
    fontFamily: FontFamily.pretendard,
    fontSize: 13,
    lineHeight: 16,
    color: Colors.foundation.black,
  },
  dayChipTextSelected: {
    fontFamily: FontFamily.pretendardSemiBold,
    color: Colors.foundation.white,
  },
  dayChipFade: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: Spacing.md,
  },
  dayChipFadeHidden: {
    opacity: 0,
  },
  entriesContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing['3xl'],
    gap: Spacing['3xl'],
  },
  photoGridScreen: {
    flex: 1,
    backgroundColor: Colors.light.bgScreen,
  },
  photoGridHeader: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.light.bgScreen,
  },
  photoGridHeaderButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.full,
  },
  photoGridBackIcon: {
    transform: [{ translateX: -4 }],
  },
  photoGridHeaderSpacer: {
    flex: 1,
  },
  photoGridContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing['4xl'],
  },
  photoGridItem: {
    aspectRatio: 1,
    overflow: 'hidden',
    borderRadius: Radius.xs,
    backgroundColor: Colors.foundation.white,
  },
  photoGridImage: {
    width: '100%',
    height: '100%',
  },
  photoGridSelection: {
    position: 'absolute',
    top: Spacing.xs,
    right: Spacing.xs,
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.foundation.white,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
  },
  photoGridSelectionSelected: {
    borderColor: Colors.foundation.black,
    backgroundColor: Colors.foundation.black,
  },
  detectedSaveBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 35,
    paddingTop: Spacing.md,
    backgroundColor: Colors.light.bgScreen,
  },
  detectedSaveButton: {
    height: DETECTED_SAVE_BAR_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.sm,
    backgroundColor: Colors.foundation.black,
  },
  detectedSaveButtonSaving: {
    opacity: 0.72,
  },
  detectedSaveButtonText: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.white,
    textAlign: 'center',
  },
  buttonPressed: {
    opacity: 0.84,
  },
});
