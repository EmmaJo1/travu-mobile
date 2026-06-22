import { Feather } from '@expo/vector-icons';
import { type Href, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import Text from '@/components/common/AppText';
import ScreenHeader from '@/components/nav/ScreenHeader';
import { Colors, Radius, Typography } from '@/constants/theme';
import { usePhotoImportFlow } from '@/hooks/usePhotoImportFlow';

const BACKGROUND = Colors.light.bgScreen;
const GREY_700 = '#595959';

export default function FindTripsLoading() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { status, candidates, requestAccessAndStartAnalysis, deferPhotoImportResults } =
    usePhotoImportFlow();
  const hasStartedRef = React.useRef(false);

  React.useEffect(() => {
    if (hasStartedRef.current) {
      return;
    }

    hasStartedRef.current = true;
    requestAccessAndStartAnalysis().catch(() => {
      router.replace('/photo-permission-required' as Href);
    });
  }, [requestAccessAndStartAnalysis, router]);

  React.useEffect(() => {
    if (status !== 'results_ready') {
      return;
    }

    router.replace((candidates.length > 0 ? '/detected-trips' : '/no-detected-trips') as Href);
  }, [candidates.length, router, status]);

  const handleGoHome = React.useCallback(() => {
    deferPhotoImportResults();
    router.replace('/(tabs)' as Href);
  }, [deferPhotoImportResults, router]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="dark" />
      <ScreenHeader onBackPress={() => router.back()} style={styles.header} />

      <View style={styles.centerCopy}>
        <Text style={styles.title}>사진첩에서{'\n'}여행을 찾고 있어요</Text>
        <Text style={styles.description}>
          사진의 시간과 위치를 기준으로{'\n'}여행의 순간을 정리하고 있어요
        </Text>
        <Text style={styles.statusText}>사진 1400장을 확인하는 중이에요</Text>
      </View>

      <View style={styles.progressCard}>
        <ProgressRow state="completed" label="사진 시간 정보 확인" top="16.67%" />
        <DashConnector active top="31.25%" />
        <ProgressRow state="loading" label="촬영 위치 후보 정리" top="45.42%" />
        <DashConnector active={false} top="60%" />
        <ProgressRow state="pending" label="여행 후보 만들기" top="74.17%" />
      </View>

      <Pressable
        accessibilityRole="button"
        hitSlop={8}
        onPress={handleGoHome}
        style={[styles.homeLink, { bottom: Math.max(insets.bottom + 128, 152) }]}
      >
        <Text style={styles.homeLinkText}>홈 화면으로 돌아가기</Text>
      </Pressable>

      <View style={[styles.helperRow, { bottom: Math.max(insets.bottom + 88, 112) }]}>
        <Feather name="info" size={12} color={Colors.foundation.grey400} />
        <Text style={styles.helperText}>홈으로 돌아가도 분석은 계속됩니다</Text>
      </View>
      <Text style={[styles.completeText, { bottom: Math.max(insets.bottom + 68, 92) }]}>
        완료되면 알려드릴게요
      </Text>
    </SafeAreaView>
  );
}

function ProgressRow({
  state,
  label,
  top,
}: {
  state: 'completed' | 'loading' | 'pending';
  label: string;
  top: `${number}%`;
}) {
  return (
    <View style={[styles.progressRow, { top }]}>
      <View style={styles.progressIconSlot}>
        {state === 'completed' ? (
          <View style={styles.completedIcon}>
            <Feather name="check" size={14} color={Colors.foundation.white} />
          </View>
        ) : null}
        {state === 'loading' ? <ActivityIndicator size={20} color={Colors.foundation.black} /> : null}
        {state === 'pending' ? <PendingCheckIcon /> : null}
      </View>
      <Text style={[styles.progressLabel, state === 'pending' && styles.progressLabelPending]}>
        {label}
      </Text>
    </View>
  );
}

function DashConnector({ active, top }: { active: boolean; top: `${number}%` }) {
  return (
    <View style={[styles.dashConnector, { top }]}>
      {[0, 1, 2, 3].map((dash) => (
        <View key={dash} style={[styles.dash, active ? styles.dashActive : styles.dashPending]} />
      ))}
    </View>
  );
}

function PendingCheckIcon() {
  return (
    <View style={styles.pendingIcon}>
      <View style={styles.pendingIconRing} />
      <View style={styles.pendingIconCheck} />
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
  centerCopy: {
    position: 'absolute',
    top: 127,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  title: {
    width: 230,
    ...Typography.title1,
    color: Colors.foundation.black,
    textAlign: 'center',
  },
  description: {
    width: 220,
    marginTop: 20,
    ...Typography.body1Regular,
    color: GREY_700,
    textAlign: 'center',
  },
  statusText: {
    marginTop: 88,
    ...Typography.body2Regular,
    color: Colors.foundation.grey400,
    textAlign: 'center',
  },
  progressCard: {
    position: 'absolute',
    left: '11.54%',
    right: '11.54%',
    top: '44.08%',
    bottom: '27.49%',
    borderRadius: Radius.sm,
    backgroundColor: Colors.foundation.white,
  },
  progressRow: {
    position: 'absolute',
    left: '9.33%',
    height: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 22,
  },
  progressIconSlot: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedIcon: {
    width: 20,
    height: 20,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.foundation.black,
  },
  progressLabel: {
    ...Typography.body1Emphasized,
    color: Colors.foundation.black,
  },
  progressLabelPending: {
    color: Colors.foundation.grey300,
  },
  dashConnector: {
    position: 'absolute',
    left: '12.33%',
    width: 2,
    height: '9.17%',
    gap: 2,
  },
  dash: {
    width: 2,
    height: 4,
    borderRadius: Radius.xs,
  },
  dashActive: {
    backgroundColor: Colors.foundation.black,
  },
  dashPending: {
    backgroundColor: Colors.foundation.grey400,
  },
  pendingIcon: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingIconRing: {
    width: 16.67,
    height: 16.67,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.foundation.grey300,
  },
  pendingIconCheck: {
    position: 'absolute',
    left: 6,
    top: 6.25,
    width: 8.33,
    height: 5.83,
    borderLeftWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: Colors.foundation.grey300,
    transform: [{ rotate: '-45deg' }],
  },
  homeLink: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  homeLinkText: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.grey600,
    textDecorationLine: 'underline',
  },
  helperRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  helperText: {
    ...Typography.body2Regular,
    color: Colors.foundation.grey400,
  },
  completeText: {
    position: 'absolute',
    left: 0,
    right: 0,
    ...Typography.body2Regular,
    color: Colors.foundation.grey400,
    textAlign: 'center',
  },
});
