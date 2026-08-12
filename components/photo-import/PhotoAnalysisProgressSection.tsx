import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import Text from '@/components/common/AppText';
import { Colors, Typography } from '@/constants/theme';

const DEFAULT_PREVIEW_TOTAL = 1246;
const CIRCLE_SIZE = 188;
const CIRCLE_STROKE_WIDTH = 10;
const CIRCLE_RADIUS = (CIRCLE_SIZE - CIRCLE_STROKE_WIDTH) / 2;
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

interface PhotoAnalysisProgressSectionProps {
  phase?: 'collecting' | 'preparing_files' | 'resolving_locations' | 'building_candidates';
  phaseCompletedCount?: number;
  phaseTotalCount?: number;
  progress: number;
  scannedAssetCount?: number;
  totalAssetCount?: number;
}

const PHASE_STATUS_TEXT = {
  collecting: '사진 불러오는 중',
  preparing_files: '원본 사진 준비 중',
  resolving_locations: '촬영 지역 확인 중',
  building_candidates: '여행 후보 정리 중',
} as const;

function clampProgress(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

export default function PhotoAnalysisProgressSection({
  phase,
  phaseCompletedCount,
  phaseTotalCount,
  progress,
  scannedAssetCount,
  totalAssetCount,
}: PhotoAnalysisProgressSectionProps) {
  const hasPhaseCounts = typeof phaseTotalCount === 'number';
  const hasTotal = typeof totalAssetCount === 'number' && totalAssetCount > 0;
  const total = hasPhaseCounts ? phaseTotalCount : hasTotal ? totalAssetCount : DEFAULT_PREVIEW_TOTAL;
  const completed = hasPhaseCounts ? phaseCompletedCount : scannedAssetCount;
  const percent = clampProgress(progress);
  const scanned = typeof completed === 'number'
    ? Math.max(0, Math.min(completed, total))
    : Math.round((total * percent) / 100);
  const strokeDashoffset = CIRCLE_CIRCUMFERENCE * (1 - percent / 100);

  return (
    <View style={styles.container}>
      <View style={styles.circleWrap}>
        <Svg
          width={CIRCLE_SIZE}
          height={CIRCLE_SIZE}
          viewBox={`0 0 ${CIRCLE_SIZE} ${CIRCLE_SIZE}`}
          style={StyleSheet.absoluteFill}
        >
          <Circle
            cx={CIRCLE_SIZE / 2}
            cy={CIRCLE_SIZE / 2}
            r={CIRCLE_RADIUS}
            stroke={Colors.warm.beige}
            strokeWidth={CIRCLE_STROKE_WIDTH}
            fill="none"
          />
          <Circle
            cx={CIRCLE_SIZE / 2}
            cy={CIRCLE_SIZE / 2}
            r={CIRCLE_RADIUS}
            stroke={Colors.foundation.black}
            strokeWidth={CIRCLE_STROKE_WIDTH}
            strokeLinecap="round"
            strokeDasharray={`${CIRCLE_CIRCUMFERENCE} ${CIRCLE_CIRCUMFERENCE}`}
            strokeDashoffset={strokeDashoffset}
            fill="none"
            rotation="-90"
            originX={CIRCLE_SIZE / 2}
            originY={CIRCLE_SIZE / 2}
          />
        </Svg>
        <View style={styles.centerContent}>
          <Text style={styles.percentText}>{percent}%</Text>
          <Text style={styles.countText}>
            {scanned.toLocaleString()} / {total.toLocaleString()}장
          </Text>
          <Text style={styles.statusText}>분석 완료</Text>
        </View>
      </View>
      <Text style={styles.currentStatusText}>
        {phase ? PHASE_STATUS_TEXT[phase] : '여행 후보를 정리하고 있어요'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 300,
    alignItems: 'center',
  },
  circleWrap: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentText: {
    ...Typography.title1,
    fontSize: 34,
    lineHeight: 42,
    color: Colors.foundation.black,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
    letterSpacing: 0,
  },
  countText: {
    marginTop: 6,
    ...Typography.body2Emphasized,
    color: Colors.foundation.black,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
    letterSpacing: 0,
  },
  statusText: {
    marginTop: 2,
    ...Typography.captionRegular,
    color: Colors.foundation.grey500,
    textAlign: 'center',
    letterSpacing: 0,
  },
  currentStatusText: {
    marginTop: 28,
    ...Typography.body2Emphasized,
    color: Colors.foundation.grey700,
    textAlign: 'center',
    letterSpacing: 0,
  },
});
