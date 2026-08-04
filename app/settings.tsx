import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useRouter, type Href } from 'expo-router';
import React from 'react';
import {
  Alert,
  AppState,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Text from '@/components/common/AppText';
import ScreenHeader from '@/components/nav/ScreenHeader';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';

type PermissionStatusLabel = '허용됨' | '제한됨' | '허용 안 됨' | '확인 필요';

interface SettingRowProps {
  label: string;
  value?: string;
  showChevron?: boolean;
  destructive?: boolean;
  onPress?: () => void;
}

interface SettingSectionProps {
  title: string;
  children: React.ReactNode;
}

function SettingSection({ title, children }: SettingSectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.rowGroup}>{children}</View>
    </View>
  );
}

function SettingRow({
  label,
  value,
  showChevron = false,
  destructive = false,
  onPress,
}: SettingRowProps) {
  const content = (
    <>
      <Text
        style={[styles.rowLabel, destructive && styles.rowLabelDestructive]}
        numberOfLines={1}
      >
        {label}
      </Text>
      <View style={styles.rowRight}>
        {value ? <Text style={styles.rowValue}>{value}</Text> : null}
        {showChevron ? (
          <Feather name="chevron-right" size={20} color={Colors.foundation.grey500} />
        ) : null}
      </View>
    </>
  );

  if (!onPress) {
    return <View style={styles.row}>{content}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      {content}
    </Pressable>
  );
}

function getPhotoPermissionLabel(
  permission: ImagePicker.MediaLibraryPermissionResponse,
): PermissionStatusLabel {
  if (permission.status === 'granted') {
    return permission.accessPrivileges === 'limited' ? '제한됨' : '허용됨';
  }

  if (permission.status === 'denied') {
    return '허용 안 됨';
  }

  return '확인 필요';
}

function getLocationPermissionLabel(
  permission: Location.LocationPermissionResponse,
): PermissionStatusLabel {
  if (permission.status === 'granted') {
    return '허용됨';
  }

  if (permission.status === 'denied') {
    return '허용 안 됨';
  }

  return '확인 필요';
}

export default function SettingsScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const isSigningOutRef = React.useRef(false);
  const [photoPermissionLabel, setPhotoPermissionLabel] =
    React.useState<PermissionStatusLabel>('확인 필요');
  const [locationPermissionLabel, setLocationPermissionLabel] =
    React.useState<PermissionStatusLabel>('확인 필요');

  const refreshPermissionStatus = React.useCallback(async () => {
    const [photoPermission, locationPermission] = await Promise.allSettled([
      ImagePicker.getMediaLibraryPermissionsAsync(),
      Location.getForegroundPermissionsAsync(),
    ]);

    setPhotoPermissionLabel(
      photoPermission.status === 'fulfilled'
        ? getPhotoPermissionLabel(photoPermission.value)
        : '확인 필요',
    );
    setLocationPermissionLabel(
      locationPermission.status === 'fulfilled'
        ? getLocationPermissionLabel(locationPermission.value)
        : '확인 필요',
    );
  }, []);

  React.useEffect(() => {
    refreshPermissionStatus().catch(() => undefined);

    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        refreshPermissionStatus().catch(() => undefined);
      }
    });

    return () => appStateSubscription.remove();
  }, [refreshPermissionStatus]);

  const handlePressEditProfile = React.useCallback(() => {
    router.push('/profile-edit' as Href);
  }, [router]);

  const showLaterAlert = React.useCallback((message: string) => {
    Alert.alert(message);
  }, []);

  const handlePressPermissions = React.useCallback(() => {
    Linking.openSettings().catch(() => {
      Alert.alert('설정 화면을 열 수 없어요.');
    });
  }, []);

  const handlePressInfoLink = React.useCallback(() => {
    showLaterAlert('외부 링크 연결은 추후 구현 예정입니다.');
  }, [showLaterAlert]);

  const handlePressPrivacyPolicy = React.useCallback(() => {
    router.push('/legal/privacy-policy' as Href);
  }, [router]);

  const handlePressTermsOfService = React.useCallback(() => {
    router.push('/legal/terms-of-service' as Href);
  }, [router]);

  const handleSignOut = React.useCallback(() => {
    if (isSigningOutRef.current) {
      return;
    }

    Alert.alert(
      '로그아웃할까요?',
      '이 기기의 로그인 세션이 종료됩니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '로그아웃',
          style: 'destructive',
          onPress: () => {
            if (isSigningOutRef.current) {
              return;
            }

            isSigningOutRef.current = true;

            void (async () => {
              try {
                await signOut();
              } catch (error) {
                console.warn('[settings] sign out failed', error);
                Alert.alert(
                  '로그아웃하지 못했어요',
                  '잠시 후 다시 시도해주세요.',
                );
              } finally {
                isSigningOutRef.current = false;
              }
            })();
          },
        },
      ],
    );
  }, [signOut]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        title={'\uC124\uC815'}
        onBackPress={() => router.back()}
        style={styles.header}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <SettingSection title={'\uACC4\uC815'}>
          <SettingRow
            label={'\uD504\uB85C\uD544 \uD3B8\uC9D1'}
            showChevron
            onPress={handlePressEditProfile}
          />
          <View style={styles.divider} />
          <SettingRow
            label="로그아웃"
            onPress={handleSignOut}
          />
          <View style={styles.divider} />
          <SettingRow
            label="회원 탈퇴"
            destructive
            onPress={() => showLaterAlert('회원 탈퇴 기능은 추후 연결 예정입니다.')}
          />
        </SettingSection>

        <SettingSection title="권한 및 앱 설정">
          <SettingRow
            label="사진 접근 권한"
            value={photoPermissionLabel}
            showChevron
            onPress={handlePressPermissions}
          />
          <View style={styles.divider} />
          <SettingRow
            label="위치 정보 권한"
            value={locationPermissionLabel}
            showChevron
            onPress={handlePressPermissions}
          />
        </SettingSection>

        <SettingSection title="정보">
          <SettingRow
            label="개인정보 처리방침"
            showChevron
            onPress={handlePressPrivacyPolicy}
          />
          <View style={styles.divider} />
          <SettingRow
            label="서비스 이용약관"
            showChevron
            onPress={handlePressTermsOfService}
          />
          <View style={styles.divider} />
          <SettingRow
            label="문의하기"
            showChevron
            onPress={handlePressInfoLink}
          />
          <View style={styles.divider} />
          <SettingRow label="앱 버전" value="1.0.0" />
        </SettingSection>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.light.bgScreen,
  },
  header: {
    width: '100%',
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing['2xl'],
    paddingBottom: Spacing['4xl'],
    gap: Spacing['3xl'],
  },
  section: {
    gap: Spacing.md,
  },
  sectionTitle: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.grey600,
  },
  rowGroup: {
    width: '100%',
  },
  row: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.lg,
  },
  rowPressed: {
    opacity: 0.65,
  },
  rowLabel: {
    ...Typography.body1Regular,
    color: Colors.foundation.black,
    flex: 1,
  },
  rowLabelDestructive: {
    color: Colors.foundation.grey800,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Spacing.xs,
    flexShrink: 0,
  },
  rowValue: {
    ...Typography.body2Regular,
    color: Colors.foundation.grey500,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.foundation.grey100,
  },
});
