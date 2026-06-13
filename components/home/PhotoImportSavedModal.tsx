import { Feather } from '@expo/vector-icons';
import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import Text from '@/components/common/AppText';
import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';

interface PhotoImportSavedModalProps {
  visible: boolean;
  savedTripCount: number;
  onClose: () => void;
}

export default function PhotoImportSavedModal({
  visible,
  savedTripCount,
  onClose,
}: PhotoImportSavedModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.checkCircle}>
            <Feather name="check" size={24} color={Colors.foundation.white} />
          </View>

          <View style={styles.copyBlock}>
            <Text style={styles.title}>여행 {savedTripCount}개를 저장했어요</Text>
            <Text style={styles.description}>
              선택한 여행을 ‘내 여행’에서{'\n'}
              언제든 다시 확인할 수 있어요
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="확인"
            onPress={onClose}
            style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.buttonLabel}>확인</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
  },
  card: {
    width: 312,
    alignItems: 'center',
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing['3xl'],
    borderRadius: Radius.lg,
    backgroundColor: Colors.foundation.white,
    ...Shadows.modal,
  },
  checkCircle: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.full,
    backgroundColor: Colors.foundation.black,
  },
  copyBlock: {
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  title: {
    ...Typography.title2,
    color: Colors.foundation.black,
    textAlign: 'center',
    letterSpacing: 0,
  },
  description: {
    ...Typography.body2Regular,
    marginTop: Spacing.lg,
    color: Colors.foundation.grey600,
    textAlign: 'center',
    letterSpacing: 0,
  },
  button: {
    width: '100%',
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing['3xl'],
    borderRadius: Radius.sm,
    backgroundColor: Colors.foundation.black,
  },
  buttonPressed: {
    opacity: 0.82,
  },
  buttonLabel: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.white,
    textAlign: 'center',
    letterSpacing: 0,
  },
});
