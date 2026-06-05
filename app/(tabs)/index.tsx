/**
 * Home — based on Figma Home_Component / node 1941:2308.
 */
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Text from '@/components/common/AppText';
import TodayTimelineSection from '@/components/home/TodayTimelineSection';
import TravelStatusButton from '@/components/home/TravelStatusButton';
import TodaySummary from '@/components/trip/TodaySummary';
import { HOME_MOCK_DATA } from '@/constants/mockHome';
import { HOME_TIMELINE_ITEMS } from '@/constants/mockHomeTimeline';
import { Colors, Typography } from '@/constants/theme';

const HERO_HEIGHT = 336;
const HERO_IMAGE_FRAME_TOP = -139;
const HERO_IMAGE_FRAME_HEIGHT = 508;
const HERO_IMAGE_TOP = 8;
const HERO_IMAGE_HEIGHT = 492;
const HEADER_HEIGHT = 52;
const HEADER_DIM_HEIGHT = 129;
const HERO_MASK_TOP = 180;
const HERO_MASK_HEIGHT = HERO_HEIGHT - HERO_MASK_TOP;
const SUMMARY_HEIGHT = 104;
const WARM_WHITE = '#F9F5F3';
const FIGMA_POINT_EN = 'Sansita Swashed';

const HEADER_DIM_COLORS = [
  'rgba(38,38,38,0.4)',
  'rgba(134,134,134,0.3)',
  'rgba(143,143,143,0.15)',
  'rgba(153,153,153,0)',
] as const;

const HEADER_DIM_LOCATIONS = [0.0028, 0.7428, 0.8538, 0.9301] as const;

const HERO_MASK_COLORS = [
  'rgba(115,115,115,0)',
  'rgba(147,147,147,0.22)',
  'rgba(249,245,243,0.28)',
  'rgba(249,245,243,0.72)',
  WARM_WHITE,
] as const;

const HERO_MASK_LOCATIONS = [0, 0.34, 0.58, 0.82, 1] as const;

export default function HomeScreen() {
  const { currentTrip, todaySummary } = HOME_MOCK_DATA;

  const handlePressTravelStatus = React.useCallback(() => {
    // TODO: Connect travel management bottom sheet.
  }, []);

  const handlePressTimelineMore = React.useCallback(() => {
    // TODO: Connect timeline item action bottom sheet.
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar style="light" translucent backgroundColor="transparent" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
      >
        <View style={styles.hero}>
          <View style={styles.heroImageFrame}>
            <Image
              source={currentTrip.heroImage}
              style={styles.heroImage}
              resizeMode="cover"
            />
          </View>

          <LinearGradient
            colors={[...HERO_MASK_COLORS]}
            locations={[...HERO_MASK_LOCATIONS]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.heroMask}
          />

          <View style={styles.heroHeaderWrap}>
            <LinearGradient
              colors={[...HEADER_DIM_COLORS]}
              locations={[...HEADER_DIM_LOCATIONS]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.heroHeaderDim}
            />

            <SafeAreaView edges={['top']} style={styles.heroHeaderSafe}>
              <View style={styles.heroHeader}>
                <View style={styles.locationRow}>
                  <Ionicons name="location-outline" size={16} color={Colors.foundation.white} />
                  <Text style={styles.locationLabel}>{currentTrip.destination}</Text>
                </View>

                <View style={styles.headerCenter}>
                  <Text style={styles.dayLabel}>{currentTrip.dayLabel}</Text>
                  <Text style={styles.dateLabel}>{currentTrip.dateLabel}</Text>
                </View>

                <TravelStatusButton
                  backdropImage={currentTrip.heroImage}
                  onPress={handlePressTravelStatus}
                />
              </View>
            </SafeAreaView>
          </View>
        </View>

        <View style={styles.summaryOverlap}>
          <TodaySummary
            distanceKm={todaySummary.distanceKm}
            placeCount={todaySummary.visitedPlacesCount}
            momentCount={todaySummary.recordedMomentsCount}
          />
        </View>

        <TodayTimelineSection
          items={HOME_TIMELINE_ITEMS}
          onPressMore={handlePressTimelineMore}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: WARM_WHITE,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
    backgroundColor: WARM_WHITE,
  },
  hero: {
    height: HERO_HEIGHT,
    overflow: 'hidden',
    backgroundColor: WARM_WHITE,
  },
  heroImageFrame: {
    position: 'absolute',
    top: HERO_IMAGE_FRAME_TOP,
    left: 0,
    right: 0,
    height: HERO_IMAGE_FRAME_HEIGHT,
    overflow: 'hidden',
  },
  heroImage: {
    position: 'absolute',
    top: HERO_IMAGE_TOP,
    left: 0,
    right: 0,
    width: '100%',
    height: HERO_IMAGE_HEIGHT,
  },
  heroMask: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: HERO_MASK_TOP,
    height: HERO_MASK_HEIGHT,
    zIndex: 1,
  },
  heroHeaderWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: HEADER_DIM_HEIGHT,
    zIndex: 2,
  },
  heroHeaderDim: {
    ...StyleSheet.absoluteFillObject,
  },
  heroHeaderSafe: {
    width: '100%',
  },
  heroHeader: {
    width: '100%',
    height: HEADER_HEIGHT,
    marginTop: -4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  locationRow: {
    width: 67,
    height: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    zIndex: 1,
  },
  locationLabel: {
    width: 47,
    height: 24,
    fontFamily: FIGMA_POINT_EN,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
    color: Colors.foundation.white,
  },
  headerCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayLabel: {
    ...Typography.title2,
    color: Colors.foundation.white,
    textAlign: 'center',
  },
  dateLabel: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.white,
    textAlign: 'center',
  },
  summaryOverlap: {
    minHeight: SUMMARY_HEIGHT,
    marginTop: -SUMMARY_HEIGHT,
    marginHorizontal: 27,
    marginBottom: 32,
  },
});
