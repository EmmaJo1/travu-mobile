import { Feather } from '@expo/vector-icons';
import React from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  View,
  type ImageSourcePropType,
} from 'react-native';

import FrostedGlassSurface from '@/components/common/FrostedGlassSurface';
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
  onPressMore?: () => void;
}

export default function TimeLineCard({
  timeLabel,
  placeName,
  categoryLabel,
  cityLabel,
  memoCount,
  photoCount,
  imageSource,
  isLast = false,
  onPressMore,
}: TimeLineCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.leftContent}>
        <View style={styles.timeColumn}>
          <Text style={styles.timeLabel}>{timeLabel}</Text>
          <View style={[styles.timelineLine, isLast && styles.timelineLineLast]} />
        </View>

        <View style={styles.detailColumn}>
          <View style={styles.titleBlock}>
            <View style={styles.titleRow}>
              <Text style={styles.placeName} numberOfLines={1}>
                {placeName}
              </Text>
              <Pressable
                style={styles.moreButton}
                accessibilityRole="button"
                accessibilityLabel={`${placeName} 더보기`}
                hitSlop={10}
                onPress={onPressMore}
              >
                <FrostedGlassSurface
                  style={styles.moreCircle}
                  contentStyle={styles.moreCircleContent}
                  borderRadius={Radius.full}
                  borderWidth={0}
                  intensity={80}
                  tint="light"
                  fillColor="rgba(255, 255, 255, 0.40)"
                  borderColor="rgba(255, 255, 255, 0)"
                  highlightColor="rgba(255, 255, 255, 0.18)"
                  shadowEnabled={false}
                >
                  <Feather name="more-horizontal" size={14} color="#353535" />
                </FrostedGlassSurface>
              </Pressable>
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
              <Text style={styles.countLabel}>메모</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 100,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  leftContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 24,
    minWidth: 0,
  },
  timeColumn: {
    width: 28,
    minHeight: 100,
    alignItems: 'center',
    gap: 8,
  },
  timeLabel: {
    fontFamily: FontFamily.pretendardMedium,
    fontSize: 12,
    lineHeight: 14,
    color: Colors.foundation.grey500,
    textAlign: 'center',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    minHeight: 78,
    backgroundColor: Colors.foundation.grey100,
  },
  timelineLineLast: {
    minHeight: 78,
  },
  detailColumn: {
    flex: 1,
    justifyContent: 'center',
    gap: 8,
    minHeight: 74,
    minWidth: 0,
    paddingTop: 2,
  },
  titleBlock: {
    gap: 4,
  },
  titleRow: {
    minHeight: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  placeName: {
    ...Typography.body1Emphasized,
    flexShrink: 1,
    color: Colors.foundation.black,
  },
  moreButton: {
    width: 44,
    height: 44,
    marginVertical: -14,
    marginLeft: -6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreCircle: {
    width: 20,
    height: 20,
    borderRadius: Radius.full,
  },
  moreCircleContent: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  categoryText: {
    ...Typography.body2Emphasized,
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
    width: 72,
    height: 90,
    borderRadius: Radius.xs,
    backgroundColor: Colors.foundation.white,
  },
});
