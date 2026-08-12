import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, View } from 'react-native';

import Text from '@/components/common/AppText';
import type { TodayTimelineItem } from '@/components/home/TodayTimelineSection';
import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';

interface TimelinePlaceActionSheetProps {
  visible: boolean;
  place: TodayTimelineItem | null;
  dayLabel?: string;
  onClose: () => void;
  onDismiss?: () => void;
  onPressAddPhoto: () => void;
  onPressCreateRecord: () => void;
  onPressEditPlace: () => void;
  onPressHide: () => void;
}

interface ActionRowProps {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  description: string;
  destructive?: boolean;
  onPress: () => void;
}

const ANIMATION_DURATION = 200;
const SHEET_HIDDEN_TRANSLATE_Y = 420;

function ActionRow({ icon, title, description, destructive = false, onPress }: ActionRowProps) {
  const color = destructive ? '#E02D2D' : Colors.foundation.black;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.actionRow, pressed && styles.actionRowPressed]}
    >
      <View style={[styles.iconCircle, destructive && styles.destructiveIconCircle]}>
        <Feather name={icon} size={22} color={color} />
      </View>
      <View style={styles.actionTextBlock}>
        <Text style={[styles.actionTitle, destructive && styles.destructiveText]}>{title}</Text>
        <Text style={styles.actionDescription} numberOfLines={1}>
          {description}
        </Text>
      </View>
      <Feather name="chevron-right" size={22} color={Colors.foundation.grey600} />
    </Pressable>
  );
}

export default function TimelinePlaceActionSheet({
  visible,
  place,
  onClose,
  onDismiss,
  onPressAddPhoto,
  onPressCreateRecord,
  onPressEditPlace,
  onPressHide,
}: TimelinePlaceActionSheetProps) {
  const placeMeta = [place?.categoryLabel, place?.cityLabel].filter(Boolean).join(' · ');
  const [shouldRender, setShouldRender] = React.useState(visible);
  const backdropOpacity = React.useRef(new Animated.Value(0)).current;
  const sheetTranslateY = React.useRef(new Animated.Value(SHEET_HIDDEN_TRANSLATE_Y)).current;
  const onDismissRef = React.useRef(onDismiss);

  React.useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  React.useEffect(() => {
    if (visible) {
      setShouldRender(true);
      backdropOpacity.setValue(0);
      sheetTranslateY.setValue(SHEET_HIDDEN_TRANSLATE_Y);

      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: ANIMATION_DURATION,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(sheetTranslateY, {
          toValue: 0,
          duration: ANIMATION_DURATION,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    if (!shouldRender) {
      return;
    }

    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: ANIMATION_DURATION,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(sheetTranslateY, {
        toValue: SHEET_HIDDEN_TRANSLATE_Y,
        duration: ANIMATION_DURATION,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShouldRender(false);
      onDismissRef.current?.();
    });
  }, [backdropOpacity, sheetTranslateY, shouldRender, visible]);

  const handleClose = React.useCallback(() => {
    onClose();
  }, [onClose]);

  if (!shouldRender) {
    return null;
  }

  return (
    <Modal animationType="none" transparent visible={shouldRender} onRequestClose={handleClose}>
      <View style={styles.modalRoot}>
        <Animated.View style={[styles.backdropLayer, { opacity: backdropOpacity }]}>
          <Pressable accessibilityRole="button" style={styles.backdrop} onPress={handleClose} />
        </Animated.View>
        <Animated.View style={[styles.sheet, { transform: [{ translateY: sheetTranslateY }] }]}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={1}>
              {place?.placeName ?? ''}
            </Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {placeMeta}
            </Text>
          </View>

          <View style={styles.menuGroup}>
            <ActionRow
              icon="image"
              title="사진 추가하기"
              description="이 장소에 사진을 추가합니다"
              onPress={onPressAddPhoto}
            />
            <View style={styles.divider} />
            <ActionRow
              icon="edit-3"
              title="기록 남기기"
              description="사진과 메모를 함께 남겨보세요"
              onPress={onPressCreateRecord}
            />
            <View style={styles.divider} />
            <ActionRow
              icon="map-pin"
              title="장소 수정하기"
              description="장소 이름이나 정보를 수정합니다"
              onPress={onPressEditPlace}
            />
          </View>

          <View style={styles.menuGroup}>
            <ActionRow
              icon="eye-off"
              title="타임라인에서 숨기기"
              description="이 장소를 타임라인에서 숨깁니다"
              destructive
              onPress={onPressHide}
            />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdropLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.light.bgOverlay,
  },
  sheet: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
    paddingBottom: 34,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: Colors.light.bgScreen,
    zIndex: 1,
    ...Shadows.modal,
  },
  handle: {
    alignSelf: 'center',
    width: 100,
    height: 4,
    borderRadius: Radius.full,
    backgroundColor: Colors.foundation.grey300,
    marginBottom: Spacing.xl,
  },
  header: {
    gap: Spacing.xs,
    marginBottom: Spacing.xl,
  },
  title: {
    ...Typography.title2,
    color: Colors.foundation.black,
  },
  subtitle: {
    ...Typography.body2Regular,
    color: Colors.foundation.grey600,
  },
  menuGroup: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(193, 193, 193, 0.30)',
    borderRadius: Radius.lg,
    backgroundColor: Colors.foundation.white,
    marginBottom: Spacing.md,
  },
  actionRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
  },
  actionRowPressed: {
    opacity: 0.75,
  },
  iconCircle: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.full,
    backgroundColor: Colors.warm.white,
  },
  destructiveIconCircle: {
    backgroundColor: 'rgba(224, 45, 45, 0.10)',
  },
  actionTextBlock: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  actionTitle: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.black,
  },
  actionDescription: {
    ...Typography.captionRegular,
    color: Colors.foundation.grey600,
  },
  destructiveText: {
    color: '#E02D2D',
  },
  divider: {
    height: 1,
    marginLeft: 68,
    backgroundColor: 'rgba(217, 217, 217, 0.20)',
  },
});
