import { Feather } from '@expo/vector-icons';
import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import AppTextInput from '@/components/common/AppTextInput';
import Text from '@/components/common/AppText';
import { Colors, FontFamily, Radius, Shadows, Spacing, Typography } from '@/constants/theme';

export interface StartTripSetupValue {
  destinationName: string;
  countryName: string;
  startDate: string;
  endDate: string;
}

interface StartTripSetupModalProps {
  visible: boolean;
  initialValue: StartTripSetupValue;
  onCancel: () => void;
  onSkip: () => void;
  onStart: (value: StartTripSetupValue) => void;
}

function dateKeyToDisplay(dateKey: string): string {
  return dateKey.replaceAll('-', '.');
}

function displayToDateKey(value: string, fallback: string): string {
  const normalized = value.trim().replaceAll('/', '.').replaceAll('-', '.');
  const match = normalized.match(/^(\d{4})\.(\d{1,2})\.(\d{1,2})$/);

  if (!match) {
    return fallback;
  }

  const [, year, month, day] = match;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function splitDestination(value: string, fallback: StartTripSetupValue) {
  const [destinationPart, countryPart] = value.split(',').map((part) => part.trim());

  return {
    destinationName: destinationPart || fallback.destinationName,
    countryName: countryPart || fallback.countryName,
  };
}

export default function StartTripSetupModal({
  visible,
  initialValue,
  onCancel,
  onSkip,
  onStart,
}: StartTripSetupModalProps) {
  const [destinationInput, setDestinationInput] = React.useState('');
  const [startDateInput, setStartDateInput] = React.useState('');
  const [endDateInput, setEndDateInput] = React.useState('');

  React.useEffect(() => {
    if (!visible) {
      return;
    }

    setDestinationInput(`${initialValue.destinationName}, ${initialValue.countryName}`);
    setStartDateInput(dateKeyToDisplay(initialValue.startDate));
    setEndDateInput(dateKeyToDisplay(initialValue.endDate));
  }, [initialValue, visible]);

  const handleStart = () => {
    const destination = splitDestination(destinationInput, initialValue);

    onStart({
      ...destination,
      startDate: displayToDateKey(startDateInput, initialValue.startDate),
      endDate: displayToDateKey(endDateInput, initialValue.endDate),
    });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.overlay} onPress={onCancel}>
        <Pressable style={styles.modal} onPress={(event) => event.stopPropagation()}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="여행 정보 설정 닫기"
            hitSlop={10}
            onPress={onCancel}
            style={styles.closeButton}
          >
            <Feather name="x" size={28} color={Colors.foundation.black} />
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
            <View style={styles.inputBox}>
              <AppTextInput
                value={destinationInput}
                onChangeText={setDestinationInput}
                placeholder="시드니, 호주"
                placeholderTextColor={Colors.foundation.grey400}
                style={styles.destinationInput}
              />
            </View>
          </View>

          <View style={styles.formBlock}>
            <Text style={styles.fieldLabel}>여행 기간</Text>
            <View style={styles.dateBox}>
              <Feather name="calendar" size={22} color={Colors.foundation.black} />
              <AppTextInput
                value={startDateInput}
                onChangeText={setStartDateInput}
                keyboardType="numbers-and-punctuation"
                placeholder="2020.03.02"
                placeholderTextColor={Colors.foundation.grey400}
                style={styles.dateInput}
              />
              <Text style={styles.dateSeparator}>~</Text>
              <AppTextInput
                value={endDateInput}
                onChangeText={setEndDateInput}
                keyboardType="numbers-and-punctuation"
                placeholder="2020.03.14"
                placeholderTextColor={Colors.foundation.grey400}
                style={styles.dateInput}
              />
            </View>
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
    borderRadius: 24,
    backgroundColor: Colors.foundation.white,
    paddingHorizontal: 24,
    paddingTop: 44,
    paddingBottom: 28,
    ...Shadows.modal,
  },
  closeButton: {
    position: 'absolute',
    top: 18,
    right: 18,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: FontFamily.pretendardBold,
    fontSize: 20,
    lineHeight: 28,
    color: Colors.foundation.black,
    textAlign: 'center',
    marginBottom: 28,
  },
  description: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.grey400,
    textAlign: 'center',
    marginBottom: 8,
  },
  helperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 40,
  },
  helperText: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.grey400,
  },
  formBlock: {
    gap: 12,
    marginBottom: 36,
  },
  fieldLabel: {
    fontFamily: FontFamily.pretendardBold,
    fontSize: 18,
    lineHeight: 24,
    color: Colors.foundation.black,
  },
  inputBox: {
    height: 64,
    borderWidth: 1,
    borderColor: Colors.foundation.grey300,
    borderRadius: Radius.sm,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  destinationInput: {
    fontFamily: FontFamily.pretendardSemiBold,
    fontSize: 18,
    lineHeight: 24,
    color: Colors.foundation.black,
    paddingVertical: 0,
  },
  dateBox: {
    height: 64,
    borderWidth: 1,
    borderColor: Colors.foundation.grey300,
    borderRadius: Radius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 24,
  },
  dateInput: {
    flex: 1,
    minWidth: 0,
    fontFamily: FontFamily.pretendardSemiBold,
    fontSize: 18,
    lineHeight: 24,
    color: Colors.foundation.black,
    paddingVertical: 0,
    textAlign: 'center',
  },
  dateSeparator: {
    fontFamily: FontFamily.pretendardSemiBold,
    fontSize: 18,
    lineHeight: 24,
    color: Colors.foundation.grey400,
  },
  primaryButton: {
    height: 48,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.foundation.black,
    marginTop: 20,
    marginBottom: 28,
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
  },
});
