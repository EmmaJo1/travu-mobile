import { useRouter, type Href } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Text from '@/components/common/AppText';
import MapPlaceholderCard from '@/components/common/MapPlaceholderCard';
import MyPageTabs, { type MyPageTabMode } from '@/components/mypage/MyPageTabs';
import ProfileSummary from '@/components/mypage/ProfileSummary';
import ScreenHeader from '@/components/nav/ScreenHeader';
import DaySelectorSheet from '@/components/record/DaySelectorSheet';
import QuestionCard from '@/components/trip/QuestionCard';
import ReflectionCard from '@/components/trip/ReflectionCard';
import TripListCardList from '@/components/trip/TripListCardList';
import { MOCK_MY_PAGE_PROFILE } from '@/constants/mockMyPageProfile';
import {
  MOCK_MY_PAGE_TRIPS,
  TRAVEL_SORT_LABELS,
  TRAVEL_SORT_OPTIONS,
  groupTripsByYear,
  sortMyPageTrips,
  toTripListItem,
  type TravelSortOption,
} from '@/constants/mockMyPageTrips';
import {
  MOCK_QUESTION_CARDS,
  MOCK_REFLECTION_CARDS,
} from '@/constants/mockReflections';
import { Colors, Spacing, Typography } from '@/constants/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<MyPageTabMode>('trip');
  const [sortOption, setSortOption] = useState<TravelSortOption>('latest');
  const [sortSheetVisible, setSortSheetVisible] = useState(false);

  const sortedTrips = useMemo(
    () => sortMyPageTrips(MOCK_MY_PAGE_TRIPS, sortOption),
    [sortOption],
  );
  const groupedTrips = useMemo(() => groupTripsByYear(sortedTrips), [sortedTrips]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader style={styles.header} onSettingsPress={() => {}} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileBlock}>
          <View style={styles.profileSummarySection}>
            <ProfileSummary
              userName={MOCK_MY_PAGE_PROFILE.userName}
              profileImage={MOCK_MY_PAGE_PROFILE.profileImage}
              recordCount={MOCK_MY_PAGE_PROFILE.recordCount}
              countryCount={MOCK_MY_PAGE_PROFILE.countryCount}
              tripCount={MOCK_MY_PAGE_PROFILE.tripCount}
              tagline={MOCK_MY_PAGE_PROFILE.tagline}
            />
          </View>
          <MyPageTabs mode={activeTab} onChange={setActiveTab} />
        </View>

        {activeTab === 'trip' ? (
          <View style={styles.travelContent}>
            <View style={styles.mapSection}>
              <Text style={styles.sectionTitle}>나의 여행지도</Text>
              <MapPlaceholderCard
                subtitle="다녀온 곳 자동 표시"
                align="top"
              />
            </View>

            <View style={styles.tripListSection}>
              <Text style={styles.sectionTitle}>여행 리스트</Text>

              <View style={styles.tripList}>
                {groupedTrips.map(({ year, trips: yearTrips }) => (
                  <View key={year} style={styles.yearSection}>
                    <View style={styles.yearHeader}>
                      <Text style={styles.yearLabel}>{year}</Text>
                      {year === groupedTrips[0]?.year ? (
                        <Pressable
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
                      ) : null}
                    </View>

                    <TripListCardList
                      trips={yearTrips.map(toTripListItem)}
                      onPressTrip={() => router.push('/day-archive-detail' as Href)}
                    />
                  </View>
                ))}
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.reflectionContent}>
            <View style={styles.reflectionHeroSection}>
              <Text style={styles.sectionTitle}>여행이 끝난 후에야 보이는 생각들이 있어요</Text>

              <ScrollView
                horizontal
                nestedScrollEnabled
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.cardRow}
              >
                {MOCK_REFLECTION_CARDS.map((card) => (
                  <ReflectionCard key={card.id} data={card} />
                ))}
              </ScrollView>
            </View>

            <View style={styles.reflectionQuestionSection}>
              <Text style={styles.reflectionSectionTitle}>질문이 남긴 생각</Text>

              <View style={styles.questionList}>
                {MOCK_QUESTION_CARDS.map((item) => (
                  <QuestionCard key={item.id} data={item} style={styles.questionCard} />
                ))}
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      <DaySelectorSheet
        visible={sortSheetVisible}
        title="정렬"
        options={TRAVEL_SORT_OPTIONS}
        selectedId={sortOption}
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
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
  },
  /** Figma Frame 203 하단 → 나의 여행지도: 40px */
  travelContent: {
    marginTop: 40,
    gap: 40,
  },
  /** Figma 나의 여행지도 → 지도 카드: 12px */
  mapSection: {
    gap: Spacing.md,
  },
  /** Figma 여행 리스트 → Frame 187: 24px */
  tripListSection: {
    gap: Spacing.lg,
  },
  reflectionContent: {
    marginTop: Spacing['2xl'],
  },
  reflectionHeroSection: {
    gap: Spacing.lg,
  },
  reflectionQuestionSection: {
    marginTop: Spacing['4xl'],
    paddingHorizontal: Spacing.xl,
    gap: Spacing.lg,
    alignSelf: 'stretch',
    width: '100%',
  },
  sectionTitle: {
    ...Typography.title2,
    color: Colors.foundation.black,
    paddingHorizontal: Spacing.xl,
  },
  reflectionSectionTitle: {
    ...Typography.title2,
    color: Colors.foundation.black,
    alignSelf: 'stretch',
  },
  /** Figma Frame 187 — 연도 그룹 간 gap 40, paddingHorizontal 20 */
  tripList: {
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    gap: 40,
  },
  /** Figma Frame 205/186 — VERTICAL gap 16 */
  yearSection: {
    width: 350,
    maxWidth: '100%',
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
    width: Spacing.md,
    height: Spacing.md,
  },
  cardRow: {
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  questionList: {
    gap: Spacing.md,
    alignSelf: 'stretch',
    width: '100%',
  },
  questionCard: {
    width: '100%',
    alignSelf: 'stretch',
  },
});
