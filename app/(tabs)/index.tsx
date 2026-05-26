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
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import Text from '@/components/common/AppText';
import TodaySummary from '@/components/trip/TodaySummary';
import { HOME_MOCK_DATA } from '@/constants/mockHome';
import { Colors, FontFamily, Radius, Shadows, Typography } from '@/constants/theme';

const HERO_HEIGHT = 353;
const HERO_IMAGE_FRAME_TOP = -139;
const HERO_IMAGE_FRAME_HEIGHT = 508;
const HERO_IMAGE_TOP = 8;
const HERO_IMAGE_HEIGHT = 492;
const HEADER_HEIGHT = 126;
const HERO_MASK_HEIGHT = 180;
const WARM_WHITE = '#F9F5F3';

/** Sansita Swashed VF — weight는 fontWeight로 지정 (Figma Point Text EN 18/700) */
const SANSITA_SWASHED = 'Sansita Swashed';

/** Hero 하단 — WARM_WHITE fade mask */
const HERO_MASK_COLORS = [
  'rgba(249,245,243,0)',
  'rgba(249,245,243,0.25)',
  'rgba(249,245,243,0.55)',
  'rgba(249,245,243,0.85)',
  WARM_WHITE,
] as const;

const HERO_MASK_LOCATIONS = [0, 0.35, 0.6, 0.82, 1] as const;

/** Figma Header fill — dark top fade */
const HEADER_GRADIENT_COLORS = [
  'rgba(38,38,38,0.4)',
  'rgba(134,134,134,0.25)',
  'rgba(143,143,143,0.15)',
  'rgba(153,153,153,0)',
] as const;

const HEADER_GRADIENT_LOCATIONS = [0, 0.8005079030990601, 0.90025395154953, 1] as const;

export default function HomeScreen() {
  const { currentTrip, todaySummary, reflectionPrompt, photoCandidates } = HOME_MOCK_DATA;

  return (
    <View style={styles.root}>
      <StatusBar style="light" translucent backgroundColor="transparent" />

      <View style={styles.heroFixed} pointerEvents="box-none">
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
          pointerEvents="none"
        />

        <View style={styles.heroHeaderSafe} pointerEvents="box-none">
          <LinearGradient
            colors={[...HEADER_GRADIENT_COLORS]}
            locations={[...HEADER_GRADIENT_LOCATIONS]}
            start={{ x: 0.433, y: 0 }}
            end={{ x: 0.433, y: 1 }}
            style={styles.heroHeaderGradient}
            pointerEvents="none"
          />

          <View style={styles.heroHeader}>
            <View style={styles.dateColumn} pointerEvents="none">
              <Text style={styles.dateLabel}>{currentTrip.dateLabel}</Text>
              <Text style={styles.dayLabel}>{currentTrip.dayLabel}</Text>
            </View>

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

            <View style={styles.locationRow}>
              <Ionicons name="location-sharp" size={16} color={Colors.foundation.white} />
              <Text style={styles.locationLabel}>{currentTrip.destination}</Text>
            </View>
          </View>
        </View>
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

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
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
        </ScrollView>
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
  /** Figma Frame 50 — LEFT + RIGHT / TOP */
  heroImageFrame: {
    position: 'absolute',
    top: HERO_IMAGE_FRAME_TOP,
    left: 0,
    right: 0,
    height: HERO_IMAGE_FRAME_HEIGHT,
    overflow: 'hidden',
  },
  /** Figma unsplash — LEFT + RIGHT / TOP */
  heroImage: {
    position: 'absolute',
    top: HERO_IMAGE_TOP,
    left: 0,
    right: 0,
    width: '100%',
    height: HERO_IMAGE_HEIGHT,
  },
  /** Hero 하단 WARM_WHITE mask — LEFT + RIGHT stretch */
  heroMask: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: HERO_MASK_HEIGHT,
  },
  /** Figma Header — LEFT + RIGHT / TOP */
  heroHeaderSafe: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: HEADER_HEIGHT,
  },
  heroHeaderGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  heroHeader: {
    flex: 1,
    height: HEADER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  dateColumn: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBtn: {
    width: 24,
    height: 24,
    flexShrink: 0,
    zIndex: 1,
  },
  bellIcon: {
    width: 24,
    height: 24,
  },
  dateLabel: {
    ...Typography.title2,
    color: Colors.foundation.white,
    textAlign: 'center',
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
    flexShrink: 0,
    zIndex: 1,
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
  photoScroll: {
    marginTop: 8,
    marginHorizontal: 20,
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
