import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import AuthActionButton from '@/components/common/AuthActionButton';
import Text from '@/components/common/AppText';
import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';

export interface TripDateRangeValue {
  startDate: string;
  endDate: string;
}

interface TripDatePickerModalProps {
  visible: boolean;
  startDate: string;
  endDate: string;
  onCancel: () => void;
  onSave: (range: TripDateRangeValue) => void;
}

const MONTH_YEAR = 2025;
const MONTH_INDEX = 10;
const MONTH_LABEL = '2025년 11월';
const WEEK_DAYS = ['일', '월', '화', '수', '목', '금', '토'] as const;

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getDayFromDateKey(dateKey: string): number {
  return Number(dateKey.split('-')[2] ?? '0');
}

function makeMonthCells() {
  const firstDate = new Date(MONTH_YEAR, MONTH_INDEX, 1);
  const daysInMonth = new Date(MONTH_YEAR, MONTH_INDEX + 1, 0).getDate();
  const cells: Array<number | null> = [];

  for (let i = 0; i < firstDate.getDay(); i += 1) {
    cells.push(null);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(day);
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

function makeDateKey(day: number): string {
  return toDateKey(new Date(MONTH_YEAR, MONTH_INDEX, day));
}

function compareDateKey(a: string, b: string): number {
  return a.localeCompare(b);
}

function formatRangeLabel(startDate: string, endDate: string): string {
  return `${startDate.replaceAll('-', '.')} - ${endDate.replaceAll('-', '.')}`;
}

const MONTH_CELLS = makeMonthCells();

export default function TripDatePickerModal({
  visible,
  startDate,
  endDate,
  onCancel,
  onSave,
}: TripDatePickerModalProps) {
  const [draftStartDate, setDraftStartDate] = React.useState(startDate);
  const [draftEndDate, setDraftEndDate] = React.useState(endDate);
  const [selectionMode, setSelectionMode] = React.useState<'start' | 'end'>('start');

  React.useEffect(() => {
    if (visible) {
      setDraftStartDate(startDate);
      setDraftEndDate(endDate);
      setSelectionMode('start');
    }
  }, [endDate, startDate, visible]);

  const isChanged = draftStartDate !== startDate || draftEndDate !== endDate;
  const isInvalid = compareDateKey(draftEndDate, draftStartDate) < 0;
  const canSave = isChanged && !isInvalid;

  const handleSelectDay = (day: number) => {
    const selectedDate = makeDateKey(day);

    if (selectionMode === 'start') {
      setDraftStartDate(selectedDate);
      if (compareDateKey(draftEndDate, selectedDate) < 0) {
        setDraftEndDate(selectedDate);
      }
      setSelectionMode('end');
      return;
    }

    setDraftEndDate(selectedDate);
  };

  const handleSave = () => {
    if (!canSave) return;
    onSave({ startDate: draftStartDate, endDate: draftEndDate });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.overlay} onPress={onCancel}>
        <Pressable style={styles.modal} onPress={(event) => event.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.title}>여행 기간 수정</Text>
            <Pressable hitSlop={12} onPress={onCancel}>
              <Text style={styles.closeText}>×</Text>
            </Pressable>
          </View>

          <View style={styles.draftRow}>
            <Pressable
              style={[styles.draftPill, selectionMode === 'start' && styles.draftPillActive]}
              onPress={() => setSelectionMode('start')}
            >
              <Text style={styles.draftLabel}>시작일</Text>
              <Text style={styles.draftValue}>{draftStartDate.replaceAll('-', '.')}</Text>
            </Pressable>
            <Pressable
              style={[styles.draftPill, selectionMode === 'end' && styles.draftPillActive]}
              onPress={() => setSelectionMode('end')}
            >
              <Text style={styles.draftLabel}>종료일</Text>
              <Text style={styles.draftValue}>{draftEndDate.replaceAll('-', '.')}</Text>
            </Pressable>
          </View>

          <View style={styles.monthHeader}>
            <Text style={styles.monthLabel}>{MONTH_LABEL}</Text>
          </View>

          <View style={styles.weekHeader}>
            {WEEK_DAYS.map((day) => (
              <Text key={day} style={styles.weekDay}>{day}</Text>
            ))}
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.calendarGrid}>
              {MONTH_CELLS.map((day, index) => {
                if (day == null) {
                  return <View key={`empty-${index}`} style={styles.dayCell} />;
                }

                const dateKey = makeDateKey(day);
                const isStart = dateKey === draftStartDate;
                const isEnd = dateKey === draftEndDate;
                const isInRange =
                  compareDateKey(dateKey, draftStartDate) >= 0 &&
                  compareDateKey(dateKey, draftEndDate) <= 0;

                return (
                  <Pressable
                    key={dateKey}
                    style={[
                      styles.dayCell,
                      isInRange && styles.dayInRange,
                      isStart && styles.daySelected,
                      isEnd && styles.daySelected,
                    ]}
                    onPress={() => handleSelectDay(day)}
                  >
                    <Text style={[styles.dayText, (isStart || isEnd) && styles.dayTextSelected]}>
                      {day}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          <Text style={styles.selectedRange}>
            {formatRangeLabel(draftStartDate, draftEndDate)}
          </Text>

          {isInvalid ? (
            <Text style={styles.errorText}>종료일은 시작일보다 앞설 수 없습니다.</Text>
          ) : null}

          <View style={styles.actionRow}>
            <Pressable style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelLabel}>취소</Text>
            </Pressable>
            <AuthActionButton
              label="저장"
              state={canSave ? 'on' : 'off'}
              onPress={handleSave}
              style={styles.saveButton}
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
    maxWidth: 350,
    maxHeight: '86%',
    borderRadius: Radius.lg,
    backgroundColor: Colors.foundation.white,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
    ...Shadows.modal,
  },
  header: {
    minHeight: 28,
    marginBottom: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    ...Typography.body1Emphasized,
    color: Colors.foundation.black,
  },
  closeText: {
    fontSize: 22,
    lineHeight: 22,
    color: Colors.foundation.black,
  },
  draftRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  draftPill: {
    flex: 1,
    minHeight: 56,
    borderWidth: 1,
    borderColor: Colors.warm.beige,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    justifyContent: 'center',
    gap: 2,
  },
  draftPillActive: {
    borderColor: Colors.foundation.black,
  },
  draftLabel: {
    ...Typography.captionEmphasized,
    color: Colors.foundation.grey500,
  },
  draftValue: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.black,
  },
  monthHeader: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  monthLabel: {
    ...Typography.body1Emphasized,
    color: Colors.foundation.black,
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  weekDay: {
    ...Typography.captionRegular,
    width: 38,
    textAlign: 'center',
    color: Colors.foundation.grey500,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 4,
    paddingBottom: Spacing.sm,
  },
  dayCell: {
    width: `${100 / 7}%`,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.xs,
  },
  dayInRange: {
    backgroundColor: Colors.warm.white,
  },
  daySelected: {
    backgroundColor: Colors.foundation.black,
  },
  dayText: {
    ...Typography.body2Regular,
    color: Colors.foundation.black,
  },
  dayTextSelected: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.white,
  },
  selectedRange: {
    ...Typography.body2Regular,
    marginTop: Spacing.sm,
    textAlign: 'center',
    color: Colors.foundation.grey600,
  },
  errorText: {
    ...Typography.captionEmphasized,
    marginTop: Spacing.sm,
    textAlign: 'center',
    color: '#DB2222',
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  cancelButton: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: Colors.warm.beige,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.foundation.white,
  },
  cancelLabel: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.black,
  },
  saveButton: {
    flex: 1,
  },
});
