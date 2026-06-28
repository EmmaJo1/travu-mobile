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
  dateKeyToDate,
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

function getDestinationKey(destination: DestinationOption) {
  const name = (destination.name ?? destination.displayName).trim().toLowerCase();
  const country = (destination.country ?? destination.countryName ?? '').trim().toLowerCase();

  return `${name}|${country}`;
}

function mergeDestinationSelection(
  destinations: DestinationOption[],
  destination: DestinationOption,
) {
  const nextKey = getDestinationKey(destination);

  if (destinations.some((selected) => getDestinationKey(selected) === nextKey)) {
    return destinations;
  }

  return [...destinations, destination];
}

function getDestinationCountry(destination: DestinationOption) {
  return destination.country ?? destination.countryName ?? '';
}

function getDestinationDisplayName(destination: DestinationOption) {
  return destination.name ?? destination.displayName;
}

function getUniqueValues(values: string[]) {
  const valueMap = new Map<string, string>();

  values.forEach((value) => {
    const normalizedValue = value.trim();

    if (!normalizedValue) return;

    valueMap.set(normalizedValue.toLowerCase(), normalizedValue);
  });

  return [...valueMap.values()];
}

function formatDestinationSummary(destinations: DestinationOption[]) {
  if (destinations.length === 0) {
    return '도시나 국가를 추가해주세요';
  }

  const names = destinations.map(getDestinationDisplayName);

  if (names.length <= 3) {
    return names.join(', ');
  }

  return `${names.slice(0, 3).join(', ')} 외 ${names.length - 3}곳`;
}

export interface StartTripSetupValue {
  destinationName: string;
  countryName: string;
  destinations?: DestinationOption[];
  visitedCities?: string[];
  visitedCountries?: string[];
  startDate: string;
  endDate: string;
  isEndDateUndecided?: boolean;
}

interface StartTripSetupModalProps {
  visible: boolean;
  initialValue: StartTripSetupValue;
  onCancel: () => void;
  onSkip?: () => void;
  isQuickStarting?: boolean;
  mode?: 'create' | 'edit';
  onStart: (value: StartTripSetupValue) => void;
}

export default function StartTripSetupModal({
  visible,
  initialValue,
  onCancel,
  onSkip,
  isQuickStarting = false,
  mode = 'create',
  onStart,
}: StartTripSetupModalProps) {
  const isEditMode = mode === 'edit';
  const [isDatePickerVisible, setDatePickerVisible] = React.useState(false);
  const [isDestinationSelectVisible, setDestinationSelectVisible] = React.useState(false);
  const [selectedDestinations, setSelectedDestinations] = React.useState<DestinationOption[]>([]);
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

    if (isEditMode) {
      setTripDateRange({
        startDate: dateKeyToDate(initialValue.startDate),
        endDate: initialValue.isEndDateUndecided ? null : dateKeyToDate(initialValue.endDate),
        isEndDateUndecided: initialValue.isEndDateUndecided ?? false,
      });
      setSelectedDestinations(initialValue.destinations ?? []);
      setDatePickerVisible(false);
      setDestinationSelectVisible(false);
      return;
    }

    setTripDateRange({
      startDate: null,
      endDate: null,
      isEndDateUndecided: false,
    });
    setSelectedDestinations(initialValue.destinations ?? []);
    setDatePickerVisible(false);
    setDestinationSelectVisible(false);
  }, [
    initialValue.destinations,
    initialValue.endDate,
    initialValue.isEndDateUndecided,
    initialValue.startDate,
    isEditMode,
    visible,
  ]);

  const selectedDestination = selectedDestinations[0] ?? null;
  const hasSelectedStartDate = Boolean(tripDateRange.startDate);
  const hasSelectedEndDate = Boolean(tripDateRange.endDate);
  const hasRequiredDestination = !isEditMode || selectedDestinations.length > 0;
  const canStartTrip =
    hasRequiredDestination &&
    hasSelectedStartDate &&
    (hasSelectedEndDate || tripDateRange.isEndDateUndecided);

  const handleStart = () => {
    if (!canStartTrip || !tripDateRange.startDate) {
      return;
    }

    const startDate = dateToDateKey(tripDateRange.startDate);
    const endDate = tripDateRange.endDate
      ? dateToDateKey(tripDateRange.endDate)
      : startDate;
    const visitedCities = getUniqueValues(
      selectedDestinations
        .filter((destination) => destination.type !== 'country')
        .map(getDestinationDisplayName),
    );
    const visitedCountries = getUniqueValues(
      selectedDestinations
        .map((destination) => getDestinationCountry(destination))
        .filter(Boolean),
    );

    onStart({
      ...initialValue,
      destinationName: selectedDestination ? getDestinationDisplayName(selectedDestination) : '',
      countryName: selectedDestination ? getDestinationCountry(selectedDestination) : '',
      destinations: selectedDestinations,
      visitedCities,
      visitedCountries,
      startDate,
      endDate,
      isEndDateUndecided: tripDateRange.isEndDateUndecided,
    });
  };

  const destinationLabel = formatDestinationSummary(selectedDestinations);
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

            <Text style={styles.title}>
              {isEditMode ? '여행 정보를 수정해주세요' : '여행 정보를 설정해주세요'}
            </Text>
            {!isEditMode ? (
              <View style={styles.helperRow}>
                <Feather name="info" size={14} color={Colors.foundation.grey400} />
                <Text style={styles.helperText}>모든 설정은 여행 중에도 변경할 수 있어요</Text>
              </View>
            ) : null}

            <View style={styles.formBlock}>
              <Text style={styles.fieldLabel}>여행지 (선택)</Text>
              <SetupRow
                iconName="map-pin"
                label={destinationLabel}
                accessibilityLabel="여행지 선택"
                selected={selectedDestinations.length > 0}
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
              label={isEditMode ? '수정 완료' : '여행 시작하기'}
              onPress={handleStart}
              state={canStartTrip ? 'on' : 'off'}
              style={styles.primaryButton}
            />

            {!isEditMode && onSkip ? (
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
            ) : null}
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
        selectedDestinations={selectedDestinations}
        onClose={() => setDestinationSelectVisible(false)}
        onSelectDestination={(destination) => {
          setSelectedDestinations((current) => mergeDestinationSelection(current, destination));
        }}
        onConfirmDestinations={(destinations) => {
          setSelectedDestinations(destinations);
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
