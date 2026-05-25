import { type Href, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Text from '@/components/common/AppText';
import MapPlaceholderCard from '@/components/common/MapPlaceholderCard';
import PrimaryButton from '@/components/common/PrimaryButton';
import MyPageTabs, { type MyPageTabMode } from '@/components/mypage/MyPageTabs';
import ProfileSummary from '@/components/mypage/ProfileSummary';
import DaySelectorSheet from '@/components/record/DaySelectorSheet';
import ScreenHeader from '@/components/nav/ScreenHeader';
import QuestionCard from '@/components/trip/QuestionCard';
import ReflectionCard from '@/components/trip/ReflectionCard';
import TripListCard from '@/components/trip/TripListCard';
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
  REFLECTION_FOOTER_TEXT,
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
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileBlock}>
          <ProfileSummary
            userName={MOCK_MY_PAGE_PROFILE.userName}
            profileImage={MOCK_MY_PAGE_PROFILE.profileImage}
            tagline={MOCK_MY_PAGE_PROFILE.tagline}
            recordCount={MOCK_MY_PAGE_PROFILE.recordCount}
            countryCount={MOCK_MY_PAGE_PROFILE.countryCount}
            tripCount={MOCK_MY_PAGE_PROFILE.tripCount}
          />
          <MyPageTabs mode={activeTab} onChange={setActiveTab} />
        </View>

        {activeTab === 'trip' ? (
          <View style={styles.travelContent}>
            <Text style={styles.sectionTitle}>나의 여행지도</Text>

            <MapPlaceholderCard
              subtitle="다녀온 곳 자동 표시"
              align="top"
              style={styles.mapBox}
            />

            <Text style={[styles.sectionTitle, styles.tripListSectionTitle]}>여행 리스트</Text>

            <View style={styles.tripList}>
              {groupedTrips.map(({ year, trips: yearTrips }, index) => (
                <View
                  key={year}
                  style={[styles.yearSection, index > 0 && styles.yearSectionSpaced]}
                >
                  <View style={styles.yearHeader}>
                    <Text style={styles.yearLabel}>{year}</Text>
                    {index === 0 ? (
                      <PrimaryButton
                        label={TRAVEL_SORT_LABELS[sortOption]}
                        onPress={() => setSortSheetVisible(true)}
                        numberOfLines={1}
                        style={styles.sortButton}
                      />
                    ) : null}
                  </View>

                  <View style={styles.grid}>
                    {yearTrips.map((trip) => (
                      <TripListCard
                        key={trip.id}
                        trip={toTripListItem(trip)}
                        onPress={() => router.push('/day-archive-detail' as Href)}
                        style={styles.gridItem}
                      />
                    ))}
                  </View>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.reflectionContent}>
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

            <Text style={styles.sectionTitle}>질문이 남긴 생각</Text>

            <View style={styles.questionList}>
              {MOCK_QUESTION_CARDS.map((item) => (
                <QuestionCard key={item.id} data={item} style={styles.questionCard} />
              ))}
            </View>

            <Text style={styles.footer}>{REFLECTION_FOOTER_TEXT}</Text>
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
  travelContent: {
    marginTop: 40,
  },
  reflectionContent: {
    marginTop: Spacing.lg,
    gap: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.title2,
    color: Colors.foundation.black,
    paddingHorizontal: Spacing.xl,
  },
  mapBox: {
    marginTop: Spacing.md,
  },
  tripListSectionTitle: {
    marginTop: 40,
  },
  tripList: {
    marginTop: Spacing['2xl'],
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
  },
  yearSection: {
    width: 350,
    maxWidth: '100%',
    gap: Spacing.lg,
  },
  yearSectionSpaced: {
    marginTop: Spacing['4xl'],
  },
  yearHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  yearLabel: {
    ...Typography.title2,
    color: Colors.foundation.black,
    flexShrink: 1,
  },
  sortButton: {
    maxWidth: 132,
    flexShrink: 0,
    marginLeft: Spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
    columnGap: 23,
    rowGap: Spacing.lg,
  },
  gridItem: {
    width: 101,
  },
  cardRow: {
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  questionList: {
    gap: Spacing['2xl'],
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  questionCard: {
    width: '100%',
    maxWidth: 350,
  },
  footer: {
    ...Typography.body2Regular,
    color: Colors.foundation.grey600,
    textAlign: 'center',
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
});
