import { Feather } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import Text from '@/components/common/AppText';
import { Colors, Radius, Typography } from '@/constants/theme';

interface TripEndStatsPanelProps {
  photoCount: number;
  placeCount: number;
  recordCount: number;
  style?: StyleProp<ViewStyle>;
}

export default function TripEndStatsPanel({
  photoCount,
  placeCount,
  recordCount,
  style,
}: TripEndStatsPanelProps) {
  return (
    <View style={[styles.panel, style]}>
      <StatItem icon="camera" label="사진" value={photoCount} unit="장" />
      <StatItem icon="map-pin" label="장소" value={placeCount} unit="곳" />
      <StatItem icon="edit-3" label="기록" value={recordCount} unit="개" />
    </View>
  );
}

function StatItem({
  icon,
  label,
  value,
  unit,
}: {
  icon: 'camera' | 'map-pin' | 'edit-3';
  label: string;
  value: number;
  unit: string;
}) {
  return (
    <View style={styles.item}>
      <View style={styles.labelRow}>
        <Feather name={icon} size={16} color={Colors.foundation.grey800} />
        <Text style={styles.label}>{label}</Text>
      </View>
      <Text style={styles.value}>
        <Text style={styles.valueNumber}>{value}</Text>
        <Text style={styles.valueUnit}>{unit}</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    alignSelf: 'stretch',
    minHeight: 74,
    borderRadius: Radius.sm,
    backgroundColor: 'rgba(249, 249, 249, 0.92)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  item: {
    minWidth: 56,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  label: {
    ...Typography.captionEmphasized,
    color: Colors.foundation.grey800,
  },
  value: {
    textAlign: 'center',
    color: Colors.foundation.black,
  },
  valueNumber: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.black,
  },
  valueUnit: {
    ...Typography.body2Regular,
    color: Colors.foundation.black,
  },
});
