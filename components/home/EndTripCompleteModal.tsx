import { Feather } from '@expo/vector-icons';
import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import AuthActionButton from '@/components/common/AuthActionButton';
import Text from '@/components/common/AppText';
import TripEndStatsPanel from '@/components/home/TripEndStatsPanel';
import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';

interface EndTripCompleteModalProps {
  visible: boolean;
  destinationName: string;
  dateRangeDescription: string;
  photoCount: number;
  placeCount: number;
  momentCount: number;
  onClose?: () => void;
  onViewMyTrips: () => void;
}

export default function EndTripCompleteModal({
  visible,
  destinationName,
  dateRangeDescription,
  photoCount,
  placeCount,
  momentCount,
  onClose,
  onViewMyTrips,
}: EndTripCompleteModalProps) {
  const handleClose = onClose ?? onViewMyTrips;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable style={styles.modal} onPress={(event) => event.stopPropagation()}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="여행 종료 완료 모달 닫기"
            hitSlop={10}
            onPress={handleClose}
            style={styles.closeButton}
          >
            <Feather name="x" size={20} color={Colors.foundation.grey800} />
          </Pressable>

          <View style={styles.iconHalo}>
            <View style={styles.iconCircle}>
              <Feather name="check" size={30} color={Colors.foundation.white} />
            </View>
          </View>

          <Text style={styles.title}>여행이 종료되었어요!</Text>
          <Text style={styles.description}>
            {destinationName} 여행의 모든 기록이{'\n'}
            '내 여행'에 저장되었습니다.
          </Text>

          <View style={styles.summaryCard}>
            <Text style={styles.dateRange}>{dateRangeDescription}</Text>
            <TripEndStatsPanel
              photoCount={photoCount}
              placeCount={placeCount}
              recordCount={momentCount}
              style={styles.statsPanel}
            />
          </View>

          <AuthActionButton
            label="방금 저장된 여행 보기"
            state="on"
            onPress={onViewMyTrips}
          />
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
    maxWidth: 337,
    borderRadius: 24,
    backgroundColor: Colors.foundation.white,
    paddingHorizontal: 26,
    paddingTop: 40,
    paddingBottom: 26,
    alignItems: 'center',
    ...Shadows.modal,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  iconHalo: {
    width: 64,
    height: 64,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(52, 168, 111, 0.12)',
    marginBottom: 22,
  },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2EA86D',
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
    lineHeight: 22,
    marginBottom: 24,
  },
  summaryCard: {
    alignSelf: 'stretch',
    borderRadius: Radius.sm,
    backgroundColor: 'rgba(249, 249, 249, 0.92)',
    padding: 16,
    marginBottom: 24,
    gap: 16,
  },
  dateRange: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.grey800,
  },
  statsPanel: {
    minHeight: 0,
    paddingHorizontal: 0,
    paddingVertical: 0,
    backgroundColor: 'transparent',
  },
});
