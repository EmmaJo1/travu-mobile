/**
 * TripListCard
 *
 * Figma: 1096:1871 "TripListCard"
 * — 수직 북 스파인(book-spine) 형태의 소형 여행 카드 (101px 고정 너비)
 * —
 * — 구조:
 *   ┌─────────────────────┐  ← Caption 100×44 rgba(255,255,255,0.6)
 *   │ Paris               │
 *   │ 2025.8.25-9.1       │
 *   ├─────────────────────┤
 *   │  │ PARIS            │  ← img_spot 90×120 흰 배경
 *   │  │ ───              │    spine x=5 + 제목 + 64×76 썸네일
 *   │     [photo]         │
 *   └─────────────────────┘
 */
import Text from '@/components/common/AppText';
import { Colors, ComponentTokens, Shadows, Typography } from '@/constants/theme';
import React from 'react';
import {
  Image,
  StyleSheet,
  TouchableOpacity,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

const BODY_WIDTH = 90;
const BODY_HEIGHT = 120;
const CONTENT_LEFT = 16;
const CONTENT_WIDTH = 64;
const THUMB = ComponentTokens.TripListCard;
const THUMB_LEFT = 16;
const THUMB_TOP = 38;

export interface TripListItem {
  id: string;
  /** 캡션 도시명 (예: "Paris") */
  city: string;
  /** 날짜 범위 (예: "2025.8.25-9.1") */
  date: string;
  /** 여행 제목 대문자 (예: "PARIS") */
  title: string;
  /** 배경 이미지 URI (legacy) */
  imageUri?: string;
  /** 배경 이미지 (local asset) */
  coverImage?: ImageSourcePropType;
}

interface TripListCardProps {
  trip: TripListItem;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

export default function TripListCard({ trip, onPress, style }: TripListCardProps) {
  const thumbnailSource = trip.coverImage ?? (trip.imageUri ? { uri: trip.imageUri } : undefined);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={[styles.card, style]}>
      <View style={styles.headerShadow}>
        <View style={styles.header}>
          <Text style={styles.city} numberOfLines={1}>
            {trip.city}
          </Text>
          <Text style={styles.date} numberOfLines={1}>
            {trip.date}
          </Text>
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.verticalDivider} />

        <View style={styles.bodyContent}>
          <View style={styles.titleArea}>
            <Text
              style={styles.title}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.6}
            >
              {trip.title}
            </Text>
            <View style={styles.horizontalDivider} />
          </View>
        </View>

        <View style={styles.thumbnailWrap}>
          {thumbnailSource ? (
            <Image source={thumbnailSource} style={styles.thumbnail} resizeMode="cover" />
          ) : (
            <View style={styles.thumbnailFallback} />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 101,
    alignItems: 'center',
    gap: 16,
  },
  headerShadow: {
    alignSelf: 'stretch',
    width: 101,
    ...Shadows.cardSmall,
  },
  header: {
    width: '100%',
    height: 44,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  city: {
    position: 'absolute',
    top: 6,
    left: 0,
    right: 0,
    height: 16,
    ...Typography.captionEmphasized,
    color: Colors.foundation.black,
    textAlign: 'center',
    lineHeight: 16,
  },
  date: {
    position: 'absolute',
    top: 22,
    left: 0,
    right: 0,
    height: 16,
    ...Typography.captionRegular,
    color: Colors.foundation.grey600,
    textAlign: 'center',
    lineHeight: 16,
  },
  body: {
    width: BODY_WIDTH,
    height: BODY_HEIGHT,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: Colors.foundation.white,
    shadowColor: '#000000',
    shadowOffset: { width: 8, height: 0 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 4,
  },
  verticalDivider: {
    position: 'absolute',
    left: 5,
    top: 0,
    width: 2,
    height: BODY_HEIGHT,
    backgroundColor: 'rgba(158,158,158,0.2)',
  },
  bodyContent: {
    position: 'absolute',
    left: CONTENT_LEFT,
    top: 6,
    width: CONTENT_WIDTH,
    height: BODY_HEIGHT - 6,
  },
  titleArea: {
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  title: {
    ...Typography.tripListTitle,
    color: Colors.foundation.black,
    textAlign: 'center',
    alignSelf: 'stretch',
  },
  horizontalDivider: {
    width: '100%',
    height: 1,
    backgroundColor: Colors.foundation.black,
    marginTop: 4,
  },
  thumbnailWrap: {
    position: 'absolute',
    top: THUMB_TOP,
    left: THUMB_LEFT,
    width: THUMB.thumbnailWidth,
    height: THUMB.thumbnailHeight,
    borderRadius: THUMB.thumbnailRadius,
    overflow: 'hidden',
  },
  thumbnail: {
    width: THUMB.thumbnailWidth,
    height: THUMB.thumbnailHeight,
  },
  thumbnailFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: '#666666',
  },
});
