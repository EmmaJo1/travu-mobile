import React from 'react';
import {
  Animated,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';

import AuthActionButton from '@/components/common/AuthActionButton';
import Text from '@/components/common/AppText';
import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';

export interface TripDateRangeValue {
  startDate: string;
  endDate: string;
  isEndDateUndecided?: boolean;
}

interface TripDatePickerModalProps {
  visible: boolean;
  startDate: string;
  endDate: string;
  isEndDateUndecided?: boolean;
  onCancel: () => void;
  onSave: (range: TripDateRangeValue) => void;
}

const WEEK_DAYS = ['일', '월', '화', '수', '목', '금', '토'] as const;
const CALENDAR_MONTHS = Array.from({ length: 12 }, (_, index) => index);
const CALENDAR_SWIPE_THRESHOLD = 40;
const YEAR_GRID_COLUMN_COUNT = 3;
const YEAR_GRID_ROW_HEIGHT = 44;
const YEAR_GRID_ROW_GAP = Spacing.sm;
const YEAR_SELECTOR_HEIGHT = 224;

type CalendarView = 'days' | 'years' | 'months';

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getDayFromDateKey(dateKey: string): number {
  return Number(dateKey.split('-')[2] ?? '0');
}

function dateKeyToDate(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);

  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

function makeMonthCells(month: Date) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstDate = new Date(year, monthIndex, 1);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cells: Array<Date | null> = [];

  for (let i = 0; i < firstDate.getDay(); i += 1) {
    cells.push(null);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(year, monthIndex, day));
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

function compareDateKey(a: string, b: string): number {
  return a.localeCompare(b);
}

function formatRangeLabel(startDate: string, endDate: string, isEndDateUndecided: boolean): string {
  if (isEndDateUndecided) {
    return `${startDate.replaceAll('-', '.')} 시작 · 종료일 미정`;
  }

  return `${startDate.replaceAll('-', '.')} - ${endDate.replaceAll('-', '.')}`;
}

export default function TripDatePickerModal({
  visible,
  startDate,
  endDate,
  isEndDateUndecided = false,
  onCancel,
  onSave,
}: TripDatePickerModalProps) {
  const [draftStartDate, setDraftStartDate] = React.useState(startDate);
  const [draftEndDate, setDraftEndDate] = React.useState(endDate);
  const [draftIsEndDateUndecided, setDraftIsEndDateUndecided] = React.useState(isEndDateUndecided);
  const [selectionMode, setSelectionMode] = React.useState<'start' | 'end'>('start');
  const [calendarView, setCalendarView] = React.useState<CalendarView>('days');
  const [calendarMonth, setCalendarMonth] = React.useState(() => {
    const start = dateKeyToDate(startDate);

    return new Date(start.getFullYear(), start.getMonth(), 1);
  });
  const yearSelectorRef = React.useRef<ScrollView>(null);
  const calendarTransitionX = React.useRef(new Animated.Value(0)).current;
  const calendarTransitionOpacity = React.useRef(new Animated.Value(1)).current;
  const monthSelectorTransitionX = React.useRef(new Animated.Value(0)).current;
  const monthSelectorTransitionOpacity = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    if (visible) {
      setDraftStartDate(startDate);
      setDraftEndDate(endDate);
      setDraftIsEndDateUndecided(isEndDateUndecided);
      setSelectionMode('start');
      setCalendarView('days');
      const start = dateKeyToDate(startDate);
      setCalendarMonth(new Date(start.getFullYear(), start.getMonth(), 1));
    }
  }, [endDate, isEndDateUndecided, startDate, visible]);

  const monthCells = React.useMemo(() => makeMonthCells(calendarMonth), [calendarMonth]);
  const monthRows = React.useMemo(
    () =>
      Array.from({ length: monthCells.length / 7 }, (_, index) =>
        monthCells.slice(index * 7, index * 7 + 7),
      ),
    [monthCells],
  );
  const calendarYears = React.useMemo(
    () => Array.from({ length: 51 }, (_, index) => 2000 + index),
    [],
  );
  const monthLabel = `${calendarMonth.getFullYear()}년 ${calendarMonth.getMonth() + 1}월`;
  const isChanged =
    draftStartDate !== startDate ||
    draftEndDate !== endDate ||
    draftIsEndDateUndecided !== isEndDateUndecided;
  const isInvalid =
    !draftIsEndDateUndecided && compareDateKey(draftEndDate, draftStartDate) < 0;
  const canSave = isChanged && !isInvalid;

  const handleChangeMonth = (offset: number) => {
    setCalendarMonth((currentMonth) =>
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1),
    );
  };

  const calendarSwipeResponder = React.useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dx) > 12 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.2,
        onPanResponderRelease: (_, gestureState) => {
          if (Math.abs(gestureState.dx) < CALENDAR_SWIPE_THRESHOLD) return;

          const offset = gestureState.dx < 0 ? 1 : -1;
          calendarTransitionX.stopAnimation();
          calendarTransitionOpacity.stopAnimation();
          calendarTransitionX.setValue(offset > 0 ? 18 : -18);
          calendarTransitionOpacity.setValue(0);
          setCalendarMonth((currentMonth) =>
            new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1),
          );
          Animated.parallel([
            Animated.timing(calendarTransitionX, {
              toValue: 0,
              duration: 100,
              useNativeDriver: true,
            }),
            Animated.timing(calendarTransitionOpacity, {
              toValue: 1,
              duration: 100,
              useNativeDriver: true,
            }),
          ]).start();
        },
      }),
    [calendarTransitionOpacity, calendarTransitionX],
  );

  const monthSelectorSwipeResponder = React.useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dx) > 12 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.2,
        onPanResponderRelease: (_, gestureState) => {
          if (Math.abs(gestureState.dx) < CALENDAR_SWIPE_THRESHOLD) return;

          const offset = gestureState.dx < 0 ? 1 : -1;
          monthSelectorTransitionX.stopAnimation();
          monthSelectorTransitionOpacity.stopAnimation();
          monthSelectorTransitionX.setValue(offset > 0 ? 18 : -18);
          monthSelectorTransitionOpacity.setValue(0);
          setCalendarMonth((currentMonth) =>
            new Date(currentMonth.getFullYear() + offset, currentMonth.getMonth(), 1),
          );
          Animated.parallel([
            Animated.timing(monthSelectorTransitionX, {
              toValue: 0,
              duration: 100,
              useNativeDriver: true,
            }),
            Animated.timing(monthSelectorTransitionOpacity, {
              toValue: 1,
              duration: 100,
              useNativeDriver: true,
            }),
          ]).start();
        },
      }),
    [monthSelectorTransitionOpacity, monthSelectorTransitionX],
  );

  React.useEffect(() => {
    if (calendarView !== 'years') return;

    const yearIndex = calendarMonth.getFullYear() - calendarYears[0];
    const rowIndex = Math.floor(yearIndex / YEAR_GRID_COLUMN_COUNT);
    const rowOffset = rowIndex * (YEAR_GRID_ROW_HEIGHT + YEAR_GRID_ROW_GAP);
    const centeredOffset = Math.max(
      0,
      rowOffset - (YEAR_SELECTOR_HEIGHT - YEAR_GRID_ROW_HEIGHT) / 2,
    );

    yearSelectorRef.current?.scrollTo({ y: centeredOffset, animated: false });
  }, [calendarMonth, calendarView, calendarYears]);

  const handleSelectYear = (year: number) => {
    setCalendarMonth((currentMonth) => new Date(year, currentMonth.getMonth(), 1));
    setCalendarView('months');
  };

  const handleSelectMonth = (monthIndex: number) => {
    setCalendarMonth((currentMonth) => new Date(currentMonth.getFullYear(), monthIndex, 1));
    setCalendarView('days');
  };

  const handleSelectDay = (date: Date) => {
    const selectedDate = toDateKey(date);

    if (selectionMode === 'start') {
      setDraftStartDate(selectedDate);
      if (!draftIsEndDateUndecided && compareDateKey(draftEndDate, selectedDate) < 0) {
        setDraftEndDate(selectedDate);
      }
      setSelectionMode(draftIsEndDateUndecided ? 'start' : 'end');
      return;
    }

    setDraftIsEndDateUndecided(false);
    setDraftEndDate(selectedDate);
  };

  const handleToggleEndDateUndecided = (value: boolean) => {
    setDraftIsEndDateUndecided(value);
    if (value) {
      setSelectionMode('start');
    } else {
      setSelectionMode('end');
    }
  };

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      startDate: draftStartDate,
      endDate: draftIsEndDateUndecided ? draftStartDate : draftEndDate,
      isEndDateUndecided: draftIsEndDateUndecided,
    });
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
              style={[
                styles.draftPill,
                selectionMode === 'end' && !draftIsEndDateUndecided && styles.draftPillActive,
              ]}
              onPress={() => {
                setDraftIsEndDateUndecided(false);
                setSelectionMode('end');
              }}
            >
              <Text style={styles.draftLabel}>종료일</Text>
              <Text style={styles.draftValue}>
                {draftIsEndDateUndecided ? '종료일 미정' : draftEndDate.replaceAll('-', '.')}
              </Text>
            </Pressable>
          </View>

          <View style={styles.monthHeader}>
            {calendarView === 'days' ? (
              <>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="이전 달"
                  hitSlop={8}
                  style={styles.monthArrow}
                  onPress={() => handleChangeMonth(-1)}
                >
                  <Text style={styles.monthArrowText}>‹</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="연도와 월 선택"
                  hitSlop={8}
                  style={styles.monthLabelButton}
                  onPress={() => setCalendarView('years')}
                >
                  <Text style={styles.monthLabel}>{monthLabel}</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="다음 달"
                  hitSlop={8}
                  style={styles.monthArrow}
                  onPress={() => handleChangeMonth(1)}
                >
                  <Text style={styles.monthArrowText}>›</Text>
                </Pressable>
              </>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="달력 보기 전환"
                hitSlop={8}
                style={styles.selectorTitleButton}
                onPress={() => setCalendarView(calendarView === 'years' ? 'days' : 'years')}
              >
                <Text style={styles.monthLabel}>
                  {calendarView === 'years' ? '연도 선택' : `${calendarMonth.getFullYear()}년`}
                </Text>
              </Pressable>
            )}
          </View>

          {calendarView === 'days' && (
            <Animated.View
              {...calendarSwipeResponder.panHandlers}
              style={{
                opacity: calendarTransitionOpacity,
                transform: [{ translateX: calendarTransitionX }],
              }}
            >
              <View style={styles.weekHeader}>
                {WEEK_DAYS.map((day) => (
                  <Text key={day} style={styles.weekDay}>{day}</Text>
                ))}
              </View>

              <View style={styles.calendar}>
                {monthRows.map((week, weekIndex) => (
                  <View key={weekIndex} style={styles.calendarRow}>
                    {week.map((date, dayIndex) => {
                      if (date == null) {
                        return (
                          <View
                            key={`empty-${weekIndex}-${dayIndex}`}
                            style={styles.dayCell}
                          />
                        );
                      }

                      const dateKey = toDateKey(date);
                      const isStart = dateKey === draftStartDate;
                      const isEnd = !draftIsEndDateUndecided && dateKey === draftEndDate;
                      const isInRange =
                        !draftIsEndDateUndecided &&
                        compareDateKey(dateKey, draftStartDate) >= 0 &&
                        compareDateKey(dateKey, draftEndDate) <= 0;

                      return (
                        <Pressable
                          key={dateKey}
                          style={[
                            styles.dayCell,
                            isInRange && styles.dayInRange,
                            isStart && styles.dayStart,
                            isEnd && styles.dayEnd,
                          ]}
                          onPress={() => handleSelectDay(date)}
                        >
                          <Text
                            style={[
                              styles.dayText,
                              (isStart || isEnd) && styles.dayTextSelected,
                            ]}
                          >
                            {getDayFromDateKey(dateKey)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ))}
              </View>
            </Animated.View>
          )}

          {calendarView === 'years' && (
            <ScrollView
              ref={yearSelectorRef}
              style={styles.selectorScroll}
              contentContainerStyle={styles.selectorGrid}
              showsVerticalScrollIndicator={false}
            >
              {calendarYears.map((year) => {
                const active = year === calendarMonth.getFullYear();

                return (
                  <Pressable
                    key={year}
                    style={[styles.selectorCell, active && styles.selectorCellActive]}
                    onPress={() => handleSelectYear(year)}
                  >
                    <Text style={[styles.selectorCellText, active && styles.selectorCellTextActive]}>
                      {year}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          {calendarView === 'months' && (
            <Animated.View
              {...monthSelectorSwipeResponder.panHandlers}
              style={[
                styles.selectorGrid,
                {
                  opacity: monthSelectorTransitionOpacity,
                  transform: [{ translateX: monthSelectorTransitionX }],
                },
              ]}
            >
              {CALENDAR_MONTHS.map((monthIndex) => {
                const active = monthIndex === calendarMonth.getMonth();

                return (
                  <Pressable
                    key={monthIndex}
                    style={[styles.selectorCell, active && styles.selectorCellActive]}
                    onPress={() => handleSelectMonth(monthIndex)}
                  >
                    <Text style={[styles.selectorCellText, active && styles.selectorCellTextActive]}>
                      {monthIndex + 1}월
                    </Text>
                  </Pressable>
                );
              })}
            </Animated.View>
          )}

          <Text style={styles.selectedRange}>
            {formatRangeLabel(draftStartDate, draftEndDate, draftIsEndDateUndecided)}
          </Text>

          <View style={styles.undecidedToggleRow}>
            <View style={styles.undecidedToggleTextBlock}>
              <Text style={styles.undecidedToggleLabel}>종료일 미정</Text>
              <Text style={styles.undecidedToggleDescription}>
                종료일은 여행 중에도 설정할 수 있어요.
              </Text>
            </View>
            <Switch
              value={draftIsEndDateUndecided}
              onValueChange={handleToggleEndDateUndecided}
              trackColor={{
                false: Colors.foundation.grey100,
                true: Colors.foundation.grey800,
              }}
              thumbColor={Colors.foundation.white}
            />
          </View>

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
    maxHeight: '92%',
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: 0,
  },
  monthArrow: {
    width: 24,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthArrowText: {
    fontSize: 20,
    color: Colors.foundation.grey600,
  },
  monthLabel: {
    ...Typography.body1Emphasized,
    color: Colors.foundation.black,
  },
  monthLabelButton: {
    minHeight: 32,
    justifyContent: 'center',
  },
  selectorTitleButton: {
    minHeight: 32,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
  },
  weekDay: {
    ...Typography.captionRegular,
    color: Colors.foundation.grey500,
    width: 36,
    textAlign: 'center',
  },
  calendar: {
    gap: 4,
    marginVertical: Spacing.sm,
  },
  calendarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  selectorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    alignContent: 'flex-start',
    paddingVertical: Spacing.md,
  },
  selectorScroll: {
    maxHeight: YEAR_SELECTOR_HEIGHT,
  },
  selectorCell: {
    width: '30%',
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.sm,
    backgroundColor: Colors.foundation.white,
  },
  selectorCellActive: {
    backgroundColor: Colors.foundation.black,
  },
  selectorCellText: {
    ...Typography.body2Regular,
    color: Colors.foundation.grey600,
  },
  selectorCellTextActive: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.white,
  },
  dayCell: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.xs,
  },
  dayInRange: {
    backgroundColor: Colors.warm.white,
  },
  dayStart: {
    backgroundColor: Colors.foundation.black,
    borderTopLeftRadius: Radius.sm,
    borderBottomLeftRadius: Radius.sm,
  },
  dayEnd: {
    backgroundColor: Colors.foundation.black,
    borderTopRightRadius: Radius.sm,
    borderBottomRightRadius: Radius.sm,
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
  undecidedToggleRow: {
    marginTop: Spacing.lg,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(201, 201, 201, 0.30)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  undecidedToggleTextBlock: {
    flex: 1,
    gap: 2,
  },
  undecidedToggleLabel: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.grey800,
  },
  undecidedToggleDescription: {
    ...Typography.captionRegular,
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
