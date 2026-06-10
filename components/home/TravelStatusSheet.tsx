import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import {
  Animated,
  Easing,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  View,
  type ImageSourcePropType,
} from 'react-native';

import Text from '@/components/common/AppText';
import { Colors, FontFamily, Radius } from '@/constants/theme';

const AVATAR_IMAGE = require('../../assets/images/archive-frame-paris.jpg') as ImageSourcePropType;
const SHEET_HEIGHT = 396;
const ANIMATION_DURATION = 400;

interface TravelStatusSheetProps {
  visible: boolean;
  onClose: () => void;
  onDismiss?: () => void;
  onPressEditPeriod?: () => void;
  onPressChangeDestination?: () => void;
  onPressEndTrip?: () => void;
  avatarImage?: ImageSourcePropType;
  title?: string;
  dateLabel?: string;
  weekdayLabel?: string;
  dayLabel?: string;
  statusLabel?: string;
  statusDotColor?: string;
  dateRangeDescription?: string;
}

interface SheetMenuItemProps {
  iconName: keyof typeof Feather.glyphMap;
  title: string;
  description: string;
  isDestructive?: boolean;
  onPress?: () => void;
}

function SheetMenuItem({
  iconName,
  title,
  description,
  isDestructive = false,
  onPress,
}: SheetMenuItemProps) {
  const tintColor = isDestructive ? '#DB2222' : '#353535';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      hitSlop={8}
      onPress={onPress}
      style={styles.menuRow}
    >
      <View style={styles.menuLeft}>
        <Feather name={iconName} size={28} color={tintColor} />
        <View style={styles.menuTextBlock}>
          <Text style={[styles.menuTitle, isDestructive && styles.destructiveTitle]}>
            {title}
          </Text>
          <Text style={styles.menuDescription} numberOfLines={1}>
            {description}
          </Text>
        </View>
      </View>
      <Feather
        name="chevron-right"
        size={24}
        color={Colors.foundation.black}
        style={styles.chevron}
      />
    </Pressable>
  );
}

