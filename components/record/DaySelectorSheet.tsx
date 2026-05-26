import Text from '@/components/common/AppText';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';

const SHEET_ANIM_DURATION = 200;
const SHEET_OFFSCREEN_Y = 400;

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
  onSelectDay?: (day: DaySelectorItem) => void;
  onSelectOption?: (option: SelectorOption) => void;
}

export default function DaySelectorSheet({
  visible,
  onClose,
  title = '날짜 선택',
  selectedId,
  days,
  options,
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
          duration: SHEET_ANIM_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(sheetTransY, {
          toValue: 0,
          duration: SHEET_ANIM_DURATION,
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
        duration: SHEET_ANIM_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(sheetTransY, {
        toValue: SHEET_OFFSCREEN_Y,
        duration: SHEET_ANIM_DURATION,
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
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Text style={styles.closeText}>×</Text>
            </TouchableOpacity>
          </View>

          {isOptionMode ? (
            <FlatList
              data={options}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.list}
              renderItem={({ item }) => {
                const selected = item.id === selectedId;
                return (
                  <TouchableOpacity
                    style={[styles.row, selected && styles.rowSelected]}
                    onPress={() => onSelectOption?.(item)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
                      {item.label}
                    </Text>
                    {selected ? <Text style={styles.check}>✓</Text> : null}
                  </TouchableOpacity>
                );
              }}
            />
          ) : (
            <FlatList
              data={days}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.list}
              renderItem={({ item }) => {
                const selected = item.id === selectedId;
                return (
                  <TouchableOpacity
                    style={[styles.row, selected && styles.rowSelected]}
                    onPress={() => onSelectDay?.(item)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.rowMain}>
                      <Text style={styles.dayLabel}>Day {item.dayNumber}</Text>
                      <Text style={styles.dateLabel}>
                        {item.dateLabel} {item.weekdayLabel}
                      </Text>
                    </View>
                    <View style={styles.rowRight}>
                      <Text style={styles.photoCount}>{item.photoCount} photos</Text>
                      {selected ? <Text style={styles.check}>✓</Text> : null}
                    </View>
                  </TouchableOpacity>
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
  },
  dim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.light.bgOverlay,
  },
  sheet: {
    backgroundColor: Colors.foundation.white,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    paddingTop: Spacing.lg,
    maxHeight: '70%',
    ...Shadows.modal,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
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
  list: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.sm,
  },
  rowSelected: {
    backgroundColor: Colors.warm.white,
  },
  rowMain: {
    gap: 2,
  },
  dayLabel: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.black,
  },
  dateLabel: {
    ...Typography.captionRegular,
    color: Colors.foundation.grey600,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  photoCount: {
    ...Typography.captionRegular,
    color: Colors.foundation.grey500,
  },
  check: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.black,
  },
  optionLabel: {
    ...Typography.body2Regular,
    color: Colors.foundation.black,
    flex: 1,
  },
  optionLabelSelected: {
    ...Typography.body2Emphasized,
  },
});
