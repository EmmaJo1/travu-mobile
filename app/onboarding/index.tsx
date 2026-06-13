import MaskedView from '@react-native-masked-view/masked-view';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { type Href, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Image, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Text from '@/components/common/AppText';
import OnboardingSwipeContainer from '@/components/onboarding/OnboardingSwipeContainer';
import { FIGMA_IMAGES } from '@/constants/figmaImages';
import { Colors, FontFamily, Radius, Typography } from '@/constants/theme';

const WARM_WHITE = Colors.warm.white;
const HERO_IMAGE_HEIGHT = 508;
const HERO_MASK_COLORS = [
  'rgba(0, 0, 0, 0.00355401)',
  'rgba(0, 0, 0, 0.00355401)',
  'rgba(0, 0, 0, 0.134937)',
  'rgba(0, 0, 0, 0.26632)',
  'rgba(0, 0, 0, 0.375)',
  'rgba(0, 0, 0, 0.5)',
  'rgba(0, 0, 0, 0.75)',
  'rgba(0, 0, 0, 1)',
  'rgba(0, 0, 0, 1)',
] as const;
const HERO_MASK_LOCATIONS = [
  0,
  0.4799,
  0.5292,
  0.5563,
  0.5787,
  0.6026,
  0.6334,
  0.6634,
  1,
] as const;

function getCssLinearGradientEndpoints(
  angleDeg: number,
  width: number,
  height: number,
) {
  const radians = (angleDeg * Math.PI) / 180;
  const dx = Math.sin(radians);
  const dy = -Math.cos(radians);
  const lineLength = Math.abs(width * dx) + Math.abs(height * dy);

  return {
    start: {
      x: 0.5 - (dx * lineLength) / (2 * width),
      y: 0.5 - (dy * lineLength) / (2 * height),
    },
    end: {
      x: 0.5 + (dx * lineLength) / (2 * width),
      y: 0.5 + (dy * lineLength) / (2 * height),
    },
  };
}

export default function OnboardingIntroScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const heroMaskGradientPoints = React.useMemo(
    () => getCssLinearGradientEndpoints(170.78, screenWidth, screenHeight),
    [screenHeight, screenWidth],
  );

  const handleNext = React.useCallback(() => {
    router.push('/onboarding/photo-library' as Href);
  }, [router]);

  return (
    <OnboardingSwipeContainer currentStep="intro" style={styles.screen}>
      <StatusBar style="dark" />

      <MaskedView
        pointerEvents="none"
        style={styles.heroMaskFrame}
        maskElement={
          <LinearGradient
            colors={[...HERO_MASK_COLORS]}
            locations={[...HERO_MASK_LOCATIONS]}
            start={heroMaskGradientPoints.start}
            end={heroMaskGradientPoints.end}
            style={StyleSheet.absoluteFillObject}
          />
        }
      >
        <Image
          source={FIGMA_IMAGES.onboarding.firstFlight}
          style={styles.heroImageInsideMask}
          resizeMode="cover"
        />
      </MaskedView>

      <View style={styles.contentLayer}>
        <View style={styles.pageIndicator}>
          <View style={[styles.pageDot, styles.pageDotActive]} />
          <View style={styles.pageDot} />
          <View style={styles.pageDot} />
          <View style={styles.pageDot} />
        </View>

        <View style={styles.copyBlock}>
          <Text style={styles.title}>
            여행의 순간을{'\n'}
            자동으로 정리해 드려요
          </Text>

          <Text style={styles.description}>
            사진을 찍기만 해도 시간과 장소를{'\n'}
            기준으로 여행 기록이 완성돼요
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="다음 온보딩 화면으로 이동"
          onPress={handleNext}
          style={({ pressed }) => [
            styles.nextButton,
            { bottom: Math.max(insets.bottom + 14, 48) },
            pressed && styles.nextButtonPressed,
          ]}
        >
          <BlurView
            pointerEvents="none"
            intensity={14}
            tint="light"
            style={StyleSheet.absoluteFillObject}
          />

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

          <LinearGradient
            pointerEvents="none"
            colors={[
              'rgba(255, 255, 255, 0.34)',
              'rgba(255, 255, 255, 0)',
              'rgba(38, 38, 38, 0.16)',
            ]}
            locations={[0, 0.58, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />

          <View pointerEvents="none" style={styles.nextButtonInnerBorder} />

          <Text style={styles.nextButtonLabel}>다음</Text>
        </Pressable>
      </View>
    </OnboardingSwipeContainer>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: WARM_WHITE,
  },
  heroMaskFrame: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  heroImageInsideMask: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: HERO_IMAGE_HEIGHT,
  },
  contentLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  pageIndicator: {
    position: 'absolute',
    top: 88,
    left: '50%',
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
    borderColor: '#C3C3C3',
    backgroundColor: Colors.foundation.white,
  },
  pageDotActive: {
    borderColor: Colors.foundation.black,
    backgroundColor: Colors.foundation.black,
  },
  copyBlock: {
    position: 'absolute',
    top: 145,
    left: 20,
    width: 256,
  },
  title: {
    ...Typography.title1,
    color: Colors.foundation.black,
    letterSpacing: 0,
  },
  description: {
    marginTop: 12,
    width: 210,
    fontFamily: FontFamily.pretendard,
    fontSize: 16,
    lineHeight: 22,
    color: Colors.foundation.black,
    letterSpacing: 0,
  },
  nextButton: {
    position: 'absolute',
    left: 35,
    right: 35,
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
    zIndex: 3,
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
  nextButtonPressed: {
    opacity: 0.82,
  },
  nextButtonLabel: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.black,
    textAlign: 'center',
    letterSpacing: 0,
    zIndex: 5,
  },
});
