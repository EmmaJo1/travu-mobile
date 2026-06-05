import React from 'react';
import { StyleSheet, View } from 'react-native';

import TimeLineCard, { type TimeLineCardProps } from '@/components/home/TimeLineCard';
import Text from '@/components/common/AppText';
import { Colors, Typography } from '@/constants/theme';

export type TodayTimelineItem = Omit<TimeLineCardProps, 'isLast' | 'onPressMore'> & {
  id: string;
};

interface TodayTimelineSectionProps {
  items: TodayTimelineItem[];
  onPressMore?: (item: TodayTimelineItem) => void;
}

export default function TodayTimelineSection({
  items,
  onPressMore,
}: TodayTimelineSectionProps) {
  return (
    <View style={styles.section}>
      <View style={styles.heading}>
        <Text style={styles.title}>오늘의 타임라인</Text>
        <Text style={styles.description}>자동으로 정리된 기록을 확인해보세요</Text>
      </View>

      <View style={styles.list}>
        {items.map((item, index) => (
          <TimeLineCard
            key={item.id}
            {...item}
            isLast={index === items.length - 1}
            onPressMore={onPressMore ? () => onPressMore(item) : undefined}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 20,
    gap: 24,
  },
  heading: {
    gap: 2,
  },
  title: {
    ...Typography.title2,
    color: Colors.foundation.black,
  },
  description: {
    ...Typography.captionRegular,
    color: '#4C4C4C',
  },
  list: {
    gap: 16,
  },
});
