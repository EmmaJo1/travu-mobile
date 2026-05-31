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
  TouchableOpacity,
  View,
} from 'react-native';
import Text from '@/components/common/AppText';

import AuthActionButton from '@/components/common/AuthActionButton';
import DestinationSelectField from '@/components/record/DestinationSelectField';
import DestinationSelectView from '@/components/record/DestinationSelectView';
import TripDateRangeField from '@/components/record/TripDateRangeField';
import {
  formatDestinationLabel,
  type DestinationContinent,
  type MockDestination,
} from '@/constants/mockDestinations';
import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';

export type TripCreateStep = 'create' | 'destination' | 'date';

export interface SelectedDateRange {
  start: string;
  end: string;
  label: string;
}

interface DraftDateRange {
  start: string | null;
  end: string | null;
}

type CalendarView = 'days' | 'years' | 'months';

interface TripCreateModalProps {
  visible: boolean;
  onClose: () => void;
  onCreate: (payload: {
    destination: MockDestination;
    dateRange: SelectedDateRange;
  }) => void;
}

const CALENDAR_MONTHS = Array.from({ length: 12 }, (_, index) => index);
const CALENDAR_SWIPE_THRESHOLD = 40;
const YEAR_GRID_COLUMN_COUNT = 3;
const YEAR_GRID_ROW_HEIGHT = 44;
const YEAR_GRID_ROW_GAP = Spacing.sm;
const YEAR_SELECTOR_HEIGHT = 224;

