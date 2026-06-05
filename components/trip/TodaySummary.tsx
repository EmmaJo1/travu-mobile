import { Colors } from '@/constants/theme';
import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Text from '@/components/common/AppText';
import FrostedGlassSurface from '@/components/common/FrostedGlassSurface';

const FIGMA_PRETENDARD = 'Pretendard';
const FIGMA_NOTO_SERIF_KR = 'Noto Serif KR';

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
    <FrostedGlassSurface
      style={[styles.shadowWrap, style]}
      contentStyle={styles.wrap}
      borderRadius={24}
      intensity={42}
      tint="light"
      fillColor="rgba(255, 255, 255, 0.26)"
      borderColor="rgba(255, 255, 255, 0.56)"
    >
      <View style={styles.content}>
        <Text style={styles.title}>TODAY&apos;S JOURNEY</Text>
        <View style={styles.statsRow}>
          <SummaryMetric value={placeCount} unit="곳" label="방문" metricWidth={29} valueSize={17} />
          <View style={styles.divider} />
          <SummaryMetric value={distanceKm} unit="km" label="이동" metricWidth={49} valueSize={18} />
          <View style={styles.divider} />
          <SummaryMetric value={momentCount} unit="개" label="기록" metricWidth={29} valueSize={17} />
        </View>
      </View>
    </FrostedGlassSurface>
  );
}

function SummaryMetric({
  value,
  unit,
  label,
  metricWidth,
  valueSize,
}: {
  value: number;
  unit: string;
  label: string;
  metricWidth: number;
  valueSize: number;
}) {
  return (
    <View style={[styles.metric, { width: metricWidth }]}>
      <View style={styles.valueRow}>
        <Text style={[styles.value, { fontSize: valueSize }]}>{value}</Text>
        <Text style={styles.unit}>{unit}</Text>
      </View>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  shadowWrap: {
    height: 104,
    borderRadius: 24,
  },
  wrap: {
    height: 104,
  },
  content: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
  },
  title: {
    fontFamily: FIGMA_PRETENDARD,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: Colors.foundation.black,
    zIndex: 1,
  },
  statsRow: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    zIndex: 1,
  },
  metric: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 4,
  },
  valueRow: {
    height: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    alignSelf: 'stretch',
  },
  value: {
    fontFamily: FIGMA_NOTO_SERIF_KR,
    lineHeight: 24,
    fontWeight: '900',
    color: Colors.foundation.black,
  },
  unit: {
    fontFamily: FIGMA_NOTO_SERIF_KR,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
    color: Colors.foundation.grey800,
  },
  label: {
    fontFamily: FIGMA_PRETENDARD,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    color: Colors.foundation.grey800,
    textAlign: 'center',
  },
  divider: {
    width: 2,
    height: 32,
    borderRadius: 1,
    backgroundColor: 'rgba(217, 217, 217, 0.72)',
  },
});
