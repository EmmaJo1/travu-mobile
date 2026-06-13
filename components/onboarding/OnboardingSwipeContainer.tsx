import { type Href, useRouter } from 'expo-router';
import React from 'react';
import {
  PanResponder,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

const SWIPE_DISTANCE_THRESHOLD = 60;
const SWIPE_VELOCITY_THRESHOLD = 0.35;

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
  const currentIndex = ONBOARDING_ROUTES.findIndex((route) => route.key === currentStep);

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

  const panResponder = React.useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) => {
          const { dx, dy } = gestureState;
          return Math.abs(dx) > 24 && Math.abs(dx) > Math.abs(dy) * 1.2;
        },
        onPanResponderRelease: (_, gestureState) => {
          const { dx, vx } = gestureState;
          const didSwipeLeft =
            dx < -SWIPE_DISTANCE_THRESHOLD || vx < -SWIPE_VELOCITY_THRESHOLD;
          const didSwipeRight =
            dx > SWIPE_DISTANCE_THRESHOLD || vx > SWIPE_VELOCITY_THRESHOLD;

          if (didSwipeLeft) {
            goToStep(currentIndex + 1);
            return;
          }

          if (didSwipeRight) {
            goToStep(currentIndex - 1);
          }
        },
      }),
    [currentIndex, goToStep],
  );

  return (
    <View style={[styles.root, style]} {...panResponder.panHandlers}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
