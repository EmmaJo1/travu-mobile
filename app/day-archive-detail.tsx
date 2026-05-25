/**
 * day-archive-detail
 * Figma: 506:704
 */
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Text from '@/components/common/AppText';
import MapPlaceholderCard from '@/components/common/MapPlaceholderCard';
import ScreenHeader from '@/components/nav/ScreenHeader';
import DayCard from '@/components/trip/DayCard';
import PlaceEntryCard from '@/components/trip/PlaceEntryCard';
import TravelStatsCard from '@/components/trip/TravelStatsCard';
import {
  MOCK_ARCHIVE_DETAIL,
  toPlaceEntries,
} from '@/constants/mockArchiveDetail';
import { Colors, FontFamily, Radius, Spacing, Typography } from '@/constants/theme';

export default function DayArchiveDetailScreen() {
  const router = useRouter();
  const detail = MOCK_ARCHIVE_DETAIL;
  const entries = toPlaceEntries(detail.places);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader onBackPress={() => router.back()} style={styles.header} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Image source={detail.heroImage} style={styles.heroBg} resizeMode="cover" />
          <Text style={styles.heroTitle}>{detail.city}</Text>
          <View style={styles.photoFrame}>
            <Text style={styles.heroDate}>{detail.dateRangeLabel}</Text>
            <Image source={detail.photoFrameImage} style={styles.framePhoto} resizeMode="cover" />
          </View>
        </View>

        <View style={styles.dayStatsRow}>
          <DayCard
            dayNumber={detail.selectedDay.dayNumber}
            date={detail.selectedDay.dateLabel}
          />
          <TravelStatsCard
            placeCount={detail.stats.placeCount}
            distanceKm={detail.stats.distanceKm}
          />
        </View>

        <MapPlaceholderCard align="top" style={styles.mapBox} />

        <View style={styles.entries}>
          {entries.map((entry) => (
            <PlaceEntryCard key={entry.id} entry={entry} showRating />
          ))}
        </View>
      </ScrollView>
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
    paddingBottom: Spacing['4xl'],
  },
  hero: {
    width: '100%',
    height: 745,
    position: 'relative',
  },
  heroBg: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  heroTitle: {
    position: 'absolute',
    top: 71,
    left: 57,
    fontFamily: FontFamily.prata,
    fontSize: 96,
    lineHeight: 90,
    color: Colors.foundation.black,
  },
  photoFrame: {
    position: 'absolute',
    top: 136,
    left: 20,
    width: 350,
    height: 505,
    backgroundColor: Colors.foundation.white,
    alignItems: 'center',
    paddingTop: 33,
  },
  heroDate: {
    ...Typography.body1Regular,
    color: Colors.foundation.black,
    textAlign: 'center',
    marginBottom: 25,
  },
  framePhoto: {
    width: 301,
    height: 400,
  },
  dayStatsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    marginTop: 10,
  },
  mapBox: {
    marginTop: 20,
  },
  entries: {
    paddingHorizontal: Spacing.xl,
    gap: 40,
    marginTop: 24,
  },
});
