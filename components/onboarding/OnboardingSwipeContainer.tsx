import { type Href, useRouter } from 'expo-router';
import React from 'react';
import {
  StyleSheet,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

const SWIPE_WIDTH_RATIO = 0.28;
const VELOCITY_THRESHOLD = 700;
const EDGE_RESISTANCE = 0.32;
const SPRING_CONFIG = {
  damping: 22,
  stiffness: 180,
  mass: 0.9,
  overshootClamping: false,
};

const ONBOARDING_ROUTES = [
  { key: 'intro', href: '/onboarding' },
  { key: 'photo-library', href: '/onboarding/photo-library' },
  { key: 'analyzing', href: '/onboarding/analyzing' },
  { key: 'results', href: '/onboarding/results' },
] as const;

type OnboardingStepKey = (typeof ONBOARDING_ROUTES)[number]['key'];

interface OnboardingSwipeContainerProps {
  currentStep: OnboardingStepKey;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export default function OnboardingSwipeContainer({
  currentStep,
  children,
  style,
}: OnboardingSwipeContainerProps) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const translateX = useSharedValue(0);
  const isSettling = useSharedValue(false);
  const currentIndex = ONBOARDING_ROUTES.findIndex((route) => route.key === currentStep);
  const lastIndex = ONBOARDING_ROUTES.length - 1;

  React.useEffect(() => {
    translateX.value = 0;
    isSettling.value = false;
  }, [currentStep, isSettling, translateX]);

  const goToStep = React.useCallback(
    (index: number) => {
      const route = ONBOARDING_ROUTES[index];

      if (!route || index === currentIndex) {
        return;
      }

      router.replace(route.href as Href);
    },
    [currentIndex, router],
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const panGesture = React.useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-10, 10])
        .failOffsetY([-12, 12])
        .onBegin(() => {
          isSettling.value = false;
        })
        .onUpdate((event) => {
          const isAtFirstPage = currentIndex === 0;
          const isAtLastPage = currentIndex === lastIndex;
          const isPullingPastStart = isAtFirstPage && event.translationX > 0;
          const isPullingPastEnd = isAtLastPage && event.translationX < 0;

          translateX.value =
            isPullingPastStart || isPullingPastEnd
              ? event.translationX * EDGE_RESISTANCE
              : event.translationX;
        })
        .onEnd((event) => {
          const swipeThreshold = width * SWIPE_WIDTH_RATIO;
          const didSwipeLeft =
            event.translationX < -swipeThreshold || event.velocityX < -VELOCITY_THRESHOLD;
          const didSwipeRight =
            event.translationX > swipeThreshold || event.velocityX > VELOCITY_THRESHOLD;

          if (didSwipeLeft && currentIndex < lastIndex) {
            isSettling.value = true;
            translateX.value = withSpring(-width, SPRING_CONFIG, (finished) => {
              if (finished) {
                runOnJS(goToStep)(currentIndex + 1);
              }
            });
            return;
          }

          if (didSwipeRight && currentIndex > 0) {
            isSettling.value = true;
            translateX.value = withSpring(width, SPRING_CONFIG, (finished) => {
              if (finished) {
                runOnJS(goToStep)(currentIndex - 1);
              }
            });
            return;
          }

          translateX.value = withSpring(0, SPRING_CONFIG);
        })
        .onFinalize(() => {
          if (!isSettling.value) {
            translateX.value = withSpring(0, SPRING_CONFIG);
          }
        }),
    [currentIndex, goToStep, isSettling, lastIndex, translateX, width],
  );

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.root, style, animatedStyle]}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
