import { Feather } from '@expo/vector-icons';
import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import AuthActionButton from '@/components/common/AuthActionButton';
import DestinationSelectModal from '@/components/common/DestinationSelectModal';
import Text from '@/components/common/AppText';
import TripDateRangePickerModal, {
  dateToDateKey,
  formatCompactTripDateRangeLabel,
  type TripDateRangePickerValue,
} from '@/components/record/TripDateRangePickerModal';
import type { DestinationOption } from '@/constants/mockTripDestinations';
import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';

const SECTION_GAP = Spacing['2xl'] + Spacing.xs;

function createTodayLocalDate(): Date {
  const today = new Date();

  return new Date(today.getFullYear(), today.getMonth(), today.getDate());
}

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
  isQuickStarting?: boolean;
  onStart: (value: StartTripSetupValue) => void;
}

export default function StartTripSetupModal({
  visible,
  initialValue,
  onCancel,
  onSkip,
  isQuickStarting = false,
  onStart,
}: StartTripSetupModalProps) {
  const [isDatePickerVisible, setDatePickerVisible] = React.useState(false);
  const [isDestinationSelectVisible, setDestinationSelectVisible] = React.useState(false);
  const [selectedDestination, setSelectedDestination] =
    React.useState<DestinationOption | null>(null);
  const [tripDateRange, setTripDateRange] = React.useState<TripDateRangePickerValue>({
    startDate: null,
    endDate: null,
    isEndDateUndecided: false,
  });

  const datePickerInitialRange = React.useMemo<TripDateRangePickerValue>(() => {
    if (tripDateRange.startDate) return tripDateRange;

    return {
      startDate: createTodayLocalDate(),
      endDate: tripDateRange.endDate,
      isEndDateUndecided: tripDateRange.isEndDateUndecided,
    };
  }, [tripDateRange]);

  React.useEffect(() => {
    if (!visible) return;

    setTripDateRange({
      startDate: null,
      endDate: null,
      isEndDateUndecided: false,
    });
    setSelectedDestination(null);
    setDatePickerVisible(false);
    setDestinationSelectVisible(false);
  }, [visible]);

  const hasSelectedDestination = Boolean(selectedDestination);
  const hasSelectedStartDate = Boolean(tripDateRange.startDate);
  const hasSelectedEndDate = Boolean(tripDateRange.endDate);
  const canStartTrip =
    hasSelectedDestination &&
    hasSelectedStartDate &&
    (hasSelectedEndDate || tripDateRange.isEndDateUndecided);

  const handleStart = () => {
    if (!canStartTrip || !selectedDestination || !tripDateRange.startDate) {
      return;
    }

    const startDate = dateToDateKey(tripDateRange.startDate);
    const endDate = tripDateRange.endDate
      ? dateToDateKey(tripDateRange.endDate)
      : startDate;

    onStart({
      ...initialValue,
      destinationName: selectedDestination.name ?? selectedDestination.displayName,
      countryName: selectedDestination.country ?? selectedDestination.countryName ?? '',
      startDate,
      endDate,
      isEndDateUndecided: tripDateRange.isEndDateUndecided,
    });
  };

  const selectedDestinationCountry =
    selectedDestination?.country ?? selectedDestination?.countryName ?? '';
  const destinationLabel = selectedDestination
    ? selectedDestinationCountry
      ? `${selectedDestination.name}, ${selectedDestinationCountry}`
      : selectedDestination.name
    : '도시나 국가를 검색해주세요';

  return (
    <>
      <Modal
        visible={visible && !isDatePickerVisible && !isDestinationSelectVisible}
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
                label={destinationLabel}
                accessibilityLabel="여행지 선택"
                selected={Boolean(selectedDestination)}
                onPress={() => setDestinationSelectVisible(true)}
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

            <AuthActionButton
              disabled={!canStartTrip}
              label="여행 시작하기"
              onPress={handleStart}
              state={canStartTrip ? 'on' : 'off'}
              style={styles.primaryButton}
            />

            <Pressable
              accessibilityRole="button"
              disabled={isQuickStarting}
              hitSlop={10}
              onPress={onSkip}
            >
              <Text style={[styles.skipLabel, isQuickStarting && styles.skipLabelDisabled]}>
                {isQuickStarting ? '현재 위치 확인 중...' : '현재 위치로 바로 시작하기'}
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <TripDateRangePickerModal
        visible={visible && isDatePickerVisible}
        title="여행 기간 선택"
        initialStartDate={datePickerInitialRange.startDate}
        initialEndDate={datePickerInitialRange.endDate}
        initialIsEndDateUndecided={datePickerInitialRange.isEndDateUndecided}
        onCancel={() => setDatePickerVisible(false)}
        onConfirm={(value) => {
          setTripDateRange(value);
          setDatePickerVisible(false);
        }}
      />

      <DestinationSelectModal
        visible={visible && isDestinationSelectVisible}
        selectedDestination={selectedDestination}
        onClose={() => setDestinationSelectVisible(false)}
        onSelectDestination={(destination) => {
          setSelectedDestination(destination);
          setDestinationSelectVisible(false);
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
  selected = false,
}: {
  iconName: 'map-pin' | 'calendar';
  label: string;
  accessibilityLabel: string;
  onPress?: () => void;
  selected?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={styles.setupRow}
      onPress={onPress}
    >
      <Feather name={iconName} size={20} color={Colors.foundation.grey600} />
      <Text style={[styles.setupRowLabel, selected && styles.setupRowLabelSelected]}>
        {label}
      </Text>
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
  setupRowLabelSelected: {
    color: Colors.foundation.black,
  },
  primaryButton: {
    marginTop: Spacing.sm,
    marginBottom: SECTION_GAP,
  },
  skipLabel: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.grey600,
    textAlign: 'center',
    textDecorationLine: 'underline',
    transform: [{ translateY: -2 }],
  },
  skipLabelDisabled: {
    color: Colors.foundation.grey400,
  },
});
