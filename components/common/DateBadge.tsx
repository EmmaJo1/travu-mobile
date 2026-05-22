import React from 'react';
import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Text from '@/components/common/AppText';

import { Colors, FontFamily } from '@/constants/theme';

export interface DateBadgeProps {
  date: string;
  day: string;
  imageUri?: string;
  style?: StyleProp<ViewStyle>;
}

export default function DateBadge({ date, day, imageUri, style }: DateBadgeProps) {
  return (
    <View style={[styles.container, style]}>
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={styles.fallback} />
      )}
      <View style={styles.glass}>
        <Text style={styles.date}>{date}</Text>
        <Text style={styles.day}>{day}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 80,
    height: 60,
    borderRadius: 4,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  fallback: {
    width: '100%',
    height: '100%',
    backgroundColor: '#666666',
  },
  glass: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 30,
    height: 40,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  // Figma DateBadge 전용 — typography scale 밖 (13/18, 11/15)
  date: {
    position: 'absolute',
    left: 6,
    top: 6,
    fontFamily: FontFamily.pretendardMedium,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.foundation.black,
  },
  day: {
    position: 'absolute',
    left: 10,
    top: 22,
    fontFamily: FontFamily.pretendardMedium,
    fontSize: 11,
    lineHeight: 15,
    color: Colors.foundation.black,
  },
});
