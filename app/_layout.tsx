import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import 'react-native-gesture-handler';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useColorScheme } from '@/hooks/use-color-scheme';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded] = useFonts({
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

  useEffect(() => {
    if (!fontsLoaded) return;
    // #region agent log
    fetch('http://127.0.0.1:7528/ingest/e40f0855-f0e7-4f47-b6c7-28e1e508553b', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '1cabea' },
      body: JSON.stringify({
        sessionId: '1cabea',
        runId: 'post-fix',
        hypothesisId: 'VERIFY',
        location: 'app/_layout.tsx:fontsLoaded',
        message: 'app_root_mounted',
        data: { fontsLoaded: true },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    console.log('[DEBUG 1cabea] app_root_mounted');
    // #endregion
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
            <Stack.Screen name="button-test" options={{ title: 'Button 테스트', headerBackTitle: '뒤로' }} />
            <Stack.Screen name="components-showcase" options={{ headerShown: false }} />
            <Stack.Screen name="component-test" options={{ title: 'Component Test', headerShown: false }} />
            <Stack.Screen name="auth-start" options={{ headerShown: false }} />
            <Stack.Screen name="day-record-1207-2245" options={{ headerShown: false }} />
            <Stack.Screen name="figma-node-1207-2245" options={{ headerShown: false }} />
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
