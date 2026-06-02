/**
 * component-test
 * Figma 스펙 기반으로 재작성된 컴포넌트 렌더링 확인 화면.
 */
import Text from '@/components/common/AppText';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import AuthActionButton from '@/components/common/AuthActionButton';
import DateBadge from '@/components/common/DateBadge';
import HorizontalEdgeScrollView from '@/components/common/HorizontalEdgeScrollView';
import PrimaryButton from '@/components/common/PrimaryButton';
import SheetActionButton from '@/components/common/SheetActionButton';
import MyPageTabs, { type MyPageTabMode } from '@/components/mypage/MyPageTabs';
import ProfileSummary from '@/components/mypage/ProfileSummary';
import BottomTabBar from '@/components/nav/BottomTabBar';
import ScreenHeader from '@/components/nav/ScreenHeader';
import DayCard from '@/components/trip/DayCard';
import PlaceEntryCard, { type PlaceEntry } from '@/components/trip/PlaceEntryCard';
import QuestionCard from '@/components/trip/QuestionCard';
import ReflectionCard from '@/components/trip/ReflectionCard';
import TodaySummary from '@/components/trip/TodaySummary';
import TravelStatsCard from '@/components/trip/TravelStatsCard';
import TripCard, { type TripCardData } from '@/components/trip/TripCard';
import TripListCard, { type TripListItem } from '@/components/trip/TripListCard';

import { Colors, Radius, Spacing, Typography } from '@/constants/theme';

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_TRIP: TripCardData = {
  id: 'trip-1',
  country:    '시드니',
  date:       '2025. 3. 5 - 3. 15',
  period:     '11',
  photoCount: '734',
  placeCount: '12',
  thumbnailUri: 'https://picsum.photos/seed/sydney/280/220',
  dateBadges: [
    { date: '3.5', day: '수', imageUri: 'https://picsum.photos/seed/s1/160/120' },
    { date: '3.6', day: '목', imageUri: 'https://picsum.photos/seed/s2/160/120' },
    { date: '3.7', day: '금', imageUri: 'https://picsum.photos/seed/s3/160/120' },
    { date: '3.8', day: '토', imageUri: 'https://picsum.photos/seed/s4/160/120' },
    { date: '3.9', day: '일', imageUri: 'https://picsum.photos/seed/s5/160/120' },
  ],
};

const MOCK_TRIP_LIST: TripListItem[] = [
  { id: 'tl-1', city: 'Paris, France', date: '2025.8.25-9.1', title: 'PARIS',   imageUri: 'https://picsum.photos/seed/paris/180/240' },
  { id: 'tl-2', city: 'Tokyo, Japan',  date: '2025.4.1-4.7',  title: 'TOKYO',   imageUri: 'https://picsum.photos/seed/tokyo/180/240' },
  { id: 'tl-3', city: 'Bali, Indonesia',date:'2025.6.10-6.17',title: 'BALI',    imageUri: 'https://picsum.photos/seed/bali/180/240' },
  { id: 'tl-4', city: 'New York, USA', date: '2025.9.3-9.10', title: 'NEW YORK' },
];

const MOCK_PLACE_ENTRIES: PlaceEntry[] = [
  {
    id: 'p-1',
    time:      '7 PM',
    place:     '세느 강',
    category:  '관광명소',
    city:      '파리',
    text:      '센느 강에서 에펠탑 뷰를 보며 노을을 구경하였다. 분홍색과 보랏빛 노을이 에펠탑과 어우러지면서 한폭의 그림 같았다.',
    photoUris: [
      'https://picsum.photos/seed/e1/220/292',
      'https://picsum.photos/seed/e2/220/292',
      'https://picsum.photos/seed/e3/220/292',
    ],
  },
  {
    id:   'p-2',
    time: '2 PM',
    place:'루브르 박물관',
    category: '박물관',
    city: '파리',
    text: '모나리자 앞에 서다.',
  },
  {
    id:    'p-3',
    place: '노트르담 대성당',
    city:  '파리',
  },
];

// ─── 유틸 컴포넌트 ────────────────────────────────────────────────────────────

function SectionTitle({ title }: { title: string }) {
  return (
    <View style={sectionStyles.row}>
      <View style={sectionStyles.line} />
      <Text style={sectionStyles.text}>{title}</Text>
      <View style={sectionStyles.line} />
    </View>
  );
}
const sectionStyles = StyleSheet.create({
  row:  { flexDirection:'row', alignItems:'center', gap:Spacing.sm, marginTop:Spacing['3xl'], marginBottom:Spacing.lg },
  line: { flex:1, height:1, backgroundColor:Colors.light.borderStrong },
  text: { ...Typography.body2Emphasized, color:Colors.light.textSecondary, flexShrink:0 },
});