export default function TravelStatusSheet({
  visible,
  onClose,
  onDismiss,
  onPressEditPeriod,
  onPressChangeDestination,
  onPressEndTrip,
  avatarImage = AVATAR_IMAGE,
  title = 'Paris 여행',
  dateLabel = '11월 2일',
  weekdayLabel = 'Mon',
  dayLabel = 'Day 1',
  statusLabel = '여행 기록 중',
  statusDotColor = '#D13434',
  dateRangeDescription = '11월 2일~11월 12일 (11일)',
}: TravelStatusSheetProps) {
  const [shouldRender, setShouldRender] = React.useState(visible);
  const sheetTranslateY = React.useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const backdropOpacity = React.useRef(new Animated.Value(0)).current;
  const onDismissRef = React.useRef(onDismiss);

  React.useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  React.useEffect(() => {
    if (visible) {
      setShouldRender(true);
      sheetTranslateY.setValue(SHEET_HEIGHT);
      backdropOpacity.setValue(0);
      Animated.parallel([
        Animated.timing(sheetTranslateY, {
          toValue: 0,
          duration: ANIMATION_DURATION,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
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
      Animated.timing(sheetTranslateY, {
        toValue: SHEET_HEIGHT,
        duration: ANIMATION_DURATION,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: ANIMATION_DURATION,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShouldRender(false);
      requestAnimationFrame(() => {
        onDismissRef.current?.();
      });
    });
  }, [backdropOpacity, sheetTranslateY, shouldRender, visible]);

  const handleClose = React.useCallback(() => {
    onClose();
  }, [onClose]);

  if (!shouldRender) {
    return null;
  }

  return (
    <Modal
      animationType="none"
      transparent
      visible={shouldRender}
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View style={styles.modalRoot}>
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: backdropOpacity }]}>
          <BlurView
            tint="default"
            intensity={2}
            experimentalBlurMethod="dimezisBlurView"
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.dimLayer} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="여행 상태 시트 닫기"
            style={StyleSheet.absoluteFill}
            onPress={handleClose}
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            {
              transform: [{ translateY: sheetTranslateY }],
            },
          ]}
        >
          <View style={styles.handle} />

          <View style={styles.tripHeader}>
            <Image source={avatarImage} style={styles.avatar} resizeMode="cover" />

            <View style={styles.tripTextBlock}>
              <View style={styles.titleRow}>
                <Text style={styles.tripTitle} numberOfLines={1}>
                  {title}
                </Text>
                <View style={styles.recordingBadge}>
                  <View style={styles.recordingBadgeContent}>
                    <View style={[styles.statusDot, { backgroundColor: statusDotColor }]} />
                    <Text style={styles.recordingText}>{statusLabel}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.metaRow}>
                <View style={styles.dateRow}>
                  <Text style={styles.metaText}>{dateLabel}</Text>
                  <Text style={styles.metaText}>{weekdayLabel}</Text>
                </View>
                <View style={styles.metaDot} />
                <Text style={styles.metaText} numberOfLines={1}>
                  {dayLabel}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.menuCard}>
            <BlurView
              tint="light"
              intensity={4}
              experimentalBlurMethod="dimezisBlurView"
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
            <View style={styles.menuFillLayer} pointerEvents="none" />
            <LinearGradient
              colors={[
                'rgba(255, 255, 255, 0.38)',
                'rgba(255, 255, 255, 0.08)',
                'rgba(255, 255, 255, 0.16)',
              ]}
              locations={[0, 0.48, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
            <View style={styles.menuInnerHighlight} pointerEvents="none" />
            <View style={styles.menuContent}>
              <SheetMenuItem
                iconName="calendar"
                title="여행 기간 수정"
                description={dateRangeDescription}
                onPress={onPressEditPeriod}
              />
              <View style={styles.divider} />
              <SheetMenuItem
                iconName="map-pin"
                title="여행지 변경"
                description="여행 장소를 변경합니다"
                onPress={onPressChangeDestination}
              />
              <View style={styles.divider} />
              <SheetMenuItem
                iconName="power"
                title="여행 종료"
                description="자동 기록을 종료합니다"
                isDestructive
                onPress={onPressEndTrip}
              />
            </View>
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
  dimLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(141, 141, 141, 0.50)',
  },
  sheet: {
    height: SHEET_HEIGHT,
    backgroundColor: '#F9F5F3',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  handle: {
    position: 'absolute',
    top: 8,
    left: '50%',
    width: 100,
    height: 4,
    marginLeft: -50,
    borderRadius: 2,
    backgroundColor: '#BEBEBE',
  },
  tripHeader: {
    position: 'absolute',
    top: 38,
    left: 21,
    right: 21,
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 32,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: Radius.full,
    backgroundColor: Colors.foundation.grey100,
  },
  tripTextBlock: {
    flex: 1,
    height: 48,
    gap: 4,
  },
  titleRow: {
    height: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tripTitle: {
    flexShrink: 1,
    minWidth: 0,
    height: 24,
    fontFamily: FontFamily.pretendardSemiBold,
    fontSize: 18,
    lineHeight: 24,
    color: Colors.foundation.black,
  },
  recordingBadge: {
    width: 88,
    height: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(193, 193, 193, 0.30)',
  },
  recordingBadgeContent: {
    width: 68,
    height: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: Radius.full,
    backgroundColor: '#D13434',
  },
  recordingText: {
    width: 58,
    height: 16,
    fontFamily: FontFamily.pretendardMedium,
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
    color: Colors.foundation.black,
  },
  metaRow: {
    minHeight: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  metaText: {
    fontFamily: FontFamily.pretendardMedium,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.foundation.grey400,
    flexShrink: 0,
  },
  metaDot: {
    width: 4,
    height: 4,
    flexShrink: 0,
    borderRadius: Radius.full,
    backgroundColor: Colors.foundation.grey400,
  },
  menuCard: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 32,
    height: 236,
    paddingTop: 24,
    paddingHorizontal: 28,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(193, 193, 193, 0.20)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  menuFillLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  menuInnerHighlight: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.4)',
    borderLeftColor: 'rgba(255, 255, 255, 0.2)',
  },
  menuContent: {
    position: 'relative',
    zIndex: 1,
  },
  menuRow: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  menuTextBlock: {
    flex: 1,
    minWidth: 0,
    height: 40,
    gap: 2,
  },
  menuTitle: {
    height: 22,
    fontFamily: FontFamily.pretendardMedium,
    fontSize: 14,
    lineHeight: 22,
    color: Colors.foundation.black,
  },
  destructiveTitle: {
    color: '#DB2222',
  },
  menuDescription: {
    height: 16,
    fontFamily: FontFamily.pretendardMedium,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.foundation.grey400,
  },
  chevron: {
    flexShrink: 0,
    marginLeft: 12,
  },
  divider: {
    height: 1,
    marginVertical: 16,
    backgroundColor: 'rgba(217, 217, 217, 0.20)',
  },
});
