import React from 'react';
import { StyleSheet, TouchableOpacity, View, type StyleProp, type ViewStyle } from 'react-native';
import Text from '@/components/common/AppText';

import { Colors, Radius, Spacing, Typography } from '@/constants/theme';

interface DestinationSelectFieldProps {
  label: string;
  placeholder: string;
  value?: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

export default function DestinationSelectField({
  label,
  placeholder,
  value,
  onPress,
  style,
}: DestinationSelectFieldProps) {
  return (
    <View style={[styles.field, style]}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.input} onPress={onPress} activeOpacity={0.75}>
        <Text style={[styles.value, !value && styles.placeholder]} numberOfLines={1}>
          {value ?? placeholder}
        </Text>
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
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: '#969696',
    backgroundColor: Colors.foundation.white,
    paddingHorizontal: Spacing.md,
    justifyContent: 'center',
  },
  value: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 17,
    color: Colors.foundation.black,
  },
  placeholder: {
    color: Colors.foundation.grey500,
  },
});
