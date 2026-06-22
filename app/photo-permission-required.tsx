import { Feather } from '@expo/vector-icons';
import { type Href, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import Text from '@/components/common/AppText';
import ScreenHeader from '@/components/nav/ScreenHeader';
import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';

const BACKGROUND = Colors.light.bgScreen;
const GREY_700 = '#595959';

export default function PhotoPermissionRequired() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleOpenSettings = React.useCallback(() => {
    Linking.openSettings().catch(() => undefined);
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="dark" />
      <ScreenHeader title="사진에서 여행 찾기" onBackPress={() => router.back()} style={styles.header} />

      <View style={styles.center}>
        <View style={styles.iconCircle}>
          <Feather name="lock" size={34} color={Colors.foundation.black} />
        </View>

        <Text style={styles.title}>사진 접근이 필요해요</Text>
        <Text style={styles.description}>
          사진의 날짜와 위치 정보를 확인해야{'\n'}여행 후보를 찾을 수 있어요
        </Text>
      </View>

      <View style={[styles.bottomArea, { bottom: Math.max(insets.bottom + 24, 32) }]}>
        <Pressable
          accessibilityRole="button"
          onPress={handleOpenSettings}
          style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
        >
          <Text style={styles.primaryButtonLabel}>설정에서 접근 허용하기</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => router.replace('/(tabs)' as Href)}
          style={styles.laterButton}
        >
          <Text style={styles.laterButtonLabel}>나중에 하기</Text>
        </Pressable>
      </View>
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
    top: 224,
    left: Spacing.xl,
    right: Spacing.xl,
    alignItems: 'center',
  },
  iconCircle: {
    width: 104,
    height: 104,
    marginTop: Spacing['3xl'],
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.foundation.white,
    ...Shadows.cardSmall,
  },
  title: {
    marginTop: Spacing['4xl'],
    ...Typography.title1,
    color: Colors.foundation.black,
    textAlign: 'center',
  },
  description: {
    marginTop: Spacing.xl,
    ...Typography.body2Regular,
    color: GREY_700,
    textAlign: 'center',
  },
  bottomArea: {
    position: 'absolute',
    left: 35,
    right: 35,
    alignItems: 'center',
  },
  primaryButton: {
    width: '100%',
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.sm,
    backgroundColor: Colors.foundation.black,
  },
  primaryButtonLabel: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.white,
  },
  laterButton: {
    marginTop: Spacing.xl,
  },
  laterButtonLabel: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.grey600,
    textDecorationLine: 'underline',
  },
  buttonPressed: {
    opacity: 0.84,
  },
});
