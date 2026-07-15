import { Feather } from '@expo/vector-icons';
import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import Text from '@/components/common/AppText';
import ScreenHeader from '@/components/nav/ScreenHeader';
import PhotoAnalysisProgressSection from '@/components/photo-import/PhotoAnalysisProgressSection';
import { PHOTO_ANALYSIS_LOADING_LAYOUT } from '@/components/photo-import/photo-analysis-loading-layout';
import { Colors, Radius, Typography } from '@/constants/theme';
import { usePhotoImportFlow } from '@/hooks/usePhotoImportFlow';
import type { PhotoImportDetectionState } from '@/services/photoImport/types';

const BACKGROUND = Colors.light.bgScreen;
const GREY_700 = '#595959';

export default function FindTripsLoading() {
  const router = useRouter();
  const params = useLocalSearchParams<{ skipLivingArea?: string; source?: string }>();
  const insets = useSafeAreaInsets();
  const {
    detectionState,
    errorMessage,
    progress,
    scanProgress,
    runPhotoImportDetection,
    deferPhotoImportResults,
  } = usePhotoImportFlow();
  const hasStartedRef = React.useRef(false);
  const activeRequestIdRef = React.useRef(0);

  const routeDetectionResult = React.useCallback(
    (result: PhotoImportDetectionState) => {
      if (result === 'success') {
        router.replace('/detected-trips' as Href);
        return;
      }

      if (result === 'empty') {
        router.replace('/no-detected-trips' as Href);
        return;
      }

      if (result === 'permissionDenied') {
        router.replace('/photo-permission-required' as Href);
      }
    },
    [router],
  );

  const startDetection = React.useCallback(() => {
    hasStartedRef.current = true;
    const requestId = activeRequestIdRef.current + 1;
    activeRequestIdRef.current = requestId;
    const rawSkipLivingAreaParam = params.skipLivingArea;
    const rawSourceParam = params.source;
    const skipLivingArea = rawSkipLivingAreaParam === 'true';
    const source = rawSourceParam === 'onboarding' ? 'onboarding' : 'home';

    if (__DEV__) {
      console.info('[photo-import loading] fresh scan requested', {
        photoScanFreshAttemptRequested: true,
        rawSkipLivingAreaParam,
        rawSourceParam,
        requestId,
        resolvedSource: source,
        skipLivingArea,
      });
    }

    runPhotoImportDetection({
      homeRegionFilterSkipReason: skipLivingArea ? 'skipped_by_user' : undefined,
      livingArea: skipLivingArea ? null : undefined,
      source,
    })
      .then((result) => {
        if (activeRequestIdRef.current !== requestId) {
          return;
        }

        routeDetectionResult(result);
      })
      .catch(() => undefined);
  }, [params.skipLivingArea, params.source, routeDetectionResult, runPhotoImportDetection]);

  React.useEffect(() => {
    if (hasStartedRef.current) {
      return;
    }

    startDetection();
  }, [startDetection]);

  const handleRetry = React.useCallback(() => {
    startDetection();
  }, [startDetection]);

  const handleGoHome = React.useCallback(() => {
    activeRequestIdRef.current += 1;
    deferPhotoImportResults();
    router.replace('/(tabs)' as Href);
  }, [deferPhotoImportResults, router]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="dark" />
      <ScreenHeader onBackPress={() => router.back()} style={styles.header} />

      {detectionState === 'error' ? (
        <View style={styles.errorState}>
          <Feather name="alert-circle" size={44} color={Colors.foundation.black} />
          <Text style={styles.errorTitle}>여행을 찾지 못했어요</Text>
          <Text style={styles.errorDescription}>
            {errorMessage ? '사진 분석 중 문제가 발생했어요.' : '잠시 후 다시 시도해주세요.'}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={handleRetry}
            style={({ pressed }) => [styles.retryButton, pressed && styles.buttonPressed]}
          >
            <Text style={styles.retryButtonText}>다시 시도</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <View style={styles.loadingContent}>
            <Text style={styles.title}>사진첩에서{`\n`}여행을 찾고 있어요</Text>
            <Text style={styles.description}>
              사진의 시간과 위치를 기준으로{`\n`}여행을 정리하고 있어요
            </Text>
            <View style={styles.analysisProgressSection}>
              <PhotoAnalysisProgressSection
                progress={progress}
                scannedAssetCount={scanProgress?.scannedAssetCount}
                totalAssetCount={scanProgress?.totalAssetCount}
              />
            </View>
          </View>

          <View
            style={[
              styles.helperRow,
              { bottom: Math.max(insets.bottom + 88, PHOTO_ANALYSIS_LOADING_LAYOUT.helperBottom) },
            ]}
          >
            <Feather name="info" size={12} color={Colors.foundation.grey400} />
            <Text style={styles.helperText}>홈으로 돌아가도 분석은 계속됩니다</Text>
          </View>
          <Text
            style={[
              styles.completeText,
              { bottom: Math.max(insets.bottom + 68, PHOTO_ANALYSIS_LOADING_LAYOUT.completionBottom) },
            ]}
          >
            완료되면 알려드릴게요
          </Text>
        </>
      )}

      <Pressable
        accessibilityRole="button"
        hitSlop={8}
        onPress={handleGoHome}
        style={[
          styles.homeLink,
          { bottom: Math.max(insets.bottom + 128, PHOTO_ANALYSIS_LOADING_LAYOUT.homeLinkBottom) },
        ]}
      >
        <Text style={styles.homeLinkText}>홈 화면으로 돌아가기</Text>
      </Pressable>
    </SafeAreaView>
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
  loadingContent: {
    ...StyleSheet.absoluteFillObject,
  },
  title: {
    position: 'absolute',
    top: PHOTO_ANALYSIS_LOADING_LAYOUT.titleTop - 48,
    left: 0,
    right: 0,
    ...Typography.title1,
    color: Colors.foundation.black,
    textAlign: 'center',
  },
  description: {
    position: 'absolute',
    top: PHOTO_ANALYSIS_LOADING_LAYOUT.descriptionTop,
    left: 0,
    right: 0,
    ...Typography.body1Regular,
    color: GREY_700,
    textAlign: 'center',
  },
  analysisProgressSection: {
    position: 'absolute',
    top: PHOTO_ANALYSIS_LOADING_LAYOUT.progressTop,
    left: 0,
    right: 0,
    alignItems: 'center',
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
  errorState: {
    position: 'absolute',
    top: 228,
    left: 35,
    right: 35,
    alignItems: 'center',
  },
  errorTitle: {
    marginTop: 28,
    ...Typography.title2,
    color: Colors.foundation.black,
    textAlign: 'center',
  },
  errorDescription: {
    marginTop: 10,
    ...Typography.body2Regular,
    color: GREY_700,
    textAlign: 'center',
  },
  retryButton: {
    width: '100%',
    height: 48,
    marginTop: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.sm,
    backgroundColor: Colors.foundation.black,
  },
  retryButtonText: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.white,
  },
  buttonPressed: {
    opacity: 0.84,
  },
});
