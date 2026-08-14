import { Feather } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import {
  Alert,
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type ImageSourcePropType,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import AppTextInput from '@/components/common/AppTextInput';
import Text from '@/components/common/AppText';
import FullScreenImageViewer, {
  type FullScreenImageViewerAction,
} from '@/components/common/FullScreenImageViewer';
import PlaceCreateModal, {
  type PlaceCreateInput,
  type PlaceEntryDayOption,
} from '@/components/record/PlaceCreateModal';
import TimeWheelPickerModal from '@/components/record/TimeWheelPickerModal';
import {
  getMockPlaceDetail,
  type PlaceDetailPhoto,
  type PlaceDetailRecord,
  type PlaceDetailData,
} from '@/constants/mockPlaceDetails';
import {
  isPlaceDetailDeleted,
  markPlaceDetailDeleted,
} from '@/services/placeDetailDeletionRegistry';
import { localizeSavedPlaceGeography } from '@/services/localization/placeGeography';
import { MOCK_ARCHIVE_DETAIL } from '@/constants/mockArchiveDetail';
import { RECORD_DAY_ENTRIES } from '@/constants/mockRecordDayDetail';
import {
  getPlaceCategoryDisplayLabel,
  getPlaceCategoryLabel,
  normalizePlaceCategoryValue,
} from '@/constants/placeCategories';
import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import {
  buildVisitedAtIso,
  convertDateToPlaceEntryTime,
  extractPhotoTakenAt,
  formatPlaceEntryTime,
  formatVisitedAtTimeLabel,
  parsePlaceEntryTime,
} from '@/utils/placeEntryTime';
import { isSupabaseUuid, usePlaceDetailData } from '@/hooks/usePlaceDetailData';
import { useDeletePlaceRecord } from '@/hooks/useDeletePlaceRecord';
import { supabaseQueryKeys } from '@/hooks/supabaseQueryKeys';
import { useTripDays } from '@/hooks/useTripDays';
import { usePlacePhotos } from '@/hooks/useSupabasePhotos';
import { useAuth } from '@/providers/AuthProvider';
import { updatePlace, type PlaceRow, type UpdatePlacePatch } from '@/services/supabase/places';
import { buildPlaceIdentityPatch } from '@/services/placeSearch/persistence';
import type { TripDayRow } from '@/services/supabase/tripDays';
import {
  createRecordForPlace,
  softDeleteRecord,
  syncRecordPhotos,
  updateRecord,
  type RecordRow,
  type RecordWithPhotos,
} from '@/services/supabase/records';
import {
  softDeletePhotos,
  setPlaceCoverPhoto,
  uploadPlacePhotos,
  type DeletePhotosResult,
  type UploadPlacePhotoItem,
} from '@/services/supabase/photos';

type PlaceDetailRouteParams = {
  tripId?: string;
  dayId?: string;
  tripDayId?: string;
  placeId?: string;
  entryPoint?: 'dailyMoment' | 'activeTripTimeline' | 'recordDayDetail' | 'archiveDayDetail';
  openPhotoGrid?: string;
  photoGridMode?: 'viewOnly' | 'recordCreate';
  photoSourceIndexes?: string;
  placeName?: string;
  cityName?: string;
  countryName?: string;
  categoryLabel?: string;
  dateLabel?: string;
  timeLabel?: string;
  recordText?: string;
  photoUris?: string;
};

const DESTRUCTIVE = '#EB524D';
const PHOTO_GRID_COLUMN_COUNT = 3;
const DATE_LABEL_PATTERN = /^(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})(?:\s*(.*))?$/;
const KOREAN_WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'] as const;
const RECORD_SWIPE_ACTION_WIDTH = 104;
const RECORD_SWIPE_OPEN_THRESHOLD = 8;
const RECORD_SWIPE_DIRECTION_RATIO = 1.6;
const RECORD_SHEET_DIM_DURATION = 100;

const KOREAN_CATEGORY_LABELS: Record<string, string> = {
  'tourist attraction': '관광명소',
  attraction: '관광명소',
  sightseeing: '관광명소',
  landmark: '랜드마크',
  cafe: '카페',
  café: '카페',
  restaurant: '음식점',
  food: '음식점',
  park: '공원',
  museum: '박물관',
  gallery: '미술관',
  beach: '해변',
  viewpoint: '전망대',
  nightscape: '야경명소',
};

