import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import Text from '@/components/common/AppText';

import AuthActionButton from '@/components/common/AuthActionButton';
import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';

interface TripCreatedModalProps {
  visible: boolean;
  onClose: () => void;
  onStartDayOne: () => void;
}

export default function TripCreatedModal({
  visible,
  onClose,
  onStartDayOne,
}: TripCreatedModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.modal} onPress={(e) => e.stopPropagation()}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={12}>
            <Text style={styles.closeText}>×</Text>
          </TouchableOpacity>

          <View style={styles.body}>
            <Text style={styles.title}>여행이 만들어졌어요!</Text>
            <Text style={styles.subtitle}>Day 1 부터 기록을 시작해볼까요?</Text>
          </View>

          <View style={styles.actions}>
            <AuthActionButton label="Day 1 기록하기" onPress={onStartDayOne} state="on" />
            <AuthActionButton label="나중에 하기" onPress={onClose} state="off" />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.light.bgOverlay,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  modal: {
    width: '100%',
    maxWidth: 329,
    minHeight: 280,
    borderRadius: Radius.lg,
    backgroundColor: Colors.foundation.white,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing['2xl'],
    paddingBottom: Spacing.xl,
    ...Shadows.modal,
  },
  closeBtn: {
    position: 'absolute',
    top: Spacing.lg,
    right: Spacing.lg,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  closeText: {
    fontSize: 20,
    lineHeight: 20,
    color: Colors.foundation.black,
  },
  body: {
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing['2xl'],
    paddingTop: Spacing.md,
  },
  title: {
    ...Typography.title2,
    color: Colors.foundation.black,
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.body2Regular,
    color: Colors.foundation.grey600,
    textAlign: 'center',
  },
  actions: {
    gap: Spacing.sm,
  },
});
