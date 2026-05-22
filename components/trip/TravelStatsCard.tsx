import React from 'react';
import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Text from '@/components/common/AppText';

import { Colors, Typography } from '@/constants/theme';

interface TravelStatsCardProps {
  placeCount: number;
  distanceKm: number;
  style?: StyleProp<ViewStyle>;
}

function StatRow({
  iconSource,
  value,
  unit,
  label,
}: {
  iconSource: number;
  value: number;
  unit: string;
  label: string;
}) {
  return (
    <View style={styles.row}>
      <Image source={iconSource} style={styles.icon} resizeMode="contain" />
      <View style={styles.valueWrap}>
        <Text style={styles.value}>
          {value}
          <Text style={styles.value}>{unit}</Text>
        </Text>
      </View>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

export default function TravelStatsCard({ placeCount, distanceKm, style }: TravelStatsCardProps) {
  return (
    <View style={[styles.card, style]}>
      <StatRow
        iconSource={require('../../assets/images/travelstats-frame70.png')}
        value={placeCount}
        unit="곳"
        label="방문"
      />
      <StatRow
        iconSource={require('../../assets/images/travelstats-chart-line.png')}
        value={distanceKm}
        unit="km"
        label="이동"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 87,
    gap: 4,
    alignItems: 'flex-end',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'stretch',
    justifyContent: 'flex-end',
  },
  icon: {
    width: 16,
    height: 16,
  },
  valueWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  value: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.black,
  },
  label: {
    ...Typography.captionRegular,
    color: Colors.foundation.black,
  },
});
