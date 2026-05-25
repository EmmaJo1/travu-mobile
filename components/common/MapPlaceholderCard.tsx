import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import Text from '@/components/common/AppText';
import { Colors, Radius, Typography } from '@/constants/theme';

export interface MapPlaceholderCardProps {
  /** 보조 문구 (예: "다녀온 곳 자동 표시") */
  subtitle?: string;
  /** 카드 높이 (기본 240) */
  height?: number;
  /**
   * center — record-day-detail 스타일 (수직 중앙, grey placeholder)
   * top — profile/archive 스타일 (상단 offset, caption 강조)
   */
  align?: 'center' | 'top';
  style?: StyleProp<ViewStyle>;
}

export default function MapPlaceholderCard({
  subtitle,
  height = 240,
  align = subtitle ? 'top' : 'center',
  style,
}: MapPlaceholderCardProps) {
  const isCentered = align === 'center';

  return (
    <View
      style={[
        styles.card,
        { height },
        isCentered ? styles.cardCentered : styles.cardTop,
        style,
      ]}
    >
      <Text style={isCentered ? styles.labelCentered : styles.labelTop}>지도</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    maxWidth: 350,
    alignSelf: 'center',
    borderRadius: Radius.sm,
    backgroundColor: Colors.foundation.white,
    alignItems: 'center',
  },
  cardCentered: {
    justifyContent: 'center',
  },
  cardTop: {
    paddingTop: 109,
  },
  labelCentered: {
    ...Typography.body2Regular,
    color: Colors.foundation.grey500,
    textAlign: 'center',
  },
  labelTop: {
    ...Typography.captionEmphasized,
    color: Colors.foundation.black,
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.captionEmphasized,
    color: Colors.foundation.black,
    textAlign: 'center',
  },
});
