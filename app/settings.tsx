import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Text from '@/components/common/AppText';
import ScreenHeader from '@/components/nav/ScreenHeader';
import { Colors, Spacing, Typography } from '@/constants/theme';

interface SettingSectionProps {
  title: string;
  children: React.ReactNode;
}

interface SettingRowProps {
  label: string;
  value?: string;
  showChevron?: boolean;
  destructive?: boolean;
  onPress?: () => void;
}

function SettingSection({ title, children }: SettingSectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View>{children}</View>
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
      <Text style={[styles.rowLabel, destructive && styles.destructiveLabel]}>
        {label}
      </Text>
      <View style={styles.rowRight}>
        {value ? <Text style={styles.rowValue}>{value}</Text> : null}
        {showChevron ? (
          <Ionicons
            name="chevron-forward"
            size={16}
            color={Colors.foundation.grey500}
          />
        ) : null}
      </View>
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        style={styles.row}
        activeOpacity={0.65}
        onPress={onPress}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={styles.row}>{content}</View>;
}

export default function SettingsScreen() {
  const router = useRouter();

  // TODO: Connect to the profile editing flow when that screen is implemented.
  const handleEditProfile = () => {};

  const showPlannedAlert = (message: string) => {
    Alert.alert(message);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="설정" onBackPress={() => router.back()} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <SettingSection title="계정">
          <SettingRow
            label="프로필 편집"
            showChevron
            onPress={handleEditProfile}
          />
          <SettingRow
            label="로그아웃"
            onPress={() =>
              showPlannedAlert('로그아웃 기능은 추후 연결 예정입니다.')
            }
          />
          <SettingRow
            label="회원 탈퇴"
            destructive
            onPress={() =>
              showPlannedAlert('회원 탈퇴 기능은 추후 연결 예정입니다.')
            }
          />
        </SettingSection>

        <SettingSection title="권한 및 앱 설정">
          <SettingRow
            label="사진 접근 권한"
            value="허용됨"
            showChevron
            onPress={() =>
              showPlannedAlert('권한 설정 연결은 추후 구현 예정입니다.')
            }
          />
          <SettingRow
            label="위치 정보 권한"
            value="허용됨"
            showChevron
            onPress={() =>
              showPlannedAlert('권한 설정 연결은 추후 구현 예정입니다.')
            }
          />
        </SettingSection>

        <SettingSection title="정보">
          <SettingRow
            label="개인정보 처리방침"
            showChevron
            onPress={() =>
              showPlannedAlert('개인정보 처리방침 연결은 추후 구현 예정입니다.')
            }
          />
          <SettingRow
            label="서비스 이용약관"
            showChevron
            onPress={() =>
              showPlannedAlert('서비스 이용약관 연결은 추후 구현 예정입니다.')
            }
          />
          <SettingRow
            label="문의하기"
            showChevron
            onPress={() =>
              showPlannedAlert('문의하기 연결은 추후 구현 예정입니다.')
            }
          />
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
    gap: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.grey600,
  },
  row: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.foundation.grey100,
  },
  rowLabel: {
    ...Typography.body1Regular,
    color: Colors.foundation.black,
  },
  destructiveLabel: {
    color: Colors.warm.dark,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  rowValue: {
    ...Typography.body2Regular,
    color: Colors.foundation.grey600,
  },
});
