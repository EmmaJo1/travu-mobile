import * as SplashScreen from 'expo-splash-screen';
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import PrimaryButton from '@/components/common/PrimaryButton';
import Text from '@/components/common/AppText';
import type { AuthRouteMode } from '@/components/auth/authRouteState';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';

type AppRouteGuardProps = {
  isRouteLayoutReady: boolean;
  routeMode: AuthRouteMode;
};

export default function AppRouteGuard({
  isRouteLayoutReady,
  routeMode,
}: AppRouteGuardProps) {
  const {
    initializationStatus,
    profileStatus,
    retryInitialization,
    retryProfile,
  } = useAuth();
  const hasReleasedLaunchScreenRef = React.useRef(false);
  const [hasReleasedLaunchScreen, setHasReleasedLaunchScreen] = React.useState(false);
  const canReleaseLaunchScreen = isRouteLayoutReady && routeMode !== 'resolving';

  React.useEffect(() => {
    if (!canReleaseLaunchScreen || hasReleasedLaunchScreenRef.current) {
      return;
    }

    hasReleasedLaunchScreenRef.current = true;
    void SplashScreen.hideAsync()
      .catch(() => {})
      .finally(() => {
        setHasReleasedLaunchScreen(true);
      });
  }, [canReleaseLaunchScreen]);

  const handleRetry = React.useCallback(() => {
    if (initializationStatus === 'error') {
      void retryInitialization();
      return;
    }

    if (profileStatus === 'error') {
      void retryProfile().catch(() => undefined);
    }
  }, [initializationStatus, profileStatus, retryInitialization, retryProfile]);

  const shouldBlock = routeMode === 'resolving'
    || routeMode === 'error'
    || !isRouteLayoutReady
    || !hasReleasedLaunchScreen;

  if (!shouldBlock) {
    return null;
  }

  if (routeMode === 'error') {
    return (
      <View pointerEvents="auto" style={[styles.blocker, styles.centered]}>
        <Text style={styles.errorTitle}>{'계정 정보를 불러오지 못했어요'}</Text>
        <Text style={styles.errorDescription}>
          {'네트워크 상태를 확인한 뒤 다시 시도해주세요.'}
        </Text>
        <PrimaryButton
          label="다시 시도"
          onPress={handleRetry}
          style={styles.retryButton}
        />
      </View>
    );
  }

  return (
    <View pointerEvents="auto" style={[styles.blocker, styles.centered]}>
      {hasReleasedLaunchScreen ? (
        <ActivityIndicator color={Colors.foundation.black} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  blocker: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    backgroundColor: Colors.light.bgScreen,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  errorTitle: {
    ...Typography.title2,
    color: Colors.foundation.black,
    textAlign: 'center',
  },
  errorDescription: {
    marginTop: Spacing.sm,
    ...Typography.body2Regular,
    color: Colors.foundation.grey600,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: Spacing.lg,
  },
});
