import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Text from '@/components/common/AppText';
import ScreenHeader from '@/components/nav/ScreenHeader';
import { Colors, Spacing, Typography } from '@/constants/theme';

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

export default function SettingsScreen() {
  const router = useRouter();

  const handlePressEditProfile = React.useCallback(() => {
    // Connect profile edit route when the profile edit screen is added.
  }, []);

  const showLaterAlert = React.useCallback((message: string) => {
    Alert.alert(message);
  }, []);

  const handlePressPermissions = React.useCallback(() => {
    showLaterAlert('권한 설정 연결은 추후 구현 예정입니다.');
  }, [showLaterAlert]);

  const handlePressInfoLink = React.useCallback(() => {
    showLaterAlert('외부 링크 연결은 추후 구현 예정입니다.');
  }, [showLaterAlert]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        title="설정"
        onBackPress={() => router.back()}
        style={styles.header}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <SettingSection title="계정">
          <SettingRow
            label="프로필 편집"
            showChevron
            onPress={handlePressEditProfile}
          />
          <View style={styles.divider} />
          <SettingRow
            label="로그아웃"
            onPress={() => showLaterAlert('로그아웃 기능은 추후 연결 예정입니다.')}
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
            value="허용됨"
            showChevron
            onPress={handlePressPermissions}
          />
          <View style={styles.divider} />
          <SettingRow
            label="위치 정보 권한"
            value="허용됨"
            showChevron
            onPress={handlePressPermissions}
          />
        </SettingSection>

        <SettingSection title="정보">
          <SettingRow
            label="개인정보 처리방침"
            showChevron
            onPress={handlePressInfoLink}
          />
          <View style={styles.divider} />
          <SettingRow
            label="서비스 이용약관"
            showChevron
            onPress={handlePressInfoLink}
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
