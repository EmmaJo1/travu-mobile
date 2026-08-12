import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import Text from '@/components/common/AppText';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';

interface PhotoImportResultsCardProps {
  tripCount: number;
  onPressViewResults: () => void;
}

export default function PhotoImportResultsCard({
  tripCount,
  onPressViewResults,
}: PhotoImportResultsCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`사진첩에서 찾은 지난 여행 ${tripCount}개 확인하기`}
      accessibilityHint="누르면 지난 여행 후보 목록으로 이동합니다"
      onPress={onPressViewResults}
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed,
      ]}
    >
      <View style={styles.copyBlock}>
        <Text style={styles.title}>지난 여행 {tripCount}개를 찾았어요</Text>
        <Text style={styles.description}>사진첩 속 여행을 확인해 보세요</Text>
      </View>

      <View pointerEvents="none" style={styles.buttonPill}>
        <Text style={styles.buttonLabel}>확인하기</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    height: 94,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.md,
    paddingRight: Spacing.lg,
    paddingBottom: Spacing.md,
    paddingLeft: Spacing.md,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(201, 201, 201, 0.30)',
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
  copyBlock: {
    height: 70,
    justifyContent: 'center',
    alignItems: 'flex-start',
    gap: Spacing.xs,
  },
  title: {
    ...Typography.body1Emphasized,
    color: Colors.foundation.black,
    letterSpacing: 0,
  },
  description: {
    ...Typography.body2Regular,
    color: '#595959',
    letterSpacing: 0,
  },
  buttonPill: {
    width: 66,
    height: 26,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.foundation.black,
  },
  buttonLabel: {
    ...Typography.captionRegular,
    color: Colors.foundation.white,
    letterSpacing: 0,
  },
});
