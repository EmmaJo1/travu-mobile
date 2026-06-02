/**
 * record-day-detail
 * Figma: day-recording-detail (1207:2245)
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import MapPlaceholderCard from '@/components/common/MapPlaceholderCard';
import PrimaryButton from '@/components/common/PrimaryButton';
import ScreenHeader from '@/components/nav/ScreenHeader';
import DaySelectorSheet, { type DaySelectorItem } from '@/components/record/DaySelectorSheet';
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
import { Colors, Spacing } from '@/constants/theme';

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

export default function RecordDayDetailScreen() {
  const router = useRouter();
  const { tripId, dayId } = useLocalSearchParams<{ tripId?: string; dayId?: string }>();

  const dayOptions = useMemo(() => {
    if (tripId) {
      return getDaySelectorItemsForTrip(tripId) ?? RECORD_DAY_OPTIONS;
    }
    return RECORD_DAY_OPTIONS;
  }, [tripId]);

  const [selectedDay, setSelectedDay] = useState<DaySelectorItem>(() =>
    resolveInitialDay(dayOptions, dayId),
  );
  const [sheetVisible, setSheetVisible] = useState(false);
  const [placeEntryModalVisible, setPlaceEntryModalVisible] = useState(false);
  const [placeEntryFormMode, setPlaceEntryFormMode] =
    useState<PlaceEntryFormMode>('create');
  const [editingEntry, setEditingEntry] = useState<PlaceEntry | null>(null);
  const [entriesByDay, setEntriesByDay] = useState<
    Record<string, PlaceEntry[]>
  >({});

  useEffect(() => {
    setSelectedDay(resolveInitialDay(dayOptions, dayId));
  }, [dayOptions, dayId]);

  const entries = useMemo(() => {
    const dayEntries = entriesByDay[selectedDay.id] ?? RECORD_DAY_ENTRIES;

    return [...dayEntries].sort(
      (left, right) => getTimeSortValue(left.time) - getTimeSortValue(right.time),
    );
  }, [entriesByDay, selectedDay.id]);

  const handleClosePlaceEntryModal = () => {
    setPlaceEntryModalVisible(false);
    setPlaceEntryFormMode('create');
    setEditingEntry(null);
  };

  const handleOpenCreate = () => {
    setEditingEntry(null);
    setPlaceEntryFormMode('create');
    setPlaceEntryModalVisible(true);
  };

  const handleOpenEdit = (entry: PlaceEntry) => {
    setEditingEntry(entry);
    setPlaceEntryFormMode('edit');
    setPlaceEntryModalVisible(true);
  };

  const handleSubmitPlaceEntry = (input: PlaceCreateInput) => {
    setEntriesByDay((current) => {
      const dayEntries = current[selectedDay.id] ?? RECORD_DAY_ENTRIES;

      if (placeEntryFormMode === 'edit' && editingEntry) {
        return {
          ...current,
          [selectedDay.id]: dayEntries.map((entry) =>
            entry.id === editingEntry.id
              ? { ...entry, ...input, id: entry.id }
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

  const handleDeletePlaceEntry = (entryId: string) => {
    setEntriesByDay((current) => {
      const dayEntries = current[selectedDay.id] ?? RECORD_DAY_ENTRIES;

      return {
        ...current,
        [selectedDay.id]: dayEntries.filter((entry) => entry.id !== entryId),
      };
    });
    handleClosePlaceEntryModal();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        balancedSlots
        onBackPress={() => router.back()}
        centerSlot={
          <RecordDateButton
            dateLabel={formatHeaderDate(selectedDay)}
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

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <MapPlaceholderCard align="center" />

        <View style={styles.entries}>
          {entries.map((entry) => (
            <PlaceEntryCard
              key={entry.id}
              entry={{ ...entry, onEdit: () => handleOpenEdit(entry) }}
              showRating={false}
            />
          ))}
        </View>
      </ScrollView>

      <DaySelectorSheet
        visible={sheetVisible}
        days={dayOptions}
        selectedId={selectedDay.id}
        onSelectDay={(day) => {
          setSelectedDay(day);
          setSheetVisible(false);
        }}
        onClose={() => setSheetVisible(false)}
      />

      <PlaceCreateModal
        visible={placeEntryModalVisible}
        mode={placeEntryFormMode}
        initialValue={
          placeEntryFormMode === 'edit' ? editingEntry ?? undefined : undefined
        }
        onClose={handleClosePlaceEntryModal}
        onDelete={handleDeletePlaceEntry}
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
  header: {
    width: '100%',
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing['2xl'],
    paddingBottom: Spacing['3xl'],
    gap: 28,
  },
  entries: {
    gap: 40,
  },
});
