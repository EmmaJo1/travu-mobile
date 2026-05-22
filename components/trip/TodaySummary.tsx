import { Colors } from '@/constants/theme';
import React from 'react';
import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Text from '@/components/common/AppText';

/** Noto Serif KR VF — weight별 family 분리 대신 fontWeight로 굵기 지정 (원본 Figma 스펙) */
const NOTO_SERIF_KR = 'Noto Serif KR';

interface TodaySummaryProps {
  distanceKm: number;
  placeCount: number;
  momentCount: number;
  style?: StyleProp<ViewStyle>;
}

export default function TodaySummary({
  distanceKm,
  placeCount,
  momentCount,
  style,
}: TodaySummaryProps) {
  return (
    <View style={[styles.wrap, style]}>
      <Image
        source={require('../../assets/images/todaysummary-sidebar.png')}
        style={styles.sideBar}
        resizeMode="stretch"
      />
      <View style={styles.content}>
        <Text style={styles.title}>오늘은,</Text>
        <View style={styles.lines}>
          <View style={styles.line}>
            <Text style={styles.num}>{distanceKm}</Text>
            <Text style={styles.text}> km를 이동하여</Text>
          </View>
          <View style={styles.lineCompact}>
            <Text style={styles.num}>{placeCount}</Text>
            <Text style={styles.text}> 곳을 방문하였고</Text>
          </View>
          <View style={styles.lineCompactFill}>
            <Text style={styles.num}>{momentCount}</Text>
            <Text style={styles.text}> 번의 순간을 기록했어요</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sideBar: {
    width: 8,
    height: 108,
  },
  content: {
    width: 181,
    gap: 8,
  },
  title: {
    fontFamily: NOTO_SERIF_KR,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '700',
    color: Colors.foundation.grey800,
  },
  lines: {
    gap: 6,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  lineCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
  lineCompactFill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    gap: 1,
  },
  num: {
    fontFamily: NOTO_SERIF_KR,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '900',
    color: Colors.foundation.black,
  },
  text: {
    fontFamily: NOTO_SERIF_KR,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
    color: Colors.foundation.grey800,
  },
});
