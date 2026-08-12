import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import Text from '@/components/common/AppText';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';

const CARD_HEIGHT = 94;
const CIRCLE_SIZE = 56;
const STROKE_WIDTH = 4;
const RADIUS = (CIRCLE_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const GREY_700 = '#595959';
const CARD_BORDER = 'rgba(201, 201, 201, 0.30)';

interface PhotoTripDetectionProgressCardProps {
  progress: number;
  onPress?: () => void;
}

export default function PhotoTripDetectionProgressCard({
  progress,
  onPress,
}: PhotoTripDetectionProgressCardProps) {
  const normalizedProgress = normalizeProgress(progress);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`사진첩에서 여행 찾기 ${normalizedProgress}% 완료`}
      accessibilityHint="누르면 사진첩 여행 찾기 진행 화면으로 이동합니다"
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.progressCircleWrap}>
        <CircularProgress progress={normalizedProgress} />
        <Text style={styles.progressText}>{normalizedProgress}%</Text>
      </View>

      <View style={styles.content}>
        <Text numberOfLines={1} style={styles.title}>
          사진첩에서 여행을 찾는 중이에요
        </Text>
        <Text numberOfLines={1} style={styles.description}>
          현재 {normalizedProgress}% 완료
        </Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${normalizedProgress}%` }]} />
        </View>
        <Text numberOfLines={1} style={styles.footerText}>
          분석이 끝나면 알려드릴게요
        </Text>
      </View>
    </Pressable>
  );
}

function CircularProgress({ progress }: { progress: number }) {
  const strokeDashoffset = CIRCUMFERENCE - (progress / 100) * CIRCUMFERENCE;

  return (
    <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE}>
      <Circle
        cx={CIRCLE_SIZE / 2}
        cy={CIRCLE_SIZE / 2}
        r={RADIUS}
        stroke={CARD_BORDER}
        strokeWidth={STROKE_WIDTH}
        fill="none"
      />
      <Circle
        cx={CIRCLE_SIZE / 2}
        cy={CIRCLE_SIZE / 2}
        r={RADIUS}
        stroke={Colors.foundation.black}
        strokeWidth={STROKE_WIDTH}
        fill="none"
        strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        rotation="-90"
        originX={CIRCLE_SIZE / 2}
        originY={CIRCLE_SIZE / 2}
      />
    </Svg>
  );
}

function normalizeProgress(progress: number) {
  return Math.min(Math.max(Math.round(progress), 0), 100);
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    height: CARD_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingTop: Spacing.md,
    paddingRight: Spacing.lg,
    paddingBottom: Spacing.md,
    paddingLeft: Spacing.md,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    backgroundColor: 'rgba(255, 255, 255, 0.80)',
    shadowColor: Colors.foundation.black,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  cardPressed: {
    opacity: 0.82,
  },
  progressCircleWrap: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressText: {
    position: 'absolute',
    ...Typography.body2Emphasized,
    color: Colors.foundation.black,
  },
  content: {
    flex: 1,
    height: 70,
    justifyContent: 'center',
    minWidth: 0,
  },
  title: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.black,
    letterSpacing: 0,
  },
  description: {
    marginTop: 2,
    ...Typography.captionRegular,
    color: GREY_700,
    letterSpacing: 0,
  },
  progressTrack: {
    height: 5,
    marginTop: 6,
    overflow: 'hidden',
    borderRadius: Radius.full,
    backgroundColor: Colors.light.borderDefault,
  },
  progressFill: {
    height: 5,
    borderRadius: Radius.full,
    backgroundColor: Colors.foundation.black,
  },
  footerText: {
    marginTop: Spacing.xs,
    ...Typography.captionRegular,
    color: GREY_700,
    letterSpacing: 0,
  },
});
