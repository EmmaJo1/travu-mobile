import { Feather } from '@expo/vector-icons';
import React from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  View,
  type ImageSourcePropType,
} from 'react-native';

import Text from '@/components/common/AppText';
import { Colors, FontFamily, Radius, Typography } from '@/constants/theme';

export interface TimeLineCardProps {
  timeLabel: string;
  placeName: string;
  categoryLabel: string;
  cityLabel: string;
  memoCount: number;
  photoCount: number;
  imageSource: ImageSourcePropType;
  isLast?: boolean;
  onPress?: () => void;
}

export default function TimeLineCard({
  timeLabel,
  placeName,
  categoryLabel,
  cityLabel,
  memoCount,
  photoCount,
  imageSource,
  onPress,
}: TimeLineCardProps) {
  const normalizedTimeLabel = timeLabel.trim();
  const timeMatch = normalizedTimeLabel.match(/^(.+?)\s*(AM|PM)$/i);
  const normalizedTimeText = (timeMatch?.[1] ?? normalizedTimeLabel).trim();
  const period = timeMatch?.[2]?.toUpperCase() ?? '';
  const shouldStackTime = normalizedTimeText.includes(':');

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${placeName} 상세 보기`}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.leftContent}>
        <View style={styles.timeColumn}>
          <View style={styles.timeArea}>
            <View style={shouldStackTime ? styles.timeStacked : styles.timeInline}>
              <Text style={styles.timeNumber}>{normalizedTimeText}</Text>
              {period ? <Text style={styles.timePeriod}>{period}</Text> : null}
            </View>
          </View>
          <View style={styles.timelineLine} />
        </View>

        <View style={styles.detailColumn}>
          <View style={styles.titleBlock}>
            <View style={styles.titleRow}>
              <Text style={styles.placeName} numberOfLines={1}>
                {placeName}
              </Text>
              <Feather name="chevron-right" size={18} color={Colors.foundation.grey600} />
            </View>

            <View style={styles.categoryRow}>
              <Text style={styles.categoryText}>{categoryLabel}</Text>
              <View style={styles.dot} />
              <Text style={styles.categoryText}>{cityLabel}</Text>
            </View>
          </View>

          <View style={styles.countRow}>
            <View style={styles.countItem}>
              <Feather name="edit-3" size={16} color={Colors.foundation.black} />
              <Text style={styles.countLabel}>기록</Text>
              <Text style={styles.countValue}>{memoCount}</Text>
              <Text style={styles.countLabel}>개</Text>
            </View>
            <View style={styles.countItem}>
              <Feather name="image" size={16} color={Colors.foundation.black} />
              <Text style={styles.countLabel}>사진</Text>
              <Text style={styles.countValue}>{photoCount}</Text>
              <Text style={styles.countLabel}>장</Text>
            </View>
          </View>
        </View>
      </View>

      <Image
        source={imageSource}
        style={styles.thumbnail}
        resizeMode="cover"
        accessibilityLabel={`${placeName} 대표 이미지`}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  cardPressed: {
    opacity: 0.86,
  },
  leftContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    minWidth: 0,
  },
  timeColumn: {
    width: 36,
    height: 76,
    alignItems: 'center',
    gap: 4,
  },
  timeArea: {
    width: 36,
    minHeight: 28,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  timeInline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  timeStacked: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 2,
  },
  timeNumber: {
    fontFamily: FontFamily.pretendardMedium,
    fontSize: 12,
    lineHeight: 14,
    color: Colors.foundation.grey500,
    textAlign: 'center',
    includeFontPadding: false,
  },
  timePeriod: {
    fontFamily: FontFamily.pretendardMedium,
    fontSize: 12,
    lineHeight: 14,
    color: Colors.foundation.grey500,
    textAlign: 'center',
    includeFontPadding: false,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: Colors.foundation.grey100,
  },
  detailColumn: {
    flex: 1,
    minHeight: 76,
    justifyContent: 'flex-start',
    gap: 8,
    minWidth: 0,
  },
  titleBlock: {
    gap: 2,
  },
  titleRow: {
    minHeight: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  placeName: {
    ...Typography.body1Emphasized,
    flexShrink: 1,
    color: Colors.foundation.black,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  categoryText: {
    ...Typography.captionEmphasized,
    color: Colors.foundation.grey400,
  },
  dot: {
    width: 2,
    height: 2,
    borderRadius: Radius.full,
    backgroundColor: Colors.foundation.grey500,
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  countItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  countLabel: {
    ...Typography.body2Regular,
    color: Colors.foundation.black,
  },
  countValue: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.black,
  },
  thumbnail: {
    width: 90,
    height: 72,
    borderRadius: Radius.xs,
    backgroundColor: Colors.foundation.white,
  },
});
