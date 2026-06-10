import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  Animated,
  Image,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
  View,
} from 'react-native';

import AuthActionButton from '@/components/common/AuthActionButton';
import Text from '@/components/common/AppText';
import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';

export interface TripDateRangePickerValue {
  startDate: Date | null;
  endDate: Date | null;
  isEndDateUndecided: boolean;
}

interface TripDateRangePickerModalProps {
  visible: boolean;
  title?: string;
  initialStartDate?: Date | null;
  initialEndDate?: Date | null;
  initialIsEndDateUndecided?: boolean;
  showEndDateUndecided?: boolean;
  onCancel: () => void;
  onConfirm: (value: TripDateRangePickerValue) => void;
}

type CalendarView = 'days' | 'years' | 'months';

const CALENDAR_MONTHS = Array.from({ length: 12 }, (_, index) => index);
const CALENDAR_SWIPE_THRESHOLD = 40;
const YEAR_GRID_COLUMN_COUNT = 3;
const YEAR_GRID_ROW_HEIGHT = 44;
const YEAR_GRID_ROW_GAP = Spacing.sm;
const YEAR_SELECTOR_HEIGHT = 224;

export function createCurrentCalendarMonth(): Date {
  const today = new Date();

  return new Date(today.getFullYear(), today.getMonth(), 1);
}

