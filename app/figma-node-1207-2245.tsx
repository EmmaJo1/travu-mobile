import DateBadge from '@/components/common/DateBadge';
import ScreenContainer from '@/components/common/ScreenContainer';
import ScreenHeader from '@/components/nav/ScreenHeader';
import BottomTabBar from '@/components/nav/BottomTabBar';
import QuestionCard from '@/components/trip/QuestionCard';
import ReflectionCard from '@/components/trip/ReflectionCard';
import TodaySummary from '@/components/trip/TodaySummary';
import TravelStatsCard from '@/components/trip/TravelStatsCard';
import TripCard, { type TripCardData } from '@/components/trip/TripCard';
import { Colors, Spacing } from '@/constants/theme';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const MOCK_TRIP: TripCardData = {
  id: 'figma-1207-2245-trip',
  country: 'PARIS',
  date: '2025. 8. 25 - 9. 1',
  period: '8',
  photoCount: '312',
  placeCount: '14',
  thumbnailUri: 'https://picsum.photos/seed/paris-cover/300/220',
  dateBadges: [
    { date: '8.25', day: '월', imageUri: 'https://picsum.photos/seed/paris-day1/160/120' },
    { date: '8.26', day: '화', imageUri: 'https://picsum.photos/seed/paris-day2/160/120' },
    { date: '8.27', day: '수', imageUri: 'https://picsum.photos/seed/paris-day3/160/120' },
    { date: '8.28', day: '목', imageUri: 'https://picsum.photos/seed/paris-day4/160/120' },
  ],
};

export default function FigmaNode12072245Screen() {
  return (
    <SafeAreaView style={styles.safe}>
      <ScreenContainer style={styles.container}>
        <ScreenHeader title="Trip Detail" style={styles.header} />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}>
          <TripCard trip={MOCK_TRIP} onPress={() => {}} onSavePress={() => {}} />

          <View style={styles.badgeRow}>
            <DateBadge date="8.29" day="금" imageUri="https://picsum.photos/seed/paris-day5/160/120" />
            <DateBadge date="8.30" day="토" imageUri="https://picsum.photos/seed/paris-day6/160/120" />
            <DateBadge date="8.31" day="일" imageUri="https://picsum.photos/seed/paris-day7/160/120" />
            <DateBadge date="9.1" day="월" />
          </View>

          <View style={styles.summaryRow}>
            <TodaySummary distanceKm={18} placeCount={5} momentCount={9} />
            <TravelStatsCard placeCount={5} distanceKm={18} />
          </View>

          <QuestionCard
            data={{
              question: '이번 여행에서 새롭게 발견한 나는?',
              answer: '계획하지 않은 길을 걷는 시간을 더 좋아한다는 걸 알게 됐다.',
              date: '2025.8.25-9.1',
              city: 'Paris, France',
            }}
          />

          <ReflectionCard
            data={{
              country: 'Paris, France',
              date: '2025.8.25-9.1',
              reflection:
                '효율만 쫓으면 놓치는 행복이 있었다. 우연한 골목과 느린 산책이 이번 여행의 가장 선명한 장면으로 남았다.',
            }}
          />

          <Text style={styles.note}>Figma node 1207:2245 test composition</Text>
        </ScrollView>

        <BottomTabBar active="home" style={styles.tabBar} />
      </ScreenContainer>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.light.bgScreen,
  },
  container: {
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
    gap: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: 112,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  note: {
    color: Colors.foundation.grey500,
    fontFamily: 'Pretendard-Regular',
    fontSize: 12,
    lineHeight: 16,
  },
  tabBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
});
