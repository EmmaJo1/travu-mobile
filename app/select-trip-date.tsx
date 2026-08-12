import { Feather } from '@expo/vector-icons';
import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { PanResponder, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import Text from '@/components/common/AppText';
import ScreenHeader from '@/components/nav/ScreenHeader';
import {
  createCurrentCalendarMonth,
  dateKeyToDate,
  dateToDateKey,
} from '@/components/record/TripDateRangePickerModal';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';

const BACKGROUND = Colors.light.bgScreen;
const WEEK_DAYS = ['일', '월', '화', '수', '목', '금', '토'];
const MONTHS = Array.from({ length: 12 }, (_, index) => index);
const SWIPE_THRESHOLD = 40;
const YEAR_PILL_WIDTH = 64;

const SELECTED_DATE_BG = Colors.warm.dark;
const RANGE_BG = Colors.warm.beige;
const DIVIDER = Colors.light.borderDefault;

interface CalendarCell {
  date: Date;
  key: string;
  isCurrentMonth: boolean;
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function createCalendarWeeks(month: Date): CalendarCell[][] {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstDay = new Date(year, monthIndex, 1).getDay();
  const currentMonthLastDate = new Date(year, monthIndex + 1, 0).getDate();
  const previousMonthLastDate = new Date(year, monthIndex, 0).getDate();
  const cells: CalendarCell[] = [];

  for (let index = firstDay - 1; index >= 0; index -= 1) {
    const day = previousMonthLastDate - index;
    const date = new Date(year, monthIndex - 1, day);
    cells.push({ date, key: dateToDateKey(date), isCurrentMonth: false });
  }

  for (let day = 1; day <= currentMonthLastDate; day += 1) {
    const date = new Date(year, monthIndex, day);
    cells.push({ date, key: dateToDateKey(date), isCurrentMonth: true });
  }

  const targetCellCount = cells.length <= 35 ? 35 : 42;
  let nextDay = 1;
  while (cells.length < targetCellCount) {
    const date = new Date(year, monthIndex + 1, nextDay);
    cells.push({ date, key: dateToDateKey(date), isCurrentMonth: false });
    nextDay += 1;
  }

  return Array.from({ length: cells.length / 7 }, (_, rowIndex) =>
    cells.slice(rowIndex * 7, rowIndex * 7 + 7),
  );
}

function formatSummaryDate(date: Date | null) {
  if (!date) return '선택';

  return `${date.getFullYear()}. ${date.getMonth() + 1}. ${date.getDate()}`;
}

function getYearOptions(baseYear: number) {
  return Array.from({ length: 21 }, (_, index) => baseYear - 10 + index);
}

export default function SelectTripDateScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const currentYear = React.useMemo(() => new Date().getFullYear(), []);
  const yearScrollRef = React.useRef<ScrollView>(null);
  const initialStartDate = dateKeyToDate(firstParam(params.startDate));
  const initialEndDate = dateKeyToDate(firstParam(params.endDate));
  const [calendarMonth, setCalendarMonth] = React.useState(() =>
    initialStartDate
      ? new Date(initialStartDate.getFullYear(), initialStartDate.getMonth(), 1)
      : createCurrentCalendarMonth(),
  );
  const [startDate, setStartDate] = React.useState<Date | null>(initialStartDate);
  const [endDate, setEndDate] = React.useState<Date | null>(initialEndDate);
  const [isMonthPickerVisible, setIsMonthPickerVisible] = React.useState(false);
  const [yearPickerViewportWidth, setYearPickerViewportWidth] = React.useState(0);

  const weeks = React.useMemo(() => createCalendarWeeks(calendarMonth), [calendarMonth]);
  const yearOptions = React.useMemo(() => getYearOptions(currentYear), [currentYear]);
  const startKey = startDate ? dateToDateKey(startDate) : null;
  const endKey = endDate ? dateToDateKey(endDate) : null;
  const canConfirm = Boolean(startDate && endDate);

  const changeMonth = React.useCallback((offset: number) => {
    setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
    setIsMonthPickerVisible(false);
  }, []);

  const handleToggleMonthPicker = React.useCallback(() => {
    setIsMonthPickerVisible((current) => !current);
  }, []);

  React.useEffect(() => {
    if (!isMonthPickerVisible || yearPickerViewportWidth <= 0) return;

    const currentYearIndex = yearOptions.indexOf(currentYear);
    if (currentYearIndex < 0) return;

    const scrollX = Math.max(
      0,
      currentYearIndex * (YEAR_PILL_WIDTH + Spacing.xs) -
        yearPickerViewportWidth / 2 +
        YEAR_PILL_WIDTH / 2,
    );

    requestAnimationFrame(() => {
      yearScrollRef.current?.scrollTo({ x: scrollX, animated: false });
    });
  }, [currentYear, isMonthPickerVisible, yearOptions, yearPickerViewportWidth]);

  const monthSwipeResponder = React.useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          !isMonthPickerVisible &&
          Math.abs(gestureState.dx) > 12 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.2,
        onPanResponderRelease: (_, gestureState) => {
          if (isMonthPickerVisible) return;
          if (Math.abs(gestureState.dx) < SWIPE_THRESHOLD) return;

          changeMonth(gestureState.dx < 0 ? 1 : -1);
        },
      }),
    [changeMonth, isMonthPickerVisible],
  );
  const calendarPanHandlers = isMonthPickerVisible ? {} : monthSwipeResponder.panHandlers;

  const handleSelectDate = (date: Date) => {
    if (!startDate || endDate) {
      setStartDate(date);
      setEndDate(null);
      setIsMonthPickerVisible(false);
      return;
    }

    if (date < startDate) {
      setStartDate(date);
      setEndDate(null);
      setIsMonthPickerVisible(false);
      return;
    }

    setEndDate(date);
    setIsMonthPickerVisible(false);
  };

  const handleSelectMonth = (year: number, monthIndex: number) => {
    setCalendarMonth(new Date(year, monthIndex, 1));
    setIsMonthPickerVisible(false);
  };

  const handleConfirm = () => {
    if (!startDate || !endDate) return;

    router.replace({
      pathname: '/create-trip',
      params: {
        destinationId: firstParam(params.destinationId),
        destinationName: firstParam(params.destinationName),
        destinationCountry: firstParam(params.destinationCountry),
        destinationLabel: firstParam(params.destinationLabel),
        startDate: dateToDateKey(startDate),
        endDate: dateToDateKey(endDate),
      },
    } as Href);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="dark" />
      <ScreenHeader title="여행 일정 선택" onBackPress={() => router.back()} style={styles.header} />

      <View style={styles.summaryCard}>
        <DateSummaryItem label="시작일" value={formatSummaryDate(startDate)} isPlaceholder={!startDate} />
        <View style={styles.summaryDivider} />
        <DateSummaryItem label="종료일" value={formatSummaryDate(endDate)} isPlaceholder={!endDate} />
      </View>


      <View style={styles.calendarSection} {...calendarPanHandlers}>
        <View style={styles.monthHeader}>
          <Pressable
            accessibilityRole="button"
            onPress={() => changeMonth(-1)}
            style={styles.monthButton}
            hitSlop={8}
          >
            <Feather name="chevron-left" size={24} color={Colors.foundation.black} />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={handleToggleMonthPicker}
            style={styles.monthTitleButton}
          >
            <Text style={styles.monthTitle}>
              {calendarMonth.getFullYear()}년 {calendarMonth.getMonth() + 1}월
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() => changeMonth(1)}
            style={styles.monthButton}
            hitSlop={8}
          >
            <Feather name="chevron-right" size={24} color={Colors.foundation.black} />
          </Pressable>
        </View>

        {isMonthPickerVisible ? (
          <View style={styles.monthPicker}>
            <ScrollView
              ref={yearScrollRef}
              horizontal
              directionalLockEnabled
              nestedScrollEnabled
              onLayout={(event) => setYearPickerViewportWidth(event.nativeEvent.layout.width)}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.yearPickerContent}
            >
              {yearOptions.map((year) => {
                const isSelected = year === calendarMonth.getFullYear();

                return (
                  <Pressable
                    key={year}
                    accessibilityRole="button"
                    onPress={() => setCalendarMonth((current) => new Date(year, current.getMonth(), 1))}
                    style={[styles.yearPill, isSelected && styles.yearPillSelected]}
                  >
                    <Text style={[styles.yearPillText, isSelected && styles.yearPillTextSelected]}>
                      {year}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.monthPickerGrid}>
              {MONTHS.map((monthIndex) => {
                const isSelected = monthIndex === calendarMonth.getMonth();

                return (
                  <Pressable
                    key={monthIndex}
                    accessibilityRole="button"
                    onPress={() => handleSelectMonth(calendarMonth.getFullYear(), monthIndex)}
                    style={[styles.monthPickerCell, isSelected && styles.monthPickerCellSelected]}
                  >
                    <Text
                      style={[
                        styles.monthPickerCellText,
                        isSelected && styles.monthPickerCellTextSelected,
                      ]}
                    >
                      {monthIndex + 1}월
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : (
          <>
            <View style={styles.weekHeader}>
              {WEEK_DAYS.map((day) => (
                <Text key={day} style={styles.weekLabel}>
                  {day}
                </Text>
              ))}
            </View>

            <View style={styles.calendarGrid}>
              {weeks.map((week, rowIndex) => (
                <View key={rowIndex} style={styles.calendarRow}>
                  {week.map((cell) => {
                    const isStart = cell.key === startKey;
                    const isEnd = cell.key === endKey;
                    const isRangeMiddle = Boolean(
                      startKey && endKey && cell.key > startKey && cell.key < endKey,
                    );
                    const isRangeEdge = isStart || isEnd;
                    const isInRange = isRangeMiddle || isRangeEdge;
                    const isSingleDay = Boolean(startKey && endKey && startKey === endKey);

                    return (
                      <Pressable
                        key={cell.key}
                        accessibilityRole="button"
                        onPress={() => handleSelectDate(cell.date)}
                        style={styles.daySlot}
                      >
                        {isInRange && !isSingleDay ? (
                          <View
                            style={[
                              styles.rangeFill,
                              isStart && styles.rangeFillStart,
                              isEnd && styles.rangeFillEnd,
                              isRangeMiddle && styles.rangeFillMiddle,
                            ]}
                          />
                        ) : null}

                        <View style={[styles.dayCircle, isRangeEdge && styles.dayCircleSelected]}>
                          <Text
                            style={[
                              styles.dayText,
                              !cell.isCurrentMonth && styles.dayTextMuted,
                              isRangeEdge && styles.dayTextSelected,
                            ]}
                          >
                            {cell.date.getDate()}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </View>
          </>
        )}
      </View>

      <View style={[styles.ctaArea, { paddingBottom: Math.max(insets.bottom + 24, 34) }]}>
        <Pressable
          accessibilityRole="button"
          disabled={!canConfirm}
          onPress={handleConfirm}
          style={({ pressed }) => [
            styles.cta,
            canConfirm ? styles.ctaActive : styles.ctaDisabled,
            pressed && canConfirm && styles.ctaPressed,
          ]}
        >
          <Text style={[styles.ctaLabel, !canConfirm && styles.ctaLabelDisabled]}>선택 완료</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

interface DateSummaryItemProps {
  label: string;
  value: string;
  isPlaceholder: boolean;
}

function DateSummaryItem({ label, value, isPlaceholder }: DateSummaryItemProps) {
  return (
    <View style={styles.summaryItem}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, isPlaceholder && styles.summaryPlaceholder]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  header: {
    height: 44,
  },
  summaryCard: {
    height: 72,
    marginTop: Spacing.xl,
    marginHorizontal: Spacing['2xl'],
    borderWidth: 1,
    borderColor: DIVIDER,
    borderRadius: 12,
    backgroundColor: Colors.foundation.white,
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  summaryLabel: {
    ...Typography.body2Regular,
    color: Colors.foundation.grey600,
  },
  summaryValue: {
    ...Typography.body1Emphasized,
    color: Colors.foundation.black,
    textAlign: 'center',
  },
  summaryPlaceholder: {
    ...Typography.body2Emphasized,
    color: Colors.light.textDisabled,
  },
  summaryDivider: {
    width: 1,
    height: 44,
    backgroundColor: DIVIDER,
  },
  calendarSection: {
    marginTop: Spacing['3xl'],
    paddingHorizontal: Spacing.xl,
  },
  monthHeader: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitleButton: {
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitle: {
    ...Typography.title2,
    color: Colors.foundation.black,
    textAlign: 'center',
  },
  weekHeader: {
    marginTop: Spacing['3xl'],
    flexDirection: 'row',
  },
  weekLabel: {
    flex: 1,
    ...Typography.body2Emphasized,
    color: Colors.foundation.grey600,
    textAlign: 'center',
  },
  calendarGrid: {
    marginTop: Spacing.xl,
    gap: Spacing.md,
  },
  calendarRow: {
    flexDirection: 'row',
  },
  daySlot: {
    flex: 1,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rangeFill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: RANGE_BG,
  },
  rangeFillStart: {
    left: '50%',
    right: 0,
  },
  rangeFillEnd: {
    left: 0,
    right: '50%',
  },
  rangeFillMiddle: {
    left: 0,
    right: 0,
  },
  dayCircle: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleSelected: {
    backgroundColor: SELECTED_DATE_BG,
  },
  dayText: {
    ...Typography.body1Regular,
    color: Colors.foundation.black,
    textAlign: 'center',
  },
  dayTextMuted: {
    color: Colors.foundation.grey300,
  },
  dayTextSelected: {
    ...Typography.body1Emphasized,
    color: Colors.foundation.white,
  },
  monthPicker: {
    marginTop: Spacing.xl,
    gap: Spacing.xl,
  },
  yearPickerContent: {
    gap: Spacing.xs,
    paddingHorizontal: 2,
  },
  yearPill: {
    width: YEAR_PILL_WIDTH,
    height: 34,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: DIVIDER,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.foundation.white,
  },
  yearPillSelected: {
    borderColor: Colors.foundation.black,
    backgroundColor: Colors.foundation.black,
  },
  yearPillText: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.grey600,
  },
  yearPillTextSelected: {
    color: Colors.foundation.white,
  },
  monthPickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  monthPickerCell: {
    width: '31.5%',
    height: 48,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: DIVIDER,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.foundation.white,
  },
  monthPickerCellSelected: {
    borderColor: Colors.foundation.black,
    backgroundColor: Colors.foundation.black,
  },
  monthPickerCellText: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.black,
  },
  monthPickerCellTextSelected: {
    color: Colors.foundation.white,
  },
  ctaArea: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: Spacing.xl,
    paddingHorizontal: Spacing.xl,
    borderTopWidth: 1,
    borderTopColor: DIVIDER,
    backgroundColor: BACKGROUND,
  },
  cta: {
    height: 48,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaActive: {
    backgroundColor: Colors.foundation.black,
  },
  ctaDisabled: {
    borderWidth: 1,
    borderColor: Colors.light.borderDefault,
    backgroundColor: Colors.foundation.white,
  },
  ctaPressed: {
    opacity: 0.84,
  },
  ctaLabel: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.white,
  },
  ctaLabelDisabled: {
    color: Colors.light.textDisabled,
  },
});
