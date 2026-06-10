import { Feather } from '@expo/vector-icons';
import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import Text from '@/components/common/AppText';
import TripDateRangePickerModal, {
  dateToDateKey,
  formatCompactTripDateRangeLabel,
  type TripDateRangePickerValue,
} from '@/components/record/TripDateRangePickerModal';
import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';

const SECTION_GAP = Spacing['2xl'] + Spacing.xs;

export interface StartTripSetupValue {
  destinationName: string;
  countryName: string;
  startDate: string;
  endDate: string;
  isEndDateUndecided?: boolean;
}

interface StartTripSetupModalProps {
  visible: boolean;
  initialValue: StartTripSetupValue;
  onCancel: () => void;
  onSkip: () => void;
  onStart: (value: StartTripSetupValue) => void;
}

export default function StartTripSetupModal({
  visible,
  initialValue,
  onCancel,
  onSkip,
  onStart,
}: StartTripSetupModalProps) {
  const [isDatePickerVisible, setDatePickerVisible] = React.useState(false);
  const [tripDateRange, setTripDateRange] = React.useState<TripDateRangePickerValue>({
    startDate: null,
    endDate: null,
    isEndDateUndecided: false,
  });

  React.useEffect(() => {
    if (!visible) return;

    setTripDateRange({
      startDate: null,
      endDate: null,
      isEndDateUndecided: false,
    });
    setDatePickerVisible(false);
  }, [visible]);

  const handleStart = () => {
    const startDate = tripDateRange.startDate
      ? dateToDateKey(tripDateRange.startDate)
      : initialValue.startDate;
    const endDate = tripDateRange.endDate
      ? dateToDateKey(tripDateRange.endDate)
      : startDate;

    onStart({
      ...initialValue,
      startDate,
      endDate,
      isEndDateUndecided: tripDateRange.isEndDateUndecided,
    });
  };

  return (
    <>
      <Modal
        visible={visible && !isDatePickerVisible}
        transparent
        animationType="fade"
        onRequestClose={onCancel}
      >
        <Pressable style={styles.overlay} onPress={onCancel}>
          <Pressable style={styles.modal} onPress={(event) => event.stopPropagation()}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="여행 정보 설정 닫기"
              hitSlop={10}
              onPress={onCancel}
              style={styles.closeButton}
            >
              <Feather name="x" size={24} color={Colors.foundation.black} />
            </Pressable>

            <Text style={styles.title}>여행 정보를 설정해주세요</Text>
            <Text style={styles.description}>
              여행지와 기간을 설정하면 기록이 더 정확하게 정리돼요
            </Text>
            <View style={styles.helperRow}>
              <Feather name="info" size={14} color={Colors.foundation.grey400} />
              <Text style={styles.helperText}>모든 설정은 여행 중에도 변경할 수 있어요</Text>
            </View>

            <View style={styles.formBlock}>
              <Text style={styles.fieldLabel}>여행지</Text>
              <SetupRow
                iconName="map-pin"
                label="도시나 국가를 검색해주세요"
                accessibilityLabel="여행지 선택"
              />
            </View>

            <View style={styles.formBlock}>
              <Text style={styles.fieldLabel}>여행 기간</Text>
              <SetupRow
                iconName="calendar"
                label={formatCompactTripDateRangeLabel(tripDateRange)}
                accessibilityLabel="여행 기간 선택"
                onPress={() => setDatePickerVisible(true)}
              />
            </View>

            <Pressable accessibilityRole="button" style={styles.primaryButton} onPress={handleStart}>
              <Text style={styles.primaryLabel}>여행 시작하기</Text>
            </Pressable>

            <Pressable accessibilityRole="button" hitSlop={10} onPress={onSkip}>
              <Text style={styles.skipLabel}>건너뛰고 바로 시작하기</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <TripDateRangePickerModal
        visible={visible && isDatePickerVisible}
        title="여행 기간 선택"
        initialStartDate={tripDateRange.startDate}
        initialEndDate={tripDateRange.endDate}
        initialIsEndDateUndecided={tripDateRange.isEndDateUndecided}
        onCancel={() => setDatePickerVisible(false)}
        onConfirm={(value) => {
          setTripDateRange(value);
          setDatePickerVisible(false);
        }}
      />
    </>
  );
}

function SetupRow({
  iconName,
  label,
  accessibilityLabel,
  onPress,
}: {
  iconName: 'map-pin' | 'calendar';
  label: string;
  accessibilityLabel: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={styles.setupRow}
      onPress={onPress}
    >
      <Feather name={iconName} size={20} color={Colors.foundation.grey600} />
      <Text style={styles.setupRowLabel}>{label}</Text>
      <Feather name="chevron-right" size={22} color={Colors.foundation.grey600} />
    </Pressable>
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
    maxWidth: 349,
    borderRadius: Radius.lg,
    backgroundColor: Colors.foundation.white,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing['4xl'],
    paddingBottom: SECTION_GAP,
    ...Shadows.modal,
  },
  closeButton: {
    position: 'absolute',
    top: Spacing.lg,
    right: Spacing.lg,
    width: Spacing['4xl'] - Spacing.xs,
    height: Spacing['4xl'] - Spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...Typography.title2,
    color: Colors.foundation.black,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  description: {
    ...Typography.body2Emphasized,
    fontSize: 13,
    color: Colors.foundation.grey400,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  helperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing['2xl'] + Spacing.xs,
  },
  helperText: {
    ...Typography.body2Emphasized,
    fontSize: 13,
    color: Colors.foundation.grey400,
  },
  formBlock: {
    gap: Spacing.sm,
    marginBottom: SECTION_GAP,
  },
  fieldLabel: {
    ...Typography.body1Emphasized,
    color: Colors.foundation.black,
  },
  setupRow: {
    height: Spacing['4xl'] + Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.warm.beige,
    borderRadius: Radius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingLeft: Spacing.lg,
    paddingRight: Spacing.md,
    backgroundColor: Colors.foundation.white,
  },
  setupRowLabel: {
    flex: 1,
    minWidth: 0,
    ...Typography.body1Regular,
    color: Colors.foundation.grey500,
  },
  primaryButton: {
    height: Spacing['4xl'],
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.foundation.black,
    marginTop: Spacing.sm,
    marginBottom: SECTION_GAP,
  },
  primaryLabel: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.white,
    textAlign: 'center',
  },
  skipLabel: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.grey600,
    textAlign: 'center',
    textDecorationLine: 'underline',
    transform: [{ translateY: -2 }],
  },
});
