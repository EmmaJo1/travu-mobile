/**
 * record-day-detail
 * Figma: day-recording-detail (1207:2245)
 */
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Text from '@/components/common/AppText';
import MapPlaceholderCard from '@/components/common/MapPlaceholderCard';
import PrimaryButton from '@/components/common/PrimaryButton';
import ScreenHeader from '@/components/nav/ScreenHeader';
import DaySelectorSheet, {
  type DaySelectorItem,
  type SelectorOption,
} from '@/components/record/DaySelectorSheet';
import PlaceCreateModal, {
  type PlaceCreateInput,
  type PlaceEntryFormMode,
} from '@/components/record/PlaceCreateModal';
import RecordDateButton from '@/components/record/RecordDateButton';
import PlaceEntryCard, { type PlaceEntry } from '@/components/trip/PlaceEntryCard';
import { getDaySelectorItemsForTrip } from '@/constants/mockDetectedTrips';
import {
  DEFAULT_RECORD_DAY,
  RECORD_DAY_ENTRIES,
  RECORD_DAY_OPTIONS,
} from '@/constants/mockRecordDayDetail';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';

const ALL_DAYS_ID = 'all';
const DAY_FILTER_BG = '#F2F2F2';

function formatHeaderDate(day: DaySelectorItem): string {
  return `${day.dateLabel} ${day.weekdayLabel}`;
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

function getEntryPlaceId(entry: PlaceEntry): string {
  return entry.googlePlaceId ?? entry.id;
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
  onOpenAll: () => void;
  onSelectDay: (day: DaySelectorItem) => void;
}

function DayFilterBar({ days, selectedId, onOpenAll, onSelectDay }: DayFilterBarProps) {
  const [hasScrolledDays, setHasScrolledDays] = useState(false);

  return (
    <View style={styles.dayFilterBar}>
      <Pressable accessibilityRole="button" onPress={onOpenAll} style={styles.allChip}>
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

  const dayOptions = useMemo(() => {
    if (tripId) {
      return getDaySelectorItemsForTrip(tripId) ?? RECORD_DAY_OPTIONS;
    }
    return RECORD_DAY_OPTIONS;
  }, [tripId]);

  const [selectedDay, setSelectedDay] = useState<DaySelectorItem>(() =>
    resolveInitialDay(dayOptions, dayId),
  );
  const [selectedFilterId, setSelectedFilterId] = useState<string>(() =>
    resolveInitialDay(dayOptions, dayId).id,
  );
  const [sheetVisible, setSheetVisible] = useState(false);
  const [placeEntryModalVisible, setPlaceEntryModalVisible] = useState(false);
  const [placeEntryFormMode, setPlaceEntryFormMode] =
    useState<PlaceEntryFormMode>('create');
  const [entriesByDay, setEntriesByDay] = useState<Record<string, PlaceEntry[]>>({});

  useEffect(() => {
    const initialDay = resolveInitialDay(dayOptions, dayId);
    setSelectedDay(initialDay);
    setSelectedFilterId(initialDay.id);
  }, [dayOptions, dayId]);

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

  const selectorOptions = useMemo<SelectorOption[]>(() => [
    ...dayOptions.map((day) => ({
      id: day.id,
      label: `${day.dayNumber}일차 · ${formatHeaderDate(day)}`,
    })),
  ], [dayOptions]);

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
  };

  const handleOpenCreate = () => {
    setPlaceEntryFormMode('create');
    setPlaceEntryModalVisible(true);
  };

  const handleSelectDay = (day: DaySelectorItem) => {
    setSelectedDay(day);
    setSelectedFilterId(day.id);
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

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.fixedTop}>
        <ScreenHeader
          balancedSlots
          onBackPress={() => router.back()}
          centerSlot={
            <RecordDateButton
              dateLabel={
                selectedFilterId === ALL_DAYS_ID ? '전체' : formatHeaderDate(selectedDay)
              }
              onPress={() => setSheetVisible(true)}
            />
          }
          rightSlot={
            <PrimaryButton
              label="장소 추가"
              onPress={handleOpenCreate}
            />
          }
          style={styles.header}
        />

        <MapPlaceholderCard align="center" style={styles.map} />

        <DayFilterBar
          days={dayOptions}
          selectedId={selectedFilterId}
          onOpenAll={() => setSheetVisible(true)}
          onSelectDay={handleSelectDay}
        />
      </View>

      <ScrollView
        style={styles.entriesScroll}
        contentContainerStyle={styles.entriesContent}
        showsVerticalScrollIndicator={false}
      >
        {entries.map((entry, index) => (
          <PlaceEntryCard
            key={`${selectedFilterId}-${entry.id}-${index}`}
            entry={entry}
            showRating={false}
            variant="recordPhotoReview"
            onPhotoGridOpen={() => handleOpenPlacePhotoGrid(entry)}
          />
        ))}
      </ScrollView>

      <DaySelectorSheet
        visible={sheetVisible}
        options={selectorOptions}
        selectedId={selectedFilterId}
        title="날짜 선택"
        onSelectOption={(option) => {
          if (option.id === ALL_DAYS_ID) {
            setSelectedFilterId(ALL_DAYS_ID);
          } else {
            const day = dayOptions.find((item) => item.id === option.id);
            if (day) {
              handleSelectDay(day);
            }
          }
          setSheetVisible(false);
        }}
        onClose={() => setSheetVisible(false)}
      />

      <PlaceCreateModal
        visible={placeEntryModalVisible}
        mode={placeEntryFormMode}
        tripId={tripId ?? 'record-trip'}
        dayId={selectedDay.id}
        onClose={handleClosePlaceEntryModal}
        onSubmit={handleSubmitPlaceEntry}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.light.bgScreen,
  },
  fixedTop: {
    backgroundColor: Colors.light.bgScreen,
  },
  header: {
    width: '100%',
  },
  map: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.lg,
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
  entriesScroll: {
    flex: 1,
  },
  entriesContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing['3xl'],
    paddingBottom: Spacing['4xl'],
    gap: Spacing['3xl'],
  },
});
