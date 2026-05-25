import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, StyleSheet, TouchableOpacity, View, type StyleProp, type ViewStyle } from 'react-native';
import Text from '@/components/common/AppText';

import { Colors, Spacing, Typography } from '@/constants/theme';

/** LeftSlot / RightSlot 동일 폭 — Date를 화면 전체 기준 중앙 정렬할 때 사용 */
const BALANCED_SIDE_SLOT_WIDTH = 24;

interface ScreenHeaderProps {
  title?: string;
  centerSlot?: React.ReactNode;
  onBackPress?: () => void;
  onSettingsPress?: () => void;
  rightSlot?: React.ReactNode;
  /** true: LeftSlot · Date(fill) · RightSlot(동일 폭, 비어 있어도 유지) */
  balancedSlots?: boolean;
  style?: StyleProp<ViewStyle>;
}

export default function ScreenHeader({
  title,
  centerSlot,
  onBackPress,
  onSettingsPress,
  rightSlot,
  balancedSlots = false,
  style,
}: ScreenHeaderProps) {
  if (balancedSlots) {
    return (
      <View style={[styles.header, styles.headerBalanced, style]}>
        <View style={styles.balancedSideSlot}>
          {onBackPress ? (
            <TouchableOpacity onPress={onBackPress} activeOpacity={0.75} style={styles.sideBtn}>
              <Image
                source={require('../../assets/images/screenheader-back.png')}
                style={styles.backIcon}
                resizeMode="contain"
              />
            </TouchableOpacity>
          ) : (
            <View style={styles.sideBtn} />
          )}
        </View>

        <View style={styles.balancedCenter}>{centerSlot}</View>

        <View style={styles.balancedSideSlot}>
          {rightSlot ?? <View style={styles.sideBtn} />}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.header, style]}>
      {onBackPress ? (
        <TouchableOpacity onPress={onBackPress} activeOpacity={0.75} style={styles.sideBtn}>
          <Image
            source={require('../../assets/images/screenheader-back.png')}
            style={styles.backIcon}
            resizeMode="contain"
          />
        </TouchableOpacity>
      ) : (
        <View style={styles.sideBtn} />
      )}

      {title ? (
        <View style={styles.titleOverlay} pointerEvents="none">
          <Text style={styles.title}>{title}</Text>
        </View>
      ) : (
        <View style={styles.center}>{centerSlot}</View>
      )}

      <View style={styles.right}>
        {rightSlot ??
          (onSettingsPress ? (
            <TouchableOpacity
              onPress={onSettingsPress}
              activeOpacity={0.75}
              style={styles.sideBtn}
            >
              <Ionicons name="settings-outline" size={24} color={Colors.foundation.black} />
            </TouchableOpacity>
          ) : (
            <View style={styles.sideBtn} />
          ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    width: '100%',
    height: 40,
    paddingLeft: 12,
    paddingRight: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.light.bgScreen,
  },
  headerBalanced: {
    paddingLeft: Spacing.xl,
    paddingRight: Spacing.xl,
    justifyContent: 'flex-start',
  },
  balancedSideSlot: {
    width: BALANCED_SIDE_SLOT_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balancedCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideBtn: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    width: 24,
    height: 24,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...Typography.body1Emphasized,
    color: Colors.foundation.black,
  },
  right: {
    minWidth: 24,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
});
