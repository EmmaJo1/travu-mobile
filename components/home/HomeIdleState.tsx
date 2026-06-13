import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import {
  Image,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import Text from '@/components/common/AppText';
import DetectedTripSection from '@/components/home/DetectedTripSection';
import PastMomentsSection from '@/components/home/PastMomentsSection';
import PhotoImportResultsCard from '@/components/home/PhotoImportResultsCard';
import RecentTripsSection from '@/components/home/RecentTripsSection';
import PhotoImportCompleteModal from '@/components/onboarding/PhotoImportCompleteModal';
import { FIGMA_IMAGES } from '@/constants/figmaImages';
import {
  MOCK_DETECTED_TRIP,
  MOCK_PAST_MOMENTS,
  MOCK_RECENT_TRIPS,
  type DetectedTrip,
  type IdleRecentTrip,
} from '@/constants/mockIdleHomeData';
import { addSavedIdleDetectedTrip } from '@/constants/savedMyPageTrips';
import { Colors, FontFamily } from '@/constants/theme';

const HERO_HEIGHT = 299;
const WARM_WHITE = Colors.warm.white;

interface HomeIdleStateProps {
  onPressStartTrip?: () => void;
  isFirstUserEmptyState?: boolean;
  showPhotoImportResultsCard?: boolean;
  photoImportTripCount?: number;
  onPressViewPhotoImportResults?: () => void;
  showImportCompleteModal?: boolean;
  onCloseImportCompleteModal?: () => void;
  onPressViewImportResults?: () => void;
}

function convertDetectedTrip(trip: DetectedTrip): IdleRecentTrip {
  return {
    id: `recent-${trip.id}`,
    city: trip.city,
    dateRange: trip.dateRange,
    image: trip.image,
  };
}

export default function HomeIdleState({
  onPressStartTrip,
  isFirstUserEmptyState = false,
  showPhotoImportResultsCard = false,
  photoImportTripCount = 0,
  onPressViewPhotoImportResults,
  showImportCompleteModal = false,
  onCloseImportCompleteModal,
  onPressViewImportResults,
}: HomeIdleStateProps) {
  const [detectedTrip, setDetectedTrip] = React.useState<DetectedTrip | null>(MOCK_DETECTED_TRIP);
  const [isDetectedTripSaved, setDetectedTripSaved] = React.useState(false);
  const [isRefreshing, setRefreshing] = React.useState(false);
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

  const handleRefresh = React.useCallback(() => {
    setRefreshing(true);

    if (detectedTrip && isDetectedTripSaved) {
      addSavedIdleDetectedTrip(detectedTrip);
      setDetectedTrip(null);
      setDetectedTripSaved(false);
    }

    requestAnimationFrame(() => {
      setRefreshing(false);
    });
  }, [detectedTrip, isDetectedTripSaved]);

  return (
    <View style={styles.root}>
      <StatusBar style="light" translucent backgroundColor="transparent" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            tintColor={Colors.foundation.grey600}
            colors={[Colors.foundation.grey600]}
            onRefresh={handleRefresh}
          />
        }
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
            locations={[0, 0.48, 0.84, 1]}
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
              <Image
                source={FIGMA_IMAGES.archive.hero}
                style={styles.startButtonBackdropImage}
                resizeMode="cover"
                blurRadius={14}
              />
              <View style={styles.startButtonFillLayer} />
              <LinearGradient
                colors={[
                  'rgba(255, 255, 255, 0.30)',
                  'rgba(255, 255, 255, 0.08)',
                  'rgba(255, 255, 255, 0.02)',
                ]}
                locations={[0, 0.45, 1]}
                start={{ x: 1, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.startButtonGlassLight}
              />
              <LinearGradient
                colors={[
                  'rgba(255, 255, 255, 0.24)',
                  'rgba(255, 255, 255, 0.02)',
                  'rgba(255, 255, 255, 0.18)',
                ]}
                locations={[0, 0.52, 1]}
                start={{ x: 0.12, y: 0 }}
                end={{ x: 0.88, y: 1 }}
                style={styles.startButtonRefractionLayer}
              />
              <LinearGradient
                colors={[
                  'rgba(52, 145, 255, 0.08)',
                  'rgba(255, 255, 255, 0)',
                  'rgba(255, 112, 145, 0.08)',
                ]}
                locations={[0, 0.5, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.startButtonDispersionLayer}
              />
              <View style={styles.startButtonFrostLayer} />
              <Text style={styles.startButtonText}>여행 시작</Text>
            </Pressable>
          </View>

          <View style={styles.greetingBlock}>
            <Text style={styles.greetingTitle}>안녕하세요 은서님!</Text>
            <Text style={styles.greetingSubtitle}>여행의 기억을 다시 꺼내보세요</Text>
          </View>
        </View>

        <View style={styles.content}>
          {showPhotoImportResultsCard ? (
            <View style={styles.photoImportResultsCardOffset}>
              <PhotoImportResultsCard
                tripCount={photoImportTripCount}
                onPressViewResults={onPressViewPhotoImportResults ?? noop}
              />
            </View>
          ) : null}

          {!isFirstUserEmptyState && !showPhotoImportResultsCard && detectedTrip ? (
            <DetectedTripSection
              trip={detectedTrip}
              saved={isDetectedTripSaved}
              onSave={handleSaveDetectedTrip}
            />
          ) : null}

          {!isFirstUserEmptyState ? (
            <>
              <View
                style={
                  !detectedTrip && !showPhotoImportResultsCard
                    ? styles.recentTripsWithoutDetected
                    : null
                }
              >
                <RecentTripsSection trips={recentTrips} />
              </View>
              <PastMomentsSection moments={MOCK_PAST_MOMENTS} />
            </>
          ) : null}
        </View>
      </ScrollView>

      <PhotoImportCompleteModal
        visible={showImportCompleteModal}
        tripCount={photoImportTripCount}
        onClose={onCloseImportCompleteModal ?? noop}
        onPressViewResults={onPressViewImportResults ?? noop}
      />
    </View>
  );
}

function noop() {}

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
    width: 67,
    height: 27.05,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    zIndex: 1,
  },
  locationLabel: {
    width: 45,
    height: 24,
    fontFamily: 'Sansita Swashed',
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
    color: Colors.foundation.white,
  },
  heroDate: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 3,
    fontFamily: FontFamily.pretendardSemiBold,
    fontSize: 18,
    lineHeight: 24,
    textAlign: 'center',
    color: Colors.foundation.white,
  },
  startButton: {
    width: Platform.OS === 'web' ? 71 : 69,
    height: 28,
    flexShrink: 0,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 2,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.28)',
    backgroundColor: 'rgba(95, 95, 95, 0.30)',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 4,
    elevation: 2,
    zIndex: 1,
  },
  startButtonBackdropImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.42,
    transform: [{ scale: 1.2 }],
  },
  startButtonFillLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(95, 95, 95, 0.30)',
  },
  startButtonGlassLight: {
    ...StyleSheet.absoluteFillObject,
  },
  startButtonRefractionLayer: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.8,
  },
  startButtonDispersionLayer: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.5,
  },
  startButtonFrostLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  startButtonText: {
    width: 45,
    height: 16,
    flexShrink: 0,
    flexGrow: 0,
    fontFamily: FontFamily.pretendardMedium,
    fontSize: 12,
    lineHeight: 16,
    includeFontPadding: false,
    textAlign: 'center',
    textAlignVertical: 'center',
    color: Colors.foundation.white,
    zIndex: 1,
    ...(Platform.OS === 'web' ? { whiteSpace: 'nowrap' } : null),
  },
  greetingBlock: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 32,
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
  photoImportResultsCardOffset: {
    marginTop: 8,
  },
  recentTripsWithoutDetected: {
    marginTop: 16,
  },
});
