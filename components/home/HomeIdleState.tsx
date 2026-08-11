import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type ImageSourcePropType,
} from 'react-native';

import Text from '@/components/common/AppText';
import FrostedGlassSurface from '@/components/common/FrostedGlassSurface';
import DetectedTripSection from '@/components/home/DetectedTripSection';
import PastMomentsSection from '@/components/home/PastMomentsSection';
import PhotoImportResultsCard from '@/components/home/PhotoImportResultsCard';
import PhotoTripDetectionProgressCard from '@/components/home/PhotoTripDetectionProgressCard';
import RecentTripsSection from '@/components/home/RecentTripsSection';
import PhotoImportCompleteModal from '@/components/onboarding/PhotoImportCompleteModal';
import {
  getPendingDetectedTrip,
  getRecentTrips,
  getTravelMoments,
  toIdleRecentTripFromSavedTrip,
} from '@/constants/idleHomeTravelSelectors';
import {
  MOCK_PAST_MOMENTS,
  MOCK_RECENT_TRIPS,
  type DetectedTrip,
  type IdlePastMoment,
  type IdleRecentTrip,
} from '@/constants/mockIdleHomeData';
import { addSavedIdleDetectedTrip, useSavedMyPageTrips } from '@/constants/savedMyPageTrips';
import { Colors, FontFamily, Spacing, Typography } from '@/constants/theme';
import type { HomeSummaryTripInput } from '@/utils/supabaseTripMappers';

const HERO_HEIGHT = 299;
const MONTHLY_SUMMARY_TOP = 223;
const MONTHLY_SUMMARY_HEIGHT = 94;
const MONTHLY_SUMMARY_BOTTOM_GAP = 16;
const FIXED_HERO_AREA_HEIGHT =
  MONTHLY_SUMMARY_TOP + MONTHLY_SUMMARY_HEIGHT + MONTHLY_SUMMARY_BOTTOM_GAP;
const WARM_WHITE = Colors.warm.white;
const MONTH_LABELS = [
  'JANUARY',
  'FEBRUARY',
  'MARCH',
  'APRIL',
  'MAY',
  'JUNE',
  'JULY',
  'AUGUST',
  'SEPTEMBER',
  'OCTOBER',
  'NOVEMBER',
  'DECEMBER',
] as const;
const MULTI_WORD_CITY_NAMES = new Set([
  'ho chi minh',
  'hong kong',
  'kuala lumpur',
  'las vegas',
  'los angeles',
  'new york',
  'san francisco',
  'sao paulo',
]);

type MonthlySummary = {
  travelDays: number;
  cityCount: number;
  photoCount: number;
};

type MonthlySummaryTrip = {
  startDate?: string | null;
  endDate?: string | null;
  dateRangeLabel?: string | null;
  visitedCities?: string[] | null;
  destinationName?: string | null;
  cityName?: string | null;
  city?: string | null;
  photoCount?: number | null;
  status?: string | null;
  isEndDateUndecided?: boolean | null;
};

type MonthlySummaryDateRange = {
  startDate: Date | null;
  endDate: Date | null;
};

interface HomeIdleStateProps {
  heroImage: ImageSourcePropType;
  onPressStartTrip?: () => void;
  headerTop?: number;
  headerLocationLabel: string;
  isFirstUserEmptyState?: boolean;
  showPhotoImportResultsCard?: boolean;
  showPhotoTripDetectionProgressCard?: boolean;
  photoTripDetectionProgress?: number;
  photoImportTripCount?: number;
  onPressViewPhotoImportResults?: () => void;
  onPressPhotoTripDetectionProgress?: () => void;
  showImportCompleteModal?: boolean;
  onCloseImportCompleteModal?: () => void;
  onPressViewImportResults?: () => void;
  supabaseRecentTrips?: IdleRecentTrip[];
  supabasePastMoments?: IdlePastMoment[];
  supabaseSummaryTrips?: HomeSummaryTripInput[];
  isSupplementalDataLoading?: boolean;
  isSupplementalDataError?: boolean;
  onRetrySupplementalData?: () => Promise<void> | void;
  onRefresh?: () => Promise<void> | void;
}

