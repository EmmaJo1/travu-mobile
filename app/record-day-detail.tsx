/**
 * record-day-detail
 * Figma: day-recording-detail (1207:2245)
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import MapPlaceholderCard from '@/components/common/MapPlaceholderCard';
import ScreenHeader from '@/components/nav/ScreenHeader';
import DaySelectorSheet, { type DaySelectorItem } from '@/components/record/DaySelectorSheet';
import RecordDateButton from '@/components/record/RecordDateButton';
import PlaceEntryCard from '@/components/trip/PlaceEntryCard';
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

  useEffect(() => {
    setSelectedDay(resolveInitialDay(dayOptions, dayId));
  }, [dayOptions, dayId]);

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
        style={styles.header}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <MapPlaceholderCard align="center" />

        <View style={styles.entries}>
          {RECORD_DAY_ENTRIES.map((entry) => (
            <PlaceEntryCard key={entry.id} entry={entry} showRating={false} />
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
