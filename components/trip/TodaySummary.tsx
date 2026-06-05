import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Radius } from '@/constants/theme';
import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Text from '@/components/common/AppText';

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
    <View style={[styles.shadowWrap, style]}>
      <View style={styles.wrap}>
        <LinearGradient
          colors={[
            'rgba(255, 255, 255, 0.32)',
            'rgba(255, 255, 255, 0.10)',
            'rgba(255, 255, 255, 0)',
          ]}
          locations={[0, 0.44, 1]}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.glassLight}
        />
        <View style={styles.frostLayer} />

        <Text style={styles.title}>TODAY&apos;S JOURNEY</Text>
        <View style={styles.statsRow}>
          <SummaryMetric value={placeCount} unit="곳" label="방문" metricWidth={29} valueSize={17} />
          <View style={styles.divider} />
          <SummaryMetric value={distanceKm} unit="km" label="이동" metricWidth={49} valueSize={18} />
          <View style={styles.divider} />
          <SummaryMetric value={momentCount} unit="개" label="기록" metricWidth={29} valueSize={17} />
        </View>
      </View>
    </View>
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
    borderRadius: Radius.lg,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 4,
  },
  wrap: {
    height: 104,
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(199, 199, 199, 0.5)',
    borderRadius: Radius.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    overflow: 'hidden',
  },
  glassLight: {
    ...StyleSheet.absoluteFillObject,
  },
  frostLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
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
