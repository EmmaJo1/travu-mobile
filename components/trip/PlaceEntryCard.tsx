/**
 * PlaceEntryCard
 *
 * Figma: 1096:966 "PlaceEntryCard"
 * — day-record 화면의 장소별 기록 카드
 * — 타임라인 구조 (row, gap=12):
 *
 *   [시간]   │  장소명 + 국기 + 카테고리·도시
 *   [선]     │  사진 스트립 (110×146, radius=8, 가로 스크롤)
 *            │  메모 텍스트 (Body 2 Regular 14/400)
 *
 * — 왼쪽 컬럼: 시간 (Caption/Medium 12/14, grey-500) + 세로 구분선 (2px, grey-100)
 * — 오른쪽 컬럼: 정보 영역 (column, gap=16)
 *   · 헤더 행: 장소명(Body 1 Emphasized 16/500) + 국기 + 카테고리/도시 태그 | "수정"(grey-400)
 *   · 사진 스트립 (110×146 × 최대 4장, 가로 스크롤)
 *   · 메모 텍스트 (Body 2 Regular 14/400, black)
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

export interface PlaceEntry {
  id: string;
  /** 방문 시각 (예: "7 PM") */
  time?: string;
  /** 장소명 (예: "세느 강") */
  place: string;
  /** 카테고리 (예: "관광명소") */
  category?: string;
  /** 도시명 (예: "파리") */
  city?: string;
  /** 별점 (1–5) */
  rating?: number;
  /** 메모 텍스트 */
  text?: string;
  /** 사진 URI 배열 (최대 4장 표시) */
  photoUris?: string[];
  /** 수정 버튼 콜백 */
  onEdit?: () => void;
}

interface PlaceEntryCardProps {
  entry: PlaceEntry;
  style?: StyleProp<ViewStyle>;
}

export default function PlaceEntryCard({ entry, style }: PlaceEntryCardProps) {
  return (
    <View style={[styles.card, style]}>
      {/* ── 왼쪽 타임라인 컬럼 ── */}
      <View style={styles.timeline}>
        <Text style={styles.time}>{entry.time ?? ''}</Text>
        <View style={styles.timelineLine} />
      </View>

      {/* ── 오른쪽 정보 컬럼 ── */}
      <View style={styles.content}>
        {/* 헤더: 장소명 + 태그 행 | 수정 버튼 */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {/* 장소명 */}
            <View style={styles.placeNameRow}>
              <Text style={styles.placeName}>{entry.place}</Text>
              <Image source={require('../../assets/images/flag-place.png')} style={styles.flag} resizeMode="cover" />
            </View>
            {/* 카테고리 · 도시 */}
            {(entry.category || entry.city) && (
              <View style={styles.tagRow}>
                {entry.category && (
                  <Text style={styles.tag}>{entry.category}</Text>
                )}
                {entry.category && entry.city && (
                  <View style={styles.tagDot} />
                )}
                {entry.city && (
                  <Text style={styles.tag}>{entry.city}</Text>
                )}
              </View>
            )}
          </View>

          {entry.onEdit && (
            <TouchableOpacity onPress={entry.onEdit} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
              <Text style={styles.editText}>수정</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 별점 */}
        {entry.rating != null && entry.rating > 0 && (
          <Text style={styles.stars}>{'★'.repeat(Math.min(entry.rating, 5))}</Text>
        )}

        {/* 사진 스트립 */}
        {entry.photoUris && entry.photoUris.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.photoStrip}
          >
            {entry.photoUris.slice(0, 4).map((uri, i) => (
              <View key={i} style={styles.photoItem}>
                <Image source={{ uri }} style={styles.photo} resizeMode="cover" />
              </View>
            ))}
          </ScrollView>
        )}

        {/* 메모 텍스트 */}
        {entry.text ? (
          <Text style={styles.noteText}>{entry.text}</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap:           12,
  },
  // ── 왼쪽 타임라인 ───────────────────────────────────────
  timeline: {
    alignItems: 'center',
    gap:        16,
    paddingTop: 4,
    width:      36,
    flexShrink: 0,
  },
  time: {
    fontFamily:  'Pretendard-Medium',
    fontSize: 12,
    lineHeight:  16,
    fontWeight:  '500',
    color:       Colors.foundation.grey500,
    textAlign:   'center',
  },
  timelineLine: {
    flex:            1,
    width:           2,
    backgroundColor: Colors.foundation.grey100,
    minHeight:       24,
  },
  // ── 오른쪽 정보 영역 ─────────────────────────────────────
  content: {
    flex: 1,
    gap:  16,
  },
  header: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignSelf:      'stretch',
  },
  headerLeft: {
    gap:       0,
    flexShrink: 1,
  },
  placeNameRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           5,
  },
  flag: {
    width: 17,
    height: 12,
    borderRadius: 3,
  },
  placeName: {
    fontFamily:  'Pretendard-Medium',
    fontSize: 16,
    lineHeight:  22,
    fontWeight:  '500',
    color:       Colors.foundation.black,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           4,
    marginTop:     2,
  },
  tag: {
    fontFamily:  'Pretendard-Medium',
    fontSize: 12,
    lineHeight:  16,
    fontWeight:  '500',
    color:       Colors.foundation.grey500,
  },
  tagDot: {
    width:           2,
    height:          2,
    borderRadius:    1,
    backgroundColor: Colors.foundation.grey500,
  },
  editText: {
    fontFamily:  'Pretendard-Medium',
    fontSize: 12,
    lineHeight:  16,
    fontWeight:  '500',
    color:       Colors.foundation.grey400,
    flexShrink:  0,
  },
  stars: {
    fontFamily:   'Pretendard-Regular',
    fontSize:     14,
    lineHeight:   20,
    color:        Colors.foundation.black,
    letterSpacing: 1,
  },
  // ── 사진 스트립 ──────────────────────────────────────────
  photoStrip: {
    flexDirection: 'row',
    gap:           8,
  },
  photoItem: {
    width:        110,
    height:       146,
    borderRadius: 8,
    overflow:     'hidden',
  },
  photo: {
    width:  '100%',
    height: '100%',
  },
  // ── 메모 텍스트 ──────────────────────────────────────────
  noteText: {
    fontFamily:  'Pretendard-Regular',
    fontSize: 14,
    lineHeight:  20,
    fontWeight:  '400',
    color:       Colors.foundation.black,
  },
});
