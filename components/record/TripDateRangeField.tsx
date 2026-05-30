import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, TouchableOpacity, View, type StyleProp, type ViewStyle } from 'react-native';
import Text from '@/components/common/AppText';

import { Colors, Radius, Spacing, Typography } from '@/constants/theme';

interface TripDateRangeFieldProps {
  label: string;
  placeholder: string;
  value?: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

export default function TripDateRangeField({
  label,
  placeholder,
  value,
  onPress,
  style,
}: TripDateRangeFieldProps) {
  return (
    <View style={[styles.field, style]}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.input} onPress={onPress} activeOpacity={0.75}>
        <Text style={[styles.value, !value && styles.placeholder]} numberOfLines={1}>
          {value ?? placeholder}
        </Text>
        <Ionicons name="calendar-outline" size={20} color={Colors.foundation.black} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.md,
  },
  label: {
    ...Typography.body1Emphasized,
    color: Colors.foundation.black,
  },
  input: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: '#969696',
    backgroundColor: Colors.foundation.white,
    paddingHorizontal: Spacing.md,
  },
  value: {
    flex: 1,
    marginRight: Spacing.sm,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 17,
    color: Colors.foundation.black,
  },
  placeholder: {
    color: Colors.foundation.grey500,
  },
});
