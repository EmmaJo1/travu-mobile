/**
 * button-test
 *
 * AuthActionButton / SheetActionButton / PrimaryButton 시각 검수용 테스트 화면
 * 라우트: /button-test
 */
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Text from '@/components/common/AppText';

import { SafeAreaView } from 'react-native-safe-area-context';

import AuthActionButton from '@/components/common/AuthActionButton';
import PrimaryButton from '@/components/common/PrimaryButton';
import SheetActionButton from '@/components/common/SheetActionButton';
import { Colors, Typography } from '@/constants/theme';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowContent}>{children}</View>
    </View>
  );
}

export default function ButtonTestScreen() {
  const [loading, setLoading] = useState(false);

  function simulateLoad() {
    setLoading(true);
    setTimeout(() => setLoading(false), 1500);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.pageTitle}>Button 시각 검수</Text>
        <Text style={styles.pageSubtitle}>body2 + 중앙 정렬 수정 확인</Text>

        {/* ── AuthActionButton ─────────────────────── */}
        <Section title="AuthActionButton">
          <Row label="state=on (기본)">
            <AuthActionButton label="카카오로 시작하기" onPress={() => {}} />
          </Row>
          <Row label="state=off (보조)">
            <AuthActionButton label="이메일로 로그인" onPress={() => {}} state="off" />
          </Row>
          <Row label="state=on / loading">
            <AuthActionButton label="로딩 중..." onPress={simulateLoad} loading={loading} />
          </Row>
        </Section>

        {/* ── SheetActionButton ────────────────────── */}
        <Section title="SheetActionButton">
          <Row label="active=true">
            <SheetActionButton label="여행 기록 시작하기" onPress={() => {}} />
          </Row>
          <Row label="active=false">
            <SheetActionButton label="나중에 하기" onPress={() => {}} active={false} />
          </Row>
          <Row label="active=true / loading">
            <SheetActionButton label="저장 중..." onPress={simulateLoad} loading={loading} />
          </Row>
        </Section>

        {/* ── PrimaryButton ────────────────────────── */}
        <Section title="PrimaryButton  (paddingV 4→6)">
          <Row label="active=true">
            <PrimaryButton label="저장" onPress={() => {}} />
          </Row>
          <Row label="active=false">
            <PrimaryButton label="저장" onPress={() => {}} active={false} />
          </Row>
          <Row label="active=true / loading">
            <PrimaryButton label="저장" onPress={simulateLoad} loading={loading} />
          </Row>
          <Row label="긴 라벨">
            <PrimaryButton label="장소 추가하기" onPress={() => {}} />
          </Row>
        </Section>

        {/* ── 나란히 비교 ──────────────────────────── */}
        <Section title="나란히 비교 (정렬 기준선 확인)">
          <View style={styles.alignRow}>
            <View style={styles.alignGuide} />
            <PrimaryButton label="저장" onPress={() => {}} />
            <PrimaryButton label="취소" onPress={() => {}} active={false} />
          </View>
          <View style={[styles.alignRow, { marginTop: 12 }]}>
            <AuthActionButton label="계속하기" onPress={() => {}} style={styles.half} />
            <AuthActionButton label="건너뛰기" onPress={() => {}} state="off" style={styles.half} />
          </View>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.warm.white,
  },
  container: {
    padding: 20,
    gap: 24,
    paddingBottom: 60,
  },
  pageTitle: {
    ...Typography.title2,
    color: Colors.foundation.black,
  },
  pageSubtitle: {
    ...Typography.body2Regular,
    color: Colors.light.textSecondary,
    marginTop: 4,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.grey800,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.warm.beige,
  },
  sectionBody: {
    gap: 10,
  },
  row: {
    gap: 6,
  },
  rowLabel: {
    ...Typography.captionRegular,
    color: Colors.light.textSecondary,
  },
  rowContent: {
    alignItems: 'flex-start',
  },
  alignRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    position: 'relative',
  },
  alignGuide: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#FF5A5A',
    opacity: 0.35,
  },
  half: {
    flex: 1,
  },
});
