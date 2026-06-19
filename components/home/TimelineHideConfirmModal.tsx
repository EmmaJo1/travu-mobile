import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import Text from '@/components/common/AppText';
import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';

interface TimelineHideConfirmModalProps {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function TimelineHideConfirmModal({
  visible,
  onCancel,
  onConfirm,
}: TimelineHideConfirmModalProps) {
  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onCancel}>
      <View style={styles.modalRoot}>
        <View style={styles.backdrop} />
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Feather name="eye-off" size={26} color="#E02D2D" />
          </View>

          <Text style={styles.title}>이 장소를 타임라인에서 숨길까요?</Text>
          <Text style={styles.description}>사진은 삭제되지 않아요.</Text>

          <View style={styles.buttonRow}>
            <Pressable accessibilityRole="button" onPress={onCancel} style={styles.cancelButton}>
              <Text style={styles.cancelText}>취소</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={onConfirm} style={styles.hideButton}>
              <Text style={styles.hideText}>숨기기</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.light.bgOverlay,
  },
  card: {
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing['2xl'],
    borderRadius: Radius.lg,
    backgroundColor: Colors.foundation.white,
    ...Shadows.modal,
  },
  iconCircle: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.full,
    backgroundColor: 'rgba(224, 45, 45, 0.10)',
    marginBottom: Spacing.xl,
  },
  title: {
    ...Typography.title2,
    color: Colors.foundation.black,
    textAlign: 'center',
  },
  description: {
    ...Typography.body2Regular,
    color: Colors.foundation.grey600,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  buttonRow: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing['2xl'],
  },
  cancelButton: {
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.light.borderDefault,
    borderRadius: Radius.sm,
    backgroundColor: Colors.foundation.white,
  },
  hideButton: {
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.sm,
    backgroundColor: '#E02D2D',
  },
  cancelText: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.black,
  },
  hideText: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.white,
  },
});
