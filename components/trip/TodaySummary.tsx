import { Colors } from '@/constants/theme';
import * as Haptics from 'expo-haptics';
import React from 'react';
import {
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import Text from '@/components/common/AppText';
import FrostedGlassSurface from '@/components/common/FrostedGlassSurface';

const FIGMA_PRETENDARD = 'Pretendard';
const FIGMA_NOTO_SERIF_KR = 'Noto Serif KR';
const DAY_SELECTOR_DRAG_RESISTANCE = 0.35;
const DAY_SELECTOR_EDGE_RESISTANCE = 0.5;
const DAY_SELECTOR_MAX_TRANSLATE_X = 28;
const DAY_SELECTOR_SWIPE_THRESHOLD = 32;

interface TodaySummaryProps {
  distanceKm: number;
  placeCount: number;
  momentCount: number;
  selectedDayIndex?: number;
  totalDays?: number;
  dayLabels?: string[];
  selectedDateLabel?: string;
  isSelectedToday?: boolean;
  onSelectPreviousDay?: () => void;
  onSelectNextDay?: () => void;
  style?: StyleProp<ViewStyle>;
}

export default function TodaySummary({
  distanceKm,
  placeCount,
  momentCount,
  selectedDayIndex = 0,
  totalDays = 1,
  dayLabels,
  selectedDateLabel = '',
  isSelectedToday = false,
  onSelectPreviousDay,
  onSelectNextDay,
  style,
}: TodaySummaryProps) {
  const currentDayNumber = selectedDayIndex + 1;
  const previousDayNumber = currentDayNumber > 1 ? currentDayNumber - 1 : null;
  const nextDayNumber = currentDayNumber < totalDays ? currentDayNumber + 1 : null;
  const currentDayLabel = dayLabels?.[selectedDayIndex] ?? (isSelectedToday ? 'TODAY' : `DAY ${currentDayNumber}`);
  const previousDayLabel = previousDayNumber ? dayLabels?.[currentDayNumber - 2] ?? `DAY ${previousDayNumber}` : '';
  const nextDayLabel = nextDayNumber ? dayLabels?.[currentDayNumber] ?? `DAY ${nextDayNumber}` : '';
  const dragX = React.useRef(new Animated.Value(0)).current;
  const triggerSelectionHaptic = React.useCallback(() => {
    void Haptics.selectionAsync();
  }, []);
  const handleSelectPrevious = React.useCallback(() => {
    if (!previousDayNumber || !onSelectPreviousDay) {
      return;
    }

    triggerSelectionHaptic();
    onSelectPreviousDay();
  }, [onSelectPreviousDay, previousDayNumber, triggerSelectionHaptic]);
  const handleSelectNext = React.useCallback(() => {
    if (!nextDayNumber || !onSelectNextDay) {
      return;
    }

    triggerSelectionHaptic();
    onSelectNextDay();
  }, [nextDayNumber, onSelectNextDay, triggerSelectionHaptic]);
  const resetDragX = React.useCallback(() => {
    Animated.spring(dragX, {
      toValue: 0,
      useNativeDriver: true,
      friction: 8,
      tension: 80,
    }).start();
  }, [dragX]);
  const panResponder = React.useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) > 14 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.4,
        onMoveShouldSetPanResponderCapture: (_, gesture) =>
          Math.abs(gesture.dx) > 14 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.4,
        onPanResponderGrant: () => {
          dragX.stopAnimation();
        },
        onPanResponderMove: (_, gesture) => {
          const isAtStartDraggingRight = gesture.dx > 0 && !previousDayNumber;
          const isAtEndDraggingLeft = gesture.dx < 0 && !nextDayNumber;
          const edgeResistance = isAtStartDraggingRight || isAtEndDraggingLeft ? DAY_SELECTOR_EDGE_RESISTANCE : 1;
          const resistedDx = gesture.dx * DAY_SELECTOR_DRAG_RESISTANCE * edgeResistance;
          const clampedDx = Math.max(
            -DAY_SELECTOR_MAX_TRANSLATE_X,
            Math.min(DAY_SELECTOR_MAX_TRANSLATE_X, resistedDx),
          );

          dragX.setValue(clampedDx);
        },
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dx < -DAY_SELECTOR_SWIPE_THRESHOLD && nextDayNumber) {
            handleSelectNext();
          } else if (gesture.dx > DAY_SELECTOR_SWIPE_THRESHOLD && previousDayNumber) {
            handleSelectPrevious();
          }

          resetDragX();
        },
        onPanResponderTerminate: resetDragX,
        onPanResponderTerminationRequest: () => true,
        onShouldBlockNativeResponder: () => false,
      }),
    [dragX, handleSelectNext, handleSelectPrevious, nextDayNumber, previousDayNumber, resetDragX],
  );

  return (
    <FrostedGlassSurface
      mode="translucent"
      style={[styles.shadowWrap, style]}
      contentStyle={styles.wrap}
      borderRadius={16}
      fillColor="rgba(255, 255, 255, 0.40)"
      borderColor="rgba(199, 199, 199, 0.50)"
    >
      <View style={styles.content}>
        <View style={styles.daySelector} {...panResponder.panHandlers}>
          <Animated.View style={[styles.daySelectorInner, { transform: [{ translateX: dragX }] }]}>
            <Pressable
              accessibilityRole={previousDayNumber ? 'button' : undefined}
              disabled={!previousDayNumber}
              onPress={handleSelectPrevious}
              style={styles.adjacentDaySlot}
            >
              <Text style={[styles.adjacentDayText, !previousDayNumber && styles.adjacentDayTextHidden]}>
                {previousDayLabel}
              </Text>
            </Pressable>

            <View style={styles.currentDaySlot}>
              <Text style={styles.currentDayText}>{currentDayLabel}</Text>
              <Text style={styles.currentDateText}>{selectedDateLabel}</Text>
            </View>

            <Pressable
              accessibilityRole={nextDayNumber ? 'button' : undefined}
              disabled={!nextDayNumber}
              onPress={handleSelectNext}
              style={styles.adjacentDaySlot}
            >
              <Text style={[styles.adjacentDayText, !nextDayNumber && styles.adjacentDayTextHidden]}>
                {nextDayLabel}
              </Text>
            </Pressable>
          </Animated.View>
        </View>

        <View style={styles.statsRow}>
          <SummaryMetric value={placeCount} unit="곳" label="방문" metricWidth={44} valueSize={17} />
          <View style={styles.divider} />
          <SummaryMetric value={distanceKm} unit="km" label="이동" metricWidth={56} valueSize={18} />
          <View style={styles.divider} />
          <SummaryMetric value={momentCount} unit="장" label="사진" metricWidth={52} valueSize={17} />
        </View>
      </View>
    </FrostedGlassSurface>
  );
}

