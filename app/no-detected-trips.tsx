import { type Href, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import Text from '@/components/common/AppText';
import ScreenHeader from '@/components/nav/ScreenHeader';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { usePhotoImportFlow } from '@/hooks/usePhotoImportFlow';

const BACKGROUND = Colors.light.bgScreen;
const GREY_700 = '#595959';

export default function NoDetectedTrips() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { openPhotoImportResults } = usePhotoImportFlow();

  React.useEffect(() => {
    openPhotoImportResults();
  }, [openPhotoImportResults]);

  const handleManualCreate = React.useCallback(() => {
    router.push('/create-trip' as Href);
  }, [router]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="dark" />
      <ScreenHeader title="사진에서 여행 찾기" onBackPress={() => router.back()} style={styles.header} />

      <View style={styles.center}>
        <Image
          source={require('../assets/images/no-detected-trips-illustration.png')}
          style={styles.illustration}
          resizeMode="contain"
        />

        <Text style={styles.title}>발견된 여행이 없어요</Text>
        <Text style={styles.description}>
          사진의 날짜와 위치 정보가 부족하면{'\n'}여행 후보를 찾기 어려울 수 있어요
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={handleManualCreate}
        style={({ pressed }) => [
          styles.fixedButton,
          { bottom: Math.max(insets.bottom + 24, 32) },
          pressed && styles.buttonPressed,
        ]}
      >
        <Text style={styles.fixedButtonLabel}>직접 여행 추가하기</Text>
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
  center: {
    position: 'absolute',
    top: 216,
    left: Spacing.xl,
    right: Spacing.xl,
    alignItems: 'center',
  },
  illustration: {
    width: 220,
    height: 220,
    marginBottom: 28,
  },
  title: {
    ...Typography.title1,
    color: Colors.foundation.black,
    textAlign: 'center',
  },
  description: {
    marginTop: Spacing.md,
    ...Typography.body2Regular,
    color: GREY_700,
    textAlign: 'center',
  },
  fixedButton: {
    position: 'absolute',
    left: 35,
    right: 35,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.sm,
    backgroundColor: Colors.foundation.black,
  },
  fixedButtonLabel: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.white,
  },
  buttonPressed: {
    opacity: 0.84,
  },
});
