import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
                <View style={styles.moreCircle}>
                  <LinearGradient
                    colors={[
                      'rgba(255, 255, 255, 0.34)',
                      'rgba(255, 255, 255, 0.10)',
                      'rgba(255, 255, 255, 0)',
                    ]}
                    locations={[0, 0.44, 1]}
                    start={{ x: 1, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={styles.moreGlassLight}
                  />
                  <LinearGradient
                    colors={[
                      'rgba(255, 255, 255, 0.42)',
                      'rgba(255, 255, 255, 0.06)',
                      'rgba(255, 255, 255, 0.24)',
                    ]}
                    locations={[0, 0.52, 1]}
                    start={{ x: 0.12, y: 0 }}
                    end={{ x: 0.88, y: 1 }}
                    style={styles.moreRefractionLayer}
                  />
                  <LinearGradient
                    colors={[
                      'rgba(52, 145, 255, 0.14)',
                      'rgba(255, 255, 255, 0)',
                      'rgba(255, 112, 145, 0.12)',
                    ]}
                    locations={[0, 0.5, 1]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.moreDispersionLayer}
                  />
                  <View style={styles.moreFrostLayer} />
                  <Feather name="more-horizontal" size={14} color="#353535" />
                </View>
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
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 4,
    elevation: 2,
  },
  moreGlassLight: {
    ...StyleSheet.absoluteFillObject,
  },
  moreRefractionLayer: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.8,
  },
  moreDispersionLayer: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.5,
  },
  moreFrostLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
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
