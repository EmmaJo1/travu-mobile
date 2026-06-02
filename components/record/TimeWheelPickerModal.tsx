import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Text from '@/components/common/AppText';
import SheetActionButton from '@/components/common/SheetActionButton';
import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import type { PlaceEntryMeridiem, PlaceEntryTime } from '@/utils/placeEntryTime';

const ITEM_HEIGHT = 44;
const VISIBLE_ITEM_COUNT = 5;
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEM_COUNT;
const SHEET_ANIM_DURATION = 180;
const SHEET_OFFSCREEN_Y = 420;

const HOURS = Array.from({ length: 12 }, (_, index) => index + 1);
const MINUTES = Array.from({ length: 60 }, (_, index) => index);
const MERIDIEMS: PlaceEntryMeridiem[] = ['AM', 'PM'];

interface WheelColumnProps<T> {
  accessibilityLabel: string;
  items: T[];
  selectedValue: T;
  formatValue: (value: T) => string;
  onChange: (value: T) => void;
}

function WheelColumn<T>({
  accessibilityLabel,
  items,
  selectedValue,
  formatValue,
  onChange,
}: WheelColumnProps<T>) {
  const listRef = useRef<FlatList<T>>(null);
  const selectedIndex = Math.max(0, items.indexOf(selectedValue));

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      listRef.current?.scrollToOffset({
        animated: false,
        offset: selectedIndex * ITEM_HEIGHT,
      });
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [selectedIndex]);

  const handleScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.max(
      0,
      Math.min(items.length - 1, Math.round(event.nativeEvent.contentOffset.y / ITEM_HEIGHT)),
    );

    onChange(items[nextIndex]);
  };

  return (
    <FlatList
      ref={listRef}
      accessibilityLabel={accessibilityLabel}
      contentContainerStyle={styles.wheelContent}
      data={items}
      decelerationRate="fast"
      getItemLayout={(_, index) => ({
        index,
        length: ITEM_HEIGHT,
        offset: ITEM_HEIGHT * index,
      })}
      keyExtractor={(item) => String(item)}
      onMomentumScrollEnd={handleScrollEnd}
      onScrollEndDrag={handleScrollEnd}
      renderItem={({ item, index }) => {
        const distance = Math.abs(index - selectedIndex);

        return (
          <View style={styles.wheelItem}>
            <Text
              style={[
                styles.wheelText,
                distance === 1 && styles.wheelTextNear,
                distance >= 2 && styles.wheelTextFar,
                distance === 0 && styles.wheelTextSelected,
              ]}
            >
              {formatValue(item)}
            </Text>
          </View>
        );
      }}
      showsVerticalScrollIndicator={false}
      snapToAlignment="start"
      snapToInterval={ITEM_HEIGHT}
      style={styles.wheel}
    />
  );
}

interface TimeWheelPickerModalProps {
  visible: boolean;
  value: PlaceEntryTime;
  onClose: () => void;
  onConfirm: (value: PlaceEntryTime) => void;
}

export default function TimeWheelPickerModal({
  visible,
  value,
  onClose,
  onConfirm,
}: TimeWheelPickerModalProps) {
  const insets = useSafeAreaInsets();
  const [presented, setPresented] = useState(false);
  const [draftTime, setDraftTime] = useState(value);
  const wasOpenRef = useRef(false);
  const animRef = useRef<Animated.CompositeAnimation | null>(null);
  const dimOpacity = useRef(new Animated.Value(0)).current;
  const sheetTransY = useRef(new Animated.Value(SHEET_OFFSCREEN_Y)).current;

  useEffect(() => {
    animRef.current?.stop();

    if (visible) {
      setPresented(true);
      setDraftTime(value);
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
    setPresented(false);
  }, [visible, value, dimOpacity, sheetTransY]);

  if (!visible && !presented) {
    return null;
  }

  return (
    <Modal animationType="none" onRequestClose={onClose} transparent visible>
      <View style={styles.wrapper}>
        <Animated.View style={[styles.dim, { opacity: dimOpacity }]}>
          <Pressable
            accessibilityLabel="시간 선택 닫기"
            accessibilityRole="button"
            onPress={onClose}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            {
              paddingBottom: Math.max(insets.bottom, Spacing.xl),
              transform: [{ translateY: sheetTransY }],
            },
          ]}
        >
          <View style={styles.dragHandle} />
          <Text style={styles.title}>시간 선택</Text>

          <View style={styles.pickerArea}>
            <View pointerEvents="none" style={styles.selectionHighlight} />
            <WheelColumn
              accessibilityLabel="시 선택"
              formatValue={(hour) => String(hour)}
              items={HOURS}
              onChange={(hour) => setDraftTime((current) => ({ ...current, hour }))}
              selectedValue={draftTime.hour}
            />
            <WheelColumn
              accessibilityLabel="분 선택"
              formatValue={(minute) => String(minute).padStart(2, '0')}
              items={MINUTES}
              onChange={(minute) => setDraftTime((current) => ({ ...current, minute }))}
              selectedValue={draftTime.minute}
            />
            <WheelColumn
              accessibilityLabel="오전 오후 선택"
              formatValue={(meridiem) => meridiem}
              items={MERIDIEMS}
              onChange={(meridiem) => setDraftTime((current) => ({ ...current, meridiem }))}
              selectedValue={draftTime.meridiem}
            />
          </View>

          <SheetActionButton
            label="완료"
            onPress={() => onConfirm(draftTime)}
          />
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
    gap: Spacing.xl,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    backgroundColor: Colors.foundation.white,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    ...Shadows.modal,
  },
  dragHandle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: Radius.full,
    backgroundColor: Colors.foundation.grey300,
  },
  title: {
    ...Typography.title2,
    color: Colors.foundation.black,
  },
  pickerArea: {
    height: WHEEL_HEIGHT,
    flexDirection: 'row',
    gap: Spacing.md,
  },
  selectionHighlight: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: ITEM_HEIGHT * 2,
    height: ITEM_HEIGHT,
    borderRadius: Radius.sm,
    backgroundColor: Colors.light.bgScreen,
  },
  wheel: {
    flex: 1,
    height: WHEEL_HEIGHT,
  },
  wheelContent: {
    paddingVertical: ITEM_HEIGHT * 2,
  },
  wheelItem: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheelText: {
    ...Typography.body1Regular,
    color: Colors.foundation.grey600,
    opacity: 0.72,
  },
  wheelTextNear: {
    opacity: 0.5,
  },
  wheelTextFar: {
    opacity: 0.22,
  },
  wheelTextSelected: {
    ...Typography.body1Emphasized,
    color: Colors.foundation.black,
    opacity: 1,
  },
});
