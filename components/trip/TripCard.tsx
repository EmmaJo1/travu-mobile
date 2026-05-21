/**
 * TripCard
 *
 * Figma: 1017:1801 "TripCard"
 * — 전체 크기: 350×178
 * — 구조:
 *   1) 메인 행: 썸네일(140×110, radius=4) + 정보 영역
 *      - 제목 (Title 2, 18/600 SemiBold)
 *      - 날짜 (Body 2 Regular, 14/400, grey-600)
 *      - 통계 행 (200×52, padding 6 12): 기간 | 사진 | 장소 (구분선 2px)
 *   2) 저장 버튼: 우상단 절대 위치 (북마크 아이콘 + "저장" grey-500)
 *   3) DateBadge 가로 스크롤 행 (80×60 개별 뱃지)
 */
import React from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Colors } from '@/constants/theme';
import DateBadge from '@/components/common/DateBadge';

export interface DateBadgeData {
  /** 날짜 숫자 문자열 (예: "3.5") */
  date: string;
  /** 요일 문자열 (예: "수") */
  day: string;
  /** 배경 이미지 URI */
  imageUri?: string;
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
  /** 대표 썸네일 URI */
  thumbnailUri?: string;
  /** DateBadge 배열 */
  dateBadges?: DateBadgeData[];
}

interface TripCardProps {
  trip: TripCardData;
  onPress: () => void;
  onSavePress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export default function TripCard({ trip, onPress, onSavePress, style }: TripCardProps) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={[styles.card, style]}>
      {/* 저장 버튼 — 절대 위치 우상단 */}
      <TouchableOpacity
        style={styles.saveButton}
        onPress={onSavePress}
        activeOpacity={0.7}
        hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
      >
        <Image source={require('../../assets/images/bookmark-full.png')} style={styles.saveIcon} />
        <Text style={styles.saveText}>저장</Text>
      </TouchableOpacity>

      {/* 메인 행: 썸네일 + 정보 */}
      <View style={styles.mainRow}>
        {/* 썸네일 */}
        <View style={styles.thumbnail}>
          {trip.thumbnailUri ? (
            <Image source={{ uri: trip.thumbnailUri }} style={styles.thumbnailImage} resizeMode="cover" />
          ) : (
            <View style={styles.thumbnailFallback} />
          )}
        </View>

        {/* 정보 영역 */}
        <View style={styles.info}>
          {/* 제목 + 날짜 */}
          <View style={styles.titleArea}>
            <Text style={styles.country} numberOfLines={1}>{trip.country}</Text>
            <Text style={styles.date} numberOfLines={1}>{trip.date}</Text>
          </View>

          {/* 통계 행 */}
          <View style={styles.statsRow}>
            <View style={styles.statCell}>
              <Text style={styles.statLabel}>기간</Text>
              <Text style={styles.statValue}>{trip.period}<Text style={styles.statUnit}>일</Text></Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCell}>
              <Text style={styles.statLabel}>사진</Text>
              <Text style={styles.statValue}>{trip.photoCount}<Text style={styles.statUnit}>장</Text></Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCell}>
              <Text style={styles.statLabel}>장소</Text>
              <Text style={styles.statValue}>{trip.placeCount}<Text style={styles.statUnit}>곳</Text></Text>
            </View>
          </View>
        </View>
      </View>

      {/* DateBadge 가로 스크롤 */}
      {trip.dateBadges && trip.dateBadges.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.badgeRow}
        >
          {trip.dateBadges.map((badge, i) => (
            <DateBadge key={i} date={badge.date} day={badge.day} imageUri={badge.imageUri} />
          ))}
        </ScrollView>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width:    350,
    position: 'relative',
    gap:      12,
  },
  // ── 저장 버튼 ───────────────────────────────────────────
  saveButton: {
    position:       'absolute',
    top:            0,
    right:          0,
    flexDirection:  'row',
    alignItems:     'center',
    gap:            4,
    zIndex:         1,
  },
  saveIcon: {
    width: 16,
    height: 16,
  },
  saveText: {
    fontFamily:  'Pretendard-Regular',
    fontSize: 14,
    lineHeight:  20,
    fontWeight:  '400',
    color:       Colors.foundation.grey500,
  },
  // ── 메인 행 ─────────────────────────────────────────────
  mainRow: {
    flexDirection: 'row',
    alignItems:    'flex-end',
    gap:           8,
  },
  thumbnail: {
    width:        140,
    height:       110,
    borderRadius: 4,
    overflow:     'hidden',
    flexShrink:   0,
  },
  thumbnailImage: {
    width:  '100%',
    height: '100%',
  },
  thumbnailFallback: {
    width:           '100%',
    height:          '100%',
    backgroundColor: '#919191',
  },
  info: {
    flex:       1,
    flexWrap:   'wrap',
    gap:        6,
  },
  titleArea: {
    paddingHorizontal: 8,
    gap: 0,
  },
  country: {
    fontFamily:  'Pretendard-SemiBold',
    fontSize: 18,
    lineHeight:  24,
    fontWeight:  '600',
    color:       Colors.foundation.black,
  },
  date: {
    fontFamily:  'Pretendard-Medium',
    fontSize: 14,
    lineHeight:  20,
    fontWeight:  '500',
    color:       Colors.foundation.grey600,
  },
  // ── 통계 행 ─────────────────────────────────────────────
  statsRow: {
    flexDirection:     'row',
    justifyContent:    'space-between',
    alignItems:        'center',
    width:             200,
    height:            52,
    paddingHorizontal: 12,
    paddingVertical:   6,
    borderRadius:      8,
  },
  statCell: {
    alignItems: 'center',
    gap:        4,
  },
  statLabel: {
    fontFamily:  'Pretendard-Regular',
    fontSize: 12,
    lineHeight:  16,
    fontWeight:  '400',
    color:       Colors.foundation.black,
  },
  statValue: {
    fontFamily:  'Pretendard-SemiBold',
    fontSize: 14,
    lineHeight:  20,
    fontWeight:  '600',
    color:       Colors.foundation.black,
    textAlign:   'center',
  },
  statUnit: {
    fontFamily:  'Pretendard-SemiBold',
    fontSize: 14,
    lineHeight:  20,
    fontWeight:  '600',
    color:       Colors.foundation.black,
  },
  statDivider: {
    width:           2,
    height:          40,
    backgroundColor: Colors.foundation.grey100,
  },
  // ── DateBadge 스크롤 ─────────────────────────────────────
  badgeRow: {
    flexDirection: 'row',
    gap:           4,
  },
});
