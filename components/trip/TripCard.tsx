/**
 * TripCard
 *
 * Figma: 1017:1801 "TripCard" · Record flow 기준
 * — 구조:
 *   1) 메인 행: 썸네일(140×110, radius=4) + 정보 영역
 *   2) 우상단: 북마크 아이콘 + 저장(아이콘 + "저장")
 *   3) DateBadge 가로 스크롤 행
 */
import Text from '@/components/common/AppText';
import React, { useMemo } from 'react';
import {
    Image,
    StyleSheet,
    TouchableOpacity,
    View,
    type ImageSourcePropType,
    type StyleProp,
    type ViewStyle,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

import DateBadgeList, { type DateBadgeListItem } from '@/components/record/DateBadgeList';
import { Colors, ComponentTokens, Spacing, Typography } from '@/constants/theme';

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
  onDayPress?: (dayId: string) => void;
  /** 부모 controlled 저장 상태 (미전달 시 trip.isSaved 사용, 내부 state 없음) */
  isSaved?: boolean;
  onSavePress?: () => void;
  onSavedChange?: (saved: boolean) => void;
  style?: StyleProp<ViewStyle>;
}

// Figma TripCard — ri:bookmark-line (16×16) / filled bookmark (저장됨)
const BOOKMARK_OUTLINE_PATH =
  'M0.666667 0H10C10.1768 0 10.3464 0.0702379 10.4714 0.195262C10.5964 0.320286 10.6667 0.489856 10.6667 0.666667V13.4287C10.6667 13.4883 10.6508 13.5468 10.6206 13.5982C10.5904 13.6495 10.5469 13.6919 10.4948 13.7207C10.4426 13.7496 10.3837 13.7639 10.3241 13.7623C10.2645 13.7606 10.2065 13.743 10.156 13.7113L5.33333 10.6867L0.510667 13.7107C0.460245 13.7423 0.402258 13.7599 0.342735 13.7616C0.283211 13.7633 0.224324 13.749 0.172197 13.7202C0.120069 13.6914 0.0766045 13.6492 0.0463219 13.5979C0.0160392 13.5467 4.43139e-05 13.4882 0 13.4287V0.666667C0 0.489856 0.070238 0.320286 0.195262 0.195262C0.320287 0.0702379 0.489856 0 0.666667 0ZM9.33333 1.33333H1.33333V11.6213L5.33333 9.114L9.33333 11.6213V1.33333Z';
const BOOKMARK_FILLED_PATH =
  'M0.666667 0H10C10.1768 0 10.3464 0.0702379 10.4714 0.195262C10.5964 0.320286 10.6667 0.489856 10.6667 0.666667V13.4287C10.6667 13.4883 10.6508 13.5468 10.6206 13.5982C10.5904 13.6495 10.5469 13.6919 10.4948 13.7207C10.4426 13.7496 10.3837 13.7639 10.3241 13.7623C10.2645 13.7606 10.2065 13.743 10.156 13.7113L5.33333 10.6867L0.510667 13.7107C0.460245 13.7423 0.402258 13.7599 0.342735 13.7616C0.283211 13.7633 0.224324 13.749 0.172197 13.7202C0.120069 13.6914 0.0766045 13.6492 0.0463219 13.5979C0.0160392 13.5467 4.43139e-05 13.4882 0 13.4287V0.666667C0 0.489856 0.070238 0.320286 0.195262 0.195262C0.320287 0.0702379 0.489856 0 0.666667 0Z';

function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 10.6667 13.7624" fill="none">
      <Path
        d={filled ? BOOKMARK_FILLED_PATH : BOOKMARK_OUTLINE_PATH}
        fill={filled ? Colors.foundation.black : Colors.foundation.grey500}
      />
    </Svg>
  );
}

export default function TripCard({
  trip,
  onPress,
  onDayPress,
  isSaved: isSavedProp,
  onSavePress,
  onSavedChange,
  style,
}: TripCardProps) {
  const isSaved = isSavedProp ?? trip.isSaved ?? false;

  const thumbnailSource: ImageSourcePropType | undefined =
    trip.coverImage ?? (trip.thumbnailUri ? { uri: trip.thumbnailUri } : undefined);

  const badgeItems = useMemo<DateBadgeListItem[]>(() => {
    if (trip.days?.length) {
      return trip.days.map((day) => ({
        id: day.id,
        date: day.dateLabel,
        day: day.weekdayLabel ?? '',
        image: day.thumbnailImage,
      }));
    }

    return (trip.dateBadges ?? []).map((badge, index) => ({
      id: `${trip.id}-badge-${index}`,
      date: badge.date,
      day: badge.day,
      image: badge.image ?? (badge.imageUri ? { uri: badge.imageUri } : undefined),
    }));
  }, [trip.days, trip.dateBadges, trip.id]);

  const handleSavePress = () => {
    if (onSavePress) {
      onSavePress();
      return;
    }

    onSavedChange?.(!isSaved);
  };

  return (
    <View style={[styles.card, style]}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSavePress}
          activeOpacity={0.7}
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
        >
          <BookmarkIcon filled={isSaved} />
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
      </TouchableOpacity>

      {badgeItems.length > 0 ? (
        <DateBadgeList items={badgeItems} style={styles.badgeList} onSelect={onDayPress} />
      ) : null}
    </View>
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
  badgeList: {
    alignSelf: 'stretch',
  },
});
