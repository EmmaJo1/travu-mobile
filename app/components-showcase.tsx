/**
 * components-showcase
 *
 * 지금까지 만든 모든 컴포넌트를 한 화면에서 확인하는 개발용 쇼케이스
 * 라우트: /components-showcase
 */
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Text from '@/components/common/AppText';

import { SafeAreaView } from 'react-native-safe-area-context';

// Common
import AuthActionButton from '@/components/common/AuthActionButton';
import DateBadge from '@/components/common/DateBadge';
import PrimaryButton from '@/components/common/PrimaryButton';
import SheetActionButton from '@/components/common/SheetActionButton';
// Nav
import BottomTabBar from '@/components/nav/BottomTabBar';
import ScreenHeader from '@/components/nav/ScreenHeader';
// MyPage
import MyPageTabs from '@/components/mypage/MyPageTabs';
import ProfileSummary from '@/components/mypage/ProfileSummary';
// Trip
import DayCard from '@/components/trip/DayCard';
import PlaceEntryCard, { type PlaceEntry } from '@/components/trip/PlaceEntryCard';
import QuestionCard from '@/components/trip/QuestionCard';
import ReflectionCard from '@/components/trip/ReflectionCard';
import TodaySummary from '@/components/trip/TodaySummary';
import TravelStatsCard from '@/components/trip/TravelStatsCard';
import TripCard, { type TripCardData } from '@/components/trip/TripCard';
import TripListCard, { type TripListItem } from '@/components/trip/TripListCard';

import { Colors, Typography } from '@/constants/theme';

// ── 샘플 데이터 ───────────────────────────────────────────────
const TRIP: TripCardData = {
  id: 't1',
  country: '시드니',
  date: '2025. 3. 5 - 3. 15',
  period: '11',
  photoCount: '734',
  placeCount: '12',
  thumbnailUri: 'https://picsum.photos/seed/sydney/280/220',
  dateBadges: [
    { date: '3.5', day: '수', imageUri: 'https://picsum.photos/seed/d1/80/60' },
    { date: '3.6', day: '목', imageUri: 'https://picsum.photos/seed/d2/80/60' },
    { date: '3.7', day: '금', imageUri: 'https://picsum.photos/seed/d3/80/60' },
    { date: '3.8', day: '토', imageUri: 'https://picsum.photos/seed/d4/80/60' },
  ],
};

const TRIP_LIST: TripListItem[] = [
  { id: 'tl1', city: 'Paris, France', date: '2024.8.25-9.1', title: 'PARIS', imageUri: 'https://picsum.photos/seed/paris/90/120' },
  { id: 'tl2', city: 'Tokyo, Japan', date: '2024.11.1-11.7', title: 'TOKYO', imageUri: 'https://picsum.photos/seed/tokyo/90/120' },
  { id: 'tl3', city: 'Seoul, Korea', date: '2025.1.15-1.20', title: 'SEOUL', imageUri: 'https://picsum.photos/seed/seoul/90/120' },
];

const PLACE: PlaceEntry = {
  id: 'p1',
  time: '3 PM',
  place: '본다이 비치 🇦🇺',
  category: '관광명소',
  city: '시드니',
  text: '호주는 남반구라 3월에도 너무 덥고 따뜻했다. 시드니에서 가장 유명한 바닷가를 걷던 날이 정말 좋았다.',
  photoUris: [
    'https://picsum.photos/seed/bondi-1/220/292',
    'https://picsum.photos/seed/bondi-2/220/292',
  ],
};

// ── 섹션 래퍼 ─────────────────────────────────────────────────
function Section({ title, children, bg }: { title: string; children: React.ReactNode; bg?: string }) {
  return (
    <View style={[styles.section, bg ? { backgroundColor: bg } : null]}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      {children}
    </View>
  );
}

