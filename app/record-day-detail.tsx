/**
 * record-day-detail
 * Figma: day-recording-detail (1207:2245)
 */
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Text from '@/components/common/AppText';
import DateBadgeList from '@/components/record/DateBadgeList';
import DaySelectorSheet, { type DaySelectorItem } from '@/components/record/DaySelectorSheet';
import PlaceEntryCard from '@/components/trip/PlaceEntryCard';
import {
  DEFAULT_RECORD_DAY,
  RECORD_DAY_BADGES,
  RECORD_DAY_ENTRIES,
  RECORD_DAY_OPTIONS,
} from '@/constants/mockRecordDayDetail';
import { Colors, Spacing, Typography } from '@/constants/theme';

function formatHeaderDate(day: DaySelectorItem): string {
  return `${day.dateLabel} ${day.weekdayLabel}`;
}

export default function RecordDayDetailScreen() {
  const router = useRouter();
  const [selectedDay, setSelectedDay] = useState<DaySelectorItem>(DEFAULT_RECORD_DAY);
  const [sheetVisible, setSheetVisible] = useState(false);

  const handleDaySelect = (dayId: string) => {
    const day = RECORD_DAY_OPTIONS.find((item) => item.id === dayId);
    if (day) setSelectedDay(day);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.75}>
          <Image
            source={require('../assets/images/screenheader-back.png')}
            style={styles.backIcon}
            resizeMode="contain"
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.dateBtn}
          onPress={() => setSheetVisible(true)}
          activeOpacity={0.75}
        >
          <Text style={styles.dateText}>{formatHeaderDate(selectedDay)}</Text>
          <Image
            source={require('../assets/images/daycard-triangle.png')}
            style={styles.triangle}
            resizeMode="contain"
          />
        </TouchableOpacity>

        <View style={styles.headerSide} />
      </View>

      <DateBadgeList
        items={RECORD_DAY_BADGES}
        selectedId={selectedDay.id}
        onSelect={handleDaySelect}
        style={styles.dateBadgeList}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.mapCard}>
          <Text style={styles.mapText}>지도</Text>
        </View>

        {RECORD_DAY_ENTRIES.map((entry) => (
          <PlaceEntryCard key={entry.id} entry={entry} showRating={false} />
        ))}
      </ScrollView>

      <DaySelectorSheet
        visible={sheetVisible}
        days={RECORD_DAY_OPTIONS}
        selectedDayId={selectedDay.id}
        onSelect={(day) => {
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: Spacing.md,
    paddingRight: Spacing.xl,
    minHeight: 40,
  },
  backBtn: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    width: 24,
    height: 24,
  },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dateText: {
    ...Typography.body1Emphasized,
    color: Colors.foundation.black,
  },
  triangle: {
    width: 12,
    height: 12,
  },
  headerSide: {
    width: 24,
  },
  dateBadgeList: {
    paddingVertical: Spacing.md,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing['3xl'],
    gap: Spacing['2xl'],
  },
  mapCard: {
    width: '100%',
    maxWidth: 350,
    height: 240,
    borderRadius: 8,
    backgroundColor: Colors.foundation.white,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  mapText: {
    ...Typography.body2Regular,
    color: Colors.foundation.grey500,
  },
});
