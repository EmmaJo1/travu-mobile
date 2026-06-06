import { useRouter, type Href } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Text from '@/components/common/AppText';
import HorizontalEdgeScrollView from '@/components/common/HorizontalEdgeScrollView';
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

const CONTENT_FADE_DURATION_MS = 500;

export default function ProfileScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<MyPageTabMode>('trip');
  const [sortOption, setSortOption] = useState<TravelSortOption>('latest');
  const [sortSheetVisible, setSortSheetVisible] = useState(false);
  const contentOpacity = useRef(new Animated.Value(1)).current;
  const isFirstTabRender = useRef(true);

  const sortedTrips = useMemo(
    () => sortMyPageTrips(MOCK_MY_PAGE_TRIPS, sortOption),
    [sortOption],
  );
  const groupedTrips = useMemo(() => groupTripsByYear(sortedTrips), [sortedTrips]);

  useEffect(() => {
    if (isFirstTabRender.current) {
      isFirstTabRender.current = false;
      return;
    }

    contentOpacity.setValue(0);
    Animated.timing(contentOpacity, {
      toValue: 1,
      duration: CONTENT_FADE_DURATION_MS,
      useNativeDriver: true,
    }).start();
  }, [activeTab, contentOpacity]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        style={styles.header}
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

        <Animated.View style={{ opacity: contentOpacity }}>
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

                <View style={styles.reflectionCardScrollWrap}>
                  <HorizontalEdgeScrollView contentContainerStyle={styles.cardRow}>
                    {MOCK_REFLECTION_CARDS.map((card) => (
                      <ReflectionCard key={card.id} data={card} />
                    ))}
                  </HorizontalEdgeScrollView>
                </View>
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
        </Animated.View>
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
    marginTop: Spacing['2xl'],
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
  /** HorizontalEdgeScrollView edge bleed — 부모에 좌우 패딩 필요 */
  reflectionCardScrollWrap: {
    paddingHorizontal: Spacing.xl,
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
    width: Spacing.md,
    height: Spacing.md,
  },
  cardRow: {
    gap: Spacing.md,
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