function createCurrentCalendarMonth(): Date {
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

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function formatDateKey(dateKey: string): string {
  return dateKey.replaceAll('-', '.');
}

function formatDateRangeLabel(range: DraftDateRange): string {
  if (!range.start) return '날짜를 선택하세요';
  if (!range.end) return `${formatDateKey(range.start)} - 종료일 선택`;

  return `${formatDateKey(range.start)} - ${formatDateKey(range.end)}`;
}

export default function TripCreateModal({ visible, onClose, onCreate }: TripCreateModalProps) {
  const [step, setStep] = useState<TripCreateStep>('create');
  const [selectedDestination, setSelectedDestination] = useState<MockDestination | null>(null);
  const [selectedDateRange, setSelectedDateRange] = useState<SelectedDateRange | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContinent, setSelectedContinent] = useState<'all' | DestinationContinent>('all');
  const [calendarMonth, setCalendarMonth] = useState(createCurrentCalendarMonth);
  const [calendarView, setCalendarView] = useState<CalendarView>('days');
  const yearSelectorRef = useRef<ScrollView>(null);
  const calendarTransitionX = useRef(new Animated.Value(0)).current;
  const calendarTransitionOpacity = useRef(new Animated.Value(1)).current;
  const monthSelectorTransitionX = useRef(new Animated.Value(0)).current;
  const monthSelectorTransitionOpacity = useRef(new Animated.Value(1)).current;
  const [draftDateRange, setDraftDateRange] = useState<DraftDateRange>({
    start: null,
    end: null,
  });

  const destinationLabel = selectedDestination
    ? formatDestinationLabel(selectedDestination)
    : undefined;

  const canCreate = Boolean(selectedDestination && selectedDateRange);
  const calendarWeeks = useMemo(() => createCalendarWeeks(calendarMonth), [calendarMonth]);
  const calendarYears = useMemo(
    () =>
      Array.from(
        { length: 51 },
        (_, index) => 2000 + index,
      ),
    [],
  );
  const calendarMonthLabel = `${calendarMonth.getFullYear()}년 ${calendarMonth.getMonth() + 1}월`;
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

  const resetState = () => {
    setStep('create');
    setSelectedDestination(null);
    setSelectedDateRange(null);
    setSearchQuery('');
    setSelectedContinent('all');
    setCalendarMonth(createCurrentCalendarMonth());
    setCalendarView('days');
    setDraftDateRange({
      start: null,
      end: null,
    });
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleBack = () => {
    if (step === 'date' && calendarView === 'months') {
      setCalendarView('years');
      return;
    }

    if (step === 'date' && calendarView === 'years') {
      setCalendarView('days');
      return;
    }

    if (step === 'destination' || step === 'date') {
      setStep('create');
    }
  };

  const handleSelectDestination = (destination: MockDestination) => {
    setSelectedDestination(destination);
    setStep('create');
    setSearchQuery('');
    setSelectedContinent('all');
  };

  const handleApplyDate = () => {
    if (!draftDateRange.start || !draftDateRange.end) return;

    setSelectedDateRange({
      start: draftDateRange.start,
      end: draftDateRange.end,
      label: formatDateRangeLabel(draftDateRange),
    });
    setStep('create');
  };

  const handleOpenDateSelect = () => {
    if (!selectedDateRange) {
      setCalendarMonth(createCurrentCalendarMonth());
      setDraftDateRange({ start: null, end: null });
    }

    setCalendarView('days');
    setStep('date');
  };

  const handleSelectDate = (dateKey: string) => {
    setDraftDateRange((currentRange) => {
      if (!currentRange.start || currentRange.end || dateKey < currentRange.start) {
        return { start: dateKey, end: null };
      }

      return { start: currentRange.start, end: dateKey };
    });
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

  const handleCreate = () => {
    if (!selectedDestination || !selectedDateRange) return;
    onCreate({ destination: selectedDestination, dateRange: selectedDateRange });
    resetState();
  };

  const renderHeader = () => {
    if (step === 'destination') return null;

    if (step === 'create') {
      return (
        <View style={styles.createHeader}>
          <Text style={styles.headerTitle}>새 여행 만들기</Text>
          <TouchableOpacity style={styles.closeBtn} onPress={handleClose} hitSlop={12}>
            <Ionicons name="close" size={20} color={Colors.foundation.black} />
          </TouchableOpacity>
        </View>
      );
    }

    const titles: Record<Exclude<TripCreateStep, 'create' | 'destination'>, string> = {
      date: '여행 기간 선택',
    };

    return (
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn} hitSlop={8}>
          <Image
            source={require('../../assets/images/screenheader-back.png')}
            style={styles.backIcon}
            resizeMode="contain"
          />
        </TouchableOpacity>
        <Text style={styles.headerTitleStep}>{titles[step]}</Text>
        <TouchableOpacity style={styles.stepCloseBtn} onPress={handleClose} hitSlop={12}>
          <Ionicons name="close" size={20} color={Colors.foundation.black} />
        </TouchableOpacity>
      </View>
    );
  };

  const renderCreateStep = () => (
    <View style={styles.createStepBody}>
      <DestinationSelectField
        label="여행지"
        placeholder="여행지를 선택하세요"
        value={destinationLabel}
        onPress={() => setStep('destination')}
        style={styles.destinationField}
      />
      <TripDateRangeField
        label="여행 기간"
        placeholder="날짜를 선택하세요"
        value={selectedDateRange?.label}
        onPress={handleOpenDateSelect}
        style={styles.dateRangeField}
      />
      <AuthActionButton
        label="여행 만들기"
        onPress={() => {
          if (canCreate) handleCreate();
        }}
        state={canCreate ? 'on' : 'off'}
        style={styles.createActionButton}
      />
    </View>
  );

  const renderDestinationStep = () => (
    <DestinationSelectView
      query={searchQuery}
      selectedContinent={selectedContinent}
      onBack={handleBack}
      onClose={handleClose}
      onQueryChange={setSearchQuery}
      onContinentChange={setSelectedContinent}
      onSelect={handleSelectDestination}
    />
  );

  const renderDateStep = () => (
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

                  const dateKey = toDateKey(date);
                  const inRange =
                    Boolean(draftDateRange.start) &&
                    dateKey >= draftDateRange.start! &&
                    dateKey <= (draftDateRange.end ?? draftDateRange.start!);
                  const isStart = dateKey === draftDateRange.start;
                  const isEnd = dateKey === draftDateRange.end;

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
                      onPress={() => handleSelectDate(dateKey)}
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

      <Text style={styles.selectedRange}>{formatDateRangeLabel(draftDateRange)}</Text>

      <AuthActionButton
        label="적용하기"
        onPress={handleApplyDate}
        state={draftDateRange.start && draftDateRange.end ? 'on' : 'off'}
      />
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable
          style={[styles.modal, step === 'create' && styles.createModal]}
          onPress={(e) => e.stopPropagation()}
        >
          {renderHeader()}
          {step === 'create' && renderCreateStep()}
          {step === 'destination' && renderDestinationStep()}
          {step === 'date' && renderDateStep()}
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
  createModal: {
    height: 385,
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
  },
  createHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 64,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
    minHeight: 28,
  },
  headerTitle: {
    ...Typography.title2,
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    color: Colors.foundation.black,
    textAlign: 'center',
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
  closeBtn: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCloseBtn: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createStepBody: {
    ...StyleSheet.absoluteFillObject,
  },
  destinationField: {
    position: 'absolute',
    top: 89,
    left: 21.5,
    right: 21.5,
  },
  dateRangeField: {
    position: 'absolute',
    top: 195,
    left: 21.5,
    right: 21.5,
  },
  createActionButton: {
    position: 'absolute',
    left: 34.5,
    right: 34.5,
    bottom: 40,
    height: 40,
  },
  stepBody: {
    gap: Spacing.lg,
  },
  stepScroll: {
    maxHeight: 420,
  },
  stepScrollContent: {
    gap: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  searchInput: {
    ...Typography.body1Regular,
    minHeight: 48,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.warm.beige,
    paddingHorizontal: Spacing.lg,
    color: Colors.foundation.black,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.captionEmphasized,
    color: Colors.foundation.grey600,
    marginTop: Spacing.sm,
  },
  sectionGap: {
    marginTop: Spacing.lg,
  },
  listRow: {
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.foundation.grey100,
  },
  listRowText: {
    ...Typography.body1Regular,
    color: Colors.foundation.black,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthArrow: {
    width: 32,
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
    paddingHorizontal: Spacing.sm,
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
});
