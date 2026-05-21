import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing } from '@/constants/theme';

interface ScreenContainerProps {
  children: React.ReactNode;
  /** true이면 ScrollView로 감싼다 (기본값: false) */
  scrollable?: boolean;
  /** 좌우 패딩 적용 여부. screenPaddingH(20px) 기준 (기본값: true) */
  withHorizontalPadding?: boolean;
  /** KeyboardAvoidingView 적용 여부 (기본값: false) */
  avoidKeyboard?: boolean;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
}

export default function ScreenContainer({
  children,
  scrollable = false,
  withHorizontalPadding = true,
  avoidKeyboard = false,
  style,
  contentContainerStyle,
}: ScreenContainerProps) {
  const paddingH = withHorizontalPadding ? Spacing.xl : 0;

  const inner = scrollable ? (
    <ScrollView
      style={styles.fill}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingHorizontal: paddingH },
        contentContainerStyle,
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.fill, { paddingHorizontal: paddingH }, contentContainerStyle]}>
      {children}
    </View>
  );

  const content = avoidKeyboard ? (
    <KeyboardAvoidingView
      style={styles.fill}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {inner}
    </KeyboardAvoidingView>
  ) : (
    inner
  );

  return (
    <SafeAreaView style={[styles.root, style]}>
      {content}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.light.bgScreen,
  },
  fill: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
});
