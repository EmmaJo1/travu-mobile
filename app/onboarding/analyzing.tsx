import { Feather } from '@expo/vector-icons';
import { type Href, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import Text from '@/components/common/AppText';
import OnboardingSwipeContainer from '@/components/onboarding/OnboardingSwipeContainer';
import { Colors, Radius, Typography } from '@/constants/theme';
import { usePhotoImportFlow } from '@/hooks/usePhotoImportFlow';

const BACKGROUND = Colors.warm.white;
const GREY_700 = '#595959';
// TODO: Replace mock scanned photo count and timer with real media-library analysis progress.
const MOCK_SCANNED_PHOTO_COUNT = 1400;
const MOCK_ANALYSIS_PREVIEW_MS = 1800;

type ProgressStepState = 'completed' | 'loading' | 'pending';

export default function OnboardingAnalyzingScreen() {
  const router = useRouter();
  const { status, openPhotoImportResults } = usePhotoImportFlow();
  const [isPreviewComplete, setIsPreviewComplete] = React.useState(false);
  const isProviderComplete = status === 'results_ready' || status === 'reviewed';
  const isAnalysisComplete = isProviderComplete || isPreviewComplete;
  const timeInfoStepState: ProgressStepState = 'completed';
  const locationStepState: ProgressStepState = isAnalysisComplete ? 'completed' : 'loading';
  const candidateStepState: ProgressStepState = isAnalysisComplete ? 'completed' : 'pending';

  React.useEffect(() => {
    if (isProviderComplete) {
      return undefined;
    }

    const timer = setTimeout(() => {
      setIsPreviewComplete(true);
    }, MOCK_ANALYSIS_PREVIEW_MS);

    return () => clearTimeout(timer);
  }, [isProviderComplete]);

  React.useEffect(() => {
    if (!isAnalysisComplete) {
      return;
    }

    openPhotoImportResults();
    router.replace('/onboarding/results' as Href);
  }, [isAnalysisComplete, openPhotoImportResults, router]);

  const handleGoHome = React.useCallback(() => {
    router.replace({
      pathname: '/(tabs)',
      params: {
        photoImportPreview: 'analyzing',
      },
    } as Href);
  }, [router]);

  return (
    <OnboardingSwipeContainer currentStep="analyzing" style={styles.screen}>
      <StatusBar style="dark" />

      <View style={styles.pageIndicator}>
        {[0, 1, 2, 3].map((index) => (
          <View
            key={index}
            style={[
              styles.pageDot,
              index === 2 && styles.pageDotActive,
            ]}
          />
        ))}
      </View>

      <Text style={styles.title}>지난 여행을 찾고 있어요</Text>

      <Text style={styles.description}>
        사진의 시간과 위치를 기준으로{'\n'}
        여행의 순간을 정리하고 있어요
      </Text>

      <Text style={styles.photoCountCaption}>
        사진 {MOCK_SCANNED_PHOTO_COUNT}장을 확인하는 중이에요
      </Text>

      <View style={styles.progressCard}>
        <ProgressRow state={timeInfoStepState} label="사진 시간 정보 확인" top={40} />

        <VerticalDashConnector
          active={timeInfoStepState === 'completed'}
          top={75}
        />

        <ProgressRow
          state={locationStepState}
          label="촬영 위치 후보 정리"
          top={109}
        />

        <VerticalDashConnector
          active={locationStepState === 'completed'}
          top={144}
        />

        <ProgressRow
          state={candidateStepState}
          label="여행 후보 만들기"
          top={178}
        />
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="홈 화면 먼저 둘러보기"
        hitSlop={8}
        onPress={handleGoHome}
        style={styles.homePreviewButton}
      >
        <Text style={styles.homePreviewLabel}>홈 화면 먼저 둘러보기</Text>
      </Pressable>

      <View style={styles.helperRow}>
        <Feather name="info" size={12} color={Colors.foundation.grey400} />
        <Text style={styles.helperText}>
          홈을 둘러보는 중에도 분석은 계속됩니다
        </Text>
      </View>

      <Text style={styles.completionCaption}>완료되면 알려드릴게요</Text>
    </OnboardingSwipeContainer>
  );
}

function ProgressRow({
  state,
  label,
  top,
}: {
  state: ProgressStepState;
  label: string;
  top: number;
}) {
  return (
    <View style={[styles.progressRow, { top }]}>
      <View style={styles.progressIconSlot}>
        {state === 'completed' ? (
          <View style={styles.completedIconCircle}>
            <Feather name="check" size={14} color={Colors.foundation.white} />
          </View>
        ) : null}

        {state === 'loading' ? (
          <ActivityIndicator size={20} color={Colors.foundation.black} />
        ) : null}

        {state === 'pending' ? (
          <PendingCheckIcon />
        ) : null}
      </View>

      <Text
        style={[
          styles.progressLabel,
          state === 'pending' && styles.progressLabelPending,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

function PendingCheckIcon() {
  return (
    <View style={styles.pendingIconCircle}>
      <View style={styles.pendingIconRing} />
      <View style={styles.pendingIconCheck} />
    </View>
  );
}

function VerticalDashConnector({
  active,
  top,
}: {
  active: boolean;
  top: number;
}) {
  return (
    <View style={[styles.dashConnector, { top }]}>
      {[0, 1, 2, 3].map((dash) => (
        <View
          key={dash}
          style={[
            styles.dash,
            active ? styles.dashActive : styles.dashPending,
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  pageIndicator: {
    position: 'absolute',
    top: 88,
    left: 0,
    right: 0,
    height: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  pageDot: {
    width: 12,
    height: 12,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: '#C3C3C3',
    backgroundColor: Colors.foundation.white,
  },
  pageDotActive: {
    borderColor: Colors.foundation.black,
    backgroundColor: Colors.foundation.black,
  },
  title: {
    position: 'absolute',
    top: 181,
    left: 0,
    right: 0,
    ...Typography.title1,
    color: Colors.foundation.black,
    textAlign: 'center',
    letterSpacing: 0,
  },
  description: {
    position: 'absolute',
    top: 237,
    left: 0,
    right: 0,
    ...Typography.body1Regular,
    color: GREY_700,
    textAlign: 'center',
    letterSpacing: 0,
  },
  photoCountCaption: {
    position: 'absolute',
    top: 333,
    left: 0,
    right: 0,
    ...Typography.body2Regular,
    color: Colors.foundation.grey400,
    textAlign: 'center',
    letterSpacing: 0,
  },
  progressCard: {
    position: 'absolute',
    top: 394,
    left: 45,
    width: 300,
    height: 240,
    borderRadius: Radius.sm,
    backgroundColor: Colors.foundation.white,
  },
  progressRow: {
    position: 'absolute',
    left: 28,
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
  completedIconCircle: {
    width: 20,
    height: 20,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.foundation.black,
  },
  pendingIconCircle: {
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
  progressLabel: {
    ...Typography.body1Emphasized,
    color: Colors.foundation.black,
    letterSpacing: 0,
  },
  progressLabelPending: {
    color: Colors.foundation.grey300,
  },
  dashConnector: {
    position: 'absolute',
    left: 37,
    width: 2,
    height: 22,
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
  homePreviewButton: {
    position: 'absolute',
    top: 672,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  homePreviewLabel: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.grey600,
    textAlign: 'center',
    textDecorationLine: 'underline',
    letterSpacing: 0,
  },
  helperRow: {
    position: 'absolute',
    top: 712,
    left: 0,
    right: 0,
    height: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  helperText: {
    ...Typography.body2Regular,
    color: Colors.foundation.grey400,
    letterSpacing: 0,
  },
  completionCaption: {
    position: 'absolute',
    top: 732,
    left: 0,
    right: 0,
    ...Typography.body2Regular,
    color: Colors.foundation.grey400,
    textAlign: 'center',
    letterSpacing: 0,
  },
});
