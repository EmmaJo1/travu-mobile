/**
 * Home — Figma node 973:1081 (CSS export 기준)
 */
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import {
    Image,
    Pressable,
    StyleSheet,
    useWindowDimensions,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Text from '@/components/common/AppText';
import HorizontalEdgeScrollView from '@/components/common/HorizontalEdgeScrollView';
import TodaySummary from '@/components/trip/TodaySummary';
import { HOME_MOCK_DATA } from '@/constants/mockHome';
import { Colors, FontFamily, Radius, Shadows, Typography } from '@/constants/theme';

const HERO_HEIGHT = 353;
const HERO_IMAGE_FRAME_TOP = -139;
const HERO_IMAGE_FRAME_HEIGHT = 508;
const HERO_IMAGE_TOP = 27;
const HERO_IMAGE_WIDTH = 395;
const HERO_IMAGE_HEIGHT = 503;
const HEADER_HEIGHT = 52;
const WARM_WHITE = '#F9F5F3';

/** Sansita Swashed VF — weight는 fontWeight로 지정 (Figma Point Text EN 18/700) */
const SANSITA_SWASHED = 'Sansita Swashed';

const HERO_MASK_COLORS = [
  'rgba(0,0,0,0)',
  'rgba(0,0,0,0)',
  'rgba(249,245,243,0.15)',
  'rgba(249,245,243,0.45)',
  'rgba(249,245,243,0.72)',
  'rgba(249,245,243,0.9)',
  WARM_WHITE,
] as const;

const HERO_MASK_LOCATIONS = [0, 0.6822, 0.7562, 0.8178, 0.8777, 0.9253, 1] as const;

export default function HomeScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const { currentTrip, todaySummary, reflectionPrompt, photoCandidates } = HOME_MOCK_DATA;

  return (
    <View style={styles.root}>
      <StatusBar style="light" translucent backgroundColor="transparent" />

      <View style={styles.heroFixed} pointerEvents="box-none">
        <View style={[styles.heroImageFrame, { width: screenWidth }]}>
          <Image
            source={currentTrip.heroImage}
            style={[
              styles.heroImage,
              { left: (screenWidth - HERO_IMAGE_WIDTH) / 2 + 2.5 },
            ]}
            resizeMode="cover"
          />
        </View>

        <LinearGradient
          colors={[...HERO_MASK_COLORS]}
          locations={[...HERO_MASK_LOCATIONS]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.heroMask}
          pointerEvents="none"
        />

        <SafeAreaView edges={['top']} style={styles.heroHeaderSafe} pointerEvents="box-none">
          <View style={styles.heroHeader}>
            <Pressable
              style={styles.bellBtn}
              accessibilityRole="button"
              accessibilityLabel="알림"
            >
              <Image
                source={require('@/assets/images/home-bell-icon.png')}
                style={styles.bellIcon}
                resizeMode="contain"
              />
            </Pressable>

            <View style={styles.headerMeta}>
              <View style={styles.dateColumn}>
                <Text style={styles.dateLabel}>{currentTrip.dateLabel}</Text>
                <Text style={styles.dayLabel}>{currentTrip.dayLabel}</Text>
              </View>

              <View style={styles.locationRow}>
                <Ionicons name="location-sharp" size={16} color={Colors.foundation.white} />
                <Text style={styles.locationLabel}>{currentTrip.destination}</Text>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </View>

      <View style={styles.content}>
        <View style={styles.journeySection}>
          <Text style={styles.sectionLabel}>TODAY&apos;S JOURNEY</Text>
          <TodaySummary
            distanceKm={todaySummary.distanceKm}
            placeCount={todaySummary.visitedPlacesCount}
            momentCount={todaySummary.recordedMomentsCount}
            style={styles.todaySummary}
          />
        </View>

        <Pressable style={styles.reflectionSection} accessibilityRole="button" onPress={() => {}}>
          <Text style={styles.reflectionTitle}>{reflectionPrompt.title}</Text>
          <Text style={styles.reflectionCaption}>{reflectionPrompt.subtitle}</Text>
        </Pressable>

        <View style={styles.photoSection}>
          <HorizontalEdgeScrollView
            style={styles.photoScroll}
            contentContainerStyle={styles.photoRow}
          >
            {photoCandidates.map((photo) => (
              <Image
                key={photo.id}
                source={photo.image}
                style={styles.photoThumb}
                resizeMode="cover"
                accessibilityLabel={photo.title}
              />
            ))}
            <Pressable
              style={styles.photoMoreCard}
              accessibilityRole="button"
              accessibilityLabel="더보기"
              onPress={() => {}}
            >
              <View style={styles.photoMoreOverlay}>
                <Text style={styles.photoMoreLabel}>더보기</Text>
              </View>
            </Pressable>
          </HorizontalEdgeScrollView>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: WARM_WHITE,
  },
  heroFixed: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: HERO_HEIGHT,
    zIndex: 10,
    overflow: 'hidden',
    backgroundColor: WARM_WHITE,
  },
  heroImageFrame: {
    position: 'absolute',
    top: HERO_IMAGE_FRAME_TOP,
    left: 0,
    height: HERO_IMAGE_FRAME_HEIGHT,
    overflow: 'hidden',
  },
  heroImage: {
    position: 'absolute',
    top: HERO_IMAGE_TOP,
    width: HERO_IMAGE_WIDTH,
    height: HERO_IMAGE_HEIGHT,
  },
  heroMask: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: HERO_HEIGHT,
  },
  heroHeaderSafe: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  heroHeader: {
    height: HEADER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    paddingHorizontal: 20,
  },
  bellBtn: {
    width: 24,
    height: 24,
  },
  bellIcon: {
    width: 24,
    height: 24,
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: 217,
    height: 44,
  },
  dateColumn: {
    width: 83,
  },
  dateLabel: {
    ...Typography.title2,
    color: Colors.foundation.white,
    textAlign: 'left',
  },
  dayLabel: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.white,
    textAlign: 'center',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    width: 67,
  },
  locationLabel: {
    fontFamily: SANSITA_SWASHED,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
    color: Colors.foundation.white,
  },
  content: {
    flex: 1,
    paddingTop: HERO_HEIGHT,
    paddingBottom: 20,
    backgroundColor: WARM_WHITE,
  },
  journeySection: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 8,
  },
  sectionLabel: {
    fontFamily: FontFamily.pretendardSemiBold,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: '#4F4F4F',
  },
  todaySummary: {
    marginLeft: 8,
  },
  reflectionSection: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  reflectionTitle: {
    ...Typography.title2,
    color: Colors.foundation.black,
  },
  reflectionCaption: {
    ...Typography.captionRegular,
    color: '#4C4C4C',
    marginLeft: 8,
  },
  photoSection: {
    paddingHorizontal: 20,
  },
  photoScroll: {
    marginTop: 8,
    height: 150,
  },
  photoRow: {
    gap: 4,
  },
  photoThumb: {
    width: 120,
    height: 150,
    borderRadius: Radius.sm,
    backgroundColor: Colors.foundation.white,
    ...Shadows.card,
  },
  photoMoreCard: {
    width: 120,
    height: 150,
    borderRadius: Radius.sm,
    overflow: 'hidden',
    backgroundColor: Colors.foundation.white,
  },
  photoMoreOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(141, 141, 141, 0.67)',
    borderRadius: Radius.sm,
  },
  photoMoreLabel: {
    fontFamily: FontFamily.pretendardSemiBold,
    fontSize: 12,
    lineHeight: 22,
    color: Colors.foundation.white,
  },
});
