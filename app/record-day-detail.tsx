/**
 * record-day-detail
 * Figma: day-recording-detail (1207:2245)
 */
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
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
import { SafeAreaView } from 'react-native-safe-area-context';

import Text from '@/components/common/AppText';
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
import { getDaySelectorItemsForTrip } from '@/constants/mockDetectedTrips';
import {
  DEFAULT_RECORD_DAY,
  RECORD_DAY_ENTRIES,
  RECORD_DAY_OPTIONS,
} from '@/constants/mockRecordDayDetail';
import { RECORD_DAY_ENTRY_IMAGES } from '@/constants/recordTripImages';
import { addSavedCompletedTrip } from '@/constants/savedMyPageTrips';
import type { DestinationOption } from '@/constants/mockTripDestinations';
import { Colors, FontFamily, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import {
  isPlaceDetailDeleted,
  markPlaceDetailDeleted,
} from '@/services/placeDetailDeletionRegistry';

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
  return entry.googlePlaceId ?? entry.id;
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
                  {day.dayNumber}일차
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
  const { width } = useWindowDimensions();
  const {
    tripId,
    dayId,
    updatedPlaceId,
    updatedPhotoUris,
    deletedSourceIndexes,
    entryPoint,
    mode,
    detectedTripId,
    cityName,
    countryName,
    startDate,
    endDate,
    photoCount,
  } = useLocalSearchParams<{
    tripId?: string;
    dayId?: string;
    updatedPlaceId?: string;
    updatedPhotoUris?: string;
    deletedSourceIndexes?: string;
    entryPoint?: string;
    mode?: string;
    detectedTripId?: string;
    cityName?: string;
    countryName?: string;
    startDate?: string;
    endDate?: string;
    photoCount?: string;
  }>();
  const isDetectedTripDraft = entryPoint === 'detectedTrip' || mode === 'create';

  const baseDayOptions = useMemo(() => {
    if (isDetectedTripDraft) {
      return createDetectedTripDraftDays(startDate, endDate, photoCount);
    }

    if (tripId) {
      return getDaySelectorItemsForTrip(tripId) ?? RECORD_DAY_OPTIONS;
    }
    return RECORD_DAY_OPTIONS;
  }, [endDate, isDetectedTripDraft, photoCount, startDate, tripId]);

  const [dayOptions, setDayOptions] = useState<DaySelectorItem[]>(() => baseDayOptions);
  const [selectedDay, setSelectedDay] = useState<DaySelectorItem>(() =>
    resolveInitialDay(baseDayOptions, dayId),
  );
  const [selectedFilterId, setSelectedFilterId] = useState<string>(() =>
    resolveInitialDay(baseDayOptions, dayId).id,
  );
  const [daySheetVisible, setDaySheetVisible] = useState(false);
  const [headerMenuVisible, setHeaderMenuVisible] = useState(false);
  const [placeEntryModalVisible, setPlaceEntryModalVisible] = useState(false);
  const [placeEntryFormMode, setPlaceEntryFormMode] =
    useState<PlaceEntryFormMode>('create');
  const [editingEntry, setEditingEntry] = useState<PlaceEntry | null>(null);
  const [entriesByDay, setEntriesByDay] = useState<Record<string, PlaceEntry[]>>({});
  const [photoGridEntry, setPhotoGridEntry] = useState<PlaceEntry | null>(null);
  const [isPhotoGridSelectionMode, setPhotoGridSelectionMode] = useState(false);
  const [selectedPhotoIndexes, setSelectedPhotoIndexes] = useState<number[]>([]);
  const [, setPendingDeletePhoto] = useState<{
    entry: PlaceEntry;
    photoIndex: number;
  } | null>(null);
  const [tripInfoModalVisible, setTripInfoModalVisible] = useState(false);

  useEffect(() => {
    setDayOptions(baseDayOptions);
    const initialDay = resolveInitialDay(baseDayOptions, dayId);
    setSelectedDay(initialDay);
    setSelectedFilterId(initialDay.id);
  }, [baseDayOptions, dayId]);

  useEffect(() => {
    const nextPhotoUris = parseUpdatedPhotoUris(updatedPhotoUris);
    const nextDeletedSourceIndexes = parseNumberArrayParam(deletedSourceIndexes);

    if (!updatedPlaceId || (nextPhotoUris.length === 0 && nextDeletedSourceIndexes.length === 0)) {
      return;
    }

    const targetDayId = dayId ?? selectedDay.id;

    setEntriesByDay((current) => {
      const dayEntries = current[targetDayId] ?? RECORD_DAY_ENTRIES;
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
  }, [dayId, deletedSourceIndexes, selectedDay.id, updatedPhotoUris, updatedPlaceId]);

  const entries = useMemo(() => {
    if (isDetectedTripDraft) {
      return [];
    }

    const dayEntries = selectedFilterId === ALL_DAYS_ID
      ? dayOptions.flatMap((day) => entriesByDay[day.id] ?? RECORD_DAY_ENTRIES)
      : entriesByDay[selectedDay.id] ?? RECORD_DAY_ENTRIES;

    return dayEntries.filter((entry) => !isPlaceDetailDeleted(getEntryPlaceId(entry))).sort(
      (left, right) => getTimeSortValue(left.time) - getTimeSortValue(right.time),
    );
  }, [dayOptions, entriesByDay, isDetectedTripDraft, selectedDay.id, selectedFilterId]);
  const tripInfoInitialValue = useMemo(
    () => {
      const initialValue = createTripSetupInitialValue(dayOptions, entries);

      if (!isDetectedTripDraft) {
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
      isDetectedTripDraft,
      startDate,
    ],
  );
  const photoGridSources = useMemo(() => getPhotoSources(photoGridEntry), [photoGridEntry]);

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
    router.push({
      pathname: '/place-detail',
      params: {
        tripId: tripId ?? 'record-trip',
        dayId: selectedDay.id,
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
  };

  const getEntryDayId = (entry: PlaceEntry) => {
    for (const day of dayOptions) {
      const dayEntries = entriesByDay[day.id]
        ?? (day.id === selectedDay.id ? RECORD_DAY_ENTRIES : undefined);

      if (dayEntries?.some((item) => item.id === entry.id)) {
        return day.id;
      }
    }

    return entry.dayId ?? selectedDay.id;
  };

  const handleSubmitPlaceEntry = (input: PlaceCreateInput) => {
    const { dayOptions: nextDayOptions, targetDay } = resolveDayForPlaceInput(
      dayOptions,
      input,
      selectedDay,
    );
    const targetDayId = targetDay.id;

    if (nextDayOptions !== dayOptions) {
      setDayOptions(nextDayOptions);
      setSelectedDay((current) =>
        nextDayOptions.find((day) => day.id === current.id) ?? current,
      );
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

  const handleDeleteEntry = (entry: PlaceEntry) => {
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
            markPlaceDetailDeleted(targetPlaceId);
            setEntriesByDay((current) => {
              const nextEntriesByDay = { ...current };

              for (const day of dayOptions) {
                const dayEntries = nextEntriesByDay[day.id]
                  ?? (day.id === selectedDay.id ? RECORD_DAY_ENTRIES : undefined);

                if (!dayEntries) {
                  continue;
                }

                nextEntriesByDay[day.id] = dayEntries.filter(
                  (item) => getEntryPlaceId(item) !== targetPlaceId,
                );
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

  const handleSaveTrip = () => {
    setHeaderMenuVisible(false);
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
        onBackPress={() => router.back()}
        centerSlot={
          <Text style={styles.headerDateText}>{formatHeaderDate(selectedDay)}</Text>
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
            <Pressable accessibilityRole="button" onPress={handleSaveTrip} style={styles.headerMenuRow}>
              <Feather name="archive" size={18} color={Colors.foundation.black} />
              <Text style={styles.headerMenuLabel}>{'\uC5EC\uD589 \uC800\uC7A5'}</Text>
            </Pressable>
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
        contentContainerStyle={styles.scrollContent}
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
            photoDisplayMode="limited"
            showRating={false}
            variant="recordPhotoReview"
            onLongPress={() => handleDeleteEntry(entry)}
            onPress={() => handleOpenPlaceDetail(entry)}
            onPhotoDelete={(photoIndex) => confirmDeletePhotoFromEntry(entry, photoIndex)}
            onPhotoGridOpen={() => handleOpenPlacePhotoGrid(entry)}
            onQuickAddPhoto={() => handleAddPhotosToEntry(entry)}
            onQuickEdit={() => handleOpenEditEntry(entry)}
            onQuickDelete={() => handleDeleteEntry(entry)}
          />
        ))}
        </View>
      </ScrollView>

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
          setEntriesByDay((current) => {
            const nextEntriesByDay = { ...current };

            for (const day of dayOptions) {
              const dayEntries = nextEntriesByDay[day.id]
                ?? (day.id === selectedDay.id ? RECORD_DAY_ENTRIES : undefined);
              const matchedEntry = dayEntries?.find((entry) => entry.id === entryId);

              if (!dayEntries || !matchedEntry) {
                continue;
              }

              markPlaceDetailDeleted(getEntryPlaceId(matchedEntry));
              nextEntriesByDay[day.id] = dayEntries.filter((entry) => entry.id !== entryId);
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
        <SafeAreaView style={styles.photoGridScreen} edges={['top', 'bottom']}>
          <View style={styles.photoGridHeader}>
            <Pressable
              accessibilityRole="button"
              hitSlop={10}
              onPress={handleClosePhotoGrid}
              style={styles.photoGridHeaderButton}
            >
              <Feather name="chevron-left" size={28} color={Colors.foundation.black} />
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
                    }
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
  photoGridHeaderSpacer: {
    flex: 1,
  },
  photoGridContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
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
});
