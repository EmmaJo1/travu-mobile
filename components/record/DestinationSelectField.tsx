import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Text from '@/components/common/AppText';

import { Colors, Radius, Spacing, Typography } from '@/constants/theme';

interface DestinationSelectFieldProps {
  label: string;
  placeholder: string;
  value?: string;
  onPress: () => void;
}

export default function DestinationSelectField({
  label,
  placeholder,
  value,
  onPress,
}: DestinationSelectFieldProps) {
  return (
    <View style={styles.field}>
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
    gap: Spacing.sm,
  },
  label: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.black,
  },
  input: {
    minHeight: 48,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.warm.beige,
    backgroundColor: Colors.foundation.white,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'center',
  },
  value: {
    ...Typography.body1Regular,
    color: Colors.foundation.black,
  },
  placeholder: {
    color: Colors.foundation.grey500,
  },
});
