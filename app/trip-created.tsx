import { Feather } from '@expo/vector-icons';
import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import Text from '@/components/common/AppText';
import ScreenHeader from '@/components/nav/ScreenHeader';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';

const BACKGROUND = Colors.light.bgScreen;
const CTA_HEIGHT = 48;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatDateLabel(startDate?: string, endDate?: string) {
  if (!startDate || !endDate) return '';

  const start = startDate.split('-').map(Number);
  const end = endDate.split('-').map(Number);
  if (startDate === endDate) return `${start[0]}. ${start[1]}. ${start[2]}`;
  return `${start[0]}. ${start[1]}. ${start[2]} - ${end[1]}. ${end[2]}`;
}

export default function TripCreatedScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const destinationLabel = firstParam(params.destinationLabel) ?? '선택한 여행지';
  const tripId = firstParam(params.tripId);
  const dateLabel = formatDateLabel(firstParam(params.startDate), firstParam(params.endDate));
  const ctaBottom = Math.max(insets.bottom + 32, 64);
  const homeLinkBottom = ctaBottom + CTA_HEIGHT + Spacing['2xl'];

  const handleGoHome = React.useCallback(() => {
    router.replace('/(tabs)' as Href);
  }, [router]);

  const handleOpenTrip = React.useCallback(() => {
    router.replace({
      pathname: '/day-archive-detail',
      params: {
        tripId: tripId ?? `manual-${Date.now()}`,
        entryPoint: 'manualCreate',
      },
    } as Href);
  }, [router, tripId]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="dark" />
      <ScreenHeader
        title="여행 만들기"
        onBackPress={handleGoHome}
        rightSlot={
          <Pressable
            accessibilityLabel="홈으로 이동하기"
            accessibilityRole="button"
            hitSlop={8}
            onPress={handleGoHome}
            style={styles.headerCloseButton}
          >
            <Feather name="x" size={24} color={Colors.foundation.black} />
          </Pressable>
        }
        style={styles.header}
      />

      <View style={styles.center}>
        <View style={styles.iconCircle}>
          <Feather name="check" size={32} color={Colors.foundation.white} />
        </View>
        <Text style={styles.title}>여행을 만들었어요</Text>
        <Text style={styles.description}>선택한 여행지와 기간으로{'\n'}여행 기록을 정리할 수 있어요</Text>

        <View style={styles.summaryCard}>
          <SummaryRow label="여행지" value={destinationLabel} />
          <View style={styles.divider} />
          <SummaryRow label="여행 기간" value={dateLabel} />
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={handleGoHome}
        style={({ pressed }) => [
          styles.homeLinkButton,
          { bottom: homeLinkBottom },
          pressed && styles.homeLinkPressed,
        ]}
      >
        <Text style={styles.homeLinkText}>홈으로 이동하기</Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        onPress={handleOpenTrip}
        style={({ pressed }) => [styles.cta, { bottom: ctaBottom }, pressed && styles.ctaPressed]}
      >
        <Text style={styles.ctaLabel}>여행 기록하기</Text>
      </Pressable>
    </SafeAreaView>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  header: {
    height: 44,
  },
  headerCloseButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    position: 'absolute',
    top: 210,
    left: Spacing.xl,
    right: Spacing.xl,
    alignItems: 'center',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.foundation.black,
  },
  title: {
    marginTop: Spacing['4xl'],
    ...Typography.title1,
    color: Colors.foundation.black,
    textAlign: 'center',
  },
  description: {
    width: 230,
    marginTop: Spacing['2xl'],
    ...Typography.body2Regular,
    color: Colors.foundation.grey600,
    textAlign: 'center',
  },
  summaryCard: {
    width: 320,
    marginTop: Spacing['4xl'],
    borderRadius: Radius.sm,
    backgroundColor: Colors.foundation.white,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  summaryRow: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.lg,
  },
  summaryLabel: {
    ...Typography.body2Regular,
    color: Colors.foundation.grey600,
  },
  summaryValue: {
    flex: 1,
    ...Typography.body2Emphasized,
    color: Colors.foundation.black,
    textAlign: 'right',
  },
  divider: {
    height: 1,
    marginVertical: Spacing.sm,
    backgroundColor: Colors.foundation.grey100,
  },
  cta: {
    position: 'absolute',
    left: 35,
    right: 35,
    height: CTA_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.sm,
    backgroundColor: Colors.foundation.black,
  },
  ctaPressed: {
    opacity: 0.84,
  },
  ctaLabel: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.white,
  },
  homeLinkButton: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: Typography.body2Emphasized.lineHeight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeLinkPressed: {
    opacity: 0.64,
  },
  homeLinkText: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.grey600,
    textDecorationLine: 'underline',
  },
});
