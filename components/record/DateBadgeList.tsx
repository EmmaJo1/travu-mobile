import React from 'react';
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import DateBadge from '@/components/common/DateBadge';
import { Spacing } from '@/constants/theme';

export interface DateBadgeListItem {
  id: string;
  date: string;
  day: string;
  image?: ImageSourcePropType;
}

interface DateBadgeListProps {
  items: DateBadgeListItem[];
  selectedId?: string;
  onSelect?: (id: string) => void;
  style?: StyleProp<ViewStyle>;
}

export default function DateBadgeList({
  items,
  selectedId,
  onSelect,
  style,
}: DateBadgeListProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.row, style]}
    >
      {items.map((item) => {
        const selected = item.id === selectedId;
        return (
          <TouchableOpacity
            key={item.id}
            activeOpacity={0.85}
            onPress={() => onSelect?.(item.id)}
            disabled={!onSelect}
          >
            <View style={[styles.badgeWrap, !selected && styles.badgeDimmed]}>
              <DateBadge date={item.date} day={item.day} image={item.image} />
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.xl,
  },
  badgeWrap: {
    borderRadius: 4,
  },
  badgeDimmed: {
    opacity: 0.55,
  },
});
