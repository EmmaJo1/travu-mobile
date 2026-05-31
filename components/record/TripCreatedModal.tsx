import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text as RNText,
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
            <Ionicons name="close" size={20} color={Colors.foundation.black} />
          </TouchableOpacity>

          <View style={styles.celebration}>
            <RNText style={styles.celebrationEmoji}>🎊</RNText>
          </View>

          <View style={styles.body}>
            <Text style={styles.title}>여행이 만들어졌어요!</Text>
            <Text style={styles.subtitle}>Day 1 부터 기록을 시작해볼까요?</Text>
          </View>

          <View style={styles.actions}>
            <AuthActionButton
              label="Day 1 기록하기"
              onPress={onStartDayOne}
              state="on"
              style={styles.actionButton}
            />
            <AuthActionButton
              label="나중에 하기"
              onPress={onClose}
              state="off"
              style={styles.actionButton}
            />
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
    ...(Platform.OS === 'web'
      ? ({ backdropFilter: 'blur(4px)' } as object)
      : null),
  },
  modal: {
    width: '100%',
    maxWidth: 329,
    height: 385,
    borderRadius: Radius.lg,
    backgroundColor: Colors.foundation.white,
    ...Shadows.modal,
  },
  closeBtn: {
    position: 'absolute',
    top: Spacing.xl,
    right: Spacing.xl,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  celebration: {
    position: 'absolute',
    top: 84,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  celebrationEmoji: {
    fontSize: 64,
    lineHeight: 76,
  },
  body: {
    position: 'absolute',
    top: 181,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  title: {
    ...Typography.title2,
    color: Colors.foundation.black,
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.body2Regular,
    color: Colors.foundation.black,
    textAlign: 'center',
  },
  actions: {
    position: 'absolute',
    left: 34.5,
    right: 34.5,
    bottom: 40,
    gap: Spacing.sm,
  },
  actionButton: {
    height: 40,
  },
});
