/**
 * TripListCard
 *
 * Figma: 1096:1871 "TripListCard"
 * — 수직 북 스파인(book-spine) 형태의 소형 여행 카드 (101px 고정 너비)
 * — 가로 스크롤 여행 목록에서 사용 (책장처럼 나열)
 * —
 * — 구조:
 *   ┌─────────────────────┐  ← 글라스 오버레이 헤더 (h=44, rgba(255,255,255,0.6))
 *   │ Country  ← 우측 정렬 │    Caption Emphasized (12/500), black
 *   │ Date     ← 우측 정렬 │    Caption Regular    (12/400), grey-600
 *   ├─────────────────────┤
 *   │     이미지 배경       │  ← 90×120 (fallback #666)
 *   │  │ TITLE             │    수직 구분선(x=5) + 제목(Prata 14/18) + 구분선(h=1) + 이미지
 *   └─────────────────────┘
 */
import { Colors, Typography } from '@/constants/theme';
import React from 'react';
import {
  Image, StyleSheet, TouchableOpacity, View, type StyleProp, type ViewStyle } from 'react-native';
import Text from '@/components/common/AppText';


export interface TripListItem {
  id: string;
  /** 국가/도시 (예: "Paris, France") */
  country: string;
  /** 날짜 범위 (예: "2025.8.25-9.1") */
  date: string;
  /** 여행 제목 대문자 (예: "PARIS") */
  title: string;
  /** 배경 이미지 URI */
  imageUri?: string;
}

interface TripListCardProps {
  trip: TripListItem;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

export default function TripListCard({ trip, onPress, style }: TripListCardProps) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={[styles.card, style]}>
      {/* 글라스 오버레이 헤더 */}
      <View style={styles.header}>
        <Text style={styles.country} numberOfLines={1}>{trip.country}</Text>
        <Text style={styles.date} numberOfLines={1}>{trip.date}</Text>
      </View>

      {/* 본체: 이미지 + 컨텐츠 */}
      <View style={styles.body}>
        {trip.imageUri ? (
          <Image source={{ uri: trip.imageUri }} style={styles.bodyImage} resizeMode="cover" />
        ) : (
          <View style={styles.bodyFallback} />
        )}

        {/* 수직 구분선 */}
        <View style={styles.verticalDivider} />

        {/* 제목 + 수평 구분선 + 하단 공간 */}
        <View style={styles.bodyContent}>
          <View style={styles.titleArea}>
            <Text style={styles.title} numberOfLines={2}>{trip.title}</Text>
            <View style={styles.horizontalDivider} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width:     101,
    alignItems: 'center',
    gap:        16,
  },
  // ── 헤더 ────────────────────────────────────────────────
  header: {
    width:           '100%',
    height:          44,
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius:    4,
    paddingHorizontal: 13,
    paddingTop:      6,
    justifyContent:  'flex-start',
    alignItems:      'center',
    // shadow: 0px 0px 4px rgba(0,0,0,0.25)
    boxShadow:       '0px 0px 4px rgba(0,0,0,0.25)',
  },
  country: {
    ...Typography.captionEmphasized,
    color: Colors.foundation.black,
    textAlign: 'center',
    alignSelf: 'stretch',
  },
  date: {
    ...Typography.captionRegular,
    color: Colors.foundation.grey600,
    marginTop: 0,
    textAlign: 'center',
    alignSelf: 'stretch',
  },
  // ── 본체 ─────────────────────────────────────────────────
  body: {
    width:    90,
    height:   120,
    position: 'relative',
    overflow: 'hidden',
  },
  bodyImage: {
    width:  '100%',
    height: '100%',
    position: 'absolute',
  },
  bodyFallback: {
    width:           '100%',
    height:          '100%',
    backgroundColor: '#666666',
    position:        'absolute',
  },
  verticalDivider: {
    position:        'absolute',
    left:            5,
    top:             0,
    width:           2,
    height:          125,
    backgroundColor: 'rgba(158,158,158,0.2)',
  },
  bodyContent: {
    position: 'absolute',
    left:     16,
    top:      6,
    width:    64,
    gap:      8,
  },
  titleArea: {
    alignItems: 'center',
    alignSelf:  'stretch',
    gap:        0,
  },
  title: {
    ...Typography.tripListTitle,
    color:       Colors.foundation.black,
    textAlign:   'center',
    alignSelf:   'stretch',
  },
  horizontalDivider: {
    width:           '100%',
    height:          1,
    backgroundColor: Colors.foundation.black,
    marginTop:       4,
  },
});
