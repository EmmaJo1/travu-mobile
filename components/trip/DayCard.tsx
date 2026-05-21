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
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Colors } from '@/constants/theme';

export interface DayCardProps {
  /** Day 번호 (1, 2, 3 …) */
  dayNumber: number;
  /** 표시할 날짜+요일 문자열 (예: "2025.8.26 화") */
  date: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export default function DayCard({ dayNumber, date, onPress, style }: DayCardProps) {
  const Wrapper = onPress ? TouchableOpacity : View;
  const wrapperProps = onPress ? { onPress, activeOpacity: 0.75 as number } : {};

  return (
    <Wrapper style={[styles.card, style]} {...wrapperProps}>
      {/* 상단: Day 번호 */}
      <View style={styles.dayRow}>
        <Text style={styles.dayText}>Day {dayNumber}</Text>
      </View>

      {/* 하단: 날짜 + 화살표 */}
      <View style={styles.dateRow}>
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
  dayRow: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            9,
    alignSelf:      'stretch',
  },
  dayText: {
    fontFamily:  'Pretendard-SemiBold',
    fontSize: 24,
    lineHeight:  34,
    fontWeight:  '600',
    color:       Colors.foundation.black,
  },
  dateRow: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    alignSelf:      'stretch',
    gap:            5,
  },
  dateText: {
    fontFamily:  'Pretendard-Regular',
    fontSize: 14,
    lineHeight:  20,
    fontWeight:  '400',
    color:       Colors.foundation.black,
    flexShrink:  1,
  },
  arrow: {
    width:       12,
    height:      12,
    flexShrink:  0,
  },
});
