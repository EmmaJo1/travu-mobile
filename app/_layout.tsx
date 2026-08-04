import 'react-native-reanimated';

import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { type PropsWithChildren } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import AppRouteGuard from '@/components/auth/AppRouteGuard';
import { resolveAuthRouteMode, type AuthRouteMode } from '@/components/auth/authRouteState';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/providers/AuthProvider';
import { PhotoImportFlowProvider } from '@/providers/PhotoImportFlowProvider';
import QueryProvider from '@/providers/QueryProvider';
import { UserProfileProvider } from '@/providers/UserProfileProvider';

SplashScreen.preventAutoHideAsync().catch(() => {});

function SessionScopedProviders({ children }: PropsWithChildren) {
  const { isDevBypass, user } = useAuth();
  const sessionScopeKey = user?.id ?? (isDevBypass ? 'dev-bypass' : 'signed-out');

  return (
    <UserProfileProvider key={`profile-${sessionScopeKey}`}>
      <PhotoImportFlowProvider key={`photo-import-${sessionScopeKey}`}>
        {children}
      </PhotoImportFlowProvider>
    </UserProfileProvider>
  );
}

function AppStack({ routeMode }: { routeMode: Exclude<AuthRouteMode, 'resolving' | 'error'> }) {
  const isAuthRoute = routeMode === 'auth';
  const isOnboardingRoute = routeMode === 'onboarding';
  const isAppRoute = routeMode === 'app';
  const initialRouteName = isAuthRoute
    ? 'auth-start'
    : isOnboardingRoute
      ? 'onboarding'
      : '(tabs)';

  return (
    <Stack key={routeMode} initialRouteName={initialRouteName}>
      <Stack.Protected guard={isAuthRoute}>
        <Stack.Screen name="index" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="auth-start" options={{ headerShown: false, gestureEnabled: false }} />
      </Stack.Protected>
      <Stack.Protected guard={isOnboardingRoute}>
        <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
      </Stack.Protected>
      <Stack.Protected guard={isOnboardingRoute || isAppRoute}>
        <Stack.Screen name="record-day-detail" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={isAppRoute}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        <Stack.Screen name="button-test" options={{ title: 'Button 테스트', headerBackTitle: '뒤로' }} />
        <Stack.Screen name="components-showcase" options={{ headerShown: false }} />
        <Stack.Screen name="component-test" options={{ title: 'Component Test', headerShown: false }} />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
        <Stack.Screen name="legal/[document]" options={{ headerShown: false }} />
        <Stack.Screen name="profile-edit" options={{ headerShown: false }} />
        <Stack.Screen name="day-record-1207-2245" options={{ headerShown: false }} />
        <Stack.Screen name="figma-node-1207-2245" options={{ headerShown: false }} />
        <Stack.Screen name="place-detail" options={{ headerShown: false }} />
        <Stack.Screen name="day-archive-detail" options={{ headerShown: false }} />
        <Stack.Screen name="find-trips-start" options={{ headerShown: false }} />
        <Stack.Screen name="find-trips-loading" options={{ headerShown: false }} />
        <Stack.Screen name="detected-trips" options={{ headerShown: false }} />
        <Stack.Screen name="no-detected-trips" options={{ headerShown: false }} />
        <Stack.Screen name="photo-permission-required" options={{ headerShown: false }} />
        <Stack.Screen name="create-trip" options={{ headerShown: false }} />
        <Stack.Screen name="select-trip-destination" options={{ headerShown: false }} />
        <Stack.Screen name="select-trip-date" options={{ headerShown: false }} />
        <Stack.Screen name="trip-created" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}

function AuthenticatedApp() {
  const {
    initializationStatus,
    isAuthenticated,
    isDevBypass,
    profile,
    profileStatus,
  } = useAuth();
  const routeMode = resolveAuthRouteMode({
    initializationStatus,
    isAuthenticated,
    isDevBypass,
    profile,
    profileStatus,
  });
  const [laidOutRouteMode, setLaidOutRouteMode] = React.useState<AuthRouteMode | null>(null);
  const isRouteLayoutReady = laidOutRouteMode === routeMode;
  const hasNavigator = routeMode === 'auth' || routeMode === 'onboarding' || routeMode === 'app';

  return (
    <View style={styles.root}>
      <SessionScopedProviders>
        <View
          key={routeMode}
          onLayout={() => setLaidOutRouteMode(routeMode)}
          style={styles.root}
        >
          {hasNavigator ? (
            <AppStack routeMode={routeMode as Exclude<AuthRouteMode, 'resolving' | 'error'>} />
          ) : null}
        </View>
      </SessionScopedProviders>
      <AppRouteGuard isRouteLayoutReady={isRouteLayoutReady} routeMode={routeMode} />
    </View>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded, fontError] = useFonts({
    Pretendard: require('../assets/fonts/Pretendard-Regular.otf'),
    'Pretendard-Regular': require('../assets/fonts/Pretendard-Regular.otf'),
    'Pretendard-Medium': require('../assets/fonts/Pretendard-Medium.otf'),
    'Pretendard-SemiBold': require('../assets/fonts/Pretendard-SemiBold.otf'),
    'Pretendard-Bold': require('../assets/fonts/Pretendard-Bold.otf'),
    'NotoSerifKR-Regular': require('../assets/fonts/NotoSerifKR-VF.ttf'),
    'NotoSerifKR-Medium': require('../assets/fonts/NotoSerifKR-VF.ttf'),
    'NotoSerifKR-Bold': require('../assets/fonts/NotoSerifKR-VF.ttf'),
    'NotoSerifKR-Black': require('../assets/fonts/NotoSerifKR-VF.ttf'),
    'Noto Serif KR': require('../assets/fonts/NotoSerifKR-VF.ttf'),
    'Prata-Regular': require('../assets/fonts/Prata-Regular.ttf'),
    'SansitaSwashed-Bold': require('../assets/fonts/SansitaSwashed-wght.ttf'),
    'Sansita Swashed': require('../assets/fonts/SansitaSwashed-wght.ttf'),
  });

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <QueryProvider>
            <AuthProvider>
              <AuthenticatedApp />
            </AuthProvider>
          </QueryProvider>
          <StatusBar style="auto" />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.light.bgScreen,
  },
});
