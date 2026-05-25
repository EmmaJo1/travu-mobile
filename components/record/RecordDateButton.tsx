/**
 * RecordDateButton
 *
 * Figma: day-recording-detail — Header > Date 오토레이아웃
 * — LeftSlot / Date(fill) / RightSlot 구조의 Date 영역
 * — 날짜 + 요일만 표시 (예: "2025.3.6 목")
 * — Day 번호(Day 1, Day 2)는 표시하지 않음
 * — 탭 시 DaySelectorSheet 등 날짜 선택 UI 진입
 */
import React from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import Text from '@/components/common/AppText';
import { Colors, Spacing, Typography } from '@/constants/theme';

export interface RecordDateButtonProps {
  /** 표시할 날짜+요일 문자열 (예: "2025.3.6 목") */
  dateLabel: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

export default function RecordDateButton({ dateLabel, onPress, style }: RecordDateButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed, style]}
      accessibilityRole="button"
      accessibilityLabel={`날짜 선택, ${dateLabel}`}
    >
      <Text style={styles.label} numberOfLines={1}>
        {dateLabel}
      </Text>
      <Image
        source={require('../../assets/images/daycard-triangle.png')}
        style={styles.icon}
        resizeMode="contain"
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs + 1,
  },
  pressed: {
    opacity: 0.75,
  },
  label: {
    ...Typography.body1Emphasized,
    color: Colors.foundation.black,
  },
  icon: {
    width: Spacing.md,
    height: Spacing.md,
  },
});
