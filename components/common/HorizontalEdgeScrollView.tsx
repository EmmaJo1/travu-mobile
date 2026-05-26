import React from 'react';
import {
  ScrollView,
  StyleSheet,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Spacing } from '@/constants/theme';

/** PlaceEntryCard 타임라인(36) + gap(12) — 콘텐츠 열 기준 추가 bleed */
export const PLACE_ENTRY_SCROLL_LEADING_BLEED = 48;

interface HorizontalEdgeScrollViewProps extends Omit<ScrollViewProps, 'horizontal'> {
  /** 화면 좌·우 패딩(기본 Spacing.xl = 20) */
  edgeInset?: number;
  /** 시작 쪽 추가 bleed (예: PlaceEntryCard 타임라인 열) */
  leadingBleed?: number;
  /** 끝 쪽 추가 bleed */
  trailingBleed?: number;
  contentContainerStyle?: StyleProp<ViewStyle>;
}

/**
 * 가로 ScrollView가 부모 paddingHorizontal 경계에서 이미지를 자르지 않도록
 * negative margin + content padding 패턴을 적용합니다.
 */
export default function HorizontalEdgeScrollView({
  edgeInset = Spacing.xl,
  leadingBleed = 0,
  trailingBleed = 0,
  style,
  contentContainerStyle,
  showsHorizontalScrollIndicator = false,
  ...rest
}: HorizontalEdgeScrollViewProps) {
  const bleedStart = edgeInset + leadingBleed;
  const bleedEnd = edgeInset + trailingBleed;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={showsHorizontalScrollIndicator}
      style={[styles.scroll, { marginLeft: -bleedStart, marginRight: -bleedEnd }, style]}
      contentContainerStyle={[
        contentContainerStyle,
        {
          paddingLeft: bleedStart,
          paddingRight: bleedEnd,
        },
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 0,
  },
});
