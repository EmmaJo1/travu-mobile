import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { type Href, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type DimensionValue,
  type GestureResponderEvent,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Text from '@/components/common/AppText';
import { FIGMA_IMAGES } from '@/constants/figmaImages';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { usePhotoImportFlow } from '@/hooks/usePhotoImportFlow';
import type { PhotoImportTripCandidate } from '@/services/photoImport/types';

const STEPS = ['intro', 'photo-library', 'analyzing', 'results'] as const;
export type OnboardingStepKey = (typeof STEPS)[number];

const SWIPE_WIDTH_RATIO = 0.28;
const VELOCITY_THRESHOLD = 700;
const EDGE_RESISTANCE = 0.32;
const PAGE_MAX_WIDTH = 430;
const DESIGN_WIDTH = 390;
const DESIGN_HEIGHT = 844;
const MOCK_ANALYSIS_PREVIEW_MS = 1800;
const MOCK_SAVE_DELAY_MS = 650;
const BACKGROUND = Colors.warm.white;
const GREY_200 = '#C3C3C3';
const GREY_700 = '#595959';
const GREY_900 = '#353535';
const BUTTON_UNSELECTED_BG = '#C5C5C5';
const TIMING_CONFIG = {
  duration: 320,
  easing: Easing.out(Easing.cubic),
};

interface OnboardingPagerProps {
  initialStep?: OnboardingStepKey;
}

export default function OnboardingPager({ initialStep = 'intro' }: OnboardingPagerProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const pageWidth = Math.min(windowWidth, PAGE_MAX_WIDTH);
  const {
    candidates,
    selectedCandidateIds,
    toggleCandidate,
    openPhotoImportResults,
    deferPhotoImportResults,
    startPhotoImportAnalysis,
    saveSelectedPhotoImportResults,
    skipOnboarding,
  } = usePhotoImportFlow();
  const initialIndex = Math.max(0, STEPS.indexOf(initialStep));
  const [currentPage, setCurrentPage] = React.useState(initialIndex);
  const [isSaving, setIsSaving] = React.useState(false);
  const hasAutoAdvancedRef = React.useRef(false);
  const translateX = useSharedValue(-initialIndex * pageWidth);
  const currentIndex = useSharedValue(initialIndex);
  const selectedCount = selectedCandidateIds.length;
  const canSave = selectedCount > 0;

  const animateToPage = React.useCallback(
    (targetIndex: number) => {
      const clampedIndex = Math.max(0, Math.min(STEPS.length - 1, targetIndex));

      translateX.value = withTiming(-clampedIndex * pageWidth, TIMING_CONFIG, (finished) => {
        if (finished) {
          currentIndex.value = clampedIndex;
          runOnJS(setCurrentPage)(clampedIndex);
        }
      });
    },
    [currentIndex, pageWidth, translateX],
  );

  React.useEffect(() => {
    translateX.value = -currentIndex.value * pageWidth;
  }, [currentIndex, pageWidth, translateX]);

  React.useEffect(() => {
    if (currentPage !== 2 || hasAutoAdvancedRef.current) {
      return undefined;
    }

    const timer = setTimeout(() => {
      if (currentIndex.value !== 2 || hasAutoAdvancedRef.current) {
        return;
      }

      hasAutoAdvancedRef.current = true;
      openPhotoImportResults();
      animateToPage(3);
    }, MOCK_ANALYSIS_PREVIEW_MS);

    return () => clearTimeout(timer);
  }, [animateToPage, currentIndex, currentPage, openPhotoImportResults]);

  React.useEffect(() => {
    if (currentPage === 3) {
      openPhotoImportResults();
    }
  }, [currentPage, openPhotoImportResults]);

  const handleConnectPhotoLibrary = React.useCallback(() => {
    // TODO: Restore requestAccessAndStartAnalysis() after the real permission flow is connected.
    animateToPage(2);
  }, [animateToPage]);

  const handleSkip = React.useCallback(async () => {
    await skipOnboarding();
    router.replace('/(tabs)' as Href);
  }, [router, skipOnboarding]);

  const handleGoHome = React.useCallback(() => {
    startPhotoImportAnalysis();
    deferPhotoImportResults();
    router.replace('/(tabs)' as Href);
  }, [deferPhotoImportResults, router, startPhotoImportAnalysis]);

  const handleDeferResults = React.useCallback(() => {
    if (isSaving) {
      return;
    }

    deferPhotoImportResults();
    router.replace('/(tabs)' as Href);
  }, [deferPhotoImportResults, isSaving, router]);

  const handleSave = React.useCallback(async () => {
    if (!canSave || isSaving) {
      return;
    }

    setIsSaving(true);

    try {
      await Promise.all([
        saveSelectedPhotoImportResults(selectedCandidateIds),
        wait(MOCK_SAVE_DELAY_MS),
      ]);
      router.replace('/(tabs)' as Href);
    } catch {
      setIsSaving(false);
    }
  }, [canSave, isSaving, router, saveSelectedPhotoImportResults, selectedCandidateIds]);

  const panGesture = React.useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-10, 10])
        .failOffsetY([-12, 12])
        .onUpdate((event) => {
          const index = currentIndex.value;
          const canSwipeLeft = index === 0;
          const canSwipeRight = index === 1;
          const isSwipingLeft = event.translationX < 0;
          const isSwipingRight = event.translationX > 0;

          if (index >= 2) {
            translateX.value = -index * pageWidth;
            return;
          }

          const isBlockedLeftSwipe = isSwipingLeft && !canSwipeLeft;
          const isBlockedRightSwipe = isSwipingRight && !canSwipeRight;
          const adjustedTranslationX =
            isBlockedLeftSwipe || isBlockedRightSwipe
              ? event.translationX * EDGE_RESISTANCE
              : event.translationX;

          translateX.value = -index * pageWidth + adjustedTranslationX;
        })
        .onEnd((event) => {
          const index = currentIndex.value;
          const swipeThreshold = pageWidth * SWIPE_WIDTH_RATIO;
          const didSwipeLeft =
            event.translationX < -swipeThreshold || event.velocityX < -VELOCITY_THRESHOLD;
          const didSwipeRight =
            event.translationX > swipeThreshold || event.velocityX > VELOCITY_THRESHOLD;
          let targetIndex = index;

          if (index === 0 && didSwipeLeft) {
            targetIndex = 1;
          } else if (index === 1 && didSwipeRight) {
            targetIndex = 0;
          }

          runOnJS(animateToPage)(targetIndex);
        })
        .onFinalize((_event, success) => {
          if (!success) {
            translateX.value = withTiming(-currentIndex.value * pageWidth, TIMING_CONFIG);
          }
        }),
    [animateToPage, currentIndex, pageWidth, translateX],
  );

  const animatedStripStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const pages = React.useMemo(
    () => [
      <IntroPage key="intro" bottomInset={insets.bottom} onNext={() => animateToPage(1)} />,
      <PhotoLibraryPage
        key="photo-library"
        bottomInset={insets.bottom}
        onConnect={handleConnectPhotoLibrary}
        onSkip={handleSkip}
      />,
      <AnalyzingPage key="analyzing" onGoHome={handleGoHome} />,
      <ResultsPage
        key="results"
        candidates={candidates}
        selectedCandidateIds={selectedCandidateIds}
        isSaving={isSaving}
        onToggleCandidate={toggleCandidate}
        bottomInset={insets.bottom}
        onSave={handleSave}
        onSkip={handleDeferResults}
      />,
    ],
    [
      candidates,
      handleConnectPhotoLibrary,
      handleDeferResults,
      handleGoHome,
      handleSave,
      handleSkip,
      insets.bottom,
      isSaving,
      selectedCandidateIds,
      animateToPage,
      toggleCandidate,
    ],
  );

  return (
    <View style={styles.root}>
      <View style={[styles.mobileFrame, { width: pageWidth }]}>
        <StatusBar style="dark" />
        <PageIndicator activeIndex={currentPage} />

        <GestureDetector gesture={panGesture}>
          <View style={styles.pageViewport}>
            <Animated.View
              style={[
                styles.pagesStrip,
                animatedStripStyle,
                { width: pageWidth * pages.length },
              ]}
            >
              {pages.map((page, index) => (
                <AnimatedPageFrame
                  key={STEPS[index]}
                  index={index}
                  pageWidth={pageWidth}
                  translateX={translateX}
              >
                  {page}
                </AnimatedPageFrame>
              ))}
            </Animated.View>
          </View>
        </GestureDetector>
      </View>
    </View>
  );
}