export default function HomeIdleState({
  heroImage,
  onPressStartTrip,
  headerTop = 0,
  headerLocationLabel,
  isFirstUserEmptyState = false,
  showPhotoImportResultsCard = false,
  showPhotoTripDetectionProgressCard = false,
  photoTripDetectionProgress = 0,
  photoImportTripCount = 0,
  onPressViewPhotoImportResults,
  onPressPhotoTripDetectionProgress,
  showImportCompleteModal = false,
  onCloseImportCompleteModal,
  onPressViewImportResults,
  supabaseRecentTrips,
  supabasePastMoments,
  supabaseSummaryTrips,
  isSupplementalDataLoading = false,
  isSupplementalDataError = false,
  onRetrySupplementalData,
  onRefresh,
}: HomeIdleStateProps) {
  const router = useRouter();
  const savedMyPageTrips = useSavedMyPageTrips();
  const [detectedTrips, setDetectedTrips] = React.useState<DetectedTrip[]>([]);
  const [isRefreshing, setRefreshing] = React.useState(false);
  const today = React.useMemo(() => new Date(), []);
  const summaryTrips =
    supabaseSummaryTrips !== undefined
      ? supabaseSummaryTrips
      : savedMyPageTrips;
  const monthlySummary = React.useMemo(
    () => getMonthlySummary(today, summaryTrips),
    [today, summaryTrips],
  );
  const monthlySummaryTitle = `${MONTH_LABELS[today.getMonth()]} SUMMARY`;

  const pendingDetectedTrip = React.useMemo(
    () => getPendingDetectedTrip(detectedTrips),
    [detectedTrips],
  );

  const recentTrips = React.useMemo(
    () => {
      if (supabaseRecentTrips !== undefined) {
        return getRecentTrips(supabaseRecentTrips);
      }

      return getRecentTrips([
        ...MOCK_RECENT_TRIPS,
        ...savedMyPageTrips.map(toIdleRecentTripFromSavedTrip),
      ]);
    },
    [savedMyPageTrips, supabaseRecentTrips],
  );

  const recentTripIds = React.useMemo(
    () => recentTrips.map((trip) => trip.tripId ?? trip.id),
    [recentTrips],
  );

  const pastMoments = React.useMemo(
    () => getTravelMoments(
      supabasePastMoments !== undefined ? supabasePastMoments : MOCK_PAST_MOMENTS,
      recentTripIds,
    ),
    [recentTripIds, supabasePastMoments],
  );

  const handleSaveDetectedTrip = React.useCallback((trip: DetectedTrip) => {
    addSavedIdleDetectedTrip(trip);
    setDetectedTrips((current) =>
      current.map((item) => (item.id === trip.id ? { ...item, status: 'saved' } : item)),
    );
  }, []);

  const handleRefresh = React.useCallback(async () => {
    setRefreshing(true);

    try {
      await onRefresh?.();
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  const handlePressRecentTrip = React.useCallback((tripId: string) => {
    router.push({
      pathname: '/day-archive-detail',
      params: { tripId },
    });
  }, [router]);

  const handlePressMoment = React.useCallback((moment: IdlePastMoment) => {
    router.push({
      pathname: '/place-detail',
      params: {
        tripId: moment.tripId ?? '',
        dayId: moment.dayId ?? '',
        placeId: moment.placeId ?? '',
        entryPoint: 'dailyMoment',
      },
    });
  }, [router]);

  const handlePressDetectedTrip = React.useCallback((trip: DetectedTrip) => {
    router.push({
      pathname: '/record-day-detail',
      params: {
        cityName: trip.city,
        countryName: trip.country,
        dateRangeLabel: trip.dateRange,
        detectedTripId: trip.id,
        endDate: trip.endDate ?? '',
        entryPoint: 'detectedTrip',
        mode: 'create',
        photoCount: String(trip.photoCount),
        source: 'photoLibrary',
        startDate: trip.startDate ?? '',
      },
    });
  }, [router]);

  return (
    <View style={styles.root}>
      <StatusBar style="light" translucent backgroundColor="transparent" />

      <View style={styles.fixedHeroArea}>
        <View style={styles.hero}>
          <Image
            source={heroImage}
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

          <View style={[styles.heroHeader, { top: headerTop }]}>
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={16} color={Colors.foundation.white} />
              <Text
                style={styles.locationLabel}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {headerLocationLabel}
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={'\uC5EC\uD589 \uC2DC\uC791'}
              hitSlop={8}
              style={styles.startButton}
              onPress={onPressStartTrip}
            >
              <Image
                source={heroImage}
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
              <Text style={styles.startButtonText}>{'\uC5EC\uD589 \uC2DC\uC791'}</Text>
            </Pressable>
          </View>

          <MonthlySummaryCard
            title={monthlySummaryTitle}
            travelDays={monthlySummary.travelDays}
            cityCount={monthlySummary.cityCount}
            photoCount={monthlySummary.photoCount}
          />
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
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
        <View style={styles.content}>
          {showPhotoTripDetectionProgressCard ? (
            <View style={styles.photoImportResultsCardOffset}>
              <PhotoTripDetectionProgressCard
                progress={photoTripDetectionProgress}
                onPress={onPressPhotoTripDetectionProgress ?? noop}
              />
            </View>
          ) : null}

          {!showPhotoTripDetectionProgressCard && showPhotoImportResultsCard ? (
            <View style={styles.photoImportResultsCardOffset}>
              <PhotoImportResultsCard
                tripCount={photoImportTripCount}
                onPressViewResults={onPressViewPhotoImportResults ?? noop}
              />
            </View>
          ) : null}

          {!isFirstUserEmptyState &&
          !showPhotoTripDetectionProgressCard &&
          !showPhotoImportResultsCard &&
          pendingDetectedTrip ? (
            <DetectedTripSection
              trip={pendingDetectedTrip}
              onSave={handleSaveDetectedTrip}
              onPressTrip={handlePressDetectedTrip}
            />
          ) : null}

          {!isFirstUserEmptyState &&
          recentTrips.length === 0 &&
          pastMoments.length === 0 &&
          isSupplementalDataLoading ? (
            <View style={styles.supplementalState}>
              <ActivityIndicator color={Colors.foundation.black} />
              <Text style={styles.supplementalStateText}>여행 기록을 불러오는 중이에요</Text>
            </View>
          ) : null}

          {!isFirstUserEmptyState &&
          recentTrips.length === 0 &&
          pastMoments.length === 0 &&
          !isSupplementalDataLoading &&
          isSupplementalDataError ? (
            <View style={styles.supplementalState}>
              <Text style={styles.supplementalStateText}>여행 기록을 불러오지 못했어요</Text>
              <Pressable accessibilityRole="button" onPress={onRetrySupplementalData}>
                <Text style={styles.supplementalRetryText}>다시 시도</Text>
              </Pressable>
            </View>
          ) : null}

          {!isFirstUserEmptyState && (recentTrips.length > 0 || pastMoments.length > 0) ? (
            <>
              {recentTrips.length > 0 ? (
                <View
                  style={
                    !pendingDetectedTrip &&
                    !showPhotoTripDetectionProgressCard &&
                    !showPhotoImportResultsCard
                      ? styles.recentTripsWithoutDetected
                      : null
                  }
                >
                  <RecentTripsSection
                    trips={recentTrips}
                    onPressTrip={(trip) => handlePressRecentTrip(trip.tripId ?? trip.id)}
                  />
                </View>
              ) : null}
              {pastMoments.length > 0 ? (
                <PastMomentsSection moments={pastMoments} onPressMoment={handlePressMoment} />
              ) : null}
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

function getMonthRange(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth();

  return {
    monthStart: new Date(year, month, 1),
    monthEnd: new Date(year, month + 1, 0),
  };
}

function createLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function parseDateKeyToLocalDate(dateKey?: string | null) {
  if (!dateKey) {
    return null;
  }

  const [year, month, day] = dateKey.split('-').map(Number);

  if (!year || !month || !day) {
    return null;
  }

  return new Date(year, month - 1, day);
}

function parseMonthlySummaryDateRange(dateRangeLabel?: string | null): MonthlySummaryDateRange {
  const normalized = dateRangeLabel?.replace(/\s+/g, '') ?? '';
  const match = normalized.match(
    /^(\d{4})\.(\d{1,2})\.(\d{1,2})-(?:(\d{4})\.)?(\d{1,2})\.(\d{1,2})$/,
  );

  if (!match) {
    return { startDate: null, endDate: null };
  }

  const startYear = Number(match[1]);
  const startMonth = Number(match[2]);
  const startDay = Number(match[3]);
  const endYear = Number(match[4] ?? match[1]);
  const endMonth = Number(match[5]);
  const endDay = Number(match[6]);

  return {
    startDate: new Date(startYear, startMonth - 1, startDay),
    endDate: new Date(endYear, endMonth - 1, endDay),
  };
}

function getTripDateRange(
  trip: MonthlySummaryTrip,
  currentDate: Date,
  monthEnd: Date,
) {
  const startDate = parseDateKeyToLocalDate(trip.startDate);
  const explicitEndDate = parseDateKeyToLocalDate(trip.endDate);
  const isOpenEndedActiveTrip = trip.status === 'active' && (trip.isEndDateUndecided || !trip.endDate);
  const openEndedActiveEndDate =
    isOpenEndedActiveTrip
      ? new Date(Math.min(currentDate.getTime(), monthEnd.getTime()))
      : null;
  const endDate = explicitEndDate ?? openEndedActiveEndDate ?? startDate;

  if (startDate) {
    return {
      startDate,
      endDate: endDate && endDate.getTime() >= startDate.getTime() ? endDate : startDate,
    };
  }

  const parsedDateRange = parseMonthlySummaryDateRange(trip.dateRangeLabel);

  if (!parsedDateRange.startDate) {
    return { startDate: null, endDate: null };
  }

  return {
    startDate: parsedDateRange.startDate,
    endDate: parsedDateRange.endDate ?? parsedDateRange.startDate,
  };
}

function addOverlappedDayKeys(
  dayKeys: Set<string>,
  tripStartDate: Date,
  tripEndDate: Date,
  monthStart: Date,
  monthEnd: Date,
) {
  const start = new Date(Math.max(tripStartDate.getTime(), monthStart.getTime()));
  const end = new Date(Math.min(tripEndDate.getTime(), monthEnd.getTime()));

  if (start.getTime() > end.getTime()) {
    return false;
  }

  const cursor = new Date(start);

  while (cursor.getTime() <= end.getTime()) {
    dayKeys.add(createLocalDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return true;
}

function normalizeCityName(value: string) {
  return value
    .replace(/\s+travel$/i, '')
    .replace(/\s*여행$/g, '')
    .trim();
}

function isValidSummaryCity(value: string) {
  const normalized = value.trim().toLowerCase();

  return Boolean(normalized) && !['travel', 'unknown', 'travu', 'set location'].includes(normalized);
}

function splitCityValue(value: string) {
  const primaryParts = value
    .split(/[,/·•|、，]+/g)
    .flatMap((part) => {
      const trimmedPart = part.trim();
      const normalizedPart = trimmedPart.toLowerCase();

      if (MULTI_WORD_CITY_NAMES.has(normalizedPart)) {
        return [trimmedPart];
      }

      if (!/[가-힣]/.test(trimmedPart)) {
        return trimmedPart.split(/\s+/g);
      }

      return trimmedPart.split(/\s+/g);
    });

  return primaryParts
    .map(normalizeCityName)
    .filter(isValidSummaryCity);
}

function collectTripCities(trip: MonthlySummaryTrip) {
  const cities =
    Array.isArray(trip.visitedCities) && trip.visitedCities.length > 0
      ? trip.visitedCities
      : [trip.destinationName ?? trip.cityName ?? trip.city ?? ''];

  return cities.flatMap(splitCityValue);
}

function getMonthlySummary(date: Date, trips: MonthlySummaryTrip[]): MonthlySummary {
  const { monthStart, monthEnd } = getMonthRange(date);
  const travelDayKeys = new Set<string>();
  const cityKeys = new Set<string>();
  let photoCount = 0;

  trips.forEach((trip) => {
    if (trip.status === 'ignored') {
      return;
    }

    const { startDate, endDate } = getTripDateRange(trip, date, monthEnd);

    if (!startDate || !endDate) {
      return;
    }

    const hasMonthlyOverlap = addOverlappedDayKeys(
      travelDayKeys,
      startDate,
      endDate,
      monthStart,
      monthEnd,
    );

    if (!hasMonthlyOverlap) {
      return;
    }

    collectTripCities(trip).forEach((city) => {
      cityKeys.add(city.toLowerCase());
    });

    // TODO: Split photo counts by photo metadata dates when monthly media data is connected.
    photoCount += trip.photoCount ?? 0;
  });

  return {
    cityCount: cityKeys.size,
    photoCount,
    travelDays: travelDayKeys.size,
  };
}

function MonthlySummaryCard({
  title,
  travelDays,
  cityCount,
  photoCount,
}: {
  title: string;
  travelDays: number;
  cityCount: number;
  photoCount: number;
}) {
  return (
    <FrostedGlassSurface
      mode="translucent"
      style={styles.monthlySummaryShadow}
      contentStyle={styles.monthlySummaryCard}
      borderRadius={12}
      fillColor="rgba(255, 255, 255, 0.50)"
      borderColor="rgba(199, 199, 199, 0.50)"
    >
      <Text style={styles.monthlySummaryTitle}>{title}</Text>
      <View style={styles.monthlySummaryStats}>
        <MonthlySummaryMetric
          value={travelDays}
          unit={'\uC77C'}
          label={'\uC5EC\uD589 \uC77C\uC218'}
          width={45}
        />
        <View style={styles.monthlySummaryDivider} />
        <MonthlySummaryMetric
          value={cityCount}
          unit={'\uACF3'}
          label={'\uB3C4\uC2DC'}
          width={27}
        />
        <View style={styles.monthlySummaryDivider} />
        <MonthlySummaryMetric
          value={photoCount}
          unit={'\uC7A5'}
          label={'\uC0AC\uC9C4'}
          width={45}
          labelColor={Colors.foundation.grey700}
        />
      </View>
    </FrostedGlassSurface>
  );
}

function MonthlySummaryMetric({
  value,
  unit,
  label,
  width,
  labelColor = Colors.foundation.grey600,
}: {
  value: number;
  unit: string;
  label: string;
  width: number;
  labelColor?: string;
}) {
  return (
    <View style={[styles.monthlySummaryMetric, { width }]}>
      <View style={styles.monthlySummaryValueRow}>
        <Text style={styles.monthlySummaryValue}>{value}</Text>
        <Text style={styles.monthlySummaryUnit}>{unit}</Text>
      </View>
      <Text style={[styles.monthlySummaryLabel, { color: labelColor }]}>{label}</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: WARM_WHITE,
  },
  scrollContent: {
    paddingBottom: 48,
    backgroundColor: WARM_WHITE,
  },
  fixedHeroArea: {
    height: FIXED_HERO_AREA_HEIGHT,
    overflow: 'visible',
    backgroundColor: WARM_WHITE,
    zIndex: 1,
  },
  scroll: {
    flex: 1,
    backgroundColor: WARM_WHITE,
  },
  hero: {
    height: HERO_HEIGHT,
    overflow: 'visible',
    backgroundColor: WARM_WHITE,
    zIndex: 1,
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
    left: 0,
    right: 0,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  locationRow: {
    flex: 1,
    minWidth: 0,
    height: 27.05,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginRight: Spacing.md,
    zIndex: 1,
  },
  locationLabel: {
    flexShrink: 1,
    minWidth: 0,
    height: 24,
    fontFamily: 'Sansita Swashed',
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
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
  monthlySummaryShadow: {
    position: 'absolute',
    left: 35,
    right: 35,
    top: MONTHLY_SUMMARY_TOP,
    height: MONTHLY_SUMMARY_HEIGHT,
    borderRadius: 12,
    zIndex: 3,
  },
  monthlySummaryCard: {
    width: '100%',
    height: MONTHLY_SUMMARY_HEIGHT,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  monthlySummaryTitle: {
    ...Typography.captionEmphasized,
    letterSpacing: 2.88,
    color: Colors.foundation.grey800,
    includeFontPadding: false,
    textAlign: 'center',
  },
  monthlySummaryStats: {
    width: '100%',
    height: 44,
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    gap: 32,
  },
  monthlySummaryMetric: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 4,
  },
  monthlySummaryValueRow: {
    height: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    alignSelf: 'stretch',
  },
  monthlySummaryValue: {
    ...Typography.dashboardNum,
    color: Colors.foundation.black,
    includeFontPadding: false,
  },
  monthlySummaryUnit: {
    ...Typography.dashboardEmphasis,
    color: Colors.foundation.grey800,
    includeFontPadding: false,
  },
  monthlySummaryLabel: {
    ...Typography.captionEmphasized,
    includeFontPadding: false,
    textAlign: 'center',
  },
  monthlySummaryDivider: {
    width: 2,
    height: 32,
    borderRadius: 1,
    backgroundColor: 'rgba(217, 217, 217, 0.30)',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 32,
  },
  photoImportResultsCardOffset: {
    marginTop: 0,
  },
  recentTripsWithoutDetected: {
    marginTop: 0,
  },
  supplementalState: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing['2xl'],
  },
  supplementalStateText: {
    ...Typography.body2Regular,
    color: Colors.foundation.grey700,
  },
  supplementalRetryText: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.black,
  },
});
