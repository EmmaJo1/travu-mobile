/**
 * DayCard
 *
 * Figma: 1096:2748 "DayCard"
 * — day-record 화면의 날짜 헤더/선택기
 * — 고정 너비 109, 컬럼 레이아웃, 중앙 정렬
 * — 상단: "Day N" (Pretendard SemiBold 24/36, 검정)
 * — 하단: 날짜+요일 문자열 (Body 1 Regular 16/22) + 드롭다운 화살표
 */
import React from 'react';
import { Image, StyleSheet, TouchableOpacity, View, type StyleProp, type ViewStyle } from 'react-native';
import Text from '@/components/common/AppText';

import { Colors, FontFamily, Typography } from '@/constants/theme';

export interface DayCardProps {
  /** Day 번호 (1, 2, 3 …) */
  dayNumber: number;
  /** 표시할 날짜+요일 문자열 (예: "2025.8.26 화") */
  date: string;
  onPress?: () => void;
  /** day-archive-detail 등 — 카드 내부 텍스트 왼쪽 정렬 */
  align?: 'left' | 'center';
  style?: StyleProp<ViewStyle>;
}

export default function DayCard({
  dayNumber,
  date,
  onPress,
  align = 'center',
  style,
}: DayCardProps) {
  const isLeft = align === 'left';
  const Wrapper = onPress ? TouchableOpacity : View;
  const wrapperProps = onPress ? { onPress, activeOpacity: 0.75 as number } : {};

  return (
    <Wrapper style={[styles.card, isLeft && styles.cardLeft, style]} {...wrapperProps}>
      <View style={[styles.dayRow, isLeft && styles.rowLeft]}>
        <Text style={styles.dayText}>Day {dayNumber}</Text>
      </View>

      <View style={[styles.dateRow, isLeft && styles.rowLeft]}>
        <Text style={styles.dateText} numberOfLines={1}>
          {date}
        </Text>
        <Image
          source={require('../../assets/images/daycard-triangle.png')}
          style={styles.arrow}
          resizeMode="contain"
        />
      </View>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  card: {
    width:          109,
    alignItems:     'center',
  },
  cardLeft: {
    alignItems: 'flex-start',
  },
  dayRow: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            9,
    alignSelf:      'stretch',
  },
  dayText: {
    fontFamily: FontFamily.pretendardSemiBold,
    fontSize:   24,
    lineHeight: 36,
    color:      Colors.foundation.black,
  },
  dateRow: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    alignSelf:      'stretch',
    gap:            5,
  },
  rowLeft: {
    justifyContent: 'flex-start',
  },
  dateText: {
    ...Typography.body1Regular,
    color:      Colors.foundation.black,
    flexShrink: 1,
  },
  arrow: {
    width:      12,
    height:     12,
    flexShrink: 0,
  },
});
