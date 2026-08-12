import Text from '@/components/common/AppText';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SHEET_OPEN_DURATION = 240;
const SHEET_CLOSE_DURATION = 200;
const SHEET_OFFSCREEN_Y = 400;
const LABEL_ALL_SCHEDULE = '\uC804\uCCB4 \uC77C\uC815';
const LABEL_PHOTO = '\uC0AC\uC9C4';
const LABEL_PHOTO_UNIT = '\uC7A5';
const LABEL_TODAY = '\uC624\uB298';

const WEEKDAY_LABELS: Record<string, string> = {
  Mon: '\uC6D4',
  Tue: '\uD654',
  Wed: '\uC218',
  Thu: '\uBAA9',
  Fri: '\uAE08',
  Sat: '\uD1A0',
  Sun: '\uC77C',
};

export interface DaySelectorItem {
  id: string;
  dayNumber: number;
  dateLabel: string;
  weekdayLabel: string;
  photoCount: number;
}

export interface SelectorOption {
  id: string;
  label: string;
}

interface DaySelectorSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  selectedId: string;
  days?: DaySelectorItem[];
  options?: SelectorOption[];
  showPhotoCount?: boolean;
  showTodayChip?: boolean;
  hideTitle?: boolean;
  hideOptionAccessory?: boolean;
  compactOptions?: boolean;
  todayId?: string;
  onSelectDay?: (day: DaySelectorItem) => void;
  onSelectOption?: (option: SelectorOption) => void;
}

