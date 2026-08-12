import { Feather } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type RefreshControlProps,
} from 'react-native';

import Text from '@/components/common/AppText';
import TimeLineCard, { type TimeLineCardProps } from '@/components/home/TimeLineCard';
import { Colors, Spacing, Typography } from '@/constants/theme';

export type TodayTimelineItem = Omit<TimeLineCardProps, 'isLast' | 'onLongPress' | 'onPress'> & {
  dataSource?: 'detected' | 'local' | 'mock' | 'supabase';
  id: string;
  placeId?: string;
  tripDayId?: string;
  tripId?: string;
};

interface TodayTimelineSectionProps {
  items: TodayTimelineItem[];
  title?: string;
  isSelectedToday?: boolean;
  isLoading?: boolean;
  isError?: boolean;
  onLongPressItem?: (item: TodayTimelineItem) => void;
  onPressItem?: (item: TodayTimelineItem) => void;
  onPressViewAll?: () => void;
  onPressAddManually?: () => void;
  onRetry?: () => void;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  listContentBottomInset?: number;
}

export default function TodayTimelineSection({
  items,
  title = '오늘의 타임라인',
  isSelectedToday = false,
  isLoading = false,
  isError = false,
  onLongPressItem,
  onPressItem,
  onPressViewAll,
  onPressAddManually,
  onRetry,
  refreshControl,
  listContentBottomInset = 0,
}: TodayTimelineSectionProps) {
  const emptyTitle = isSelectedToday
    ? '아직 오늘의 타임라인이 없어요'
    : '이 날짜의 타임라인이 없어요';
  const emptyDescription = isSelectedToday
    ? '오늘 찍은 사진이 생기면\n위치와 시간 기준으로 자동 정리돼요'
    : '해당 날짜에 촬영된 사진이 있으면\n위치와 시간 기준으로 자동 정리돼요';

  return (
    <View style={styles.section}>
      <View style={styles.heading}>
        <View style={styles.headingTopRow}>
          <Text style={styles.title}>{title}</Text>
          {onPressViewAll ? (
            <Pressable
              accessibilityRole="button"
              onPress={onPressViewAll}
              style={({ pressed }) => [styles.viewAllButton, pressed && styles.viewAllButtonPressed]}
            >
              <Text style={styles.viewAllText}>전체 일정</Text>
              <Feather name="chevron-right" size={16} color={Colors.foundation.grey700} />
            </Pressable>
          ) : null}
        </View>
        <Text style={styles.description}>자동으로 정리된 기록을 확인해보세요</Text>
      </View>

      {isLoading ? (
        <View style={styles.emptyState}>
          <ActivityIndicator color={Colors.foundation.black} />
        </View>
      ) : isError ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>{'\uC77C\uC815\uC744 \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC5B4\uC694'}</Text>
          <Text style={styles.emptyDescription}>{'\uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574\uC8FC\uC138\uC694.'}</Text>
          {onRetry ? (
            <Pressable
              accessibilityRole="button"
              onPress={onRetry}
              style={({ pressed }) => [
                styles.emptyActionButton,
                pressed && styles.emptyActionButtonPressed,
              ]}
            >
              <Text style={styles.emptyActionText}>{'\uB2E4\uC2DC \uC2DC\uB3C4'}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : items.length > 0 ? (
        <ScrollView
          style={styles.listScroll}
          contentContainerStyle={[styles.list, { paddingBottom: listContentBottomInset }]}
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl}
        >
          <View style={styles.listInner}>
          {items.map((item, index) => {
            const canLongPressItem =
              item.dataSource === 'supabase' &&
              Boolean(item.placeId && item.tripDayId && item.tripId);

            return (
              <TimeLineCard
                key={item.id}
                {...item}
                isLast={index === items.length - 1}
                onLongPress={
                  onLongPressItem && canLongPressItem
                    ? () => onLongPressItem(item)
                    : undefined
                }
                onPress={onPressItem ? () => onPressItem(item) : undefined}
              />
            );
          })}
          {onPressAddManually ? (
            <Pressable
              accessibilityRole="button"
              onPress={onPressAddManually}
              style={({ pressed }) => [
                styles.inlineAddButton,
                pressed && styles.inlineAddButtonPressed,
              ]}
            >
              <Text style={styles.inlineAddText}>+ 직접 추가</Text>
            </Pressable>
          ) : null}
          </View>
        </ScrollView>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>{emptyTitle}</Text>
          <Text style={styles.emptyDescription}>{emptyDescription}</Text>
          {onPressAddManually ? (
            <Pressable
              accessibilityRole="button"
              onPress={onPressAddManually}
              style={({ pressed }) => [
                styles.emptyActionButton,
                pressed && styles.emptyActionButtonPressed,
              ]}
            >
              <Text style={styles.emptyActionText}>직접 추가하기</Text>
            </Pressable>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    flex: 1,
    paddingHorizontal: 20,
    gap: 16,
  },
  heading: {
    gap: 2,
  },
  headingTopRow: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  title: {
    ...Typography.title2,
    color: Colors.foundation.black,
  },
  viewAllButton: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllButtonPressed: {
    opacity: 0.72,
  },
  viewAllText: {
    ...Typography.body2Regular,
    color: Colors.foundation.grey700,
  },
  description: {
    ...Typography.captionRegular,
    color: Colors.foundation.grey600,
  },
  listScroll: {
    flex: 1,
  },
  list: {
    flexGrow: 1,
  },
  listInner: {
    gap: 16,
  },
  inlineAddButton: {
    minHeight: 32,
    alignSelf: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  inlineAddButtonPressed: {
    opacity: 0.64,
  },
  inlineAddText: {
    ...Typography.body2Regular,
    color: Colors.foundation.grey700,
    textAlign: 'center',
  },
  emptyState: {
    flex: 1,
    minHeight: 180,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingVertical: 32,
  },
  emptyTitle: {
    ...Typography.body1Emphasized,
    color: Colors.foundation.black,
    textAlign: 'center',
  },
  emptyDescription: {
    maxWidth: 280,
    marginTop: 12,
    ...Typography.body2Regular,
    color: Colors.foundation.grey600,
    textAlign: 'center',
  },
  emptyActionButton: {
    minWidth: 116,
    height: 40,
    marginTop: 32,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.foundation.grey100,
    borderRadius: 999,
    backgroundColor: Colors.foundation.white,
  },
  emptyActionButtonPressed: {
    opacity: 0.74,
  },
  emptyActionText: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.black,
    textAlign: 'center',
  },
});
