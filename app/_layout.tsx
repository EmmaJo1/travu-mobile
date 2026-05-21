import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded] = useFonts({
    Pretendard: require('../assets/fonts/Pretendard-Regular.ttf'),
    'Pretendard-Regular': require('../assets/fonts/Pretendard-Regular.ttf'),
    'Pretendard-Medium': require('../assets/fonts/Pretendard-Medium.otf'),
    'Pretendard-SemiBold': require('../assets/fonts/Pretendard-SemiBold.otf'),
    'Pretendard-Bold': require('../assets/fonts/Pretendard-Bold.otf'),
    'NotoSerifKR-Regular': require('../assets/fonts/NotoSerifKR-VF.ttf'),
    'NotoSerifKR-Bold': require('../assets/fonts/NotoSerifKR-VF.ttf'),
    'NotoSerifKR-Black': require('../assets/fonts/NotoSerifKR-VF.ttf'),
    'Noto Serif KR': require('../assets/fonts/NotoSerifKR-VF.ttf'),
    'Prata-Regular': require('../assets/fonts/Prata-Regular.ttf'),
    'SansitaSwashed-Bold': require('../assets/fonts/SansitaSwashed-wght.ttf'),
  });

  if (!fontsLoaded) return null;

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        <Stack.Screen name="button-test" options={{ title: 'Button 테스트', headerBackTitle: '뒤로' }} />
        <Stack.Screen name="components-showcase" options={{ headerShown: false }} />
        <Stack.Screen name="day-record-1207-2245" options={{ headerShown: false }} />
        <Stack.Screen name="figma-node-1207-2245" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
