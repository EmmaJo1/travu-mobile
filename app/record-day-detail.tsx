/**
 * record-day-detail
 * Figma: day-recording-detail (1207:2245)
 */
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Text from '@/components/common/AppText';
import MapPlaceholderCard from '@/components/common/MapPlaceholderCard';
import ScreenHeader from '@/components/nav/ScreenHeader';
import DaySelectorSheet, { type DaySelectorItem } from '@/components/record/DaySelectorSheet';
import PlaceCreateModal, {
  type PlaceCreateInput,
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
import { Colors, FontFamily, Radius, Shadows, Spacing, Typography } from '@/constants/theme';

const ALL_DAYS_ID = 'all';
const DAY_FILTER_BG = '#F2F2F2';
const WEEKDAY_LABELS = ['\uC77C', '\uC6D4', '\uD654', '\uC218', '\uBAA9', '\uAE08', '\uD1A0'] as const;

type PickedPhotoAsset = ImagePicker.ImagePickerAsset;

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

function groupAssetsByTakenDate(
  assets: PickedPhotoAsset[],
  fallbackDay: DaySelectorItem,
): Array<{ date: Date; dateKey: string; assets: PickedPhotoAsset[] }> {
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
  photoGroups: Array<{ date: Date; dateKey: string; assets: PickedPhotoAsset[] }>,
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

function getEntryPhotoUrisParam(entry: PlaceEntry): string | undefined {
  if (!entry.photoUris?.length) {
    return undefined;
  }

  return JSON.stringify(entry.photoUris);
}

function getEntryPhotoSourceIndexesParam(entry: PlaceEntry): string | undefined {
  const originalEntry = RECORD_DAY_ENTRIES.find((item) => getEntryPlaceId(item) === getEntryPlaceId(entry));
  const originalPhotoSources = originalEntry?.photoSources ?? [];

  if (!entry.photoSources?.length) {
    return originalPhotoSources.length > 0 ? JSON.stringify([]) : undefined;
  }

  const sourceIndexes = entry.photoSources
    .map((source) => originalPhotoSources.findIndex((originalSource) => originalSource === source))
    .filter((index) => index >= 0);

  return sourceIndexes.length > 0 ? JSON.stringify(sourceIndexes) : undefined;
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
  const { tripId, dayId, updatedPlaceId, updatedPhotoUris, deletedSourceIndexes } = useLocalSearchParams<{
    tripId?: string;
    dayId?: string;
    updatedPlaceId?: string;
    updatedPhotoUris?: string;
    deletedSourceIndexes?: string;
  }>();

  const baseDayOptions = useMemo(() => {
    if (tripId) {
      return getDaySelectorItemsForTrip(tripId) ?? RECORD_DAY_OPTIONS;
    }
    return RECORD_DAY_OPTIONS;
  }, [tripId]);

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
    const dayEntries = selectedFilterId === ALL_DAYS_ID
      ? dayOptions.flatMap((day) => entriesByDay[day.id] ?? RECORD_DAY_ENTRIES)
      : entriesByDay[selectedDay.id] ?? RECORD_DAY_ENTRIES;

    return [...dayEntries].sort(
      (left, right) => getTimeSortValue(left.time) - getTimeSortValue(right.time),
    );
  }, [dayOptions, entriesByDay, selectedDay.id, selectedFilterId]);

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
    router.push({
      pathname: '/place-detail',
      params: {
        tripId: tripId ?? 'record-trip',
        dayId: selectedDay.id,
        placeId: getEntryPlaceId(entry),
        entryPoint: 'recordDayDetail',
        openPhotoGrid: '1',
        photoGridMode: 'viewOnly',
        photoSourceIndexes: getEntryPhotoSourceIndexesParam(entry),
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

  const handleSubmitPlaceEntry = (input: PlaceCreateInput) => {
    setEntriesByDay((current) => {
      const dayEntries = current[selectedDay.id] ?? RECORD_DAY_ENTRIES;

      if (editingEntry) {
        return {
          ...current,
          [selectedDay.id]: dayEntries.map((entry) =>
            entry.id === editingEntry.id
              ? {
                ...entry,
                ...input,
              }
              : entry,
          ),
        };
      }

      const newEntry: PlaceEntry = {
        id: `manual-${selectedDay.id}-${Date.now()}`,
        ...input,
      };

      return {
        ...current,
        [selectedDay.id]: [...dayEntries, newEntry],
      };
    });
    handleClosePlaceEntryModal();
  };

  const handleDeleteEntry = (entry: PlaceEntry) => {
    Alert.alert(
      '\uC7A5\uC18C\uB97C \uC0AD\uC81C\uD560\uAE4C\uC694?',
      '\uC571\uC5D0\uC11C\uB9CC \uC0AD\uC81C\uB418\uBA70, \uAE30\uAE30\uC758 \uC6D0\uBCF8 \uC0AC\uC9C4\uC740 \uC720\uC9C0\uB429\uB2C8\uB2E4.',
      [
        { text: '\uCDE8\uC18C', style: 'cancel' },
        {
          text: '\uC0AD\uC81C',
          style: 'destructive',
          onPress: () => {
            setEntriesByDay((current) => {
              const dayEntries = current[selectedDay.id] ?? RECORD_DAY_ENTRIES;
              return {
                ...current,
                [selectedDay.id]: dayEntries.filter((item) => item.id !== entry.id),
              };
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

      const photoGroups = groupAssetsByTakenDate(result.assets, selectedDay);
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
          const [firstEntry, ...restEntries] = dayEntries;

          nextEntriesByDay[targetDayId] = firstEntry
            ? [
              {
                ...firstEntry,
                photoUris: [...new Set([...(firstEntry.photoUris ?? []), ...nextUris])],
              },
              ...restEntries,
            ]
            : [createPhotoEntry(targetDayId, group.date, nextUris)];
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

    addSavedCompletedTrip({
      id: tripId ?? 'record-trip',
      destinationName: coverEntry?.cityName ?? coverEntry?.city ?? 'Sydney',
      countryName: coverEntry?.countryName ?? 'Australia',
      startDate: '2025-03-04',
      endDate: '2025-03-07',
      coverImage: coverEntry?.photoSources?.[0] ?? RECORD_DAY_ENTRY_IMAGES.bondi1,
      daysCount: dayOptions.length,
      photoCount: entries.reduce((total, entry) => (
        total + (entry.photoCount ?? entry.photoSources?.length ?? 0) + (entry.photoUris?.length ?? 0)
      ), 0),
    });
    Alert.alert(
      '\uC5EC\uD589\uC744 \uC800\uC7A5\uD588\uC5B4\uC694',
      '\uB9C8\uC774\uD398\uC774\uC9C0\uC758 \uC5EC\uD589 \uB9AC\uC2A4\uD2B8\uC5D0\uC11C \uD655\uC778\uD560 \uC218 \uC788\uC5B4\uC694.',
    );
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
          onPress: () => router.back(),
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
            showRating={false}
            variant="recordPhotoReview"
            onPress={() => handleOpenPlaceDetail(entry)}
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
        initialValue={editingEntry ?? undefined}
        onDelete={(entryId) => {
          setEntriesByDay((current) => {
            const dayEntries = current[selectedDay.id] ?? RECORD_DAY_ENTRIES;
            return {
              ...current,
              [selectedDay.id]: dayEntries.filter((entry) => entry.id !== entryId),
            };
          });
          handleClosePlaceEntryModal();
        }}
        onClose={handleClosePlaceEntryModal}
        onSubmit={handleSubmitPlaceEntry}
      />

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
    color: '#D13434',
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
});