function createCalendarWeeks(month: Date): (Date | null)[][] {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstDay = new Date(year, monthIndex, 1).getDay();
  const lastDate = new Date(year, monthIndex + 1, 0).getDate();
  const cells: (Date | null)[] = Array.from({ length: firstDay }, () => null);

  for (let day = 1; day <= lastDate; day += 1) {
    cells.push(new Date(year, monthIndex, day));
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return Array.from({ length: cells.length / 7 }, (_, index) =>
    cells.slice(index * 7, index * 7 + 7),
  );
}

export function dateToDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function dateKeyToDate(dateKey: string | null | undefined): Date | null {
  if (!dateKey) return null;

  const [year, month, day] = dateKey.split('-').map(Number);
  if (!year || !month || !day) return null;

  return new Date(year, month - 1, day);
}

function formatDateKey(dateKey: string): string {
  return dateKey.replaceAll('-', '.');
}

export function formatTripDateRangeLabel(value: TripDateRangePickerValue): string {
  if (!value.startDate) return '날짜를 선택하세요';

  const startKey = dateToDateKey(value.startDate);
  if (value.isEndDateUndecided) return `${formatDateKey(startKey)} 시작 · 종료일 미정`;
  if (!value.endDate) return `${formatDateKey(startKey)} - 종료일 선택`;

  return `${formatDateKey(startKey)} - ${formatDateKey(dateToDateKey(value.endDate))}`;
}

export function formatCompactTripDateRangeLabel(value: TripDateRangePickerValue): string {
  if (!value.startDate) return '여행 기간을 선택해주세요';

  const start = value.startDate;
  if (value.isEndDateUndecided || !value.endDate) {
    return `${start.getFullYear()}. ${start.getMonth() + 1}. ${start.getDate()} 시작 · 종료일 미정`;
  }

  const end = value.endDate;
  return `${start.getFullYear()}. ${start.getMonth() + 1}. ${start.getDate()} - ${end.getMonth() + 1}. ${end.getDate()}`;
}

export default function TripDateRangePickerModal({
  visible,
  title = '여행 기간 선택',
  initialStartDate = null,
  initialEndDate = null,
  initialIsEndDateUndecided = false,
  showEndDateUndecided = true,
  onCancel,
  onConfirm,
}: TripDateRangePickerModalProps) {
  const [calendarMonth, setCalendarMonth] = useState(() =>
    initialStartDate
      ? new Date(initialStartDate.getFullYear(), initialStartDate.getMonth(), 1)
      : createCurrentCalendarMonth(),
  );
  const [calendarView, setCalendarView] = useState<CalendarView>('days');
  const [startDate, setStartDate] = useState<Date | null>(initialStartDate);
  const [endDate, setEndDate] = useState<Date | null>(initialEndDate);
  const [isEndDateUndecided, setIsEndDateUndecided] = useState(initialIsEndDateUndecided);
  const yearSelectorRef = useRef<ScrollView>(null);
  const calendarTransitionX = useRef(new Animated.Value(0)).current;
  const calendarTransitionOpacity = useRef(new Animated.Value(1)).current;
  const monthSelectorTransitionX = useRef(new Animated.Value(0)).current;
  const monthSelectorTransitionOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!visible) return;

    setStartDate(initialStartDate);
    setEndDate(initialEndDate);
    setIsEndDateUndecided(showEndDateUndecided ? initialIsEndDateUndecided : false);
    setCalendarMonth(
      initialStartDate
        ? new Date(initialStartDate.getFullYear(), initialStartDate.getMonth(), 1)
        : createCurrentCalendarMonth(),
    );
    setCalendarView('days');
  }, [initialEndDate, initialIsEndDateUndecided, initialStartDate, showEndDateUndecided, visible]);

  const calendarWeeks = useMemo(() => createCalendarWeeks(calendarMonth), [calendarMonth]);
  const calendarYears = useMemo(
    () => Array.from({ length: 51 }, (_, index) => 2000 + index),
    [],
  );
  const calendarMonthLabel = `${calendarMonth.getFullYear()}년 ${calendarMonth.getMonth() + 1}월`;
  const canConfirm = Boolean(startDate) && (isEndDateUndecided || Boolean(endDate));

  const calendarSwipeResponder = useMemo(
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
          setCalendarMonth(
            (currentMonth) =>
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

  const monthSelectorSwipeResponder = useMemo(
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
          setCalendarMonth(
            (currentMonth) =>
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

  useEffect(() => {
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

  const handleBack = () => {
    if (calendarView === 'months') {
      setCalendarView('years');
      return;
    }

    if (calendarView === 'years') {
      setCalendarView('days');
      return;
    }

    onCancel();
  };

  const handleSelectDate = (date: Date) => {
    if (showEndDateUndecided && isEndDateUndecided) {
      setStartDate(date);
      setEndDate(null);
      return;
    }

    if (!startDate || endDate || date < startDate) {
      setStartDate(date);
      setEndDate(null);
      return;
    }

    setEndDate(date);
  };

  const handleToggleEndDateUndecided = (value: boolean) => {
    if (value) {
      setEndDate(null);
      setIsEndDateUndecided(true);
      return;
    }

    setIsEndDateUndecided(false);
  };

  const handleChangeMonth = (offset: number) => {
    setCalendarMonth(
      (currentMonth) =>
        new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1),
    );
  };

  const handleSelectYear = (year: number) => {
    setCalendarMonth((currentMonth) => new Date(year, currentMonth.getMonth(), 1));
    setCalendarView('months');
  };

  const handleSelectMonth = (monthIndex: number) => {
    setCalendarMonth((currentMonth) => new Date(currentMonth.getFullYear(), monthIndex, 1));
    setCalendarView('days');
  };

  const handleConfirm = () => {
    if (!canConfirm) return;

    onConfirm({
      startDate,
      endDate: showEndDateUndecided && isEndDateUndecided ? null : endDate,
      isEndDateUndecided: showEndDateUndecided && isEndDateUndecided,
    });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.overlay} onPress={onCancel}>
        <Pressable style={styles.modal} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <TouchableOpacity onPress={handleBack} style={styles.backBtn} hitSlop={8}>
              <Image
                source={require('../../assets/images/screenheader-back.png')}
                style={styles.backIcon}
                resizeMode="contain"
              />
            </TouchableOpacity>
            <Text style={styles.headerTitleStep}>{title}</Text>
            <TouchableOpacity style={styles.stepCloseBtn} onPress={onCancel} hitSlop={12}>
              <Ionicons name="close" size={20} color={Colors.foundation.black} />
            </TouchableOpacity>
          </View>

          <View style={styles.stepBody}>
            <View style={styles.monthNav}>
              {calendarView === 'days' ? (
                <>
                  <TouchableOpacity
                    style={styles.monthArrow}
                    activeOpacity={0.6}
                    onPress={() => handleChangeMonth(-1)}
                  >
                    <Text style={styles.monthArrowText}>‹</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.monthLabelButton}
                    activeOpacity={0.65}
                    onPress={() => setCalendarView('years')}
                  >
                    <Text style={styles.monthLabel}>{calendarMonthLabel}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.monthArrow}
                    activeOpacity={0.6}
                    onPress={() => handleChangeMonth(1)}
                  >
                    <Text style={styles.monthArrowText}>›</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity
                  style={styles.selectorTitleButton}
                  activeOpacity={0.65}
                  onPress={() => setCalendarView(calendarView === 'years' ? 'days' : 'years')}
                >
                  <Text style={styles.monthLabel}>
                    {calendarView === 'years' ? '연도 선택' : `${calendarMonth.getFullYear()}년`}
                  </Text>
                </TouchableOpacity>
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
                  {['일', '월', '화', '수', '목', '금', '토'].map((d) => (
                    <Text key={d} style={styles.weekDay}>
                      {d}
                    </Text>
                  ))}
                </View>

                <View style={styles.calendar}>
                  {calendarWeeks.map((week, wi) => (
                    <View key={wi} style={styles.calendarRow}>
                      {week.map((date, di) => {
                        if (date == null) {
                          return <View key={`empty-${wi}-${di}`} style={styles.dayCell} />;
                        }

                        const dateKey = dateToDateKey(date);
                        const startKey = startDate ? dateToDateKey(startDate) : null;
                        const endKey = endDate ? dateToDateKey(endDate) : null;
                        const inRange =
                          !isEndDateUndecided &&
                          Boolean(startKey) &&
                          dateKey >= startKey! &&
                          dateKey <= (endKey ?? startKey!);
                        const isStart = dateKey === startKey;
                        const isEnd = dateKey === endKey;

                        return (
                          <TouchableOpacity
                            key={dateKey}
                            style={[
                              styles.dayCell,
                              inRange && styles.dayInRange,
                              isStart && styles.dayStart,
                              isEnd && styles.dayEnd,
                            ]}
                            activeOpacity={0.65}
                            onPress={() => handleSelectDate(date)}
                          >
                            <Text
                              style={[
                                styles.dayText,
                                (isStart || isEnd) && styles.dayTextSelected,
                              ]}
                            >
                              {date.getDate()}
                            </Text>
                          </TouchableOpacity>
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
                    <TouchableOpacity
                      key={year}
                      style={[styles.selectorCell, active && styles.selectorCellActive]}
                      activeOpacity={0.65}
                      onPress={() => handleSelectYear(year)}
                    >
                      <Text style={[styles.selectorCellText, active && styles.selectorCellTextActive]}>
                        {year}
                      </Text>
                    </TouchableOpacity>
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
                    <TouchableOpacity
                      key={monthIndex}
                      style={[styles.selectorCell, active && styles.selectorCellActive]}
                      activeOpacity={0.65}
                      onPress={() => handleSelectMonth(monthIndex)}
                    >
                      <Text style={[styles.selectorCellText, active && styles.selectorCellTextActive]}>
                        {monthIndex + 1}월
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </Animated.View>
            )}

            <Text style={styles.selectedRange}>
              {formatTripDateRangeLabel({ startDate, endDate, isEndDateUndecided })}
            </Text>

            {showEndDateUndecided ? (
              <View style={styles.undecidedToggleRow}>
                <View style={styles.undecidedToggleTextBlock}>
                  <Text style={styles.undecidedToggleLabel}>종료일 미정</Text>
                  <Text style={styles.undecidedToggleDescription}>
                    종료일은 여행 중에도 설정할 수 있어요.
                  </Text>
                </View>
                <Switch
                  value={isEndDateUndecided}
                  onValueChange={handleToggleEndDateUndecided}
                  trackColor={{
                    false: Colors.foundation.grey100,
                    true: Colors.foundation.grey800,
                  }}
                  thumbColor={Colors.foundation.white}
                />
              </View>
            ) : null}

            <AuthActionButton
              label="선택 완료"
              onPress={handleConfirm}
              state={canConfirm ? 'on' : 'off'}
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
  },
  modal: {
    width: '100%',
    maxWidth: 329,
    maxHeight: '85%',
    borderRadius: Radius.lg,
    backgroundColor: Colors.foundation.white,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
    ...Shadows.modal,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
    minHeight: 28,
  },
  headerTitleStep: {
    ...Typography.body1Emphasized,
    color: Colors.foundation.black,
    flex: 1,
    textAlign: 'center',
  },
  backBtn: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  backIcon: {
    width: 24,
    height: 24,
  },
  stepCloseBtn: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBody: {
    gap: Spacing.lg,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
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
  monthLabel: {
    ...Typography.body1Emphasized,
    color: Colors.foundation.black,
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
    maxHeight: 224,
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
    color: Colors.foundation.white,
    ...Typography.body2Emphasized,
  },
  selectedRange: {
    ...Typography.body2Regular,
    color: Colors.foundation.grey600,
    textAlign: 'center',
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
});
