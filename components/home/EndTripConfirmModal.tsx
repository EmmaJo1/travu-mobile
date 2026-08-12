import { Feather } from '@expo/vector-icons';
import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import Text from '@/components/common/AppText';
import AuthActionButton from '@/components/common/AuthActionButton';
import TripEndStatsPanel from '@/components/home/TripEndStatsPanel';
import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';

interface EndTripConfirmModalProps {
  visible: boolean;
  photoCount: number;
  placeCount: number;
  momentCount: number;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function EndTripConfirmModal({
  visible,
  photoCount,
  placeCount,
  momentCount,
  onCancel,
  onConfirm,
}: EndTripConfirmModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.overlay} onPress={onCancel}>
        <Pressable style={styles.modal} onPress={(event) => event.stopPropagation()}>
          <View style={styles.iconCircle}>
            <Feather name="power" size={28} color="#DB2222" />
          </View>

          <Text style={styles.title}>{'\uC790\uB3D9 \uAE30\uB85D\uC744 \uC885\uB8CC\uD560\uAE4C\uC694?'}</Text>
          <Text style={styles.description}>
            {'\uC774\uD6C4\uC5D0\uB294 \uC0AC\uC9C4 \uC790\uB3D9 \uC815\uB9AC\uAC00 \uC911\uB2E8\uB418\uBA70,\n\uD604\uC7AC\uAE4C\uC9C0\uC758 \uAE30\uB85D\uC740 \uB098\uC758 \uC5EC\uD589\uC5D0 \uC548\uC804\uD558\uAC8C \uC800\uC7A5\uB429\uB2C8\uB2E4.'}
          </Text>

          <TripEndStatsPanel
            photoCount={photoCount}
            placeCount={placeCount}
            recordCount={momentCount}
            style={styles.statsPanel}
          />

          <View style={styles.actionRow}>
            <AuthActionButton
              label="계속 기록하기"
              state="off"
              onPress={onCancel}
              style={styles.actionButton}
            />
            <AuthActionButton
              label="여행 종료"
              state="on"
              onPress={onConfirm}
              style={[styles.actionButton, styles.confirmButton]}
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    backgroundColor: Colors.light.bgOverlay,
  },
  modal: {
    width: '100%',
    maxWidth: 329,
    borderRadius: 24,
    backgroundColor: Colors.foundation.white,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
    alignItems: 'center',
    ...Shadows.modal,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(219, 34, 34, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  title: {
    fontFamily: Typography.title2.fontFamily,
    fontSize: 20,
    lineHeight: 28,
    color: Colors.foundation.black,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  description: {
    ...Typography.body2Regular,
    color: Colors.foundation.grey600,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  statsPanel: {
    marginBottom: 24,
  },
  actionRow: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
  confirmButton: {
    backgroundColor: '#DB2222',
  },
});
