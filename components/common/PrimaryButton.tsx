/**
 * PrimaryButton
 *
 * Figma: 48:996 "PrimaryButton" (ComponentSet)
 * — 소형 컴팩트 액션 버튼 (예: "저장", "추가")
 * — radius: 16 (pill), font: Pretendard Medium 12/22
 * — Active=true : 검정 배경, 흰 텍스트, padding 6 12
 * — Active=false: #C5C5C5 배경, 흰 텍스트, padding 6 12
 *
 * 화면 전체 너비를 채우는 CTA 버튼은 AuthActionButton을 사용하세요.
 */
import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Colors, Typography } from '@/constants/theme';

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  active?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

export default function PrimaryButton({
  label,
  onPress,
  active = true,
  loading = false,
  style,
}: PrimaryButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.75}
      style={[styles.button, active ? styles.active : styles.inactive, style]}
    >
      {loading ? (
        <ActivityIndicator color="#FFFFFF" size="small" />
      ) : (
        <Text style={styles.label}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius:      16,
    flexDirection:     'row',
    justifyContent:    'center',
    alignItems:        'center',
    gap:               8,
    alignSelf:         'flex-start',
  },
  active: {
    backgroundColor:   Colors.foundation.black,
    paddingVertical:   6,
    paddingHorizontal: 12,
  },
  inactive: {
    backgroundColor:   '#C5C5C5',
    paddingVertical:   6,
    paddingHorizontal: 12,
  },
  label: {
    ...Typography.captionEmphasized,
    color: '#FFFFFF',
  },
});
