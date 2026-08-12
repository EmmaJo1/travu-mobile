import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import Text from '@/components/common/AppText';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';

interface PhotoImportCompleteModalProps {
  visible: boolean;
  tripCount: number;
  onClose: () => void;
  onPressViewResults: () => void;
}

export default function PhotoImportCompleteModal({
  visible,
  tripCount,
  onClose,
  onPressViewResults,
}: PhotoImportCompleteModalProps) {
  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="닫기"
            hitSlop={10}
            onPress={onClose}
            style={styles.closeButton}
          >
            <Feather name="x" size={24} color={Colors.foundation.black} />
          </Pressable>

          <View style={styles.checkCircle}>
            <Feather name="check" size={36} color={Colors.foundation.white} />
          </View>

          <Text style={styles.title}>지난 여행 {tripCount}개를 찾았어요!</Text>
          <Text style={styles.description}>
            사진첩에서 발견한 여행 후보를{'\n'}
            이제 직접 확인할 수 있어요
          </Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="결과 확인하기"
            onPress={onPressViewResults}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.primaryButtonPressed,
            ]}
          >
            <Text style={styles.primaryButtonLabel}>결과 확인하기</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    backgroundColor: Colors.light.bgOverlay,
  },
  card: {
    width: '100%',
    maxWidth: 324,
    minHeight: 286,
    alignItems: 'center',
    paddingTop: 38,
    paddingRight: Spacing['2xl'],
    paddingBottom: 32,
    paddingLeft: Spacing['2xl'],
    borderRadius: Radius.lg,
    backgroundColor: Colors.foundation.white,
    ...{
      shadowColor: Colors.foundation.black,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.18,
      shadowRadius: 18,
      elevation: 8,
    },
  },
  closeButton: {
    position: 'absolute',
    top: 26,
    right: 24,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircle: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.full,
    backgroundColor: Colors.foundation.black,
  },
  title: {
    ...Typography.title2,
    marginTop: 30,
    color: Colors.foundation.black,
    textAlign: 'center',
    letterSpacing: 0,
  },
  description: {
    ...Typography.body2Regular,
    marginTop: 24,
    color: Colors.foundation.grey600,
    textAlign: 'center',
    letterSpacing: 0,
  },
  primaryButton: {
    width: '100%',
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 30,
    borderRadius: Radius.sm,
    backgroundColor: Colors.foundation.black,
  },
  primaryButtonPressed: {
    opacity: 0.82,
  },
  primaryButtonLabel: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.white,
    textAlign: 'center',
    letterSpacing: 0,
  },
});
