import 'react-native-gesture-handler';
import 'react-native-reanimated';

import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useColorScheme } from '@/hooks/use-color-scheme';

SplashScreen.preventAutoHideAsync().catch(() => {});

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

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

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
            <Stack.Screen name="settings" options={{ headerShown: false }} />
            <Stack.Screen name="day-record-1207-2245" options={{ headerShown: false }} />
            <Stack.Screen name="figma-node-1207-2245" options={{ headerShown: false }} />
            <Stack.Screen name="record-day-detail" options={{ headerShown: false }} />
            <Stack.Screen name="day-archive-detail" options={{ headerShown: false }} />
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
