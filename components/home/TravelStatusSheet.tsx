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
const SHEET_HEIGHT = 388;
const ANIMATION_DURATION = 400;

interface TravelStatusSheetProps {
  visible: boolean;
  onClose: () => void;
  onPressEditPeriod?: () => void;
  onPressChangeDestination?: () => void;
  onPressEndTrip?: () => void;
  avatarImage?: ImageSourcePropType;
  title?: string;
  dateLabel?: string;
  weekdayLabel?: string;
  dayLabel?: string;
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
          <Text style={styles.menuDescription}>{description}</Text>
        </View>
      </View>
      <Feather name="chevron-right" size={24} color={Colors.foundation.black} />
    </Pressable>
  );
}

export default function TravelStatusSheet({
  visible,
  onClose,
  onPressEditPeriod,
  onPressChangeDestination,
  onPressEndTrip,
  avatarImage = AVATAR_IMAGE,
  title = 'Paris 여행',
  dateLabel = '11월 2일',
  weekdayLabel = 'Mon',
  dayLabel = 'Day 1',
}: TravelStatusSheetProps) {
  const [shouldRender, setShouldRender] = React.useState(visible);
  const sheetTranslateY = React.useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const backdropOpacity = React.useRef(new Animated.Value(0)).current;

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
    ]).start(({ finished }) => {
      if (finished) {
        setShouldRender(false);
      }
    });
  }, [backdropOpacity, sheetTranslateY, visible]);

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
            intensity={18}
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
                <Text style={styles.tripTitle}>{title}</Text>
                <View style={styles.recordingBadge}>
                  <View style={styles.statusDot} />
                  <Text style={styles.recordingText}>여행 기록 중</Text>
                </View>
              </View>

              <View style={styles.metaRow}>
                <View style={styles.dateRow}>
                  <Text style={styles.metaText}>{dateLabel}</Text>
                  <Text style={styles.metaText}>{weekdayLabel}</Text>
                </View>
                <View style={styles.metaDot} />
                <Text style={styles.metaText}>{dayLabel}</Text>
              </View>
            </View>
          </View>

          <View style={styles.menuCard}>
            <BlurView
              tint="light"
              intensity={4}
              experimentalBlurMethod="dimezisBlurView"
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.menuCardFill} />
            <LinearGradient
              colors={[
                'rgba(255, 255, 255, 0.34)',
                'rgba(255, 255, 255, 0.06)',
                'rgba(255, 255, 255, 0.00)',
              ]}
              locations={[0, 0.52, 1]}
              start={{ x: 1, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.menuGlassLight}
            />
            <LinearGradient
              colors={[
                'rgba(255, 255, 255, 0.24)',
                'rgba(255, 255, 255, 0.00)',
                'rgba(255, 255, 255, 0.18)',
              ]}
              locations={[0, 0.5, 1]}
              start={{ x: 0.12, y: 0 }}
              end={{ x: 0.88, y: 1 }}
              style={styles.menuRefractionLayer}
            />
            <LinearGradient
              colors={[
                'rgba(52, 145, 255, 0.08)',
                'rgba(255, 255, 255, 0.00)',
                'rgba(255, 112, 145, 0.08)',
              ]}
              locations={[0, 0.5, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.menuDispersionLayer}
            />
            <View style={styles.menuFrostLayer} />
            <SheetMenuItem
              iconName="calendar"
              title="여행 기간 수정"
              description="11월 2일~11월 12일 (11일)"
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
    right: 99,
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
    width: 174,
    height: 48,
    gap: 4,
  },
  titleRow: {
    width: 174,
    height: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tripTitle: {
    width: 78,
    height: 24,
    fontFamily: FontFamily.pretendardSemiBold,
    fontSize: 18,
    lineHeight: 24,
    color: Colors.foundation.black,
  },
  recordingBadge: {
    width: 88,
    height: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 2,
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
    width: 128,
    height: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateRow: {
    width: 82,
    height: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontFamily: FontFamily.pretendardMedium,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.foundation.grey400,
  },
  metaDot: {
    width: 4,
    height: 4,
    borderRadius: Radius.full,
    backgroundColor: Colors.foundation.grey400,
  },
  menuCard: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 28,
    height: 236,
    paddingTop: 24,
    paddingHorizontal: 28,
    borderRadius: 16,
    overflow: 'hidden',
  },
  menuCardFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
  },
  menuGlassLight: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.8,
  },
  menuRefractionLayer: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.8,
  },
  menuDispersionLayer: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.5,
  },
  menuFrostLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  menuRow: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  menuTextBlock: {
    width: 132,
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
  divider: {
    height: 2,
    marginVertical: 16,
    marginLeft: 40,
    marginRight: 2,
    backgroundColor: 'rgba(217, 217, 217, 0.20)',
  },
});