function AnimatedPageFrame({
  children,
  index,
  pageWidth,
  translateX,
}: {
  children: React.ReactNode;
  index: number;
  pageWidth: number;
  translateX: SharedValue<number>;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const pageCenterOffset = translateX.value + index * pageWidth;
    const distanceRatio = Math.min(Math.abs(pageCenterOffset) / pageWidth, 1);

    return {
      opacity: 1 - distanceRatio * 0.06,
      transform: [{ scale: 1 - distanceRatio * 0.01 }],
    };
  });

  return (
    <Animated.View
      style={[
        styles.pageWrapper,
        animatedStyle,
        {
          width: pageWidth,
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

function IntroPage({ bottomInset, onNext }: { bottomInset: number; onNext: () => void }) {
  const { height } = useWindowDimensions();
  const heroTop = Math.round(clamp(height * 0.34, 270, 310));
  const buttonBottom = Math.max(bottomInset + 10, 44);

  return (
    <View style={styles.page}>
      <View
        pointerEvents="none"
        style={[styles.heroImageContainer, { top: heroTop }]}
      >
        <Image
          source={FIGMA_IMAGES.onboarding.firstFlight}
          style={styles.heroImage}
          resizeMode="cover"
        />
        <LinearGradient
          pointerEvents="none"
          colors={[
            'rgba(249, 245, 243, 1)',
            'rgba(249, 245, 243, 0.94)',
            'rgba(249, 245, 243, 0.86)',
            'rgba(249, 245, 243, 0.70)',
            'rgba(249, 245, 243, 0.54)',
            'rgba(249, 245, 243, 0.36)',
            'rgba(249, 245, 243, 0.18)',
            'rgba(249, 245, 243, 0)',
          ]}
          locations={[0.1153, 0.151, 0.1776, 0.217, 0.2447, 0.2816, 0.3278, 0.3911]}
          start={{ x: 0.38, y: 0 }}
          end={{ x: 0.62, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <LinearGradient
          pointerEvents="none"
          colors={[
            'rgba(0, 0, 0, 0)',
            'rgba(0, 0, 0, 0.16)',
          ]}
          locations={[0.45, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      </View>

      <View style={styles.contentLayer}>
        <View style={styles.introCopyBlock}>
          <Text style={styles.introTitle}>여행의 순간을{'\n'}자동으로 정리해 드려요</Text>
          <Text style={styles.introDescription}>
            사진을 찍기만 해도 시간과 장소를{'\n'}기준으로 여행 기록이 완성돼요
          </Text>
        </View>
        <GlassNextButton bottom={buttonBottom} onPress={onNext} />
      </View>
    </View>
  );
}

function PhotoLibraryPage({
  bottomInset,
  onConnect,
  onSkip,
}: {
  bottomInset: number;
  onConnect: () => void;
  onSkip: () => void;
}) {
  const { width: windowWidth, height: pageHeight } = useWindowDimensions();
  const pageWidth = Math.min(windowWidth, PAGE_MAX_WIDTH);
  const layoutScale = Math.min(pageWidth / DESIGN_WIDTH, pageHeight / DESIGN_HEIGHT, 1);
  const bottomOffset = Math.max(bottomInset + 28, 36 * layoutScale);
  const helperBottom = bottomOffset;
  const skipBottom = bottomOffset + 24 * layoutScale;
  const primaryBottom = bottomOffset + 60 * layoutScale;
  const mainCardTop = ((DESIGN_HEIGHT - 314) / 2 + 70) * layoutScale;

  return (
    <View style={styles.page}>
      <View style={styles.contentLayer}>
        <View
          style={[
            styles.photoCopyBlock,
            {
              top: 145 * layoutScale,
              left: 20 * layoutScale,
              right: 20 * layoutScale,
            },
          ]}
        >
          <Text
            style={[
              styles.photoTitle,
              { width: Math.min(260 * layoutScale, pageWidth - 40 * layoutScale) },
            ]}
          >
            지난 여행도{'\n'}다시 꺼내 볼까요?
          </Text>
          <Text
            style={[
              styles.photoDescription,
              { maxWidth: Math.min(301 * layoutScale, pageWidth - 40 * layoutScale) },
            ]}
          >
            사진첩을 연결하면 촬영 시간과 위치를 기준으로{'\n'}지난 여행의 순간을 찾아드려요
          </Text>
        </View>

        <View pointerEvents="none" style={styles.polaroidStage}>
          <BackgroundPolaroidCard
            coverImage={FIGMA_IMAGES.archive.photoFrame}
            thumbnails={FIGMA_IMAGES.record.portugal.dayThumbnails}
            scale={layoutScale}
            style={[
              styles.leftBackCard,
              {
                left: -86 * layoutScale,
                top: 352 * layoutScale,
              },
            ]}
            variant="left"
          />
          <BackgroundPolaroidCard
            coverImage={FIGMA_IMAGES.home.heroParis}
            thumbnails={FIGMA_IMAGES.record.kyoto.dayThumbnails}
            scale={layoutScale}
            style={[
              styles.rightBackCard,
              {
                left: 245.55 * layoutScale,
                top: 355 * layoutScale,
              },
            ]}
            variant="right"
          />
          <PhotoMemoryCard
            coverImage={FIGMA_IMAGES.record.sydney.cover}
            thumbnails={FIGMA_IMAGES.record.sydney.dayThumbnails}
            scale={layoutScale}
            style={[
              styles.mainCard,
              {
                left: (pageWidth - 227 * layoutScale) / 2,
                top: mainCardTop,
                marginLeft: 0,
              },
            ]}
          />
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="사진첩 연결하기"
          onPress={onConnect}
          style={({ pressed }) => [
            styles.connectButton,
            {
              left: 35 * layoutScale,
              right: 35 * layoutScale,
              bottom: primaryBottom,
            },
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.connectButtonLabel}>사진첩 연결하기</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="나중에 할게요"
          hitSlop={8}
          onPress={onSkip}
          style={[styles.photoSkipButton, { bottom: skipBottom }]}
        >
          <Text style={styles.skipLabel}>나중에 할게요</Text>
        </Pressable>

        <View style={[styles.photoHelperRow, { bottom: helperBottom }]}>
          <Feather name="info" size={12} color={Colors.foundation.grey400} />
          <Text style={styles.helperText}>언제든 추가할 수 있어요</Text>
        </View>
      </View>
    </View>
  );
}

function AnalyzingPage({ onGoHome }: { onGoHome: () => void }) {
  return (
    <View style={styles.page}>
      <Text style={styles.analyzingTitle}>지난 여행을 찾고 있어요</Text>
      <Text style={styles.analyzingDescription}>
        사진의 시간과 위치를 기준으로{'\n'}여행의 순간을 정리하고 있어요
      </Text>
      <Text style={styles.photoCountCaption}>사진 1400장을 확인하는 중이에요</Text>

      <View style={styles.progressCard}>
        <ProgressRow state="completed" label="사진 시간 정보 확인" top="16.67%" />
        <VerticalDashConnector active top="31.25%" />
        <ProgressRow state="loading" label="촬영 위치 후보 정리" top="45.42%" />
        <VerticalDashConnector active={false} top="60%" />
        <ProgressRow state="pending" label="여행 후보 만들기" top="74.17%" />
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="홈 화면 먼저 둘러보기"
        hitSlop={8}
        onPress={onGoHome}
        style={styles.homePreviewButton}
      >
        <Text style={styles.homePreviewLabel}>홈 화면 먼저 둘러보기</Text>
      </Pressable>
      <View style={styles.analyzingHelperRow}>
        <Feather name="info" size={12} color={Colors.foundation.grey400} />
        <Text style={styles.analyzingHelperText}>홈을 둘러보는 중에도 분석은 계속됩니다</Text>
      </View>
      <Text style={styles.completionCaption}>완료되면 알려드릴게요</Text>
    </View>
  );
}

function ResultsPage({
  candidates,
  selectedCandidateIds,
  isSaving,
  onToggleCandidate,
  bottomInset,
  onSave,
  onSkip,
}: {
  candidates: PhotoImportTripCandidate[];
  selectedCandidateIds: string[];
  isSaving: boolean;
  onToggleCandidate: (id: string) => void;
  bottomInset: number;
  onSave: () => void;
  onSkip: () => void;
}) {
  const router = useRouter();
  const selectedCount = selectedCandidateIds.length;
  const canSave = selectedCount > 0;
  const helperBottom = Math.max(bottomInset + 2, 22);
  const skipBottom = helperBottom + 28;
  const primaryBottom = skipBottom + 42;
  const listBottom = primaryBottom + 48 + Spacing.lg;

  const handleOpenCandidate = React.useCallback(
    (candidateId: string) => {
      router.push({
        pathname: '/record-day-detail',
        params: {
          tripId: candidateId,
          dayId: `${candidateId}-day-1`,
          entryPoint: 'onboarding',
        },
      } as Href);
    },
    [router],
  );

  return (
    <View style={styles.page}>
      <Text style={styles.resultsTitle}>지난 여행을 찾았어요</Text>
      <Text style={styles.resultsDescription}>
        사진첩에서 발견한 여행을 확인하고{'\n'}내 여행에 저장해보세요
      </Text>
      <Text style={styles.countLabel}>
        총 <Text style={styles.countLabelNumber}>{candidates.length}</Text>개의 여행 후보
      </Text>

      <ScrollView
        style={[styles.listViewport, { bottom: listBottom }]}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {candidates.map((candidate) => (
          <ResultTripCard
            key={candidate.id}
            city={candidate.city}
            country={candidate.country}
            dateRange={candidate.dateRange}
            photoCount={candidate.photoCount}
            image={candidate.image}
            selected={selectedCandidateIds.includes(candidate.id)}
            disabled={isSaving}
            onPress={() => handleOpenCandidate(candidate.id)}
            onToggle={() => onToggleCandidate(candidate.id)}
          />
        ))}
      </ScrollView>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`선택한 여행 ${selectedCount}개 저장하기`}
        disabled={!canSave || isSaving}
        onPress={onSave}
        style={({ pressed }) => [
          styles.connectButton,
          styles.primaryButton,
          canSave && styles.primaryButtonActive,
          isSaving && styles.primaryButtonSaving,
          { bottom: primaryBottom },
          pressed && styles.buttonPressed,
        ]}
      >
        {isSaving ? (
          <View style={styles.savingButtonContent}>
            <ActivityIndicator size="small" color={GREY_700} />
            <Text style={[styles.primaryButtonLabel, styles.primaryButtonLabelSaving]}>
              저장하는 중...
            </Text>
          </View>
        ) : (
          <Text
            style={[
              styles.connectButtonLabel,
              styles.primaryButtonLabel,
              canSave && styles.primaryButtonLabelActive,
            ]}
          >
            선택한 여행 {selectedCount}개 저장하기
          </Text>
        )}
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="나중에 할게요"
        disabled={isSaving}
        hitSlop={8}
        onPress={onSkip}
        style={[styles.photoSkipButton, { bottom: skipBottom }]}
      >
        <Text style={styles.skipLabel}>나중에 할게요</Text>
      </Pressable>

      <View style={[styles.photoHelperRow, { bottom: helperBottom }]}>
        <Feather name="info" size={12} color={Colors.foundation.grey400} />
        <Text style={styles.helperText}>언제든 홈화면 내에서 추가할 수 있어요</Text>
      </View>
    </View>
  );
}

function PageIndicator({ activeIndex }: { activeIndex: number }) {
  return (
    <View pointerEvents="none" style={styles.pageIndicator}>
      {[0, 1, 2, 3].map((index) => (
        <View
          key={index}
          style={[styles.pageDot, index === activeIndex && styles.pageDotActive]}
        />
      ))}
    </View>
  );
}

function GlassNextButton({ bottom, onPress }: { bottom: number; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="다음"
      onPress={onPress}
      style={({ pressed }) => [styles.nextButton, { bottom }, pressed && styles.buttonPressed]}
    >
      <BlurView pointerEvents="none" intensity={14} tint="light" style={StyleSheet.absoluteFillObject} />
      <View pointerEvents="none" style={styles.nextButtonGlassFill} />
      <LinearGradient
        pointerEvents="none"
        colors={[
          'rgba(255, 255, 255, 0.68)',
          'rgba(255, 255, 255, 0.18)',
          'rgba(255, 255, 255, 0.04)',
        ]}
        locations={[0, 0.42, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <View pointerEvents="none" style={styles.nextButtonInnerBorder} />
      <Text style={styles.nextButtonLabel}>다음</Text>
    </Pressable>
  );
}

function PhotoMemoryCard({
  coverImage,
  thumbnails,
  scale = 1,
  style,
}: {
  coverImage: ImageSourcePropType;
  thumbnails: ImageSourcePropType[];
  scale?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.polaroidCard, { width: 227 * scale, height: 314 * scale }, style]}>
      <View
        style={[
          styles.mainImageWrap,
          {
            left: 14 * scale,
            right: 13 * scale,
            top: 17 * scale,
            height: 230 * scale,
          },
        ]}
      >
        <Image source={coverImage} style={styles.cardImage} resizeMode="cover" />
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(0, 0, 0, 0)', 'rgba(51, 51, 51, 0.18)', 'rgba(51, 51, 51, 0.70)']}
          locations={[0.68, 0.84, 1]}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={[styles.mainCardCopy, { left: 11 * scale, bottom: 12 * scale }]}>
          <Text style={styles.mainCardCity}>시드니</Text>
          <Text style={styles.mainCardMeta}>2025.3.5-3.15</Text>
          <Text style={styles.mainCardPhotoCount}>743 photos</Text>
        </View>
      </View>
      <View
        style={[
          styles.thumbnailRow,
          {
            left: 17 * scale,
            right: 17 * scale,
            bottom: 20 * scale,
          },
        ]}
      >
        {thumbnails.slice(0, 5).map((thumbnail, index) => (
          <Image
            key={index}
            source={thumbnail}
            style={[styles.thumbnail, { width: 34 * scale, height: 36 * scale }]}
            resizeMode="cover"
          />
        ))}
      </View>
    </View>
  );
}

function BackgroundPolaroidCard({
  variant,
  coverImage,
  thumbnails,
  scale = 1,
  style,
}: {
  variant: 'left' | 'right';
  coverImage: ImageSourcePropType;
  thumbnails: ImageSourcePropType[];
  scale?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const cardImageStyle =
    variant === 'right' ? styles.rightBackgroundCardImage : styles.leftBackgroundCardImage;
  const thumbnailStyles =
    variant === 'right' ? RIGHT_BACKGROUND_THUMBNAIL_STYLES : LEFT_BACKGROUND_THUMBNAIL_STYLES;

  return (
    <View style={[styles.backgroundCard, { width: 203 * scale, height: 282 * scale }, style]}>
      <Image
        source={coverImage}
        style={[
          cardImageStyle,
          variant === 'right'
            ? {
                left: 17 * scale,
                top: 14 * scale,
                width: 178 * scale,
                height: 212 * scale,
              }
            : {
                left: 14 * scale,
                top: 14 * scale,
                width: 178 * scale,
                height: 212 * scale,
              },
        ]}
        resizeMode="cover"
      />
      {thumbnails.slice(0, 5).map((thumbnail, index) => (
        <Image
          key={index}
          source={thumbnail}
          style={[
            styles.backgroundThumbnail,
            {
              left: thumbnailStyles[index].left * scale,
              top: thumbnailStyles[index].top * scale,
              width: 31.5 * scale,
              height: 32.9 * scale,
            },
          ]}
          resizeMode="cover"
        />
      ))}
    </View>
  );
}

function ProgressRow({
  state,
  label,
  top,
}: {
  state: 'completed' | 'loading' | 'pending';
  label: string;
  top: DimensionValue;
}) {
  return (
    <View style={[styles.progressRow, { top }]}>
      <View style={styles.progressIconSlot}>
        {state === 'completed' ? (
          <View style={styles.completedIconCircle}>
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

function PendingCheckIcon() {
  return (
    <View style={styles.pendingIconCircle}>
      <View style={styles.pendingIconRing} />
      <View style={styles.pendingIconCheck} />
    </View>
  );
}

function VerticalDashConnector({ active, top }: { active: boolean; top: DimensionValue }) {
  return (
    <View style={[styles.dashConnector, { top }]}>
      {[0, 1, 2, 3].map((dash) => (
        <View key={dash} style={[styles.dash, active ? styles.dashActive : styles.dashPending]} />
      ))}
    </View>
  );
}

function ResultTripCard({
  city,
  country,
  dateRange,
  photoCount,
  image,
  selected,
  disabled = false,
  onPress,
  onToggle,
}: {
  city: string;
  country: string;
  dateRange: string;
  photoCount: number;
  image: ImageSourcePropType;
  selected: boolean;
  disabled?: boolean;
  onPress: () => void;
  onToggle: () => void;
}) {
  const handleToggle = React.useCallback(
    (event: GestureResponderEvent) => {
      event.stopPropagation();
      onToggle();
    },
    [onToggle],
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${city} 여행 상세 확인`}
      disabled={disabled}
      hitSlop={4}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tripCard,
        selected && styles.tripCardSelected,
        pressed && styles.tripCardPressed,
      ]}
    >
      <View style={styles.tripContent}>
        <Image source={image} style={styles.tripImage} resizeMode="cover" />
        <View style={styles.tripInfo}>
          <View style={styles.cityRow}>
            <Text style={styles.cityText} numberOfLines={1}>{city}</Text>
            <Text style={styles.countryText} numberOfLines={1}>{country}</Text>
          </View>
          <Text style={styles.dateText} numberOfLines={1}>{dateRange}</Text>
          <View style={styles.photoRow}>
            <Feather name="image" size={16} color={GREY_700} />
            <Text style={styles.photoText}>사진</Text>
            <Text style={styles.photoCountText}>{photoCount}</Text>
            <Text style={styles.photoText}>장</Text>
          </View>
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${city} 여행 ${selected ? '선택 해제' : '선택'}`}
        disabled={disabled}
        hitSlop={8}
        onPress={handleToggle}
        style={({ pressed }) => [
          styles.selectButton,
          selected ? styles.selectButtonSelected : styles.selectButtonUnselected,
          pressed && styles.selectButtonPressed,
        ]}
      >
        <Text style={styles.selectButtonLabel}>{selected ? '선택됨' : '선택'}</Text>
      </Pressable>
    </Pressable>
  );
}

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: BACKGROUND,
  },
  mobileFrame: {
    flex: 1,
    maxWidth: PAGE_MAX_WIDTH,
    alignSelf: 'center',
    overflow: 'hidden',
    backgroundColor: BACKGROUND,
  },
  pageViewport: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  pagesStrip: {
    flexDirection: 'row',
    height: '100%',
  },
  pageWrapper: {
    height: '100%',
    overflow: 'hidden',
    backgroundColor: BACKGROUND,
  },
  page: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  contentLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  pageIndicator: {
    position: 'absolute',
    top: 88,
    left: '50%',
    zIndex: 10,
    width: 108,
    height: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    transform: [{ translateX: -54 }],
  },
  pageDot: {
    width: 12,
    height: 12,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: GREY_200,
    backgroundColor: Colors.foundation.white,
  },
  pageDotActive: {
    borderColor: Colors.foundation.black,
    backgroundColor: Colors.foundation.black,
  },
  heroImageContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
    overflow: 'hidden',
    backgroundColor: BACKGROUND,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  introCopyBlock: {
    position: 'absolute',
    top: 145,
    left: 20,
    width: 256,
  },
  introTitle: {
    ...Typography.title1,
    color: Colors.foundation.black,
    letterSpacing: 0,
  },
  introDescription: {
    marginTop: 12,
    width: 210,
    ...Typography.body1Regular,
    color: Colors.foundation.black,
    letterSpacing: 0,
  },
  nextButton: {
    position: 'absolute',
    left: 35,
    right: 35,
    zIndex: 20,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.52)',
    backgroundColor: 'transparent',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  nextButtonGlassFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(226, 226, 226, 0.34)',
  },
  nextButtonInnerBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: Radius.sm - 1,
    borderWidth: 1,
    borderColor: 'rgba(61, 61, 61, 0.14)',
  },
  nextButtonLabel: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.black,
    textAlign: 'center',
    letterSpacing: 0,
    zIndex: 5,
  },
  buttonPressed: {
    opacity: 0.82,
  },
  photoCopyBlock: {
    position: 'absolute',
    top: 145,
    left: 20,
    right: 20,
  },
  photoTitle: {
    width: 198,
    ...Typography.title1,
    color: Colors.foundation.black,
    letterSpacing: 0,
  },
  photoDescription: {
    marginTop: 12,
    maxWidth: 310,
    ...Typography.body1Regular,
    color: Colors.foundation.grey600,
    letterSpacing: 0,
  },
  polaroidStage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 650,
  },
  backgroundCard: {
    width: 203,
    height: 283,
    backgroundColor: Colors.foundation.white,
    borderRadius: Radius.xs,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1.77 },
    shadowOpacity: 0.25,
    shadowRadius: 1.77,
    elevation: 2,
  },
  leftBackCard: {
    position: 'absolute',
    opacity: 0.8,
    transform: [{ rotate: '-5.13deg' }],
    zIndex: 1,
  },
  rightBackCard: {
    position: 'absolute',
    opacity: 0.8,
    transform: [{ rotate: '4.35deg' }],
    zIndex: 1,
  },
  leftBackgroundCardImage: {
    position: 'absolute',
    left: 14,
    top: 14,
    width: 178,
    height: 212,
  },
  rightBackgroundCardImage: {
    position: 'absolute',
    left: 17,
    top: 14,
    width: 178,
    height: 212,
  },
  backgroundThumbnail: {
    position: 'absolute',
    width: 31.5,
    height: 32.9,
  },
  polaroidCard: {
    position: 'absolute',
    width: 227,
    height: 314,
    top: 328,
    left: '50%',
    marginLeft: -113,
    zIndex: 3,
    borderRadius: Radius.xs,
    backgroundColor: Colors.foundation.white,
    shadowColor: '#000000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  mainCard: {},
  mainImageWrap: {
    position: 'absolute',
    left: 14,
    right: 13,
    top: 17,
    height: 230,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  mainCardCopy: {
    position: 'absolute',
    left: 11,
    bottom: 12,
    gap: 2,
  },
  mainCardCity: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.white,
    letterSpacing: 0,
  },
  mainCardMeta: {
    ...Typography.captionRegular,
    color: Colors.foundation.white,
    letterSpacing: 0,
  },
  mainCardPhotoCount: {
    ...Typography.captionEmphasized,
    color: Colors.foundation.white,
    letterSpacing: 0,
  },
  thumbnailRow: {
    position: 'absolute',
    left: 17,
    right: 17,
    bottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  thumbnail: {
    width: 34,
    height: 36,
  },
  connectButton: {
    position: 'absolute',
    left: 35,
    right: 35,
    zIndex: 20,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.sm,
    backgroundColor: Colors.foundation.black,
  },
  connectButtonLabel: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.white,
    textAlign: 'center',
    letterSpacing: 0,
  },
  photoSkipButton: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 20,
    alignItems: 'center',
  },
  skipLabel: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.grey600,
    textAlign: 'center',
    textDecorationLine: 'underline',
    letterSpacing: 0,
  },
  photoHelperRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  helperText: {
    ...Typography.captionEmphasized,
    color: Colors.foundation.grey400,
    letterSpacing: 0,
  },
  analyzingTitle: {
    position: 'absolute',
    top: 181,
    left: 0,
    right: 0,
    ...Typography.title1,
    color: Colors.foundation.black,
    textAlign: 'center',
    letterSpacing: 0,
  },
  analyzingDescription: {
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
    top: '46.68%',
    left: '11.54%',
    right: '11.54%',
    height: '28.44%',
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
  homePreviewButton: {
    position: 'absolute',
    bottom: 152,
    left: '50%',
    zIndex: 20,
    width: 119,
    height: 20,
    marginLeft: -59.5,
    alignItems: 'center',
  },
  homePreviewLabel: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.grey600,
    textAlign: 'center',
    textDecorationLine: 'underline',
    letterSpacing: 0,
  },
  analyzingHelperRow: {
    position: 'absolute',
    bottom: 112,
    left: '50%',
    zIndex: 20,
    width: 234,
    marginLeft: -117,
    height: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  analyzingHelperText: {
    ...Typography.body2Regular,
    color: Colors.foundation.grey400,
    letterSpacing: 0,
  },
  completionCaption: {
    position: 'absolute',
    bottom: 92,
    left: '50%',
    zIndex: 20,
    width: 125,
    height: 20,
    marginLeft: -62.5,
    ...Typography.body2Regular,
    color: Colors.foundation.grey400,
    textAlign: 'center',
    letterSpacing: 0,
  },
  resultsTitle: {
    position: 'absolute',
    top: 133,
    left: Spacing.xl,
    right: Spacing.xl,
    ...Typography.title1,
    color: Colors.foundation.black,
    letterSpacing: 0,
  },
  resultsDescription: {
    position: 'absolute',
    top: 188,
    left: Spacing.xl,
    right: Spacing.xl,
    width: 220,
    ...Typography.body1Regular,
    color: GREY_700,
    letterSpacing: 0,
  },
  countLabel: {
    position: 'absolute',
    top: 269,
    left: Spacing.xl,
    width: 130,
    height: 20,
    ...Typography.body2Regular,
    color: GREY_700,
    letterSpacing: 0,
  },
  countLabelNumber: {
    ...Typography.body2Emphasized,
    color: GREY_700,
    letterSpacing: 0,
  },
  listViewport: {
    position: 'absolute',
    top: 305,
    left: Spacing.xl,
    right: Spacing.xl,
  },
  listContent: {
    gap: Spacing.sm,
  },
  tripCard: {
    width: '100%',
    height: 99,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.md,
    paddingRight: Spacing.lg,
    paddingBottom: Spacing.md,
    paddingLeft: Spacing.md,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(201, 201, 201, 0.30)',
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
  },
  tripCardSelected: {
    borderColor: 'rgba(145, 144, 144, 0.50)',
    backgroundColor: 'rgba(166, 166, 166, 0.20)',
  },
  tripCardPressed: {
    opacity: 0.82,
  },
  tripContent: {
    flex: 1,
    minWidth: 0,
    height: 75,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  tripImage: {
    width: 94,
    height: 75,
    flexShrink: 0,
    borderRadius: Radius.xs,
    backgroundColor: '#AFAFAF',
  },
  tripInfo: {
    flex: 1,
    minWidth: 0,
    height: 70,
    justifyContent: 'center',
    alignItems: 'flex-start',
    gap: Spacing.xs,
  },
  cityRow: {
    height: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  cityText: {
    ...Typography.body1Emphasized,
    color: Colors.foundation.black,
    letterSpacing: 0,
  },
  countryText: {
    ...Typography.body2Regular,
    color: Colors.foundation.grey600,
    letterSpacing: 0,
  },
  dateText: {
    height: 20,
    alignSelf: 'stretch',
    ...Typography.body2Regular,
    color: Colors.foundation.grey600,
    letterSpacing: 0,
  },
  photoRow: {
    height: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  photoText: {
    ...Typography.body2Regular,
    color: GREY_700,
    textAlign: 'center',
    letterSpacing: 0,
  },
  photoCountText: {
    ...Typography.body2Emphasized,
    color: GREY_900,
    textAlign: 'center',
    letterSpacing: 0,
  },
  selectButton: {
    height: 24,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.lg,
    marginLeft: Spacing.sm,
  },
  selectButtonSelected: {
    width: 56,
    backgroundColor: Colors.foundation.black,
  },
  selectButtonUnselected: {
    width: 45,
    backgroundColor: BUTTON_UNSELECTED_BG,
  },
  selectButtonPressed: {
    opacity: 0.82,
  },
  selectButtonLabel: {
    ...Typography.captionEmphasized,
    color: Colors.foundation.white,
    letterSpacing: 0,
  },
  primaryButton: {
    borderWidth: 1,
    borderColor: Colors.light.borderDefault,
    backgroundColor: Colors.foundation.white,
  },
  primaryButtonActive: {
    borderColor: Colors.foundation.black,
    backgroundColor: Colors.foundation.black,
  },
  primaryButtonSaving: {
    borderColor: GREY_200,
    backgroundColor: GREY_200,
  },
  savingButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  primaryButtonLabel: {
    color: Colors.light.textDisabled,
  },
  primaryButtonLabelActive: {
    color: Colors.foundation.white,
  },
  primaryButtonLabelSaving: {
    color: GREY_700,
  },
});

const LEFT_BACKGROUND_THUMBNAIL_STYLES = [
  { left: 33.79, top: 236.55 },
  { left: 70.18, top: 236.55 },
  { left: 106.55, top: 236.55 },
  { left: 142.99, top: 236.55 },
  { left: 179.36, top: 236.55 },
] as const;

const RIGHT_BACKGROUND_THUMBNAIL_STYLES = [
  { left: 14.06, top: 236.55 },
  { left: 50.48, top: 236.55 },
  { left: 86.88, top: 236.55 },
  { left: 123.38, top: 236.55 },
  { left: 159.83, top: 236.55 },
] as const;
