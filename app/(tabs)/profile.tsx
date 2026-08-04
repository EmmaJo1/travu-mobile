import { useRouter, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useMemo, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Text from '@/components/common/AppText';
import MapPlaceholderCard from '@/components/common/MapPlaceholderCard';
import ProfileSummary from '@/components/mypage/ProfileSummary';
import ScreenHeader from '@/components/nav/ScreenHeader';
import DaySelectorSheet from '@/components/record/DaySelectorSheet';
import TripListCardList from '@/components/trip/TripListCardList';
import {
    MOCK_MY_PAGE_TRIPS,
    TRAVEL_SORT_LABELS,
    TRAVEL_SORT_OPTIONS,
    groupTripsByYear,
    sortMyPageTrips,
    toTripListItem,
    type MyPageTrip,
    type TravelSortOption,
} from '@/constants/mockMyPageTrips';
import { removeSavedMyPageTrip, useSavedMyPageTrips } from '@/constants/savedMyPageTrips';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { useDeleteTrip } from '@/hooks/useDeleteTrip';
import { useMyTrips } from '@/hooks/useMyTrips';
import { useAuth } from '@/providers/AuthProvider';
import { useUserProfile } from '@/providers/UserProfileProvider';
import { mapSupabaseTripsToMyPageTrips } from '@/utils/supabaseTripMappers';

function normalizeCountValue(value?: string | null) {
  return value?.trim() ?? '';
}

function normalizeCountKey(value?: string | null) {
  return normalizeCountValue(value).toLowerCase();
}

function getTripVisitedCitiesForStats(trip: MyPageTrip) {
  if (trip.visitedCities.length > 0) {
    return trip.visitedCities;
  }

  const city = normalizeCountValue(trip.city);
  return city ? [city] : [];
}

function getTripVisitedCountriesForStats(trip: MyPageTrip) {
  if (trip.visitedCountries.length > 0) {
    return trip.visitedCountries;
  }

  const country = normalizeCountValue(trip.country);
  return country ? [country] : [];
}

function countUniqueValues(values: string[]) {
  return new Set(values.map(normalizeCountKey).filter(Boolean)).size;
}

function getTripListCityCountryKey(trip: MyPageTrip) {
  return `${normalizeCountKey(trip.city)}|${normalizeCountKey(trip.country)}`;
}

function mergeSavedAndMockTrips(savedTrips: MyPageTrip[]) {
  const mergedTrips = [...savedTrips];
  const existingIds = new Set(mergedTrips.map((trip) => normalizeCountKey(trip.id)).filter(Boolean));
  const existingCityCountryKeys = new Set(mergedTrips.map(getTripListCityCountryKey));

  MOCK_MY_PAGE_TRIPS.forEach((trip) => {
    const idKey = normalizeCountKey(trip.id);
    const cityCountryKey = getTripListCityCountryKey(trip);

    if (existingIds.has(idKey) || existingCityCountryKeys.has(cityCountryKey)) {
      return;
    }

    existingIds.add(idKey);
    existingCityCountryKeys.add(cityCountryKey);
    mergedTrips.push(trip);
  });

  return mergedTrips;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export default function ProfileScreen() {
  const router = useRouter();
  const [sortOption, setSortOption] = useState<TravelSortOption>('latest');
  const [sortSheetVisible, setSortSheetVisible] = useState(false);
  const [deletedTripIds, setDeletedTripIds] = useState<string[]>([]);
  const savedTrips = useSavedMyPageTrips();
  const { profile } = useUserProfile();
  const { canUseSupabaseUserData, user } = useAuth();
  const {
    data: supabaseTrips,
    isError: isSupabaseTripsError,
    isLoading: isSupabaseTripsLoading,
    refetch: refetchSupabaseTrips,
  } = useMyTrips();
  const deleteTripMutation = useDeleteTrip();
  const supabaseTripIds = useMemo(
    () => new Set((supabaseTrips ?? []).map((trip) => trip.id)),
    [supabaseTrips],
  );

  const myPageTrips = useMemo(
    () => {
      const deletedTripIdSet = new Set(deletedTripIds);
      const sourceTrips = canUseSupabaseUserData
        ? mapSupabaseTripsToMyPageTrips(supabaseTrips ?? [])
        : mergeSavedAndMockTrips(savedTrips);

      return sourceTrips.filter((trip) => !deletedTripIdSet.has(trip.id));
    },
    [canUseSupabaseUserData, deletedTripIds, savedTrips, supabaseTrips],
  );
  const profileStats = useMemo(
    () => ({
      totalTrips: myPageTrips.length,
      uniqueCityCount: countUniqueValues(myPageTrips.flatMap(getTripVisitedCitiesForStats)),
      uniqueCountryCount: countUniqueValues(myPageTrips.flatMap(getTripVisitedCountriesForStats)),
    }),
    [myPageTrips],
  );
  const sortedTrips = useMemo(
    () => sortMyPageTrips(myPageTrips, sortOption),
    [myPageTrips, sortOption],
  );
  const groupedTrips = useMemo(() => groupTripsByYear(sortedTrips), [sortedTrips]);

  const handleRequestDeleteTrip = (tripId: string, tripTitle?: string) => {
    Alert.alert(
      '삭제하시겠습니까?',
      '이 여행 기록은 삭제 후 복구할 수 없어요.',
      [
        {
          text: '취소',
          style: 'cancel',
        },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => {
            const isSupabaseTrip = supabaseTripIds.has(tripId);

            console.warn('[ProfileScreen] delete trip requested', {
              isSupabaseTrip,
              tripTitle,
              tripId,
              userId: user?.id,
            });

            if (isSupabaseTrip) {
              deleteTripMutation.mutate(tripId, {
                onError: (error) => {
                  const message = getErrorMessage(error);
                  console.warn('[ProfileScreen] delete trip mutation failed', {
                    message,
                    tripTitle,
                    tripId,
                    userId: user?.id,
                  });
                  Alert.alert(
                    '여행을 삭제하지 못했어요',
                    `잠시 후 다시 시도해주세요.\n개발 정보: ${message}`,
                  );
                },
                onSuccess: () => {
                  setDeletedTripIds((current) =>
                    current.includes(tripId) ? current : [...current, tripId],
                  );
                },
              });
              return;
            }

            removeSavedMyPageTrip(tripId);
            setDeletedTripIds((current) =>
              current.includes(tripId) ? current : [...current, tripId],
            );
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="dark" />
      <ScreenHeader
        style={styles.header}
        leftSlot={<Text style={styles.headerTitle}>나의 여정</Text>}
        onSettingsPress={() => router.push('/settings' as Href)}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileBlock}>
          <View style={styles.profileSummarySection}>
            <ProfileSummary
              userName={profile.name}
              profileUri={profile.profileImageUri}
              cityCount={profileStats.uniqueCityCount}
              countryCount={profileStats.uniqueCountryCount}
              tripCount={profileStats.totalTrips}
              basedIn={profile.basedIn}
              tagline={profile.bio}
            />
          </View>
        </View>

        <View style={styles.travelContent}>
              <View style={styles.mapSection}>
                <Text style={styles.sectionTitle}>나의 여행지도</Text>
                <View style={styles.mapCardWrap}>
                  <MapPlaceholderCard
                    subtitle="다녀온 곳 자동 표시"
                    align="top"
                    style={styles.mapCard}
                  />
                </View>
              </View>

              <View style={styles.tripListSection}>
                <View style={styles.tripListHeader}>
                  <Text style={styles.tripListTitle}>여행 리스트</Text>
                  <Pressable
                    disabled={groupedTrips.length === 0}
                    onPress={() => setSortSheetVisible(true)}
                    style={({ pressed }) => [styles.sortTrigger, pressed && styles.sortTriggerPressed]}
                    accessibilityRole="button"
                    accessibilityLabel={`정렬, ${TRAVEL_SORT_LABELS[sortOption]}`}
                  >
                    <Text style={styles.sortTriggerLabel} numberOfLines={1}>
                      {TRAVEL_SORT_LABELS[sortOption]}
                    </Text>
                    <Image
                      source={require('@/assets/images/daycard-triangle.png')}
                      style={styles.sortTriggerIcon}
                      resizeMode="contain"
                    />
                  </Pressable>
                </View>

                <View style={styles.tripList}>
                  {canUseSupabaseUserData && isSupabaseTripsLoading ? (
                    <View style={styles.tripListState}>
                      <Text style={styles.tripListStateTitle}>여행을 불러오는 중이에요</Text>
                    </View>
                  ) : canUseSupabaseUserData && isSupabaseTripsError ? (
                    <View style={styles.tripListState}>
                      <Text style={styles.tripListStateTitle}>여행을 불러오지 못했어요</Text>
                      <Text style={styles.tripListStateDescription}>
                        네트워크 상태를 확인한 뒤 다시 시도해주세요.
                      </Text>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => void refetchSupabaseTrips()}
                        style={styles.tripListRetryButton}
                      >
                        <Text style={styles.tripListRetryText}>다시 시도</Text>
                      </Pressable>
                    </View>
                  ) : groupedTrips.length === 0 ? (
                    <View style={styles.tripListState}>
                      <Text style={styles.tripListStateTitle}>아직 완료한 여행이 없어요</Text>
                      <Text style={styles.tripListStateDescription}>
                        여행을 완료하면 이곳에 차곡차곡 모여요.
                      </Text>
                    </View>
                  ) : groupedTrips.map(({ year, trips: yearTrips }) => (
                    <View key={year} style={styles.yearSection}>
                      <View style={styles.yearHeader}>
                        <Text style={styles.yearLabel}>{year}</Text>
                      </View>

                      <TripListCardList
                        trips={yearTrips.map(toTripListItem)}
                        onLongPressTrip={(trip) => handleRequestDeleteTrip(trip.id, trip.title)}
                        onPressTrip={(trip) => {
                          router.push({
                            pathname: '/day-archive-detail',
                            params: { tripId: trip.id },
                          } as Href);
                        }}
                      />
                    </View>
                  ))}
                </View>
              </View>
            </View>

      </ScrollView>

      <DaySelectorSheet
        visible={sortSheetVisible}
        options={TRAVEL_SORT_OPTIONS}
        selectedId={sortOption}
        hideTitle
        hideOptionAccessory
        compactOptions
        onSelectOption={(option) => {
          setSortOption(option.id as TravelSortOption);
          setSortSheetVisible(false);
        }}
        onClose={() => setSortSheetVisible(false)}
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
    paddingLeft: Spacing.xl,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: Spacing['4xl'],
  },
  profileBlock: {
    width: '100%',
  },
  profileSummarySection: {
    width: '100%',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
    borderBottomWidth: 2,
    borderBottomColor: Colors.foundation.grey100,
  },
  /** Figma Frame 203 하단 → 나의 여행지도: 40px */
  travelContent: {
    marginTop: Spacing['2xl'],
    gap: 40,
  },
  /** Figma 나의 여행지도 → 지도 카드: 12px */
  mapSection: {
    gap: Spacing.md,
  },
  mapCardWrap: {
    width: '100%',
    paddingHorizontal: Spacing.xl,
  },
  mapCard: {
    maxWidth: '100%',
    alignSelf: 'stretch',
  },
  /** Figma 여행 리스트 → Frame 187: 24px */
  tripListSection: {
    gap: Spacing.lg,
  },
  tripListHeader: {
    height: 24,
    paddingHorizontal: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tripListTitle: {
    ...Typography.title2,
    color: Colors.foundation.black,
  },
  sectionTitle: {
    ...Typography.title2,
    color: Colors.foundation.black,
    paddingHorizontal: Spacing.xl,
  },
  headerTitle: {
    ...Typography.title2,
    color: Colors.foundation.black,
  },
  /** Figma Frame 187 — 연도 그룹 간 gap 40, paddingHorizontal 20 */
  tripList: {
    paddingHorizontal: Spacing.xl,
    alignSelf: 'stretch',
    width: '100%',
    gap: 40,
  },
  /** Figma Frame 205/186 — VERTICAL gap 16 */
  yearSection: {
    width: '100%',
    alignSelf: 'stretch',
    gap: Spacing.lg,
  },
  yearHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  yearLabel: {
    ...Typography.body1Emphasized,
    color: Colors.foundation.black,
    flexShrink: 1,
  },
  sortTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexShrink: 0,
    marginLeft: Spacing.sm,
  },
  sortTriggerPressed: {
    opacity: 0.75,
  },
  sortTriggerLabel: {
    ...Typography.captionRegular,
    color: Colors.foundation.black,
  },
  sortTriggerIcon: {
    width: 8,
    height: 8,
  },
  tripListState: {
    minHeight: 160,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
  },
  tripListStateTitle: {
    ...Typography.body1Emphasized,
    color: Colors.foundation.black,
    textAlign: 'center',
  },
  tripListStateDescription: {
    ...Typography.body2Regular,
    color: Colors.foundation.grey600,
    textAlign: 'center',
  },
  tripListRetryButton: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  tripListRetryText: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.black,
  },
});
