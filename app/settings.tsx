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
import { LocalUserDataCleanupError } from '@/services/localUserData';
import { AccountDeletionError } from '@/services/supabase/accountDeletion';

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

function confirmAccountDeletionWithoutAppleRevocation() {
  return new Promise<boolean>((resolve) => {
    Alert.alert(
      'Apple 연결 확인을 완료하지 못했어요',
      'Travu 계정과 데이터는 삭제할 수 있어요. 다만 Apple 로그인 연결은 삭제 후 iPhone 설정에서 직접 해제해야 할 수 있어요. 계속 탈퇴할까요?',
      [
        { onPress: () => resolve(false), style: 'cancel', text: '취소' },
        {
          onPress: () => resolve(true),
          style: 'destructive',
          text: '계속 탈퇴',
        },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
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
  const { deleteAccount, isDevBypass, signOut } = useAuth();
  const isDeletingAccountRef = React.useRef(false);
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

  const handlePressPermissions = React.useCallback(() => {
    Linking.openSettings().catch(() => {
      Alert.alert('설정 화면을 열 수 없어요.');
    });
  }, []);

  const handlePressSupport = React.useCallback(() => {
    const subject = encodeURIComponent('Travu 문의');

    Linking.openURL(`mailto:travu.support@gmail.com?subject=${subject}`).catch(() => {
      Alert.alert(
        '메일 앱을 열 수 없어요.',
        'travu.support@gmail.com으로 문의해주세요.',
      );
    });
  }, []);

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

  const handleDeleteAccount = React.useCallback(() => {
    if (isDeletingAccountRef.current) {
      return;
    }

    if (isDevBypass) {
      Alert.alert(
        '회원 탈퇴',
        '개발 모드에서는 회원 탈퇴를 사용할 수 없어요.',
      );
      return;
    }

    Alert.alert(
      '회원 탈퇴',
      '계정을 삭제하면 여행 기록, 사진, 프로필 정보가 영구적으로 삭제되며 복구할 수 없어요.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '탈퇴하기',
          style: 'destructive',
          onPress: () => {
            if (isDeletingAccountRef.current) {
              return;
            }

            isDeletingAccountRef.current = true;

            void (async () => {
              try {
                let result = await deleteAccount();

                if (result.status === 'apple-reauth-unavailable') {
                  const shouldContinue = await confirmAccountDeletionWithoutAppleRevocation();

                  if (!shouldContinue) {
                    return;
                  }

                  result = await deleteAccount({ skipAppleReauthentication: true });
                }

                if (result.status !== 'deleted') {
                  return;
                }

                router.replace('/auth-start' as Href);
                const completionMessages = ['Travu의 계정과 데이터는 삭제됐어요.'];

                if (result.manualAppleRevocationRequired) {
                  completionMessages.push(
                    'Apple 로그인 연결 자동 해제를 완료하지 못했어요. 설정 > [사용자 이름] > Apple로 로그인 > Travu에서 연결을 해제해주세요.',
                  );
                }

                if (!result.localCleanupCompleted) {
                  completionMessages.push(
                    '기기의 일부 임시 데이터는 정리를 완료하지 못해 다음 앱 실행 시 다시 정리됩니다.',
                  );
                }

                Alert.alert(
                  '회원 탈퇴가 완료됐어요',
                  completionMessages.join('\n\n'),
                );
              } catch (error) {
                console.warn('[settings] account deletion failed', {
                  code: error instanceof AccountDeletionError || error instanceof LocalUserDataCleanupError
                    ? error.code
                    : 'CLIENT_ERROR',
                });
                Alert.alert(
                  '회원 탈퇴를 완료하지 못했어요.',
                  '잠시 후 다시 시도해주세요.',
                );
              } finally {
                isDeletingAccountRef.current = false;
              }
            })();
          },
        },
      ],
    );
  }, [deleteAccount, isDevBypass, router]);

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
            onPress={handleDeleteAccount}
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
            onPress={handlePressSupport}
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
