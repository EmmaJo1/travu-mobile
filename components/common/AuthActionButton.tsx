/**
 * AuthActionButton
 *
 * Figma: 808:1133 "AuthActionButton" (ComponentSet)
 * — 로그인·회원가입 화면 전용 전체 너비 액션 버튼
 * — 공통 크기: width=stretch(320), height=48, radius=8
 * — state=on : 검정 배경, 흰 텍스트 (Body 2 Emphasized 14/600)
 * — state=off: 흰 배경, border 1px #E3DBD8, 텍스트 #A29C9A
 */
import React from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Colors, Typography } from '@/constants/theme';

interface AuthActionButtonProps {
  label: string;
  onPress: () => void;
  /** state=on(기본 액션) / state=off(보조 액션) */
  state?: 'on' | 'off';
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

export default function AuthActionButton({
  label,
  onPress,
  state = 'on',
  loading = false,
  style,
}: AuthActionButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.75}
      style={[styles.button, state === 'on' ? styles.on : styles.off, style]}
    >
      {loading ? (
        <ActivityIndicator
          color={state === 'on' ? '#FFFFFF' : Colors.warm.grey}
          size="small"
        />
      ) : (
        <Text style={[styles.label, state === 'off' && styles.labelOff]}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    height:         48,
    borderRadius:   8,
    alignSelf:      'stretch',
    alignItems:     'center',
    justifyContent: 'center',
  },
  on: {
    backgroundColor: Colors.foundation.black,
  },
  off: {
    backgroundColor: Colors.foundation.white,
    borderWidth:     1,
    borderColor:     Colors.warm.beige,   // #E3DBD8
  },
  label: {
    ...Typography.body2Emphasized,
    color: '#FFFFFF',
    textAlign: 'center',
    ...(Platform.OS === 'android'
      ? { includeFontPadding: false, textAlignVertical: 'center' as const }
      : null),
  },
  labelOff: {
    color: Colors.warm.grey,              // #A29C9A
  },
});