function makePhotoId() {
  return `photo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createCurrentTimeLabel() {
  return formatPlaceEntryTime(convertDateToPlaceEntryTime(new Date()));
}

function normalizeLookupKey(value?: string) {
  return value
    ?.trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[()]/g, '');
}

function containsKorean(value: string) {
  return /[가-힣]/.test(value);
}

function getKoreanCategoryLabel(value?: string) {
  const trimmedValue = value?.trim();
  const key = normalizeLookupKey(trimmedValue);

  if (!trimmedValue) {
    return '';
  }

  return getPlaceCategoryLabel(trimmedValue)
    || (key && KOREAN_CATEGORY_LABELS[key])
    || (containsKorean(trimmedValue) ? trimmedValue : '장소');
}

function parsePlaceDetailDate(value?: string | number | Date | null) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return null;
  }

  const compactMatch = trimmedValue.match(/^(\d{4})[-.]\s*(\d{1,2})[-.]\s*(\d{1,2})/);
  if (compactMatch) {
    return new Date(Number(compactMatch[1]), Number(compactMatch[2]) - 1, Number(compactMatch[3]));
  }

  const date = new Date(trimmedValue);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatKoreanPlaceDateLabel(value?: string | number | Date | null) {
  const date = parsePlaceDetailDate(value);

  if (!date) {
    const fallbackDate = value?.toString().trim().match(DATE_LABEL_PATTERN);
    if (!fallbackDate) {
      return value?.toString().trim() ?? '';
    }

    return `${fallbackDate[1]}. ${Number(fallbackDate[2])}. ${Number(fallbackDate[3])}`;
  }

  return [
    `${date.getFullYear()}.`,
    `${date.getMonth() + 1}.`,
    date.getDate(),
    KOREAN_WEEKDAY_LABELS[date.getDay()],
  ].join(' ');
}

function getPlaceDetailDayOption(label?: string): PlaceEntryDayOption | undefined {
  const parsedDate = parsePlaceDetailDate(label);

  if (!parsedDate) {
    return undefined;
  }

  const dateLabel = `${parsedDate.getFullYear()}.${parsedDate.getMonth() + 1}.${parsedDate.getDate()}`;
  const weekdayLabel = KOREAN_WEEKDAY_LABELS[parsedDate.getDay()];

  return {
    id: `place-detail-day-${dateLabel}`,
    dayNumber: 1,
    dateLabel,
    weekdayLabel,
  };
}

function createPlaceDetailDayOptionFromTripDay(day: TripDayRow): PlaceEntryDayOption {
  const parsedDate = parsePlaceDetailDate(day.date);

  if (!parsedDate) {
    return {
      id: day.id,
      dayNumber: day.day_index,
      dateLabel: day.date,
      weekdayLabel: '',
    };
  }

  return {
    id: day.id,
    dayNumber: day.day_index,
    dateLabel: `${parsedDate.getFullYear()}.${parsedDate.getMonth() + 1}.${parsedDate.getDate()}`,
    weekdayLabel: KOREAN_WEEKDAY_LABELS[parsedDate.getDay()],
  };
}

function getRecordSortValue(record: PlaceDetailRecord) {
  return new Date(record.createdAt).getTime();
}

function getRecordTimeSortValue(time?: string) {
  const matched = time?.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);

  if (!matched) {
    return null;
  }

  const hour = Number(matched[1]);
  const minute = Number(matched[2] ?? 0);
  const meridiem = matched[3].toUpperCase();

  if (hour < 1 || hour > 12 || minute < 0 || minute > 59) {
    return null;
  }

  const hour24 = meridiem === 'AM'
    ? hour % 12
    : (hour % 12) + 12;

  return hour24 * 60 + minute;
}

function coercePhotoDate(value: unknown) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }

  const normalizedValue = value.trim().replace(
    /^(\d{4}):(\d{2}):(\d{2})/,
    '$1-$2-$3',
  );
  const date = new Date(normalizedValue);

  return Number.isNaN(date.getTime()) ? null : date;
}

function getPhotoTakenDate(photo?: PlaceDetailPhoto) {
  if (!photo) {
    return null;
  }

  return coercePhotoDate(photo.takenAt)
    ?? coercePhotoDate(photo.photoTakenAt)
    ?? coercePhotoDate(photo.exifDateTimeOriginal)
    ?? coercePhotoDate(photo.timestamp)
    ?? coercePhotoDate(photo.createdAt);
}

function getEarliestRecordPhotoTakenDate(photoIds: string[], photos: PlaceDetailPhoto[]) {
  return photoIds.reduce<Date | null>((earliestDate, photoId) => {
    const photoDate = getPhotoTakenDate(photos.find((photo) => photo.id === photoId));

    if (!photoDate || (earliestDate && earliestDate <= photoDate)) {
      return earliestDate;
    }

    return photoDate;
  }, null);
}

function getParamValue(value?: string | string[]): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parseRoutePhotoUris(photoUris?: string | string[]): string[] {
  const rawValue = getParamValue(photoUris);

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
  const rawValue = getParamValue(value);

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

function getSerializablePhotoUris(photos: PlaceDetailPhoto[]): string[] {
  return photos
    .map((photo) => (
      typeof photo.source === 'object' && photo.source && 'uri' in photo.source
        ? photo.source.uri
        : undefined
    ))
    .filter((uri): uri is string => typeof uri === 'string' && uri.length > 0);
}

function hasDisplayableRecordContent(record: RecordRow) {
  return Boolean(record.text?.trim());
}

function createSupabasePlaceDetail(
  place: PlaceRow,
  placeRecords: RecordWithPhotos[],
  params: PlaceDetailRouteParams,
): PlaceDetailData {
  const firstRecord = placeRecords[0];
  const visitedAt = place.visited_at ?? firstRecord?.visited_at;
  const displayableRecords = placeRecords.filter(hasDisplayableRecordContent);

  return {
    categoryLabel: getPlaceCategoryDisplayLabel(
      place.category ?? getParamValue(params.categoryLabel),
    ),
    cityName: place.city ?? getParamValue(params.cityName) ?? '',
    countryName: place.country ?? getParamValue(params.countryName) ?? '',
    dateLabel: visitedAt ?? getParamValue(params.dateLabel) ?? '',
    dayId: place.trip_day_id ?? getParamValue(params.dayId) ?? '',
    photos: [],
    placeId: place.id,
    placeName: place.custom_name ?? place.name,
    records: displayableRecords.map((record) => ({
      createdAt: record.created_at,
      dayId: record.trip_day_id ?? place.trip_day_id ?? getParamValue(params.dayId) ?? '',
      id: record.id,
      photoIds: record.record_photos
        .filter((recordPhoto) => recordPhoto.deleted_at === null)
        .sort((left, right) => (
          left.sort_order - right.sort_order
          || left.created_at.localeCompare(right.created_at)
          || left.id.localeCompare(right.id)
        ))
        .map((recordPhoto) => recordPhoto.photo_id),
      placeId: record.place_id,
      text: record.text ?? undefined,
      time: formatVisitedAtTimeLabel(record.visited_at),
      tripId: record.trip_id,
      updatedAt: record.updated_at,
    })),
    timeLabel: formatVisitedAtTimeLabel(visitedAt),
    tripDateRange: getParamValue(params.dateLabel) ?? '',
    tripId: place.trip_id,
    tripName: getParamValue(params.cityName) ?? getParamValue(params.placeName) ?? 'Trip',
  };
}

function getRecordDayEntry(placeId?: string) {
  if (!placeId || isPlaceDetailDeleted(placeId)) {
    return undefined;
  }

  return RECORD_DAY_ENTRIES.find((entry) => (
    entry.id === placeId || entry.googlePlaceId === placeId
  ));
}

function getArchiveDayPlace(placeId?: string) {
  if (!placeId || isPlaceDetailDeleted(placeId)) {
    return undefined;
  }

  return MOCK_ARCHIVE_DETAIL.places.find((place) => place.id === placeId);
}

function createRecordDayFallbackDetail(params: PlaceDetailRouteParams): PlaceDetailData | undefined {
  const isRecordOrArchiveEntry =
    params.entryPoint === 'recordDayDetail' || params.entryPoint === 'archiveDayDetail';
  const canUseTimelineFallback =
    params.entryPoint === 'activeTripTimeline' &&
    Boolean(params.placeId) &&
    Boolean(getParamValue(params.placeName));

  if (
    (!isRecordOrArchiveEntry && !canUseTimelineFallback) ||
    !params.placeId ||
    isPlaceDetailDeleted(params.placeId)
  ) {
    return undefined;
  }

  const recordEntry = getRecordDayEntry(params.placeId);
  const archivePlace = getArchiveDayPlace(params.placeId);
  const routePhotoUris = parseRoutePhotoUris(params.photoUris);
  const routePhotoSourceIndexes = parseNumberArrayParam(params.photoSourceIndexes);
  const hasRoutePhotoSourceIndexes = getParamValue(params.photoSourceIndexes) !== undefined;
  const recordPhotoSources = recordEntry?.photoSources ?? [];
  const recordPhotoSourceEntries = routePhotoSourceIndexes.length > 0
    ? routePhotoSourceIndexes
      .map((sourceIndex) => ({ source: recordPhotoSources[sourceIndex], sourceIndex }))
      .filter((entry): entry is { source: ImageSourcePropType; sourceIndex: number } => Boolean(entry.source))
    : hasRoutePhotoSourceIndexes
      ? []
      : recordPhotoSources.map((source, sourceIndex) => ({ source, sourceIndex }));
  const photos: PlaceDetailPhoto[] = [
    ...recordPhotoSourceEntries.map(({ source, sourceIndex }) => ({
      id: `${params.placeId}-source-${sourceIndex}`,
      source,
    })),
    ...(archivePlace?.images ?? []).map((source, index) => ({
      id: `${params.placeId}-archive-${index}`,
      source,
    })),
    ...routePhotoUris.map((uri, index) => ({
      id: `${params.placeId}-uri-${index}`,
      source: { uri },
    })),
  ];
  const firstPhotoId = photos[0]?.id;
  const recordText = (
    getParamValue(params.recordText)
    ?? recordEntry?.text
    ?? archivePlace?.records?.[0]
    ?? archivePlace?.memo
  )?.trim();
  const records: PlaceDetailRecord[] = recordText
    ? [
      {
        id: `${params.placeId}-record-1`,
        tripId: params.tripId ?? (params.entryPoint === 'archiveDayDetail' ? MOCK_ARCHIVE_DETAIL.id : 'record-trip'),
        dayId: params.dayId ?? (params.entryPoint === 'archiveDayDetail' ? 'archive-day-1' : 'record-day'),
        placeId: params.placeId,
        time: getParamValue(params.timeLabel) ?? recordEntry?.time ?? archivePlace?.timeLabel,
        text: recordText,
        photoIds: firstPhotoId ? [firstPhotoId] : [],
        createdAt: new Date(0).toISOString(),
      },
    ]
    : [];

  return {
    // TODO: Generate place detail records from photo metadata groups when media analysis is connected.
    // TODO: Use placeId as the source of truth for timeline-to-place-detail navigation.
    tripId: params.tripId ?? (params.entryPoint === 'archiveDayDetail' ? MOCK_ARCHIVE_DETAIL.id : 'record-trip'),
    dayId: params.dayId ?? (params.entryPoint === 'archiveDayDetail' ? 'archive-day-1' : 'record-day'),
    placeId: params.placeId,
    placeName: getParamValue(params.placeName) ?? recordEntry?.place ?? archivePlace?.name ?? '',
    cityName: getParamValue(params.cityName) ?? recordEntry?.city ?? archivePlace?.city ?? '',
    countryName: getParamValue(params.countryName) ?? (archivePlace ? MOCK_ARCHIVE_DETAIL.country : ''),
    dateLabel: getParamValue(params.dateLabel) ?? MOCK_ARCHIVE_DETAIL.selectedDay.dateLabel ?? '',
    timeLabel: getParamValue(params.timeLabel) ?? recordEntry?.time ?? archivePlace?.timeLabel,
    categoryLabel: getParamValue(params.categoryLabel) ?? recordEntry?.category ?? archivePlace?.category,
    tripName: params.entryPoint === 'archiveDayDetail'
      ? MOCK_ARCHIVE_DETAIL.heroTitle
      : params.entryPoint === 'activeTripTimeline'
        ? (getParamValue(params.cityName) ?? getParamValue(params.placeName) ?? 'Active Trip')
        : 'Record Trip',
    tripDateRange: params.entryPoint === 'archiveDayDetail'
      ? MOCK_ARCHIVE_DETAIL.dateRangeLabel
      : getParamValue(params.dateLabel) ?? '',
    photos,
    records,
  };
}

type PlaceInfoState = {
  placeName: string;
  cityName: string;
  countryName: string;
  dateLabel: string;
  timeLabel: string;
  categoryLabel: string;
};

type DetailSyncSnapshot = {
  key: string;
  photos: PlaceDetailPhoto[];
  placeInfo: PlaceInfoState;
  records: PlaceDetailRecord[];
  recordTimeLabel: string;
};

function createPlaceInfoState(detail?: PlaceDetailData): PlaceInfoState {
  return {
    categoryLabel: detail?.categoryLabel ?? '',
    cityName: detail?.cityName ?? '',
    countryName: detail?.countryName ?? '',
    dateLabel: detail?.dateLabel ?? '',
    placeName: detail?.placeName ?? '',
    timeLabel: detail?.timeLabel ?? '',
  };
}

function sortPlaceDetailRecords(records?: PlaceDetailRecord[]) {
  return [...(records ?? [])].sort((a, b) => getRecordSortValue(a) - getRecordSortValue(b));
}

function getPhotoSyncKey(photo: PlaceDetailPhoto) {
  const sourceUri = typeof photo.source === 'object' && photo.source && 'uri' in photo.source
    ? photo.source.uri
    : '';

  return [
    photo.id,
    sourceUri,
    photo.takenAt ?? '',
    photo.photoTakenAt ?? '',
    photo.exifDateTimeOriginal ?? '',
    photo.timestamp ?? '',
    photo.createdAt ?? '',
  ].join(':');
}

function getRecordSyncKey(record: PlaceDetailRecord) {
  return [
    record.id,
    record.tripId,
    record.dayId,
    record.placeId,
    record.time ?? '',
    record.text ?? '',
    record.createdAt,
    record.updatedAt ?? '',
    (record.photoIds ?? []).join(','),
  ].join(':');
}

function buildDetailSyncKey(
  detail: PlaceDetailData | undefined,
  placeId: string | undefined,
  hasFetchedSupabasePlaceDetail: boolean,
) {
  if (!detail) {
    return [
      'empty',
      placeId ?? '',
      hasFetchedSupabasePlaceDetail ? 'fetched' : 'pending',
    ].join(':');
  }

  return [
    'detail',
    detail.tripId,
    detail.dayId,
    detail.placeId,
    detail.placeName,
    detail.cityName,
    detail.countryName,
    detail.dateLabel,
    detail.timeLabel ?? '',
    detail.categoryLabel ?? '',
    detail.tripName,
    detail.tripDateRange,
    (detail.photos ?? []).map(getPhotoSyncKey).join('|'),
    sortPlaceDetailRecords(detail.records).map(getRecordSyncKey).join('|'),
  ].join('::');
}

function createDetailSyncSnapshot(
  detail: PlaceDetailData | undefined,
  placeId: string | undefined,
  hasFetchedSupabasePlaceDetail: boolean,
): DetailSyncSnapshot {
  return {
    key: buildDetailSyncKey(detail, placeId, hasFetchedSupabasePlaceDetail),
    photos: detail?.photos ?? [],
    placeInfo: createPlaceInfoState(detail),
    records: sortPlaceDetailRecords(detail?.records),
    recordTimeLabel: detail?.timeLabel ?? '',
  };
}

function arePlaceInfoStatesEqual(a: PlaceInfoState, b: PlaceInfoState) {
  return (
    a.placeName === b.placeName &&
    a.cityName === b.cityName &&
    a.countryName === b.countryName &&
    a.dateLabel === b.dateLabel &&
    a.timeLabel === b.timeLabel &&
    a.categoryLabel === b.categoryLabel
  );
}

function arePhotoListsEqual(a: PlaceDetailPhoto[], b: PlaceDetailPhoto[]) {
  return a.length === b.length && a.every((photo, index) => getPhotoSyncKey(photo) === getPhotoSyncKey(b[index]));
}

function areRecordListsEqual(a: PlaceDetailRecord[], b: PlaceDetailRecord[]) {
  return a.length === b.length && a.every((record, index) => getRecordSyncKey(record) === getRecordSyncKey(b[index]));
}

function getDateKeyFromPlaceDetailLabel(value?: string) {
  const parsedDate = parsePlaceDetailDate(value);

  if (!parsedDate) {
    return undefined;
  }

  return [
    parsedDate.getFullYear(),
    String(parsedDate.getMonth() + 1).padStart(2, '0'),
    String(parsedDate.getDate()).padStart(2, '0'),
  ].join('-');
}

function resolveVisitedAtForPlaceUpdate(input: PlaceCreateInput, fallbackDateLabel?: string) {
  const dateKey =
    input.dateKey ??
    getDateKeyFromPlaceDetailLabel(input.dateLabel) ??
    getDateKeyFromPlaceDetailLabel(fallbackDateLabel);

  if (!dateKey) {
    return undefined;
  }

  return buildVisitedAtIso(dateKey, input.time);
}

export default function PlaceDetailScreen() {
  const params = useLocalSearchParams<PlaceDetailRouteParams>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { canUseSupabaseUserData, user } = useAuth();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const screenWidth = Math.max(320, width);
  const routeTripId = getParamValue(params.tripId);
  const routeDayId = getParamValue(params.dayId);
  const routePlaceId = getParamValue(params.placeId);
  const routeEntryPoint = getParamValue(params.entryPoint) as PlaceDetailRouteParams['entryPoint'];
  const routeOpenPhotoGrid = getParamValue(params.openPhotoGrid);
  const routePhotoGridMode = getParamValue(params.photoGridMode) as PlaceDetailRouteParams['photoGridMode'];
  const routePhotoSourceIndexes = getParamValue(params.photoSourceIndexes);
  const routePlaceName = getParamValue(params.placeName);
  const routeCityName = getParamValue(params.cityName);
  const routeCountryName = getParamValue(params.countryName);
  const routeCategoryLabel = getParamValue(params.categoryLabel);
  const routeDateLabel = getParamValue(params.dateLabel);
  const routeTimeLabel = getParamValue(params.timeLabel);
  const routeRecordText = getParamValue(params.recordText);
  const routePhotoUris = getParamValue(params.photoUris);
  const stableParams = React.useMemo<PlaceDetailRouteParams>(
    () => ({
      categoryLabel: routeCategoryLabel,
      cityName: routeCityName,
      countryName: routeCountryName,
      dateLabel: routeDateLabel,
      dayId: routeDayId,
      entryPoint: routeEntryPoint,
      openPhotoGrid: routeOpenPhotoGrid,
      photoGridMode: routePhotoGridMode,
      photoSourceIndexes: routePhotoSourceIndexes,
      photoUris: routePhotoUris,
      placeId: routePlaceId,
      placeName: routePlaceName,
      recordText: routeRecordText,
      timeLabel: routeTimeLabel,
      tripId: routeTripId,
    }),
    [
      routeCategoryLabel,
      routeCityName,
      routeCountryName,
      routeDateLabel,
      routeDayId,
      routeEntryPoint,
      routeOpenPhotoGrid,
      routePhotoGridMode,
      routePhotoSourceIndexes,
      routePhotoUris,
      routePlaceId,
      routePlaceName,
      routeRecordText,
      routeTimeLabel,
      routeTripId,
    ],
  );
  const shouldUseSupabasePlaceDetail = isSupabaseUuid(routePlaceId);
  const isRouteBackedDetectedPlace =
    routeEntryPoint === 'recordDayDetail' &&
    Boolean(routePlaceId) &&
    Boolean(routePlaceName) &&
    !shouldUseSupabasePlaceDetail;
  const {
    data: supabasePlaceDetailData,
    isError: isSupabasePlaceDetailError,
    isFetched: hasFetchedSupabasePlaceDetail,
    isPending: isSupabasePlaceDetailPending,
    refetch: refetchPlaceDetailData,
  } =
    usePlaceDetailData(routePlaceId);
  const {
    data: supabasePlacePhotos,
    isError: isPlacePhotosError,
    isFetched: hasFetchedPlacePhotos,
    isPending: isPlacePhotosPending,
    refetch: refetchPlacePhotos,
  } = usePlacePhotos(routePlaceId);
  const deletePlaceRecordMutation = useDeletePlaceRecord();

  const initialDetail = React.useMemo(
    () => {
      if (supabasePlaceDetailData?.place) {
        return createSupabasePlaceDetail(
          supabasePlaceDetailData.place,
          supabasePlaceDetailData.records,
          stableParams,
        );
      }

      if (shouldUseSupabasePlaceDetail && hasFetchedSupabasePlaceDetail) {
        return undefined;
      }

      if (shouldUseSupabasePlaceDetail && !hasFetchedSupabasePlaceDetail) {
        return undefined;
      }

      if (isRouteBackedDetectedPlace) {
        return createRecordDayFallbackDetail(stableParams);
      }

      if (canUseSupabaseUserData) {
        return undefined;
      }

      return (
        isPlaceDetailDeleted(routePlaceId)
        ? undefined
        : getMockPlaceDetail(routeTripId, routeDayId, routePlaceId)
      ?? createRecordDayFallbackDetail(stableParams)
      );
    },
    [
      canUseSupabaseUserData,
      hasFetchedSupabasePlaceDetail,
      isRouteBackedDetectedPlace,
      routeDayId,
      routePlaceId,
      routeTripId,
      shouldUseSupabasePlaceDetail,
      stableParams,
      supabasePlaceDetailData,
    ],
  );

  const [placeInfo, setPlaceInfo] = React.useState(() => ({
    placeName: initialDetail?.placeName ?? '',
    cityName: initialDetail?.cityName ?? '',
    countryName: initialDetail?.countryName ?? '',
    dateLabel: initialDetail?.dateLabel ?? '',
    timeLabel: initialDetail?.timeLabel ?? '',
    categoryLabel: initialDetail?.categoryLabel ?? '',
  }));
  const [photos, setPhotos] = React.useState<PlaceDetailPhoto[]>(initialDetail?.photos ?? []);
  const [records, setRecords] = React.useState<PlaceDetailRecord[]>(
    [...(initialDetail?.records ?? [])].sort((a, b) => getRecordSortValue(a) - getRecordSortValue(b)),
  );
  const [heroIndex, setHeroIndex] = React.useState(0);
  const [isMoreOpen, setMoreOpen] = React.useState(false);
  const [viewerIndex, setViewerIndex] = React.useState(0);
  const [isUpdatingCoverPhoto, setUpdatingCoverPhoto] = React.useState(false);
  const [viewerPhotoIds, setViewerPhotoIds] = React.useState<string[] | null>(null);
  const [isViewerViewOnly, setViewerViewOnly] = React.useState(false);
  const [isViewerOpen, setViewerOpen] = React.useState(false);
  const [isGridOpen, setGridOpen] = React.useState(false);
  const [photoGridSessionKey, setPhotoGridSessionKey] = React.useState(0);
  const [isGridViewOnly, setGridViewOnly] = React.useState(false);
  const [isGridSelectionInitiallyEnabled, setGridSelectionInitiallyEnabled] = React.useState(false);
  const [gridSelectionPurpose, setGridSelectionPurpose] =
    React.useState<'recordCreate' | 'linkRecord' | 'coverSelect'>('recordCreate');
  const [isRecordPhotoPickerTransitioning, setRecordPhotoPickerTransitioning] = React.useState(false);
  const [isRecordModalOpen, setRecordModalOpen] = React.useState(false);
  const [isPlaceInfoModalOpen, setPlaceInfoModalOpen] = React.useState(false);
  const [recordModalMode, setRecordModalMode] = React.useState<'sheet' | 'screen'>('sheet');
  const [selectedRecordPhotoIds, setSelectedRecordPhotoIds] = React.useState<string[]>([]);
  const [recordDraft, setRecordDraft] = React.useState('');
  const [recordTimeLabel, setRecordTimeLabel] = React.useState(initialDetail?.timeLabel ?? '');
  const [editingRecordId, setEditingRecordId] = React.useState<string | null>(null);
  const [hasRecordTimeBeenEdited, setRecordTimeEdited] = React.useState(false);
  const [isRecordSaving, setRecordSaving] = React.useState(false);
  const [isRecordDeleting, setRecordDeleting] = React.useState(false);
  const [isDeleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [isPhotoDeleting, setPhotoDeleting] = React.useState(false);
  const [pendingDeleteRecordId, setPendingDeleteRecordId] = React.useState<string | null>(null);
  const [openSwipeRecordId, setOpenSwipeRecordId] = React.useState<string | null>(null);
  const [isRecordSwipeActive, setRecordSwipeActive] = React.useState(false);
  const [gridSelectionResetSignal, setGridSelectionResetSignal] = React.useState(0);
  const isRecordSavingRef = React.useRef(false);
  const isRecordDeletingRef = React.useRef(false);
  const isPhotoUploadingRef = React.useRef(false);
  const isPhotoDeletingRef = React.useRef(false);
  const isPhotoScreenMountedRef = React.useRef(true);
  const [isPhotoUploading, setPhotoUploading] = React.useState(false);
  const [failedPhotoUploadItems, setFailedPhotoUploadItems] =
    React.useState<UploadPlacePhotoItem[]>([]);
  const pendingRecordPhotoGridOpenRef = React.useRef(false);
  const pendingRecordModalCleanupRef = React.useRef(false);
  const pendingRecordSheetRestoreRef = React.useRef(false);
  const supabaseTripIdForPlace = shouldUseSupabasePlaceDetail && isSupabaseUuid(initialDetail?.tripId)
    ? initialDetail?.tripId
    : undefined;
  const { data: placeTripDays } = useTripDays(supabaseTripIdForPlace);
  const detailSyncSnapshot = createDetailSyncSnapshot(
    initialDetail,
    routePlaceId,
    hasFetchedSupabasePlaceDetail,
  );
  const detailSyncSnapshotRef = React.useRef(detailSyncSnapshot);
  detailSyncSnapshotRef.current = detailSyncSnapshot;
  const detailSyncKey = detailSyncSnapshot.key;

  React.useLayoutEffect(() => {
    const snapshot = detailSyncSnapshotRef.current;

    setPlaceInfo((current) => (
      arePlaceInfoStatesEqual(current, snapshot.placeInfo) ? current : snapshot.placeInfo
    ));
    setPhotos((current) => (arePhotoListsEqual(current, snapshot.photos) ? current : snapshot.photos));
    setRecords((current) => (areRecordListsEqual(current, snapshot.records) ? current : snapshot.records));
    setRecordTimeLabel((current) => (
      current === snapshot.recordTimeLabel ? current : snapshot.recordTimeLabel
    ));
  }, [detailSyncKey]);

  React.useEffect(() => {
    if (!shouldUseSupabasePlaceDetail || !hasFetchedPlacePhotos) {
      return;
    }

    const nextPhotos = (supabasePlacePhotos ?? [])
      .filter((photo) => Boolean(photo.displayUrl))
      .map((photo): PlaceDetailPhoto => ({
        createdAt: photo.created_at,
        id: photo.id,
        source: { uri: photo.displayUrl as string },
        takenAt: photo.taken_at ?? undefined,
      }));

    setPhotos((current) => (
      arePhotoListsEqual(current, nextPhotos) ? current : nextPhotos
    ));
  }, [
    detailSyncKey,
    hasFetchedPlacePhotos,
    shouldUseSupabasePlaceDetail,
    supabasePlacePhotos,
  ]);

  const prepareRecordComposer = React.useCallback((photoIds: string[]) => {
    setEditingRecordId(null);
    setSelectedRecordPhotoIds(photoIds);
    setRecordDraft('');
    const earliestPhotoDate = getEarliestRecordPhotoTakenDate(photoIds, photos);
    setRecordTimeLabel(
      earliestPhotoDate
        ? formatPlaceEntryTime(convertDateToPlaceEntryTime(earliestPhotoDate))
        : createCurrentTimeLabel(),
    );
    setRecordTimeEdited(false);
  }, [photos]);

  const openRecordEditor = React.useCallback((recordId: string) => {
    const record = records.find((item) => item.id === recordId);

    if (!record) {
      return;
    }

    setOpenSwipeRecordId(null);
    pendingRecordModalCleanupRef.current = false;
    setEditingRecordId(record.id);
    setSelectedRecordPhotoIds(record.photoIds ?? []);
    setRecordDraft(record.text ?? '');
    setRecordTimeLabel(record.time ?? '');
    setRecordTimeEdited(false);
    setRecordModalMode('sheet');
    setRecordModalOpen(true);
  }, [records]);

  const openRecordComposer = React.useCallback((
    photoIds: string[],
    mode: 'sheet' | 'screen',
  ) => {
    pendingRecordModalCleanupRef.current = false;
    prepareRecordComposer(photoIds);
    setRecordModalMode(mode);
    setRecordModalOpen(true);
  }, [prepareRecordComposer]);

  React.useEffect(() => () => {
    pendingRecordModalCleanupRef.current = false;
    pendingRecordPhotoGridOpenRef.current = false;
    pendingRecordSheetRestoreRef.current = false;
  }, []);

  React.useEffect(() => {
    isPhotoScreenMountedRef.current = true;

    return () => {
      isPhotoScreenMountedRef.current = false;
    };
  }, []);

  const initialDetailPlaceId = initialDetail?.placeId;

  React.useEffect(() => {
    if (routeOpenPhotoGrid === '1' && initialDetailPlaceId) {
      setGridViewOnly(routePhotoGridMode !== 'recordCreate');
      setGridSelectionInitiallyEnabled(false);
      setGridOpen(true);
    }
  }, [initialDetailPlaceId, routeOpenPhotoGrid, routePhotoGridMode]);

  const viewerPhotos = React.useMemo<PlaceDetailPhoto[]>(() => {
    if (!viewerPhotoIds) {
      return photos;
    }

    const scopedPhotos = viewerPhotoIds
      .map((photoId) => photos.find((photo) => photo.id === photoId))
      .filter((photo): photo is PlaceDetailPhoto => Boolean(photo));

    return scopedPhotos.length > 0 ? scopedPhotos : photos;
  }, [photos, viewerPhotoIds]);

  const viewerImages = React.useMemo<ImageSourcePropType[]>(
    () => viewerPhotos.map((photo) => photo.source),
    [viewerPhotos],
  );
  const failedPlacePhotoCount = React.useMemo(
    () => (supabasePlacePhotos ?? []).filter(
      (photo) => photo.displayUrlStatus === 'failed',
    ).length,
    [supabasePlacePhotos],
  );
  const missingPlacePhotoCount = React.useMemo(
    () => (supabasePlacePhotos ?? []).filter(
      (photo) => photo.displayUrlStatus === 'missing',
    ).length,
    [supabasePlacePhotos],
  );
  const selectedRecordPhotos = React.useMemo(
    () => selectedRecordPhotoIds
      .map((photoId) => photos.find((photo) => photo.id === photoId))
      .filter((photo): photo is PlaceDetailPhoto => Boolean(photo)),
    [photos, selectedRecordPhotoIds],
  );
  const sortedRecords = React.useMemo(
    () => records
      .map((record, index) => ({ index, record }))
      .sort((a, b) => {
        const aTime = getRecordTimeSortValue(a.record.time);
        const bTime = getRecordTimeSortValue(b.record.time);

        if (aTime != null && bTime != null && aTime !== bTime) {
          return aTime - bTime;
        }

        if (aTime != null && bTime == null) {
          return -1;
        }

        if (aTime == null && bTime != null) {
          return 1;
        }

        const createdAtDifference =
          getRecordSortValue(a.record) - getRecordSortValue(b.record);

        if (Number.isFinite(createdAtDifference) && createdAtDifference !== 0) {
          return createdAtDifference;
        }

        return a.index - b.index;
      })
      .map(({ record }) => record),
    [records],
  );
  const placeMetaLabel = React.useMemo(() => {
    const category = getKoreanCategoryLabel(placeInfo.categoryLabel);
    const localizedGeography = localizeSavedPlaceGeography({
      city: placeInfo.cityName,
      country: placeInfo.countryName,
    });
    const location = [localizedGeography.cityName, localizedGeography.countryName]
      .filter(Boolean)
      .join(', ');

    return [category, location].filter(Boolean).join(' · ');
  }, [placeInfo.categoryLabel, placeInfo.cityName, placeInfo.countryName]);
  const dateDisplayLabel = React.useMemo(
    () => formatKoreanPlaceDateLabel(placeInfo.dateLabel),
    [placeInfo.dateLabel],
  );
  const placeInfoDayOption = React.useMemo(
    () => getPlaceDetailDayOption(placeInfo.dateLabel),
    [placeInfo.dateLabel],
  );
  const placeInfoDayOptions = React.useMemo(() => {
    if (shouldUseSupabasePlaceDetail && placeTripDays && placeTripDays.length > 0) {
      return placeTripDays.map(createPlaceDetailDayOptionFromTripDay);
    }

    return placeInfoDayOption ? [placeInfoDayOption] : [];
  }, [placeInfoDayOption, placeTripDays, shouldUseSupabasePlaceDetail]);
  const selectedPlaceInfoDayId = React.useMemo(() => {
    if (shouldUseSupabasePlaceDetail) {
      return initialDetail?.dayId && placeInfoDayOptions.some((day) => day.id === initialDetail.dayId)
        ? initialDetail.dayId
        : placeInfoDayOptions[0]?.id;
    }

    return placeInfoDayOption?.id;
  }, [initialDetail?.dayId, placeInfoDayOption?.id, placeInfoDayOptions, shouldUseSupabasePlaceDetail]);

  const handleCloseSwipeRecord = React.useCallback(() => {
    setOpenSwipeRecordId(null);
  }, []);

  const requestDeleteRecord = React.useCallback((recordId: string) => {
    setOpenSwipeRecordId(null);
    setPendingDeleteRecordId(recordId);
  }, []);

  const cancelDeleteRecord = React.useCallback(() => {
    if (isRecordDeletingRef.current) {
      return;
    }

    setPendingDeleteRecordId(null);
  }, []);

  const confirmDeleteRecord = React.useCallback(async () => {
    if (
      !pendingDeleteRecordId ||
      isRecordDeletingRef.current ||
      isRecordDeleting
    ) {
      return;
    }

    if (shouldUseSupabasePlaceDetail) {
      const tripDayId = initialDetail?.dayId || routeDayId || '';
      const tripId = initialDetail?.tripId || routeTripId || '';
      const placeId = initialDetail?.placeId || routePlaceId || '';

      if (!tripDayId || !tripId || !placeId) {
        Alert.alert(
          '\uAE30\uB85D\uC744 \uC0AD\uC81C\uD558\uC9C0 \uBABB\uD588\uC5B4\uC694',
          '\uC5EC\uD589 \uB0A0\uC9DC\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC5B4\uC694. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574\uC8FC\uC138\uC694.',
        );
        return;
      }

      isRecordDeletingRef.current = true;
      setRecordDeleting(true);

      try {
        await softDeleteRecord(pendingDeleteRecordId, {
          placeId,
          tripDayId,
          tripId,
        });
        setRecords((currentRecords) =>
          currentRecords.filter((record) => record.id !== pendingDeleteRecordId),
        );
        setPendingDeleteRecordId(null);

        void Promise.all([
          queryClient.invalidateQueries({
            queryKey: supabaseQueryKeys.placeDetail(user?.id, placeId),
          }),
          queryClient.invalidateQueries({
            queryKey: supabaseQueryKeys.tripDayPlaces(user?.id, tripDayId),
          }),
          queryClient.invalidateQueries({
            queryKey: supabaseQueryKeys.tripDayRecords(user?.id, tripDayId),
          }),
          queryClient.invalidateQueries({
            queryKey: supabaseQueryKeys.tripRecords(user?.id, tripId),
          }),
          queryClient.invalidateQueries({
            queryKey: supabaseQueryKeys.tripDays(user?.id, tripId),
          }),
        ]).catch((error: unknown) => {
          console.warn('[place-detail] invalidate after record delete failed', error);
        });
      } catch (error) {
        console.warn('[place-detail] delete record failed', error);
        Alert.alert(
          '\uAE30\uB85D\uC744 \uC0AD\uC81C\uD558\uC9C0 \uBABB\uD588\uC5B4\uC694',
          '\uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574\uC8FC\uC138\uC694.',
        );
      } finally {
        isRecordDeletingRef.current = false;
        setRecordDeleting(false);
      }

      return;
    }

    setRecords((currentRecords) =>
      currentRecords.filter((record) => record.id !== pendingDeleteRecordId),
    );
    setPendingDeleteRecordId(null);
  }, [
    initialDetail?.dayId,
    initialDetail?.placeId,
    initialDetail?.tripId,
    isRecordDeleting,
    pendingDeleteRecordId,
    queryClient,
    routeDayId,
    routePlaceId,
    routeTripId,
    shouldUseSupabasePlaceDetail,
    user?.id,
  ]);

  const handleConfirmDeletePlace = React.useCallback(async () => {
    if (!initialDetail) {
      return;
    }

    try {
      let storageCleanupIncomplete = false;

      if (shouldUseSupabasePlaceDetail) {
        const result = await deletePlaceRecordMutation.mutateAsync({
          placeId: initialDetail.placeId,
          tripDayId: initialDetail.dayId || routeDayId || '',
          tripId: initialDetail.tripId || routeTripId || '',
        });
        storageCleanupIncomplete = result.storageCleanupIncomplete;
      }

      markPlaceDetailDeleted(initialDetail.placeId);
      setDeleteConfirmOpen(false);
      router.back();

      if (storageCleanupIncomplete) {
        Alert.alert(
          '\uC7A5\uC18C\uB294 \uC0AD\uC81C\uB410\uC5B4\uC694',
          '\uC77C\uBD80 \uC0AC\uC9C4 \uD30C\uC77C \uC815\uB9AC\uAC00 \uB0A8\uC544 \uC788\uC5B4 \uB2E4\uC74C \uC571 \uC2E4\uD589 \uB54C \uC790\uB3D9\uC73C\uB85C \uB2E4\uC2DC \uC815\uB9AC\uD569\uB2C8\uB2E4.',
        );
      }
    } catch (error) {
      console.warn('[place-detail] delete place failed', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      Alert.alert(
        '\uC7A5\uC18C\uB97C \uC0AD\uC81C\uD558\uC9C0 \uBABB\uD588\uC5B4\uC694',
        `\uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574\uC8FC\uC138\uC694.\n\uAC1C\uBC1C \uC815\uBCF4: ${errorMessage}`,
      );
    }
  }, [
    deletePlaceRecordMutation,
    initialDetail,
    routeDayId,
    routeTripId,
    router,
    shouldUseSupabasePlaceDetail,
  ]);

  const isInitialSupabasePlaceDetailLoading = shouldUseSupabasePlaceDetail
    && !initialDetail
    && !isSupabasePlaceDetailError
    && (isSupabasePlaceDetailPending || !hasFetchedSupabasePlaceDetail);

  if (isInitialSupabasePlaceDetailLoading) {
    return (
      <SafeAreaView style={styles.root}>
        <StatusBar style="dark" />
        <View style={styles.header}>
          <Pressable accessibilityRole="button" hitSlop={10} onPress={() => router.back()} style={styles.headerButton}>
            <Feather name="chevron-left" size={28} color={Colors.foundation.black} />
          </Pressable>
        </View>
        <View style={styles.emptyState}>
          <ActivityIndicator color={Colors.foundation.black} />
          <Text style={styles.emptyDescription}>{'장소 정보를 불러오는 중이에요'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (shouldUseSupabasePlaceDetail && !initialDetail && isSupabasePlaceDetailError) {
    return (
      <SafeAreaView style={styles.root}>
        <StatusBar style="dark" />
        <View style={styles.header}>
          <Pressable accessibilityRole="button" hitSlop={10} onPress={() => router.back()} style={styles.headerButton}>
            <Feather name="chevron-left" size={28} color={Colors.foundation.black} />
          </Pressable>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>{'장소 정보를 불러오지 못했어요'}</Text>
          <Text style={styles.emptyDescription}>{'네트워크 상태를 확인한 뒤 다시 시도해주세요.'}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => void refetchPlaceDetailData()}
            style={styles.photoStatusAction}
          >
            <Text style={styles.photoStatusActionText}>{'다시 시도'}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (!initialDetail) {
    return (
      <SafeAreaView style={styles.root}>
        <StatusBar style="dark" />
        <View style={styles.header}>
          <Pressable accessibilityRole="button" hitSlop={10} onPress={() => router.back()} style={styles.headerButton}>
            <Feather name="chevron-left" size={28} color={Colors.foundation.black} />
          </Pressable>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>{'\uC7A5\uC18C\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC5B4\uC694'}</Text>
          <Text style={styles.emptyDescription}>{'\uC774\uC804 \uD654\uBA74\uC73C\uB85C \uB3CC\uC544\uAC00 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const openViewer = (index: number, photoIds?: string[], viewOnly = false) => {
    const nextViewerPhotos = photoIds
      ? photoIds
        .map((photoId) => photos.find((photo) => photo.id === photoId))
        .filter((photo): photo is PlaceDetailPhoto => Boolean(photo))
      : photos;

    if (nextViewerPhotos.length === 0) {
      return;
    }

    setViewerPhotoIds(photoIds ?? null);
    setViewerViewOnly(viewOnly);
    setViewerIndex(Math.max(0, Math.min(index, nextViewerPhotos.length - 1)));
    setViewerOpen(true);
  };

  const openPhotoGrid = (selectionMode = false, viewOnly = false) => {
    setGridViewOnly(viewOnly);
    setGridSelectionInitiallyEnabled(selectionMode);
    setPhotoGridSessionKey((currentKey) => currentKey + 1);
    setGridOpen(true);
  };

  const requestRecordSheetRestoreAfterPhotoGrid = () => {
    if (pendingRecordSheetRestoreRef.current) {
      return false;
    }

    pendingRecordSheetRestoreRef.current = true;
    setRecordPhotoPickerTransitioning(true);
    setGridOpen(false);
    return true;
  };

  const handlePhotoGridDidDismiss = () => {
    if (!pendingRecordSheetRestoreRef.current) {
      return;
    }

    pendingRecordSheetRestoreRef.current = false;
    pendingRecordModalCleanupRef.current = false;
    setGridSelectionPurpose('recordCreate');
    setRecordPhotoPickerTransitioning(false);
    setRecordModalOpen(true);
  };

  const handleClosePhotoGrid = () => {
    if (isPhotoDeletingRef.current) {
      return;
    }

    if (gridSelectionPurpose === 'coverSelect') {
      setGridOpen(false);
      setGridSelectionPurpose('recordCreate');
      return;
    }

    if (gridSelectionPurpose === 'linkRecord') {
      requestRecordSheetRestoreAfterPhotoGrid();
      return;
    }

    if (params.entryPoint === 'recordDayDetail' && params.openPhotoGrid === '1') {
      const remainingPhotoIds = new Set(photos.map((photo) => photo.id));
      const deletedSourceIndexes = initialDetail.photos
        .map((photo) => {
          const matched = photo.id.match(/-source-(\d+)$/);
          return matched && !remainingPhotoIds.has(photo.id) ? Number(matched[1]) : undefined;
        })
        .filter((index): index is number => Number.isInteger(index));

      setGridSelectionInitiallyEnabled(false);
      setGridViewOnly(false);
      setGridOpen(false);
      router.replace({
        pathname: '/record-day-detail',
        params: {
          tripId: params.tripId ?? initialDetail.tripId,
          dayId: params.dayId ?? initialDetail.dayId,
          tripDayId: params.tripDayId ?? params.dayId ?? initialDetail.dayId,
          updatedPlaceId: initialDetail.placeId,
          updatedPhotoUris: JSON.stringify(getSerializablePhotoUris(photos)),
          deletedSourceIndexes: JSON.stringify(deletedSourceIndexes),
        },
      });
      return;
    }

    if (params.entryPoint === 'archiveDayDetail' && params.openPhotoGrid === '1') {
      setGridSelectionInitiallyEnabled(false);
      setGridViewOnly(false);
      setGridOpen(false);
      router.replace({
        pathname: '/day-archive-detail',
        params: {
          tripId: params.tripId ?? initialDetail.tripId,
          dayId: params.dayId ?? initialDetail.dayId,
        },
      });
      return;
    }

    setGridOpen(false);
  };

  const handleHeroScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setHeroIndex(Math.round(event.nativeEvent.contentOffset.x / screenWidth));
  };

  const uploadSelectedPlacePhotos = async (items: UploadPlacePhotoItem[]) => {
    if (isPhotoUploadingRef.current || items.length === 0) {
      return;
    }

    isPhotoUploadingRef.current = true;
    setPhotoUploading(true);

    try {
      const uploadResult = await uploadPlacePhotos(items);
      if (isPhotoScreenMountedRef.current) {
        setFailedPhotoUploadItems(uploadResult.failedItems);
      }

      const uploadContext = items[0]?.input;
      if (uploadContext) {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: supabaseQueryKeys.archivedTravelMoments(user?.id),
          }),
          queryClient.invalidateQueries({
            queryKey: supabaseQueryKeys.tripDayPhotos(user?.id, uploadContext.tripDayId),
          }),
          queryClient.invalidateQueries({
            queryKey: supabaseQueryKeys.tripPhotos(user?.id, uploadContext.tripId),
          }),
        ]);
      }

      const refreshResult = await refetchPlacePhotos();
      if (!isPhotoScreenMountedRef.current) {
        return;
      }

      if (refreshResult.isError) {
        Alert.alert(
          '\uC0AC\uC9C4\uC740 \uC800\uC7A5\uB410\uC9C0\uB9CC \uBAA9\uB85D\uC744 \uC0C8\uB85C\uACE0\uCE58\uC9C0 \uBABB\uD588\uC5B4\uC694',
          '\uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uD655\uC778\uD574 \uC8FC\uC138\uC694.',
        );
        return;
      }

      if (uploadResult.failedItems.length > 0) {
        Alert.alert(
          '\uC77C\uBD80 \uC0AC\uC9C4\uC744 \uCD94\uAC00\uD558\uC9C0 \uBABB\uD588\uC5B4\uC694',
          '\uC2E4\uD328\uD55C \uC0AC\uC9C4\uB9CC \uB2E4\uC2DC \uC2DC\uB3C4\uD560 \uC218 \uC788\uC5B4\uC694.',
          [
            { text: '\uB098\uC911\uC5D0' },
            {
              text: '\uB2E4\uC2DC \uC2DC\uB3C4',
              onPress: () => {
                void uploadSelectedPlacePhotos(uploadResult.failedItems);
              },
            },
          ],
        );
      }
    } finally {
      isPhotoUploadingRef.current = false;
      if (isPhotoScreenMountedRef.current) {
        setPhotoUploading(false);
      }
    }
  };

  const handleAddPhoto = async () => {
    setMoreOpen(false);

    if (isPhotoUploadingRef.current) {
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      exif: true,
      quality: 1,
    });

    if (result.canceled) {
      return;
    }

    if (!shouldUseSupabasePlaceDetail) {
      const addedPhotos = result.assets.map((asset) => {
        const takenAt = extractPhotoTakenAt(asset);

        return {
          id: makePhotoId(),
          source: { uri: asset.uri },
          takenAt: takenAt?.toISOString(),
        };
      });

      setPhotos((currentPhotos) => [...currentPhotos, ...addedPhotos]);
      return;
    }

    const tripId = initialDetail.tripId || routeTripId || '';
    const tripDayId = initialDetail.dayId || routeDayId || '';
    const placeId = initialDetail.placeId || routePlaceId || '';

    if (!user?.id || !tripId || !tripDayId || !placeId) {
      Alert.alert(
        '\uC0AC\uC9C4\uC744 \uCD94\uAC00\uD560 \uC218 \uC5C6\uC5B4\uC694',
        '\uC5EC\uD589\uACFC \uC7A5\uC18C \uC815\uBCF4\uB97C \uD655\uC778\uD55C \uB4A4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.',
      );
      return;
    }

    const items = result.assets.map((asset): UploadPlacePhotoItem => {
      const takenAt = extractPhotoTakenAt(asset);
      const sourceIdentifier = asset.assetId?.trim() || [
        asset.uri,
        asset.fileSize ?? '',
        asset.width,
        asset.height,
      ].join(':');

      return {
        input: {
          exif: asset.exif,
          fileName: asset.fileName,
          fileSize: asset.fileSize,
          height: asset.height,
          localUri: asset.uri,
          mimeType: asset.mimeType,
          placeId,
          takenAt: takenAt?.toISOString(),
          tripDayId,
          tripId,
          width: asset.width,
        },
        sourceIdentifier,
      };
    });

    await uploadSelectedPlacePhotos(items);
  };

  const resetRecordModalState = () => {
    setRecordDraft('');
    setSelectedRecordPhotoIds([]);
    setRecordTimeLabel(createCurrentTimeLabel());
    setRecordTimeEdited(false);
    setEditingRecordId(null);
  };

  const closeRecordModalWithCleanup = () => {
    pendingRecordPhotoGridOpenRef.current = false;
    pendingRecordModalCleanupRef.current = true;
    setRecordModalOpen(false);
  };

  const handleSaveRecord = async () => {
    if (isRecordSavingRef.current || isRecordSaving) {
      return;
    }

    const trimmedText = recordDraft.trim();
    if (!trimmedText) {
      return;
    }
    const editingRecord = editingRecordId
      ? records.find((record) => record.id === editingRecordId)
      : undefined;

    if (editingRecordId && !editingRecord) {
      Alert.alert(
        '\uAE30\uB85D\uC744 \uC218\uC815\uD558\uC9C0 \uBABB\uD588\uC5B4\uC694',
        '\uC218\uC815\uD560 \uAE30\uB85D\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC5B4\uC694. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574\uC8FC\uC138\uC694.',
      );
      return;
    }

    if (shouldUseSupabasePlaceDetail) {
      const tripDayId = initialDetail.dayId || routeDayId || '';
      const tripId = initialDetail.tripId || routeTripId || '';

      if (!tripDayId || !tripId) {
        Alert.alert(
          '\uAE30\uB85D\uC744 \uC800\uC7A5\uD558\uC9C0 \uBABB\uD588\uC5B4\uC694',
          '\uC5EC\uD589 \uB0A0\uC9DC\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC5B4\uC694. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574\uC8FC\uC138\uC694.',
        );
        return;
      }

      isRecordSavingRef.current = true;
      setRecordSaving(true);

      try {
        const tripDayDate = placeTripDays?.find(
          (day) => day.id === tripDayId && day.deleted_at == null,
        )?.date;
        const visitedAt = resolveVisitedAtForPlaceUpdate(
          {
            dateKey: tripDayDate,
            place: placeInfo.placeName,
            time: recordTimeLabel,
          },
          placeInfo.dateLabel,
        ) ?? null;
        const refreshRecordQueries = () => {
          void refetchPlaceDetailData();
          void Promise.all([
            queryClient.invalidateQueries({
              queryKey: supabaseQueryKeys.placeDetail(user?.id, initialDetail.placeId),
            }),
            queryClient.invalidateQueries({
              queryKey: supabaseQueryKeys.tripDayPlaces(user?.id, tripDayId),
            }),
            queryClient.invalidateQueries({
              queryKey: supabaseQueryKeys.tripDayRecords(user?.id, tripDayId),
            }),
            queryClient.invalidateQueries({
              queryKey: supabaseQueryKeys.tripRecords(user?.id, tripId),
            }),
            queryClient.invalidateQueries({
              queryKey: supabaseQueryKeys.tripDays(user?.id, tripId),
            }),
          ]).catch((error: unknown) => {
            console.warn('[place-detail] invalidate after record save failed', error);
          });
        };
        const savedRecord = editingRecordId
          ? await updateRecord(
            editingRecordId,
            {
              text: trimmedText,
              visited_at: visitedAt,
            },
            {
              placeId: initialDetail.placeId,
              tripDayId,
              tripId,
            },
          )
          : await createRecordForPlace({
            placeId: initialDetail.placeId,
            text: trimmedText,
            tripDayId,
            tripId,
            visitedAt,
          });

        let syncedPhotoIds: string[];

        try {
          const syncResult = await syncRecordPhotos(
            savedRecord.id,
            selectedRecordPhotoIds,
            {
              placeId: initialDetail.placeId,
              tripDayId,
              tripId,
            },
          );
          syncedPhotoIds = syncResult.photoIds;
        } catch (error) {
          if (__DEV__) {
            console.warn('[place-detail] record photo sync failed', {
              errorMessage: error instanceof Error ? error.message : 'Unknown error',
              recordSaved: true,
              stage: 'sync_record_photos',
            });
          }

          if (editingRecord) {
            setRecords((currentRecords) => currentRecords.map((record) => (
              record.id === savedRecord.id
                ? {
                  ...record,
                  time: formatVisitedAtTimeLabel(savedRecord.visited_at) || recordTimeLabel,
                  text: savedRecord.text ?? trimmedText,
                  updatedAt: savedRecord.updated_at,
                }
                : record
            )));
          } else {
            setRecords((currentRecords) => [
              ...currentRecords,
              {
                id: savedRecord.id,
                tripId: savedRecord.trip_id,
                dayId: savedRecord.trip_day_id ?? tripDayId,
                placeId: savedRecord.place_id,
                time: formatVisitedAtTimeLabel(savedRecord.visited_at) || recordTimeLabel,
                text: savedRecord.text ?? trimmedText,
                photoIds: [],
                createdAt: savedRecord.created_at,
                updatedAt: savedRecord.updated_at,
              },
            ]);
            setEditingRecordId(savedRecord.id);
          }

          refreshRecordQueries();
          Alert.alert(
            '\uAE30\uB85D\uC740 \uC800\uC7A5\uD588\uC9C0\uB9CC \uC0AC\uC9C4\uC744 \uC5F0\uACB0\uD558\uC9C0 \uBABB\uD588\uC5B4\uC694',
            '\uC0AC\uC9C4 \uC120\uD0DD\uC744 \uD655\uC778\uD55C \uB4A4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574\uC8FC\uC138\uC694.',
          );
          return;
        }

        if (editingRecordId) {
          setRecords((currentRecords) => currentRecords.map((record) => (
            record.id === savedRecord.id
              ? {
                ...record,
                photoIds: syncedPhotoIds,
                time: formatVisitedAtTimeLabel(savedRecord.visited_at) || recordTimeLabel,
                text: savedRecord.text ?? trimmedText,
                updatedAt: savedRecord.updated_at,
              }
              : record
          )));
        } else {
          setRecords((currentRecords) => [
            ...currentRecords,
            {
              id: savedRecord.id,
              tripId: savedRecord.trip_id,
              dayId: savedRecord.trip_day_id ?? tripDayId,
              placeId: savedRecord.place_id,
              time: formatVisitedAtTimeLabel(savedRecord.visited_at) || recordTimeLabel,
              text: savedRecord.text ?? trimmedText,
              photoIds: syncedPhotoIds,
              createdAt: savedRecord.created_at,
              updatedAt: savedRecord.updated_at,
            },
          ]);
        }
        closeRecordModalWithCleanup();
        refreshRecordQueries();
      } catch (error) {
        if (__DEV__) {
          console.warn('[place-detail] record body save failed', {
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            recordSaved: false,
            stage: 'save_record_body',
          });
        }
        Alert.alert(
          editingRecordId
            ? '\uAE30\uB85D\uC744 \uC218\uC815\uD558\uC9C0 \uBABB\uD588\uC5B4\uC694'
            : '\uAE30\uB85D\uC744 \uC800\uC7A5\uD558\uC9C0 \uBABB\uD588\uC5B4\uC694',
          '\uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574\uC8FC\uC138\uC694.',
        );
      } finally {
        isRecordSavingRef.current = false;
        setRecordSaving(false);
      }

      return;
    }

    if (editingRecordId) {
      setRecords((currentRecords) => currentRecords.map((record) => (
        record.id === editingRecordId
          ? {
            ...record,
            time: recordTimeLabel,
            text: trimmedText,
            updatedAt: new Date().toISOString(),
          }
          : record
      )));
    } else {
      setRecords((currentRecords) => [
        ...currentRecords,
        {
          id: `record-${Date.now()}`,
          tripId: initialDetail.tripId,
          dayId: initialDetail.dayId,
          placeId: initialDetail.placeId,
          time: recordTimeLabel,
          text: trimmedText,
          photoIds: selectedRecordPhotoIds,
          createdAt: new Date().toISOString(),
        },
      ]);
    }
    closeRecordModalWithCleanup();
  };

  const handleCloseRecordModal = () => {
    closeRecordModalWithCleanup();
  };

  const handlePressAddRecord = () => {
    setMoreOpen(false);
    openRecordComposer([], 'sheet');
  };

  const prepareRecordFromMainViewer = (index: number) => {
    const targetPhoto = viewerPhotos[index];
    if (!targetPhoto) {
      return;
    }

    prepareRecordComposer([targetPhoto.id]);
  };

  const prepareRecordFromGridViewer = (index: number) => {
    const targetPhoto = photos[index];
    if (!targetPhoto) {
      return;
    }

    prepareRecordComposer([targetPhoto.id]);
  };

  const handleOpenRecordPhotoPicker = () => {
    if (isRecordPhotoPickerTransitioning || pendingRecordPhotoGridOpenRef.current) {
      return;
    }

    pendingRecordModalCleanupRef.current = false;
    pendingRecordPhotoGridOpenRef.current = true;
    setRecordPhotoPickerTransitioning(true);
    setGridSelectionPurpose('linkRecord');
    setGridViewOnly(false);
    setGridSelectionInitiallyEnabled(true);
    Keyboard.dismiss();
    setRecordModalOpen(false);
  };

  const handleRecordModalDidDismiss = () => {
    if (pendingRecordPhotoGridOpenRef.current) {
      pendingRecordPhotoGridOpenRef.current = false;

      if (!isPhotoScreenMountedRef.current) {
        return;
      }

      setPhotoGridSessionKey((currentKey) => currentKey + 1);
      setGridOpen(true);
      return;
    }

    if (!pendingRecordModalCleanupRef.current) {
      return;
    }

    pendingRecordModalCleanupRef.current = false;
    resetRecordModalState();
  };

  const handleUnlinkRecordPhoto = (photoId: string) => {
    setSelectedRecordPhotoIds((currentIds) => currentIds.filter((id) => id !== photoId));
  };

  const handleChangeRecordTime = (nextTimeLabel: string) => {
    setRecordTimeLabel(nextTimeLabel);
    setRecordTimeEdited(true);
  };

  const handlePressEditPlace = () => {
    setMoreOpen(false);
    setPlaceInfoModalOpen(true);
  };

  const handleSubmitPlaceInfo = async (input: PlaceCreateInput) => {
    const selectedInputDay = input.dayId
      ? placeInfoDayOptions.find((day) => day.id === input.dayId)
      : undefined;
    const nextDateLabelSource = input.dateLabel ?? selectedInputDay?.dateLabel;
    const nextWeekdayLabel = input.weekdayLabel ?? selectedInputDay?.weekdayLabel;
    const nextDateLabel = nextDateLabelSource
      ? `${nextDateLabelSource}${nextWeekdayLabel ? ` ${nextWeekdayLabel}` : ''}`
      : placeInfo.dateLabel;
    const nextPlaceInfo = {
      ...placeInfo,
      placeName: input.placeName ?? input.place,
      cityName: input.cityName ?? input.city ?? placeInfo.cityName,
      countryName: input.countryName ?? placeInfo.countryName,
      dateLabel: nextDateLabel,
      timeLabel: input.time ?? placeInfo.timeLabel,
      categoryLabel: normalizePlaceCategoryValue(input.category) ?? placeInfo.categoryLabel,
    };

    if (shouldUseSupabasePlaceDetail) {
      try {
        const previousTripDayId = initialDetail.dayId || routeDayId || '';
        const nextTripDayId = input.dayId ?? previousTripDayId;
        const patch: UpdatePlacePatch = {
          ...buildPlaceIdentityPatch(input),
          category: normalizePlaceCategoryValue(input.category) ?? null,
          name: nextPlaceInfo.placeName.trim() || placeInfo.placeName,
        };
        const visitedAt = resolveVisitedAtForPlaceUpdate(
          {
            ...input,
            dateLabel: nextDateLabelSource ?? input.dateLabel,
            weekdayLabel: nextWeekdayLabel,
          },
          placeInfo.dateLabel,
        );

        if (visitedAt !== undefined) {
          patch.visited_at = visitedAt;
        }

        if (nextTripDayId && nextTripDayId !== previousTripDayId) {
          patch.trip_day_id = nextTripDayId;
        }

        await updatePlace(initialDetail.placeId, patch);
        queryClient.setQueryData(
          supabaseQueryKeys.placeDetail(user?.id, initialDetail.placeId),
          (
            current:
              | { place: PlaceRow | null; records: RecordWithPhotos[] }
              | undefined,
          ) => {
            if (!current?.place) {
              return current;
            }

            return {
              ...current,
              place: {
                ...current.place,
                ...patch,
                id: current.place.id,
                updated_at: new Date().toISOString(),
              },
            };
          },
        );
        setPlaceInfo(nextPlaceInfo);
        setPlaceInfoModalOpen(false);
        void refetchPlaceDetailData();

        void Promise.all([
          queryClient.invalidateQueries({
            queryKey: supabaseQueryKeys.archivedTravelMoments(user?.id),
          }),
          queryClient.invalidateQueries({
            queryKey: supabaseQueryKeys.tripDayPlaces(user?.id, previousTripDayId),
          }),
          queryClient.invalidateQueries({
            queryKey: supabaseQueryKeys.tripDayRecords(user?.id, previousTripDayId),
          }),
          nextTripDayId !== previousTripDayId
            ? queryClient.invalidateQueries({
              queryKey: supabaseQueryKeys.tripDayPlaces(user?.id, nextTripDayId),
            })
            : Promise.resolve(),
          nextTripDayId !== previousTripDayId
            ? queryClient.invalidateQueries({
              queryKey: supabaseQueryKeys.tripDayRecords(user?.id, nextTripDayId),
            })
            : Promise.resolve(),
          queryClient.invalidateQueries({
            queryKey: supabaseQueryKeys.placeDetail(user?.id, initialDetail.placeId),
          }),
          queryClient.invalidateQueries({
            queryKey: supabaseQueryKeys.tripDays(user?.id, initialDetail.tripId || routeTripId || ''),
          }),
          queryClient.invalidateQueries({
            queryKey: supabaseQueryKeys.tripPlaces(
              user?.id,
              initialDetail.tripId || routeTripId || '',
            ),
          }),
          queryClient.invalidateQueries({
            queryKey: supabaseQueryKeys.tripRecords(
              user?.id,
              initialDetail.tripId || routeTripId || '',
            ),
          }),
        ]).catch((error: unknown) => {
          console.warn('[place-detail] invalidate after place update failed', error);
        });
      } catch (error) {
        console.warn('[place-detail] update place failed', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        Alert.alert(
          '\uC7A5\uC18C \uC815\uBCF4\uB97C \uC800\uC7A5\uD558\uC9C0 \uBABB\uD588\uC5B4\uC694',
          `\uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574\uC8FC\uC138\uC694.\n\uAC1C\uBC1C \uC815\uBCF4: ${errorMessage}`,
        );
      }

      return;
    }

    setPlaceInfo(nextPlaceInfo);
    setPlaceInfoModalOpen(false);
  };

  const handlePressChangeCover = () => {
    setMoreOpen(false);
    setGridSelectionPurpose('coverSelect');
    setGridViewOnly(true);
    setGridSelectionInitiallyEnabled(false);
    setGridOpen(true);
  };

  const handleSetCoverPhoto = async (photoId?: string) => {
    if (!photoId || isUpdatingCoverPhoto) {
      return;
    }

    const targetPhoto = photos.find((photo) => photo.id === photoId);

    if (!targetPhoto) {
      return;
    }

    if (!shouldUseSupabasePlaceDetail) {
      setPhotos((currentPhotos) => [
        targetPhoto,
        ...currentPhotos.filter((photo) => photo.id !== targetPhoto.id),
      ]);
      setHeroIndex(0);
      setViewerIndex(0);
      setGridOpen(false);
      setGridSelectionPurpose('recordCreate');
      return;
    }

    setUpdatingCoverPhoto(true);

    try {
      const result = await setPlaceCoverPhoto(initialDetail.placeId, photoId);
      const reorderPhotos = (currentPhotos: PlaceDetailPhoto[] = []) => [
        ...currentPhotos.filter((photo) => photo.id === result.coverPhotoId),
        ...currentPhotos.filter((photo) => photo.id !== result.coverPhotoId),
      ];

      setPhotos(reorderPhotos);
      setHeroIndex(0);
      setViewerIndex(0);
      setGridOpen(false);
      setGridSelectionPurpose('recordCreate');
      queryClient.setQueryData(
        supabaseQueryKeys.placePhotos(user?.id, initialDetail.placeId),
        (current: PlaceDetailPhoto[] | undefined) => reorderPhotos(current),
      );
      queryClient.setQueryData(
        supabaseQueryKeys.placeDetail(user?.id, initialDetail.placeId),
        (current: { place: PlaceRow | null; records: RecordWithPhotos[] } | undefined) =>
          current?.place
            ? {
              ...current,
              place: { ...current.place, cover_photo_id: result.coverPhotoId },
            }
            : current,
      );

      void Promise.all([
        queryClient.invalidateQueries({
          queryKey: supabaseQueryKeys.placePhotos(user?.id, initialDetail.placeId),
        }),
        queryClient.invalidateQueries({
          queryKey: supabaseQueryKeys.placeDetail(user?.id, initialDetail.placeId),
        }),
        queryClient.invalidateQueries({
          queryKey: supabaseQueryKeys.tripDayPlaces(user?.id, initialDetail.dayId),
        }),
        queryClient.invalidateQueries({
          queryKey: supabaseQueryKeys.tripPlaces(user?.id, initialDetail.tripId),
        }),
        queryClient.invalidateQueries({
          queryKey: supabaseQueryKeys.archivedTravelMoments(user?.id),
        }),
      ]).catch((error: unknown) => {
        console.warn('[place-detail] invalidate after cover update failed', error);
      });
    } catch (error) {
      console.warn('[place-detail] update cover photo failed', error);
      Alert.alert(
        '대표사진을 변경하지 못했어요',
        '잠시 후 다시 시도해주세요.',
      );
    } finally {
      setUpdatingCoverPhoto(false);
    }
  };

  const removeDeletedPhotosFromScreen = (photoIds: string[]) => {
    const photoIdSet = new Set(photoIds);
    const remainingViewerPhotoIds = (viewerPhotoIds ?? photos.map((photo) => photo.id))
      .filter((photoId) => !photoIdSet.has(photoId));

    setPhotos((currentPhotos) => currentPhotos.filter((photo) => !photoIdSet.has(photo.id)));
    setRecords((currentRecords) => currentRecords.map((record) => ({
      ...record,
      photoIds: (record.photoIds ?? []).filter((photoId) => !photoIdSet.has(photoId)),
    })));
    setViewerPhotoIds((currentIds) => (
      currentIds ? currentIds.filter((photoId) => !photoIdSet.has(photoId)) : null
    ));
    setHeroIndex(0);
    setViewerIndex(0);

    if (remainingViewerPhotoIds.length === 0) {
      setViewerOpen(false);
    }
  };

  const invalidatePhotoDeleteQueries = async (result: DeletePhotosResult) => {
    const tripIds = [...new Set(result.results.map((item) => item.tripId))];
    const tripDayIds = [
      ...new Set(
        result.results
          .map((item) => item.tripDayId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const placeIds = [
      ...new Set(
        result.results
          .map((item) => item.placeId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const invalidations = [
      queryClient.invalidateQueries({
        queryKey: supabaseQueryKeys.archivedTravelMoments(user?.id),
      }),
      queryClient.invalidateQueries({
        queryKey: supabaseQueryKeys.myTrips(user?.id),
      }),
      queryClient.invalidateQueries({
        queryKey: supabaseQueryKeys.recentTripsRoot(user?.id),
      }),
      ...tripIds.flatMap((tripId) => [
        queryClient.invalidateQueries({
          queryKey: supabaseQueryKeys.tripDetail(user?.id, tripId),
        }),
        queryClient.invalidateQueries({
          queryKey: supabaseQueryKeys.tripDays(user?.id, tripId),
        }),
        queryClient.invalidateQueries({
          queryKey: supabaseQueryKeys.tripPhotos(user?.id, tripId),
        }),
      ]),
      ...tripDayIds.flatMap((tripDayId) => [
        queryClient.invalidateQueries({
          queryKey: supabaseQueryKeys.tripDayPhotos(user?.id, tripDayId),
        }),
        queryClient.invalidateQueries({
          queryKey: supabaseQueryKeys.tripDayPlaces(user?.id, tripDayId),
        }),
      ]),
      ...placeIds.flatMap((placeId) => [
        queryClient.invalidateQueries({
          queryKey: supabaseQueryKeys.placePhotos(user?.id, placeId),
        }),
        queryClient.invalidateQueries({
          queryKey: supabaseQueryKeys.placeDetail(user?.id, placeId),
        }),
      ]),
    ];

    await Promise.allSettled(invalidations);
  };

  const runSupabasePhotoDelete = async (photoIds: string[]) => {
    if (isPhotoDeletingRef.current || photoIds.length === 0) {
      return;
    }

    isPhotoDeletingRef.current = true;
    setPhotoDeleting(true);

    try {
      const result = await softDeletePhotos(photoIds);
      const deletedPhotoIds = result.results.map((item) => item.photoId);

      if (deletedPhotoIds.length > 0) {
        removeDeletedPhotosFromScreen(deletedPhotoIds);
        await invalidatePhotoDeleteQueries(result);
      }

      const retryPhotoIds = [
        ...new Set([
          ...result.failed.map((item) => item.photoId),
          ...result.storageCleanupFailedPhotoIds,
        ]),
      ];

      if (retryPhotoIds.length > 0) {
        const hasStorageCleanupFailure =
          result.storageCleanupFailedPhotoIds.length > 0;
        Alert.alert(
          hasStorageCleanupFailure
            ? '\uC0AC\uC9C4 \uD30C\uC77C \uC815\uB9AC\uAC00 \uD544\uC694\uD574\uC694'
            : '\uC77C\uBD80 \uC0AC\uC9C4\uC744 \uC0AD\uC81C\uD558\uC9C0 \uBABB\uD588\uC5B4\uC694',
          hasStorageCleanupFailure
            ? '\uC0AC\uC9C4 \uAE30\uB85D\uC740 \uC0AD\uC81C\uB410\uC9C0\uB9CC \uD30C\uC77C \uC815\uB9AC\uAC00 \uC644\uB8CC\uB418\uC9C0 \uC54A\uC558\uC5B4\uC694.'
            : '\uC7A0\uC2DC \uD6C4 \uC2E4\uD328\uD55C \uC0AC\uC9C4\uB9CC \uB2E4\uC2DC \uC2DC\uB3C4\uD574\uC8FC\uC138\uC694.',
          [
            { text: '\uB098\uC911\uC5D0', style: 'cancel' },
            {
              text: '\uB2E4\uC2DC \uC2DC\uB3C4',
              onPress: () => {
                void runSupabasePhotoDelete(retryPhotoIds);
              },
            },
          ],
        );
      }

    } catch {
      Alert.alert(
        '\uC0AC\uC9C4\uC744 \uC0AD\uC81C\uD558\uC9C0 \uBABB\uD588\uC5B4\uC694',
        '\uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574\uC8FC\uC138\uC694.',
      );
    } finally {
      isPhotoDeletingRef.current = false;
      setPhotoDeleting(false);
      setGridSelectionResetSignal((signal) => signal + 1);
    }
  };

  const handleDeleteViewerPhoto = (photoIndex: number) => {
    const targetPhoto = viewerPhotos[photoIndex];
    if (!targetPhoto) {
      return;
    }

    Alert.alert('\uC0AC\uC9C4\uC744 \uC0AD\uC81C\uD560\uAE4C\uC694?', '\uC7A5\uC18C\uC758 \uC0AC\uC9C4 \uBAA9\uB85D\uC5D0\uC11C \uC81C\uAC70\uD560\uAC8C\uC694.', [
      { text: '\uCDE8\uC18C', style: 'cancel' },
      {
        text: '\uC0AD\uC81C',
        style: 'destructive',
        onPress: () => {
          if (shouldUseSupabasePlaceDetail) {
            void runSupabasePhotoDelete([targetPhoto.id]);
            return;
          }

          removeDeletedPhotosFromScreen([targetPhoto.id]);
        },
      },
    ]);
  };

  const handleDeleteGridPhotos = (photoIds: string[]) => {
    if (photoIds.length === 0) {
      return;
    }

    const photoIdSet = new Set(photoIds);
    setPhotos((currentPhotos) => currentPhotos.filter((photo) => !photoIdSet.has(photo.id)));
    setRecords((currentRecords) => currentRecords.map((record) => ({
      ...record,
      photoIds: (record.photoIds ?? []).filter((photoId) => !photoIdSet.has(photoId)),
    })));
    setViewerPhotoIds((currentIds) => (
      currentIds ? currentIds.filter((photoId) => !photoIdSet.has(photoId)) : null
    ));
    setHeroIndex(0);
  };

  const requestDeleteGridPhotos = (photoIds: string[]) => {
    const targetPhotoIds = [...new Set(photoIds)];

    if (targetPhotoIds.length === 0) {
      return;
    }

    if (shouldUseSupabasePlaceDetail) {
      void runSupabasePhotoDelete(targetPhotoIds);
    } else {
      handleDeleteGridPhotos(targetPhotoIds);
      setGridSelectionResetSignal((signal) => signal + 1);
    }
  };

  const navigateToDay = () => {
    setMoreOpen(false);
    router.push({
      pathname: '/day-archive-detail',
      params: {
        tripId: initialDetail.tripId,
        dayId: initialDetail.dayId,
        placeId: initialDetail.placeId,
        highlightPlaceId: initialDetail.placeId,
      },
    });
  };

  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <Pressable accessibilityRole="button" hitSlop={10} onPress={() => router.back()} style={styles.headerButton}>
          <Feather name="chevron-left" size={28} color={Colors.foundation.black} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          hitSlop={10}
          onPress={() => setMoreOpen((visible) => !visible)}
          style={styles.headerButton}
        >
          <Feather name="more-horizontal" size={26} color={Colors.foundation.black} />
        </Pressable>

        {isMoreOpen ? (
          <View style={styles.moreMenu}>
            <MenuRow icon="image" label={'\uC0AC\uC9C4 \uCD94\uAC00'} onPress={handleAddPhoto} />
            <MenuRow icon="edit-3" label={'\uAE30\uB85D \uCD94\uAC00'} onPress={handlePressAddRecord} />
            <MenuRow icon="map-pin" label={'\uC7A5\uC18C \uC815\uBCF4 \uC218\uC815'} onPress={handlePressEditPlace} />
            <MenuRow icon="star" label={'\uB300\uD45C\uC0AC\uC9C4 \uBCC0\uACBD'} onPress={handlePressChangeCover} />
            <View style={styles.menuDivider} />
            <MenuRow icon="calendar" label={'\uD574\uB2F9 \uB0A0\uC9DC \uC804\uCCB4\uBCF4\uAE30'} onPress={navigateToDay} />
            <View style={styles.menuDivider} />
            <MenuRow
              destructive
              icon="trash-2"
              label={'\uC7A5\uC18C \uC0AD\uC81C'}
              onPress={() => {
                setMoreOpen(false);
                setDeleteConfirmOpen(true);
              }}
            />
          </View>
        ) : null}
      </View>

      {isMoreOpen ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="\uB354\uBCF4\uAE30 \uBA54\uB274 \uB2EB\uAE30"
          style={styles.menuDismissLayer}
          onPress={() => setMoreOpen(false)}
        />
      ) : null}

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        scrollEnabled={!isRecordSwipeActive}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topGroup}>
          <View style={[styles.hero, { height: screenWidth }]}>
            {photos.length > 0 ? (
              <ScrollView
                horizontal
                onMomentumScrollEnd={handleHeroScrollEnd}
                pagingEnabled
                showsHorizontalScrollIndicator={false}
              >
                {photos.map((photo, index) => (
                  <Pressable
                    accessibilityRole="imagebutton"
                    key={photo.id}
                    onPress={() => openViewer(index)}
                    style={[styles.heroPage, { width: screenWidth }]}
                  >
                    <Image source={photo.source} style={styles.heroImage} resizeMode="cover" />
                  </Pressable>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.heroPlaceholder} />
            )}

            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>
                {photos.length > 0 ? heroIndex + 1 : 0} / {photos.length}
              </Text>
            </View>
          </View>

          <View style={styles.placeInfo}>
            <Text style={styles.placeTitle}>{placeInfo.placeName}</Text>
            {placeMetaLabel ? (
              <Text style={styles.placeMeta}>{placeMetaLabel}</Text>
            ) : null}
            <Text style={styles.dateText}>{dateDisplayLabel}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>{'\uC0AC\uC9C4'}</Text>
              <Text style={styles.sectionCount}>
                {isPhotoUploading
                  ? '\uCD94\uAC00 \uC911'
                  : `${photos.length}\uC7A5`}
              </Text>
            </View>
            <Pressable accessibilityRole="button" onPress={() => openPhotoGrid(false)} style={styles.viewAllButton}>
              <Text style={styles.viewAllText}>{'\uC804\uCCB4\uBCF4\uAE30'}</Text>
              <Feather name="chevron-right" size={18} color={Colors.foundation.black} />
            </Pressable>
          </View>

          {shouldUseSupabasePlaceDetail && isPlacePhotosPending ? (
            <View style={styles.photoStatus}>
              <Text style={styles.photoStatusText}>
                {'\uC800\uC7A5\uB41C \uC0AC\uC9C4\uC744 \uBD88\uB7EC\uC624\uB294 \uC911\uC774\uC5D0\uC694.'}
              </Text>
            </View>
          ) : isPlacePhotosError || failedPlacePhotoCount > 0 ? (
            <View style={styles.photoStatus}>
              <Text style={styles.photoStatusText}>
                {'\uC77C\uBD80 \uC0AC\uC9C4\uC744 \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC5B4\uC694.'}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  void refetchPlacePhotos();
                }}
                style={styles.photoStatusAction}
              >
                <Text style={styles.photoStatusActionText}>{'\uB2E4\uC2DC \uC2DC\uB3C4'}</Text>
              </Pressable>
            </View>
          ) : missingPlacePhotoCount > 0 ? (
            <View style={styles.photoStatus}>
              <Text style={styles.photoStatusText}>
                {'\uD45C\uC2DC\uD560 \uC218 \uC5C6\uB294 \uC0AC\uC9C4\uC774 \uC788\uC5B4\uC694.'}
              </Text>
            </View>
          ) : failedPhotoUploadItems.length > 0 ? (
            <View style={styles.photoStatus}>
              <Text style={styles.photoStatusText}>
                {'\uC77C\uBD80 \uC0AC\uC9C4\uC744 \uCD94\uAC00\uD558\uC9C0 \uBABB\uD588\uC5B4\uC694.'}
              </Text>
              <Pressable
                accessibilityRole="button"
                disabled={isPhotoUploading}
                onPress={() => {
                  void uploadSelectedPlacePhotos(failedPhotoUploadItems);
                }}
                style={styles.photoStatusAction}
              >
                <Text style={styles.photoStatusActionText}>{'\uC2E4\uD328 \uC0AC\uC9C4 \uB2E4\uC2DC \uC2DC\uB3C4'}</Text>
              </Pressable>
            </View>
          ) : null}

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbnailScroll}>
            <View style={styles.thumbnailRow}>
              <Pressable
                accessibilityRole="button"
                disabled={isPhotoUploading}
                onPress={handleAddPhoto}
                style={[styles.photoThumb, styles.photoAddThumb]}
              >
                <Feather name="plus" size={28} color={Colors.foundation.black} />
              </Pressable>
              {photos.map((photo, index) => (
                <Pressable key={photo.id} onPress={() => openViewer(index)} style={styles.photoThumb}>
                  <Image source={photo.source} style={styles.photoThumbImage} resizeMode="cover" />
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>{'\uAE30\uB85D'}</Text>
              <Text style={styles.sectionCount}>{records.length}{'\uAC1C'}</Text>
            </View>
            <Pressable accessibilityRole="button" onPress={handlePressAddRecord} style={styles.addRecordButton}>
              <Feather name="plus" size={12} color={Colors.foundation.black} />
              <Text style={styles.addRecordButtonText}>{'\uAE30\uB85D'}</Text>
            </Pressable>
          </View>

          <View>
            {sortedRecords.length === 0 ? (
              <View style={styles.recordsEmptyState}>
                <Text style={styles.recordsEmptyTitle}>아직 작성한 기록이 없어요</Text>
                <Text style={styles.recordsEmptyDescription}>
                  기억하고 싶은 순간을 기록으로 남겨보세요.
                </Text>
              </View>
            ) : sortedRecords.map((record, index) => {
              const recordPhoto = record.photoIds?.[0]
                ? photos.find((photo) => photo.id === record.photoIds?.[0])
                : undefined;
              const extraPhotoCount = Math.max((record.photoIds?.length ?? 0) - 1, 0);
              const hasPhotos = Boolean(recordPhoto);

              return (
                <SwipeableRecordItem
                  hasPhotos={hasPhotos}
                  key={record.id}
                  recordId={record.id}
                  isLast={index === sortedRecords.length - 1}
                  isSwipeOpen={openSwipeRecordId === record.id}
                  onCloseSwipe={handleCloseSwipeRecord}
                  onOpenSwipe={setOpenSwipeRecordId}
                  onPressEdit={openRecordEditor}
                  onRequestDelete={requestDeleteRecord}
                  onSwipeEnd={() => setRecordSwipeActive(false)}
                  onSwipeStart={() => setRecordSwipeActive(true)}
                  timeLabel={record.time ?? ''}
                >
                  {record.text ? <Text style={styles.recordText}>{record.text}</Text> : null}
                  {recordPhoto ? (
                    <Pressable onPress={() => openViewer(0, record.photoIds)} style={styles.recordPhoto}>
                      <Image source={recordPhoto.source} style={styles.recordPhotoImage} resizeMode="cover" />
                      {extraPhotoCount > 0 ? (
                        <View style={styles.recordPhotoCountBadge}>
                          <Text style={styles.recordPhotoCountText}>+{extraPhotoCount}</Text>
                        </View>
                      ) : null}
                    </Pressable>
                  ) : null}
                </SwipeableRecordItem>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <PhotoGridModal
        key={photoGridSessionKey}
        clearSelectionSignal={gridSelectionResetSignal}
        isDeleting={isPhotoDeleting}
        initialSelectionMode={isGridSelectionInitiallyEnabled}
        initialSelectedPhotoIds={gridSelectionPurpose === 'linkRecord' ? selectedRecordPhotoIds : undefined}
        onAddPhoto={handleAddPhoto}
        onClose={handleClosePhotoGrid}
        onDidDismiss={handlePhotoGridDidDismiss}
        onRequestDeletePhotos={requestDeleteGridPhotos}
        onPressPhoto={(index) => {
          if (gridSelectionPurpose === 'coverSelect') {
            void handleSetCoverPhoto(photos[index]?.id);
            return;
          }

          openViewer(index, undefined, isGridViewOnly);
        }}
        onStartRecord={(photoIds) => {
          if (gridSelectionPurpose === 'linkRecord') {
            if (pendingRecordSheetRestoreRef.current) {
              return;
            }

            setSelectedRecordPhotoIds(photoIds);
            if (!hasRecordTimeBeenEdited) {
              const earliestPhotoDate = getEarliestRecordPhotoTakenDate(photoIds, photos);

              if (earliestPhotoDate) {
                setRecordTimeLabel(formatPlaceEntryTime(convertDateToPlaceEntryTime(earliestPhotoDate)));
              }
            }
            requestRecordSheetRestoreAfterPhotoGrid();
            return;
          }

          setGridOpen(false);
          requestAnimationFrame(() => openRecordComposer(photoIds, 'sheet'));
        }}
        coverPhotoId={photos[0]?.id}
        mode={
          gridSelectionPurpose === 'coverSelect'
            ? 'cover-select'
            : gridSelectionPurpose === 'linkRecord'
              ? 'selectForRecord'
              : 'default'
        }
        photos={photos}
        transitionDuration={gridSelectionPurpose === 'linkRecord' ? 200 : 300}
        viewerActionLabel={isGridViewOnly ? undefined : '\uAE30\uB85D \uCD94\uAC00\uD558\uAE30'}
        viewerActions={isGridViewOnly ? [] : [
          {
            key: 'share',
            icon: 'share-outline',
            label: '\uACF5\uC720\uD558\uAE30',
            onPress: () => Alert.alert('\uACF5\uC720\uD558\uAE30', '\uC0AC\uC9C4 \uACF5\uC720 \uAE30\uB2A5\uC740 \uCD94\uD6C4 \uC5F0\uACB0\uD560 \uC608\uC815\uC785\uB2C8\uB2E4.'),
          },
          {
            key: 'cover',
            icon: 'image-outline',
            label: '\uB300\uD45C\uC0AC\uC9C4 \uBCC0\uACBD',
            onPress: (index) => void handleSetCoverPhoto(viewerPhotos[index]?.id),
          },
          {
            key: 'info',
            icon: 'information-circle-outline',
            label: '\uC0AC\uC9C4 \uC815\uBCF4 \uBCF4\uAE30',
            onPress: () => Alert.alert('\uC0AC\uC9C4 \uC815\uBCF4', '\uC0AC\uC9C4 \uCD2C\uC601 \uC815\uBCF4\uB294 \uCD94\uD6C4 \uC5F0\uACB0 \uC608\uC815\uC785\uB2C8\uB2E4.'),
          },
          {
            key: 'delete',
            icon: 'trash-outline',
            label: '\uC0AD\uC81C',
            destructive: true,
            onPress: (index) => {
              setViewerPhotoIds(null);
              handleDeleteViewerPhoto(index);
            },
          },
        ]}
        onPressViewerAction={isGridViewOnly ? undefined : prepareRecordFromGridViewer}
        renderViewerActionSheet={isGridViewOnly ? undefined : ({ closeSheet }) => (
          <RecordCreateModal
            allowPhotoPicker={false}
            draft={recordDraft}
            mode="sheet"
            onChangeDraft={setRecordDraft}
            onChangeTime={handleChangeRecordTime}
            onClose={closeSheet}
            onOpenPhotoPicker={() => undefined}
            onRemovePhoto={handleUnlinkRecordPhoto}
            onSave={() => {
              handleSaveRecord();
              closeSheet();
            }}
            photos={selectedRecordPhotos}
            presentation="inline"
            timeLabel={recordTimeLabel}
            visible
          />
        )}
        visible={isGridOpen}
      />

      <FullScreenImageViewer
        actionLabel={'\uAE30\uB85D \uCD94\uAC00\uD558\uAE30'}
        actions={isViewerViewOnly ? [] : [
          {
            key: 'share',
            icon: 'share-outline',
            label: '\uACF5\uC720\uD558\uAE30',
            onPress: () => Alert.alert('\uACF5\uC720\uD558\uAE30', '\uC0AC\uC9C4 \uACF5\uC720 \uAE30\uB2A5\uC740 \uCD94\uD6C4 \uC5F0\uACB0\uD560 \uC608\uC815\uC785\uB2C8\uB2E4.'),
          },
          {
            key: 'cover',
            icon: 'image-outline',
            label: '\uB300\uD45C\uC0AC\uC9C4 \uBCC0\uACBD',
            onPress: (index) => {
              void handleSetCoverPhoto(viewerPhotos[index]?.id);
            },
          },
          {
            key: 'info',
            icon: 'information-circle-outline',
            label: '\uC0AC\uC9C4 \uC815\uBCF4 \uBCF4\uAE30',
            onPress: () => Alert.alert('\uC0AC\uC9C4 \uC815\uBCF4', '\uC0AC\uC9C4 \uCD2C\uC601 \uC815\uBCF4\uB294 \uCD94\uD6C4 \uC5F0\uACB0 \uC608\uC815\uC785\uB2C8\uB2E4.'),
          },
          {
            key: 'delete',
            icon: 'trash-outline',
            label: '\uC0AD\uC81C',
            destructive: true,
            onPress: (index) => {
              handleDeleteViewerPhoto(index);
            },
          },
        ]}
        images={viewerImages}
        initialIndex={viewerIndex}
        leadingAction={isViewerViewOnly ? {
          key: 'delete',
          icon: 'trash-outline',
          label: '\uC0AC\uC9C4 \uC0AD\uC81C',
          destructive: true,
          onPress: handleDeleteViewerPhoto,
        } : undefined}
        onClose={() => {
          setViewerOpen(false);
          setViewerPhotoIds(null);
          setViewerViewOnly(false);
        }}
        onPressAction={isViewerViewOnly ? undefined : prepareRecordFromMainViewer}
        renderActionSheet={isViewerViewOnly ? undefined : ({ closeSheet }) => (
          <RecordCreateModal
            allowPhotoPicker={false}
            draft={recordDraft}
            mode="sheet"
            onChangeDraft={setRecordDraft}
            onChangeTime={handleChangeRecordTime}
            onClose={closeSheet}
            onOpenPhotoPicker={() => undefined}
            onRemovePhoto={handleUnlinkRecordPhoto}
            onSave={() => {
              handleSaveRecord();
              closeSheet();
            }}
            photos={selectedRecordPhotos}
            presentation="inline"
            timeLabel={recordTimeLabel}
            visible
          />
        )}
        visible={isViewerOpen}
      />

      <PlaceCreateModal
        visible={isPlaceInfoModalOpen}
        mode="edit"
        tripId={initialDetail.tripId}
        dayId={initialDetail.dayId}
        dayOptions={placeInfoDayOptions}
        selectedDayId={selectedPlaceInfoDayId}
        showPhotoSection={false}
        initialValue={{
          id: initialDetail.placeId,
          place: placeInfo.placeName,
          placeName: placeInfo.placeName,
          city: placeInfo.cityName,
          cityName: placeInfo.cityName,
          countryName: placeInfo.countryName,
          source: supabasePlaceDetailData?.place?.source === 'google' ? 'google' : 'manual',
          googlePlaceId: supabasePlaceDetailData?.place?.google_place_id ?? undefined,
          formattedAddress: supabasePlaceDetailData?.place?.address ?? undefined,
          latitude: supabasePlaceDetailData?.place?.latitude ?? undefined,
          longitude: supabasePlaceDetailData?.place?.longitude ?? undefined,
          time: placeInfo.timeLabel,
          category: placeInfo.categoryLabel,
          dayId: selectedPlaceInfoDayId,
          dateLabel: placeInfoDayOptions.find((day) => day.id === selectedPlaceInfoDayId)?.dateLabel,
          weekdayLabel: placeInfoDayOptions.find((day) => day.id === selectedPlaceInfoDayId)?.weekdayLabel,
        }}
        onClose={() => setPlaceInfoModalOpen(false)}
        onSubmit={handleSubmitPlaceInfo}
      />

      <RecordCreateModal
        allowPhotoChanges
        draft={recordDraft}
        mode={recordModalMode}
        onChangeDraft={setRecordDraft}
        onChangeTime={handleChangeRecordTime}
        onClose={handleCloseRecordModal}
        onDidDismiss={handleRecordModalDidDismiss}
        onOpenPhotoPicker={handleOpenRecordPhotoPicker}
        onRemovePhoto={handleUnlinkRecordPhoto}
        onSave={handleSaveRecord}
        isSaving={isRecordSaving}
        photos={selectedRecordPhotos}
        title={editingRecordId ? '\uAE30\uB85D \uC218\uC815' : '\uAE30\uB85D \uCD94\uAC00'}
        timeLabel={recordTimeLabel}
        visible={isRecordModalOpen}
      />

      <ConfirmDeleteModal
        onCancel={() => setDeleteConfirmOpen(false)}
        onDelete={handleConfirmDeletePlace}
        visible={isDeleteConfirmOpen}
      />

      <ConfirmRecordDeleteModal
        isDeleting={isRecordDeleting}
        onCancel={cancelDeleteRecord}
        onDelete={confirmDeleteRecord}
        visible={pendingDeleteRecordId != null}
      />
    </SafeAreaView>
  );
}

interface MenuRowProps {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  destructive?: boolean;
  onPress: () => void;
}

function MenuRow({ icon, label, destructive = false, onPress }: MenuRowProps) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.menuRow}>
      <Feather name={icon} size={18} color={destructive ? DESTRUCTIVE : Colors.foundation.black} />
      <Text style={[styles.menuLabel, destructive && styles.menuLabelDestructive]}>{label}</Text>
    </Pressable>
  );
}

interface SwipeableRecordItemProps {
  children: React.ReactNode;
  hasPhotos: boolean;
  isLast: boolean;
  isSwipeOpen: boolean;
  onCloseSwipe: () => void;
  onOpenSwipe: (recordId: string) => void;
  onPressEdit: (recordId: string) => void;
  onRequestDelete: (recordId: string) => void;
  onSwipeEnd: () => void;
  onSwipeStart: () => void;
  recordId: string;
  timeLabel: string;
}

const SwipeableRecordItem = React.memo(function SwipeableRecordItem({
  children,
  hasPhotos,
  isLast,
  isSwipeOpen,
  onCloseSwipe,
  onOpenSwipe,
  onPressEdit,
  onRequestDelete,
  onSwipeEnd,
  onSwipeStart,
  recordId,
  timeLabel,
}: SwipeableRecordItemProps) {
  const translateX = React.useRef(new Animated.Value(0)).current;
  const committedX = React.useRef(0);
  const [rowWidth, setRowWidth] = React.useState(0);
  const deleteTriggerThreshold = rowWidth > 0 ? rowWidth * 0.5 : RECORD_SWIPE_ACTION_WIDTH * 2;
  const maxSwipeDistance = rowWidth > 0 ? rowWidth : deleteTriggerThreshold;

  const closeSwipe = React.useCallback(() => {
    committedX.current = 0;
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: false,
      friction: 9,
      tension: 90,
    }).start();
  }, [translateX]);

  const openSwipe = React.useCallback(() => {
    committedX.current = -RECORD_SWIPE_ACTION_WIDTH;
    Animated.spring(translateX, {
      toValue: -RECORD_SWIPE_ACTION_WIDTH,
      useNativeDriver: false,
      friction: 9,
      tension: 90,
    }).start();
  }, [translateX]);

  const deleteBackgroundWidth = React.useMemo(
    () =>
      translateX.interpolate({
        inputRange: [-maxSwipeDistance, 0],
        outputRange: [maxSwipeDistance, 0],
        extrapolate: 'clamp',
      }),
    [maxSwipeDistance, translateX],
  );

  React.useEffect(() => {
    if (!isSwipeOpen && committedX.current !== 0) {
      closeSwipe();
    }
  }, [closeSwipe, isSwipeOpen]);

  const panResponder = React.useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_, gesture) =>
          ((committedX.current < 0 && gesture.dx > RECORD_SWIPE_OPEN_THRESHOLD) ||
            gesture.dx < -RECORD_SWIPE_OPEN_THRESHOLD) &&
          Math.abs(gesture.dx) > Math.abs(gesture.dy) * RECORD_SWIPE_DIRECTION_RATIO,
        onMoveShouldSetPanResponder: (_, gesture) =>
          ((committedX.current < 0 && gesture.dx > RECORD_SWIPE_OPEN_THRESHOLD) ||
            gesture.dx < -RECORD_SWIPE_OPEN_THRESHOLD) &&
          Math.abs(gesture.dx) > Math.abs(gesture.dy) * RECORD_SWIPE_DIRECTION_RATIO,
        onPanResponderGrant: () => {
          onSwipeStart();
          if (!isSwipeOpen) {
            onOpenSwipe(recordId);
          }
        },
        onPanResponderMove: (_, gesture) => {
          const nextX = Math.max(
            -maxSwipeDistance,
            Math.min(0, committedX.current + gesture.dx),
          );
          translateX.setValue(nextX);
        },
        onPanResponderRelease: (_, gesture) => {
          const rawX = committedX.current + gesture.dx;
          const dragDistance = Math.abs(Math.min(0, rawX));
          const shouldCloseFromRightSwipe =
            committedX.current < 0 && gesture.dx > RECORD_SWIPE_OPEN_THRESHOLD;
          const shouldRequestDelete = dragDistance >= deleteTriggerThreshold;
          const shouldOpen = dragDistance >= RECORD_SWIPE_OPEN_THRESHOLD;
          onSwipeEnd();

          if (shouldCloseFromRightSwipe) {
            closeSwipe();
            onCloseSwipe();
            return;
          }

          if (shouldRequestDelete) {
            closeSwipe();
            onCloseSwipe();
            onRequestDelete(recordId);
            return;
          }

          if (shouldOpen) {
            openSwipe();
            onOpenSwipe(recordId);
            return;
          }

          closeSwipe();
          onCloseSwipe();
        },
        onPanResponderTerminate: () => {
          closeSwipe();
          onSwipeEnd();
          onCloseSwipe();
        },
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
      }),
    [
      closeSwipe,
      deleteTriggerThreshold,
      isSwipeOpen,
      maxSwipeDistance,
      onCloseSwipe,
      onOpenSwipe,
      onRequestDelete,
      onSwipeEnd,
      onSwipeStart,
      openSwipe,
      recordId,
      translateX,
    ],
  );

  const handleDeletePress = React.useCallback(() => {
    closeSwipe();
    onCloseSwipe();
    onRequestDelete(recordId);
  }, [closeSwipe, onCloseSwipe, onRequestDelete, recordId]);

  return (
    <View
      onLayout={(event) => setRowWidth(event.nativeEvent.layout.width)}
      style={[
        styles.recordSwipeContainer,
        !isLast && (
          hasPhotos
            ? styles.recordSpacingWithPhotos
            : styles.recordSpacingTextOnly
        ),
      ]}
    >
      <Animated.View
        style={[
          styles.recordDeleteBackground,
          {
            width: deleteBackgroundWidth,
          },
        ]}
      >
        <Pressable
          accessibilityLabel={'\uAE30\uB85D \uC0AD\uC81C'}
          accessibilityRole="button"
          onPress={handleDeletePress}
          style={styles.recordDeleteAction}
        >
          <Feather name="trash-2" size={22} color={Colors.foundation.white} />
        </Pressable>
      </Animated.View>

      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.recordItem,
          {
            transform: [{ translateX }],
          },
        ]}
      >
        <Pressable
          accessibilityLabel={'\uAE30\uB85D \uC218\uC815'}
          accessibilityRole="button"
          delayLongPress={320}
          onLongPress={handleDeletePress}
          onPress={() => onPressEdit(recordId)}
          style={styles.recordItemPressable}
        >
          <View style={styles.recordTimeColumn}>
            <Text style={styles.recordTime}>{timeLabel}</Text>
            <View
              style={[
                styles.recordLine,
                isLast && styles.recordLineLast,
                !hasPhotos && styles.recordLineTextOnly,
              ]}
            />
          </View>

          <View style={styles.recordBody}>{children}</View>
        </Pressable>
      </Animated.View>
    </View>
  );
});
interface PhotoGridModalProps {
  visible: boolean;
  photos: PlaceDetailPhoto[];
  clearSelectionSignal: number;
  coverPhotoId?: string;
  initialSelectionMode: boolean;
  initialSelectedPhotoIds?: string[];
  isDeleting: boolean;
  mode?: 'default' | 'cover-select' | 'selectForRecord';
  onAddPhoto: () => void;
  onClose: () => void;
  onDidDismiss?: () => void;
  onRequestDeletePhotos: (photoIds: string[]) => void;
  onPressPhoto: (index: number) => void;
  onStartRecord: (photoIds: string[]) => void;
  transitionDuration?: number;
  viewerActionLabel?: string;
  viewerActions?: FullScreenImageViewerAction[];
  onPressViewerAction?: (index: number) => void;
  renderViewerActionSheet?: (params: { currentIndex: number; closeSheet: () => void }) => React.ReactNode;
}

function PhotoGridModal({
  visible,
  photos,
  clearSelectionSignal,
  coverPhotoId,
  initialSelectionMode,
  initialSelectedPhotoIds,
  isDeleting,
  mode = 'default',
  onAddPhoto,
  onClose,
  onDidDismiss,
  onRequestDeletePhotos,
  onPressPhoto,
  onStartRecord,
  transitionDuration = 100,
  viewerActionLabel,
  viewerActions = [],
  onPressViewerAction,
  renderViewerActionSheet,
}: PhotoGridModalProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isCoverSelectMode = mode === 'cover-select';
  const isRecordSelectMode = mode === 'selectForRecord';
  const [isSelectionMode, setSelectionMode] = React.useState(initialSelectionMode);
  const [selectedPhotoIds, setSelectedPhotoIds] = React.useState<string[]>([]);
  const [pendingDeletePhotoIds, setPendingDeletePhotoIds] = React.useState<string[]>([]);
  const [isPresented, setPresented] = React.useState(visible);
  const [isInlineViewerOpen, setInlineViewerOpen] = React.useState(false);
  const [inlineViewerIndex, setInlineViewerIndex] = React.useState(0);
  const slideX = React.useRef(new Animated.Value(visible ? 0 : width)).current;
  const dismissPendingRef = React.useRef(false);
  const onDidDismissRef = React.useRef(onDidDismiss);
  const previousClearSelectionSignalRef = React.useRef(clearSelectionSignal);
  const photoGridContentWidth = Math.max(0, width - (Spacing.xl * 2));
  const photoGridTileSize = Math.floor(
    (
      photoGridContentWidth
      - (Spacing.xs * (PHOTO_GRID_COLUMN_COUNT - 1))
    ) / PHOTO_GRID_COLUMN_COUNT,
  );
  const photoGridTileStyle = React.useMemo(
    () => ({
      height: photoGridTileSize,
      width: photoGridTileSize,
    }),
    [photoGridTileSize],
  );
  const showsAddPhotoTile =
    !isSelectionMode && !isCoverSelectMode && !isRecordSelectMode;

  React.useEffect(() => {
    onDidDismissRef.current = onDidDismiss;
  }, [onDidDismiss]);

  React.useEffect(() => {
    if (visible) {
      setSelectionMode(initialSelectionMode);
      setSelectedPhotoIds(initialSelectedPhotoIds ?? []);
      setPendingDeletePhotoIds([]);
      setInlineViewerOpen(false);
    }
  }, [initialSelectedPhotoIds, initialSelectionMode, visible]);

  React.useEffect(() => {
    if (visible) {
      dismissPendingRef.current = false;
      setPresented(true);
      slideX.setValue(width);
      Animated.timing(slideX, {
        toValue: 0,
        duration: transitionDuration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      return;
    }

    if (!isPresented) {
      return;
    }

    dismissPendingRef.current = true;
    Animated.timing(slideX, {
      toValue: width,
      duration: transitionDuration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && dismissPendingRef.current) {
        setPresented(false);
      }
    });
  }, [isPresented, slideX, transitionDuration, visible, width]);

  React.useEffect(() => {
    if (isPresented || visible || !dismissPendingRef.current) {
      return;
    }

    dismissPendingRef.current = false;
    onDidDismissRef.current?.();
  }, [isPresented, visible]);

  React.useEffect(() => {
    if (previousClearSelectionSignalRef.current === clearSelectionSignal) {
      return;
    }

    previousClearSelectionSignalRef.current = clearSelectionSignal;
    setSelectionMode(false);
    setSelectedPhotoIds([]);
    setPendingDeletePhotoIds([]);
  }, [clearSelectionSignal]);

  const togglePhoto = (photoId: string) => {
    setSelectedPhotoIds((currentIds) => (
      currentIds.includes(photoId)
        ? currentIds.filter((id) => id !== photoId)
        : [...currentIds, photoId]
    ));
  };

  const selectedCount = selectedPhotoIds.length;
  const showSelectionActionBar = !isCoverSelectMode && isSelectionMode && selectedCount > 0;

  const handleToggleSelectionMode = () => {
    setSelectionMode((current) => !current);
    setSelectedPhotoIds([]);
  };

  const handlePressDeleteSelected = () => {
    const targetPhotoIds = [...new Set(selectedPhotoIds)];

    if (targetPhotoIds.length === 0 || isDeleting) {
      return;
    }

    setPendingDeletePhotoIds(targetPhotoIds);
  };

  const handleRequestClose = () => {
    if (isDeleting) {
      return;
    }

    if (pendingDeletePhotoIds.length > 0) {
      setPendingDeletePhotoIds([]);
      return;
    }

    if (isInlineViewerOpen) {
      setInlineViewerOpen(false);
      return;
    }

    onClose();
  };

  if (!isPresented) {
    return null;
  }

  return (
    <Modal
      animationType="none"
      onRequestClose={handleRequestClose}
      transparent
      visible={isPresented}
    >
      <Animated.View
        style={[
          styles.modalScreen,
          {
            paddingTop: insets.top,
            transform: [{ translateX: slideX }],
          },
        ]}
      >
        <View style={styles.modalHeader}>
          <Pressable
            accessibilityRole="button"
            hitSlop={10}
            onPress={handleRequestClose}
            style={styles.headerButton}
          >
            <Feather name="chevron-left" size={28} color={Colors.foundation.black} />
          </Pressable>
          <Text style={styles.modalTitle}>
            {isCoverSelectMode
              ? '\uB300\uD45C\uC0AC\uC9C4 \uC120\uD0DD'
              : isSelectionMode
                ? `${selectedCount}\uAC1C \uC120\uD0DD`
                : `\uC0AC\uC9C4 ${photos.length}\uC7A5`}
          </Text>
          {isCoverSelectMode || isRecordSelectMode ? (
            <View style={styles.gridSelectButton} />
          ) : (
            <Pressable
              accessibilityRole="button"
              hitSlop={10}
              onPress={handleToggleSelectionMode}
              style={styles.gridSelectButton}
            >
              <Text style={styles.gridSelectText}>{isSelectionMode ? '\uCDE8\uC18C' : '\uC120\uD0DD'}</Text>
            </Pressable>
          )}
        </View>

        <Text style={styles.gridHint}>
          {isCoverSelectMode
            ? '\uB300\uD45C\uC0AC\uC9C4\uC73C\uB85C \uC0AC\uC6A9\uD560 \uC0AC\uC9C4\uC744 \uC120\uD0DD\uD574 \uC8FC\uC138\uC694.'
            : isSelectionMode
              ? isRecordSelectMode
                ? '\uC0AC\uC9C4\uC744 \uC120\uD0DD\uD574 \uAE30\uB85D\uC5D0 \uC5F0\uACB0\uD560 \uC218 \uC788\uC5B4\uC694.'
                : '\uC0AC\uC9C4\uC744 \uC120\uD0DD\uD574 \uAE30\uB85D\uC5D0 \uC5F0\uACB0\uD558\uAC70\uB098 \uC0AD\uC81C\uD560 \uC218 \uC788\uC5B4\uC694.'
              : '\uC0AC\uC9C4\uC744 \uB20C\uB7EC \uD06C\uAC8C \uD655\uC778\uD574 \uBCF4\uC138\uC694.'}
        </Text>

        <ScrollView
          contentContainerStyle={[
            styles.photoGrid,
            { paddingBottom: showSelectionActionBar ? insets.bottom + 96 : Spacing.xl },
          ]}
        >
          {showsAddPhotoTile ? (
            <Pressable
              accessibilityRole="button"
              onPress={onAddPhoto}
              style={[styles.gridPhoto, photoGridTileStyle, styles.gridAddPhoto]}
            >
              <Feather name="plus" size={28} color={Colors.foundation.grey500} />
              <Text style={styles.gridAddPhotoText}>{'\uC0AC\uC9C4 \uCD94\uAC00'}</Text>
            </Pressable>
          ) : null}
          {photos.length === 0 && !showsAddPhotoTile ? (
            <View style={styles.gridEmptyState}>
              <Text style={styles.gridEmptyText}>
                {isCoverSelectMode
                  ? '\uC774 \uC7A5\uC18C\uC5D0 \uCD94\uAC00\uB41C \uC0AC\uC9C4\uC774 \uC5C6\uC5B4\uC694.\n\uC0AC\uC9C4\uC744 \uCD94\uAC00\uD55C \uB4A4 \uB300\uD45C\uC0AC\uC9C4\uC744 \uBCC0\uACBD\uD560 \uC218 \uC788\uC5B4\uC694.'
                  : '\uC0AC\uC9C4\uC774 \uC5C6\uC5B4\uC694.'}
              </Text>
            </View>
          ) : null}
          {photos.map((photo, index) => {
            const isSelected = isCoverSelectMode
              ? photo.id === coverPhotoId
              : selectedPhotoIds.includes(photo.id);
            return (
              <Pressable
                key={photo.id}
                onPress={() => {
                  if (isCoverSelectMode) {
                    onPressPhoto(index);
                    return;
                  }

                  if (isSelectionMode || isRecordSelectMode) {
                    togglePhoto(photo.id);
                    return;
                  }

                  setInlineViewerIndex(index);
                  setInlineViewerOpen(true);
                }}
                style={[styles.gridPhoto, photoGridTileStyle]}
              >
                <Image source={photo.source} style={styles.gridPhotoImage} resizeMode="cover" />
                {(isSelectionMode || isCoverSelectMode || isRecordSelectMode) && isSelected ? <View style={styles.gridSelectedOverlay} /> : null}
                {isSelectionMode || isCoverSelectMode || isRecordSelectMode ? (
                  <View style={[styles.gridCheck, isSelected && styles.gridCheckSelected]}>
                    {isSelected ? <Feather name="check" size={14} color={Colors.foundation.white} /> : null}
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>

        {showSelectionActionBar ? (
          <View style={[styles.gridBottomBar, { paddingBottom: insets.bottom + Spacing.lg }]}>
            <View style={styles.gridActionRow}>
              <Pressable
                accessibilityRole="button"
                onPress={() => onStartRecord(selectedPhotoIds)}
                style={styles.gridRecordButton}
              >
                <Text style={styles.gridRecordButtonText}>{'\uC120\uD0DD \uC644\uB8CC'}</Text>
              </Pressable>
              {isRecordSelectMode ? null : (
                <Pressable
                  accessibilityRole="button"
                  onPress={handlePressDeleteSelected}
                  style={styles.gridDeleteButton}
                >
                  <Text style={styles.gridDeleteButtonText}>{'\uC0AD\uC81C'}</Text>
                </Pressable>
              )}
            </View>
          </View>
        ) : null}
        <FullScreenImageViewer
          actionLabel={viewerActionLabel}
          actions={viewerActions}
          images={photos.map((photo) => photo.source)}
          initialIndex={inlineViewerIndex}
          onClose={() => setInlineViewerOpen(false)}
          onPressAction={onPressViewerAction}
          presentation="inline"
          renderActionSheet={renderViewerActionSheet}
          visible={isInlineViewerOpen}
        />
        {pendingDeletePhotoIds.length > 0 ? (
          <View style={[styles.overlay, styles.photoDeleteInlineOverlay]}>
            <View style={styles.deleteModal}>
              <Text style={styles.deleteTitle}>
                {'\uC120\uD0DD\uD55C \uC0AC\uC9C4\uC744 \uC0AD\uC81C\uD560\uAE4C\uC694?'}
              </Text>
              <Text style={styles.deleteDescription}>
                {pendingDeletePhotoIds.length}
                {'\uC7A5\uC758 \uC0AC\uC9C4\uC740 \uAE30\uAE30 \uC0AC\uC9C4\uCCA9\uC5D0\uC11C\uB294 \uC0AD\uC81C\uB418\uC9C0 \uC54A\uACE0, Travu\uC758 \uD604\uC7AC \uC7A5\uC18C \uC0AC\uC9C4 \uBAA9\uB85D\uC5D0\uC11C\uB9CC \uC0AD\uC81C\uB429\uB2C8\uB2E4.'}
              </Text>
              <View style={styles.deleteButtonRow}>
                <Pressable
                  disabled={isDeleting}
                  onPress={() => setPendingDeletePhotoIds([])}
                  style={styles.secondaryButton}
                >
                  <Text style={styles.secondaryButtonText}>{'\uCDE8\uC18C'}</Text>
                </Pressable>
                <Pressable
                  disabled={isDeleting}
                  onPress={() => {
                    const targetPhotoIds = [...pendingDeletePhotoIds];
                    onRequestDeletePhotos(targetPhotoIds);
                  }}
                  style={[
                    styles.destructiveButton,
                    isDeleting && styles.destructiveButtonDisabled,
                  ]}
                >
                  <Text style={styles.destructiveButtonText}>
                    {isDeleting ? '\uC0AD\uC81C \uC911...' : '\uC0AD\uC81C'}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        ) : null}
      </Animated.View>
    </Modal>
  );
}

interface RecordCreateModalProps {
  visible: boolean;
  draft: string;
  mode: 'sheet' | 'screen';
  photos: PlaceDetailPhoto[];
  timeLabel?: string;
  presentation?: 'modal' | 'inline';
  allowPhotoPicker?: boolean;
  allowPhotoChanges?: boolean;
  title?: string;
  onChangeDraft: (value: string) => void;
  onChangeTime: (value: string) => void;
  onClose: () => void;
  onDidDismiss?: () => void;
  onOpenPhotoPicker: () => void;
  onRemovePhoto: (photoId: string) => void;
  onSave: () => Promise<void> | void;
  isSaving?: boolean;
}

function RecordCreateModal({
  visible,
  draft,
  mode,
  photos,
  timeLabel,
  presentation = 'modal',
  allowPhotoPicker = true,
  allowPhotoChanges = true,
  title = '\uAE30\uB85D \uCD94\uAC00',
  onChangeDraft,
  onChangeTime,
  onClose,
  onDidDismiss,
  onOpenPhotoPicker,
  onRemovePhoto,
  onSave,
  isSaving = false,
}: RecordCreateModalProps) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [isTimePickerOpen, setTimePickerOpen] = React.useState(false);
  const [isSheetPresented, setSheetPresented] = React.useState(visible);
  const [isKeyboardVisible, setKeyboardVisible] = React.useState(false);
  const [keyboardTopY, setKeyboardTopY] = React.useState(windowHeight);
  const dimOpacity = React.useRef(new Animated.Value(0)).current;
  const sheetTranslateY = React.useRef(new Animated.Value(320)).current;
  const formScrollRef = React.useRef<ScrollView>(null);
  const recordInputOffsetYRef = React.useRef(0);
  const dismissPendingRef = React.useRef(false);
  const isSheetPresentedRef = React.useRef(visible);
  const onDidDismissRef = React.useRef(onDidDismiss);
  const isScreenMode = mode === 'screen';
  const isInlinePresentation = presentation === 'inline';
  const saveDisabled = isSaving || !draft.trim();
  const showMemoPlaceholder = draft.length === 0;
  const keyboardBottomOffset = isKeyboardVisible
    ? Math.max(windowHeight - keyboardTopY, 0)
    : 0;
  const keyboardSheetTopClearance = insets.top + Spacing['3xl'];
  const keyboardSheetMaxHeight = Math.max(
    windowHeight - keyboardBottomOffset - keyboardSheetTopClearance,
    0,
  );

  React.useEffect(() => {
    onDidDismissRef.current = onDidDismiss;
  }, [onDidDismiss]);

  const scrollRecordInputIntoView = React.useCallback(() => {
    requestAnimationFrame(() => {
      formScrollRef.current?.scrollTo({
        animated: true,
        y: Math.max(recordInputOffsetYRef.current - Spacing.lg, 0),
      });
    });
  }, []);

  React.useEffect(() => {
    const keyboardShowEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const keyboardHideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSubscription = Keyboard.addListener(keyboardShowEvent, (event) => {
      Keyboard.scheduleLayoutAnimation(event);
      setKeyboardTopY(event.endCoordinates.screenY);
      setKeyboardVisible(true);
      scrollRecordInputIntoView();
    });
    const hideSubscription = Keyboard.addListener(keyboardHideEvent, (event) => {
      Keyboard.scheduleLayoutAnimation(event);
      setKeyboardVisible(false);
      setKeyboardTopY(windowHeight);
      formScrollRef.current?.scrollTo({ animated: true, y: 0 });
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [scrollRecordInputIntoView, windowHeight]);

  React.useEffect(() => {
    if (isScreenMode) {
      return undefined;
    }

    if (visible) {
      dismissPendingRef.current = false;
      isSheetPresentedRef.current = true;
      setSheetPresented(true);
      dimOpacity.setValue(0);
      sheetTranslateY.setValue(320);
      Animated.parallel([
        Animated.timing(dimOpacity, {
          toValue: 1,
          duration: RECORD_SHEET_DIM_DURATION,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(sheetTranslateY, {
          toValue: 0,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
      return undefined;
    }

    if (!isSheetPresentedRef.current) {
      return undefined;
    }

    dismissPendingRef.current = true;
    Animated.parallel([
      Animated.timing(dimOpacity, {
        toValue: 0,
        duration: RECORD_SHEET_DIM_DURATION,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(sheetTranslateY, {
        toValue: 320,
        duration: 180,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished && dismissPendingRef.current) {
        isSheetPresentedRef.current = false;
        setSheetPresented(false);
      }
    });

    return undefined;
  }, [dimOpacity, isScreenMode, sheetTranslateY, visible]);

  React.useEffect(() => {
    if (
      isInlinePresentation
      || isScreenMode
      || isSheetPresented
      || visible
      || !dismissPendingRef.current
    ) {
      return;
    }

    dismissPendingRef.current = false;
    onDidDismissRef.current?.();
  }, [isInlinePresentation, isScreenMode, isSheetPresented, visible]);

  const handleSavePress = React.useCallback(() => {
    Keyboard.dismiss();
    void onSave();
  }, [onSave]);
  const handleBackdropPress = React.useCallback(() => {
    if (isKeyboardVisible) {
      Keyboard.dismiss();
      return;
    }

    onClose();
  }, [isKeyboardVisible, onClose]);

  const content = (
    <View style={isScreenMode ? styles.recordScreenContent : styles.recordSheetContent}>
      <ScrollView
        contentContainerStyle={
          isScreenMode
            ? styles.recordScreenScrollContent
            : styles.recordSheetScrollContent
        }
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        keyboardShouldPersistTaps="handled"
        ref={formScrollRef}
        showsVerticalScrollIndicator={false}
        style={isScreenMode ? styles.recordScreenScroll : styles.recordSheetScroll}
      >
        <View style={styles.recordModalHeader}>
          {isScreenMode ? (
            <Pressable accessibilityRole="button" hitSlop={10} onPress={onClose} style={styles.recordCloseButton}>
              <Feather name="chevron-left" size={28} color={Colors.foundation.black} />
            </Pressable>
          ) : (
            <View style={styles.recordCloseButton} />
          )}
          <Text style={styles.recordModalTitle}>{title}</Text>
          <View style={styles.recordCloseButton} />
        </View>

        <View style={styles.selectedPhotosBlock}>
          <View style={styles.selectedPhotosHeader}>
            <Text style={styles.selectedPhotosLabel}>{'\uC0AC\uC9C4 \uC5F0\uACB0'}</Text>
            <Text style={styles.selectedPhotosOptional}>{'\uC120\uD0DD \uC0AC\uD56D'}</Text>
          </View>
          <ScrollView
            horizontal
            keyboardShouldPersistTaps="handled"
            showsHorizontalScrollIndicator={false}
          >
            <View style={styles.selectedPhotoRow}>
              {allowPhotoPicker && allowPhotoChanges ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={onOpenPhotoPicker}
                  style={[styles.selectedPhotoThumb, styles.linkPhotoButton]}
                >
                  <Feather name="plus" size={20} color={Colors.foundation.grey600} />
                  <Text style={styles.linkPhotoButtonText}>{'\uC0AC\uC9C4 \uCD94\uAC00'}</Text>
                </Pressable>
              ) : null}
              {photos.map((photo) => (
                <View key={photo.id} style={styles.linkedPhotoThumbWrap}>
                  <Image resizeMode="cover" source={photo.source} style={styles.selectedPhotoThumb} />
                  {allowPhotoChanges ? (
                    <Pressable
                      accessibilityRole="button"
                      hitSlop={8}
                      onPress={() => onRemovePhoto(photo.id)}
                      style={styles.unlinkPhotoButton}
                    >
                      <Feather name="x" size={12} color={Colors.foundation.white} />
                    </Pressable>
                  ) : null}
                </View>
              ))}
            </View>
          </ScrollView>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => setTimePickerOpen(true)}
          style={styles.timeRow}
        >
          <Text style={styles.timeLabel}>{'\uBC29\uBB38 \uC2DC\uAC04'}</Text>
          <View style={styles.timeValueRow}>
            <Text style={styles.timeValue}>{timeLabel ?? '\uC2DC\uAC04 \uBBF8\uC815'}</Text>
            <Feather name="chevron-right" size={18} color={Colors.foundation.grey500} />
          </View>
        </Pressable>

        <View
          onLayout={(event) => {
            recordInputOffsetYRef.current = event.nativeEvent.layout.y;
          }}
          style={styles.memoBlock}
        >
          <Text style={styles.memoLabel}>{'\uAE30\uB85D'}</Text>
          <View style={styles.recordInputFrame}>
            <AppTextInput
              multiline
              maxLength={1000}
              onChangeText={onChangeDraft}
              onFocus={scrollRecordInputIntoView}
              placeholder=""
              placeholderTextColor={Colors.foundation.grey500}
              style={styles.recordInput}
              value={draft}
            />
            {showMemoPlaceholder ? (
              <Text pointerEvents="none" style={styles.recordInputPlaceholder}>
                {'\uC774 \uC7A5\uC18C\uC5D0\uC11C \uC5B4\uB5A4 \uC21C\uAC04\uC744 \uAE30\uC5B5\uD558\uB098\uC694?'}
              </Text>
            ) : null}
          </View>
          <Text style={styles.memoCount}>{draft.length}/1000</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          disabled={saveDisabled}
          onPress={handleSavePress}
          style={[styles.saveButton, saveDisabled && styles.saveButtonDisabled]}
        >
          <Text style={styles.saveButtonText}>{'\uC800\uC7A5\uD558\uAE30'}</Text>
        </Pressable>
      </ScrollView>
      <TimeWheelPickerModal
        onClose={() => setTimePickerOpen(false)}
        onConfirm={(nextTime) => {
          onChangeTime(formatPlaceEntryTime(nextTime));
          setTimePickerOpen(false);
        }}
        value={parsePlaceEntryTime(timeLabel)}
        visible={isTimePickerOpen}
      />
    </View>
  );

  if (isScreenMode) {
    return (
      <Modal animationType="slide" visible={visible} onRequestClose={onClose}>
        <SafeAreaView style={styles.recordScreen}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.recordKeyboardView}
          >
            {content}
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    );
  }

  const sheetContent = (
    <View style={styles.sheetOverlay}>
      <Animated.View style={[styles.sheetDim, { opacity: dimOpacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleBackdropPress} />
      </Animated.View>
      <Animated.View
        style={[
          styles.recordSheet,
          isKeyboardVisible && {
            marginBottom: keyboardBottomOffset,
            maxHeight: keyboardSheetMaxHeight,
          },
          {
            paddingBottom: insets.bottom + Spacing.xl,
            transform: [{ translateY: sheetTranslateY }],
          },
        ]}
      >
        <View style={styles.sheetHandle} />
        {content}
      </Animated.View>
    </View>
  );

  if (isInlinePresentation) {
    if (!visible && !isSheetPresented) {
      return null;
    }

    return <View style={styles.inlineRecordSheetOverlay}>{sheetContent}</View>;
  }

  return (
    <Modal animationType="none" transparent visible={visible || isSheetPresented} onRequestClose={onClose}>
      {sheetContent}
    </Modal>
  );
}

interface ConfirmDeleteModalProps {
  visible: boolean;
  onCancel: () => void;
  onDelete: () => Promise<void> | void;
  isDeleting?: boolean;
}

function ConfirmDeleteModal({ visible, onCancel, onDelete }: ConfirmDeleteModalProps) {
  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.deleteModal}>
          <Text style={styles.deleteTitle}>{'\uC774 \uC7A5\uC18C\uB97C \uC0AD\uC81C\uD560\uAE4C\uC694?'}</Text>
          <Text style={styles.deleteDescription}>
            {'\uC5F0\uACB0\uB41C \uC0AC\uC9C4\uACFC \uAE30\uB85D\uC740 \uD568\uAED8 \uC815\uB9AC\uB420 \uC218 \uC788\uC5B4\uC694.'}
          </Text>
          <View style={styles.deleteButtonRow}>
            <Pressable onPress={onCancel} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>{'\uCDE8\uC18C'}</Text>
            </Pressable>
            <Pressable onPress={onDelete} style={styles.destructiveButton}>
              <Text style={styles.destructiveButtonText}>{'\uC0AD\uC81C'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function ConfirmRecordDeleteModal({
  visible,
  onCancel,
  onDelete,
  isDeleting = false,
}: ConfirmDeleteModalProps) {
  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <Pressable
          disabled={isDeleting}
          style={StyleSheet.absoluteFill}
          onPress={onCancel}
        />
        <View style={styles.deleteModal}>
          <Text style={styles.deleteTitle}>{'\uAE30\uB85D\uC744 \uC0AD\uC81C\uD560\uAE4C\uC694?'}</Text>
          <Text style={styles.deleteDescription}>
            {'\uC0AD\uC81C\uD55C \uAE30\uB85D\uC740 \uC774 \uC7A5\uC18C\uC5D0\uC11C \uB354 \uC774\uC0C1 \uD45C\uC2DC\uB418\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.'}
          </Text>
          <View style={styles.deleteButtonRow}>
            <Pressable disabled={isDeleting} onPress={onCancel} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>{'\uCDE8\uC18C'}</Text>
            </Pressable>
            <Pressable
              disabled={isDeleting}
              onPress={onDelete}
              style={[
                styles.destructiveButton,
                isDeleting && styles.destructiveButtonDisabled,
              ]}
            >
              <Text style={styles.destructiveButtonText}>{'\uC0AD\uC81C'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.light.bgScreen,
  },
  header: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: Spacing.md,
    paddingRight: Spacing.xl,
    backgroundColor: Colors.light.bgScreen,
    zIndex: 10,
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreMenu: {
    position: 'absolute',
    right: Spacing.xl,
    top: 44,
    width: 220,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.lg,
    backgroundColor: Colors.foundation.white,
    zIndex: 30,
    ...Shadows.card,
  },
  menuDismissLayer: {
    position: 'absolute',
    top: 44,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 5,
  },
  menuRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  menuLabel: {
    ...Typography.body2Regular,
    color: Colors.foundation.black,
  },
  menuLabelDestructive: {
    color: DESTRUCTIVE,
  },
  menuDivider: {
    height: 1,
    marginVertical: Spacing.xs,
    marginHorizontal: Spacing.lg,
    backgroundColor: Colors.foundation.grey100,
  },
  scrollContent: {
    gap: Spacing['3xl'],
  },
  topGroup: {
    gap: Spacing['2xl'],
  },
  hero: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: Colors.foundation.grey100,
  },
  heroPage: {
    height: '100%',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroPlaceholder: {
    flex: 1,
    backgroundColor: Colors.foundation.grey100,
  },
  heroBadge: {
    position: 'absolute',
    right: Spacing.xl,
    bottom: Spacing.xl,
    height: 24,
    minWidth: 47,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
    borderRadius: 12,
    backgroundColor: 'rgba(87, 87, 87, 0.50)',
  },
  heroBadgeText: {
    ...Typography.captionEmphasized,
    color: Colors.foundation.white,
  },
  placeInfo: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.xs,
  },
  placeTitle: {
    fontFamily: Typography.title2.fontFamily,
    fontSize: 20,
    lineHeight: 24,
    color: Colors.foundation.black,
  },
  placeMeta: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.grey600,
  },
  dateText: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.grey500,
  },
  section: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.body1Emphasized,
    color: Colors.foundation.black,
  },
  sectionCount: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.grey500,
  },
  viewAllButton: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewAllText: {
    ...Typography.body2Regular,
    color: Colors.foundation.black,
  },
  photoStatus: {
    alignItems: 'flex-start',
    gap: Spacing.xs,
  },
  photoStatusText: {
    ...Typography.body2Regular,
    color: Colors.foundation.grey600,
  },
  photoStatusAction: {
    minHeight: Spacing['3xl'],
    justifyContent: 'center',
  },
  photoStatusActionText: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.black,
  },
  thumbnailScroll: {
    marginHorizontal: -Spacing.xl,
    paddingHorizontal: Spacing.xl,
  },
  thumbnailRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    paddingRight: Spacing.xl,
  },
  photoThumb: {
    width: 80,
    height: 96,
    overflow: 'hidden',
    borderRadius: Radius.xs,
    backgroundColor: Colors.foundation.grey100,
  },
  photoAddThumb: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.foundation.grey100,
  },
  photoThumbImage: {
    width: '100%',
    height: '100%',
  },
  addRecordButton: {
    width: 52,
    height: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: 16,
    backgroundColor: Colors.foundation.grey100,
  },
  addRecordButtonText: {
    ...Typography.captionEmphasized,
    color: Colors.foundation.black,
  },
  recordSwipeContainer: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: Radius.xs,
  },
  recordSpacingWithPhotos: {
    marginBottom: Spacing.xl,
  },
  recordSpacingTextOnly: {
    marginBottom: Spacing.md,
  },
  recordDeleteBackground: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    alignItems: 'stretch',
    justifyContent: 'center',
    backgroundColor: DESTRUCTIVE,
    overflow: 'hidden',
  },
  recordDeleteAction: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordItem: {
    width: '100%',
    backgroundColor: Colors.light.bgScreen,
    zIndex: 1,
  },
  recordItemPressable: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'flex-start',
  },
  recordTimeColumn: {
    width: 38,
    alignItems: 'center',
    gap: Spacing.lg,
    alignSelf: 'stretch',
    paddingTop: Spacing.xs,
  },
  recordTime: {
    ...Typography.captionEmphasized,
    width: '100%',
    lineHeight: 14,
    color: Colors.foundation.grey500,
    textAlign: 'center',
  },
  recordLine: {
    width: 2,
    flex: 1,
    minHeight: 56,
    backgroundColor: Colors.foundation.grey100,
  },
  recordLineLast: {
    minHeight: 36,
  },
  recordLineTextOnly: {
    minHeight: Spacing.md,
  },
  recordBody: {
    flex: 1,
    flexDirection: 'row',
    gap: Spacing.md,
    minWidth: 0,
    alignItems: 'flex-start',
  },
  recordText: {
    ...Typography.body2Regular,
    flex: 1,
    color: Colors.foundation.black,
    textAlign: 'justify',
  },
  recordPhoto: {
    width: 72,
    height: 90,
    overflow: 'hidden',
    borderRadius: Radius.xs,
    backgroundColor: Colors.foundation.grey100,
  },
  recordPhotoImage: {
    width: '100%',
    height: '100%',
  },
  recordPhotoCountBadge: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    minWidth: 24,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.58)',
  },
  recordPhotoCountText: {
    ...Typography.captionEmphasized,
    color: Colors.foundation.white,
  },
  modalScreen: {
    flex: 1,
    backgroundColor: Colors.light.bgScreen,
  },
  modalHeader: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
  },
  modalTitle: {
    ...Typography.body1Emphasized,
    color: Colors.foundation.black,
  },
  gridSelectButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  gridSelectText: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.black,
  },
  hiddenGridControl: {
    opacity: 0,
  },
  gridHint: {
    ...Typography.captionRegular,
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.xl,
    color: Colors.foundation.grey500,
    textAlign: 'center',
  },
  photoGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xs,
  },
  gridEmptyState: {
    width: '100%',
    minHeight: 240,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridEmptyText: {
    ...Typography.body2Regular,
    color: Colors.foundation.grey500,
  },
  gridPhoto: {
    flexShrink: 0,
    overflow: 'hidden',
    borderRadius: Radius.xs,
    backgroundColor: Colors.foundation.grey100,
  },
  gridAddPhoto: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  gridAddPhotoText: {
    ...Typography.captionEmphasized,
    color: Colors.foundation.grey600,
  },
  gridPhotoImage: {
    width: '100%',
    height: '100%',
  },
  gridSelectedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
  },
  gridCheck: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.foundation.white,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(0, 0, 0, 0.24)',
  },
  gridCheckSelected: {
    backgroundColor: Colors.foundation.black,
  },
  gridBottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    backgroundColor: Colors.light.bgScreen,
  },
  gridActionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  gridRecordButton: {
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.sm,
    backgroundColor: Colors.foundation.black,
  },
  gridRecordButtonText: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.white,
  },
  gridDeleteButton: {
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.sm,
    backgroundColor: DESTRUCTIVE,
  },
  gridDeleteButtonText: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.white,
  },
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
  },
  photoDeleteInlineOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 70,
  },
  sheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  inlineRecordSheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 60,
  },
  sheetDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
  },
  recordSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: Colors.foundation.white,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    marginTop: Spacing.md,
    borderRadius: Radius.full,
    backgroundColor: Colors.foundation.grey300,
  },
  recordSheetContent: {
    flexShrink: 1,
  },
  recordSheetScroll: {
    flexShrink: 1,
  },
  recordSheetScrollContent: {
    flexGrow: 1,
    gap: Spacing.lg,
    padding: Spacing.xl,
  },
  recordScreen: {
    flex: 1,
    backgroundColor: Colors.light.bgScreen,
  },
  recordKeyboardView: {
    flex: 1,
  },
  recordScreenContent: {
    flex: 1,
  },
  recordScreenScroll: {
    flex: 1,
  },
  recordScreenScrollContent: {
    flexGrow: 1,
    gap: Spacing.xl,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  recordModalHeader: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recordCloseButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordModalTitle: {
    ...Typography.body1Emphasized,
    color: Colors.foundation.black,
  },
  selectedPhotosBlock: {
    gap: Spacing.sm,
  },
  selectedPhotosHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  selectedPhotosLabel: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.black,
  },
  selectedPhotosOptional: {
    ...Typography.captionRegular,
    color: Colors.foundation.grey500,
  },
  selectedPhotoRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  selectedPhotoThumb: {
    width: 64,
    height: 64,
    borderRadius: Radius.xs,
  },
  linkPhotoButton: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderWidth: 1,
    borderColor: Colors.foundation.grey100,
    backgroundColor: Colors.foundation.white,
  },
  linkPhotoButtonText: {
    ...Typography.captionSmall,
    color: Colors.foundation.grey600,
  },
  linkedPhotoThumbWrap: {
    position: 'relative',
  },
  unlinkPhotoButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.full,
    backgroundColor: 'rgba(0, 0, 0, 0.58)',
  },
  timeRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: Colors.foundation.grey100,
  },
  timeLabel: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.black,
  },
  timeValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  timeValue: {
    ...Typography.body2Regular,
    color: Colors.foundation.grey600,
  },
  memoBlock: {
    gap: Spacing.sm,
  },
  memoLabel: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.black,
  },
  recordInputFrame: {
    position: 'relative',
    minHeight: 150,
    borderWidth: 1,
    borderColor: Colors.foundation.grey100,
    borderRadius: Radius.sm,
  },
  recordInput: {
    minHeight: 150,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    ...Typography.body2Regular,
    color: Colors.foundation.black,
    includeFontPadding: true,
    textAlignVertical: 'top',
  },
  recordInputPlaceholder: {
    position: 'absolute',
    top: Spacing.md,
    left: Spacing.md,
    right: Spacing.md,
    ...Typography.body2Regular,
    color: Colors.foundation.grey500,
    includeFontPadding: true,
  },
  memoCount: {
    ...Typography.captionRegular,
    alignSelf: 'flex-end',
    color: Colors.foundation.grey500,
  },
  saveButton: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.sm,
    backgroundColor: Colors.foundation.black,
  },
  saveButtonDisabled: {
    backgroundColor: Colors.foundation.grey300,
  },
  saveButtonText: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.white,
  },
  deleteModal: {
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    gap: Spacing.lg,
    padding: Spacing.xl,
    borderRadius: Radius.lg,
    backgroundColor: Colors.foundation.white,
  },
  deleteTitle: {
    ...Typography.body1Emphasized,
    color: Colors.foundation.black,
    textAlign: 'center',
  },
  deleteDescription: {
    ...Typography.body2Regular,
    color: Colors.foundation.grey600,
    textAlign: 'center',
  },
  deleteButtonRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  secondaryButton: {
    width: 120,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.foundation.grey100,
    borderRadius: Radius.sm,
  },
  secondaryButtonText: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.black,
  },
  destructiveButton: {
    width: 120,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.sm,
    backgroundColor: DESTRUCTIVE,
  },
  destructiveButtonDisabled: {
    backgroundColor: Colors.foundation.grey300,
  },
  destructiveButtonText: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.white,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle: {
    ...Typography.body1Emphasized,
    color: Colors.foundation.black,
  },
  emptyDescription: {
    ...Typography.body2Regular,
    color: Colors.foundation.grey600,
    textAlign: 'center',
  },
  recordsEmptyState: {
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.xl,
  },
  recordsEmptyTitle: {
    ...Typography.body1Emphasized,
    color: Colors.foundation.black,
    textAlign: 'center',
  },
  recordsEmptyDescription: {
    ...Typography.body2Regular,
    color: Colors.foundation.grey600,
    textAlign: 'center',
  },
});