function SummaryMetric({
  value,
  unit,
  label,
  metricWidth,
  valueSize,
}: {
  value: number;
  unit: string;
  label: string;
  metricWidth: number;
  valueSize: number;
}) {
  return (
    <View style={[styles.metric, { width: metricWidth }]}>
      <View style={styles.valueRow}>
        <Text style={[styles.value, { fontSize: valueSize }]}>{value}</Text>
        <Text style={styles.unit}>{unit}</Text>
      </View>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  shadowWrap: {
    height: 136,
    borderRadius: 16,
  },
  wrap: {
    height: 136,
  },
  content: {
    flex: 1,
    paddingTop: 12,
    paddingBottom: 16,
    paddingHorizontal: 24,
    gap: 16,
  },
  daySelector: {
    width: '100%',
    height: 48,
    alignSelf: 'stretch',
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(182, 182, 182, 0.50)',
  },
  daySelectorInner: {
    flex: 1,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  adjacentDaySlot: {
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adjacentDayText: {
    fontFamily: FIGMA_PRETENDARD,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    letterSpacing: 1.44,
    color: 'rgba(89, 89, 89, 0.70)',
    textAlign: 'center',
  },
  adjacentDayTextHidden: {
    opacity: 0,
  },
  currentDaySlot: {
    width: 92,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
    paddingBottom: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(99, 99, 99, 0.80)',
    marginBottom: -2,
  },
  currentDayText: {
    fontFamily: FIGMA_PRETENDARD,
    height: 20,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    letterSpacing: 3.36,
    textTransform: 'uppercase',
    color: Colors.foundation.black,
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  currentDateText: {
    fontFamily: FIGMA_PRETENDARD,
    height: 16,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400',
    letterSpacing: 0.24,
    color: Colors.foundation.grey800,
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  statsRow: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    zIndex: 1,
  },
  metric: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 4,
  },
  valueRow: {
    height: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    alignSelf: 'stretch',
  },
  value: {
    fontFamily: FIGMA_NOTO_SERIF_KR,
    lineHeight: 24,
    fontWeight: '900',
    color: Colors.foundation.black,
  },
  unit: {
    fontFamily: FIGMA_NOTO_SERIF_KR,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    color: Colors.foundation.grey800,
  },
  label: {
    fontFamily: FIGMA_PRETENDARD,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    color: Colors.foundation.grey800,
    textAlign: 'center',
  },
  divider: {
    width: 2,
    height: 32,
    borderRadius: 1,
    backgroundColor: 'rgba(217, 217, 217, 0.30)',
  },
});
