/**
 * SheetActionButton
 *
 * Figma: 879:1821 "SheetActionButton" (ComponentSet)
 * — 바텀시트 내부 전체 너비 버튼
 * — 공통 크기: width=stretch(320), height=48, radius=8
 * — active=true : 검정 배경, 흰 텍스트 (Body 2 Emphasized 14/600, center)
 * — active=false: 흰 배경, border 1px #848484, 텍스트 #848484
 */
import React from 'react';
import { ActivityIndicator, Platform, StyleSheet, TouchableOpacity, type StyleProp, type ViewStyle } from 'react-native';
import Text from '@/components/common/AppText';

import { Colors, Typography } from '@/constants/theme';

interface SheetActionButtonProps {
  label: string;
  onPress: () => void;
  active?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

export default function SheetActionButton({
  label,
  onPress,
  active = true,
  loading = false,
  style,
}: SheetActionButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.75}
      style={[styles.button, active ? styles.active : styles.inactive, style]}
    >
      {loading ? (
        <ActivityIndicator
          color={active ? '#FFFFFF' : '#848484'}
          size="small"
        />
      ) : (
        <Text style={[styles.label, !active && styles.labelInactive]}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width:          320,
    height:         48,
    borderRadius:   8,
    alignSelf:      'center',
    alignItems:     'center',
    justifyContent: 'center',
  },
  active: {
    backgroundColor: Colors.foundation.black,
  },
  inactive: {
    backgroundColor: Colors.foundation.white,
    borderWidth:     1,
    borderColor:     Colors.warm.beige,
  },
  label: {
    ...Typography.body2Emphasized,
    color: '#FFFFFF',
    textAlign: 'center',
    ...(Platform.OS === 'android'
      ? { includeFontPadding: false, textAlignVertical: 'center' as const }
      : null),
  },
  labelInactive: {
    color: Colors.warm.grey,
  },
});
