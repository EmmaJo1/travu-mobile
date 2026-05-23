/**
 * TripCard
 *
 * Figma: 1017:1801 "TripCard" · Record flow 기준
 * — 구조:
 *   1) 메인 행: 썸네일(140×110, radius=4) + 정보 영역
 *   2) 우상단: 북마크 아이콘 + 저장(아이콘 + "저장")
 *   3) DateBadge 가로 스크롤 행
 */
import React, { useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Text from '@/components/common/AppText';

import { Colors, ComponentTokens, Spacing, Typography } from '@/constants/theme';
import DateBadge from '@/components/common/DateBadge';

export interface DateBadgeData {
  /** 날짜 숫자 문자열 (예: "3.5") */
  date: string;
  /** 요일 문자열 (예: "수") */
  day: string;
  /** 배경 이미지 URI (legacy) */
  imageUri?: string;
  /** 배경 이미지 (local asset) */
  image?: ImageSourcePropType;
}

export interface TripCardDay {
  id: string;
  dayNumber: number;
  dateLabel: string;
  weekdayLabel?: string;
  photoCount: number;
  thumbnailImage?: ImageSourcePropType;
}

export interface TripCardData {
  id: string;
  /** 여행지 이름 (예: "시드니") */
  country: string;
  /** 날짜 범위 문자열 (예: "2025. 3. 5 - 3. 15") */
  date: string;
  /** 기간 일수 문자열 (예: "11") */
  period: string;
  /** 사진 수 문자열 (예: "734") */
  photoCount: string;
  /** 장소 수 문자열 (예: "12") */
  placeCount: string;
  /** 대표 썸네일 URI (legacy) */
  thumbnailUri?: string;
  /** 대표 썸네일 (local asset) */
  coverImage?: ImageSourcePropType;
  destinationLabel?: string;
  isSaved?: boolean;
  /** DateBadge 배열 */
  dateBadges?: DateBadgeData[];
  days?: TripCardDay[];
}

interface TripCardProps {
  trip: TripCardData;
  onPress: () => void;
  /** controlled 저장 상태 */
  isSaved?: boolean;
  onSavePress?: () => void;
  onSavedChange?: (saved: boolean) => void;
  style?: StyleProp<ViewStyle>;
}

// Figma 02_System & Components — icon 섹션
const BOOKMARK_OUTLINE = require('../../assets/images/bookmark.png');
const BOOKMARK_FILLED = require('../../assets/images/bookmark-filled.png');

export default function TripCard({
  trip,
  onPress,
  isSaved: isSavedProp,
  onSavePress,
  onSavedChange,
  style,
}: TripCardProps) {
  const [internalSaved, setInternalSaved] = useState(trip.isSaved ?? false);
  const isControlled = isSavedProp !== undefined;
  const isSaved = isControlled ? isSavedProp : internalSaved;

  const thumbnailSource: ImageSourcePropType | undefined =
    trip.coverImage ?? (trip.thumbnailUri ? { uri: trip.thumbnailUri } : undefined);

  const handleSavePress = () => {
    if (onSavePress) {
      onSavePress();
      return;
    }

    const next = !isSaved;
    if (!isControlled) {
      setInternalSaved(next);
    }
    onSavedChange?.(next);
  };

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={[styles.card, style]}>
      <TouchableOpacity
        style={styles.saveButton}
        onPress={handleSavePress}
        activeOpacity={0.7}
        hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
      >
        <Image
          source={isSaved ? BOOKMARK_FILLED : BOOKMARK_OUTLINE}
          style={styles.saveIcon}
          resizeMode="contain"
        />
        <Text style={[styles.saveText, isSaved && styles.saveTextActive]}>저장</Text>
      </TouchableOpacity>

      <View style={styles.mainRow}>
        <View style={styles.thumbnail}>
          {thumbnailSource ? (
            <Image source={thumbnailSource} style={styles.thumbnailImage} resizeMode="cover" />
          ) : (
            <View style={styles.thumbnailFallback} />
          )}
        </View>

        <View style={styles.info}>
          <View style={styles.titleArea}>
            <Text style={styles.country} numberOfLines={1}>
              {trip.country}
            </Text>
            <Text style={styles.date} numberOfLines={1}>
              {trip.date}
            </Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCell}>
              <Text style={styles.statLabel}>기간</Text>
              <Text style={styles.statValue}>
                {trip.period}
                <Text style={styles.statUnit}>일</Text>
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCell}>
              <Text style={styles.statLabel}>사진</Text>
              <Text style={styles.statValue}>
                {trip.photoCount}
                <Text style={styles.statUnit}>장</Text>
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCell}>
              <Text style={styles.statLabel}>장소</Text>
              <Text style={styles.statValue}>
                {trip.placeCount}
                <Text style={styles.statUnit}>곳</Text>
              </Text>
            </View>
          </View>
        </View>
      </View>

      {trip.dateBadges && trip.dateBadges.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.badgeRow}
        >
          {trip.dateBadges.map((badge, i) => (
            <DateBadge
              key={`${badge.date}-${i}`}
              date={badge.date}
              day={badge.day}
              imageUri={badge.imageUri}
              image={badge.image}
            />
          ))}
        </ScrollView>
      )}
    </TouchableOpacity>
  );
}

const tripTokens = ComponentTokens.TripCard;

const styles = StyleSheet.create({
  card: {
    width: '100%',
    maxWidth: 350,
    position: 'relative',
    gap: tripTokens.infoGap,
  },
  saveButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    zIndex: 1,
  },
  saveIcon: {
    width: 16,
    height: 16,
  },
  saveText: {
    ...Typography.body2Regular,
    color: Colors.foundation.grey500,
  },
  saveTextActive: {
    color: Colors.foundation.black,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
  },
  thumbnail: {
    width: tripTokens.thumbnailWidth,
    height: tripTokens.thumbnailHeight,
    borderRadius: tripTokens.thumbnailRadius,
    overflow: 'hidden',
    flexShrink: 0,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.foundation.grey400,
  },
  info: {
    flex: 1,
    gap: 6,
  },
  titleArea: {
    paddingHorizontal: Spacing.sm,
  },
  country: {
    ...Typography.title2,
    color: Colors.foundation.black,
  },
  date: {
    ...Typography.body2Regular,
    color: Colors.foundation.grey600,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    alignSelf: 'stretch',
    minWidth: 200,
    height: tripTokens.badgeHeight,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: tripTokens.badgeRadius,
    backgroundColor: tripTokens.badgeBackground,
  },
  statCell: {
    alignItems: 'center',
    gap: 4,
  },
  statLabel: {
    ...Typography.captionRegular,
    color: Colors.foundation.black,
  },
  statValue: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.black,
    textAlign: 'center',
  },
  statUnit: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.black,
  },
  statDivider: {
    width: 2,
    height: 40,
    backgroundColor: Colors.foundation.grey100,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 4,
  },
});