export default function DaySelectorSheet({
  visible,
  onClose,
  title = LABEL_ALL_SCHEDULE,
  selectedId,
  days,
  options,
  showPhotoCount = true,
  showTodayChip = false,
  hideTitle = false,
  hideOptionAccessory = false,
  compactOptions = false,
  todayId,
  onSelectDay,
  onSelectOption,
}: DaySelectorSheetProps) {
  const insets = useSafeAreaInsets();
  const isOptionMode = Boolean(options?.length);
  const [presented, setPresented] = useState(false);
  const wasOpenRef = useRef(false);
  const animRef = useRef<Animated.CompositeAnimation | null>(null);
  const dimOpacity = useRef(new Animated.Value(0)).current;
  const sheetTransY = useRef(new Animated.Value(SHEET_OFFSCREEN_Y)).current;

  useEffect(() => {
    animRef.current?.stop();

    if (visible) {
      setPresented(true);
      dimOpacity.setValue(0);
      sheetTransY.setValue(SHEET_OFFSCREEN_Y);
      animRef.current = Animated.parallel([
        Animated.timing(dimOpacity, {
          toValue: 1,
          duration: SHEET_OPEN_DURATION,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(sheetTransY, {
          toValue: 0,
          duration: SHEET_OPEN_DURATION,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]);
      animRef.current.start();
      wasOpenRef.current = true;
      return;
    }

    if (!wasOpenRef.current) {
      return;
    }

    wasOpenRef.current = false;
    animRef.current = Animated.parallel([
      Animated.timing(dimOpacity, {
        toValue: 0,
        duration: SHEET_CLOSE_DURATION,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(sheetTransY, {
        toValue: SHEET_OFFSCREEN_Y,
        duration: SHEET_CLOSE_DURATION,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);
    animRef.current.start(({ finished }) => {
      if (finished) {
        setPresented(false);
      }
    });

    return () => {
      animRef.current?.stop();
    };
  }, [visible, dimOpacity, sheetTransY]);

  if (!visible && !presented) {
    return null;
  }

  const resolvedTitle =
    !isOptionMode && (title.includes('醫') || title.includes('?')) ? LABEL_ALL_SCHEDULE : title;

  const renderAccessory = (selected: boolean, itemId?: string) => (
    <View style={styles.accessoryRow}>
      {showTodayChip && itemId === todayId ? (
        <View style={styles.todayPill}>
          <Text style={styles.todayPillText}>{LABEL_TODAY}</Text>
        </View>
      ) : null}

      <Ionicons
        name={isOptionMode && selected ? 'checkmark' : 'chevron-forward'}
        size={18}
        color={isOptionMode && selected ? Colors.foundation.grey800 : Colors.foundation.grey500}
      />
    </View>
  );

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.wrapper}>
        <Animated.View style={[styles.dim, { opacity: dimOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            {
              paddingBottom: Math.max(insets.bottom, Spacing.lg),
              transform: [{ translateY: sheetTransY }],
            },
          ]}
        >
          <View style={styles.handle} />
          {hideTitle ? null : <Text style={styles.title}>{resolvedTitle}</Text>}

          {isOptionMode ? (
            <FlatList
              data={options ?? []}
              keyExtractor={(item) => item.id}
              contentContainerStyle={[styles.list, hideTitle && styles.listWithoutTitle]}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const selected = item.id === selectedId;
                return (
                  <Pressable
                    accessibilityRole="button"
                    style={[
                      styles.row,
                      compactOptions && styles.optionRowCompact,
                      selected && styles.rowSelected,
                    ]}
                    onPress={() => onSelectOption?.(item)}
                  >
                    <View style={styles.rowMain}>
                      <Text
                        style={[
                          styles.optionLabel,
                          compactOptions && styles.optionLabelCompact,
                          selected && styles.optionLabelSelected,
                          compactOptions && selected && styles.optionLabelCompactSelected,
                        ]}
                      >
                        {item.label}
                      </Text>
                    </View>
                    {hideOptionAccessory ? null : renderAccessory(selected)}
                  </Pressable>
                );
              }}
            />
          ) : (
            <FlatList
              data={days ?? []}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const selected = item.id === selectedId;
                const weekdayLabel = WEEKDAY_LABELS[item.weekdayLabel] ?? item.weekdayLabel;
                return (
                  <Pressable
                    accessibilityRole="button"
                    style={[styles.row, selected && styles.rowSelected]}
                    onPress={() => onSelectDay?.(item)}
                  >
                    <View style={styles.rowMain}>
                      <View style={styles.dayHeaderRow}>
                        <Text style={[styles.dayLabel, selected && styles.dayLabelSelected]}>
                          {item.dayNumber}일차
                        </Text>
                        <Text style={[styles.dateLabel, selected && styles.dateLabelSelected]}>
                          {item.dateLabel}
                        </Text>
                        <Text style={[styles.dateLabel, selected && styles.dateLabelSelected]}>
                          {weekdayLabel}
                        </Text>
                      </View>

                      {showPhotoCount ? (
                        <View style={styles.metaRow}>
                          <Text style={[styles.metaText, selected && styles.metaTextSelected]}>
                            {LABEL_PHOTO}
                          </Text>
                          <View style={styles.metaGroup}>
                            <Text style={[styles.metaText, selected && styles.metaTextSelected]}>
                              {item.photoCount}
                            </Text>
                            <Text style={[styles.metaText, selected && styles.metaTextSelected]}>
                              {LABEL_PHOTO_UNIT}
                            </Text>
                          </View>
                        </View>
                      ) : null}
                    </View>
                    {renderAccessory(selected, item.id)}
                  </Pressable>
                );
              }}
            />
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.24)',
  },
  dim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  sheet: {
    maxHeight: '72%',
    backgroundColor: Colors.foundation.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
    paddingHorizontal: Spacing.xl,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 999,
    alignSelf: 'center',
    backgroundColor: Colors.foundation.grey100,
  },
  title: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.lg,
    ...Typography.title2,
    color: Colors.foundation.black,
    textAlign: 'center',
  },
  list: {
    gap: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  listWithoutTitle: {
    paddingTop: Spacing.md,
  },
  row: {
    minHeight: 60,
    borderRadius: 12,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowSelected: {
    backgroundColor: '#E9E9E9',
  },
  rowMain: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  dayHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  dayLabel: {
    ...Typography.body1Emphasized,
    color: Colors.foundation.black,
  },
  dayLabelSelected: {
    color: Colors.foundation.black,
  },
  dateLabel: {
    ...Typography.captionRegular,
    color: Colors.foundation.grey500,
  },
  dateLabelSelected: {
    color: Colors.foundation.grey800,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  metaGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  metaText: {
    ...Typography.captionEmphasized,
    color: Colors.foundation.grey500,
  },
  metaTextSelected: {
    color: Colors.foundation.grey800,
  },
  accessoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginLeft: Spacing.md,
  },
  todayPill: {
    height: 20,
    paddingHorizontal: Spacing.sm,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.foundation.grey800,
  },
  todayPillText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    color: Colors.foundation.white,
  },
  optionLabel: {
    ...Typography.body1Regular,
    color: Colors.foundation.black,
  },
  optionLabelSelected: {
    ...Typography.body1Emphasized,
  },
  optionRowCompact: {
    minHeight: 40,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
  },
  optionLabelCompact: {
    ...Typography.captionRegular,
  },
  optionLabelCompactSelected: {
    ...Typography.captionEmphasized,
  },
});