// ── 메인 화면 ─────────────────────────────────────────────────
export default function ComponentsShowcase() {
  const [tabMode, setTabMode] = useState<'trip' | 'reflection'>('trip');

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* 타이틀 */}
        <View style={styles.header}>
          <Text style={styles.pageTitle}>🧪 Components Showcase</Text>
          <Text style={styles.pageSubtitle}>전체 컴포넌트 시각 검수</Text>
        </View>

        {/* ── 1. 버튼 ───────────────────────────────────────── */}
        <Section title="1. Buttons">
          <Row label="AuthActionButton — state=on">
            <AuthActionButton label="카카오로 시작하기" onPress={() => {}} />
          </Row>
          <Row label="AuthActionButton — state=off">
            <AuthActionButton label="이메일로 로그인" onPress={() => {}} state="off" />
          </Row>
          <Row label="SheetActionButton — active">
            <SheetActionButton label="여행 기록 시작하기" onPress={() => {}} />
          </Row>
          <Row label="SheetActionButton — inactive">
            <SheetActionButton label="나중에 하기" onPress={() => {}} active={false} />
          </Row>
          <Row label="PrimaryButton — active / inactive">
            <View style={styles.rowInline}>
              <PrimaryButton label="저장" onPress={() => {}} />
              <PrimaryButton label="저장" onPress={() => {}} active={false} />
              <PrimaryButton label="장소 추가" onPress={() => {}} />
            </View>
          </Row>
        </Section>

        {/* ── 2. 네비게이션 ─────────────────────────────────── */}
        <Section title="2. Navigation">
          <Row label="ScreenHeader">
            <ScreenHeader title="Day 2" onBackPress={() => {}} />
          </Row>
          <Row label="DayCard">
            <View style={styles.rowInline}>
              <DayCard dayNumber={1} date="2025.3.5 수" />
              <DayCard dayNumber={2} date="2025.3.6 목" />
              <DayCard dayNumber={3} date="2025.3.7 금" />
            </View>
          </Row>
          <Row label="BottomTabBar — home / add / profile">
            <View style={styles.bottomTabWrap}>
              <BottomTabBar active="home" />
            </View>
          </Row>
        </Section>

        {/* ── 3. 공통 ───────────────────────────────────────── */}
        <Section title="3. Common">
          <Row label="DateBadge">
            <View style={styles.rowInline}>
              <DateBadge date="3.5" day="수" imageUri="https://picsum.photos/seed/d1/80/60" />
              <DateBadge date="3.6" day="목" imageUri="https://picsum.photos/seed/d2/80/60" />
              <DateBadge date="3.7" day="금" />
            </View>
          </Row>
        </Section>

        {/* ── 4. 여행 카드 ───────────────────────────────────── */}
        <Section title="4. Trip Cards">
          <Row label="TripCard">
            <TripCard trip={TRIP} onPress={() => {}} />
          </Row>
          <Row label="TripListCard (가로 스크롤)">
            <View style={styles.rowInline}>
              {TRIP_LIST.map(item => (
                <TripListCard key={item.id} trip={item} onPress={() => {}} />
              ))}
            </View>
          </Row>
        </Section>

        {/* ── 5. 기록 카드 ───────────────────────────────────── */}
        <Section title="5. Record Cards" bg={Colors.warm.white}>
          <Row label="PlaceEntryCard">
            <PlaceEntryCard entry={PLACE} />
          </Row>
          <Row label="ReflectionCard">
            <ReflectionCard
              data={{
                country: '시드니',
                date: '2025.3.5',
                reflection: '낯선 도시에서 혼자였지만, 오히려 그게 나를 더 자유롭게 만들었다. 이 여행이 오래 기억될 것 같다.',
              }}
            />
          </Row>
          <Row label="QuestionCard">
            <QuestionCard
              data={{
                question: '오늘 가장 설렜던 순간은?',
                answer: '본다이 비치에서 파도를 맞으며 걸을 때 진짜 자유로움을 느꼈다.',
                date: '2025.3.6',
                city: '시드니',
              }}
            />
          </Row>
        </Section>

        {/* ── 6. 통계/요약 ──────────────────────────────────── */}
        <Section title="6. Stats & Summary">
          <Row label="TodaySummary">
            <TodaySummary distanceKm={12} placeCount={3} momentCount={8} />
          </Row>
          <Row label="TravelStatsCard">
            <TravelStatsCard placeCount={12} distanceKm={47} />
          </Row>
        </Section>

        {/* ── 7. 마이페이지 ─────────────────────────────────── */}
        <Section title="7. MyPage">
          <Row label="ProfileSummary">
            <ProfileSummary
              userName="지수"
              recordCount={42}
              countryCount={7}
              tripCount={5}
            />
          </Row>
          <Row label="MyPageTabs">
            <MyPageTabs mode={tabMode} onChange={setTabMode} />
          </Row>
        </Section>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F0EDEA',
  },
  container: {
    gap: 0,
    paddingBottom: 60,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: Colors.foundation.black,
  },
  pageTitle: {
    ...Typography.title2,
    color: Colors.foundation.white,
  },
  pageSubtitle: {
    ...Typography.body2Regular,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  section: {
    backgroundColor: Colors.foundation.white,
    marginTop: 8,
    paddingVertical: 16,
    gap: 16,
  },
  sectionTitle: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.black,
    paddingHorizontal: 20,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.warm.beige,
  },
  sectionBody: {
    paddingHorizontal: 20,
    gap: 20,
  },
  row: {
    gap: 8,
  },
  rowLabel: {
    ...Typography.captionRegular,
    color: Colors.light.textSecondary,
  },
  rowInline: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'flex-start',
  },
  bottomTabWrap: {
    borderRadius: 8,
    overflow: 'hidden',
  },
});