function Label({ text }: { text: string }) {
  return <Text style={labelStyle}>{text}</Text>;
}
const labelStyle: object = {
  ...Typography.captionRegular,
  color:         Colors.light.textSecondary,
  marginBottom:  Spacing.xs,
  textTransform: 'uppercase' as const,
  letterSpacing: 0.5,
};

function MissingComponent({ name, path }: { name: string; path: string }) {
  return (
    <View style={missingStyles.box}>
      <Text style={missingStyles.badge}>❌ 미생성</Text>
      <Text style={missingStyles.name}>{name}</Text>
      <Text style={missingStyles.path}>{path}</Text>
    </View>
  );
}
const missingStyles = StyleSheet.create({
  box:   { borderWidth:1, borderColor:'#E3DBD8', borderStyle:'dashed', borderRadius:Radius.sm, padding:Spacing.lg, backgroundColor:'#FFF8F6', gap:Spacing.xs },
  badge: { ...Typography.captionEmphasized, color:'#B05A3A' },
  name:  { ...Typography.body2Emphasized, color:'#333' },
  path:  { ...Typography.captionRegular, color:'#999' },
});

// ─── 메인 ────────────────────────────────────────────────────────────────────

export default function ComponentTestScreen() {
  const [dayIdx, setDayIdx] = useState(0);
  const [myTab, setMyTab] = useState<MyPageTabMode>('trip');

  const DAYS = [
    { dayNumber: 1, date: '2025.3.5 수' },
    { dayNumber: 2, date: '2025.3.6 목' },
    { dayNumber: 3, date: '2025.3.7 금' },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>Component Test</Text>
        <Text style={styles.pageSubtitle}>Figma Section 3 기준 재작성 — {new Date().toLocaleDateString('ko-KR')}</Text>

        {/* ── PrimaryButton ────────────────────────────────── */}
        <SectionTitle title="PrimaryButton (소형 칩 버튼, radius=16)" />
        <Label text="active=true" />
        <PrimaryButton label="저장" onPress={() => {}} active />
        <Label text="active=false" />
        <PrimaryButton label="저장" onPress={() => {}} active={false} />

        {/* ── AuthActionButton ─────────────────────────────── */}
        <SectionTitle title="AuthActionButton (320×48, 전체 너비)" />
        <Label text="state=on (기본 액션)" />
        <AuthActionButton label="회원가입" onPress={() => {}} state="on" />
        <Label text="state=off (보조 액션)" />
        <AuthActionButton label="나중에 하기" onPress={() => {}} state="off" />

        {/* ── SheetActionButton ────────────────────────────── */}
        <SectionTitle title="SheetActionButton (바텀시트 전체 너비)" />
        <Label text="active=true" />
        <SheetActionButton label="확인" onPress={() => {}} active />
        <Label text="active=false" />
        <SheetActionButton label="확인" onPress={() => {}} active={false} />

        {/* ── DayCard ──────────────────────────────────────── */}
        <SectionTitle title="DayCard (109px, 타임라인 헤더)" />
        <Label text="선택된 DayCard — 날짜+화살표" />
        <View style={styles.row}>
          {DAYS.map((d, i) => (
            <DayCard
              key={i}
              dayNumber={d.dayNumber}
              date={d.date}
              onPress={() => setDayIdx(i)}
            />
          ))}
        </View>
        <Text style={styles.hint}>탭된 Day: {dayIdx + 1}</Text>

        {/* ── TripCard ─────────────────────────────────────── */}
        <SectionTitle title="TripCard (350×178)" />
        <Label text="썸네일 + 통계 + DateBadge 스크롤" />
        <TripCard trip={MOCK_TRIP} onPress={() => {}} onSavePress={() => {}} />

        <Label text="썸네일 없음 (폴백 #919191)" />
        <TripCard
          trip={{ ...MOCK_TRIP, id: 'trip-1b', thumbnailUri: undefined, dateBadges: [] }}
          onPress={() => {}}
        />

        {/* ── TripListCard ─────────────────────────────────── */}
        <SectionTitle title="TripListCard (101px 수직 북 스파인)" />
        <Label text="가로 스크롤 목록" />
        <HorizontalEdgeScrollView contentContainerStyle={styles.tripListRow}>
          {MOCK_TRIP_LIST.map((t) => (
            <TripListCard key={t.id} trip={t} onPress={() => {}} />
          ))}
        </HorizontalEdgeScrollView>

        {/* ── PlaceEntryCard ───────────────────────────────── */}
        <SectionTitle title="PlaceEntryCard (타임라인 구조)" />
        <Label text="시간 + 사진 스트립 + 메모" />
        <PlaceEntryCard entry={MOCK_PLACE_ENTRIES[0]} />
        <Label text="시간 + 메모 (사진 없음)" />
        <PlaceEntryCard entry={MOCK_PLACE_ENTRIES[1]} />
        <Label text="장소명만 (최소)" />
        <PlaceEntryCard entry={MOCK_PLACE_ENTRIES[2]} />

        {/* ── DateBadge ─────────────────────────────────────── */}
        <SectionTitle title="DateBadge (80×60)" />
        <HorizontalEdgeScrollView contentContainerStyle={styles.tripListRow}>
          {MOCK_TRIP.dateBadges?.map((b, i) => (
            <DateBadge key={i} date={b.date} day={b.day} imageUri={b.imageUri} />
          ))}
          <DateBadge date="4.1" day="화" />
        </HorizontalEdgeScrollView>

        {/* ── ReflectionCard ────────────────────────────────── */}
        <SectionTitle title="ReflectionCard (219×269)" />
        <ReflectionCard
          data={{
            country: 'Paris, France',
            date: '2025.8.25-9.1',
            reflection:
              '효율만 추구할수록 놓치는 행복이 있다는 걸 느꼈다. 비효율적인 순간이 오히려 여행의 핵심 장면으로 남았다.',
          }}
        />

        {/* ── QuestionCard ──────────────────────────────────── */}
        <SectionTitle title="QuestionCard (350w)" />
        <QuestionCard
          data={{
            question: '이번 여행에서 새롭게 발견한 나는?',
            answer: '사진을 찍고 보정하는 과정 자체를 즐기는 사람이었다.',
            date: '2025.8.25-9.1',
            city: 'Paris, France',
          }}
        />

        {/* ── TodaySummary / TravelStatsCard ───────────────── */}
        <SectionTitle title="TodaySummary / TravelStatsCard" />
        <View style={styles.row}>
          <TodaySummary distanceKm={20} placeCount={3} momentCount={7} />
          <TravelStatsCard placeCount={3} distanceKm={20} />
        </View>

        {/* ── ProfileSummary / MyPageTabs ──────────────────── */}
        <SectionTitle title="ProfileSummary / MyPageTabs" />
        <ProfileSummary
          userName="User_name"
          profileUri="https://picsum.photos/seed/profile/220/220"
          recordCount={11}
          countryCount={22}
          tripCount={12}
          style={styles.fullWidth}
        />
        <MyPageTabs mode={myTab} onChange={setMyTab} style={styles.fullWidth} />

        {/* ── ScreenHeader / BottomTabBar ──────────────────── */}
        <SectionTitle title="ScreenHeader / BottomTabBar" />
        <ScreenHeader title="기록 상세" rightSlot={<Text style={styles.headerAction}>⋯</Text>} style={styles.fullWidth} />
        <BottomTabBar active="add" style={styles.fullWidth} />

        <View style={styles.bottom} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex:            1,
    backgroundColor: Colors.light.bgScreen,
  },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.xl,
    paddingTop:        Spacing['2xl'],
    gap:               Spacing.md,
  },
  pageTitle: {
    ...Typography.title1,
    color: Colors.light.textPrimary,
  },
  pageSubtitle: {
    ...Typography.body2Regular,
    color:     Colors.light.textSecondary,
    marginTop: Spacing.xs,
  },
  row: {
    flexDirection: 'row',
    gap:           Spacing.lg,
    flexWrap:      'wrap',
  },
  tripListRow: {
    flexDirection: 'row',
    gap:           Spacing.md,
    paddingBottom: Spacing.sm,
  },
  hint: {
    ...Typography.captionRegular,
    color:     Colors.light.textSecondary,
    marginTop: Spacing.xs,
  },
  fullWidth: {
    width: '100%',
    alignSelf: 'stretch',
  },
  headerAction: {
    ...Typography.title2,
    color: Colors.light.textPrimary,
  },
  bottom: { height: Spacing['4xl'] },
});
