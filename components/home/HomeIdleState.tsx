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
import DetectedTripSection from '@/components/home/DetectedTripSection';
import PastMomentsSection from '@/components/home/PastMomentsSection';
import RecentTripsSection from '@/components/home/RecentTripsSection';
import {
  MOCK_DETECTED_TRIP,
  MOCK_PAST_MOMENTS,
  MOCK_RECENT_TRIPS,
  type DetectedTrip,
  type IdleRecentTrip,
} from '@/constants/mockIdleHomeData';
import { FIGMA_IMAGES } from '@/constants/figmaImages';
import { Colors, FontFamily } from '@/constants/theme';

const HERO_HEIGHT = 299;
const WARM_WHITE = '#F9F5F3';

interface HomeIdleStateProps {
  onPressStartTrip?: () => void;
}

function convertDetectedTrip(trip: DetectedTrip): IdleRecentTrip {
  return {
    id: `recent-${trip.id}`,
    city: trip.city,
    dateRange: trip.dateRange,
    image: trip.image,
  };
}

export default function HomeIdleState({ onPressStartTrip }: HomeIdleStateProps) {
  const [detectedTrip] = React.useState<DetectedTrip | null>(MOCK_DETECTED_TRIP);
  const [isDetectedTripSaved, setDetectedTripSaved] = React.useState(false);
  const [recentTrips, setRecentTrips] = React.useState(MOCK_RECENT_TRIPS);

  const handleSaveDetectedTrip = React.useCallback((trip: DetectedTrip) => {
    setRecentTrips((current) => {
      if (current.some((item) => item.id === `recent-${trip.id}`)) {
        return current;
      }

      return [convertDetectedTrip(trip), ...current];
    });
    setDetectedTripSaved(true);
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar style="light" translucent backgroundColor="transparent" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.hero}>
          <Image
            source={FIGMA_IMAGES.archive.hero}
            style={styles.heroImage}
            resizeMode="cover"
          />
          <LinearGradient
            colors={[
              'rgba(0, 0, 0, 0.42)',
              'rgba(0, 0, 0, 0.08)',
              'rgba(249, 245, 243, 0.20)',
              WARM_WHITE,
            ]}
            locations={[0, 0.42, 0.78, 1]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.heroFade}
          />

          <View style={styles.heroHeader}>
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={16} color={Colors.foundation.white} />
              <Text style={styles.locationLabel}>Seoul</Text>
            </View>

            <Text style={styles.heroDate} pointerEvents="none">
              11.30 Mon
            </Text>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="여행 시작"
              hitSlop={8}
              style={styles.startButton}
              onPress={onPressStartTrip}
            >
              <Text style={styles.startButtonText}>여행 시작</Text>
            </Pressable>
          </View>

          <View style={styles.greetingBlock}>
            <Text style={styles.greetingTitle}>안녕하세요 은서님!</Text>
            <Text style={styles.greetingSubtitle}>여행의 기억을 다시 꺼내보세요</Text>
          </View>
        </View>

        <View style={styles.content}>
          {detectedTrip ? (
            <DetectedTripSection
              trip={detectedTrip}
              saved={isDetectedTripSaved}
              onSave={handleSaveDetectedTrip}
            />
          ) : null}

          <RecentTripsSection trips={recentTrips} />
          <PastMomentsSection moments={MOCK_PAST_MOMENTS} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: WARM_WHITE,
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
  heroImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  heroFade: {
    ...StyleSheet.absoluteFillObject,
  },
  heroHeader: {
    position: 'absolute',
    top: 52,
    left: 20,
    right: 20,
    height: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  locationRow: {
    width: 96,
    height: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    zIndex: 1,
  },
  locationLabel: {
    fontFamily: FontFamily.pointEN,
    fontSize: 18,
    lineHeight: 24,
    color: Colors.foundation.white,
  },
  heroDate: {
    position: 'absolute',
    left: 0,
    right: 0,
    fontFamily: FontFamily.pretendardSemiBold,
    fontSize: 18,
    lineHeight: 24,
    textAlign: 'center',
    color: Colors.foundation.white,
  },
  startButton: {
    width: 69,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(95, 95, 95, 0.30)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.28)',
    zIndex: 1,
  },
  startButtonText: {
    fontFamily: FontFamily.pretendardMedium,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.foundation.white,
  },
  greetingBlock: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 48,
    gap: 4,
  },
  greetingTitle: {
    fontFamily: FontFamily.pretendardBold,
    fontSize: 20,
    lineHeight: 28,
    color: Colors.foundation.white,
  },
  greetingSubtitle: {
    fontFamily: FontFamily.pretendardSemiBold,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.foundation.white,
  },
  content: {
    paddingHorizontal: 20,
    gap: 44,
  },
});
